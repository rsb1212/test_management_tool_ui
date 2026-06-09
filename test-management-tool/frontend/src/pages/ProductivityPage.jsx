/**
 * ProductivityPage — Feature 5 (+ Feature 3 overlap)
 * - MANAGER: pick any tester → see module breakdown + day-by-day history
 * - TESTER:  see their own productivity via /api/v1/productivity/me
 *
 * API:
 *   MANAGER → GET /api/v1/productivity/tester/:userId  (includes dailyHistory)
 *   TESTER  → GET /api/v1/productivity/me
 */
import { useState, useEffect, useCallback } from 'react';
import { productivityApi, userApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  TrendingUp, RefreshCw, Target, CheckCircle2,
  XCircle, Bug, Clock, Activity, Layers, Calendar,
  ChevronDown, ChevronUp
} from 'lucide-react';

const PRIORITY_COLORS = {
  CRITICAL: '#f85149', HIGH: '#d29922', MEDIUM: '#58a6ff', LOW: '#8b949e',
};

/* ── Stat card ──────────────────────────────────────────────── */
function StatCard({ value, label, color, icon: Icon, sub }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 18px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && <Icon size={18} style={{ color, opacity: 0.45 }} />}
      </div>
    </div>
  );
}

/* ── Module row ─────────────────────────────────────────────── */
function ModuleRow({ m }) {
  const prColor = m.passRate >= 80 ? 'var(--green)' : m.passRate >= 60 ? 'var(--amber)' : '#f85149';
  return (
    <tr>
      <td>
        <span style={{
          fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
          background: 'rgba(188,140,255,0.1)', color: 'var(--purple)',
          padding: '2px 9px', borderRadius: 4,
        }}>{m.moduleName}</span>
      </td>
      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--accent)' }}>{m.assigned}</td>
      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--green)' }}>{m.passed}</td>
      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center', color: '#f85149' }}>{m.failed}</td>
      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'center', color: 'var(--amber)' }}>{m.defectRaised}</td>
      <td style={{ minWidth: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(m.passRate, 100)}%`, background: prColor, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: prColor, width: 38, textAlign: 'right', flexShrink: 0 }}>
            {m.passRate.toFixed(1)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

/* ── Daily history table ────────────────────────────────────── */
function DailyHistoryTable({ history }) {
  const [show, setShow] = useState(14);
  if (!history?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
        No execution history in the past 30 days
      </div>
    );
  }
  const visible = history.slice(0, show);
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th style={{ textAlign: 'center' }}>Total</th>
            <th style={{ textAlign: 'center' }}>✓ Passed</th>
            <th style={{ textAlign: 'center' }}>✗ Failed</th>
            <th style={{ textAlign: 'center' }}>⚠ Blocked</th>
            <th style={{ textAlign: 'center' }}>🐛 Defects</th>
            <th>Pass Rate</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {visible.map(day => {
            const maxTotal = history.length > 0 ? Math.max(...history.map(d => d.total), 1) : 1;
            const pr = day.passRate;
            const prColor = pr >= 80 ? 'var(--green)' : pr >= 60 ? 'var(--amber)' : '#f85149';
            const segments = [
              { count: day.passed,       color: 'var(--green)' },
              { count: day.failed,       color: '#f85149' },
              { count: day.blocked,      color: 'var(--amber)' },
              { count: day.defectRaised, color: '#e74c3c' },
            ];
            return (
              <tr key={day.date}>
                <td>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </div>
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{day.total}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{day.passed}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#f85149' }}>{day.failed}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{day.blocked}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{day.defectRaised}</td>
                <td style={{ minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pr, 100)}%`, background: prColor, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: prColor, width: 38, textAlign: 'right', flexShrink: 0 }}>
                      {pr.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {segments.map(({ count, color }, i) =>
                      [...Array(count)].map((_, j) => (
                        <div key={`${i}-${j}`} style={{
                          width: Math.max(6, Math.floor(72 / maxTotal)),
                          height: 8, borderRadius: 2, background: color, flexShrink: 0,
                        }} />
                      ))
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {history.length > show && (
        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShow(s => s + 14)}>
            <ChevronDown size={13} /> Show more ({history.length - show} remaining)
          </button>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function ProductivityPage() {
  const { user: currentUser } = useAuth();
  const isManager = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  const [testers,    setTesters]   = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [data,       setData]      = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState('');

  // Load testers list (manager only)
  useEffect(() => {
    if (!isManager) return;
    userApi.listTesters()
      .then(r => {
        const list = r.data.data || [];
        setTesters(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(err => console.error(err));
  }, [isManager]);

  // Load productivity data
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (isManager && selectedId) {
        res = await productivityApi.tester(selectedId);
      } else if (!isManager) {
        res = await productivityApi.me();
      } else {
        setLoading(false);
        return;
      }
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load productivity data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isManager, selectedId]);

  useEffect(() => { load(); }, [load]);

  // Overall pass rate color
  const pr = data?.passRate || 0;
  const prColor = pr >= 80 ? 'var(--green)' : pr >= 60 ? 'var(--amber)' : '#f85149';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isManager ? 'Tester Productivity' : 'My Productivity'}
          </h1>
          <p className="page-subtitle">
            {isManager
              ? 'Day-by-day individual tester performance with module breakdown'
              : 'Your day-by-day execution history and module performance'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isManager && (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ width: 220 }}
            >
              {testers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.fullName} {t.team ? `(${t.team})` : ''}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loading">Loading productivity data…</div>}

      {!loading && data && (
        <>
          {/* Tester identity card */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `${prColor}22`, border: `2px solid ${prColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: prColor,
              flexShrink: 0,
            }}>
              {(data.fullName || data.username || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{data.fullName || data.username}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {data.email}
                {data.team && <span style={{ marginLeft: 12, color: 'var(--text2)' }}>Team: {data.team}</span>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700, color: prColor }}>
                {pr.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Overall Pass Rate</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                Execution Rate: {data.executionRate?.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard value={data.totalAssigned}  label="Total Assigned"   color="var(--accent)"  icon={Target} />
            <StatCard value={data.totalExecuted}  label="Total Executed"   color="var(--purple)"  icon={Activity} />
            <StatCard value={data.passed}         label="Passed"           color="var(--green)"   icon={CheckCircle2} />
            <StatCard value={data.failed}         label="Failed"           color="#f85149"        icon={XCircle} />
            <StatCard value={data.defectRaised}   label="Defects Raised"   color="var(--amber)"   icon={Bug}
              sub={`Rate: ${data.defectRate?.toFixed(1)}%`} />
          </div>

          {/* Pending / In Progress */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard value={data.pending}     label="Pending (Assigned)" color="var(--accent)" icon={Clock} />
            <StatCard value={data.inProgress}  label="In Progress"        color="#00d4ff"       icon={Activity} />
            <StatCard value={data.underReview} label="Under Review"       color="var(--amber)"  icon={TrendingUp} />
          </div>

          {/* Module breakdown */}
          {data.moduleBreakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={15} style={{ color: 'var(--purple)' }} />
                  Module Breakdown
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Module</th>
                    <th style={{ textAlign: 'center' }}>Assigned</th>
                    <th style={{ textAlign: 'center' }}>Passed</th>
                    <th style={{ textAlign: 'center' }}>Failed</th>
                    <th style={{ textAlign: 'center' }}>Defects</th>
                    <th>Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.moduleBreakdown.map(m => <ModuleRow key={m.moduleName} m={m} />)}
                </tbody>
              </table>
            </div>
          )}

          {/* Day-by-day history */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} style={{ color: 'var(--accent)' }} />
                Day-by-Day Execution History
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text2)' }}>
                {[
                  { color: 'var(--green)', label: 'Passed' },
                  { color: '#f85149',      label: 'Failed' },
                  { color: 'var(--amber)', label: 'Blocked / Defect' },
                ].map(l => (
                  <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <DailyHistoryTable history={data.dailyHistory} />
          </div>
        </>
      )}

      {!loading && !data && !error && (
        <div className="empty-state">
          <div className="empty-text">Select a tester to view productivity</div>
        </div>
      )}
    </div>
  );
}
