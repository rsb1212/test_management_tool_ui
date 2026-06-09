import { useState, useEffect, useCallback } from 'react';
import { projectApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  FolderKanban, Plus, ChevronRight, ChevronDown,
  X, Edit2, Trash2, FolderOpen, Layers
} from 'lucide-react';

function ProjectModal({ initial, parentId, parentName, onSave, onClose }) {
  const [form, setForm]   = useState({
    name:            initial?.name        || '',
    description:     initial?.description || '',
    parentProjectId: parentId             || initial?.parentProjectId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (initial?.id) {
        await projectApi.update(initial.id, form);
      } else {
        await projectApi.create(form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-header">
          <span className="modal-title">
            {initial?.id ? 'Edit Project' : parentId ? `New Sub-project under "${parentName}"` : 'New Root Project'}
          </span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <form onSubmit={submit}>
          {parentId && (
            <div style={{ background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 7, padding: '8px 12px', marginBottom: 14, fontSize: 12,
              color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} /> Sub-project of: <strong>{parentName}</strong>
            </div>
          )}
          <div className="form-group">
            <label>Project Name *</label>
            <input autoFocus value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={parentId ? 'e.g. NB, PS, Claims, Commission' : 'e.g. Guaranteed Wealth Goal (GWG)'} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this project…" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project, depth = 0, onAddSub, onEdit, onDeactivate, canManage }) {
  const [open, setOpen] = useState(depth === 0);
  const hasSubs = project.subProjects?.length > 0;

  return (
    <div style={{ marginBottom: hasSubs && open ? 0 : 8 }}>
      <div style={{
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden',
        borderLeft: `3px solid ${depth === 0 ? 'var(--accent)' : '#c084fc'}`,
        marginLeft: depth * 24,
      }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Expand toggle */}
          <button onClick={() => setOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: hasSubs ? 'pointer' : 'default',
              color: 'var(--text3)', padding: 0, display: 'flex', flexShrink: 0 }}>
            {hasSubs
              ? (open ? <ChevronDown size={15} /> : <ChevronRight size={15} />)
              : <div style={{ width: 15 }} />}
          </button>

          {/* Icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: depth === 0 ? 'rgba(0,212,255,0.12)' : 'rgba(192,132,252,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {depth === 0
              ? <FolderKanban size={16} style={{ color: 'var(--accent)' }} />
              : <FolderOpen size={16} style={{ color: '#c084fc' }} />}
          </div>

          {/* Name & description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)',
              display: 'flex', alignItems: 'center', gap: 8 }}>
              {project.name}
              {depth > 0 && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#c084fc',
                  background: 'rgba(192,132,252,0.1)', padding: '1px 6px', borderRadius: 8 }}>
                  SUB-PROJECT
                </span>
              )}
              {hasSubs && (
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text3)',
                  background: 'var(--bg-deep)', padding: '1px 6px', borderRadius: 8 }}>
                  {project.subProjects.length} sub-project{project.subProjects.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {project.description && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 420 }}>{project.description}</div>
            )}
          </div>

          {/* Owner */}
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', flexShrink: 0 }}>
            <div>{project.owner?.fullName || project.owner?.username}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>
              {project.createdAt && new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Actions */}
          {canManage && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {depth === 0 && (
                <button className="btn btn-secondary btn-sm" title="Add sub-project"
                  onClick={() => onAddSub(project)}
                  style={{ fontSize: 11, padding: '4px 8px' }}>
                  <Plus size={12} /> Sub-project
                </button>
              )}
              <button className="btn btn-secondary btn-sm" title="Edit"
                onClick={() => onEdit(project)}>
                <Edit2 size={12} />
              </button>
              <button className="btn btn-danger btn-sm" title="Deactivate"
                onClick={() => onDeactivate(project)}>
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-projects */}
      {hasSubs && open && (
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          {project.subProjects.map(sub => (
            <ProjectCard
              key={sub.id}
              project={sub}
              depth={depth + 1}
              onAddSub={onAddSub}
              onEdit={onEdit}
              onDeactivate={onDeactivate}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | { mode: 'create'|'edit'|'sub', project?, parentId?, parentName? }
  const [alert,     setAlert]     = useState(null);
  const canManage = ['MANAGER', 'ADMIN'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    projectApi.list()
      .then(r => setProjects(r.data.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleSave = () => {
    setModal(null);
    load();
    showMsg('success', 'Project saved successfully');
  };

  const handleDeactivate = async (project) => {
    const msg = project.subProjects?.length > 0
      ? `Deactivate "${project.name}" and its ${project.subProjects.length} sub-project(s)?`
      : `Deactivate "${project.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await projectApi.deactivate(project.id);
      load();
      showMsg('success', `"${project.name}" deactivated`);
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Deactivation failed');
    }
  };

  const totalSubProjects = projects.reduce((n, p) => n + (p.subProjects?.length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">
            {projects.length} root project{projects.length !== 1 ? 's' : ''}
            {totalSubProjects > 0 && ` · ${totalSubProjects} sub-project${totalSubProjects !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <button className="btn btn-primary"
            onClick={() => setModal({ mode: 'create' })}>
            <Plus size={15} /> New Project
          </button>
        )}
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
          {alert.msg}
          <button onClick={() => setAlert(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Hierarchy legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--accent)', label: 'Root Project (e.g. GWG)' },
          { color: '#c084fc',       label: 'Sub-project (e.g. NB, PS, Claims, Commission)' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--text3)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2,
              background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-text">No projects yet</div>
          {canManage && (
            <div className="empty-sub">Click "New Project" to create your first project</div>
          )}
        </div>
      ) : (
        <div>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              depth={0}
              canManage={canManage}
              onAddSub={(p) => setModal({ mode: 'sub', parentId: p.id, parentName: p.name })}
              onEdit={(p) => setModal({ mode: 'edit', project: p })}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          initial={modal.project}
          parentId={modal.parentId}
          parentName={modal.parentName}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
