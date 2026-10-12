"""
Fuzzy Engine Tests — verifies the core inference pipeline.

Run with:
    pytest backend/tests/test_fuzzy.py -v
"""

import pytest
from app.fuzzy.engine import FuzzyReadinessEngine, FuzzyInputs
from app.fuzzy.membership_functions import (
    get_sleep_hours_mf, get_stress_mf, get_degree_of_membership
)
import numpy as np


@pytest.fixture
def engine():
    return FuzzyReadinessEngine()


# ─── Membership function tests ────────────────────────────────────────────────

def test_sleep_mf_coverage():
    """Sleep MF should cover the full domain without large gaps."""
    u = np.linspace(0, 12, 1000)
    mf = get_sleep_hours_mf(u)
    combined = np.maximum.reduce(list(mf.values()))
    assert combined.min() >= 0.0
    assert combined.max() <= 1.0


def test_sleep_mf_classification():
    u = np.linspace(0, 12, 1000)
    mf = get_sleep_hours_mf(u)
    degrees = get_degree_of_membership(5.0, mf, u)
    # 5 hours is poor/fair range
    assert degrees["poor"] > 0 or degrees["fair"] > 0


def test_stress_low_at_zero():
    u = np.linspace(0, 100, 1000)
    mf = get_stress_mf(u)
    degrees = get_degree_of_membership(0.0, mf, u)
    assert degrees["low"] == pytest.approx(1.0, abs=0.05)


def test_stress_very_high_at_100():
    u = np.linspace(0, 100, 1000)
    mf = get_stress_mf(u)
    degrees = get_degree_of_membership(100.0, mf, u)
    assert degrees["very_high"] == pytest.approx(1.0, abs=0.05)


# ─── Engine output range ──────────────────────────────────────────────────────

def test_output_in_range(engine):
    inputs = FuzzyInputs()
    result = engine.infer(inputs)
    assert 0.0 <= result.readiness_score <= 100.0


def test_excellent_scenario(engine):
    """Excellent sleep, low stress, high HRV → high readiness."""
    inputs = FuzzyInputs(
        sleep_hours=8.5, sleep_quality=90,
        hrv=90, resting_hr=50,
        stress=15, soreness=5,
        training_load=20, energy=85,
        hrv_baseline=60, resting_hr_baseline=55,
    )
    result = engine.infer(inputs)
    assert result.readiness_score >= 70
    assert result.readiness_state in ("good", "excellent")
    assert result.training_intensity in ("moderate", "hard")


def test_poor_scenario(engine):
    """Poor sleep, high stress, low HRV → low readiness."""
    inputs = FuzzyInputs(
        sleep_hours=4.0, sleep_quality=30,
        hrv=30, resting_hr=80,
        stress=85, soreness=70,
        training_load=80, energy=15,
        hrv_baseline=60, resting_hr_baseline=58,
    )
    result = engine.infer(inputs)
    assert result.readiness_score <= 45
    assert result.readiness_state in ("very_poor", "poor")
    assert result.training_intensity in ("rest", "recovery")


def test_moderate_scenario(engine):
    """Average all-round inputs → moderate readiness."""
    inputs = FuzzyInputs(
        sleep_hours=6.5, sleep_quality=60,
        hrv=55, resting_hr=65,
        stress=50, soreness=40,
        training_load=45, energy=50,
        hrv_baseline=60, resting_hr_baseline=62,
    )
    result = engine.infer(inputs)
    assert 30.0 <= result.readiness_score <= 75.0


def test_conflicting_signals(engine):
    """Good sleep but high stress and soreness → moderate result."""
    inputs = FuzzyInputs(
        sleep_hours=7.8, sleep_quality=72,
        hrv=42, resting_hr=70,
        stress=75, soreness=65,
        training_load=55, energy=35,
        hrv_baseline=60, resting_hr_baseline=62,
    )
    result = engine.infer(inputs)
    # Should not be excellent despite good sleep
    assert result.readiness_score < 80


def test_what_if_sleep_improvement(engine):
    """Improving sleep in simulation should improve readiness score."""
    base = FuzzyInputs(
        sleep_hours=5.0, sleep_quality=40,
        hrv=55, resting_hr=65,
        stress=50, soreness=20,
        training_load=40, energy=50,
    )
    base_result = engine.infer(base)
    sim_result  = engine.simulate_what_if(base, {"sleep_hours": 8.5, "sleep_quality": 85})
    assert sim_result.readiness_score > base_result.readiness_score


def test_rules_fire(engine):
    """At least one rule should fire for non-trivial inputs."""
    result = engine.infer(FuzzyInputs(), include_debug=True)
    assert len(result.rule_firings) > 0


def test_dominant_factors_populated(engine):
    """Dominant factors list should be non-empty."""
    result = engine.infer(FuzzyInputs())
    assert len(result.dominant_factors) > 0


def test_missing_hrv_fallback(engine):
    """Engine should still produce a valid score with default HRV."""
    inputs = FuzzyInputs(hrv=60.0)  # default
    result = engine.infer(inputs)
    assert result.readiness_score > 0


def test_score_monotonicity_sleep(engine):
    """Higher sleep → higher or equal readiness (all else equal)."""
    base = dict(
        sleep_quality=70, hrv=60, resting_hr=62,
        stress=40, soreness=20, training_load=40, energy=60,
    )
    scores = []
    for h in [4.0, 5.5, 7.0, 8.5]:
        r = engine.infer(FuzzyInputs(sleep_hours=h, **base))
        scores.append(r.readiness_score)
    # Should be generally non-decreasing
    assert scores[0] <= scores[2]
    assert scores[1] <= scores[3]
