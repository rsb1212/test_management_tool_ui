import { useState, useEffect, useCallback } from 'react';
import { workflowApi, testCaseApi, projectApi } from '../api';
import { FlaskConical, CheckCircle2, XCircle, RefreshCw, X, AlertTriangle } from 'lucide-react';

const STATUS_META = {
  UAT_PENDING:     { label: 'UAT Pending',     color: '#d29922', next: 'Start UAT'      },
  UAT_IN_PROGRESS: { label: 'UAT In Progress', color: '#58a6ff', next: 'Pass / Fail UAT' },
  REDEVELOPMENT:   { label: 'Redevelopment',   color: '#f85149', next: 'Reassigned'      },
};

function RedevelopModal({ tc, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const send = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await workflowApi.sendRedevelopment(tc.id, { reason });
      onDone('Case sent to Redevelopment: ' + tc.code);
    } catch { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Send to Redevelopment — {tc.code}</span>
          <button className="btn btn-sm btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Reason *</label>
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Describe what failed in UAT and what needs to be fixed…" autoFocus />
          </div>
          <div className="modal-foot" style={{ border: 'none', padding: '12px 0 0' }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={send} disabled={saving || !reason.trim()}>
              {saving ? 'Sending…' : <><XCircle size={14} /> Send to Redevelopment</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UATWorkflowPage() {
  const [projects,     setProjects]     = useState([]);
  const [selectedProj, setSelectedProj] = useState('');
  const [cases,        setCases]        = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [actionLoading,setActionLoading]= useState({});
  const [alert,        setAlert]        = useState(null);
  const [redevelModal, setRedevelModal] = useState(null);
  const [tab,          setTab]          = useState('UAT_PENDING');

  useEffect(() => {
    projectApi.list().then(r => {
      const list = r.data.data || [];
      setProjects(list);
      if (list.length > 0) setSelectedProj(list[0].id);
    });
  }, []);

  const load = useCallback(() => {
    if (!selectedProj) return;
    setLoading(true);
    Promise.all([
      testCaseApi.list({ projectId: selectedProj, status: 'UAT_PENDING',     size: 200 }),
      testCaseApi.list({ projectId: selectedProj, status: 'UAT_IN_PROGRESS', size: 200 }),
      testCaseApi.list({ projectId: selectedProj, status: 'REDEVELOPMENT',   size: 200 }),
    ]).then(([p, ip, r]) => {
      const all = [
        ...(p.data.data?.content  || p.data.data  || []),
        ...(ip.data.data?.content || ip.data.data || []),
        ...(r.data.data?.content  || r.data.data  || []),
      ];
      setCases(all);
    }).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [selectedProj]);

  useEffect(() => { load(); }, [load]);

  const setLoading1 = (id, v) => setActionLoading(p => ({ ...p, [id]: v }));
  const showAlert = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 5000); };

  const doAction = async (tc, action) => {
    setLoading1(tc.id, true);
    try {
      await action();
      showAlert('success', 'Action completed for ' + tc.code);
      load();
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Action failed');
    } finally { setLoading1(tc.id, false); }
  };

  const tabCases = cases.filter(tc => tc.status === tab);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">UAT Workflow</h1>
          <p className="page-subtitle">Manage User Acceptance Testing — pass, fail, and redevelopment</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={selectedProj} onChange={e => setSelectedProj(e.target.value)} style={{ width: 200 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
          {alert.msg}
          <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { status: 'UAT_PENDING',     label: 'UAT Pending',     color: '#d29922' },
          { status: 'UAT_IN_PROGRESS', label: 'UAT In Progress', color: '#58a6ff' },
          { status: 'REDEVELOPMENT',   label: 'Redevelopment',   color: '#f85149' },
        ].map(({ status, label, color }) => (
          <div key={status}
            onClick={() => setTab(status)}
            style={{
              background: 'var(--bg-card)', border: `1px solid ${tab === status ? color : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.12s',
              position: 'relative', overflow: 'hidden',
            }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color }}>
              {cases.filter(tc => tc.status === status).length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="loading">Loading UAT cases…</div>
      ) : tabCases.length === 0 ? (
        <div className="empty-state">
          <FlaskConical size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto 12px' }} />
          <div className="empty-text">No cases in {tab.replace(/_/g, ' ')}</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontWeight: 700, fontSize: 14 }}>
            {tab.replace(/_/g, ' ')} — {tabCases.length} case(s)
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Title</th><th>Module</th><th>Priority</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tabCases.map(tc => (
                <tr key={tc.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>{tc.code}</td>
                  <td style={{ maxWidth: 280 }}>{tc.title}</td>
                  <td>
                    {tc.module?.name
                      ? <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                          background: 'rgba(188,140,255,0.1)', color: 'var(--purple)',
                          padding: '2px 8px', borderRadius: 4 }}>{tc.module.name}</span>
                      : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                    color: { CRITICAL:'#f85149', HIGH:'#d29922', MEDIUM:'#58a6ff', LOW:'#8b949e' }[tc.priority] }}>
                    {tc.priority}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {tc.status === 'UAT_PENDING' && (
                        <button className="btn btn-sm btn-success"
                          disabled={actionLoading[tc.id]}
                          onClick={() => doAction(tc, () => workflowApi.startUAT(tc.id))}>
                          {actionLoading[tc.id] ? '…' : 'Start UAT'}
                        </button>
                      )}
                      {tc.status === 'UAT_IN_PROGRESS' && (
                        <>
                          <button className="btn btn-sm btn-success"
                            disabled={actionLoading[tc.id]}
                            onClick={() => doAction(tc, () => workflowApi.passUAT(tc.id, {}))}>
                            <CheckCircle2 size={12} /> Pass
                          </button>
                          <button className="btn btn-sm btn-danger"
                            onClick={() => setRedevelModal(tc)}>
                            <XCircle size={12} /> Fail
                          </button>
                        </>
                      )}
                      {tc.status === 'REDEVELOPMENT' && (
                        <span style={{ fontSize: 11, color: '#f85149', fontFamily: 'var(--font-mono)' }}>
                          Awaiting fix
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {redevelModal && (
        <RedevelopModal
          tc={redevelModal}
          onClose={() => setRedevelModal(null)}
          onDone={(msg) => { setRedevelModal(null); showAlert('success', msg); load(); }}
        />
      )}
    </div>
  );
}
