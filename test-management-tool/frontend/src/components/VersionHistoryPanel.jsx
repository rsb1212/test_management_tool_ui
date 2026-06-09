import { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, X, Eye } from 'lucide-react';
import { versionApi } from '../api';

export default function VersionHistoryPanel({ testCaseId, onClose }) {
  const [versions,  setVersions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(null);
  const [snapshot,  setSnapshot]  = useState(null);

  useEffect(() => {
    if (!testCaseId) return;
    versionApi.list(testCaseId)
      .then(r => setVersions(r.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [testCaseId]);

  const loadSnapshot = async (ver) => {
    if (expanded === ver.versionNumber) { setExpanded(null); setSnapshot(null); return; }
    try {
      const res = await versionApi.get(testCaseId, ver.versionNumber);
      setSnapshot(JSON.parse(res.data.data?.snapshot || '{}'));
      setExpanded(ver.versionNumber);
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: 'var(--bg-card)', borderLeft: '1px solid var(--border2)',
      display: 'flex', flexDirection: 'column', zIndex: 150,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Version History</span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', display: 'flex', alignItems: 'center',
        }}><X size={18} /></button>
      </div>

      {/* Version list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading versions…</div>
        ) : versions.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No version history yet</div>
        ) : (
          versions.map((ver, idx) => (
            <div key={ver.id}>
              {/* Version row */}
              <div
                onClick={() => loadSnapshot(ver)}
                style={{
                  padding: '12px 20px', cursor: 'pointer', display: 'flex',
                  alignItems: 'flex-start', gap: 12,
                  background: expanded === ver.versionNumber ? 'rgba(88,166,255,0.06)' : 'transparent',
                  borderLeft: expanded === ver.versionNumber ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (expanded !== ver.versionNumber) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { if (expanded !== ver.versionNumber) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Version badge */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: idx === 0 ? 'rgba(88,166,255,0.15)' : 'rgba(139,148,158,0.1)',
                  border: `1px solid ${idx === 0 ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                  color: idx === 0 ? 'var(--accent)' : 'var(--text3)',
                }}>
                  v{ver.versionNumber}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text1)', marginBottom: 2 }}>
                    {ver.changeSummary || 'Updated'}
                    {idx === 0 && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(88,166,255,0.15)',
                        color: 'var(--accent)', padding: '1px 6px', borderRadius: 8,
                        fontFamily: 'var(--font-mono)', fontWeight: 700 }}>LATEST</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                    {ver.changedByName} · {new Date(ver.createdAt).toLocaleString()}
                  </div>
                </div>
                {expanded === ver.versionNumber ? <ChevronUp size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  : <ChevronDown size={14} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }} />}
              </div>

              {/* Snapshot expanded */}
              {expanded === ver.versionNumber && snapshot && (
                <div style={{
                  margin: '0 16px 8px', padding: 14,
                  background: 'var(--bg-raised)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12,
                }}>
                  {[
                    { label: 'Title',        value: snapshot.title },
                    { label: 'Priority',     value: snapshot.priority },
                    { label: 'Status',       value: snapshot.status },
                    { label: 'Preconditions',value: snapshot.preconditions },
                  ].map(({ label, value }) => value ? (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: 'var(--text1)' }}>{value}</div>
                    </div>
                  ) : null)}
                  {snapshot.steps?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Steps</div>
                      {snapshot.steps.map(s => (
                        <div key={s.stepNumber} style={{
                          padding: '6px 10px', marginBottom: 4,
                          background: 'rgba(255,255,255,0.03)', borderRadius: 5,
                          borderLeft: '2px solid var(--border2)',
                        }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>
                            Step {s.stepNumber}
                          </div>
                          <div style={{ color: 'var(--text1)', marginBottom: 2 }}>{s.stepAction}</div>
                          <div style={{ color: 'var(--text3)', fontStyle: 'italic' }}>→ {s.expectedResult}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
