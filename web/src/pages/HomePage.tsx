import React, { useEffect, useState } from 'react';
import { readinessApi, checkInApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, ChevronRight, Zap, Flame, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const STATE_COLOR: Record<string, string> = {
  excellent: 'var(--excellent)',
  good:      'var(--good)',
  moderate:  'var(--moderate)',
  poor:      'var(--poor)',
  very_poor: 'var(--very-poor)',
};

const STATE_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good:      'Good',
  moderate:  'Moderate',
  poor:      'Poor',
  very_poor: 'Very Poor',
};

const INTENSITY_LABEL: Record<string, string> = {
  rest:     '🛌 Rest Day',
  recovery: '🚶 Recovery Activity',
  light:    '🏃 Light Workout',
  moderate: 'Moderate training',
  hard:     '🔥 Hard Workout',
  intense:  '⚡ Intense Training',
};

function ReadinessRing({ score, state }: { score: number; state: string }) {
  const R    = 80;
  const circ = 2 * Math.PI * R;
  const fill = (score / 100) * circ;
  const color = STATE_COLOR[state] || 'var(--brand-400)';

  return (
    <div className="readiness-score-ring" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        {/* Track */}
        <circle cx={100} cy={100} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12} />
        {/* Progress */}
        <circle
          cx={100} cy={100} r={R}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          style={{ filter: `drop-shadow(0 0 10px ${color}80)`, transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="readiness-score-inner">
        <div className="readiness-score-num" style={{ color }}>{Math.round(score)}</div>
        <div className="readiness-score-label">/ 100</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const [readiness, setReadiness]   = useState<any>(null);
  const [checkin,   setCheckin]     = useState<any>(null);
  const [loading,   setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (force = false) => {
    try {
      const [r, c] = await Promise.all([
        readinessApi.today(force),
        checkInApi.today(),
      ]);
      setReadiness(r.data);
      setCheckin(c.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="skeleton" style={{ height: 280, borderRadius: 20 }} />
        <div className="skeleton mt-4" style={{ height: 120, borderRadius: 16 }} />
        <div className="skeleton mt-4" style={{ height: 180, borderRadius: 16 }} />
      </div>
    );
  }

  const state = readiness?.readiness_state || 'moderate';
  const score = readiness?.readiness_score || 50;
  const color = STATE_COLOR[state] || 'var(--brand-400)';

  return (
    <div className="fade-in">
      {/* GREETING */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{format(new Date(), 'EEEE, MMMM d')}</div>
          <h2 style={{ fontSize: '1.4rem' }}>Today{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'animate-pulse' : ''} />
          {refreshing ? 'Syncing…' : 'Refresh'}
        </button>
      </div>

      {/* MAIN READINESS CARD */}
      {readiness ? (
        <div className={`card bg-state-${state}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
            {STATE_LABEL[state]} Readiness
          </div>

          <ReadinessRing score={score} state={state} />

          <div className="text-center">
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Training direction</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>
              {INTENSITY_LABEL[readiness.training_intensity] || readiness.training_intensity}
            </div>
            {readiness.recommendation_text && (
              <p className="text-sm mt-2" style={{ maxWidth: 380, margin: '0.75rem auto 0' }}>{readiness.recommendation_text}</p>
            )}
          </div>

          {/* WHY */}
          {readiness.dominant_factors?.length > 0 && (
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Why?</div>
              <div className="factor-list stagger-list">
                {readiness.dominant_factors.map((f: string, index: number) => (
                  <div key={f} className={`factor-item ${f.startsWith('✓') ? 'positive' : 'warning'}`} style={{ '--stagger-index': index } as React.CSSProperties}>{f}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 w-full" style={{ flexWrap: 'wrap' }}>
            <Link to={`/readiness/explain/${format(new Date(), 'yyyy-MM-dd')}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <Info size={14} /> Explain
            </Link>
            <Link to="/readiness/what-if" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
              <Zap size={14} /> What-If
            </Link>
          </div>
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <p>No readiness data is available yet. <br />Connect Apple Health from <Link to="/sync" style={{ color: 'var(--brand-400)' }}>Health Sync</Link> to begin.</p>
        </div>
      )}

      {/* CHECK-IN PROMPT */}
      {!checkin && (
        <Link to="/checkin" className="card mt-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderColor: 'rgba(99,102,241,0.25)', cursor: 'pointer' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Add today’s check-in</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Rate energy, stress & soreness to improve readiness accuracy</div>
          </div>
          <ChevronRight size={18} color="var(--text-3)" />
        </Link>
      )}

      {/* QUICK STATS */}
      {readiness && (
        <div className="grid-2 mt-4 stagger-list">
          {[
            { label: 'Sleep',         val: readiness.sleep_hours ? `${readiness.sleep_hours.toFixed(1)}h` : '—', icon: '🌙' },
            { label: 'Resting HR',    val: readiness.resting_hr  ? `${Math.round(readiness.resting_hr)} bpm` : '—', icon: '❤️' },
            { label: 'HRV',           val: readiness.hrv_ms      ? `${Math.round(readiness.hrv_ms)} ms`  : '—', icon: '📈' },
            { label: 'Training Load', val: readiness.training_load_7d != null ? `${Math.round(readiness.training_load_7d)}%` : '—', icon: '🏋️' },
          ].map(({ label, val, icon }, index) => (
            <Link
              key={label}
              to={label === 'Sleep' || label === 'HRV' || label === 'Resting HR' ? '/recovery' : '/workout'}
              className="card card-sm interactive-card"
              style={{ '--stagger-index': index } as React.CSSProperties}
              aria-label={`View ${label} details`}
            >
              <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* SYNC STATUS */}
      <div className="flex items-center gap-2 mt-4" style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: profile?.apple_health_connected ? 'var(--excellent)' : 'var(--text-3)' }} />
        {profile?.last_sync_at
          ? `Last synced: ${format(new Date(profile.last_sync_at), 'MMM d, h:mm a')}`
          : 'Not yet synced'}
      </div>
    </div>
  );
}
