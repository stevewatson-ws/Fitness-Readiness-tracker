# AURA — Adaptive Physiological Fitness Intelligence

> **A production-grade Fitness Intelligence application powered by Fuzzy Logic, Soft Computing, and Apple HealthKit synchronization.**
> Calculates daily physiological readiness scores, explains exact rule activations, provides interactive What-If scenario simulations, and generates calibrated workout prescriptions.

---

## 🌟 Key Architecture & Capabilities

### 1. Soft Computing & Fuzzy Logic Engine (`backend/app/fuzzy`)
- **Fuzzification**: Transforms continuous biometric inputs into linguistic membership distributions (e.g. Gaussian and Trapezoidal curves for Sleep Duration, HRV vs 60-Day Baseline, Resting Heart Rate Deviation, Perceived Stress, and Muscle Soreness).
- **Mamdani Rule Base**: Domain-expert inference rules evaluating joint antecedent activation strengths ($\alpha = \min(\mu_A(x), \mu_B(y))$).
- **Centroid Defuzzification**: Aggregates output curves into a smooth continuous readiness score $[0, 100]$ without sharp artificial cliff thresholds.
- **Explainability**: Every calculation exposes the exact dominant factors, rule firings, and antecedent membership degrees.
- **What-If Simulation**: Test hypothetical adjustments (e.g., "+1.5h sleep", "-20 stress") with live delta scoring.

### 2. Apple HealthKit Integration (`ios/FitnessIntelligence`)
- **Native Swift HKHealthStore Manager**: Queries sleep macro-architecture (Deep, REM, Core), resting heart rate, heart rate variability (SDNN/rMSSD), and active workouts.
- **Background Delivery**: Subscribes to `enableBackgroundDelivery` for automatic morning synchronization.
- **Sync Service**: POSTs payloads to `/api/sync/apple-health` with automatic baseline recalibration.
- **Real-world data source**: Uses your actual Apple Health metrics rather than synthetic scenario data for readiness calculations.

### 3. Application Lifecycle & React Frontend (`web/`)
- **Landing Page**: Value proposition, soft-computing pipeline explanation, and interactive readiness preview.
- **Onboarding Wizard**: 6-step flow covering goals, experience level, biometric permissions, and scenario setup.
- **Today's Readiness**: Animated SVG readiness gauge, dominant factors breakdown, and calibrated workout intensity.
- **Workout Intelligence**: Live workout tracker with timer, simulated heart rate zone feedback, RPE selector, and load scoring.
- **Recovery & Autonomic Hub**: HRV baseline comparison, resting HR deviation, sleep stage distribution chart, and interactive vagal nerve down-regulation breathwork box.
- **Insights & Logic**: 4-stage pipeline explainer, live rule firings table, and What-If parameter sliders.
- **History & Trends**: Area chart visualizing rolling readiness and daily log.
- **Profile & Settings**: Karvonen heart rate zones calculator, 60-day baseline statistics, and full JSON health data export.

---

## 🚀 Quickstart Guide

### 1. Backend Setup (FastAPI & SQLite)

```bash
cd backend
# Run test suite (15 unit & e2e tests)
pytest tests/ -v

# Start FastAPI dev server (runs on http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API Documentation: `http://localhost:8000/docs`
- ReDoc API Documentation: `http://localhost:8000/redoc`

### 2. Frontend Setup (React & Vite)

```bash
cd web
npm install
npm run dev
```
- Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Test Verification

All unit tests and end-to-end integration tests are verified and passing:
- `backend/tests/test_fuzzy.py`: 14 tests verifying membership curves, Mamdani inference, monotonicity, what-if deltas, and edge-case handling.
- `backend/tests/test_e2e_api.py`: Complete 12-step lifecycle test covering registration, authentication, onboarding, synthetic scenario loading, readiness calculation, what-if simulation, check-in, trends, and insights.
