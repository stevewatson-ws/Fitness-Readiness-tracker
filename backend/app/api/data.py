"""Profile, Health Records, Workouts, Check-ins — combined router."""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.models.database import (
    User, UserProfile, HealthRecord, WorkoutSession, DailyCheckIn, PersonalBaseline
)
from app.models.database_session import get_db
from app.models.schemas import (
    ProfileCreate, ProfileOut,
    HealthRecordIn, HealthRecordBulkIn, HealthRecordOut,
    WorkoutIn, WorkoutOut,
    CheckInCreate, CheckInOut,
    BaselineOut,
)
from app.training.load_service import compute_session_load
from app.services.baseline_service import compute_baseline

router = APIRouter(prefix="/api", tags=["data"])


# ─── Profile ──────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=ProfileOut)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not p:
        raise HTTPException(404, "Profile not found")
    return p


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not p:
        p = UserProfile(user_id=current_user.id)
        db.add(p)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return p


@router.post("/profile/onboarding-complete")
def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if p:
        p.onboarding_complete = True
        db.commit()
    return {"message": "Onboarding complete"}


# ─── Health Records ───────────────────────────────────────────────────────────

@router.post("/health-records", response_model=HealthRecordOut, status_code=201)
def add_health_record(
    payload: HealthRecordIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Upsert: one record per user/date/metric
    existing = db.query(HealthRecord).filter(
        HealthRecord.user_id == current_user.id,
        HealthRecord.date == payload.date,
        HealthRecord.metric_type == payload.metric_type,
    ).first()
    if existing:
        existing.value = payload.value
        existing.source = payload.source
        db.commit()
        db.refresh(existing)
        return existing
    rec = HealthRecord(user_id=current_user.id, **payload.model_dump())
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.post("/health-records/bulk", status_code=201)
def bulk_add_health_records(
    payload: HealthRecordBulkIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    added = skipped = 0
    for r in payload.records:
        existing = db.query(HealthRecord).filter(
            HealthRecord.user_id == current_user.id,
            HealthRecord.date == r.date,
            HealthRecord.metric_type == r.metric_type,
        ).first()
        if existing:
            existing.value = r.value
            skipped += 1
        else:
            db.add(HealthRecord(user_id=current_user.id, **r.model_dump()))
            added += 1
    db.commit()
    return {"added": added, "skipped": skipped}


@router.get("/health-records", response_model=List[HealthRecordOut])
def list_health_records(
    metric_type: Optional[str] = None,
    start_date:  Optional[date] = None,
    end_date:    Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(HealthRecord).filter(HealthRecord.user_id == current_user.id)
    if metric_type:
        q = q.filter(HealthRecord.metric_type == metric_type)
    if start_date:
        q = q.filter(HealthRecord.date >= start_date)
    if end_date:
        q = q.filter(HealthRecord.date <= end_date)
    return q.order_by(HealthRecord.date.desc()).limit(500).all()


# ─── Workouts ─────────────────────────────────────────────────────────────────

@router.post("/workouts", response_model=WorkoutOut, status_code=201)
def add_workout(
    payload: WorkoutIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = WorkoutSession(user_id=current_user.id, **payload.model_dump())
    session.load_score = compute_session_load(session)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/workouts/bulk", status_code=201)
def bulk_add_workouts(
    payload: List[WorkoutIn],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    added = 0
    for w in payload:
        s = WorkoutSession(user_id=current_user.id, **w.model_dump())
        s.load_score = compute_session_load(s)
        db.add(s)
        added += 1
    db.commit()
    return {"added": added}


@router.get("/workouts", response_model=List[WorkoutOut])
def list_workouts(
    start_date: Optional[date] = None,
    end_date:   Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(WorkoutSession).filter(WorkoutSession.user_id == current_user.id)
    if start_date:
        q = q.filter(WorkoutSession.date >= start_date)
    if end_date:
        q = q.filter(WorkoutSession.date <= end_date)
    return q.order_by(WorkoutSession.date.desc()).limit(200).all()


# ─── Check-ins ────────────────────────────────────────────────────────────────

@router.post("/checkin", response_model=CheckInOut, status_code=201)
def submit_checkin(
    payload: CheckInCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id,
        DailyCheckIn.date == payload.date,
    ).first()
    if existing:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    ci = DailyCheckIn(user_id=current_user.id, **payload.model_dump())
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return ci


@router.get("/checkin/today", response_model=Optional[CheckInOut])
def get_today_checkin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(DailyCheckIn).filter(
        DailyCheckIn.user_id == current_user.id,
        DailyCheckIn.date == date.today(),
    ).first()


# ─── Baseline ─────────────────────────────────────────────────────────────────

@router.get("/baseline", response_model=Optional[BaselineOut])
def get_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(PersonalBaseline).filter(
        PersonalBaseline.user_id == current_user.id
    ).first()


@router.post("/baseline/compute", response_model=BaselineOut)
def recompute_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return compute_baseline(db, current_user.id)
