import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { baselineApi, profileApi, healthApi } from '../services/api';
import { User, Activity, Heart, Shield, RefreshCw, Download, LogOut, Check, Sliders, Award } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, logout } = useAuth();
  const [baseline, setBaseline] = useState<any>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [msg, setMsg] = useState('');

  // Editable Profile fields
  const [fitnessGoal, setFitnessGoal] = useState('endurance');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [weeklyDays, setWeeklyDays] = useState(4);
  const [maxHr, setMaxHr] = useState(190);
  const [restingHr, setRestingHr] = useState(54);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBaseline();
    if (profile) {
      setFitnessGoal(profile.fitness_goal || 'endurance');
      setExperienceLevel(profile.experience_level || 'intermediate');
      setWeeklyDays(profile.weekly_workout_days || 4);
    }
  }, [profile]);

  const loadBaseline = async () => {
    try {
      const res = await baselineApi.get();
      setBaseline(res.data);
      if (res.data?.resting_hr_baseline) {
        setRestingHr(Math.round(res.data.resting_hr_baseline));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecomputeBaseline = async () => {
    setRecomputing(true);
    try {
      const res = await baselineApi.compute();
      setBaseline(res.data);
      setMsg('Personal baseline recomputed successfully from recent biometric history!');
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      setMsg(`Error recomputing: ${err.message}`);
    }
    setRecomputing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.update({
        fitness_goal: fitnessGoal,
        experience_level: experienceLevel,
        weekly_workout_days: weeklyDays,
      });
      setMsg('Profile settings saved.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  const exportData = async () => {
    try {
      const [recordsRes, workoutsRes] = await Promise.all([
        healthApi.list(),
        healthApi.listWorkouts(),
      ]);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
        JSON.stringify({
          user: user?.email,
          export_date: new Date().toISOString(),
          baseline: baseline,
          records: recordsRes.data,
          workouts: workoutsRes.data,
        }, null, 2)
      );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `aura_fitness_data_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
    }
  };

  // Karvonen Heart Rate Zones
  // Target HR = ((maxHR − restHR) × %Intensity) + restHR
  const hrr = maxHr - restingHr;
  const zones = [
    { zone: 'Zone 1: Active Recovery', range: `${Math.round(hrr * 0.5 + restingHr)} - ${Math.round(hrr * 0.6 + restingHr)} bpm`, pct: '50-60%', desc: 'Facilitates recovery, increases blood flow, gentle mobility' },
    { zone: 'Zone 2: Aerobic Base', range: `${Math.round(hrr * 0.6 + restingHr)} - ${Math.round(hrr * 0.7 + restingHr)} bpm`, pct: '60-70%', desc: 'Mitochondrial biogenesis, optimal lipid oxidation' },
    { zone: 'Zone 3: Aerobic Tempo', range: `${Math.round(hrr * 0.7 + restingHr)} - ${Math.round(hrr * 0.8 + restingHr)} bpm`, pct: '70-80%', desc: 'Glycogen efficiency, cardiovascular cardiac output' },
    { zone: 'Zone 4: Anaerobic Threshold', range: `${Math.round(hrr * 0.8 + restingHr)} - ${Math.round(hrr * 0.9 + restingHr)} bpm`, pct: '80-90%', desc: 'Lactate clearance capacity, sustained high speed' },
    { zone: 'Zone 5: VO2 Max Peak', range: `${Math.round(hrr * 0.9 + restingHr)} - ${maxHr} bpm`, pct: '90-100%', desc: 'Maximal oxygen uptake, peak power & sprint endurance' },
  ];

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <User color="var(--brand-400)" /> Physiological Profile & Settings
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage individual biological parameters, baseline statistics, and training zones.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline btn-sm" onClick={exportData}>
            <Download size={15} /> Export Health Data
          </button>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: '#f87171' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {msg && (
        <div className="card mb-6" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--brand-300)' }}>
          {msg}
        </div>
      )}

      {/* USER & BASELINE CARD */}
      <div className="grid-2 mb-6">
        {/* PERSONAL PROFILE */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="var(--brand-400)" /> Training Preferences
          </h3>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.3rem' }}>Account Email</label>
              <input type="text" disabled value={user?.email || ''} className="input w-full" style={{ opacity: 0.7 }} />
            </div>

            <div className="grid-2 gap-3">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.3rem' }}>Primary Goal</label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value)}
                  className="input w-full"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <option value="endurance">Endurance & VO2 Max</option>
                  <option value="strength">Hypertrophy & Strength</option>
                  <option value="general_health">Longevity & Health</option>
                  <option value="fat_loss">Body Composition</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.3rem' }}>Experience</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="input w-full"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced / Competitive</option>
                </select>
              </div>
            </div>

            <div className="grid-2 gap-3">
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.3rem' }}>Max Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={maxHr}
                  onChange={(e) => setMaxHr(Number(e.target.value))}
                  className="input w-full"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginBottom: '0.3rem' }}>Resting Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={restingHr}
                  onChange={(e) => setRestingHr(Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={saving}>
              {saving ? 'Saving...' : 'Update Settings'}
            </button>
          </form>
        </div>

        {/* 60-DAY COMPUTED BASELINES */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} color="var(--brand-400)" /> 60-Day Rolling Baseline
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRecomputeBaseline}
                disabled={recomputing}
              >
                <RefreshCw size={14} className={recomputing ? 'animate-pulse' : ''} />
                {recomputing ? 'Recomputing...' : 'Recompute'}
              </button>
            </div>

            {baseline ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>HRV Mean (SDNN/rMSSD)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-300)' }}>
                      {Math.round(baseline.hrv_baseline || 58)} ms
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Std Dev: ±{(baseline.hrv_std || 8.5).toFixed(1)} ms
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Resting Heart Rate Mean</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                      {Math.round(baseline.resting_hr_baseline || 52)} bpm
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Std Dev: ±{(baseline.resting_hr_std || 3.2).toFixed(1)} bpm
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Sleep Duration Baseline</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-400)' }}>
                      {(baseline.sleep_baseline_hours || 7.6).toFixed(1)} hrs
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Days Analyzed: {baseline.days_analyzed || 42}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No personal baseline is available yet. Sync Apple Health data, then recompute your baseline.</p>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '1rem' }}>
            Baselines anchor the Gaussian membership curves to your individual biology rather than population averages.
          </div>
        </div>
      </div>

      {/* KARVONEN HEART RATE ZONES TABLE */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Heart size={20} color="#ef4444" /> Individualized Karvonen Heart Rate Zones
      </h2>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Training Zone</th>
              <th style={{ padding: '0.75rem 1rem' }}>Target HR Range</th>
              <th style={{ padding: '0.75rem 1rem' }}>% Intensity Reserve</th>
              <th style={{ padding: '0.75rem 1rem' }}>Physiological Adaptation</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-1)' }}>{z.zone}</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-300)' }}>{z.range}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-3)' }}>{z.pct}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)' }}>{z.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
