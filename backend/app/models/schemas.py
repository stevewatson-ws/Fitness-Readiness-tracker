"""
Pydantic schemas for request/response validation.
"""

from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Profile
# ─────────────────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    age:               Optional[int]   = Field(None, ge=13, le=120)
    height_cm:         Optional[float] = Field(None, ge=50, le=300)
    weight_kg:         Optional[float] = Field(None, ge=20, le=500)
    biological_sex:    Optional[str]   = None
    timezone:          str             = "UTC"
    fitness_goal:      Optional[str]   = None
    experience_level:  Optional[str]   = None
    weekly_workouts:   int             = Field(3, ge=0, le=21)
    preferred_types:   List[str]       = []
    typical_sleep_hours: float         = Field(7.0, ge=0, le=16)
    typical_stress:    int             = Field(3, ge=1, le=5)
    typical_activity:  str             = "moderate"

    @field_validator("fitness_goal")
    @classmethod
    def validate_goal(cls, v):
        valid = {"strength", "endurance", "weight_loss", "general", None}
        if v not in valid:
            raise ValueError(f"fitness_goal must be one of {valid}")
        return v


class ProfileUpdate(ProfileCreate):
    pass


class ProfileOut(ProfileCreate):
    user_id:                 int
    apple_health_connected:  bool
    healthkit_permissions:   Dict[str, bool]
    last_sync_at:            Optional[datetime]
    onboarding_complete:     bool
    onboarding_step:         int

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Health Records
# ─────────────────────────────────────────────────────────────────────────────

class HealthRecordIn(BaseModel):
    date:        date
    metric_type: str
    value:       float
    unit:        Optional[str] = None
    source:      str           = "manual"
    raw_data:    Optional[Dict[str, Any]] = None


class HealthRecordBulkIn(BaseModel):
    records: List[HealthRecordIn]


class HealthRecordOut(HealthRecordIn):
    id:         int
    user_id:    int
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyHealthSummary(BaseModel):
    """Aggregated health metrics for a single day."""
    date:             date
    steps:            Optional[float] = None
    distance_km:      Optional[float] = None
    active_energy:    Optional[float] = None
    sleep_hours:      Optional[float] = None
    sleep_quality:    Optional[float] = None
    resting_hr:       Optional[float] = None
    hrv_ms:           Optional[float] = None
    heart_rate_avg:   Optional[float] = None
    heart_rate_max:   Optional[float] = None
    workout_count:    int             = 0
    workout_duration: Optional[float] = None
    training_load:    Optional[float] = None


# ─────────────────────────────────────────────────────────────────────────────
# Workouts
# ─────────────────────────────────────────────────────────────────────────────

class WorkoutIn(BaseModel):
    date:           date
    workout_type:   str
    duration_mins:  float = Field(gt=0)
    energy_kcal:    Optional[float] = None
    distance_km:    Optional[float] = None
    avg_heart_rate: Optional[float] = None
    max_heart_rate: Optional[float] = None
    intensity:      Optional[str]   = None
    notes:          Optional[str]   = None
    source:         str             = "manual"


class WorkoutOut(WorkoutIn):
    id:         int
    user_id:    int
    load_score: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Daily Check-In
# ─────────────────────────────────────────────────────────────────────────────

class CheckInCreate(BaseModel):
    date:               date
    energy:             Optional[int] = Field(None, ge=1, le=5)
    stress:             Optional[int] = Field(None, ge=1, le=5)
    soreness:           Optional[int] = Field(None, ge=1, le=5)
    mood:               Optional[int] = Field(None, ge=1, le=5)
    perceived_recovery: Optional[int] = Field(None, ge=1, le=5)
    notes:              Optional[str] = None


class CheckInOut(CheckInCreate):
    id:         int
    user_id:    int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Readiness
# ─────────────────────────────────────────────────────────────────────────────

class ReadinessOut(BaseModel):
    id:                  int
    user_id:             int
    date:                date
    readiness_score:     float
    readiness_state:     str
    training_intensity:  str
    recommendation_text: Optional[str]
    dominant_factors:    List[str]
    confidence:          float

    # Raw inputs for explanation view
    sleep_hours:         Optional[float]
    sleep_quality:       Optional[float]
    hrv_ms:              Optional[float]
    resting_hr:          Optional[float]
    stress_score:        Optional[float]
    soreness_score:      Optional[float]
    training_load_1d:    Optional[float]
    training_load_3d:    Optional[float]
    training_load_7d:    Optional[float]
    energy_score:        Optional[float]
    created_at:          datetime

    model_config = {"from_attributes": True}


class ReadinessTrend(BaseModel):
    dates:            List[date]
    scores:           List[float]
    states:           List[str]
    average_score:    float
    trend_direction:  str   # improving / stable / declining


# ─────────────────────────────────────────────────────────────────────────────
# What-If Simulator
# ─────────────────────────────────────────────────────────────────────────────

class WhatIfRequest(BaseModel):
    base_date:   Optional[date] = None   # defaults to today
    overrides: Dict[str, float] = {}     # e.g. {"sleep_hours": 8, "stress": 20}


class WhatIfResponse(BaseModel):
    current_score:     float
    simulated_score:   float
    delta:             float
    current_state:     str
    simulated_state:   str
    main_contributors: List[str]
    current_factors:   List[str]
    simulated_factors: List[str]


# ─────────────────────────────────────────────────────────────────────────────
# Baseline
# ─────────────────────────────────────────────────────────────────────────────

class BaselineOut(BaseModel):
    user_id:          int
    resting_hr_avg:   Optional[float]
    hrv_avg_ms:       Optional[float]
    sleep_hours_avg:  Optional[float]
    sleep_quality_avg:Optional[float]
    steps_avg:        Optional[float]
    activity_avg:     Optional[float]
    weekly_load_avg:  Optional[float]
    data_days:        int
    last_computed:    datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Sync
# ─────────────────────────────────────────────────────────────────────────────

class SyncRequest(BaseModel):
    sync_type:    str  = "incremental"   # full / incremental
    source:       str  = "simulator"
    data:         Optional[Dict[str, Any]] = None  # HealthKit payload from iOS bridge


class SyncResponse(BaseModel):
    status:           str
    records_added:    int
    records_skipped:  int
    last_sync_at:     datetime
    message:          str


# ─────────────────────────────────────────────────────────────────────────────
# Insights
# ─────────────────────────────────────────────────────────────────────────────

class Insight(BaseModel):
    type:        str    # info / warning / positive / trend
    metric:      str
    title:       str
    body:        str
    date:        Optional[date] = None


class InsightsResponse(BaseModel):
    insights:    List[Insight]
    generated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id:       int
    title:    str
    body:     str
    type:     str
    read:     bool
    created_at: datetime

    model_config = {"from_attributes": True}
