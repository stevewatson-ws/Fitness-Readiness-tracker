import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../services/api';
import { CheckCircle, ChevronRight, ChevronLeft, Activity, User, Target, Heart, Apple } from 'lucide-react';

const TOTAL_STEPS = 5;

const GOALS = [
  { id: 'strength',    label: 'Strength',        desc: 'Build muscle and increase power' },
  { id: 'endurance',   label: 'Endurance',       desc: 'Improve cardiovascular fitness' },
  { id: 'weight_loss', label: 'Body composition', desc: 'Reduce body fat and improve composition' },
  { id: 'general',     label: 'General fitness',  desc: 'Build a consistent, balanced routine' },
];

const EXPERIENCE = [
  { id: 'beginner',     label: 'Beginner',     desc: '< 1 year of consistent training' },
  { id: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent training' },
  { id: 'advanced',     label: 'Advanced',     desc: '3–5 years of consistent training' },
  { id: 'elite',        label: 'Elite',        desc: '5+ years, competitive athlete' },
];

const WORKOUT_TYPES = ['Running','Cycling','Strength Training','HIIT','Swimming','Yoga','Rowing','CrossFit','Walking'];

export default function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    age: '', height_cm: '', weight_kg: '', biological_sex: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    fitness_goal: '', experience_level: '', weekly_workouts: 3, preferred_types: [] as string[],
    typical_sleep_hours: 7, typical_stress: 2, typical_activity: 'moderate',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleType = (t: string) => setForm(f => ({
    ...f,
    preferred_types: f.preferred_types.includes(t)
      ? f.preferred_types.filter(x => x !== t)
      : [...f.preferred_types, t],
  }));

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const finish = async () => {
    setLoading(true);
    try {
      await profileApi.update({
        ...form,
        age: form.age ? +form.age : null,
        height_cm: form.height_cm ? +form.height_cm : null,
        weight_kg: form.weight_kg ? +form.weight_kg : null,
        typical_sleep_hours: +form.typical_sleep_hours,
        typical_stress: +form.typical_stress,
      });
      await profileApi.completeOnboarding();
      await refreshProfile();
      navigate('/home');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // 0 – Welcome
    <div className="text-center fade-in" key="welcome">
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
        <Activity size={36} color="white" />
      </div>
      <h2>Set up your readiness profile</h2>
      <p className="mt-3" style={{ maxWidth: 400, margin: '0.75rem auto 0' }}>
        A short setup helps AURA interpret your training context and compare your health signals against an appropriate personal baseline.
      </p>
      <div className="grid-3 mt-6" style={{ gap: '0.75rem' }}>
        {[['2 min', 'Setup time'],['Personal', 'Baseline'],['Private', 'By design']].map(([v, l]) => (
          <div key={l} className="card card-sm text-center">
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-400)', fontFamily: 'Space Grotesk' }}>{v}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>,

    // 1 – Personal
    <div className="fade-in" key="personal">
      <div className="flex items-center gap-3 mb-6">
        <User size={20} color="var(--brand-400)" />
        <h3>Personal Details</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Age</label>
            <input className="input" type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="30" min={13} max={120} />
          </div>
          <div className="form-group">
            <label className="label">Biological Sex</label>
            <select className="input" value={form.biological_sex} onChange={e => set('biological_sex', e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Height (cm)</label>
            <input className="input" type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="175" />
          </div>
          <div className="form-group">
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="75" />
          </div>
        </div>
      </div>
    </div>,

    // 2 – Goals
    <div className="fade-in" key="goals">
      <div className="flex items-center gap-3 mb-6">
        <Target size={20} color="var(--brand-400)" />
        <h3>Fitness Goal</h3>
      </div>
      <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {GOALS.map((g, index) => (
          <button key={g.id} onClick={() => set('fitness_goal', g.id)} className="card" style={{ '--stagger-index': index, textAlign: 'left', cursor: 'pointer', borderColor: form.fitness_goal === g.id ? 'var(--brand-500)' : undefined, boxShadow: form.fitness_goal === g.id ? 'var(--glow-brand)' : undefined, transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease' } as React.CSSProperties}>
            <div style={{ fontWeight: 600 }}>{g.label}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 2 }}>{g.desc}</div>
          </button>
        ))}
      </div>
    </div>,

    // 3 – Experience
    <div className="fade-in" key="experience">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={20} color="var(--brand-400)" />
        <h3>Experience & Schedule</h3>
      </div>
      <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {EXPERIENCE.map((e, index) => (
          <button key={e.id} onClick={() => set('experience_level', e.id)} className="card card-sm" style={{ '--stagger-index': index, textAlign: 'left', cursor: 'pointer', borderColor: form.experience_level === e.id ? 'var(--brand-500)' : undefined, transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease' } as React.CSSProperties}>
            <div style={{ fontWeight: 600 }}>{e.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{e.desc}</div>
          </button>
        ))}
        <div className="form-group mt-3">
          <label className="label">Typical weekly workouts: <span style={{ color: 'var(--brand-400)' }}>{form.weekly_workouts}</span></label>
          <input className="slider-input" type="range" min={0} max={14} value={form.weekly_workouts} onChange={e => set('weekly_workouts', +e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Preferred types</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {WORKOUT_TYPES.map(t => (
              <button key={t} onClick={() => toggleType(t)} className="pill" style={{ background: form.preferred_types.includes(t) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', borderColor: form.preferred_types.includes(t) ? 'rgba(99,102,241,0.5)' : 'transparent', color: form.preferred_types.includes(t) ? 'var(--brand-300)' : 'var(--text-2)', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,

    // 4 – Apple Health
    <div className="fade-in text-center" key="health">
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
        🍎
      </div>
      <h3>Connect Apple Health</h3>
      <p className="mt-2 text-sm" style={{ maxWidth: 380, margin: '0.5rem auto' }}>
        Your real readiness score comes from your actual sleep, HRV, resting heart rate, steps, and workouts on your iPhone. No synthetic data is used.
      </p>
      <div className="card mt-4" style={{ textAlign: 'left' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required permissions</div>
        {['✓ Sleep Analysis','✓ Resting Heart Rate','✓ Heart Rate Variability (HRV)','✓ Steps & Distance','✓ Active Energy','✓ Workout Sessions'].map(p => (
          <div key={p} style={{ fontSize: '0.85rem', padding: '0.4rem 0', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>{p}</div>
        ))}
      </div>
      <div className="card mt-3 card-sm" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <p style={{ fontSize: '0.78rem', margin: 0 }}>Use the iOS app to authorize HealthKit. Once granted, the backend will sync your latest biometric data automatically.</p>
      </div>
      <button className="btn btn-primary mt-4" onClick={finish} disabled={loading}>
        {loading ? 'Finishing setup…' : 'Complete onboarding'}
      </button>
    </div>,
  ];

  const showNext = step < TOTAL_STEPS - 1;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="hero-glow" />
      <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 2 }}>
        {/* Step indicators */}
        <div className="flex items-center gap-2" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`wizard-step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="card" style={{ padding: '2rem', minHeight: 420 }}>
          {steps[step]}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <button className="btn btn-ghost btn-sm" onClick={prev} disabled={step === 0 || loading}>
            <ChevronLeft size={16} /> Back
          </button>

          {showNext && (
            <button className="btn btn-primary btn-sm" onClick={next} disabled={loading}>
              {step === TOTAL_STEPS - 2 ? 'Final Step' : 'Continue'} <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
