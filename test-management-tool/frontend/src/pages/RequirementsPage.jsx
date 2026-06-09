import { useState, useEffect, useCallback } from 'react';
import { requirementApi, projectApi } from '../api';
import { Plus, X, Link2, RefreshCw, BookOpen, CheckCircle2 } from 'lucide-react';

function badge(type) {
  const map = { FUNCTIONAL:'#58a6ff', NON_FUNCTIONAL:'#bc8cff', BUSINESS:'#3fb950', TECHNICAL:'#d29922' };
  const c = map[type] || '#8b949e';
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
      background: c + '22', color: c, padding: '2px 8px', borderRadius: 8 }}>
      {type?.replace(/_/g, ' ')}
    </span>
  );
}

function CreateModal({ projectId, onSave, onClose }) {
  const [form, setForm] = useState({ title: '', description: '', type: 'FUNCTIONAL' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      const res = await requirementApi.create({ ...form, projectId });
      onSave(res.data.data);
    } catch (err) { setError(err.response?.data?.message || 'Create failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Requirement</span>
          <button className="btn btn-sm btn-icon" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={save}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Claims submission must complete within 3 seconds" autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                {['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUSINESS', 'TECHNICAL'].map(t =>
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Detailed requirement description…" />
            </div>
            <div className="modal-foot" style={{ border: 'none', padding: '0' }}>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : <><Plus size={14} /> Create</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RequirementsPage() {
  const [projects,     setProjects]     = useState([]);
  const [selectedProj, setSelectedProj] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [alert,        setAlert]        = useState(null);

  useEffect(() => {
    projectApi.list().then(r => {
      const list = r.data.data || [];
      setProjects(list);
      if (list.length > 0) setSelectedProj(list[0].id);
    }).catch(err => console.error(err));
  }, []);

  const load = useCallback(() => {
    if (!selectedProj) return;
    setLoading(true);
    requirementApi.listByProject(selectedProj)
      .then(r => setRequirements(r.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedProj]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (req) => {
    setRequirements(prev => [req, ...prev]);
    setShowCreate(false);
    setAlert({ type: 'success', msg: `Requirement ${req.code} created` });
    setTimeout(() => setAlert(null), 4000);
  };

  const typeCounts = requirements.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Requirements</h1>
          <p className="page-subtitle">Traceability between business requirements and test cases</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={selectedProj} onChange={e => setSelectedProj(e.target.value)} style={{ width: 200 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Requirement
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
          {alert.msg}
          <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Summary chips */}
      {requirements.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(typeCounts).map(([type, count]) => (
            <div key={type} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 14px', display: 'flex', gap: 8, alignItems: 'center',
            }}>
              {badge(type)}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: 'var(--accent)' }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading requirements…</div>
      ) : requirements.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={40} style={{ color: 'var(--text3)', display: 'block', margin: '0 auto 12px' }} />
          <div className="empty-text">No requirements yet</div>
          <div className="empty-sub">Create requirements to link them to test cases for full traceability</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Type</th>
                <th>Description</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                    color: 'var(--accent)', whiteSpace: 'nowrap' }}>{r.code}</td>
                  <td style={{ fontWeight: 600, maxWidth: 280 }}>{r.title}</td>
                  <td>{badge(r.type)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 260 }}>
                    {r.description
                      ? (r.description.length > 80 ? r.description.substring(0, 80) + '…' : r.description)
                      : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && selectedProj && (
        <CreateModal projectId={selectedProj} onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
