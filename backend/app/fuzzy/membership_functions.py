"""
Fuzzy Membership Functions for the Fitness Intelligence Readiness Engine.

Each physiological input variable is mapped to linguistic terms using
triangular or trapezoidal membership functions. These functions form the
foundation of the fuzzy inference system.
"""

import numpy as np
from typing import Dict, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Universe of Discourse definitions
# ─────────────────────────────────────────────────────────────────────────────

UNIVERSES: Dict[str, Tuple[float, float, int]] = {
    "sleep_hours":     (0.0,  12.0, 1000),
    "sleep_quality":   (0.0,  100.0, 1000),
    "hrv":             (0.0,  200.0, 1000),   # ms
    "resting_hr":      (30.0, 120.0, 1000),   # bpm
    "stress":          (0.0,  100.0, 1000),
    "soreness":        (0.0,  100.0, 1000),
    "training_load":   (0.0,  100.0, 1000),   # normalised 0-100
    "energy":          (0.0,  100.0, 1000),
    "recovery_score":  (0.0,  100.0, 1000),
    "readiness":       (0.0,  100.0, 1000),   # OUTPUT
}


def _trimf(x: np.ndarray, abc: Tuple[float, float, float]) -> np.ndarray:
    """Triangular membership function."""
    a, b, c = abc
    result = np.zeros_like(x, dtype=float)
    if b == a:
        result = np.where(x == a, 1.0, result)
    else:
        result = np.where((x > a) & (x <= b), (x - a) / (b - a), result)
    if c == b:
        result = np.where(x == b, 1.0, result)
    else:
        result = np.where((x > b) & (x < c), (c - x) / (c - b), result)
    result = np.where(x == b, 1.0, result)
    return np.clip(result, 0.0, 1.0)


def _trapmf(x: np.ndarray, abcd: Tuple[float, float, float, float]) -> np.ndarray:
    """Trapezoidal membership function."""
    a, b, c, d = abcd
    result = np.zeros_like(x, dtype=float)
    result = np.where((x >= b) & (x <= c), 1.0, result)
    if b > a:
        result = np.where((x > a) & (x < b), (x - a) / (b - a), result)
    if d > c:
        result = np.where((x > c) & (x < d), (d - x) / (d - c), result)
    return np.clip(result, 0.0, 1.0)


def _sigmf(x: np.ndarray, c: float, a: float = 0.2) -> np.ndarray:
    """Sigmoid membership function for smooth boundaries."""
    return 1.0 / (1.0 + np.exp(-a * (x - c)))


# ─────────────────────────────────────────────────────────────────────────────
# Membership function dictionaries
# ─────────────────────────────────────────────────────────────────────────────

def get_sleep_hours_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Sleep duration membership functions (hours)."""
    return {
        "poor":      _trapmf(x, (0.0, 0.0, 4.0, 5.5)),
        "fair":      _trimf(x,  (4.5, 6.0, 7.0)),
        "good":      _trimf(x,  (6.0, 7.5, 9.0)),
        "excellent": _trapmf(x, (8.0, 9.0, 12.0, 12.0)),
    }


def get_sleep_quality_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Sleep quality membership functions (0-100)."""
    return {
        "poor":      _trapmf(x, (0.0,  0.0,  25.0, 40.0)),
        "fair":      _trimf(x,  (25.0, 45.0, 65.0)),
        "good":      _trimf(x,  (55.0, 70.0, 85.0)),
        "excellent": _trapmf(x, (75.0, 85.0, 100.0, 100.0)),
    }


def get_hrv_mf(x: np.ndarray, baseline: float = 60.0) -> Dict[str, np.ndarray]:
    """
    HRV membership functions relative to personal baseline.
    Baseline shifts the membership centres so the system is personal.
    """
    low_centre = baseline * 0.65
    normal_centre = baseline
    high_centre = baseline * 1.35
    return {
        "low":    _trapmf(x, (0.0, 0.0, low_centre * 0.8, low_centre * 1.2)),
        "normal": _trimf(x,  (low_centre, normal_centre, high_centre)),
        "high":   _trapmf(x, (normal_centre * 1.1, high_centre, 200.0, 200.0)),
    }


def get_resting_hr_mf(x: np.ndarray, baseline: float = 60.0) -> Dict[str, np.ndarray]:
    """
    Resting heart-rate membership functions relative to personal baseline.
    Lower HR = better recovery (inverse relationship).
    """
    normal_upper = baseline + 5
    elevated_upper = baseline + 12
    return {
        "normal":          _trapmf(x, (30.0, 30.0, baseline, normal_upper)),
        "elevated":        _trimf(x,  (baseline, normal_upper + 3, elevated_upper)),
        "highly_elevated": _trapmf(x, (elevated_upper - 2, elevated_upper + 3, 120.0, 120.0)),
    }


def get_stress_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Stress level membership functions (0-100)."""
    return {
        "low":       _trapmf(x, (0.0,  0.0,  20.0, 35.0)),
        "moderate":  _trimf(x,  (25.0, 45.0, 60.0)),
        "high":      _trimf(x,  (50.0, 65.0, 80.0)),
        "very_high": _trapmf(x, (70.0, 82.0, 100.0, 100.0)),
    }


def get_soreness_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Muscle soreness membership functions (0-100)."""
    return {
        "none":     _trapmf(x, (0.0,  0.0,  10.0, 22.0)),
        "mild":     _trimf(x,  (15.0, 30.0, 48.0)),
        "moderate": _trimf(x,  (38.0, 55.0, 72.0)),
        "severe":   _trapmf(x, (62.0, 75.0, 100.0, 100.0)),
    }


def get_training_load_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Training load membership functions (0-100 normalised)."""
    return {
        "low":       _trapmf(x, (0.0,  0.0,  15.0, 30.0)),
        "moderate":  _trimf(x,  (20.0, 40.0, 58.0)),
        "high":      _trimf(x,  (48.0, 65.0, 80.0)),
        "excessive": _trapmf(x, (72.0, 82.0, 100.0, 100.0)),
    }


def get_energy_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Subjective energy level membership functions (0-100)."""
    return {
        "low":      _trapmf(x, (0.0,  0.0,  25.0, 40.0)),
        "moderate": _trimf(x,  (30.0, 50.0, 70.0)),
        "high":     _trapmf(x, (60.0, 75.0, 100.0, 100.0)),
    }


def get_readiness_mf(x: np.ndarray) -> Dict[str, np.ndarray]:
    """Output readiness score membership functions (0-100)."""
    return {
        "very_poor": _trapmf(x, (0.0,  0.0,  10.0, 22.0)),
        "poor":      _trimf(x,  (12.0, 25.0, 40.0)),
        "moderate":  _trimf(x,  (32.0, 50.0, 65.0)),
        "good":      _trimf(x,  (58.0, 72.0, 85.0)),
        "excellent": _trapmf(x, (78.0, 88.0, 100.0, 100.0)),
    }


def get_degree_of_membership(value: float, mf_dict: Dict[str, np.ndarray],
                              universe: np.ndarray) -> Dict[str, float]:
    """
    Given a crisp input value, return the degree of membership for each
    linguistic term by interpolating the precomputed membership arrays.
    """
    return {
        term: float(np.interp(value, universe, mf_array))
        for term, mf_array in mf_dict.items()
    }
