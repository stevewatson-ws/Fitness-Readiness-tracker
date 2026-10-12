"""
Baseline calculation service.

Computes rolling personal baselines from the last 28–90 days of
historical health data. Used to personalise the fuzzy membership
functions (e.g., "what is HIGH HRV for THIS user?").
"""

from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import HealthRecord, PersonalBaseline, WorkoutSession
from app.training.load_service import compute_session_load


def compute_baseline(db: Session, user_id: int) -> PersonalBaseline:
    """
    Compute (or update) the personal baseline for a user.
    Uses the most recent 28 days where possible, extended to 90 days
    if fewer than 7 days of data exist in the 28-day window.
    """
    today    = date.today()
    end_date = today - timedelta(days=1)

    def _avg_metric(metric: str, lookback: int) -> Optional[float]:
        start = end_date - timedelta(days=lookback - 1)
        rows  = (
            db.query(HealthRecord)
            .filter(
                HealthRecord.user_id == user_id,
                HealthRecord.metric_type == metric,
                HealthRecord.date >= start,
                HealthRecord.date <= end_date,
            )
            .all()
        )
        if not rows:
            return None
        return round(sum(r.value for r in rows) / len(rows), 2), len(rows)

    def _get(metric: str) -> tuple[Optional[float], int]:
        for window in (28, 60, 90):
            result = _avg_metric(metric, window)
            if result is not None:
                val, cnt = result
                if cnt >= 3:
                    return val, cnt
        return None, 0

    rhr_val,  rhr_cnt  = _get("resting_heart_rate")
    hrv_val,  hrv_cnt  = _get("hrv_ms")
    slp_val,  slp_cnt  = _get("sleep_hours")
    slq_val,  slq_cnt  = _get("sleep_quality")
    stp_val,  stp_cnt  = _get("steps")
    eng_val,  eng_cnt  = _get("active_energy_kcal")

    # Training load baseline (average daily load over last 28 days)
    start_28 = end_date - timedelta(days=27)
    sessions = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= start_28,
            WorkoutSession.date <= end_date,
        )
        .all()
    )
    weekly_load_avg = None
    if sessions:
        total_load = sum(
            s.load_score if s.load_score is not None else compute_session_load(s)
            for s in sessions
        )
        weekly_load_avg = round(total_load / 4.0, 2)  # normalise to weekly

    data_days = max(rhr_cnt, hrv_cnt, slp_cnt, stp_cnt)

    # Upsert
    bl = db.query(PersonalBaseline).filter(PersonalBaseline.user_id == user_id).first()
    if bl is None:
        bl = PersonalBaseline(user_id=user_id)
        db.add(bl)

    bl.resting_hr_avg   = rhr_val
    bl.hrv_avg_ms       = hrv_val
    bl.sleep_hours_avg  = slp_val
    bl.sleep_quality_avg = slq_val
    bl.steps_avg        = stp_val
    bl.activity_avg     = eng_val
    bl.weekly_load_avg  = weekly_load_avg
    bl.data_days        = data_days

    db.commit()
    db.refresh(bl)
    return bl
