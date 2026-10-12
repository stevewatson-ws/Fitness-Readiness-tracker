"""
Fuzzy Inference Engine — Fitness Intelligence Readiness Calculator.

Implements a Mamdani-style fuzzy inference system:

  Crisp Inputs
      ↓
  Fuzzification  (map crisp values → membership degrees)
      ↓
  Rule Evaluation  (evaluate each rule antecedent via min-AND)
      ↓
  Implication  (clip consequent MF to activation strength)
      ↓
  Aggregation  (max over all rule outputs per output term)
      ↓
  Defuzzification  (centroid method → crisp readiness score)
      ↓
  Readiness Score + Training Recommendation
"""

import numpy as np
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any
import logging

from app.fuzzy.membership_functions import (
    UNIVERSES,
    get_sleep_hours_mf,
    get_sleep_quality_mf,
    get_hrv_mf,
    get_resting_hr_mf,
    get_stress_mf,
    get_soreness_mf,
    get_training_load_mf,
    get_energy_mf,
    get_readiness_mf,
    get_degree_of_membership,
)
from app.fuzzy.rules import (
    FUZZY_RULES,
    FuzzyRule,
    READINESS_TO_INTENSITY,
    READINESS_TO_DESCRIPTION,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Input / Output dataclasses
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class FuzzyInputs:
    """Crisp input values for the fuzzy inference engine."""
    sleep_hours:    float = 7.0
    sleep_quality:  float = 70.0   # 0-100
    hrv:            float = 60.0   # ms
    resting_hr:     float = 60.0   # bpm
    stress:         float = 40.0   # 0-100
    soreness:       float = 20.0   # 0-100
    training_load:  float = 40.0   # 0-100 normalised
    energy:         float = 60.0   # 0-100

    # Personal baselines — used to shift membership functions
    hrv_baseline:        float = 60.0
    resting_hr_baseline: float = 60.0


@dataclass
class RuleFiring:
    """Detail about a single fired rule."""
    rule_id:          int
    description:      str
    activation:       float
    consequent_term:  str
    consequent_var:   str


@dataclass
class MembershipDegrees:
    """Degree of membership of each input in each linguistic term."""
    sleep_hours:   Dict[str, float] = field(default_factory=dict)
    sleep_quality: Dict[str, float] = field(default_factory=dict)
    hrv:           Dict[str, float] = field(default_factory=dict)
    resting_hr:    Dict[str, float] = field(default_factory=dict)
    stress:        Dict[str, float] = field(default_factory=dict)
    soreness:      Dict[str, float] = field(default_factory=dict)
    training_load: Dict[str, float] = field(default_factory=dict)
    energy:        Dict[str, float] = field(default_factory=dict)


@dataclass
class FuzzyResult:
    """Complete output from one inference pass."""
    readiness_score:        float          # 0-100
    readiness_state:        str            # very_poor / poor / moderate / good / excellent
    training_intensity:     str            # rest / recovery / light / moderate / hard / intense
    recommendation_text:    str
    dominant_factors:       List[str]      = field(default_factory=list)
    rule_firings:           List[RuleFiring] = field(default_factory=list)
    membership_degrees:     Optional[MembershipDegrees] = None
    aggregated_output:      Optional[Dict[str, List[float]]] = None  # for visualisation
    confidence:             float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # Remove heavy arrays from default serialisation
        d.pop("aggregated_output", None)
        return d


# ─────────────────────────────────────────────────────────────────────────────
# Fuzzy Engine
# ─────────────────────────────────────────────────────────────────────────────

class FuzzyReadinessEngine:
    """
    Mamdani fuzzy inference system for daily fitness readiness scoring.

    Usage:
        engine = FuzzyReadinessEngine()
        result = engine.infer(inputs)
    """

    def __init__(self, rules: Optional[List[FuzzyRule]] = None):
        self.rules = rules or FUZZY_RULES

        # Build universe arrays once
        self._universes: Dict[str, np.ndarray] = {
            name: np.linspace(lo, hi, pts)
            for name, (lo, hi, pts) in UNIVERSES.items()
        }

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def infer(self, inputs: FuzzyInputs, include_debug: bool = False) -> FuzzyResult:
        """Run the full fuzzy inference pipeline and return a FuzzyResult."""
        logger.debug("FuzzyEngine.infer called with inputs=%s", inputs)

        # 1. Fuzzification
        mem_degrees = self._fuzzify(inputs)

        # 2. Rule evaluation + implication
        rule_firings, aggregated = self._evaluate_rules(mem_degrees, inputs)

        # 3. Defuzzification
        readiness_score = self._defuzzify(aggregated)
        readiness_score = float(np.clip(readiness_score, 0.0, 100.0))

        # 4. Linguistic label
        readiness_state = self._score_to_state(readiness_score)

        # 5. Recommendation
        intensity   = READINESS_TO_INTENSITY.get(readiness_state, "light")
        description = READINESS_TO_DESCRIPTION.get(readiness_state, "")

        # 6. Dominant factors
        factors = self._identify_dominant_factors(mem_degrees, inputs)

        result = FuzzyResult(
            readiness_score=round(readiness_score, 1),
            readiness_state=readiness_state,
            training_intensity=intensity,
            recommendation_text=description,
            dominant_factors=factors,
            rule_firings=rule_firings,
            membership_degrees=mem_degrees if include_debug else None,
            aggregated_output={k: v.tolist() for k, v in aggregated.items()} if include_debug else None,
            confidence=self._compute_confidence(rule_firings),
        )

        logger.info(
            "Readiness: %.1f (%s) → %s",
            readiness_score, readiness_state, intensity,
        )
        return result

    def simulate_what_if(
        self,
        base_inputs: FuzzyInputs,
        overrides: Dict[str, float],
    ) -> FuzzyResult:
        """
        Run a what-if simulation by applying overrides to base_inputs.
        Returns the simulated FuzzyResult.
        """
        import copy
        sim_inputs = copy.deepcopy(base_inputs)
        for attr, val in overrides.items():
            if hasattr(sim_inputs, attr):
                setattr(sim_inputs, attr, float(val))
        return self.infer(sim_inputs, include_debug=False)

    def get_membership_explanation(self, inputs: FuzzyInputs) -> Dict[str, Any]:
        """Return full membership degree breakdown for the explanation view."""
        mem = self._fuzzify(inputs)
        from dataclasses import asdict
        return asdict(mem)

    # ------------------------------------------------------------------
    # Internal pipeline
    # ------------------------------------------------------------------

    def _fuzzify(self, inputs: FuzzyInputs) -> MembershipDegrees:
        """Step 1 — map each crisp input to membership degrees."""
        u = self._universes

        sleep_mf   = get_sleep_hours_mf(u["sleep_hours"])
        squal_mf   = get_sleep_quality_mf(u["sleep_quality"])
        hrv_mf     = get_hrv_mf(u["hrv"], baseline=inputs.hrv_baseline)
        rhr_mf     = get_resting_hr_mf(u["resting_hr"], baseline=inputs.resting_hr_baseline)
        stress_mf  = get_stress_mf(u["stress"])
        sore_mf    = get_soreness_mf(u["soreness"])
        load_mf    = get_training_load_mf(u["training_load"])
        energy_mf  = get_energy_mf(u["energy"])

        return MembershipDegrees(
            sleep_hours=get_degree_of_membership(
                inputs.sleep_hours, sleep_mf, u["sleep_hours"]),
            sleep_quality=get_degree_of_membership(
                inputs.sleep_quality, squal_mf, u["sleep_quality"]),
            hrv=get_degree_of_membership(
                inputs.hrv, hrv_mf, u["hrv"]),
            resting_hr=get_degree_of_membership(
                inputs.resting_hr, rhr_mf, u["resting_hr"]),
            stress=get_degree_of_membership(
                inputs.stress, stress_mf, u["stress"]),
            soreness=get_degree_of_membership(
                inputs.soreness, sore_mf, u["soreness"]),
            training_load=get_degree_of_membership(
                inputs.training_load, load_mf, u["training_load"]),
            energy=get_degree_of_membership(
                inputs.energy, energy_mf, u["energy"]),
        )

    def _evaluate_rules(
        self,
        mem: MembershipDegrees,
        inputs: FuzzyInputs,
    ) -> tuple[List[RuleFiring], Dict[str, np.ndarray]]:
        """Steps 2-4 — evaluate rules and aggregate output MFs."""
        mem_map: Dict[str, Dict[str, float]] = {
            "sleep_hours":   mem.sleep_hours,
            "sleep_quality": mem.sleep_quality,
            "hrv":           mem.hrv,
            "resting_hr":    mem.resting_hr,
            "stress":        mem.stress,
            "soreness":      mem.soreness,
            "training_load": mem.training_load,
            "energy":        mem.energy,
        }

        # Precompute readiness output MFs on the readiness universe
        readiness_u = self._universes["readiness"]
        readiness_mf_arrays = get_readiness_mf(readiness_u)

        # Initialise aggregation accumulators (max-aggregation)
        aggregated: Dict[str, np.ndarray] = {
            term: np.zeros_like(readiness_u, dtype=float)
            for term in readiness_mf_arrays
        }

        firings: List[RuleFiring] = []

        for rule in self.rules:
            # Compute antecedent activation (min-AND across all antecedent terms)
            activation = rule.weight
            for var, term in rule.antecedents.items():
                degree = mem_map.get(var, {}).get(term, 0.0)
                activation = min(activation, degree)

            if activation < 1e-6:
                continue  # rule did not fire

            # Implication: clip the consequent MF at activation level
            for var, term in rule.consequent.items():
                if var == "readiness" and term in readiness_mf_arrays:
                    clipped = np.minimum(activation, readiness_mf_arrays[term])
                    aggregated[term] = np.maximum(aggregated[term], clipped)

                    firings.append(RuleFiring(
                        rule_id=rule.rule_id,
                        description=rule.description,
                        activation=round(activation, 4),
                        consequent_term=term,
                        consequent_var=var,
                    ))

        return firings, aggregated

    def _defuzzify(self, aggregated: Dict[str, np.ndarray]) -> float:
        """Step 5 — centroid defuzzification."""
        readiness_u = self._universes["readiness"]

        # Union of all aggregated output MFs
        combined = np.zeros_like(readiness_u, dtype=float)
        for arr in aggregated.values():
            combined = np.maximum(combined, arr)

        denominator = float(np.sum(combined))
        if denominator < 1e-9:
            # No rules fired — return a neutral moderate score
            return 50.0

        return float(np.sum(readiness_u * combined) / denominator)

    @staticmethod
    def _score_to_state(score: float) -> str:
        """Map numeric readiness score to linguistic state."""
        if score >= 82:
            return "excellent"
        elif score >= 65:
            return "good"
        elif score >= 45:
            return "moderate"
        elif score >= 25:
            return "poor"
        else:
            return "very_poor"

    @staticmethod
    def _compute_confidence(firings: List[RuleFiring]) -> float:
        """Confidence = average activation of fired rules."""
        if not firings:
            return 0.0
        return round(sum(f.activation for f in firings) / len(firings), 3)

    @staticmethod
    def _identify_dominant_factors(
        mem: MembershipDegrees,
        inputs: FuzzyInputs,
    ) -> List[str]:
        """Identify the most impactful positive/negative factors."""
        factors: List[str] = []

        # Sleep
        if mem.sleep_hours.get("excellent", 0) > 0.6:
            factors.append("✓ Excellent sleep duration")
        elif mem.sleep_hours.get("good", 0) > 0.6:
            factors.append("✓ Good sleep duration")
        elif mem.sleep_hours.get("poor", 0) > 0.5:
            factors.append("⚠ Poor sleep duration")

        if mem.sleep_quality.get("poor", 0) > 0.5:
            factors.append("⚠ Low sleep quality")
        elif mem.sleep_quality.get("excellent", 0) > 0.5:
            factors.append("✓ High sleep quality")

        # HRV
        if mem.hrv.get("high", 0) > 0.5:
            factors.append("✓ HRV above baseline")
        elif mem.hrv.get("low", 0) > 0.5:
            factors.append("⚠ HRV below baseline")

        # Resting HR
        if mem.resting_hr.get("highly_elevated", 0) > 0.4:
            factors.append("⚠ Resting HR significantly above baseline")
        elif mem.resting_hr.get("elevated", 0) > 0.4:
            factors.append("⚠ Resting HR slightly elevated")
        elif mem.resting_hr.get("normal", 0) > 0.6:
            factors.append("✓ Normal resting heart rate")

        # Stress
        if mem.stress.get("low", 0) > 0.5:
            factors.append("✓ Low stress")
        elif mem.stress.get("very_high", 0) > 0.5:
            factors.append("⚠ Very high stress")
        elif mem.stress.get("high", 0) > 0.5:
            factors.append("⚠ High stress")

        # Soreness
        if mem.soreness.get("none", 0) > 0.5:
            factors.append("✓ No muscle soreness")
        elif mem.soreness.get("severe", 0) > 0.4:
            factors.append("⚠ Severe muscle soreness")
        elif mem.soreness.get("moderate", 0) > 0.5:
            factors.append("⚠ Moderate muscle soreness")

        # Training load
        if mem.training_load.get("excessive", 0) > 0.4:
            factors.append("⚠ Excessive recent training load")
        elif mem.training_load.get("high", 0) > 0.5:
            factors.append("⚠ High recent training load")
        elif mem.training_load.get("low", 0) > 0.5:
            factors.append("✓ Low training load (well rested)")

        return factors[:6]  # top 6 most informative


# Singleton instance for import convenience
engine = FuzzyReadinessEngine()
