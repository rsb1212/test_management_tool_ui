/**
 * DailyTrackingPage — Feature 3
 * Manager: sees all testers' execution counts for a chosen date,
 * including per-tester pass/fail/defect breakdown and defect IDs.
 *
 * API calls:
 *   GET /api/v1/productivity/daily-tracking?date=yyyy-MM-dd
 */
import { useState, useEffect } from 'react';
import { productivityApi } from '../api';
import {
  BarChart2, ChevronLeft, ChevronRight, Calendar,
  CheckCircle2, XCircle, Bug, Activity, RefreshCw, Eye
} from 'lucide-react';

/* ── Helpers ────────────────────────────────────────────────── */
function today() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
function prevDay(d) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().split('T')[0];
}
function nextDay(d) {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split('T')[0];
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color,
      }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function DefectPill({ id }) {
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
      background: 'rgba(248,81,73,0.12)', color: '#f85149',
      border: '1px solid rgba(248,81,73,0.25)', borderRadius: 4,
      padding: '1px 7px', display: 'inline-flex', alignItems: 'center', gap: 3,
    }}>
      <Bug size={9} />{id}
    </span>
  );
}

/* ── Expandable tester row detail ───────────────────────────── */
function TesterRowDetail({ record }) {
  const passRate = record.passRate;
  const barColor = passRate >= 80 ? 'var(--green)' : passRate >= 60 ? 'var(--amber)' : '#f85149';

  return (
    <div style={{ padding: '12px 20px', background: 'rgba(88,166,255,0.04)', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Pass rate bar */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Pass Rate</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: barColor }}>
              {passRate.toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(passRate, 100)}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Breakdown chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Passed',   val: record.passed,       color: 'var(--green)' },
            { label: 'Failed',   val: record.failed,       color: '#f85149' },
            { label: 'Blocked',  val: record.blocked,      color: 'var(--amber)' },
            { label: 'Defects',  val: record.defectRaised, color: '#f85149' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Defect IDs */}
        {record.defectIds?.length > 0 && (
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              Defect IDs
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {record.defectIds.map(id => <DefectPill key={id} id={id} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function DailyTrackingPage() {
  const [date,      setDate]    = useState(today());
  const [data,      setData]    = useState(null);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState('');
  const [expanded,  setExpanded] = useState(new Set());

  const load = async (d) => {
    setLoading(true);
    setError('');
    try {
      const res = await productivityApi.dailyTracking(d);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tracking data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(date); }, [date]);

  const toggleExpand = (userId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const isToday = date === today();

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Execution Tracking</h1>
          <p className="page-subtitle">
            Monitor team execution activity day by day — pass, fail, defect counts per tester
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => load(date)} title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Date Navigator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 18px', width: 'fit-content',
      }}>
        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setDate(prevDay(date))}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center', minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text1)' }}>
            {fmtDate(date)}
          </div>
          {isToday && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>
              TODAY
            </span>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm btn-icon"
          onClick={() => setDate(nextDay(date))}
          disabled={isToday}
        >
          <ChevronRight size={16} />
        </button>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={today()}
          style={{ marginLeft: 8, padding: '5px 10px', fontSize: 12, width: 150 }}
        />
      </div>

      {/* Errors */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>
      )}

      {/* Loading */}
      {loading && <div className="loading">Loading execution data for {date}…</div>}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Team KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <StatCard value={data.teamTotal}   label="Total Executed" color="var(--accent)" />
            <StatCard value={data.teamPassed}  label="Passed"         color="var(--green)" />
            <StatCard value={data.teamFailed}  label="Failed"         color="#f85149" />
            <StatCard value={data.teamDefects} label="Defects Raised" color="var(--amber)" />
          </div>

          {/* Tester table */}
          {data.testerRecords?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Calendar size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto' }} />
              </div>
              <div className="empty-text">No executions recorded</div>
              <div className="empty-sub">No test cases were executed on {date}</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Tester Breakdown</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Click a row to expand details and defect IDs
                </span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Tester</th>
                    <th>Team</th>
                    <th style={{ textAlign: 'center' }}>Total</th>
                    <th style={{ textAlign: 'center' }}>✓ Passed</th>
                    <th style={{ textAlign: 'center' }}>✗ Failed</th>
                    <th style={{ textAlign: 'center' }}>⚠ Defects</th>
                    <th>Pass Rate</th>
                    <th>Defect IDs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.testerRecords.map(rec => {
                    const isOpen = expanded.has(rec.userId);
                    const pr = rec.passRate;
                    const prColor = pr >= 80 ? 'var(--green)' : pr >= 60 ? 'var(--amber)' : '#f85149';
                    return [
                      <tr key={rec.userId}
                        style={{ cursor: 'pointer', background: isOpen ? 'rgba(88,166,255,0.04)' : undefined }}
                        onClick={() => toggleExpand(rec.userId)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'rgba(63,185,80,0.12)', border: '1px solid var(--green)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                              color: 'var(--green)', flexShrink: 0,
                            }}>
                              {(rec.fullName || rec.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.fullName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{rec.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text2)' }}>{rec.team || '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{rec.total}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 700 }}>{rec.passed}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#f85149', fontWeight: 700 }}>{rec.failed}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontWeight: 700 }}>{rec.defectRaised}</td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.min(pr, 100)}%`, background: prColor, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: prColor, width: 36, flexShrink: 0, textAlign: 'right' }}>
                              {pr.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {rec.defectIds?.length > 0 ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {rec.defectIds.slice(0, 3).map(id => <DefectPill key={id} id={id} />)}
                              {rec.defectIds.length > 3 && (
                                <span style={{ fontSize: 10, color: 'var(--text3)' }}>+{rec.defectIds.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <Eye size={13} style={{ color: isOpen ? 'var(--accent)' : 'var(--text3)' }} />
                        </td>
                      </tr>,
                      isOpen && (
                        <tr key={rec.userId + '-detail'}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <TesterRowDetail record={rec} />
                          </td>
                        </tr>
                      ),
                    ].filter(Boolean);
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* No data but not loading */}
      {!loading && !data && !error && (
        <div className="empty-state">
          <div className="empty-icon">
            <BarChart2 size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto' }} />
          </div>
          <div className="empty-text">No data</div>
        </div>
      )}
    </div>
  );
}
