import React, { useState, useEffect } from 'react';
import { readinessApi, baselineApi, checkInApi } from '../services/api';
import { Moon, Heart, Zap, Shield, CheckCircle, Clock, AlertTriangle, Activity, Wind, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function RecoveryPage() {
  const [readiness, setReadiness] = useState<any>(null);
  const [baseline, setBaseline] = useState<any>(null);
  const [checkin, setCheckin] = useState<any>(null);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold (Top)' | 'Exhale' | 'Hold (Bottom)'>('Inhale');
  const [breathCount, setBreathCount] = useState(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [r, b, c] = await Promise.all([
          readinessApi.today(),
          baselineApi.get(),
          checkInApi.today(),
        ]);
        setReadiness(r.data);
        setBaseline(b.data);
        setCheckin(c.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Box Breathing cycle (4s in, 4s hold, 4s out, 4s hold)
  useEffect(() => {
    let timer: any = null;
    if (breathingActive) {
      timer = setInterval(() => {
        setBreathCount((prev) => {
          if (prev <= 1) {
            setBreathPhase((currentPhase) => {
              if (currentPhase === 'Inhale') return 'Hold (Top)';
              if (currentPhase === 'Hold (Top)') return 'Exhale';
              if (currentPhase === 'Exhale') return 'Hold (Bottom)';
              return 'Inhale';
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timer);
      setBreathCount(4);
      setBreathPhase('Inhale');
    }
    return () => clearInterval(timer);
  }, [breathingActive]);

  const sleepHours = readiness?.sleep_hours || 7.5;
  const deepSleepEst = (sleepHours * 0.22).toFixed(1);
  const remSleepEst = (sleepHours * 0.24).toFixed(1);
  const lightSleepEst = (sleepHours * 0.54).toFixed(1);

  const sleepStagesData = [
    { stage: 'Deep Sleep', hours: parseFloat(deepSleepEst), fill: '#2dd4bf' },
    { stage: 'REM Sleep', hours: parseFloat(remSleepEst), fill: '#f0b86e' },
    { stage: 'Core / Light', hours: parseFloat(lightSleepEst), fill: '#7aa7a2' },
  ];

  const hrv = readiness?.hrv_ms || 55;
  const hrvBase = baseline?.hrv_baseline || 58;
  const hrvRatio = Math.round((hrv / hrvBase) * 100);

  const rhr = readiness?.resting_hr || 54;
  const rhrBase = baseline?.resting_hr_baseline || 52;
  const rhrDelta = Math.round(rhr - rhrBase);

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Moon color="var(--brand-400)" /> Recovery
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Sleep and cardiovascular signals that inform your readiness today.
          </p>
        </div>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid-3 mb-6">
        {/* HRV STATUS */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Autonomic Balance (HRV)
            </span>
            <Activity size={18} color="var(--brand-400)" />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{Math.round(hrv)}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>ms rMSSD</span>
          </div>
          <div className="mt-2" style={{ fontSize: '0.8rem', color: hrvRatio >= 95 ? '#34d399' : '#f87171' }}>
            {hrvRatio >= 95 ? 'Within your 60-day baseline' : `${Math.abs(100 - hrvRatio)}% below your rolling baseline`}
          </div>
          <div className="text-xs text-3 mt-1">Rolling baseline: {Math.round(hrvBase)} ms</div>
        </div>

        {/* RESTING HEART RATE */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Resting Heart Rate
            </span>
            <Heart size={18} color="#ef4444" />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{Math.round(rhr)}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>bpm</span>
          </div>
          <div className="mt-2" style={{ fontSize: '0.8rem', color: rhrDelta <= 2 ? '#34d399' : '#fbbf24' }}>
            {rhrDelta <= 0 ? `✓ ${Math.abs(rhrDelta)} bpm below baseline (Strong)` : `+${rhrDelta} bpm elevation over baseline`}
          </div>
          <div className="text-xs text-3 mt-1">Rolling baseline: {Math.round(rhrBase)} bpm</div>
        </div>

        {/* SLEEP RESTORATION */}
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sleep Duration & Depth
            </span>
            <Moon size={18} color="var(--brand-400)" />
          </div>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{sleepHours.toFixed(1)}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>hours</span>
          </div>
          <div className="mt-2" style={{ fontSize: '0.8rem', color: sleepHours >= 7.5 ? '#34d399' : '#fbbf24' }}>
            {sleepHours >= 7.5 ? 'Sufficient recovery window' : 'Recovery window is below target'}
          </div>
          <div className="text-xs text-3 mt-1">Deep + REM: {(parseFloat(deepSleepEst) + parseFloat(remSleepEst)).toFixed(1)}h</div>
        </div>
      </div>

      {/* SLEEP ARCHITECTURE CHART & INSIGHT */}
      <div className="grid-2 mb-6">
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Moon size={18} color="var(--brand-400)" /> Sleep Stage Distribution
          </h3>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sleepStagesData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" unit="h" stroke="rgba(255,255,255,0.3)" />
                <YAxis type="category" dataKey="stage" stroke="rgba(255,255,255,0.6)" width={90} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  formatter={(val: any) => [`${val} hrs`, 'Duration']}
                />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]}>
                  {sleepStagesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-center mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Deep Sleep (Cellular repair)</div>
              <div style={{ fontWeight: 700, color: '#818cf8' }}>{deepSleepEst}h (22%)</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>REM (Neural synthesis)</div>
              <div style={{ fontWeight: 700, color: '#c084fc' }}>{remSleepEst}h (24%)</div>
            </div>
          </div>
        </div>

        {/* GUIDED VAGAL TONE BREATHING BOX */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wind size={18} color="var(--brand-400)" /> Vagal Nerve Down-Regulation Box
              </h3>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(99,102,241,0.2)', color: 'var(--brand-300)' }}>
                Parasympathetic Biohack
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.5rem' }}>
              4-4-4-4 Box Breathing stimulates the vagus nerve, rapidly lowering sympathetic arousal and normalizing heart rate variability.
            </p>

            {/* INTERACTIVE PULSE CIRCLE */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: breathingActive ? 'rgba(20,184,166,0.22)' : 'var(--surface-2)',
                border: '2px solid var(--brand-400)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 1s ease-in-out, background-color 0.3s ease, border-color 0.3s ease',
                transform: breathingActive && (breathPhase === 'Inhale' || breathPhase === 'Hold (Top)') ? 'scale(1.15)' : 'scale(0.95)',
                boxShadow: breathingActive ? '0 0 25px rgba(99, 102, 241, 0.4)' : 'none',
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{breathingActive ? breathPhase : 'Ready'}</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-400)', marginTop: 2 }}>
                  {breathingActive ? breathCount : '4s'}
                </span>
              </div>
            </div>
          </div>

          <button
            className={`btn ${breathingActive ? 'btn-ghost' : 'btn-primary'} w-full mt-3`}
            onClick={() => setBreathingActive(!breathingActive)}
          >
            {breathingActive ? 'Stop Breath Cycle' : 'Start 2-Minute Breathing Exercise'}
          </button>
        </div>
      </div>

      {/* EVIDENCE-BASED RECOVERY PROTOCOLS */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={20} color="var(--brand-400)" /> Targeted Recovery Interventions
      </h2>

      <div className="grid-3 mb-6">
        <div className="card">
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🧊</div>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Contrast Hydrotherapy</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
            3 mins hot sauna (80°C) alternating with 1 min cold plunge (10°C) x 3 rounds. Improves peripheral vasoconstriction and clearance of cellular metabolites.
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Electrolyte & Fluid Balance</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
            Replenish 500mg sodium + 200mg potassium with 750ml water to restore blood plasma volume and optimize nocturnal cardiac output.
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌙</div>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Circadian Sleep Anchoring</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
            Dim artificial overhead lighting 90 minutes before bedtime. Keep bedroom ambient temperature at 18°C (65°F) to accelerate core body cooling for deeper NREM.
          </p>
        </div>
      </div>
    </div>
  );
}
