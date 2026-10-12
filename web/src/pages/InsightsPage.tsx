import React, { useState, useEffect } from 'react';
import { readinessApi } from '../services/api';
import { Brain, Sliders, CheckCircle, ArrowRight, Zap, RefreshCw, BarChart2, Layers, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function InsightsPage() {
  const [explainData, setExplainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // What-If State
  const [sleep, setSleep] = useState<number>(7.5);
  const [hrv, setHrv] = useState<number>(60);
  const [restingHr, setRestingHr] = useState<number>(55);
  const [stress, setStress] = useState<number>(30);
  const [soreness, setSoreness] = useState<number>(25);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    loadExplain();
  }, []);

  const loadExplain = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const res = await readinessApi.explain(todayStr);
      setExplainData(res.data);
      if (res.data?.fuzzy_inputs) {
        setSleep(res.data.fuzzy_inputs.sleep_hours || 7.5);
        setHrv(res.data.fuzzy_inputs.hrv || 60);
        setRestingHr(res.data.fuzzy_inputs.resting_hr || 55);
        setStress(res.data.fuzzy_inputs.stress || 30);
        setSoreness(res.data.fuzzy_inputs.soreness || 25);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await readinessApi.whatIf({
        sleep_hours: sleep,
        hrv: hrv,
        resting_hr: restingHr,
        stress: stress,
        soreness: soreness,
      });
      setSimResult(res.data);
    } catch (err) {
      console.error(err);
    }
    setSimulating(false);
  };

  useEffect(() => {
    if (explainData) {
      const timer = setTimeout(() => {
        runSimulation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sleep, hrv, restingHr, stress, soreness]);

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Brain color="var(--brand-400)" /> Readiness model
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Review the signals behind today’s score and explore controlled changes to your inputs.
          </p>
        </div>
      </div>

      {/* HOW IT WORKS BANNER */}
      <div className="card mb-6" style={{ background: 'rgba(20, 184, 166, 0.08)', borderColor: 'rgba(45, 212, 191, 0.3)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--brand-400)" /> How the score is produced
        </h3>
        <div className="grid-4 mt-3" style={{ fontSize: '0.85rem' }}>
          <div style={{ background: 'var(--surface-2)', padding: '0.85rem', borderRadius: 8 }}>
            <strong style={{ color: 'var(--brand-300)', display: 'block', marginBottom: '0.2rem' }}>1. Fuzzification</strong>
            Continuous crisp physiological inputs (HRV, Sleep, Load) mapped into linguistic fuzzy sets via Gaussian & Trapezoidal membership functions.
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '0.85rem', borderRadius: 8 }}>
            <strong style={{ color: 'var(--brand-300)', display: 'block', marginBottom: '0.2rem' }}>2. Rule Evaluation</strong>
            Domain expert rules evaluated via Mamdani Min-Max logic: antecedent degrees $\alpha = \min(\mu_A(x), \mu_B(y))$.
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '0.85rem', borderRadius: 8 }}>
            <strong style={{ color: 'var(--brand-300)', display: 'block', marginBottom: '0.2rem' }}>3. Aggregation</strong>
            All activated consequent fuzzy sets are unioned via max operator into an aggregate output curve across [0, 100].
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '0.85rem', borderRadius: 8 }}>
            <strong style={{ color: 'var(--brand-300)', display: 'block', marginBottom: '0.2rem' }}>4. Defuzzification</strong>
            Calculates the Centroid (Center of Gravity): Centroid = Integral(z * mu(z)) / Integral(mu(z)) ensuring smooth physiological transitions without abrupt thresholds.
          </div>
        </div>
      </div>

      {/* WHAT-IF SIMULATOR */}
      <div className="card mb-8" style={{ border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 0 25px rgba(99,102,241,0.1)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={20} color="var(--brand-400)" /> Explore a different day
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: 2 }}>
              Adjust the inputs to understand how a different recovery profile could change the training recommendation.
            </p>
          </div>
          {simulating && (
            <span style={{ fontSize: '0.8rem', color: 'var(--brand-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} className="animate-pulse" /> Updating...
            </span>
          )}
        </div>

        {/* COMPARISON BANNER */}
        {simResult && (
          <div className="grid-3 mb-6" style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: 12 }}>
            <div className="text-center">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Current Baseline Score</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-1)' }}>
                {Math.round(simResult.current_score)} <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>({simResult.current_state})</span>
              </div>
            </div>

            <div className="text-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Simulated Score</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--brand-400)' }}>
                {Math.round(simResult.simulated_score)} <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>({simResult.simulated_state})</span>
              </div>
            </div>

            <div className="text-center">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Net Difference</div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: simResult.delta > 0 ? '#34d399' : simResult.delta < 0 ? '#f87171' : 'var(--text-2)'
              }}>
                {simResult.delta > 0 ? `+${simResult.delta}` : simResult.delta} pts
              </div>
            </div>
          </div>
        )}

        {/* SLIDERS GRID */}
        <div className="grid-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sleep Duration</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-400)' }}>{sleep.toFixed(1)} hrs</span>
            </div>
            <input
              type="range"
              min={4}
              max={11}
              step={0.25}
              value={sleep}
              onChange={(e) => setSleep(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Heart Rate Variability (HRV)</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-400)' }}>{Math.round(hrv)} ms</span>
            </div>
            <input
              type="range"
              min={20}
              max={120}
              value={hrv}
              onChange={(e) => setHrv(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Resting Heart Rate</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-400)' }}>{Math.round(restingHr)} bpm</span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              value={restingHr}
              onChange={(e) => setRestingHr(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Perceived Stress Index</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: stress > 60 ? '#f87171' : 'var(--brand-400)' }}>{stress} / 100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Muscle Soreness Rating</label>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: soreness > 60 ? '#f87171' : 'var(--brand-400)' }}>{soreness} / 100</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={soreness}
              onChange={(e) => setSoreness(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-500)' }}
            />
          </div>
        </div>
      </div>

      {/* TODAY'S RULE FIRINGS INSPECTOR */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Zap size={20} color="var(--brand-400)" /> Factors contributing to today’s score
      </h2>

      {explainData?.rule_firings && explainData.rule_firings.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Rule ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rule Description</th>
                <th style={{ padding: '0.75rem 1rem' }}>Activation Strength (α)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Consequent Term</th>
              </tr>
            </thead>
            <tbody>
              {explainData.rule_firings.map((r: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--brand-400)' }}>{r.rule_id}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-1)' }}>{r.description}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(r.activation * 100)}%`, height: '100%', background: 'var(--brand-400)' }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{r.activation.toFixed(2)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: r.consequent_term.includes('excellent') ? 'rgba(16,185,129,0.2)' : r.consequent_term.includes('poor') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: r.consequent_term.includes('excellent') ? '#34d399' : r.consequent_term.includes('poor') ? '#f87171' : '#fbbf24',
                    }}>
                      {r.consequent_term}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-3)' }}>No rule firings logged for today yet. Calculate today's readiness first.</p>
        </div>
      )}
    </div>
  );
}
