"""
Insights Engine — generates personalized, data-driven insights.

Each insight is a plain-language observation about a meaningful pattern
in the user's health or readiness data. NOT motivational quotes.
"""

from datetime import date, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.models.database import ReadinessScore, HealthRecord, PersonalBaseline
from app.models.schemas import Insight


def generate_insights(
    db: Session,
    user_id: int,
    limit: int = 8,
) -> List[Insight]:
    """Generate up to `limit` actionable insights for the current user."""
    insights: List[Insight] = []
    today     = date.today()
    week_ago  = today - timedelta(days=7)
    two_weeks = today - timedelta(days=14)

    # ── Helper to fetch recent readiness rows ─────────────────────────────
    recent_scores = (
        db.query(ReadinessScore)
        .filter(ReadinessScore.user_id == user_id, ReadinessScore.date >= week_ago)
        .order_by(ReadinessScore.date)
        .all()
    )
    last_14_scores = (
        db.query(ReadinessScore)
        .filter(ReadinessScore.user_id == user_id, ReadinessScore.date >= two_weeks)
        .order_by(ReadinessScore.date)
        .all()
    )

    baseline = db.query(PersonalBaseline).filter(PersonalBaseline.user_id == user_id).first()

    # ── 1. Consecutive improvement ────────────────────────────────────────
    if len(recent_scores) >= 3:
        streak = 0
        for i in range(len(recent_scores) - 1, 0, -1):
            if recent_scores[i].readiness_score > recent_scores[i - 1].readiness_score:
                streak += 1
            else:
                break
        if streak >= 2:
            insights.append(Insight(
                type="positive",
                metric="readiness",
                title="Readiness Improving",
                body=f"Your readiness score has improved for {streak + 1} consecutive days. "
                     "Your body is responding well to your recent routine.",
                date=today,
            ))

    # ── 2. Consecutive decline ────────────────────────────────────────────
    if len(recent_scores) >= 3:
        decline = 0
        for i in range(len(recent_scores) - 1, 0, -1):
            if recent_scores[i].readiness_score < recent_scores[i - 1].readiness_score - 3:
                decline += 1
            else:
                break
        if decline >= 2:
            insights.append(Insight(
                type="warning",
                metric="readiness",
                title="Readiness Declining",
                body=f"Your readiness has declined for {decline + 1} consecutive days. "
                     "Consider prioritising sleep and recovery.",
                date=today,
            ))

    # ── 3. Sleep trend ────────────────────────────────────────────────────
    sleep_records = (
        db.query(HealthRecord)
        .filter(
            HealthRecord.user_id == user_id,
            HealthRecord.metric_type == "sleep_hours",
            HealthRecord.date >= week_ago,
        )
        .all()
    )
    if sleep_records:
        avg_sleep = sum(r.value for r in sleep_records) / len(sleep_records)
        baseline_sleep = baseline.sleep_hours_avg if baseline and baseline.sleep_hours_avg else 7.0
        if avg_sleep < baseline_sleep - 0.75:
            insights.append(Insight(
                type="warning",
                metric="sleep",
                title="Sleep Below Your Baseline",
                body=f"Your average sleep this week ({avg_sleep:.1f}h) is "
                     f"{baseline_sleep - avg_sleep:.1f}h below your normal baseline. "
                     "Chronic sleep deficit significantly impacts recovery.",
                date=today,
            ))
        elif avg_sleep > baseline_sleep + 0.5:
            insights.append(Insight(
                type="positive",
                metric="sleep",
                title="Strong Sleep Week",
                body=f"You've been sleeping {avg_sleep:.1f}h on average — "
                     f"{avg_sleep - baseline_sleep:.1f}h above your baseline. "
                     "Quality sleep is your best recovery tool.",
                date=today,
            ))

    # ── 4. Resting HR above baseline ─────────────────────────────────────
    rhr_records = (
        db.query(HealthRecord)
        .filter(
            HealthRecord.user_id == user_id,
            HealthRecord.metric_type == "resting_heart_rate",
            HealthRecord.date >= today - timedelta(days=3),
        )
        .order_by(HealthRecord.date.desc())
        .all()
    )
    if rhr_records and baseline and baseline.resting_hr_avg:
        recent_rhr = rhr_records[0].value
        if recent_rhr > baseline.resting_hr_avg + 7:
            insights.append(Insight(
                type="warning",
                metric="resting_hr",
                title="Elevated Resting Heart Rate",
                body=f"Your resting HR today ({recent_rhr:.0f} bpm) is "
                     f"{recent_rhr - baseline.resting_hr_avg:.0f} bpm above your baseline "
                     f"({baseline.resting_hr_avg:.0f} bpm). This often signals incomplete recovery.",
                date=today,
            ))

    # ── 5. HRV suppression ────────────────────────────────────────────────
    hrv_records = (
        db.query(HealthRecord)
        .filter(
            HealthRecord.user_id == user_id,
            HealthRecord.metric_type == "hrv_ms",
            HealthRecord.date >= today - timedelta(days=3),
        )
        .all()
    )
    if hrv_records and baseline and baseline.hrv_avg_ms:
        recent_hrv = sum(r.value for r in hrv_records) / len(hrv_records)
        if recent_hrv < baseline.hrv_avg_ms * 0.80:
            insights.append(Insight(
                type="warning",
                metric="hrv",
                title="HRV Below Baseline",
                body=f"Your recent HRV ({recent_hrv:.0f} ms) is more than 20% below "
                     f"your personal baseline ({baseline.hrv_avg_ms:.0f} ms). "
                     "This is a strong recovery signal — consider reducing intensity.",
                date=today,
            ))
        elif recent_hrv > baseline.hrv_avg_ms * 1.10:
            insights.append(Insight(
                type="positive",
                metric="hrv",
                title="HRV Above Baseline",
                body=f"Your HRV ({recent_hrv:.0f} ms) is tracking above your baseline — "
                     "a positive sign of recovery and readiness.",
                date=today,
            ))

    # ── 6. High training load ─────────────────────────────────────────────
    if recent_scores:
        avg_load = sum(
            (s.training_load_7d or 0) for s in recent_scores
        ) / len(recent_scores)
        baseline_load = baseline.weekly_load_avg if baseline and baseline.weekly_load_avg else 40.0
        if avg_load > baseline_load * 1.3:
            insights.append(Insight(
                type="info",
                metric="training_load",
                title="Training Load Above Normal",
                body="Your recent training volume is higher than your normal level. "
                     "Ensure adequate sleep and nutrition to support recovery.",
                date=today,
            ))

    # ── 7. Low activity week ──────────────────────────────────────────────
    step_records = (
        db.query(HealthRecord)
        .filter(
            HealthRecord.user_id == user_id,
            HealthRecord.metric_type == "steps",
            HealthRecord.date >= week_ago,
        )
        .all()
    )
    if step_records:
        avg_steps = sum(r.value for r in step_records) / len(step_records)
        baseline_steps = baseline.steps_avg if baseline and baseline.steps_avg else 8000
        if avg_steps < baseline_steps * 0.65:
            insights.append(Insight(
                type="info",
                metric="steps",
                title="Low Activity Week",
                body=f"Your average step count this week ({avg_steps:,.0f}) is notably "
                     "lower than usual. Light movement can aid recovery.",
                date=today,
            ))

    # ── 8. Readiness much higher today ───────────────────────────────────
    if len(last_14_scores) >= 2:
        today_score = next((s for s in reversed(last_14_scores) if s.date == today), None)
        prev_score  = last_14_scores[-2] if len(last_14_scores) >= 2 else None
        if today_score and prev_score:
            delta = today_score.readiness_score - prev_score.readiness_score
            if delta >= 10:
                insights.append(Insight(
                    type="positive",
                    metric="readiness",
                    title="Readiness Jumped Today",
                    body=f"Your readiness is {delta:.0f} points higher than yesterday. "
                         "Your body has recovered well — good day for a quality session.",
                    date=today,
                ))
            elif delta <= -10:
                insights.append(Insight(
                    type="warning",
                    metric="readiness",
                    title="Readiness Dropped Today",
                    body=f"Your readiness is {abs(delta):.0f} points lower than yesterday. "
                         "Listen to your body and consider an easier session.",
                    date=today,
                ))

    return insights[:limit]
