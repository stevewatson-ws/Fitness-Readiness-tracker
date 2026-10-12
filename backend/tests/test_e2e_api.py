"""
End-to-End API Pipeline Test:
Registers user -> logins -> loads scenario -> calculates readiness -> verifies rules & recommendation.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import Base
from app.models.database_session import engine

# Ensure DB tables are initialized
Base.metadata.create_all(bind=engine)

def test_full_application_lifecycle():
    with TestClient(app) as client:
        # 1. Health check
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # 2. Register
        email = "athlete@aurafitness.ai"
        password = "SuperSecurePassword123!"
        reg_res = client.post("/api/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Marcus Aurelius",
        })
        # If already exists from previous run, that's fine, we login
        assert reg_res.status_code in [201, 400]

        # 3. Login
        login_res = client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 4. User me
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == email

        # 5. Update Profile
        prof_res = client.put("/api/profile", headers=headers, json={
            "fitness_goal": "endurance",
            "experience_level": "intermediate",
            "weekly_workout_days": 5,
        })
        assert prof_res.status_code == 200

        # 6. Complete Onboarding
        onb_res = client.post("/api/profile/onboarding-complete", headers=headers)
        assert onb_res.status_code == 200

        # 7. Load 42 days of 'fully_recovered' scenario data
        sim_res = client.post("/api/simulator/load?scenario=fully_recovered&days=42", headers=headers)
        assert sim_res.status_code == 200
        data = sim_res.json()
        assert data["status"] == "success"
        assert data["records_added"] > 0

        # 8. Compute today's readiness
        readiness_res = client.get("/api/readiness/today?force=true", headers=headers)
        assert readiness_res.status_code == 200
        r_data = readiness_res.json()
        assert "readiness_score" in r_data
        assert 0 <= r_data["readiness_score"] <= 100
        assert r_data["readiness_state"] in ["excellent", "good", "moderate", "poor", "very_poor"]
        assert len(r_data["dominant_factors"]) > 0
        assert r_data["training_intensity"] is not None

        # 9. Test What-If Simulator
        what_if_res = client.post("/api/readiness/what-if", headers=headers, json={
            "overrides": {
                "sleep_hours": 9.5,
                "hrv": 85.0,
                "stress": 10.0,
            }
        })
        assert what_if_res.status_code == 200
        wi_data = what_if_res.json()
        assert "simulated_score" in wi_data
        assert "delta" in wi_data

        # 10. Test Check-in
        checkin_res = client.post("/api/checkin", headers=headers, json={
            "date": "2026-09-30",
            "energy_level": 5,
            "muscle_soreness": 1,
            "perceived_stress": 1,
            "sleep_quality_rating": 5,
            "notes": "Feeling unstoppable today!",
        })
        assert checkin_res.status_code in [200, 201]

        # 11. Test Readiness Trend (14 days)
        trend_res = client.get("/api/readiness/trend?days=14", headers=headers)
        assert trend_res.status_code == 200
        trend_data = trend_res.json()
        assert "scores" in trend_data

        # 12. Test Insights
        insights_res = client.get("/api/insights", headers=headers)
        assert insights_res.status_code == 200
        assert "insights" in insights_res.json()

        print("\n>>> ALL 12 END-TO-END PIPELINE STEPS PASSED SUCCESSFULLY! <<<")
