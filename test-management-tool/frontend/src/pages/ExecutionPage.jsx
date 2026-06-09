import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { executionApi, projectApi, testCaseApi, attachmentApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Play, History, BarChart2, Plus, X, CheckCircle2,
  XCircle, Ban, SkipForward, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, Search, Paperclip,
  Upload, FileText, FileSpreadsheet, File, Trash2,
  Download, Eye, ChevronDown, ChevronUp, Image
} from 'lucide-react';

const RESULT_META = {
  PASSED:        { color: '#00e676', icon: CheckCircle2, label: 'Passed'        },
  FAILED:        { color: '#ff5252', icon: XCircle,      label: 'Failed'        },
  BLOCKED:       { color: '#ffb74d', icon: Ban,          label: 'Blocked'       },
  SKIPPED:       { color: '#8899aa', icon: SkipForward,  label: 'Skipped'       },
  IN_PROGRESS:   { color: '#00d4ff', icon: Clock,        label: 'In Progress'   },
  DEFECT_RAISED: { color: '#ff5252', icon: AlertTriangle,label: 'Defect Raised' },
  RETEST:        { color: '#c084fc', icon: Clock,        label: 'Retest'        },
};

const ENVS = ['DEV','SIT','UAT','STAGING','PRODUCTION','REGRESSION'];

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv';

/* ── File type icon helper ─────────────────────────────────── */
function FileIcon({ mimeType, fileName }) {
  const n = (fileName || '').toLowerCase();
  const m = (mimeType || '').toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf'))
    return <FileText size={15} style={{ color: '#ff5252' }} />;
  if (m.includes('spreadsheet') || m.includes('excel') ||
      n.endsWith('.xls') || n.endsWith('.xlsx') || n.endsWith('.csv'))
    return <FileSpreadsheet size={15} style={{ color: '#00e676' }} />;
  if (m.includes('image') || n.match(/\.(png|jpg|jpeg|gif|webp)$/))
    return <Image size={15} style={{ color: '#00d4ff' }} />;
  if (m.includes('word') || n.endsWith('.doc') || n.endsWith('.docx'))
    return <FileText size={15} style={{ color: '#60a5fa' }} />;
  return <File size={15} style={{ color: '#8899aa' }} />;
}

function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024)      return `${b} B`;
  if (b < 1048576)   return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function ResultBadge({ result }) {
  const meta = RESULT_META[result] || { color: '#8899aa', label: result };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      background: `${meta.color}20`, color: meta.color,
    }}>{meta.label}</span>
  );
}

/* ── Evidence Uploader (used inside submit modal) ────────────── */
function EvidenceUploader({ pendingFiles, setPendingFiles }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter(f => {
      const dup = pendingFiles.some(p => p.name === f.name && p.size === f.size);
      return !dup;
    });
    setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const remove = (idx) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  return (
    <div style={{ marginTop: 4 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '18px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(0,212,255,0.04)' : 'var(--bg-deep)',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={20} style={{ color: 'var(--accent)', marginBottom: 6 }} />
        <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
          Drop evidence files here or <span style={{ color: 'var(--accent)' }}>browse</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
          PDF, Word, Excel, PowerPoint, Images, ZIP · Max 20 MB each
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* Queued files */}
      {pendingFiles.length > 0 && (
        <div style={{
          marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6,
          maxHeight: 160, overflowY: 'auto',
        }}>
          {pendingFiles.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '7px 10px',
            }}>
              <FileIcon mimeType={f.type} fileName={f.name} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text3)',
                fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {fmtBytes(f.size)}
              </span>
              <button onClick={() => remove(i)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 2, display: 'flex',
              }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Evidence panel shown in the execution log row ───────────── */
function EvidencePanel({ executionId, canDelete }) {
  const [files, setFiles]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef();

  const load = useCallback(() => {
    attachmentApi.listForExecution(executionId)
      .then(r => setFiles(r.data.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [executionId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (fileList) => {
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    try {
      for (const f of arr) {
        await attachmentApi.uploadToExecution(executionId, f);
      }
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove this evidence file?')) return;
    await attachmentApi.delete(id).catch(err => console.error(err));
    load();
  };

  if (loading) return (
    <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--text3)' }}>Loading evidence…</div>
  );

  return (
    <div style={{ padding: '12px 0 4px' }}>
      {/* Existing files */}
      {files.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-raised)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '7px 10px',
            }}>
              <FileIcon mimeType={f.mimeType} fileName={f.fileName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.fileName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  {fmtBytes(f.fileSizeBytes)}
                  {f.uploadedByName && ` · ${f.uploadedByName}`}
                  {f.createdAt && ` · ${new Date(f.createdAt).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={() => {
                  attachmentApi.download(f.id).then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a');
                    a.href = url; a.download = f.fileName || 'evidence';
                    a.click(); window.URL.revokeObjectURL(url);
                  });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 5, fontSize: 11,
                  background: 'rgba(0,212,255,0.1)', color: 'var(--accent)',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}
              >
                <Download size={12} /> Download
              </button>
              {canDelete && (
                <button onClick={() => del(f.id)} style={{
                  background: 'rgba(255,82,82,0.1)', border: 'none', cursor: 'pointer',
                  color: '#ff5252', borderRadius: 5, padding: '4px 7px', display: 'flex',
                }}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10,
          fontStyle: 'italic' }}>No evidence uploaded yet.</div>
      )}

      {/* Upload drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? 'rgba(0,212,255,0.04)' : 'transparent',
          transition: 'all 0.15s',
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading
          ? <><Clock size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Uploading…</span></>
          : <><Upload size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                Drop or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to upload</span> evidence
                &nbsp;<span style={{ color: 'var(--text3)' }}>(PDF, Word, Excel, Images…)</span>
              </span></>
        }
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={e => upload(e.target.files)}
        />
      </div>
    </div>
  );
}

/* ── Submit Execution Modal ──────────────────────────────────── */
function SubmitExecutionModal({ testCase, onSave, onClose }) {
  const [form, setForm] = useState({
    testCaseId:      testCase?.id || '',
    result:          'PASSED',
    environment:     'UAT_2',
    buildVersion:    '',
    actualResult:    '',
    notes:           '',
    defectRef:       '',
    durationSeconds: '',
    stepResults:     testCase?.steps?.map(s => ({
      stepId:       s.id,
      stepNumber:   s.stepNumber,
      result:       'PASSED',
      actualResult: '',
      notes:        '',
    })) || [],
  });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [saving,   setSaving] = useState(false);
  const [error,    setError]  = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const resp = await executionApi.submit({
        ...form,
        durationSeconds: form.durationSeconds ? parseInt(form.durationSeconds) : null,
        stepResults: form.stepResults.filter(s => s.stepId),
      });
      const execId = resp.data?.data?.id;

      // Upload evidence files if any
      if (execId && pendingFiles.length > 0) {
        for (const f of pendingFiles) {
          await attachmentApi.uploadToExecution(execId, f).catch(err => console.error(err));
        }
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally { setSaving(false); }
  };

  const updateStep = (i, field, val) =>
    setForm(f => {
      const sr = [...f.stepResults];
      sr[i] = { ...sr[i], [field]: val };
      return { ...f, stepResults: sr };
    });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--accent)', marginBottom: 2 }}>{testCase?.code}</div>
            <span className="modal-title">Record Execution</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            <div className="form-group">
              <label>Overall Result *</label>
              <select value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}>
                {Object.keys(RESULT_META).map(r =>
                  <option key={r} value={r}>{RESULT_META[r].label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Environment *</label>
              <select value={form.environment}
                onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                {ENVS.map(env => <option key={env} value={env}>{env}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Build / Sprint</label>
              <input placeholder="e.g. R2024.11.2 / Sprint-44"
                value={form.buildVersion}
                onChange={e => setForm(f => ({ ...f, buildVersion: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Duration (seconds)</label>
              <input type="number" min="0" placeholder="e.g. 180"
                value={form.durationSeconds}
                onChange={e => setForm(f => ({ ...f, durationSeconds: e.target.value }))} />
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Actual Result / Observations</label>
              <textarea rows={2}
                placeholder="What actually happened? Any deviations from expected?"
                value={form.actualResult}
                onChange={e => setForm(f => ({ ...f, actualResult: e.target.value }))} />
            </div>

            {(form.result === 'DEFECT_RAISED' || form.result === 'FAILED') && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Defect Reference (PDT / JIRA ID)</label>
                <input placeholder="e.g. PDT-19882 or PROJ-1234"
                  value={form.defectRef}
                  onChange={e => setForm(f => ({ ...f, defectRef: e.target.value }))} />
              </div>
            )}

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Notes</label>
              <textarea rows={2} placeholder="Any additional observations or context…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Per-step results */}
          {form.stepResults.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', marginBottom: 10 }}>
                Step-by-Step Results ({form.stepResults.length} steps)
              </label>
              <div style={{ maxHeight: 220, overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-raised)' }}>
                      {['#','Action','Result','Actual'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left',
                          color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testCase?.steps?.map((step, i) => (
                      <tr key={step.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', color: 'var(--text3)',
                          fontFamily: 'var(--font-mono)', fontSize: 11 }}>{step.stepNumber}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text2)',
                          maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' }} title={step.stepAction}>{step.stepAction}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <select value={form.stepResults[i]?.result || 'PASSED'}
                            onChange={e => updateStep(i, 'result', e.target.value)}
                            style={{ width: 120, padding: '3px 6px', fontSize: 11 }}>
                            {Object.keys(RESULT_META).map(r =>
                              <option key={r} value={r}>{RESULT_META[r].label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input placeholder="Actual result…"
                            value={form.stepResults[i]?.actualResult || ''}
                            onChange={e => updateStep(i, 'actualResult', e.target.value)}
                            style={{ width: '100%', padding: '3px 6px', fontSize: 11 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Test Evidence Upload ───────────────────────── */}
          <div style={{ marginTop: 20, paddingTop: 16,
            borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Paperclip size={15} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                Test Evidence
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                (optional) — screenshots, logs, reports
              </span>
              {pendingFiles.length > 0 && (
                <span style={{
                  background: 'rgba(0,212,255,0.15)', color: 'var(--accent)',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  padding: '1px 7px', borderRadius: 10,
                }}>
                  {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} queued
                </span>
              )}
            </div>
            <EvidenceUploader pendingFiles={pendingFiles} setPendingFiles={setPendingFiles} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? (pendingFiles.length > 0 ? `Uploading ${pendingFiles.length} file(s)…` : 'Saving…')
                : <><Play size={14} /> Record Execution</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── History Modal ───────────────────────────────────────────── */
function HistoryModal({ testCaseId, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testCaseId) return;
    executionApi.history(testCaseId)
      .then(r => setHistory(r.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [testCaseId]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 720 }}>
        <div className="modal-header">
          <div>
            {history && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--accent)', marginBottom: 2 }}>{history.testCaseCode}</div>
            )}
            <span className="modal-title">Execution History</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {loading && <div className="loading" style={{ height: 100 }}>Loading history…</div>}

        {history && !loading && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Runs', value: history.totalRuns,    color: 'var(--accent)' },
                { label: 'Passed',     value: history.passed,       color: '#00e676' },
                { label: 'Failed',     value: history.failed,       color: '#ff5252' },
                { label: 'Blocked',    value: history.blocked,      color: '#ffb74d' },
                { label: 'Defects',    value: history.defectRaised, color: '#ff5252' },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, textAlign: 'center', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '10px 6px',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20,
                    fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {history.executions.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-text">No executions yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10,
                maxHeight: 460, overflowY: 'auto' }}>
                {history.executions.map(ex => (
                  <HistoryCard key={ex.id} ex={ex} />
                ))}
              </div>
            )}
          </>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ ex }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  const toggleEvidence = () => {
    if (!evidenceOpen && evidenceFiles.length === 0) {
      setLoadingEvidence(true);
      attachmentApi.listForExecution(ex.id)
        .then(r => setEvidenceFiles(r.data.data || []))
        .catch(() => setEvidenceFiles([]))
        .finally(() => setLoadingEvidence(false));
    }
    setEvidenceOpen(v => !v);
  };

  return (
    <div style={{
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 14,
      borderLeft: `3px solid ${RESULT_META[ex.result]?.color || '#8899aa'}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
            background: 'var(--bg-deep)', color: 'var(--text3)',
            padding: '2px 7px', borderRadius: 4 }}>
            Run #{ex.runNumber}
          </span>
          <ResultBadge result={ex.result} />
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            {ex.environment}
          </span>
          {ex.buildVersion && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {ex.buildVersion}
            </span>
          )}
          {ex.isLatest && (
            <span style={{ fontSize: 10, background: 'rgba(0,212,255,0.15)',
              color: 'var(--accent)', padding: '1px 6px', borderRadius: 10,
              fontFamily: 'var(--font-mono)' }}>LATEST</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: 'var(--text2)' }}>{ex.executedByName}</div>
          <div>{new Date(ex.executedAt).toLocaleString()}</div>
          {ex.durationSeconds && (
            <div>{Math.floor(ex.durationSeconds / 60)}m {ex.durationSeconds % 60}s</div>
          )}
        </div>
      </div>

      {ex.actualResult && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6,
          background: 'var(--bg-deep)', borderRadius: 4, padding: '6px 8px' }}>
          <span style={{ color: 'var(--text3)', fontSize: 10,
            fontFamily: 'var(--font-mono)', marginRight: 6 }}>ACTUAL:</span>
          {ex.actualResult}
        </div>
      )}
      {ex.defectRef && (
        <div style={{ fontSize: 11, color: '#ff5252', fontFamily: 'var(--font-mono)' }}>
          🐛 Defect: {ex.defectRef}
        </div>
      )}
      {ex.notes && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          📝 {ex.notes}
        </div>
      )}

      {/* Step results */}
      {ex.stepResults?.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
            marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Step Results
          </div>
          {ex.stepResults.map(sr => (
            <div key={sr.id} style={{ display: 'flex', gap: 8,
              alignItems: 'flex-start', fontSize: 12, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text3)', minWidth: 20, paddingTop: 1 }}>{sr.stepNumber}</span>
              <span style={{ flex: 1, color: 'var(--text2)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sr.stepAction}>
                {sr.stepAction}
              </span>
              <ResultBadge result={sr.result} />
              {sr.actualResult && (
                <span style={{ color: 'var(--text3)', fontSize: 11,
                  flex: 1, fontStyle: 'italic' }}>→ {sr.actualResult}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Evidence toggle */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <button onClick={toggleEvidence} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: 0,
        }}>
          <Paperclip size={13} />
          Test Evidence
          {evidenceFiles.length > 0 && (
            <span style={{
              background: 'rgba(0,212,255,0.15)', color: 'var(--accent)',
              fontSize: 10, fontFamily: 'var(--font-mono)',
              padding: '1px 6px', borderRadius: 10,
            }}>{evidenceFiles.length}</span>
          )}
          {evidenceOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {evidenceOpen && (
          <div style={{ marginTop: 8 }}>
            {loadingEvidence
              ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>
              : evidenceFiles.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                  No evidence files attached to this run.
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {evidenceFiles.map(f => (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg-deep)', border: '1px solid var(--border)',
                      borderRadius: 7, padding: '7px 10px',
                    }}>
                      <FileIcon mimeType={f.mimeType} fileName={f.fileName} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.fileName}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)',
                          fontFamily: 'var(--font-mono)' }}>
                          {fmtBytes(f.fileSizeBytes)}
                          {f.uploadedByName && ` · ${f.uploadedByName}`}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          attachmentApi.download(f.id).then(res => {
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const a = document.createElement('a');
                            a.href = url; a.download = f.fileName || 'evidence';
                            a.click(); window.URL.revokeObjectURL(url);
                          });
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 8px', borderRadius: 5, fontSize: 11,
                          background: 'rgba(0,212,255,0.1)', color: 'var(--accent)',
                          border: 'none', cursor: 'pointer', fontWeight: 600,
                        }}>
                        <Download size={12} /> Download
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Main Execution Page
═══════════════════════════════════════════════════════════════════ */
export default function ExecutionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab]         = useState('log');
  const [projects,  setProjects]          = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  const [executions,  setExecutions]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [filterResult, setFilterResult] = useState('');

  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [submitModal,  setSubmitModal]  = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [alert,        setAlert]        = useState(null);

  // Evidence panel open state keyed by executionId
  const [evidenceOpen, setEvidenceOpen] = useState({});

  const [tcSearch,    setTcSearch]    = useState('');
  const [tcResults,   setTcResults]   = useState([]);
  const [tcSearching, setTcSearching] = useState(false);

  useEffect(() => {
    projectApi.list().then(r => setProjects(r.data.data)).catch(err => console.error(err));
  }, []);

  const loadLog = useCallback((p = 0) => {
    setLoading(true);
    const params = { page: p, size: 25 };
    if (selectedProject) params.projectId = selectedProject;
    if (filterResult)    params.result    = filterResult;
    executionApi.list(params)
      .then(r => {
        const d = r.data.data;
        setExecutions(d.content || []);
        setTotalPages(d.totalPages || 0);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedProject, filterResult]);

  useEffect(() => { setPage(0); loadLog(0); }, [selectedProject, filterResult]);

  const loadSummary = useCallback(() => {
    if (!selectedProject) return;
    setSummaryLoading(true);
    executionApi.summary(selectedProject)
      .then(r => setSummary(r.data.data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [selectedProject]);

  useEffect(() => { if (activeTab === 'summary') loadSummary(); }, [activeTab, selectedProject]);

  const searchTestCases = async (q) => {
    if (!q || q.length < 2) { setTcResults([]); return; }
    setTcSearching(true);
    try {
      const params = { size: 10 };
      if (selectedProject) params.projectId = selectedProject;
      const r = await testCaseApi.list(params);
      const all = r.data.data?.content || [];
      setTcResults(all.filter(tc =>
        tc.title.toLowerCase().includes(q.toLowerCase()) ||
        tc.code.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8));
    } catch (err) { console.error(err); } finally { setTcSearching(false); }
  };

  const showMsg = (type, msg) => { setAlert({ type, msg }); setTimeout(() => setAlert(null), 5000); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this execution record?')) return;
    try {
      await executionApi.delete(id);
      showMsg('success', 'Execution deleted');
      loadLog(page);
    } catch (err) { showMsg('error', err.response?.data?.message || 'Delete failed'); }
  };

  const toggleEvidence = (exId) =>
    setEvidenceOpen(prev => ({ ...prev, [exId]: !prev[exId] }));

  const isOwner = (ex) =>
    user?.role === 'MANAGER' || user?.role === 'ADMIN' || ex.executedByEmail === user?.email;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Execution</h1>
          <p className="page-subtitle">..</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)} style={{ width: 220 }}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary"
            onClick={() => { setTcSearch(''); setTcResults([]); setSubmitModal('picker'); }}>
            <Plus size={15} /> Record Execution
          </button>
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button onClick={() => setAlert(null)}
            style={{ float: 'right', background: 'none', border: 'none',
              cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { id: 'log',     icon: History,  label: 'Execution Log' },
          { id: 'summary', icon: BarChart2, label: 'Summary Dashboard' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text3)',
            padding: '10px 20px', fontSize: 14, fontWeight: 600,
            fontFamily: 'var(--font-sans)', marginBottom: -1,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── EXECUTION LOG TAB ── */}
      {activeTab === 'log' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <select style={{ width: 180 }} value={filterResult}
              onChange={e => setFilterResult(e.target.value)}>
              <option value="">All Results</option>
              {Object.keys(RESULT_META).map(r =>
                <option key={r} value={r}>{RESULT_META[r].label}</option>)}
            </select>
          </div>

          {loading ? <div className="loading">Loading executions…</div> :
          executions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▶️</div>
              <div className="empty-text">No executions recorded yet</div>
              <div className="empty-sub">Click "Record Execution" to start tracking</div>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TC Code</th>
                      <th>Test Case</th>
                      <th>Tester</th>
                      <th>Result</th>
                      <th>Environment</th>
                      <th>Build</th>
                      <th>Run #</th>
                      <th>Duration</th>
                      <th>Executed At</th>
                      <th>Defect Ref</th>
                      <th style={{ minWidth: 110 }}>Evidence</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map(ex => (
                      <React.Fragment key={ex.id}>
                        <tr>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                              color: 'var(--accent)' }}>{ex.testCaseCode}</span>
                          </td>
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontSize: 12, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: 'var(--text1)' }} title={ex.testCaseTitle}>
                              {ex.testCaseTitle}
                            </div>
                            {ex.moduleName && (
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{ex.moduleName}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{ex.executedByName}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)',
                              fontFamily: 'var(--font-mono)' }}>{ex.executedByEmail}</div>
                          </td>
                          <td><ResultBadge result={ex.result} /></td>
                          <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)',
                            color: 'var(--text2)' }}>{ex.environment}</td>
                          <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)',
                            color: 'var(--text3)' }}>{ex.buildVersion || '—'}</td>
                          <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)',
                            fontSize: 12, color: 'var(--text2)' }}>
                            {ex.runNumber}
                            {ex.isLatest && (
                              <span style={{ display: 'block', fontSize: 9, color: 'var(--accent)' }}>
                                latest
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text3)',
                            fontFamily: 'var(--font-mono)' }}>
                            {ex.durationSeconds
                              ? `${Math.floor(ex.durationSeconds / 60)}m ${ex.durationSeconds % 60}s`
                              : '—'}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                            {new Date(ex.executedAt).toLocaleString()}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#ff5252' }}>
                            {ex.defectRef || '—'}
                          </td>

                          {/* Evidence toggle cell */}
                          <td>
                            <button
                              onClick={() => toggleEvidence(ex.id)}
                              title="Test Evidence"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 9px', borderRadius: 6, fontSize: 11,
                                fontWeight: 600, cursor: 'pointer', border: 'none',
                                background: evidenceOpen[ex.id]
                                  ? 'rgba(0,212,255,0.18)' : 'rgba(0,212,255,0.07)',
                                color: 'var(--accent)',
                                transition: 'background 0.15s',
                              }}
                            >
                              <Paperclip size={12} />
                              Evidence
                              {evidenceOpen[ex.id]
                                ? <ChevronUp size={11} />
                                : <ChevronDown size={11} />}
                            </button>
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button className="btn btn-secondary btn-sm"
                                onClick={() => setHistoryModal(ex.testCaseId)}
                                title="View full history">
                                <History size={12} />
                              </button>
                              {isOwner(ex) && (
                                <button className="btn btn-danger btn-sm"
                                  onClick={() => handleDelete(ex.id)}
                                  title="Delete">
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── Evidence expansion row ── */}
                        {evidenceOpen[ex.id] && (
                          <tr>
                            <td colSpan={12} style={{
                              background: 'var(--bg-deep)',
                              padding: '0 16px 12px 60px',
                              borderBottom: '2px solid var(--accent)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                                paddingTop: 12, marginBottom: 4 }}>
                                <Paperclip size={14} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontSize: 13, fontWeight: 700,
                                  color: 'var(--text1)' }}>Test Evidence</span>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                  — screenshots, logs, reports, any format
                                </span>
                              </div>
                              <EvidencePanel
                                executionId={ex.id}
                                canDelete={isOwner(ex)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                  marginTop: 16, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" disabled={page === 0}
                    onClick={() => { setPage(p => p - 1); loadLog(page - 1); }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: 13, color: 'var(--text2)',
                    fontFamily: 'var(--font-mono)' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <button className="btn btn-secondary btn-sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => { setPage(p => p + 1); loadLog(page + 1); }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── SUMMARY DASHBOARD TAB ── */}
      {activeTab === 'summary' && (
        <>
          {!selectedProject && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <div className="empty-text">Select a project to view execution summary</div>
            </div>
          )}
          {summaryLoading && <div className="loading">Loading summary…</div>}
          {summary && !summaryLoading && (
            <>
              <div className="stat-grid"
                style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 24 }}>
                {[
                  { label: 'Total Executions', value: summary.totalExecutions, color: 'var(--accent)' },
                  { label: 'Passed',       value: summary.passed,       color: '#00e676' },
                  { label: 'Failed',       value: summary.failed,       color: '#ff5252' },
                  { label: 'Blocked',      value: summary.blocked,      color: '#ffb74d' },
                  { label: 'Defect Raised',value: summary.defectRaised, color: '#ff5252' },
                  { label: 'Pass Rate',    value: `${summary.passRate}%`,
                    color: summary.passRate >= 80 ? '#00e676' : summary.passRate >= 60 ? '#ffd740' : '#ff5252' },
                ].map(s => (
                  <div key={s.label} className="stat-card" style={{ '--stat-color': s.color }}>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 20, marginBottom: 24 }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">14-Day Execution Trend</span>
                  </div>
                  {summary.dailyTrend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={summary.dailyTrend}
                        margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fill: '#556677', fontSize: 10 }}
                          tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fill: '#556677', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#18202e',
                          border: '1px solid #1e2d3d', borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="passed"       stroke="#00e676" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="failed"       stroke="#ff5252" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="defectRaised" stroke="#ffb74d" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <div className="empty-text">No trend data yet</div>
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Module Execution Breakdown</span>
                  </div>
                  {summary.moduleBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%"
                      height={Math.max(180, summary.moduleBreakdown.length * 26)}>
                      <BarChart data={summary.moduleBreakdown.slice(0, 8)} layout="vertical"
                        margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                        <XAxis type="number" tick={{ fill: '#556677', fontSize: 10 }} />
                        <YAxis type="category" dataKey="moduleName" width={130}
                          tick={{ fill: '#8899aa', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#18202e',
                          border: '1px solid #1e2d3d', borderRadius: 8 }} />
                        <Bar dataKey="passed"       stackId="a" fill="#00e676" />
                        <Bar dataKey="failed"       stackId="a" fill="#ff5252" />
                        <Bar dataKey="defectRaised" stackId="a" fill="#ffb74d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <div className="empty-text">No module data</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <span className="card-title">Tester Execution Breakdown</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Tester</th><th>Total Executed</th>
                        <th>Passed</th><th>Failed</th><th>Blocked</th>
                        <th>Defects</th><th>Pass Rate</th><th>Last Executed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.testerBreakdown.map((t, i) => (
                        <tr key={t.userId}>
                          <td style={{ color: 'var(--text3)', fontSize: 11 }}>{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.testerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)',
                              fontFamily: 'var(--font-mono)' }}>{t.testerEmail}</div>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{t.total}</td>
                          <td style={{ color: '#00e676', fontFamily: 'var(--font-mono)' }}>{t.passed}</td>
                          <td style={{ color: '#ff5252', fontFamily: 'var(--font-mono)' }}>{t.failed}</td>
                          <td style={{ color: '#ffb74d', fontFamily: 'var(--font-mono)' }}>{t.blocked}</td>
                          <td style={{ color: '#ff5252', fontFamily: 'var(--font-mono)' }}>{t.defectRaised}</td>
                          <td>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                              color: t.passRate >= 80 ? '#00e676' : t.passRate >= 60 ? '#ffd740' : '#ff5252',
                            }}>{t.passRate}%</span>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {t.lastExecutedAt ? new Date(t.lastExecutedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Test Case Picker Modal ── */}
      {submitModal === 'picker' && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setSubmitModal(null)}>
          <div className="modal" style={{ width: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Select Test Case to Execute</span>
              <button className="modal-close" onClick={() => setSubmitModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label>Search by title or code</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input autoFocus placeholder="e.g. TC-001 or 'Verify login…'"
                  value={tcSearch}
                  onChange={e => { setTcSearch(e.target.value); searchTestCases(e.target.value); }} />
                <button className="btn btn-secondary" onClick={() => searchTestCases(tcSearch)}>
                  <Search size={14} />
                </button>
              </div>
            </div>
            {tcSearching && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 0' }}>Searching…</div>}
            {tcResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {tcResults.map(tc => (
                  <button key={tc.id}
                    onClick={() => { setSubmitModal(tc); setTcSearch(''); setTcResults([]); }}
                    style={{
                      background: 'var(--bg-raised)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--accent)' }}>{tc.code}</span>
                      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>
                        {tc.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                      {tc.project?.name} · {tc.module?.name || 'No module'} · {tc.priority} · {tc.status}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {tcSearch.length >= 2 && tcResults.length === 0 && !tcSearching && (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
                No test cases found for "{tcSearch}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Submit Execution Modal ── */}
      {submitModal && submitModal !== 'picker' && (
        <SubmitExecutionModal
          testCase={submitModal}
          onSave={() => {
            setSubmitModal(null);
            showMsg('success', `Execution recorded for ${submitModal.code}`);
            loadLog(0);
            if (activeTab === 'summary') loadSummary();
          }}
          onClose={() => setSubmitModal(null)}
        />
      )}

      {/* ── History Modal ── */}
      {historyModal && (
        <HistoryModal
          testCaseId={historyModal}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  );
}
