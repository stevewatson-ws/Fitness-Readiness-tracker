"""
Recovery Engine.

Aggregates sleep, HRV, resting HR, training load, stress and soreness
into a recovery score and feeds the fuzzy engine inputs.
"""

from datetime import date, timedelta
from typing import Optional, Dict

from sqlalchemy.orm import Session
from app.models.database import HealthRecord, PersonalBaseline, DailyCheckIn
from app.training.load_service import get_training_loads


# ─── Scale helpers ────────────────────────────────────────────────────────────

def _scale(value: float, min_val: float, max_val: float) -> float:
    """Clamp and normalise a value to 0-100."""
    return max(0.0, min(100.0, (value - min_val) / (max_val - min_val) * 100.0))


def _get_metric(
    db: Session,
    user_id: int,
    metric: str,
    for_date: date,
    lookback: int = 3,
) -> Optional[float]:
    """Return the most recent value for a metric within `lookback` days."""
    for delta in range(lookback):
        d = for_date - timedelta(days=delta)
        rec = (
            db.query(HealthRecord)
            .filter(
                HealthRecord.user_id == user_id,
                HealthRecord.date == d,
                HealthRecord.metric_type == metric,
            )
            .first()
        )
        if rec is not None:
            return rec.value
    return None


# ─── Baseline helpers ─────────────────────────────────────────────────────────

def _get_baseline(db: Session, user_id: int) -> Optional[PersonalBaseline]:
    return db.query(PersonalBaseline).filter(PersonalBaseline.user_id == user_id).first()


# ─── Main recovery aggregation ────────────────────────────────────────────────

def build_fuzzy_inputs_for_date(
    db: Session,
    user_id: int,
    target_date: date,
    check_in: Optional[DailyCheckIn] = None,
) -> Dict[str, float]:
    """
    Collect all available physiological data for `target_date` and
    return a dictionary ready to be passed to FuzzyInputs.

    Priority (highest → lowest):
      1. Apple Health / real sensor data
      2. Daily check-in (subjective)
      3. Personal historical average
      4. Population defaults
    """
    baseline = _get_baseline(db, user_id)

    # ── Resting HR baseline ────────────────────────────────────────────────
    resting_hr_baseline = (
        baseline.resting_hr_avg if baseline and baseline.resting_hr_avg else 60.0
    )
    hrv_baseline = (
        baseline.hrv_avg_ms if baseline and baseline.hrv_avg_ms else 60.0
    )

    # ── Sleep ─────────────────────────────────────────────────────────────
    sleep_hours   = _get_metric(db, user_id, "sleep_hours",   target_date)
    sleep_quality = _get_metric(db, user_id, "sleep_quality", target_date)

    if sleep_hours is None:
        sleep_hours = baseline.sleep_hours_avg if baseline and baseline.sleep_hours_avg else 7.0
    if sleep_quality is None:
        sleep_quality = (
            baseline.sleep_quality_avg if baseline and baseline.sleep_quality_avg else 65.0
        )

    # ── Heart ──────────────────────────────────────────────────────────────
    resting_hr = _get_metric(db, user_id, "resting_heart_rate", target_date)
    hrv_ms     = _get_metric(db, user_id, "hrv_ms",             target_date)

    if resting_hr is None:
        resting_hr = resting_hr_baseline
    if hrv_ms is None:
        hrv_ms = hrv_baseline

    # ── Training load ──────────────────────────────────────────────────────
    loads = get_training_loads(db, user_id, target_date)
    # 7-day average is the primary load signal
    training_load = loads["load_7d"]

    # ── Stress / Soreness / Energy (check-in preferred) ───────────────────
    # Normalise 1-5 scale → 0-100
    def _ci(raw_1_5: Optional[int], default: float) -> float:
        if raw_1_5 is not None:
            return _scale(float(raw_1_5), 1.0, 5.0)
        return default

    if check_in:
        stress   = _ci(check_in.stress,   40.0)
        soreness = _ci(check_in.soreness, 20.0)
        energy   = _ci(check_in.energy,   60.0)

        # perceived_recovery can boost/lower sleep_quality
        if check_in.perceived_recovery is not None:
            prc = _scale(float(check_in.perceived_recovery), 1.0, 5.0)
            sleep_quality = (sleep_quality + prc) / 2.0
    else:
        # Fall back to historical averages from HealthRecord stress proxy
        stress_raw = _get_metric(db, user_id, "stress_score", target_date)
        stress     = stress_raw if stress_raw is not None else 40.0
        soreness   = 20.0
        energy     = 60.0

    return {
        "sleep_hours":           float(sleep_hours),
        "sleep_quality":         float(sleep_quality),
        "hrv":                   float(hrv_ms),
        "resting_hr":            float(resting_hr),
        "stress":                float(stress),
        "soreness":              float(soreness),
        "training_load":         float(training_load),
        "energy":                float(energy),
        "hrv_baseline":          float(hrv_baseline),
        "resting_hr_baseline":   float(resting_hr_baseline),
        # Extra context (not passed to fuzzy engine directly)
        "_load_1d":              loads["load_1d"],
        "_load_3d":              loads["load_3d"],
        "_load_7d":              loads["load_7d"],
    }
