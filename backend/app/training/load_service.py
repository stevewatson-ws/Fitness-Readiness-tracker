"""
Training Load Service.

Computes previous-day, 3-day, 7-day, and weekly training loads
from workout session data. Normalises to a 0-100 scale.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session
from app.models.database import WorkoutSession


# Duration-based intensity multipliers
INTENSITY_MULTIPLIERS: Dict[str, float] = {
    "light":    0.5,
    "moderate": 1.0,
    "hard":     1.5,
    "intense":  2.0,
}

# Normalisation divisor — 90 minutes at hard intensity = load ~100
LOAD_NORMALISER: float = 135.0


def compute_session_load(session: WorkoutSession) -> float:
    """Compute a single workout session's load score (0-100)."""
    multiplier = INTENSITY_MULTIPLIERS.get(session.intensity or "moderate", 1.0)
    raw_load = session.duration_mins * multiplier

    # If avg HR is available, adjust by cardiac demand
    if session.avg_heart_rate and session.avg_heart_rate > 0:
        # HR zone boost: >160 bpm = higher load
        hr_factor = min(session.avg_heart_rate / 150.0, 1.5)
        raw_load *= hr_factor

    return min(raw_load / LOAD_NORMALISER * 100.0, 100.0)


def get_load_for_days(
    db: Session,
    user_id: int,
    reference_date: date,
    days: int,
) -> float:
    """Average training load over the last `days` days (normalised 0-100)."""
    start = reference_date - timedelta(days=days - 1)
    sessions: List[WorkoutSession] = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date >= start,
            WorkoutSession.date <= reference_date,
        )
        .all()
    )
    if not sessions:
        return 0.0

    daily_loads: Dict[date, float] = {}
    for s in sessions:
        load = s.load_score if s.load_score is not None else compute_session_load(s)
        daily_loads[s.date] = daily_loads.get(s.date, 0.0) + load

    # Spread over requested days (rest days count as 0)
    total = sum(daily_loads.values())
    return min(total / days, 100.0)


def get_training_loads(
    db: Session,
    user_id: int,
    reference_date: date,
) -> Dict[str, float]:
    """Return 1d / 3d / 7d / 28d normalised training loads."""
    return {
        "load_1d":  get_load_for_days(db, user_id, reference_date - timedelta(days=1), 1),
        "load_3d":  get_load_for_days(db, user_id, reference_date - timedelta(days=1), 3),
        "load_7d":  get_load_for_days(db, user_id, reference_date - timedelta(days=1), 7),
        "load_28d": get_load_for_days(db, user_id, reference_date - timedelta(days=1), 28),
    }


def count_consecutive_training_days(
    db: Session,
    user_id: int,
    reference_date: date,
) -> int:
    """Count consecutive days (backwards from reference_date) with at least one workout."""
    count = 0
    check = reference_date - timedelta(days=1)
    while True:
        exists = db.query(WorkoutSession).filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.date == check,
        ).first()
        if exists:
            count += 1
            check -= timedelta(days=1)
        else:
            break
        if count > 30:
            break
    return count
