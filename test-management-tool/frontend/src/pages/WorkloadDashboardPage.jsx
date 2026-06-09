import { useState, useEffect, useCallback } from 'react';
import { workloadApi } from '../api';
import { Users, RefreshCw, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

const LOAD_STATUS = {
  NORMAL:     { color: '#3fb950', label: 'Normal',     bg: 'rgba(63,185,80,0.1)' },
  HIGH:       { color: '#d29922', label: 'High',       bg: 'rgba(210,153,34,0.1)' },
  OVERLOADED: { color: '#f85149', label: 'Overloaded', bg: 'rgba(248,81,73,0.1)' },
};

export default function WorkloadDashboardPage() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await workloadApi.team();
      setData(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workload data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxPending = data.length > 0 ? Math.max(...data.map(d => d.pendingCases), 1) : 1;

  const overloaded = (data || []).filter(d => d.loadStatus === 'OVERLOADED').length;
  const high       = (data || []).filter(d => d.loadStatus === 'HIGH').length;
  const normal     = (data || []).filter(d => d.loadStatus === 'NORMAL').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workload Dashboard</h1>
          <p className="page-subtitle">Team capacity and pending case distribution — identify overloaded testers</p>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary */}
      {data.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { count: overloaded, label: 'Overloaded', color: '#f85149', icon: AlertTriangle },
            { count: high,       label: 'High Load',  color: '#d29922', icon: Activity },
            { count: normal,     label: 'Normal',     color: '#3fb950', icon: CheckCircle2 },
          ].map(({ count, label, color, icon: Icon }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color }}>{count}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
                </div>
                <Icon size={18} style={{ color, opacity: 0.45 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading workload data…</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <Users size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto 12px' }} />
          <div className="empty-text">No workload data available</div>
          <div className="empty-sub">Assign test cases to testers to see workload distribution</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 20, color: 'var(--text1)' }}>
            Pending Case Load per Tester
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[...data].sort((a, b) => b.pendingCases - a.pendingCases).map(tester => {
              const pct = maxPending > 0 ? (tester.pendingCases / maxPending) * 100 : 0;
              const meta = LOAD_STATUS[tester.loadStatus] || LOAD_STATUS.NORMAL;
              return (
                <div key={tester.userId}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: meta.bg, border: `1px solid ${meta.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: meta.color,
                    }}>
                      {(tester.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                    {/* Name + team */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)' }}>{tester.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{tester.team || 'No team'}</div>
                    </div>
                    {/* Stats */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: meta.color }}>
                        {tester.pendingCases}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>pending</div>
                    </div>
                    {/* Load badge */}
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                      background: meta.bg, color: meta.color,
                      padding: '3px 10px', borderRadius: 8, flexShrink: 0,
                    }}>
                      {meta.label.toUpperCase()}
                    </span>
                  </div>
                  {/* Bar */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 50 }}>
                    <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, background: meta.color,
                        borderRadius: 4, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    {tester.avgDailyVelocity > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ~{tester.avgDailyVelocity.toFixed(1)}/day
                      </span>
                    )}
                  </div>
                  {/* In-progress indicator */}
                  {tester.inProgressCases > 0 && (
                    <div style={{ paddingLeft: 50, marginTop: 4, fontSize: 11, color: 'var(--accent)' }}>
                      {tester.inProgressCases} in progress now
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
