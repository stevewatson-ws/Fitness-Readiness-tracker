import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkInApi, readinessApi } from '../services/api';
import { CheckCircle, ArrowLeft, Zap, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function CheckInPage() {
  const navigate = useNavigate();
  const [energy, setEnergy] = useState<number>(4);
  const [soreness, setSoreness] = useState<number>(2);
  const [stress, setStress] = useState<number>(2);
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    checkInApi.today().then((res) => {
      if (res.data) {
        setEnergy(res.data.energy_level || 4);
        setSoreness(res.data.muscle_soreness || 2);
        setStress(res.data.perceived_stress || 2);
        setSleepQuality(res.data.sleep_quality_rating || 4);
        setNotes(res.data.notes || '');
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await checkInApi.submit({
        date: format(new Date(), 'yyyy-MM-dd'),
        energy_level: energy,
        muscle_soreness: soreness,
        perceived_stress: stress,
        sleep_quality_rating: sleepQuality,
        notes: notes,
      });
      // Trigger readiness recompute with the new subjective inputs
      await readinessApi.today(true);
      setSaved(true);
      setTimeout(() => {
        navigate('/home');
      }, 1200);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const RATING_SCALES = [
    {
      title: 'Energy Level',
      desc: 'How vibrant and physically prepared do you feel right now?',
      val: energy,
      set: setEnergy,
      labels: ['Exhausted', 'Sluggish', 'Normal', 'Energized', 'Peak High'],
      color: '#fbbf24',
    },
    {
      title: 'Muscle Soreness',
      desc: 'Delayed-onset muscle soreness (DOMS) or joint stiffness?',
      val: soreness,
      set: setSoreness,
      labels: ['None / Fresh', 'Mild Tightness', 'Moderate', 'Very Sore', 'Severe Pain'],
      color: '#f87171',
    },
    {
      title: 'Perceived Life & Cognitive Stress',
      desc: 'Mental pressure, anxiety, or cognitive demand outside of training?',
      val: stress,
      set: setStress,
      labels: ['Calm / Zero', 'Low', 'Moderate', 'High', 'Overwhelming'],
      color: 'var(--brand-400)',
    },
    {
      title: 'Subjective Sleep Quality',
      desc: 'Did you wake up feeling restorative, unbroken rest?',
      val: sleepQuality,
      set: setSleepQuality,
      labels: ['Fitful / Broken', 'Poor', 'Average', 'Restful', 'Completely Restored'],
      color: '#818cf8',
    },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/home')}
        className="btn btn-ghost btn-sm mb-4"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} color="var(--brand-400)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Daily Subjective Check-In</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')} • Soft computing balances biometric signals with perceived feelings.
            </p>
          </div>
        </div>

        {saved ? (
          <div className="text-center py-8">
            <ShieldCheck size={48} color="#34d399" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>Check-In Logged!</h3>
            <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Updating today’s readiness and training guidance…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="flex flex-col gap-6">
              {RATING_SCALES.map((scale, sIdx) => (
                <div key={sIdx} style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 12 }}>
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{scale.title}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: scale.color }}>
                      {scale.val}/5 — {scale.labels[scale.val - 1]}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1rem' }}>{scale.desc}</p>

                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => scale.set(num)}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0',
                          borderRadius: 8,
                          border: scale.val === num ? `2px solid ${scale.color}` : '1px solid rgba(255,255,255,0.08)',
                          background: scale.val === num ? `${scale.color}25` : 'rgba(255,255,255,0.03)',
                          color: scale.val === num ? '#fff' : 'var(--text-2)',
                          fontWeight: scale.val === num ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Physiological & Contextual Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Late night meal, mild dehydration, or intense leg session yesterday..."
                  className="input w-full"
                  style={{ background: 'var(--surface-2)', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3"
                style={{ fontSize: '1rem', fontWeight: 700 }}
              >
                {submitting ? 'Updating Fuzzy Readiness...' : 'Save & Recalculate Today\'s Readiness'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
