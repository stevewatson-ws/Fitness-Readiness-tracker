"""
Fuzzy Rule Base for the Fitness Intelligence Readiness Engine.

This module defines 30+ interpretable Mamdani-style fuzzy rules that map
combinations of physiological input states to readiness output states.

Rules are plain Python data structures for full transparency and easy
configurability — no black-box ML.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class FuzzyRule:
    """A single fuzzy IF-THEN rule."""
    rule_id: int
    description: str
    # antecedent: {variable_name: linguistic_term}
    # Each entry is AND-connected; use weight to handle OR-style patterns.
    antecedents: Dict[str, str]
    # consequent: {variable_name: linguistic_term}
    consequent: Dict[str, str]
    weight: float = 1.0  # rule weight 0-1


FUZZY_RULES: List[FuzzyRule] = [

    # ─── EXCELLENT READINESS ─────────────────────────────────────────────────
    FuzzyRule(
        rule_id=1,
        description="Perfect conditions — excellent sleep, low stress, high HRV, moderate load",
        antecedents={
            "sleep_hours":   "good",
            "sleep_quality": "excellent",
            "stress":        "low",
            "hrv":           "high",
            "training_load": "moderate",
            "soreness":      "none",
        },
        consequent={"readiness": "excellent"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=2,
        description="Excellent sleep + low stress + high HRV = excellent",
        antecedents={
            "sleep_hours":   "excellent",
            "stress":        "low",
            "hrv":           "high",
            "energy":        "high",
        },
        consequent={"readiness": "excellent"},
        weight=0.95,
    ),

    FuzzyRule(
        rule_id=3,
        description="Good sleep + low stress + normal HRV + low load = excellent",
        antecedents={
            "sleep_hours":   "good",
            "stress":        "low",
            "hrv":           "normal",
            "training_load": "low",
            "energy":        "high",
        },
        consequent={"readiness": "excellent"},
        weight=0.9,
    ),

    # ─── GOOD READINESS ───────────────────────────────────────────────────────
    FuzzyRule(
        rule_id=4,
        description="Good sleep + moderate stress + normal HRV + moderate load",
        antecedents={
            "sleep_hours":   "good",
            "sleep_quality": "good",
            "stress":        "moderate",
            "hrv":           "normal",
            "training_load": "moderate",
        },
        consequent={"readiness": "good"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=5,
        description="Good sleep + low stress + normal HRV + mild soreness",
        antecedents={
            "sleep_hours": "good",
            "stress":      "low",
            "hrv":         "normal",
            "soreness":    "mild",
        },
        consequent={"readiness": "good"},
        weight=0.9,
    ),

    FuzzyRule(
        rule_id=6,
        description="Excellent sleep + moderate stress + normal HRV",
        antecedents={
            "sleep_hours":   "excellent",
            "stress":        "moderate",
            "hrv":           "normal",
            "training_load": "moderate",
        },
        consequent={"readiness": "good"},
        weight=0.9,
    ),

    FuzzyRule(
        rule_id=7,
        description="Good sleep + low stress + low training load + moderate energy",
        antecedents={
            "sleep_hours":   "good",
            "stress":        "low",
            "training_load": "low",
            "energy":        "moderate",
        },
        consequent={"readiness": "good"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=8,
        description="Good sleep + high HRV despite moderate load",
        antecedents={
            "sleep_hours":   "good",
            "hrv":           "high",
            "training_load": "moderate",
            "soreness":      "mild",
        },
        consequent={"readiness": "good"},
        weight=0.88,
    ),

    # ─── MODERATE READINESS ───────────────────────────────────────────────────
    FuzzyRule(
        rule_id=9,
        description="Fair sleep + moderate stress + normal HRV + moderate load",
        antecedents={
            "sleep_hours": "fair",
            "stress":      "moderate",
            "hrv":         "normal",
            "training_load": "moderate",
        },
        consequent={"readiness": "moderate"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=10,
        description="Good sleep + high stress + normal HRV",
        antecedents={
            "sleep_hours": "good",
            "stress":      "high",
            "hrv":         "normal",
        },
        consequent={"readiness": "moderate"},
        weight=0.9,
    ),

    FuzzyRule(
        rule_id=11,
        description="Good sleep + moderate load + moderate soreness",
        antecedents={
            "sleep_hours":   "good",
            "training_load": "moderate",
            "soreness":      "moderate",
        },
        consequent={"readiness": "moderate"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=12,
        description="Fair sleep + low stress + normal HRV + high energy",
        antecedents={
            "sleep_hours": "fair",
            "stress":      "low",
            "hrv":         "normal",
            "energy":      "high",
        },
        consequent={"readiness": "moderate"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=13,
        description="Good sleep + high training load + mild soreness",
        antecedents={
            "sleep_hours":   "good",
            "training_load": "high",
            "soreness":      "mild",
        },
        consequent={"readiness": "moderate"},
        weight=0.88,
    ),

    FuzzyRule(
        rule_id=14,
        description="Elevated resting HR + fair sleep",
        antecedents={
            "resting_hr":  "elevated",
            "sleep_hours": "fair",
        },
        consequent={"readiness": "moderate"},
        weight=0.8,
    ),

    # ─── POOR READINESS ───────────────────────────────────────────────────────
    FuzzyRule(
        rule_id=15,
        description="Poor sleep + high stress + high training load",
        antecedents={
            "sleep_hours":   "poor",
            "stress":        "high",
            "training_load": "high",
        },
        consequent={"readiness": "poor"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=16,
        description="Poor sleep + low HRV + elevated resting HR",
        antecedents={
            "sleep_hours": "poor",
            "hrv":         "low",
            "resting_hr":  "elevated",
        },
        consequent={"readiness": "poor"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=17,
        description="Fair sleep + high stress + high load + moderate soreness",
        antecedents={
            "sleep_hours":   "fair",
            "stress":        "high",
            "training_load": "high",
            "soreness":      "moderate",
        },
        consequent={"readiness": "poor"},
        weight=0.95,
    ),

    FuzzyRule(
        rule_id=18,
        description="Fair sleep + very high stress",
        antecedents={
            "sleep_hours": "fair",
            "stress":      "very_high",
        },
        consequent={"readiness": "poor"},
        weight=0.9,
    ),

    FuzzyRule(
        rule_id=19,
        description="Severe soreness + high training load",
        antecedents={
            "soreness":      "severe",
            "training_load": "high",
        },
        consequent={"readiness": "poor"},
        weight=0.92,
    ),

    FuzzyRule(
        rule_id=20,
        description="Low HRV + very high stress",
        antecedents={
            "hrv":    "low",
            "stress": "very_high",
        },
        consequent={"readiness": "poor"},
        weight=0.9,
    ),

    FuzzyRule(
        rule_id=21,
        description="Highly elevated resting HR + poor sleep + low HRV",
        antecedents={
            "resting_hr":  "highly_elevated",
            "sleep_hours": "poor",
            "hrv":         "low",
        },
        consequent={"readiness": "poor"},
        weight=1.0,
    ),

    # ─── VERY POOR READINESS ─────────────────────────────────────────────────
    FuzzyRule(
        rule_id=22,
        description="Poor sleep + very high stress + excessive load + severe soreness",
        antecedents={
            "sleep_hours":   "poor",
            "stress":        "very_high",
            "training_load": "excessive",
            "soreness":      "severe",
        },
        consequent={"readiness": "very_poor"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=23,
        description="Poor sleep + very high stress + low HRV",
        antecedents={
            "sleep_hours": "poor",
            "stress":      "very_high",
            "hrv":         "low",
        },
        consequent={"readiness": "very_poor"},
        weight=1.0,
    ),

    FuzzyRule(
        rule_id=24,
        description="Highly elevated resting HR + very high stress + excessive load",
        antecedents={
            "resting_hr":    "highly_elevated",
            "stress":        "very_high",
            "training_load": "excessive",
        },
        consequent={"readiness": "very_poor"},
        weight=0.95,
    ),

    FuzzyRule(
        rule_id=25,
        description="Severe soreness + very high stress + poor sleep",
        antecedents={
            "soreness":    "severe",
            "stress":      "very_high",
            "sleep_hours": "poor",
        },
        consequent={"readiness": "very_poor"},
        weight=0.95,
    ),

    # ─── ENERGY-DRIVEN ADJUSTMENTS ────────────────────────────────────────────
    FuzzyRule(
        rule_id=26,
        description="Low energy + high stress degrades readiness toward poor",
        antecedents={
            "energy": "low",
            "stress": "high",
        },
        consequent={"readiness": "poor"},
        weight=0.8,
    ),

    FuzzyRule(
        rule_id=27,
        description="High energy + low training load boosts toward good",
        antecedents={
            "energy":        "high",
            "training_load": "low",
            "stress":        "low",
        },
        consequent={"readiness": "good"},
        weight=0.8,
    ),

    # ─── LOAD-BASED RULES ────────────────────────────────────────────────────
    FuzzyRule(
        rule_id=28,
        description="Excessive training load alone reduces readiness",
        antecedents={
            "training_load": "excessive",
        },
        consequent={"readiness": "poor"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=29,
        description="Low training load + good sleep + low stress = good readiness",
        antecedents={
            "training_load": "low",
            "sleep_hours":   "good",
            "stress":        "low",
        },
        consequent={"readiness": "good"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=30,
        description="Moderate load + good sleep + moderate stress = moderate readiness",
        antecedents={
            "training_load": "moderate",
            "sleep_hours":   "good",
            "stress":        "moderate",
        },
        consequent={"readiness": "moderate"},
        weight=0.85,
    ),

    # ─── HRV-FOCUSED RULES ───────────────────────────────────────────────────
    FuzzyRule(
        rule_id=31,
        description="High HRV is a strong positive signal even with moderate stress",
        antecedents={
            "hrv":    "high",
            "stress": "moderate",
            "sleep_hours": "good",
        },
        consequent={"readiness": "good"},
        weight=0.88,
    ),

    FuzzyRule(
        rule_id=32,
        description="Low HRV + moderate load suggests under-recovery",
        antecedents={
            "hrv":           "low",
            "training_load": "moderate",
        },
        consequent={"readiness": "moderate"},
        weight=0.82,
    ),

    FuzzyRule(
        rule_id=33,
        description="Low HRV + high load = poor readiness",
        antecedents={
            "hrv":           "low",
            "training_load": "high",
        },
        consequent={"readiness": "poor"},
        weight=0.9,
    ),

    # ─── SLEEP QUALITY OVERRIDE ───────────────────────────────────────────────
    FuzzyRule(
        rule_id=34,
        description="Poor sleep quality despite adequate duration",
        antecedents={
            "sleep_quality": "poor",
            "training_load": "moderate",
        },
        consequent={"readiness": "moderate"},
        weight=0.85,
    ),

    FuzzyRule(
        rule_id=35,
        description="Excellent sleep quality + high energy + normal HRV",
        antecedents={
            "sleep_quality": "excellent",
            "energy":        "high",
            "hrv":           "normal",
        },
        consequent={"readiness": "good"},
        weight=0.88,
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
# Training intensity recommendation mapping
# ─────────────────────────────────────────────────────────────────────────────

READINESS_TO_INTENSITY: Dict[str, str] = {
    "very_poor": "rest",
    "poor":      "recovery",
    "moderate":  "light",
    "good":      "moderate",      # good readiness → moderate-to-hard
    "excellent": "hard",
}


READINESS_TO_DESCRIPTION: Dict[str, str] = {
    "very_poor": "Your body needs complete rest today.",
    "poor":      "Focus on rest and gentle recovery activities.",
    "moderate":  "Light to moderate activity is appropriate.",
    "good":      "You're ready for a solid workout today.",
    "excellent": "Your body is primed for high-intensity training.",
}
