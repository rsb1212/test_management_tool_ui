import { useState, useEffect, useCallback } from 'react';
import { testCaseApi, projectApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  Plus, Upload, Download, Eye, Trash2, Send, Pencil,
  ChevronLeft, ChevronRight, X, Check, RotateCcw
} from 'lucide-react';

const STATUSES = [
  'DRAFT','PENDING_SME_REVIEW','SME_REVIEWING','SME_APPROVED',
  'ASSIGNED','IN_PROGRESS','UNDER_REVIEW','PASSED','FAILED',
  'DEFECT_RAISED','SIGNED_OFF','DEPRECATED',
];
const PRIORITIES = ['CRITICAL','HIGH','MEDIUM','LOW'];

const priorityColors = {
  CRITICAL: '#ff5252', HIGH: '#ffb74d', MEDIUM: '#ffd740', LOW: '#8899aa'
};

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${(status || '').toLowerCase()}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
}

function PriorityDot({ priority }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: priorityColors[priority] || '#8899aa', flexShrink: 0,
      }} />
      {priority}
    </span>
  );
}

/* ── Edit Modal ─────────────────────────────────────────────────── */
function EditModal({ tc, projects, onSave, onClose }) {
  const [form, setForm] = useState({
    title:        tc.title || '',
    description:  tc.description || '',
    preconditions:tc.preconditions || '',
    projectId:    tc.project?.id || '',
    moduleId:     tc.module?.id  || '',
    priority:     tc.priority || 'HIGH',
    steps: tc.steps?.length
      ? tc.steps.map(s => ({
          stepNumber:    s.stepNumber,
          stepAction:    s.stepAction,
          expectedResult:s.expectedResult,
        }))
      : [{ stepNumber: 1, stepAction: '', expectedResult: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await testCaseApi.editTestCase(tc.id, {
        ...form,
        projectId: form.projectId || undefined,
        moduleId:  form.moduleId  || undefined,
        steps: form.steps.filter(s => s.stepAction.trim()),
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addStep = () =>
    setForm(f => ({
      ...f,
      steps: [...f.steps, { stepNumber: f.steps.length + 1, stepAction: '', expectedResult: '' }],
    }));

  const updateStep = (i, field, val) =>
    setForm(f => {
      const steps = [...f.steps];
      steps[i] = { ...steps[i], [field]: val };
      return { ...f, steps };
    });

  const removeStep = (i) =>
    setForm(f => ({
      ...f,
      steps: f.steps
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 680 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', marginBottom: 2 }}>{tc.code}</div>
            <span className="modal-title">Edit Test Case</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSave}>
          {/* Basic fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required autoFocus
              />
            </div>

            <div className="form-group">
              <label>Project</label>
              <select value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">— unchanged —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Priority *</label>
              <select value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Preconditions</label>
              <input
                value={form.preconditions}
                onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))}
                placeholder="e.g. User must be logged in; Policy must be active"
              />
            </div>
          </div>

          {/* Steps editor */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ margin: 0 }}>Test Steps</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>
                <Plus size={13} /> Add Step
              </button>
            </div>

            <div style={{ maxHeight: 260, overflowY: 'auto',
              border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              {form.steps.map((s, i) => (
                <div key={i} style={{ display: 'grid',
                  gridTemplateColumns: '28px 1fr 1fr 28px',
                  gap: 8, alignItems: 'start', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text3)', paddingTop: 10, textAlign: 'center' }}>
                    {s.stepNumber}
                  </div>
                  <input
                    placeholder="Action / What to do"
                    value={s.stepAction}
                    onChange={e => updateStep(i, 'stepAction', e.target.value)}
                  />
                  <input
                    placeholder="Expected result"
                    value={s.expectedResult}
                    onChange={e => updateStep(i, 'expectedResult', e.target.value)}
                  />
                  <button type="button" onClick={() => removeStep(i)}
                    disabled={form.steps.length === 1}
                    style={{ background: 'none', border: 'none',
                      color: 'var(--text3)', cursor: 'pointer', paddingTop: 8 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : <><Check size={14} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Detail Modal ─────────────────────────────────────────────── */
function DetailModal({ tc, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 660 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', marginBottom: 2 }}>{tc.code}</div>
            <span className="modal-title">{tc.title}</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          {[
            { label: 'Status',      value: <StatusBadge status={tc.status} /> },
            { label: 'Priority',    value: <PriorityDot priority={tc.priority} /> },
            { label: 'Project',     value: tc.project?.name || '—' },
            { label: 'Module',      value: tc.module?.name  || '—' },
            { label: 'Assigned To', value: tc.assignedTo?.fullName || '—' },
            { label: 'Reviewed By', value: tc.reviewedBy?.fullName || '—' },
            { label: 'Created By',  value: tc.createdBy?.fullName  || '—' },
            { label: 'Updated',     value: tc.updatedAt
                ? new Date(tc.updatedAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.5px', fontFamily: 'var(--font-mono)', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text1)' }}>{value}</div>
            </div>
          ))}
        </div>

        {tc.description && (
          <div className="form-group">
            <label>Description</label>
            <p style={{ color: 'var(--text1)', fontSize: 13, lineHeight: 1.7,
              background: 'var(--bg-raised)', padding: '10px 12px',
              borderRadius: 6, border: '1px solid var(--border)' }}>
              {tc.description}
            </p>
          </div>
        )}

        {tc.preconditions && (
          <div className="form-group">
            <label>Preconditions</label>
            <p style={{ color: 'var(--text2)', fontSize: 13,
              background: 'var(--bg-raised)', padding: '10px 12px',
              borderRadius: 6, border: '1px solid var(--border)' }}>
              {tc.preconditions}
            </p>
          </div>
        )}

        {tc.steps?.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Test Steps ({tc.steps.length})
            </label>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Action</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {tc.steps.map(s => (
                    <tr key={s.id || s.stepNumber}>
                      <td style={{ fontFamily: 'var(--font-mono)',
                        color: 'var(--text3)', fontSize: 11 }}>{s.stepNumber}</td>
                      <td style={{ fontSize: 13 }}>{s.stepAction}</td>
                      <td style={{ color: 'var(--text2)', fontSize: 13 }}>{s.expectedResult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Create Modal ─────────────────────────────────────────────── */
function CreateModal({ projects, onSave, onClose }) {
  const [form, setForm] = useState({
    title: '', description: '', preconditions: '',
    projectId: projects[0]?.id || '', moduleId: '', priority: 'HIGH',
    steps: [{ stepNumber: 1, stepAction: '', expectedResult: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await testCaseApi.create({
        ...form,
        projectId: form.projectId || undefined,
        moduleId:  form.moduleId  || undefined,
        steps: form.steps.filter(s => s.stepAction.trim()),
      });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const addStep = () =>
    setForm(f => ({
      ...f,
      steps: [...f.steps, { stepNumber: f.steps.length + 1, stepAction: '', expectedResult: '' }],
    }));

  const updateStep = (i, field, val) =>
    setForm(f => {
      const steps = [...f.steps];
      steps[i] = { ...steps[i], [field]: val };
      return { ...f, steps };
    });

  const removeStep = (i) =>
    setForm(f => ({
      ...f,
      steps: f.steps
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 })),
    }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 680 }}>
        <div className="modal-header">
          <span className="modal-title">New Test Case</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Verify login with valid credentials"
                required autoFocus
              />
            </div>
            <div className="form-group">
              <label>Project *</label>
              <select value={form.projectId}
                onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority *</label>
              <select value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Description</label>
              <textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="What does this test verify?" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Preconditions</label>
              <input value={form.preconditions}
                onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))}
                placeholder="e.g. User exists in system, app is running" />
            </div>
          </div>

          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ margin: 0 }}>Test Steps</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addStep}>
                <Plus size={13} /> Add Step
              </button>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto',
              border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
              {form.steps.map((s, i) => (
                <div key={i} style={{ display: 'grid',
                  gridTemplateColumns: '28px 1fr 1fr 28px',
                  gap: 8, alignItems: 'start', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--text3)', paddingTop: 10, textAlign: 'center' }}>
                    {s.stepNumber}
                  </div>
                  <input placeholder="Step action"
                    value={s.stepAction}
                    onChange={e => updateStep(i, 'stepAction', e.target.value)} />
                  <input placeholder="Expected result"
                    value={s.expectedResult}
                    onChange={e => updateStep(i, 'expectedResult', e.target.value)} />
                  <button type="button" onClick={() => removeStep(i)}
                    disabled={form.steps.length === 1}
                    style={{ background: 'none', border: 'none',
                      color: 'var(--text3)', cursor: 'pointer', paddingTop: 8 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Test Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Import Modal ─────────────────────────────────────────────── */
function ImportModal({ projects, onDone, onClose }) {
  const [importProjectId, setImportProjectId] = useState(projects[0]?.id || '');
  const [importFile,  setImportFile]  = useState(null);
  const [importing,   setImporting]   = useState(false);
  const [importResult,setImportResult]= useState(null);
  const [error, setError] = useState('');

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile || !importProjectId) return;
    setImporting(true);
    setError('');
    try {
      const r = await testCaseApi.importExcel(importProjectId, importFile);
      setImportResult(r.data.data);
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const exportAll = async () => {
    if (!importProjectId) { setError('Select a project first'); return; }
    try {
      const r = await testCaseApi.exportTestCases(importProjectId);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `test-cases-${importProjectId}.xlsx`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { setError('Failed to export test cases'); }
  };

  const downloadTemplate = async () => {
    try {
      const r = await testCaseApi.downloadTemplate();
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'testcase-import-template.xlsx';
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); setError('Failed to download template'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Import Test Cases from Excel</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {importResult ? (
          <div>
            <div className={`alert alert-${importResult.errorCount === 0 ? 'success' : 'info'}`}>
              ✓ Imported {importResult.successCount} of {importResult.totalRows} rows
              {importResult.errorCount > 0 && ` · ${importResult.errorCount} errors`}
            </div>
            {importResult.errors?.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: 'auto',
                background: 'var(--bg-raised)', borderRadius: 6,
                padding: 10, marginBottom: 12 }}>
                {importResult.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--red)',
                    padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    Row {e.row} [{e.column}]: {e.message}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleImport}>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="form-group">
              <label>Project *</label>
              <select value={importProjectId}
                onChange={e => setImportProjectId(e.target.value)} required>
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Excel File (.xlsx) *</label>
              <input type="file" accept=".xlsx"
                onChange={e => setImportFile(e.target.files[0])} required />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Max 500 rows per import.
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={downloadTemplate}>
                <Download size={13} /> Import Template
              </button>
              {importProjectId && (
                <button className="btn btn-secondary btn-sm" onClick={exportAll}
                  title="Export all test cases for this project as Excel">
                  <Download size={13} /> Export All TCs
                </button>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={importing}>
                {importing ? 'Importing…' : <><Upload size={14} /> Import</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════ */
export default function TestCasesPage() {
  const { user } = useAuth();
  const [testCases,     setTestCases]     = useState([]);
  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [page,          setPage]          = useState(0);
  const [totalPages,    setTotalPages]    = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters,       setFilters]       = useState({ projectId: '', status: '' });
  const [alert,         setAlert]         = useState(null);

  // Modal state
  const [showCreate,  setShowCreate]  = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [editingTC,   setEditingTC]   = useState(null);
  const [detailTC,    setDetailTC]    = useState(null);

  const load = useCallback((p = 0) => {
    setLoading(true);
    const params = { page: p, size: 20 };
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.status)    params.status    = filters.status;
    testCaseApi.list(params)
      .then(r => {
        const d = r.data.data;
        setTestCases(d.content || []);
        setTotalPages(d.totalPages || 0);
        setTotalElements(d.totalElements || 0);
      })
      .catch(() => setAlert({ type: 'error', msg: 'Failed to load test cases' }))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    projectApi.list().then(r => setProjects(r.data.data)).catch(err => console.error(err));
  }, []);

  useEffect(() => { setPage(0); load(0); }, [filters]);

  const showMsg = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 5000); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this test case?')) return;
    try {
      await testCaseApi.delete(id);
      showMsg('success', 'Test case deleted');
      load(page);
    } catch { showMsg('error', 'Delete failed'); }
  };

  const handleForwardSME = async (id, e) => {
    e.stopPropagation();
    try {
      await testCaseApi.forwardToSME(id);
      showMsg('success', 'Forwarded to SME review queue');
      load(page);
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Forward failed');
    }
  };

  const canEdit   = ['TESTER','MANAGER','ADMIN','SME'].includes(user?.role);
  const canDelete = ['MANAGER','ADMIN'].includes(user?.role);
  const canForward= ['MANAGER','ADMIN'].includes(user?.role);
  const canImport = ['TESTER','MANAGER','ADMIN'].includes(user?.role);

  const changePage = (p) => { setPage(p); load(p); };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Cases</h1>
          <p className="page-subtitle">{totalElements.toLocaleString()} total cases</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {canImport && (
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={15} /> Import Excel
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Case
          </button>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button onClick={() => setAlert(null)}
            style={{ float: 'right', background: 'none', border: 'none',
              cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select style={{ width: 220 }} value={filters.projectId}
          onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select style={{ width: 200 }} value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(filters.projectId || filters.status) && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => setFilters({ projectId: '', status: '' })}>
            <RotateCcw size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading test cases…</div>
      ) : testCases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧪</div>
          <div className="empty-text">No test cases found</div>
          <div className="empty-sub">Create one manually or import from Excel</div>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Test-Case ID</th>
                  <th>Test Case Discription</th>
                  <th>Project</th>
                  <th>Module</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map(tc => (
                  <tr key={tc.id} style={{ cursor: 'pointer' }}
                    onClick={() => setDetailTC(tc)}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)',
                        fontSize: 11, color: 'var(--accent)' }}>
                        {tc.code}
                      </span>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tc.title}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {tc.project?.name || '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {tc.module?.name || '—'}
                    </td>
                    <td><PriorityDot priority={tc.priority} /></td>
                    <td><StatusBadge status={tc.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {tc.assignedTo?.fullName || tc.assignedTo?.username || '—'}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {/* View */}
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setDetailTC(tc)} title="View detail">
                          <Eye size={13} />
                        </button>
                        {/* Edit */}
                        {canEdit && !['SIGNED_OFF','DEPRECATED'].includes(tc.status) && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => setEditingTC(tc)} title="Edit">
                            <Pencil size={13} />
                          </button>
                        )}
                        {/* Forward to SME */}
                        {canForward && tc.status === 'DRAFT' && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={e => handleForwardSME(tc.id, e)} title="Forward to SME">
                            <Send size={13} />
                          </button>
                        )}
                        {/* Delete */}
                        {canDelete && (
                          <button className="btn btn-danger btn-sm"
                            onClick={e => handleDelete(tc.id, e)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12,
              marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 0}
                onClick={() => changePage(page - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text2)',
                fontFamily: 'var(--font-mono)' }}>
                {page + 1} / {totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1}
                onClick={() => changePage(page + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateModal
          projects={projects}
          onSave={() => { setShowCreate(false); showMsg('success', 'Test case created'); load(0); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingTC && (
        <EditModal
          tc={editingTC}
          projects={projects}
          onSave={() => {
            setEditingTC(null);
            showMsg('success', `${editingTC.code} updated successfully`);
            load(page);
          }}
          onClose={() => setEditingTC(null)}
        />
      )}

      {detailTC && (
        <DetailModal tc={detailTC} onClose={() => setDetailTC(null)} />
      )}

      {showImport && (
        <ImportModal
          projects={projects}
          onDone={() => load(0)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
