import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface Props { mode: 'login' | 'register'; }

export default function AuthPage({ mode }: Props) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password, name);
        navigate('/onboarding');
      } else {
        await login(email, password);
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div className="hero-glow" />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        <div className="text-center mb-6">
          <div className="flex items-center gap-2 font-display font-bold" style={{ justifyContent: 'center', fontSize: '1.2rem', marginBottom: '2rem' }}>
            <Activity size={24} color="var(--brand-400)" />
            AURA
          </div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-sm">{mode === 'login' ? 'Sign in to review your daily readiness.' : 'Create your personal readiness workspace.'}</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#f87171' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="label">Full Name (optional)</label>
                <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Johnson" />
              </div>
            )}
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} style={{ paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4">
          {mode === 'login' ? (
            <>No account? <Link to="/register" style={{ color: 'var(--brand-400)', fontWeight: 600 }}>Sign up free</Link></>
          ) : (
            <>Already have an account? <Link to="/login" style={{ color: 'var(--brand-400)', fontWeight: 600 }}>Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
