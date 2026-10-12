"""Readiness, What-If, Insights, Sync, Simulator API router."""

from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.models.database import User, UserProfile, SyncLog, ReadinessScore
from app.models.database_session import get_db
from app.models.schemas import (
    ReadinessOut, ReadinessTrend,
    WhatIfRequest, WhatIfResponse,
    InsightsResponse, Insight,
    SyncRequest, SyncResponse,
)
from app.services.readiness_service import compute_and_store_readiness, get_readiness_trend
from app.services.insights_service import generate_insights
from app.services.simulator import (
    generate_health_records, generate_workouts, get_available_scenarios
)
from app.services.baseline_service import compute_baseline
from app.fuzzy.engine import FuzzyReadinessEngine, FuzzyInputs
from app.recovery.recovery_service import build_fuzzy_inputs_for_date

router = APIRouter(prefix="/api", tags=["readiness"])
_fuzzy = FuzzyReadinessEngine()


# ─── Readiness ────────────────────────────────────────────────────────────────

@router.get("/readiness/today", response_model=ReadinessOut)
def get_today_readiness(
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = compute_and_store_readiness(db, current_user.id, date.today(), force_recompute=force)
    return row


@router.get("/readiness/trend", response_model=ReadinessTrend)
def readiness_trend(
    days: int = 14,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = get_readiness_trend(db, current_user.id, days=days)
    return data


@router.get("/readiness/history", response_model=List[ReadinessOut])
def readiness_history(
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ReadinessScore).filter(ReadinessScore.user_id == current_user.id)
    if start_date:
        q = q.filter(ReadinessScore.date >= start_date)
    if end_date:
        q = q.filter(ReadinessScore.date <= end_date)
    return q.order_by(ReadinessScore.date.desc()).limit(180).all()


@router.get("/readiness/{for_date}", response_model=ReadinessOut)
def get_readiness_for_date(
    for_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = compute_and_store_readiness(db, current_user.id, for_date)
    return row


# ─── What-If Simulator ────────────────────────────────────────────────────────

@router.post("/readiness/what-if", response_model=WhatIfResponse)
def what_if_simulation(
    payload: WhatIfRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_date = payload.base_date or date.today()

    # Current inputs
    inputs_dict = build_fuzzy_inputs_for_date(db, current_user.id, target_date)
    base_inputs = FuzzyInputs(
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

    current_result  = _fuzzy.infer(base_inputs)
    simulated_result = _fuzzy.simulate_what_if(base_inputs, payload.overrides)

    # Identify what changed
    contributors = []
    LABELS = {
        "sleep_hours":   "Sleep Duration",
        "sleep_quality": "Sleep Quality",
        "hrv":           "HRV",
        "resting_hr":    "Resting HR",
        "stress":        "Stress",
        "soreness":      "Muscle Soreness",
        "training_load": "Training Load",
        "energy":        "Energy",
    }
    for k, new_val in payload.overrides.items():
        old_val = inputs_dict.get(k, 0)
        label   = LABELS.get(k, k)
        delta   = new_val - old_val
        arrow   = "↑" if delta > 0 else "↓"
        contributors.append(f"{label} {arrow}")

    return WhatIfResponse(
        current_score=current_result.readiness_score,
        simulated_score=simulated_result.readiness_score,
        delta=round(simulated_result.readiness_score - current_result.readiness_score, 1),
        current_state=current_result.readiness_state,
        simulated_state=simulated_result.readiness_state,
        main_contributors=contributors,
        current_factors=current_result.dominant_factors,
        simulated_factors=simulated_result.dominant_factors,
    )


# ─── Fuzzy Explanation ────────────────────────────────────────────────────────

@router.get("/readiness/explain/{for_date}")
def explain_readiness(
    for_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full fuzzy membership breakdown for explainability view."""
    inputs_dict = build_fuzzy_inputs_for_date(db, current_user.id, for_date)
    fi = FuzzyInputs(**{k: v for k, v in inputs_dict.items() if not k.startswith("_")})
    result = _fuzzy.infer(fi, include_debug=True)
    membership = _fuzzy.get_membership_explanation(fi)
    return {
        "fuzzy_inputs":       inputs_dict,
        "membership_degrees": membership,
        "rule_firings":       [
            {"rule_id": f.rule_id, "description": f.description,
             "activation": f.activation, "consequent_term": f.consequent_term}
            for f in result.rule_firings
        ],
        "readiness_score":    result.readiness_score,
        "readiness_state":    result.readiness_state,
        "dominant_factors":   result.dominant_factors,
        "confidence":         result.confidence,
    }


# ─── Insights ─────────────────────────────────────────────────────────────────

@router.get("/insights", response_model=InsightsResponse)
def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = generate_insights(db, current_user.id)
    return InsightsResponse(insights=items, generated_at=datetime.now(timezone.utc))


# ─── Sync & Simulator ─────────────────────────────────────────────────────────

@router.get("/simulator/scenarios")
def list_scenarios():
    return get_available_scenarios()


@router.post("/simulator/load", response_model=SyncResponse)
def load_simulator_data(
    scenario: str = "fully_recovered",
    days: int = 42,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Load synthetic health data for the chosen scenario."""
    from app.api.data import bulk_add_health_records, bulk_add_workouts
    from app.models.schemas import HealthRecordBulkIn, HealthRecordIn, WorkoutIn

    records = generate_health_records(current_user.id, scenario=scenario, days=days)
    workouts = generate_workouts(current_user.id, scenario=scenario, days=days)

    # Bulk insert health records
    added_r = skipped_r = 0
    for r in records:
        from app.models.database import HealthRecord
        existing = db.query(HealthRecord).filter(
            HealthRecord.user_id == current_user.id,
            HealthRecord.date == r["date"],
            HealthRecord.metric_type == r["metric_type"],
        ).first()
        if existing:
            existing.value = r["value"]
            skipped_r += 1
        else:
            db.add(HealthRecord(user_id=current_user.id, **r))
            added_r += 1

    # Bulk insert workouts
    from app.models.database import WorkoutSession
    from app.training.load_service import compute_session_load
    for w in workouts:
        s = WorkoutSession(user_id=current_user.id, **w)
        s.load_score = compute_session_load(s)
        db.add(s)
        added_r += 1

    db.commit()

    # Recompute baseline
    compute_baseline(db, current_user.id)

    # Log sync
    log = SyncLog(
        user_id=current_user.id,
        sync_type="full",
        source="simulator",
        status="success",
        records_added=added_r,
        records_skipped=skipped_r,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(log)

    # Update profile last_sync
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if p:
        p.last_sync_at = datetime.now(timezone.utc)
        p.apple_health_connected = True
    db.commit()

    return SyncResponse(
        status="success",
        records_added=added_r,
        records_skipped=skipped_r,
        last_sync_at=datetime.now(timezone.utc),
        message=f"Loaded {days} days of '{scenario}' scenario data.",
    )


@router.post("/sync/apple-health", response_model=SyncResponse)
def sync_apple_health(
    payload: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Endpoint for the iOS HealthKit bridge to POST data.
    Accepts a structured payload from the Swift native layer.
    """
    payload_data = payload.data or {}
    if not isinstance(payload_data, dict):
        raise HTTPException(400, "No data provided")

    health_data = payload_data.get("healthRecords") or payload_data.get("records") or []
    workout_data = payload_data.get("workouts") or []
    if isinstance(health_data, dict):
        health_data = health_data.get("items") or []
    if isinstance(workout_data, dict):
        workout_data = workout_data.get("items") or []

    if not health_data and not workout_data:
        raise HTTPException(400, "No Apple Health records or workouts were provided")

    added = skipped = 0
    from app.models.database import HealthRecord, WorkoutSession
    from app.training.load_service import compute_session_load

    for r in health_data:
        metric_type = r.get("metric_type") or r.get("metricType")
        if not metric_type:
            continue
        date_value = r.get("date")
        if not date_value:
            continue

        existing = db.query(HealthRecord).filter(
            HealthRecord.user_id == current_user.id,
            HealthRecord.date == date_value,
            HealthRecord.metric_type == metric_type,
        ).first()
        if existing:
            existing.value = r.get("value", existing.value)
            existing.unit = r.get("unit") or existing.unit
            existing.source = "apple_health"
            existing.raw_data = r.get("raw") or existing.raw_data
            skipped += 1
        else:
            db.add(HealthRecord(
                user_id=current_user.id,
                date=date_value,
                metric_type=metric_type,
                value=r["value"],
                unit=r.get("unit"),
                source="apple_health",
                raw_data=r.get("raw"),
            ))
            added += 1

    for w in workout_data:
        workout_type = w.get("workout_type") or w.get("workoutType")
        if not workout_type:
            continue
        date_value = w.get("date")
        if not date_value:
            continue

        session = WorkoutSession(
            user_id=current_user.id,
            date=date_value,
            workout_type=workout_type,
            duration_mins=float(w.get("duration_mins") or w.get("durationMins") or 0),
            energy_kcal=w.get("energy_kcal") or w.get("energyKcal"),
            avg_heart_rate=w.get("avg_heart_rate") or w.get("avgHeartRate"),
            max_heart_rate=w.get("max_heart_rate") or w.get("maxHeartRate"),
            intensity=w.get("intensity") or "moderate",
            source="apple_health",
            notes=w.get("notes") or "Synced from Apple Health",
        )
        session.load_score = compute_session_load(session)
        db.add(session)

    db.commit()

    now = datetime.now(timezone.utc)
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if p:
        p.last_sync_at = now
        p.apple_health_connected = True
        db.commit()

    return SyncResponse(
        status="success",
        records_added=added,
        records_skipped=skipped,
        last_sync_at=now,
        message="Apple Health data synced successfully.",
    )
