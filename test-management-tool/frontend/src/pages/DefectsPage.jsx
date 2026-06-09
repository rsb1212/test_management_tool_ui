import { useState, useEffect, useCallback } from 'react';
import { defectApi, projectApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { Plus, AlertTriangle, RefreshCw, X, Bug, ExternalLink } from 'lucide-react';

const SEVERITIES    = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITIES    = ['P1', 'P2', 'P3', 'P4'];
const DEF_STATUSES  = ['NEW', 'OPEN', 'IN_PROGRESS', 'FIXED', 'RETEST', 'CLOSED', 'REJECTED'];

const SEV_COLOR  = { CRITICAL: '#f43f5e', HIGH: '#ffb74d', MEDIUM: '#ffd740', LOW: '#8899aa' };
const SEV_BG     = { CRITICAL: 'rgba(244,63,94,0.12)', HIGH: 'rgba(255,183,77,0.1)',
                     MEDIUM: 'rgba(255,215,64,0.1)', LOW: 'rgba(136,153,170,0.1)' };
const STAT_COLOR = {
  NEW: '#00d4ff', OPEN: '#ffb74d', IN_PROGRESS: '#c084fc',
  FIXED: '#00e676', RETEST: '#ffd740', CLOSED: '#8899aa', REJECTED: '#f43f5e',
};

/* Roles allowed to change defect status */
const CAN_UPDATE_STATUS = ['MANAGER', 'ADMIN', 'TESTER', 'SME'];

function SevBadge({ severity }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      background: SEV_BG[severity] || 'var(--bg-raised)',
      color: SEV_COLOR[severity] || 'var(--text2)',
      border: `1px solid ${SEV_COLOR[severity] || 'var(--border)'}40`,
    }}>
      <AlertTriangle size={10} />{severity}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      background: `${STAT_COLOR[status] || '#8899aa'}18`,
      color: STAT_COLOR[status] || '#8899aa',
    }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

export default function DefectsPage() {
  const { user } = useAuth();
  const [defects,         setDefects]         = useState([]);
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [showCreate,      setShowCreate]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [alert,           setAlert]           = useState(null);
  const [filterSev,       setFilterSev]       = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [form, setForm] = useState({
    title: '', description: '', projectId: '',
    testCaseId: '', severity: 'HIGH', priority: 'P2', assignedToId: '',
  });

  const canUpdateStatus = CAN_UPDATE_STATUS.includes(user?.role);

  // Load projects on mount
  useEffect(() => {
    projectApi.list().then(r => {
      const all = r.data.data || [];
      // Flatten: include root + sub-projects
      const flat = [];
      all.forEach(p => {
        flat.push(p);
        (p.subProjects || []).forEach(sub => flat.push(sub));
      });
      setProjects(flat);
      if (flat.length > 0) {
        setSelectedProject(flat[0].id);
        setForm(f => ({ ...f, projectId: flat[0].id }));
      }
    }).catch(err => console.error(err));
  }, []);

  // Load defects when project changes
  const loadDefects = useCallback(() => {
    if (!selectedProject) return;
    setLoading(true);
    defectApi.list(selectedProject)
      .then(r => setDefects(r.data.data || []))
      .catch(() => setAlert({ type: 'error', msg: 'Failed to load defects' }))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  useEffect(() => { loadDefects(); }, [loadDefects]);

  // Show alert and auto-dismiss
  const showMsg = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { showMsg('error', 'Title is required'); return; }
    setSaving(true);
    try {
      const created = await defectApi.create({
        ...form,
        projectId:    form.projectId    || undefined,
        testCaseId:   form.testCaseId   || undefined,
        assignedToId: form.assignedToId || undefined,
      });
      showMsg('success', `Defect ${created.data.data?.code || ''} reported successfully`);
      setShowCreate(false);
      setForm(f => ({ ...f, title: '', description: '', testCaseId: '', assignedToId: '' }));
      // Immediately reload — real-time sync
      loadDefects();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to create defect');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const r = await defectApi.updateStatus(id, newStatus);
      setDefects(ds => ds.map(d => d.id === id ? r.data.data : d));
    } catch (err) {
      showMsg('error', 'Failed to update status: ' + (err.response?.data?.message || 'Unknown error'));
    }
  };

  // Derived stats
  const total    = defects.length;
  const open     = defects.filter(d => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(d.status)).length;
  const fixed    = defects.filter(d => ['FIXED', 'CLOSED'].includes(d.status)).length;
  const critical = defects.filter(d => d.severity === 'CRITICAL').length;
  const retest   = defects.filter(d => d.status === 'RETEST').length;

  // Filtered list
  const filtered = defects.filter(d => {
    const matchSev  = !filterSev    || d.severity === filterSev;
    const matchStat = !filterStatus || d.status   === filterStatus;
    return matchSev && matchStat;
  });

  return (
    <div>
      {/* ── Page header ───────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Defects</h1>
          <p className="page-subtitle">
            {total} total · {open} open · {critical} critical
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedProject}
            onChange={e => { setSelectedProject(e.target.value); setForm(f => ({ ...f, projectId: e.target.value })); }}
            style={{ width: 200 }}>
            <option value="">Select project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.parentProjectId ? `  ↳ ${p.name}` : p.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={loadDefects} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Report Defect
          </button>
        </div>
      </div>

      {/* ── Alert ──────────────────────────────────────────── */}
      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
          {alert.msg}
          <button onClick={() => setAlert(null)}
            style={{ float: 'right', background: 'none', border: 'none',
              cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* ── Summary stats ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total',    value: total,    color: 'var(--accent)' },
          { label: 'Open',     value: open,     color: '#ffb74d' },
          { label: 'Critical', value: critical, color: '#f43f5e' },
          { label: 'Retest',   value: retest,   color: '#ffd740' },
          { label: 'Fixed',    value: fixed,    color: '#00e676' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px', textAlign: 'center',
            borderTop: `3px solid ${color}`,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24,
              fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={{ width: 160 }}>
          <option value="">All Severities</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
          <option value="">All Statuses</option>
          {DEF_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(filterSev || filterStatus) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => { setFilterSev(''); setFilterStatus(''); }}>
            <X size={12} /> Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)',
          alignSelf: 'center', fontFamily: 'var(--font-mono)' }}>
          {filtered.length} of {total}
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="loading">Loading defects…</div>
      ) : !selectedProject ? (
        <div className="empty-state">
          <div className="empty-icon">🐞</div>
          <div className="empty-text">Select a project to view defects</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-text">No defects found</div>
          <div className="empty-sub">
            {total > 0 ? 'Try adjusting your filters' : 'Great news — no defects reported yet!'}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Defect ID</th>
                <th>Title</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Project</th>
                <th>Raised By</th>
                <th>Created Date</th>
                {canUpdateStatus && <th>Update Status</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  {/* Defect ID */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                      color: 'var(--accent)', fontWeight: 700 }}>
                      {d.code}
                    </span>
                    {d.jiraIssueKey && (
                      <div style={{ fontSize: 10, color: '#00d4ff', marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: 3 }}>
                        <ExternalLink size={9} />{d.jiraIssueKey}
                      </div>
                    )}
                  </td>

                  {/* Title */}
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}
                      title={d.title}>
                      {d.title}
                    </div>
                  </td>

                  {/* Description */}
                  <td style={{ maxWidth: 220 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={d.description}>
                      {d.description || '—'}
                    </div>
                  </td>

                  {/* Severity */}
                  <td><SevBadge severity={d.severity} /></td>

                  {/* Priority */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                      fontWeight: 700, color: d.priority === 'P1' ? '#f43f5e'
                        : d.priority === 'P2' ? '#ffb74d' : 'var(--text2)' }}>
                      {d.priority}
                    </span>
                  </td>

                  {/* Status */}
                  <td><StatusBadge status={d.status} /></td>

                  {/* Project */}
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {d.project?.name || '—'}
                  </td>

                  {/* Raised By */}
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>
                      {d.reportedBy?.fullName || d.reportedBy?.username || '—'}
                    </div>
                    {d.reportedBy?.email && (
                      <div style={{ fontSize: 10, color: 'var(--text3)',
                        fontFamily: 'var(--font-mono)' }}>{d.reportedBy.email}</div>
                    )}
                  </td>

                  {/* Created Date */}
                  <td style={{ fontSize: 11, color: 'var(--text2)',
                    fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }) : '—'}
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {d.createdAt ? new Date(d.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      }) : ''}
                    </div>
                  </td>

                  {/* Update Status */}
                  {canUpdateStatus && (
                    <td>
                      <select value={d.status}
                        onChange={e => handleStatusChange(d.id, e.target.value)}
                        style={{ width: 130, padding: '4px 8px', fontSize: 11 }}>
                        {DEF_STATUSES.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Defect Modal ────────────────────────────── */}
      {showCreate && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bug size={18} style={{ color: '#f43f5e' }} />
                <span className="modal-title">Report Defect</span>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project *</label>
                <select value={form.projectId}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
                  <option value="">Select project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.parentProjectId ? `  ↳ ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Short, clear defect description" required autoFocus />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Steps to reproduce, actual vs expected behaviour…" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Severity *</label>
                  <select value={form.severity}
                    onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority *</label>
                  <select value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Test Case ID (optional)</label>
                <input value={form.testCaseId}
                  onChange={e => setForm(f => ({ ...f, testCaseId: e.target.value }))}
                  placeholder="Linked test case UUID" />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : <><Bug size={14} /> Report Defect</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
