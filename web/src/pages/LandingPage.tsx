import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ChevronRight, Brain, Heart, Zap, Shield, ArrowRight, BarChart2, Moon, TrendingUp } from 'lucide-react';

const FLOW_STEPS = [
  { icon: '01', label: 'Health data' },
  { icon: '02', label: 'Signal review' },
  { icon: '03', label: 'Readiness model' },
  { icon: '04', label: 'Training context' },
  { icon: '05', label: 'Daily guidance' },
];

const FEATURES = [
  { icon: Brain, title: 'Explainable readiness', desc: 'A transparent physiological model combines recovery signals into a score you can understand and act on.' },
  { icon: Heart, title: 'Apple Health connection', desc: 'Your sleep, HRV, resting heart rate, activity, and workouts are collected through the native HealthKit bridge.' },
  { icon: TrendingUp, title: 'Personal baseline', desc: 'Your recommendations are calibrated against your own recent patterns, not a generic population average.' },
  { icon: Moon, title: 'Recovery context', desc: 'Sleep duration and quality are considered alongside cardiovascular and training signals.' },
  { icon: Zap, title: 'Daily training guidance', desc: 'A clear recommendation helps you choose an appropriate intensity for the day ahead.' },
  { icon: BarChart2, title: 'Scenario analysis', desc: 'Adjust key inputs and review how a change could influence your readiness before you train.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="noise-overlay" />
      <div className="hero-glow" />

      {/* NAV */}
      <nav style={{ position: 'relative', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
        <div className="container flex items-center justify-between" style={{ height: 64 }}>
          <div className="flex items-center gap-2 font-display font-bold" style={{ fontSize: '1.1rem' }}>
            <Activity size={22} color="var(--brand-400)" />
            AURA
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/home')}>
                Open App <ChevronRight size={14} />
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="container text-center" style={{ paddingTop: '7rem', paddingBottom: '5rem', position: 'relative', zIndex: 2 }}>
        <div className="flow-pill mb-4" style={{ display: 'inline-flex' }}>
          <Brain size={12} /> Personal readiness intelligence
        </div>
        <h1 style={{ maxWidth: 760, margin: '0 auto 1.5rem', letterSpacing: '-0.03em' }}>
          Make better training decisions with{' '}
          <span style={{ color: 'var(--brand-300)' }}>
            better context.
          </span>
        </h1>
        <p style={{ maxWidth: 540, margin: '0 auto 2.5rem', fontSize: '1.1rem', lineHeight: 1.7 }}>
          AURA turns Apple Health data into a focused view of recovery, readiness, and training direction—without burying the signal in charts.
        </p>
        <div className="flex items-center gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started <ArrowRight size={18} />
          </Link>
          <a href="#how-it-works" className="btn btn-ghost btn-lg">See How It Works</a>
        </div>

        {/* FLOW DIAGRAM */}
        <div className="flex items-center stagger-list" style={{ justifyContent: 'center', gap: '0.75rem', marginTop: '4rem', flexWrap: 'wrap' }}>
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="card card-sm text-center" style={{ minWidth: 90, padding: '0.75rem', '--stagger-index': i } as React.CSSProperties}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{step.icon}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 600 }}>{step.label}</div>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ChevronRight size={18} color="var(--text-3)" />
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '5rem 0' }}>
        <div className="container">
          <div className="text-center mb-8">
            <h2>From health signals to a training decision</h2>
            <p className="mt-2" style={{ maxWidth: 560, margin: '0.75rem auto 0' }}>
              AURA combines your recent signals with a transparent inference model, then shows the reasoning behind the result.
            </p>
          </div>

          <div className="card" style={{ maxWidth: 680, margin: '0 auto', padding: '2rem' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 2.2 }}>
              {['Sleep • HRV • Resting HR • Stress • Soreness • Training Load • Energy','↓ Fuzzification','↓ Fuzzy Rule Evaluation (35 rules)','↓ Mamdani Inference','↓ Centroid Defuzzification','↓ Readiness Score  0 – 100','↓ Workout Recommendation'].map((line, i) => (
                <div key={i} style={{ color: i === 0 ? 'var(--brand-300)' : i === 5 ? 'var(--excellent)' : i === 6 ? 'var(--good)' : 'var(--text-2)' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2 mt-8" style={{ maxWidth: 760, margin: '2rem auto 0' }}>
            {[
              { q: '"How many steps did I take?"', a: 'Traditional apps', bad: true },
              { q: '"How ready is my body to train hard today?"', a: 'AURA answers', bad: false },
            ].map(item => (
              <div key={item.q} className="card" style={item.bad ? {} : { borderColor: 'rgba(99,102,241,0.3)', boxShadow: 'var(--glow-brand)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: item.bad ? 'var(--text-3)' : 'var(--brand-400)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.a}
                </div>
                <div style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>{item.q}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container">
          <h2 className="text-center mb-6">Designed around the decisions that matter</h2>
          <div className="grid-3 stagger-list">
            {FEATURES.map((f, index) => (
              <div key={f.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', '--stagger-index': index } as React.CSSProperties}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon size={20} color="var(--brand-400)" />
                </div>
                <h3>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* READINESS PREVIEW */}
      <section style={{ background: 'var(--bg-raised)', borderTop: '1px solid var(--border)', padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="grid-2 items-center gap-8">
            <div>
              <h2>A concise view of today</h2>
              <p className="mt-3">Each day, AURA reviews your latest health data and presents a readiness score with the factors that influenced it.</p>
              <Link to="/register" className="btn btn-primary mt-6" style={{ display: 'inline-flex' }}>
                Start Free <ArrowRight size={16} />
              </Link>
            </div>
            <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--excellent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>GOOD READINESS</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'Space Grotesk', color: 'var(--excellent)', lineHeight: 1 }}>82</div>
              <div style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: 4 }}>/ 100</div>
              <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600 }}>
                High-intensity training is supported
              </div>
              <div className="factor-list">
                {['✓ Good sleep duration','✓ HRV above baseline','✓ Low stress','⚠ Moderate training load'].map(f => (
                  <div key={f} className={`factor-item ${f.startsWith('✓') ? 'positive' : 'warning'}`}>{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container text-center" style={{ maxWidth: 640 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Shield size={24} color="var(--brand-400)" />
          </div>
          <h2>Private by design</h2>
          <p className="mt-3">Your health data is encrypted in transit and used only to provide your experience. Apple Health permissions are requested individually, and your data can be exported or deleted at any time.</p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-2)' }}>
            AURA provides fitness and recovery insights for informational purposes only. It is not a medical device and does not diagnose, treat, or prevent any medical condition.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 0', textAlign: 'center' }}>
        <div className="container">
          <h2>Build a clearer training practice</h2>
          <p className="mt-3">Start with your Apple Health data and make each training decision with better context.</p>
          <Link to="/register" className="btn btn-primary btn-lg mt-6" style={{ display: 'inline-flex' }}>
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 0', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem' }}>© 2026 AURA. Personal readiness intelligence.</p>
      </footer>
    </div>
  );
}
