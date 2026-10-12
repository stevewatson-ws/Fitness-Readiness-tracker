"""
Database models for Fitness Intelligence.

Using SQLAlchemy ORM with SQLite for local development.
Designed to be swapped to PostgreSQL/TimescaleDB in production.
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Index,
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
# User
# ─────────────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name       = Column(String(255), nullable=True)
    is_active       = Column(Boolean, default=True)
    is_verified     = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    profile         = relationship("UserProfile", back_populates="user", uselist=False)
    health_records  = relationship("HealthRecord", back_populates="user")
    readiness_scores = relationship("ReadinessScore", back_populates="user")
    check_ins       = relationship("DailyCheckIn", back_populates="user")
    workouts        = relationship("WorkoutSession", back_populates="user")
    baselines       = relationship("PersonalBaseline", back_populates="user")
    sync_logs       = relationship("SyncLog", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    age             = Column(Integer, nullable=True)
    height_cm       = Column(Float, nullable=True)
    weight_kg       = Column(Float, nullable=True)
    biological_sex  = Column(String(20), nullable=True)  # male / female / other / prefer_not_to_say
    timezone        = Column(String(50), default="UTC")

    # Fitness profile
    fitness_goal    = Column(String(50), nullable=True)  # strength / endurance / weight_loss / general
    experience_level = Column(String(20), nullable=True)  # beginner / intermediate / advanced / elite
    weekly_workouts = Column(Integer, default=3)
    preferred_types = Column(JSON, default=list)  # ["running", "strength", "yoga"]

    # Recovery defaults
    typical_sleep_hours = Column(Float, default=7.0)
    typical_stress      = Column(Integer, default=3)   # 1-5
    typical_activity    = Column(String(20), default="moderate")

    # Apple Health
    apple_health_connected = Column(Boolean, default=False)
    healthkit_permissions  = Column(JSON, default=dict)  # {metric: authorized}
    last_sync_at           = Column(DateTime(timezone=True), nullable=True)

    # Onboarding
    onboarding_complete = Column(Boolean, default=False)
    onboarding_step     = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")


# ─────────────────────────────────────────────────────────────────────────────
# Health Data
# ─────────────────────────────────────────────────────────────────────────────

class HealthRecord(Base):
    """
    Generic time-series health metric record.
    Each row stores one metric reading for one day.
    """
    __tablename__ = "health_records"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date        = Column(Date, nullable=False, index=True)
    metric_type = Column(String(50), nullable=False, index=True)
    value       = Column(Float, nullable=False)
    unit        = Column(String(20), nullable=True)
    source      = Column(String(50), default="manual")  # apple_health / manual / simulator
    raw_data    = Column(JSON, nullable=True)            # original HealthKit payload
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="health_records")

    __table_args__ = (
        Index("ix_health_user_date_metric", "user_id", "date", "metric_type", unique=True),
    )


METRIC_TYPES = [
    # Activity
    "steps", "distance_km", "active_energy_kcal", "stand_hours",
    # Heart
    "heart_rate_avg", "resting_heart_rate", "hrv_ms", "heart_rate_max",
    # Sleep
    "sleep_hours", "sleep_quality", "deep_sleep_hours", "rem_sleep_hours",
    # Body
    "weight_kg", "body_fat_pct", "vo2_max",
    # Respiratory
    "respiratory_rate",
]


# ─────────────────────────────────────────────────────────────────────────────
# Workout Sessions
# ─────────────────────────────────────────────────────────────────────────────

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date            = Column(Date, nullable=False, index=True)
    started_at      = Column(DateTime(timezone=True), nullable=True)
    ended_at        = Column(DateTime(timezone=True), nullable=True)
    workout_type    = Column(String(50), nullable=False)  # running / strength / cycling ...
    duration_mins   = Column(Float, nullable=False)
    energy_kcal     = Column(Float, nullable=True)
    distance_km     = Column(Float, nullable=True)
    avg_heart_rate  = Column(Float, nullable=True)
    max_heart_rate  = Column(Float, nullable=True)
    intensity       = Column(String(20), nullable=True)   # light / moderate / hard / intense
    load_score      = Column(Float, nullable=True)        # computed training load 0-100
    source          = Column(String(50), default="manual")
    notes           = Column(Text, nullable=True)
    raw_data        = Column(JSON, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="workouts")


# ─────────────────────────────────────────────────────────────────────────────
# Readiness
# ─────────────────────────────────────────────────────────────────────────────

class ReadinessScore(Base):
    __tablename__ = "readiness_scores"

    id                   = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date                 = Column(Date, nullable=False, index=True)
    readiness_score      = Column(Float, nullable=False)  # 0-100
    readiness_state      = Column(String(20), nullable=False)  # very_poor / poor / moderate / good / excellent
    training_intensity   = Column(String(20), nullable=False)  # rest / recovery / light / moderate / hard / intense
    recommendation_text  = Column(Text, nullable=True)
    dominant_factors     = Column(JSON, default=list)

    # Raw fuzzy inputs used
    fuzzy_inputs         = Column(JSON, nullable=True)
    rule_firings         = Column(JSON, nullable=True)
    confidence           = Column(Float, default=1.0)

    # Source inputs
    sleep_hours          = Column(Float, nullable=True)
    sleep_quality        = Column(Float, nullable=True)
    hrv_ms               = Column(Float, nullable=True)
    resting_hr           = Column(Float, nullable=True)
    stress_score         = Column(Float, nullable=True)
    soreness_score       = Column(Float, nullable=True)
    training_load_1d     = Column(Float, nullable=True)
    training_load_3d     = Column(Float, nullable=True)
    training_load_7d     = Column(Float, nullable=True)
    energy_score         = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="readiness_scores")

    __table_args__ = (
        Index("ix_readiness_user_date", "user_id", "date", unique=True),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Daily Check-In
# ─────────────────────────────────────────────────────────────────────────────

class DailyCheckIn(Base):
    """Subjective daily check-in — multimodal input alongside sensor data."""
    __tablename__ = "daily_checkins"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date             = Column(Date, nullable=False, index=True)
    energy           = Column(Integer, nullable=True)   # 1-5
    stress           = Column(Integer, nullable=True)   # 1-5
    soreness         = Column(Integer, nullable=True)   # 1-5
    mood             = Column(Integer, nullable=True)   # 1-5
    perceived_recovery = Column(Integer, nullable=True) # 1-5
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="check_ins")

    __table_args__ = (
        Index("ix_checkin_user_date", "user_id", "date", unique=True),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Personal Baseline
# ─────────────────────────────────────────────────────────────────────────────

class PersonalBaseline(Base):
    """
    Rolling personal baseline for each key metric.
    Updated periodically (e.g., weekly) from recent history.
    """
    __tablename__ = "personal_baselines"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, unique=True)

    # Metric baselines
    resting_hr_avg  = Column(Float, nullable=True)   # bpm
    hrv_avg_ms      = Column(Float, nullable=True)   # ms
    sleep_hours_avg = Column(Float, nullable=True)   # hours
    sleep_quality_avg = Column(Float, nullable=True) # 0-100
    steps_avg       = Column(Float, nullable=True)
    activity_avg    = Column(Float, nullable=True)   # weekly active energy kcal
    weekly_load_avg = Column(Float, nullable=True)   # 0-100

    # Metadata
    data_days       = Column(Integer, default=0)     # days of data used
    last_computed   = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="baselines")


# ─────────────────────────────────────────────────────────────────────────────
# Sync Log
# ─────────────────────────────────────────────────────────────────────────────

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sync_type     = Column(String(30), nullable=False)   # full / incremental
    source        = Column(String(30), nullable=False)   # apple_health / simulator
    status        = Column(String(20), nullable=False)   # success / partial / failed
    records_added = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at    = Column(DateTime(timezone=True), server_default=func.now())
    completed_at  = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sync_logs")
