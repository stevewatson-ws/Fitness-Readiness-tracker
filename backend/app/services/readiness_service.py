"""
Readiness Service — orchestrates the full readiness pipeline.

Pipeline:
  1. Collect health data (recovery_service)
  2. Run fuzzy inference (fuzzy engine)
  3. Persist result
  4. Return ReadinessOut
"""

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.fuzzy.engine import FuzzyReadinessEngine, FuzzyInputs
from app.models.database import ReadinessScore, DailyCheckIn, PersonalBaseline
from app.models.schemas import ReadinessOut
from app.recovery.recovery_service import build_fuzzy_inputs_for_date

_engine = FuzzyReadinessEngine()


def compute_and_store_readiness(
    db: Session,
    user_id: int,
    target_date: Optional[date] = None,
    force_recompute: bool = False,
) -> ReadinessScore:
    """
    Compute (or retrieve) the readiness score for `user_id` on `target_date`.

    If a score already exists and force_recompute is False, return the cached row.
    """
    if target_date is None:
        target_date = date.today()

    # Check cache
    existing = (
        db.query(ReadinessScore)
        .filter(ReadinessScore.user_id == user_id, ReadinessScore.date == target_date)
        .first()
    )
    if existing and not force_recompute:
        return existing

    # Fetch most recent check-in for today
    check_in = (
        db.query(DailyCheckIn)
        .filter(DailyCheckIn.user_id == user_id, DailyCheckIn.date == target_date)
        .first()
    )

    # Build fuzzy inputs
    inputs_dict = build_fuzzy_inputs_for_date(db, user_id, target_date, check_in)

    fuzzy_inputs = FuzzyInputs(
        sleep_hours=inputs_dict["sleep_hours"],
        sleep_quality=inputs_dict["sleep_quality"],
        hrv=inputs_dict["hrv"],
        resting_hr=inputs_dict["resting_hr"],
        stress=inputs_dict["stress"],
        soreness=inputs_dict["soreness"],
        training_load=inputs_dict["training_load"],
        energy=inputs_dict["energy"],
        hrv_baseline=inputs_dict["hrv_baseline"],
        resting_hr_baseline=inputs_dict["resting_hr_baseline"],
    )

    result = _engine.infer(fuzzy_inputs, include_debug=False)

    # Persist or update
    if existing:
        row = existing
    else:
        row = ReadinessScore(user_id=user_id, date=target_date)
        db.add(row)

    row.readiness_score     = result.readiness_score
    row.readiness_state     = result.readiness_state
    row.training_intensity  = result.training_intensity
    row.recommendation_text = result.recommendation_text
    row.dominant_factors    = result.dominant_factors
    row.confidence          = result.confidence
    row.fuzzy_inputs        = {
        "sleep_hours":   fuzzy_inputs.sleep_hours,
        "sleep_quality": fuzzy_inputs.sleep_quality,
        "hrv":           fuzzy_inputs.hrv,
        "resting_hr":    fuzzy_inputs.resting_hr,
        "stress":        fuzzy_inputs.stress,
        "soreness":      fuzzy_inputs.soreness,
        "training_load": fuzzy_inputs.training_load,
        "energy":        fuzzy_inputs.energy,
    }
    row.rule_firings = [
        {
            "rule_id":         f.rule_id,
            "description":     f.description,
            "activation":      f.activation,
            "consequent_term": f.consequent_term,
        }
        for f in result.rule_firings
    ]

    # Store raw metric values for history/charts
    row.sleep_hours      = fuzzy_inputs.sleep_hours
    row.sleep_quality    = fuzzy_inputs.sleep_quality
    row.hrv_ms           = fuzzy_inputs.hrv
    row.resting_hr       = fuzzy_inputs.resting_hr
    row.stress_score     = fuzzy_inputs.stress
    row.soreness_score   = fuzzy_inputs.soreness
    row.training_load_1d = inputs_dict.get("_load_1d", 0.0)
    row.training_load_3d = inputs_dict.get("_load_3d", 0.0)
    row.training_load_7d = inputs_dict.get("_load_7d", 0.0)
    row.energy_score     = fuzzy_inputs.energy

    db.commit()
    db.refresh(row)
    return row


def get_readiness_trend(
    db: Session,
    user_id: int,
    days: int = 14,
) -> dict:
    """Return readiness trend data for the last N days."""
    from datetime import timedelta

    end_date   = date.today()
    start_date = end_date - timedelta(days=days - 1)

    rows = (
        db.query(ReadinessScore)
        .filter(
            ReadinessScore.user_id == user_id,
            ReadinessScore.date >= start_date,
            ReadinessScore.date <= end_date,
        )
        .order_by(ReadinessScore.date)
        .all()
    )

    if not rows:
        return {"dates": [], "scores": [], "states": [], "average_score": 0.0, "trend_direction": "stable"}

    dates  = [r.date for r in rows]
    scores = [r.readiness_score for r in rows]
    states = [r.readiness_state for r in rows]
    avg    = sum(scores) / len(scores)

    # Trend: compare first-half average vs second-half average
    mid = len(scores) // 2
    if len(scores) >= 4:
        first_half  = sum(scores[:mid]) / mid
        second_half = sum(scores[mid:]) / (len(scores) - mid)
        direction   = "improving" if second_half > first_half + 2 else (
                      "declining" if first_half > second_half + 2 else "stable")
    else:
        direction = "stable"

    return {
        "dates":           [d.isoformat() for d in dates],
        "scores":          scores,
        "states":          states,
        "average_score":   round(avg, 1),
        "trend_direction": direction,
    }
