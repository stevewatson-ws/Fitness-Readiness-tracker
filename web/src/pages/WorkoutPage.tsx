import React, { useState, useEffect } from 'react';
import { readinessApi, healthApi } from '../services/api';
import { Flame, Play, Square, Check, Clock, Heart, Award, ArrowUpRight, Zap, Dumbbell, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface WorkoutPlan {
  title: string;
  type: string;
  targetDuration: number;
  targetZone: string;
  intensity: string;
  description: string;
  exercises: { name: string; sets?: string; focus: string }[];
}

export default function WorkoutPage() {
  const [readiness, setReadiness] = useState<any>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Workout Tracker State
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentHr, setCurrentHr] = useState(132);
  const [activePlan, setActivePlan] = useState<string>('Target Zone Session');
  const [rpe, setRpe] = useState<number>(7);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rRes, wRes] = await Promise.all([
        readinessApi.today(),
        healthApi.listWorkouts(),
      ]);
      setReadiness(rRes.data);
      setWorkouts(wRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Timer loop for active session
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
        // Realistic HR jitter around target zone
        setCurrentHr((prev) => {
          const jitter = Math.floor(Math.random() * 5) - 2;
          return Math.min(185, Math.max(115, prev + jitter));
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getRecommendedPlans = (intensity: string): WorkoutPlan[] => {
    switch (intensity?.toLowerCase()) {
      case 'intense':
      case 'hard':
        return [
          {
            title: 'High-Intensity Interval Training (HIIT)',
            type: 'HIIT / Anaerobic',
            targetDuration: 45,
            targetZone: 'Zone 4-5 (160-185 bpm)',
            intensity: 'High',
            description: 'Your physiology shows exceptional readiness. Push peak power intervals with full confidence.',
            exercises: [
              { name: 'Warm-up Mobility & Dynamic Drills', sets: '8 mins', focus: 'Zone 1-2' },
              { name: '4x4 Norwegian VO2Max Intervals', sets: '4x4 min at 90% HRmax', focus: 'Zone 4-5' },
              { name: 'Plyometric Box Jumps & Kettlebell Swings', sets: '3 sets of 12', focus: 'Power' },
              { name: 'Cool-down Active Breathing', sets: '5 mins', focus: 'Parasympathetic recovery' },
            ],
          },
          {
            title: 'Heavy Compound Strength & Hypertrophy',
            type: 'Strength',
            targetDuration: 60,
            targetZone: 'Zone 2-3 (125-150 bpm)',
            intensity: 'High',
            description: 'CNS recovery is prime. Recommended for heavy deadlifts, squats, and power movements.',
            exercises: [
              { name: 'Barbell Back Squat', sets: '4 sets of 5 reps @ 82%', focus: 'Maximal recruit' },
              { name: 'Romanian Deadlift', sets: '3 sets of 8 reps', focus: 'Posterior chain' },
              { name: 'Overhead Military Press', sets: '3 sets of 6 reps', focus: 'Shoulder stability' },
              { name: 'Hanging Leg Raises', sets: '3 sets of 15 reps', focus: 'Core stiffness' },
            ],
          },
        ];
      case 'moderate':
        return [
          {
            title: 'Aerobic Threshold & Steady Engine',
            type: 'Cardio / Aerobic',
            targetDuration: 45,
            targetZone: 'Zone 3 (138-155 bpm)',
            intensity: 'Moderate',
            description: 'Optimal for maintaining training momentum without accumulating autonomic fatigue.',
            exercises: [
              { name: 'Zone 2/3 Steady Ergometer/Run', sets: '30 mins continuous', focus: 'Mitochondrial density' },
              { name: 'Tempo Kettlebell Complex', sets: '4 rounds', focus: 'Work capacity' },
              { name: 'Cooldown & Decompression', sets: '7 mins', focus: 'HR drop off' },
            ],
          },
          {
            title: 'Functional Hypertrophy & Stability',
            type: 'Strength',
            targetDuration: 40,
            targetZone: 'Zone 2-3',
            intensity: 'Moderate',
            description: 'Controlled volume with submaximal load to stimulate hypertrophy with low CNS tax.',
            exercises: [
              { name: 'Dumbbell Walking Lunges', sets: '3 sets of 12/leg', focus: 'Unilateral' },
              { name: 'Incline Dumbbell Bench Press', sets: '3 sets of 10 reps', focus: 'Pectorals' },
              { name: 'Chest-Supported Neutral Row', sets: '3 sets of 12 reps', focus: 'Upper back' },
            ],
          },
        ];
      case 'light':
      case 'recovery':
      case 'rest':
      default:
        return [
          {
            title: 'Active Parasympathetic Recovery & Flow',
            type: 'Mobility / Zone 1',
            targetDuration: 30,
            targetZone: 'Zone 1 (< 120 bpm)',
            intensity: 'Low',
            description: 'Elevated stress or low HRV detected. Focus on blood circulation, tissue rehydration, and nervous system down-regulation.',
            exercises: [
              { name: '90/90 Hip Flow & Thoracic Rotations', sets: '10 mins', focus: 'Joint decompression' },
              { name: 'Zone 1 Incline Treadmill Walk', sets: '15 mins @ 3.5mph', focus: 'Lymphatic drainage' },
              { name: 'Box Breathing (4s In / 4s Hold / 4s Out / 4s Hold)', sets: '5 mins', focus: 'Vagal nerve tone' },
            ],
          },
          {
            title: 'Myofascial Release & Postural Reset',
            type: 'Restoration',
            targetDuration: 25,
            targetZone: 'Zone 1',
            intensity: 'Recovery',
            description: 'Assists physiological supercompensation. Rest allows your baseline to adapt higher.',
            exercises: [
              { name: 'Foam Roller Quads, Lats & Thoracic Spine', sets: '8 mins', focus: 'Tissue quality' },
              { name: 'Couch Stretch & Pigeon Pose', sets: '2 mins each side', focus: 'Hip flexor release' },
              { name: 'Legs Up The Wall (Inversion)', sets: '8 mins', focus: 'Venous return' },
            ],
          },
        ];
    }
  };

  const intensity = readiness?.training_intensity || 'moderate';
  const plans = getRecommendedPlans(intensity);

  const startSession = (planTitle: string) => {
    setActivePlan(planTitle);
    setIsActive(true);
    setSeconds(0);
  };

  const finishSession = async () => {
    setIsActive(false);
    setSaving(true);
    try {
      const minutes = Math.max(1, Math.round(seconds / 60));
      const estCalories = Math.round(minutes * (currentHr / 150) * 8.5);
      await healthApi.addWorkout({
        workout_type: activePlan,
        duration_minutes: minutes,
        calories: estCalories,
        avg_heart_rate: currentHr,
        max_heart_rate: currentHr + 14,
        perceived_exertion: rpe,
        source: 'manual',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setSuccessMsg(`Workout saved! Logged ${minutes} min session with RPE ${rpe}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadData();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Flame color="var(--brand-400)" /> Workout Intelligence
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Training options calibrated to your current readiness score of <strong>{readiness?.readiness_score || 50}/100</strong>.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="card mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* LIVE WORKOUT TRACKER MODAL / BANNER */}
      {isActive ? (
        <div className="card mb-6" style={{
          background: 'rgba(190, 91, 98, 0.14)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.2)'
        }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="animate-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <strong style={{ fontSize: '1.1rem', color: '#f87171' }}>LIVE SESSION: {activePlan}</strong>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
              {formatTime(seconds)}
            </div>
          </div>

          <div className="grid-3 mb-4">
            <div className="card card-sm text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Heart Rate</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <Heart size={20} className="animate-pulse" fill="#ef4444" />
                {currentHr} <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>bpm</span>
              </div>
            </div>
            <div className="card card-sm text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Est. Calories</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
                {Math.round(Math.max(1, seconds / 60) * 8.5)} <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>kcal</span>
              </div>
            </div>
            <div className="card card-sm text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>Current Zone</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#818cf8', marginTop: 4 }}>
                {currentHr > 165 ? 'Zone 5 Max' : currentHr > 150 ? 'Zone 4 Threshold' : currentHr > 135 ? 'Zone 3 Aerobic' : 'Zone 2 Base'}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'block', marginBottom: '0.4rem' }}>
              Rate Perceived Exertion (RPE): <strong>{rpe} / 10</strong> ({rpe >= 8 ? 'Very Hard' : rpe >= 6 ? 'Challenging' : 'Comfortable'})
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              className="btn btn-ghost"
              onClick={() => setIsActive(false)}
            >
              Pause
            </button>
            <button
              className="btn btn-primary"
              style={{ background: '#ef4444', borderColor: '#ef4444' }}
              onClick={finishSession}
              disabled={saving}
            >
              <Square size={16} fill="currentColor" /> {saving ? 'Saving...' : 'Finish & Record Session'}
            </button>
          </div>
        </div>
      ) : null}

      {/* RECOMMENDED WORKOUT PLANS */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Award size={20} color="var(--brand-400)" /> Calibrated Prescriptions for Today
      </h2>

      <div className="grid-2 workout-plans mb-8">
        {plans.map((plan, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: plan.intensity === 'High' ? 'rgba(239, 68, 68, 0.2)' : plan.intensity === 'Moderate' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: plan.intensity === 'High' ? '#f87171' : plan.intensity === 'Moderate' ? '#fbbf24' : '#34d399',
                  }}>
                    {plan.type} • {plan.intensity}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.6rem' }}>{plan.title}</h3>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock size={14} /> {plan.targetDuration} min
                  </div>
                  <div style={{ color: 'var(--brand-400)', fontWeight: 600, marginTop: 2 }}>{plan.targetZone}</div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', margin: '0.6rem 0 1rem' }}>
                {plan.description}
              </p>

              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Prescribed Flow
                </div>
                {plan.exercises.map((ex, eIdx) => (
                  <div key={eIdx} className="workout-exercise-row" style={{ fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: eIdx < plan.exercises.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontWeight: 500, minWidth: 0 }}>{ex.name}</span>
                    <span style={{ color: 'var(--text-3)', fontSize: '0.78rem', textAlign: 'right' }}>{ex.sets || ex.focus}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
            className="btn btn-primary w-full workout-start-button"
              onClick={() => startSession(plan.title)}
              disabled={isActive}
            >
              <Play size={16} fill="currentColor" /> Start Live Workout Session
            </button>
          </div>
        ))}
      </div>

      {/* RECENT COMPLETED WORKOUTS */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={20} color="var(--brand-400)" /> Workout Log & Physiological Load
      </h2>

      {workouts.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Workout</th>
                <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                <th style={{ padding: '0.75rem 1rem' }}>Avg HR</th>
                <th style={{ padding: '0.75rem 1rem' }}>Burn</th>
                <th style={{ padding: '0.75rem 1rem' }}>RPE</th>
                <th style={{ padding: '0.75rem 1rem' }}>Load Score</th>
              </tr>
            </thead>
            <tbody>
              {workouts.slice(0, 10).map((w, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)' }}>{w.date}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{w.workout_type}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{w.duration_minutes} min</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{w.avg_heart_rate ? `${Math.round(w.avg_heart_rate)} bpm` : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#f59e0b' }}>{w.calories ? `${Math.round(w.calories)} kcal` : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{w.perceived_exertion ? `${w.perceived_exertion}/10` : '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--brand-300)',
                      fontWeight: 700
                    }}>
                      {w.load_score ? Math.round(w.load_score) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '2.5rem' }}>
          <Dumbbell size={32} color="var(--text-3)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--text-2)' }}>No workouts recorded yet. Start a session above or sync workouts from Apple Health.</p>
        </div>
      )}
    </div>
  );
}
