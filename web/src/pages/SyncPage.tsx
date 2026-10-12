import React, { useState, useEffect } from 'react';
import { readinessApi, healthApi } from '../services/api';
import { RefreshCw, Smartphone, Database, AlertCircle, ShieldCheck } from 'lucide-react';

export default function SyncPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadRecentRecords();
  }, []);

  const loadRecentRecords = async () => {
    try {
      const res = await healthApi.list();
      setRecords(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      await readinessApi.today(true);
      await loadRecentRecords();
      setStatusMsg('Apple Health data is the source of truth. If your iPhone has synced new data, it has been refreshed here.');
    } catch (err: any) {
      setStatusMsg(`Sync error: ${err.message}`);
    }
    setIsSyncing(false);
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <RefreshCw color="var(--brand-400)" /> Apple Health Sync
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Connect Apple Health to bring your latest recovery and training data into AURA.
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={triggerManualSync}
          disabled={isSyncing}
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-pulse' : ''} />
          {isSyncing ? 'Syncing...' : 'Refresh Readiness'}
        </button>
      </div>

      {statusMsg && (
        <div className="card mb-6" style={{
          background: statusMsg.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          borderColor: statusMsg.includes('Error') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
          color: statusMsg.includes('Error') ? '#f87171' : '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          {statusMsg.includes('Error') ? <AlertCircle size={20} /> : <ShieldCheck size={20} />}
          <span>{statusMsg}</span>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#be5b62', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={24} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Native HealthKit Integration</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                The iOS app requests HealthKit access and pushes real data to the backend.
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            HEALTH SOURCE
          </span>
        </div>

        <div className="grid-4" style={{ fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <div>
            <div style={{ color: 'var(--text-3)' }}>Sleep Analysis</div>
            <div style={{ fontWeight: 600, color: '#34d399', marginTop: 2 }}>✓ Actual nightly sleep data</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)' }}>Resting Heart Rate</div>
            <div style={{ fontWeight: 600, color: '#34d399', marginTop: 2 }}>✓ Actual HRR measurements</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)' }}>HRV</div>
            <div style={{ fontWeight: 600, color: '#34d399', marginTop: 2 }}>✓ Actual SDNN / rMSSD values</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-3)' }}>Workouts</div>
            <div style={{ fontWeight: 600, color: '#34d399', marginTop: 2 }}>✓ Actual exercise load</div>
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} color="var(--brand-400)" /> Real Data Flow
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '1.25rem' }}>
          The iOS app requests HealthKit permissions, reads your biometric data, and uploads it to the backend at <strong>/api/sync/apple-health</strong>.
        </p>
        <ul style={{ paddingLeft: '1.25rem', margin: 0, color: 'var(--text-2)', display: 'grid', gap: '0.5rem' }}>
          <li>1. Grant Apple Health access on your iPhone.</li>
          <li>2. The native app syncs sleep, HRV, heart rate, steps, and workouts.</li>
          <li>3. Readiness scores and insight explanations are recomputed from your real data.</li>
        </ul>
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Database size={20} color="var(--brand-400)" /> Synced Health Records
      </h2>

      {records.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-3)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Metric Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Value</th>
                <th style={{ padding: '0.75rem 1rem' }}>Unit</th>
                <th style={{ padding: '0.75rem 1rem' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 15).map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-2)' }}>{r.date}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.metric_type}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--brand-300)', fontWeight: 700 }}>
                    {typeof r.value === 'number' ? r.value.toFixed(1) : r.value}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-3)' }}>{r.unit || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                      {r.source || 'healthkit'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center" style={{ padding: '2.5rem' }}>
          <p style={{ color: 'var(--text-3)' }}>No raw health records found yet. Sync from Apple Health on your iPhone to populate this feed.</p>
        </div>
      )}
    </div>
  );
}
