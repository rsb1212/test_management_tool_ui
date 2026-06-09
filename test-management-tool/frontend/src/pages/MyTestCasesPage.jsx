/**
 * MyTestCasesPage — Tester Dashboard
 *
 * CORRECTED FLOW:
 *   1. Manager assigns cases → they appear here with status ASSIGNED
 *   2. Tester opens a case → clicks "Start" → status becomes IN_PROGRESS
 *   3. Tester updates result: PASSED / FAILED / RETEST / DEFECT_RAISED
 *   4. Each action calls POST /api/v1/executions (creates execution record)
 *   5. Status updates instantly in this dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import { testCaseApi, executionApi, userApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  ClipboardList, Search, X, Bug, CheckCircle2, XCircle,
  Clock, RefreshCw, Play, RotateCcw, AlertCircle,
  ChevronDown, ChevronUp, Send, Loader, Eye
} from 'lucide-react';

/* ── Colour maps ────────────────────────────────────────────── */
const STATUS_META = {
  ASSIGNED:      { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)',   label: 'Assigned',      icon: Clock },
  IN_PROGRESS:   { color: '#00d4ff', bg: 'rgba(0,212,255,0.12)',    label: 'In Progress',   icon: Play },
  PASSED:        { color: '#3fb950', bg: 'rgba(63,185,80,0.12)',    label: 'Pass',          icon: CheckCircle2 },
  FAILED:        { color: '#f85149', bg: 'rgba(248,81,73,0.12)',    label: 'Fail',          icon: XCircle },
  DEFECT_RAISED: { color: '#f85149', bg: 'rgba(248,81,73,0.12)',    label: 'Defect Raised', icon: Bug },
  RETEST:        { color: '#d29922', bg: 'rgba(210,153,34,0.12)',   label: 'Retest',        icon: RotateCcw },
  UNDER_REVIEW:  { color: '#d29922', bg: 'rgba(210,153,34,0.12)',   label: 'Under Review',  icon: Eye },
  NA:            { color: '#ffd740', bg: 'rgba(255,215,64,0.12)',   label: 'NA',            icon: AlertCircle },
  NOT_RELEASED:  { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', label: 'Not Released',  icon: AlertCircle },
};

const PRIORITY_COLOR = {
  CRITICAL: '#f85149', HIGH: '#d29922', MEDIUM: '#58a6ff', LOW: '#8b949e',
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { color: '#8b949e', bg: 'rgba(139,148,158,0.12)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
      textTransform: 'uppercase', padding: '3px 9px', borderRadius: 12,
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({ value, label, color, icon: Icon, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--bg-card)', border: `1px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', transition: 'all 0.12s',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color }}>{value}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{label}</div>
        </div>
        {Icon && <Icon size={16} style={{ color, opacity: 0.5 }} />}
      </div>
    </div>
  );
}

/* ── Execute Modal ──────────────────────────────────────────── */
function ExecuteModal({ tc, onClose, onDone }) {
  const [result,      setResult]      = useState('');
  const [actualResult,setActualResult]= useState('');
  const [defectRef,   setDefectRef]   = useState('');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const RESULT_OPTIONS = [
    { value: 'PASSED',        label: '✅ Passed',        color: '#3fb950', desc: 'Test case executed successfully' },
    { value: 'FAILED',        label: '❌ Failed',        color: '#f85149', desc: 'Test case did not meet expected result' },
    { value: 'RETEST',        label: '🔄 Retest',       color: '#d29922', desc: 'Needs to be re-executed after fix' },
    { value: 'DEFECT_RAISED', label: ' Defect Raised', color: '#f85149', desc: 'A defect was found — enter defect ID' },
    { value: 'BLOCKED',       label: '⛔ Blocked',       color: '#8b949e', desc: 'Cannot execute due to a blocker' },
  ];

  const submit = async () => {
    if (!result) { setError('Please select a result'); return; }
    if (result === 'DEFECT_RAISED' && !defectRef.trim()) {
      setError('Please enter the defect ID for defect raised cases'); return;
    }
    setSaving(true);
    try {
      await executionApi.submit({
        testCaseId:   tc.id,
        result,
        actualResult: actualResult.trim() || null,
        defectRef:    defectRef.trim()    || null,
        notes:        notes.trim()        || null,
      });
      onDone(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Update Test Result</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              {tc.code} · {tc.title?.substring(0, 50)}{tc.title?.length > 50 ? '…' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {error && (
            <div style={{ padding: '8px 12px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
              borderRadius: 7, fontSize: 12, color: '#f85149', marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Result selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.5px', display: 'block', marginBottom: 10 }}>
              Result *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {RESULT_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setResult(opt.value)} style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${result === opt.value ? opt.color : 'var(--border)'}`,
                  background: result === opt.value ? opt.color + '15' : 'var(--bg-raised)',
                  transition: 'all 0.12s',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: result === opt.value ? opt.color : 'var(--text1)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Actual result */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
              Actual Result
            </label>
            <textarea rows={3} value={actualResult} onChange={e => setActualResult(e.target.value)}
              placeholder="What actually happened when you ran this test…"
              style={{ width: '100%', resize: 'vertical' }} />
          </div>

          {/* Defect ID — only when DEFECT_RAISED */}
          {result === 'DEFECT_RAISED' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#f85149', textTransform: 'uppercase',
                letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
                Defect ID *
              </label>
              <input value={defectRef} onChange={e => setDefectRef(e.target.value)}
                placeholder="e.g. DEF-101, JIRA-234"
                style={{ borderColor: defectRef ? 'var(--border2)' : 'rgba(248,81,73,0.5)' }} />
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase',
              letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
              Notes (optional)
            </label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes or observations…" />
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !result}>
            {saving ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Send size={14} /> Submit Result</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Step viewer (collapsible) ─────────────────────────────── */
function StepViewer({ steps }) {
  if (!steps?.length) return null;
  return (
    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        Test Steps ({steps.length})
      </div>
      {steps.map(s => (
        <div key={s.id || s.stepNumber} style={{
          display: 'flex', gap: 10, marginBottom: 6, padding: '8px 12px',
          background: 'var(--bg-raised)', borderRadius: 6,
          borderLeft: '2px solid var(--border2)',
        }}>
          <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
            background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>
            {s.stepNumber}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text1)', marginBottom: 2 }}>{s.stepAction}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
              Expected: {s.expectedResult}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── TestCase Row (expandable) ─────────────────────────────── */
function TestCaseRow({ tc, onExecute, onStart }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[tc.status] || { color: '#8b949e' };

  return (
    <>
      <tr style={{
        background: expanded ? 'rgba(255,255,255,0.02)' : undefined,
        borderLeft: `3px solid ${meta.color}`,
      }}>
        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {tc.code}
        </td>
        <td style={{ maxWidth: 260 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text1)' }}>{tc.title}</div>
          {tc.module?.name && (
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
              background: 'rgba(188,140,255,0.1)', color: 'var(--purple)',
              padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
              {tc.module.name}
            </span>
          )}
        </td>
        <td>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
            color: PRIORITY_COLOR[tc.priority] || '#8b949e' }}>
            {tc.priority}
          </span>
        </td>
        <td><StatusBadge status={tc.status} /></td>
        <td style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
          {tc.dueDate
            ? <span style={{ color: new Date(tc.dueDate) < new Date() ? '#f85149' : 'var(--text2)' }}>
                {tc.dueDate}
              </span>
            : '—'}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Start button — only when ASSIGNED */}
            {tc.status === 'ASSIGNED' && (
              <button className="btn btn-sm btn-success"
                onClick={() => onStart(tc)}
                style={{ fontSize: 11, padding: '4px 10px' }}>
                <Play size={11} /> Start
              </button>
            )}
            {/* Update result button */}
            {['IN_PROGRESS', 'ASSIGNED', 'RETEST'].includes(tc.status) && (
              <button className="btn btn-primary btn-sm"
                onClick={() => onExecute(tc)}
                style={{ fontSize: 11, padding: '4px 10px' }}>
                <Send size={11} /> Update
              </button>
            )}
            {/* Retest button for failed/defect */}
            {['FAILED', 'DEFECT_RAISED'].includes(tc.status) && (
              <button className="btn btn-sm"
                onClick={() => onExecute(tc)}
                style={{ fontSize: 11, padding: '4px 10px', borderColor: '#d29922', color: '#d29922' }}>
                <RotateCcw size={11} /> Retest
              </button>
            )}
            {/* Expand steps */}
            {tc.steps?.length > 0 && (
              <button className="btn btn-sm btn-icon"
                onClick={() => setExpanded(p => !p)}
                style={{ color: expanded ? 'var(--accent)' : 'var(--text3)' }}
                title="View steps">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded steps row */}
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: '0 14px 14px 14px', background: 'rgba(255,255,255,0.01)' }}>
            <StepViewer steps={tc.steps} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function MyTestCasesPage() {
  const { user: currentUser } = useAuth();

  const [testCases,   setTestCases]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [filterMod,   setFilterMod]   = useState('');
  const [filterSt,    setFilterSt]    = useState('');
  const [filterPri,   setFilterPri]   = useState('');
  const [executeTC,   setExecuteTC]   = useState(null);
  const [actionMsg,   setActionMsg]   = useState(null);
  const [starting,    setStarting]    = useState(null);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await testCaseApi.list({
        assignedToUserId: currentUser.id,
        size: 500,
      });
      const items = res.data.data?.content || res.data.data || [];
      setTestCases(items);
    } catch {
      setError('Failed to load your assigned test cases. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);

  // Start a case: submit IN_PROGRESS execution
  const handleStart = async (tc) => {
    setStarting(tc.id);
    try {
      await executionApi.submit({
        testCaseId: tc.id,
        result:     'IN_PROGRESS',
      });
      // Update local state immediately
      setTestCases(prev =>
        prev.map(t => t.id === tc.id ? { ...t, status: 'IN_PROGRESS' } : t)
      );
      setActionMsg({ type: 'success', text: `Started: ${tc.code} is now In Progress` });
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Could not start this case' });
    } finally {
      setStarting(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  // After submitting execution result
  const handleExecuteDone = (result) => {
    const STATUS_MAP = {
      PASSED:        'PASSED',
      FAILED:        'FAILED',
      RETEST:        'RETEST',
      DEFECT_RAISED: 'DEFECT_RAISED',
      BLOCKED:       'UNDER_REVIEW',
    };
    setTestCases(prev =>
      prev.map(t => t.id === executeTC.id
        ? { ...t, status: STATUS_MAP[result] || t.status }
        : t)
    );
    const msgs = {
      PASSED:        '✅ Test case marked as Passed!',
      FAILED:        '❌ Test case marked as Failed',
      RETEST:        '🔄 Marked for Retest',
      DEFECT_RAISED: ' Defect raised and recorded',
      BLOCKED:       '⛔ Marked as Blocked / Under Review',
    };
    setActionMsg({ type: result === 'PASSED' ? 'success' : 'info', text: msgs[result] || 'Status updated' });
    setExecuteTC(null);
    setTimeout(() => setActionMsg(null), 5000);
    // Full reload after 1s to sync from server
    setTimeout(load, 1000);
  };

  /* Stats */
  const total          = testCases.length;
  const assigned       = testCases.filter(t => t.status === 'ASSIGNED').length;
  const inProgress     = testCases.filter(t => t.status === 'IN_PROGRESS').length;
  const passed         = testCases.filter(t => ['PASSED', 'SIGNED_OFF', 'UAT_PASSED'].includes(t.status)).length;
  const failed         = testCases.filter(t => t.status === 'FAILED').length;
  const defectsRaised  = testCases.filter(t => t.status === 'DEFECT_RAISED').length;
  const blocked        = testCases.filter(t => t.status === 'UNDER_REVIEW').length;
  const retest         = testCases.filter(t => t.status === 'RETEST').length;
  const naCount        = testCases.filter(t => t.status === 'NA').length;
  const notReleased    = testCases.filter(t => t.status === 'NOT_RELEASED').length;
  const pending        = assigned + inProgress; // Pending = not yet executed
  const totalExecuted  = passed + failed + defectsRaised;
  const passRate       = totalExecuted > 0 ? Math.round(passed / totalExecuted * 100) : 0;

  /* Filter options */
  const modules  = [...new Set(testCases.map(tc => tc.module?.name).filter(Boolean))].sort();
  const statuses = [...new Set(testCases.map(tc => tc.status))].sort();

  /* Active filter */
  const [activeStatFilter, setActiveStatFilter] = useState('');

  /* Filtered list */
  const filtered = testCases.filter(tc => {
    const q = search.toLowerCase();
    const matchQ   = !search    || tc.title?.toLowerCase().includes(q) || tc.code?.toLowerCase().includes(q);
    const matchMod = !filterMod || tc.module?.name === filterMod;
    const matchSt  = !filterSt  || tc.status === filterSt;
    const matchPri = !filterPri || String(tc.priority) === filterPri;
    const matchAct = !activeStatFilter || tc.status === activeStatFilter;
    return matchQ && matchMod && matchSt && matchPri && matchAct;
  });

  const handleStatClick = (status) => {
    setActiveStatFilter(prev => prev === status ? '' : status);
    setFilterSt('');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Test Cases</h1>
          <p className="page-subtitle">
            Cases assigned to you · Click <strong>Start</strong> to begin · Click <strong>Update</strong> to record result
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: actionMsg.type === 'success' ? 'rgba(63,185,80,0.12)' : actionMsg.type === 'error' ? 'rgba(248,81,73,0.12)' : 'rgba(88,166,255,0.12)',
          border: `1px solid ${actionMsg.type === 'success' ? 'rgba(63,185,80,0.3)' : actionMsg.type === 'error' ? 'rgba(248,81,73,0.3)' : 'rgba(88,166,255,0.3)'}`,
          color: actionMsg.type === 'success' ? '#3fb950' : actionMsg.type === 'error' ? '#f85149' : '#58a6ff',
          fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Stat cards (clickable to filter) ── */}
      {/* Row 1: primary statuses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 8 }}>
        <StatCard value={total}      label="Total"       color="var(--accent)" icon={ClipboardList}
          onClick={() => handleStatClick('')} active={!activeStatFilter} />
        <StatCard value={assigned}   label="Assigned"    color="#58a6ff"       icon={Clock}
          onClick={() => handleStatClick('ASSIGNED')} active={activeStatFilter === 'ASSIGNED'} />
        <StatCard value={inProgress} label="In Progress" color="#00d4ff"       icon={Play}
          onClick={() => handleStatClick('IN_PROGRESS')} active={activeStatFilter === 'IN_PROGRESS'} />
        <StatCard value={passed}     label="Pass"        color="#3fb950"       icon={CheckCircle2}
          onClick={() => handleStatClick('PASSED')} active={activeStatFilter === 'PASSED'} />
        <StatCard value={failed}     label="Fail"        color="#f85149"       icon={XCircle}
          onClick={() => handleStatClick('FAILED')} active={activeStatFilter === 'FAILED'} />
        <StatCard value={retest}     label="Retest"      color="#d29922"       icon={RotateCcw}
          onClick={() => handleStatClick('RETEST')} active={activeStatFilter === 'RETEST'} />
      </div>
      {/* Row 2: More statuses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard value={defectsRaised} label="Defects Raised" color="#ff9800"   icon={Bug}
          onClick={() => handleStatClick('DEFECT_RAISED')} active={activeStatFilter === 'DEFECT_RAISED'} />
        <StatCard value={blocked}     label="Blocked"       color="#8b949e"
          onClick={() => handleStatClick('UNDER_REVIEW')} active={activeStatFilter === 'UNDER_REVIEW'} />
        <StatCard value={naCount}     label="NA"            color="#ffd740"
          onClick={() => handleStatClick('NA')} active={activeStatFilter === 'NA'} />
        <StatCard value={notReleased} label="Not Released"  color="#c084fc"
          onClick={() => handleStatClick('NOT_RELEASED')} active={activeStatFilter === 'NOT_RELEASED'} />
        <StatCard value={pending}     label="Pending"       color="#58a6ff" />
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
            color: passRate >= 80 ? '#3fb950' : passRate >= 60 ? '#d29922' : '#f85149' }}>{passRate}%</div>
          <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase',
            letterSpacing: '0.5px', marginTop: 3 }}>Pass Rate</div>
        </div>
      </div>

      {/* ── How-to guide (only when there are ASSIGNED cases) ── */}
      {assigned > 0 && !activeStatFilter && (
        <div style={{
          background: 'rgba(88,166,255,0.06)', border: '1px solid rgba(88,166,255,0.2)',
          borderRadius: 10, padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <AlertCircle size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--accent)' }}>{assigned} case(s) waiting:</strong>{' '}
            Click <strong>Start</strong> to begin testing, then click <strong>Update</strong> to record your result (Pass/Fail/Retest/Defect).
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or title…" style={{ paddingLeft: 30, height: 34 }} />
        </div>
        <select value={filterMod} onChange={e => setFilterMod(e.target.value)} style={{ width: 150, height: 34 }}>
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterSt} onChange={e => { setFilterSt(e.target.value); setActiveStatFilter(''); }}
          style={{ width: 170, height: 34 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)} style={{ width: 130, height: 34 }}>
          <option value="">All Priorities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || filterMod || filterSt || filterPri || activeStatFilter) && (
          <button className="btn btn-secondary btn-sm" onClick={() => {
            setSearch(''); setFilterMod(''); setFilterSt(''); setFilterPri(''); setActiveStatFilter('');
          }}>
            <X size={12} /> Clear all
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
          Showing {filtered.length} of {total}
        </span>
      </div>

      {/* ── Main table ── */}
      {loading ? (
        <div className="loading">Loading your test cases…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <ClipboardList size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
            {search || filterMod || filterSt || filterPri || activeStatFilter
              ? 'No cases match your filter'
              : 'No test cases assigned yet'}
          </div>
          <div style={{ fontSize: 12 }}>
            {!search && !filterMod && !filterSt && !filterPri && !activeStatFilter
              ? 'Your manager will assign cases to you. Check back soon.'
              : 'Try clearing the filters above.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th>Title / Module</th>
                <th style={{ width: 80 }}>Priority</th>
                <th style={{ width: 130 }}>Status</th>
                <th style={{ width: 100 }}>Due Date</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tc => (
                <TestCaseRow
                  key={tc.id}
                  tc={tc}
                  onExecute={setExecuteTC}
                  onStart={handleStart}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Execute Modal ── */}
      {executeTC && (
        <ExecuteModal
          tc={executeTC}
          onClose={() => setExecuteTC(null)}
          onDone={handleExecuteDone}
        />
      )}
    </div>
  );
}
