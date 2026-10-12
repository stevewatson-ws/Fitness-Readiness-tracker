"""
Demo Data Simulator.

Generates realistic, multi-week synthetic health data for development,
testing, and demonstration purposes without requiring an iPhone or Apple Health.

Supports 6 scenarios:
  1. fully_recovered   — excellent all-round
  2. poor_sleep        — low sleep, moderate stress
  3. heavy_training    — high load, moderate recovery
  4. high_stress       — high stress, fair sleep
  5. excellent         — peak athlete state
  6. conflicting       — mixed signals (good sleep, high stress, sore)
"""

import random
import math
from datetime import date, timedelta
from typing import Dict, List, Optional


SCENARIO_PROFILES = {
    "fully_recovered": {
        "sleep_hours":    (7.8, 0.4),
        "sleep_quality":  (78, 8),
        "hrv_ms":         (65, 8),
        "resting_hr":     (56, 3),
        "steps":          (9500, 1500),
        "active_energy":  (480, 80),
        "stress_score":   (25, 10),
        "workout_freq":   0.6,
        "workout_intensity": "moderate",
    },
    "poor_sleep": {
        "sleep_hours":    (5.2, 0.8),
        "sleep_quality":  (45, 12),
        "hrv_ms":         (48, 10),
        "resting_hr":     (68, 5),
        "steps":          (7000, 2000),
        "active_energy":  (320, 100),
        "stress_score":   (58, 15),
        "workout_freq":   0.4,
        "workout_intensity": "light",
    },
    "heavy_training": {
        "sleep_hours":    (7.2, 0.5),
        "sleep_quality":  (70, 8),
        "hrv_ms":         (52, 12),
        "resting_hr":     (62, 4),
        "steps":          (12000, 2500),
        "active_energy":  (720, 150),
        "stress_score":   (35, 12),
        "workout_freq":   0.85,
        "workout_intensity": "hard",
    },
    "high_stress": {
        "sleep_hours":    (6.1, 0.7),
        "sleep_quality":  (55, 10),
        "hrv_ms":         (44, 9),
        "resting_hr":     (70, 6),
        "steps":          (6500, 1500),
        "active_energy":  (280, 80),
        "stress_score":   (75, 12),
        "workout_freq":   0.3,
        "workout_intensity": "light",
    },
    "excellent": {
        "sleep_hours":    (8.5, 0.3),
        "sleep_quality":  (90, 5),
        "hrv_ms":         (82, 8),
        "resting_hr":     (48, 3),
        "steps":          (11000, 1800),
        "active_energy":  (600, 100),
        "stress_score":   (18, 8),
        "workout_freq":   0.65,
        "workout_intensity": "hard",
    },
    "conflicting": {
        "sleep_hours":    (7.8, 0.4),
        "sleep_quality":  (72, 8),
        "hrv_ms":         (45, 12),
        "resting_hr":     (67, 5),
        "steps":          (8500, 2000),
        "active_energy":  (420, 100),
        "stress_score":   (68, 14),
        "workout_freq":   0.55,
        "workout_intensity": "moderate",
    },
}

WORKOUT_TYPES = [
    "Running", "Cycling", "Strength Training", "HIIT",
    "Swimming", "Yoga", "Walking", "Rowing",
]

INTENSITY_DURATIONS = {
    "light":    (25, 45),
    "moderate": (35, 65),
    "hard":     (45, 90),
    "intense":  (50, 100),
}


def _gauss(mean: float, std: float) -> float:
    return random.gauss(mean, std)


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def generate_health_records(
    user_id: int,
    scenario: str = "fully_recovered",
    days: int = 42,
    end_date: Optional[date] = None,
) -> List[Dict]:
    """
    Generate synthetic daily health records for `days` ending on `end_date`.
    Returns a list of dicts suitable for bulk insert via HealthRecordBulkIn.
    """
    profile = SCENARIO_PROFILES.get(scenario, SCENARIO_PROFILES["fully_recovered"])
    if end_date is None:
        end_date = date.today()

    records: List[Dict] = []
    random.seed(42 + hash(scenario) % 100)  # reproducible per scenario

    for i in range(days):
        d = end_date - timedelta(days=(days - 1 - i))
        day_of_week = d.weekday()

        # Add mild weekly rhythm (better sleep on weekends)
        weekend_bonus = 0.3 if day_of_week >= 5 else 0.0

        def _metric(key: str, lo: float, hi: float) -> float:
            mean, std = profile[key]
            return _clamp(_gauss(mean + weekend_bonus, std), lo, hi)

        # Sleep
        records.append({
            "date": d, "metric_type": "sleep_hours",
            "value": round(_metric("sleep_hours", 2.0, 12.0), 2),
            "unit": "hours", "source": "simulator",
        })
        records.append({
            "date": d, "metric_type": "sleep_quality",
            "value": round(_metric("sleep_quality", 10.0, 100.0), 1),
            "unit": "score", "source": "simulator",
        })

        # Heart
        records.append({
            "date": d, "metric_type": "resting_heart_rate",
            "value": round(_metric("resting_hr", 35.0, 110.0), 1),
            "unit": "bpm", "source": "simulator",
        })
        records.append({
            "date": d, "metric_type": "hrv_ms",
            "value": round(_metric("hrv_ms", 10.0, 180.0), 1),
            "unit": "ms", "source": "simulator",
        })

        # Activity
        records.append({
            "date": d, "metric_type": "steps",
            "value": round(_metric("steps", 500.0, 30000.0)),
            "unit": "count", "source": "simulator",
        })
        records.append({
            "date": d, "metric_type": "active_energy_kcal",
            "value": round(_metric("active_energy", 50.0, 1500.0), 1),
            "unit": "kcal", "source": "simulator",
        })
        records.append({
            "date": d, "metric_type": "stress_score",
            "value": round(_metric("stress_score", 0.0, 100.0), 1),
            "unit": "score", "source": "simulator",
        })

    return records


def generate_workouts(
    user_id: int,
    scenario: str = "fully_recovered",
    days: int = 42,
    end_date: Optional[date] = None,
) -> List[Dict]:
    """Generate synthetic workout sessions."""
    profile  = SCENARIO_PROFILES.get(scenario, SCENARIO_PROFILES["fully_recovered"])
    if end_date is None:
        end_date = date.today()

    freq      = profile["workout_freq"]
    intensity = profile["workout_intensity"]
    dur_range = INTENSITY_DURATIONS.get(intensity, (35, 65))

    workouts: List[Dict] = []
    random.seed(99 + hash(scenario) % 100)

    for i in range(days):
        d = end_date - timedelta(days=(days - 1 - i))
        if random.random() > freq:
            continue
        duration = random.randint(*dur_range)
        wtype    = random.choice(WORKOUT_TYPES)
        avg_hr   = random.randint(120, 175)
        workouts.append({
            "date":           d,
            "workout_type":   wtype,
            "duration_mins":  duration,
            "energy_kcal":    round(duration * random.uniform(6.0, 12.0), 1),
            "avg_heart_rate": avg_hr,
            "max_heart_rate": avg_hr + random.randint(15, 35),
            "intensity":      intensity,
            "source":         "simulator",
        })

    return workouts


def get_available_scenarios() -> List[Dict]:
    """Return scenario descriptions for the UI selector."""
    return [
        {
            "id":          "fully_recovered",
            "name":        "Fully Recovered",
            "description": "Good sleep, low stress, normal HRV. Ready to train.",
        },
        {
            "id":          "poor_sleep",
            "name":        "Poor Sleep",
            "description": "Consistent sleep deficit, elevated resting HR.",
        },
        {
            "id":          "heavy_training",
            "name":        "Heavy Training Block",
            "description": "High workout frequency and volume — accumulated fatigue.",
        },
        {
            "id":          "high_stress",
            "name":        "High Life Stress",
            "description": "Elevated cortisol, disrupted HRV, poor recovery.",
        },
        {
            "id":          "excellent",
            "name":        "Peak Condition",
            "description": "Excellent sleep, very high HRV, low resting HR.",
        },
        {
            "id":          "conflicting",
            "name":        "Conflicting Signals",
            "description": "Good sleep but high stress and suppressed HRV.",
        },
    ]
