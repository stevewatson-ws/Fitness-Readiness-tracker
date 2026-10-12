import React, { useEffect, useState } from 'react';
import { readinessApi } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STATE_COLOR: Record<string, string> = {
  excellent: '#10b981',
  good: '#34d399',
  moderate: '#f59e0b',
  poor: '#f97316',
  very_poor: '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div className="card card-sm" style={{ minWidth: 150 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{label}</div>
        <div style={{ fontWeight: 700, color: STATE_COLOR[d.state] || 'var(--brand-400)', fontSize: '1.2rem' }}>{d.score}</div>
        <div style={{ fontSize: '0.75rem', color: STATE_COLOR[d.state] }}>{d.state?.replace('_', ' ')}</div>
      </div>
    );
  }
  return null;
};

export default function HistoryPage() {
  const [data,    setData]    = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [period,  setPeriod]  = useState<7 | 14 | 30>(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      readinessApi.trend(period),
      readinessApi.history(),
    ]).then(([t, h]) => {
      const trend = t.data;
      const chartData = trend.dates.map((d: string, i: number) => ({
        date:  format(parseISO(d), 'MMM d'),
        score: trend.scores[i],
        state: trend.states[i],
      }));
      setData(chartData);
      setHistory(h.data);
    }).finally(() => setLoading(false));
  }, [period]);

  const avgScore = data.length ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length) : 0;

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
      <div className="skeleton mt-4" style={{ height: 300, borderRadius: 16 }} />
    </div>
  );

  return (
    <div className="fade-in">
      <h2 className="mb-4">History</h2>

      {/* PERIOD SELECTOR */}
      <div className="flex gap-2 mb-4">
        {([7, 14, 30] as const).map(p => (
          <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setPeriod(p)}>{p}d</button>
        ))}
      </div>

      {/* TREND CARD */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Average Readiness</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Space Grotesk' }}>{avgScore}</div>
          </div>
        </div>
        <div className="chart-container" style={{ height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#2dd4bf" fill="rgba(45,212,191,0.12)" strokeWidth={2} dot={{ fill: '#2dd4bf', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DAILY LOG */}
      <div className="card">
        <h3 className="mb-4">Daily Log</h3>
        <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {history.length === 0 && <p className="text-sm text-center" style={{ padding: '2rem 0' }}>No history yet.</p>}
          {history.slice(0, 30).map((r: any, index: number) => (
            <button
              key={r.id}
              className="metric-row interactive-card"
              onClick={() => window.location.assign(`/readiness/explain/${r.date}`)}
              aria-label={`Explain readiness for ${r.date}`}
              style={{ width: '100%', textAlign: 'left', color: 'inherit', '--stagger-index': index } as React.CSSProperties}
            >
              <div className="metric-label">
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATE_COLOR[r.readiness_state] || '#aaa' }} />
                {format(parseISO(r.date), 'EEE, MMM d')}
              </div>
              <div className="flex items-center gap-3">
                <div style={{ fontSize: '0.75rem', color: STATE_COLOR[r.readiness_state] }}>
                  {r.readiness_state?.replace('_', ' ')}
                </div>
                <div className="metric-value">{Math.round(r.readiness_score)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
