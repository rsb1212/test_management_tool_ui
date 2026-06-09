/**
 * AssignByModulePage — Manager Assignment Hub
 *
 * CORRECTED FLOW:
 *   1. Manager imports test cases (any status: DRAFT, SME_APPROVED, etc.)
 *   2. Manager selects tester + picks individual cases OR bulk by module
 *   3. On assign → cases status becomes ASSIGNED, tester is notified
 *   4. Tester sees cases on their dashboard immediately
 *
 * The preview table now shows ALL assignable cases (DRAFT, SME_APPROVED)
 * with checkbox selection. Manager can assign any case they choose.
 */
import { useState, useEffect, useCallback } from 'react';
import { testCaseApi, userApi, projectApi, moduleApi } from '../api';
import {
  Layers, ArrowRight, RefreshCw, X, CheckSquare,
  Square, Search, User, AlertCircle, Send,
  ChevronDown, ChevronUp, Filter, ClipboardList
} from 'lucide-react';

const PRIORITY_COLOR = {
  CRITICAL: '#f85149', HIGH: '#d29922', MEDIUM: '#58a6ff', LOW: '#8b949e',
};

const STATUS_COLOR = {
  DRAFT: '#8b949e', SME_APPROVED: '#bc8cff', ASSIGNED: '#58a6ff',
  IN_PROGRESS: '#00d4ff', PASSED: '#3fb950', FAILED: '#f85149',
  DEFECT_RAISED: '#f85149', PENDING_SME_REVIEW: '#d29922',
};

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || '#8b949e';
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 12,
      background: c + '22', color: c, whiteSpace: 'nowrap',
    }}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
}

/* ── Confirm Modal ────────────────────────────────────────────── */
function ConfirmModal({ selected, tester, onConfirm, onClose, saving, dueDate }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Confirm Assignment</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              {selected.length} test case(s) will be assigned to {tester?.fullName}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Tester info */}
          <div style={{
            background: 'rgba(63,185,80,0.07)', border: '1px solid rgba(63,185,80,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(63,185,80,0.15)', border: '1px solid #3fb950',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#3fb950',
            }}>
              {(tester?.fullName || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#3fb950', fontSize: 14 }}>{tester?.fullName}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                {tester?.email} {tester?.team ? `· ${tester.team}` : ''}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                {selected.length}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>cases</div>
            </div>
          </div>

          {dueDate && (
            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text2)' }}>
              📅 Due date: <strong style={{ color: 'var(--text1)' }}>{dueDate}</strong>
            </div>
          )}

          {/* Case list */}
          <div style={{
            border: '1px solid var(--border)', borderRadius: 8,
            maxHeight: 240, overflowY: 'auto', overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--bg-raised)', padding: '8px 14px',
              fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-mono)',
              display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
            }}>
              <span>TEST CASES TO ASSIGN</span>
              <span style={{ color: 'var(--accent)' }}>{selected.length} SELECTED</span>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {selected.map(tc => (
                <div key={tc.id} style={{
                  padding: '8px 14px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', minWidth: 60, flexShrink: 0 }}>
                    {tc.code}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text1)' }}>{tc.title}</span>
                  <StatusBadge status={tc.status} />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                    color: PRIORITY_COLOR[tc.priority] || '#8b949e', flexShrink: 0 }}>
                    {tc.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={saving}>
            {saving ? 'Assigning…' : <><Send size={14} /> Assign {selected.length} Cases</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function AssignByModulePage() {
  const [projects,      setProjects]      = useState([]);
  const [modules,       setModules]       = useState([]);
  const [testers,       setTesters]       = useState([]);
  const [allCases,      setAllCases]      = useState([]);
  const [selectedIds,   setSelectedIds]   = useState(new Set());

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModule,  setSelectedModule]  = useState('');
  const [selectedTester,  setSelectedTester]  = useState('');
  const [dueDate,         setDueDate]         = useState('');
  const [statusFilter,    setStatusFilter]    = useState('');
  const [search,          setSearch]          = useState('');

  const [loading,        setLoading]       = useState(true);
  const [casesLoading,   setCasesLoading]  = useState(false);
  const [saving,         setSaving]        = useState(false);
  const [showConfirm,    setShowConfirm]   = useState(false);
  const [alert,          setAlert]         = useState(null);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 6000);
  };

  // Load projects + testers
  useEffect(() => {
    Promise.all([projectApi.list(), userApi.listTesters()])
      .then(([pr, tr]) => {
        setProjects(pr.data.data || []);
        setTesters(tr.data.data || []);
      })
      .catch(() => showAlert('error', 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  // Load modules when project changes
  useEffect(() => {
    if (!selectedProject) { setModules([]); setSelectedModule(''); return; }
    moduleApi.listByProject(selectedProject)
      .then(r => setModules(r.data.data || []))
      .catch(() => setModules([]));
  }, [selectedProject]);

  // Load cases whenever project or module filter changes
  const loadCases = useCallback(() => {
    setCasesLoading(true);
    setSelectedIds(new Set());
    const params = { size: 500 };
    if (selectedProject) params.projectId = selectedProject;
    if (selectedModule)  params.module    = selectedModule;
    // Get unassigned cases only (no assignedTo)
    testCaseApi.list(params)
      .then(r => {
        const items = (r.data.data?.content || r.data.data || [])
          // Show only cases not yet assigned (DRAFT or SME_APPROVED)
          .filter(tc => !tc.assignedTo && ['DRAFT', 'SME_APPROVED', 'PENDING_SME_REVIEW'].includes(tc.status));
        setAllCases(items);
      })
      .catch(() => setAllCases([]))
      .finally(() => setCasesLoading(false));
  }, [selectedProject, selectedModule]);

  useEffect(() => { if (!loading) loadCases(); }, [loadCases, loading]);

  // Filtered display
  const displayed = allCases.filter(tc => {
    const q = search.toLowerCase();
    const matchQ  = !search || tc.title?.toLowerCase().includes(q) || tc.code?.toLowerCase().includes(q);
    const matchSt = !statusFilter || tc.status === statusFilter;
    return matchQ && matchSt;
  });

  // Checkbox logic
  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === displayed.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map(tc => tc.id)));
    }
  };

  const selectByModule = (moduleName) => {
    const ids = allCases.filter(tc => tc.module?.name === moduleName).map(tc => tc.id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  // Group unassigned by module for quick-select sidebar
  const moduleGroups = allCases.reduce((acc, tc) => {
    const m = tc.module?.name || 'No Module';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const selectedCases = allCases.filter(tc => selectedIds.has(tc.id));

  const handleAssign = async () => {
    if (!selectedTester || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await testCaseApi.assign({
        testCaseIds: [...selectedIds],
        assignedToUserId: selectedTester,
        ...(dueDate ? { dueDate } : {}),
      });
      const testerName = testers.find(t => t.id === selectedTester)?.fullName;
      showAlert('success', `✓ ${selectedIds.size} case(s) assigned to ${testerName}. They will appear in the tester's dashboard immediately.`);
      setShowConfirm(false);
      setSelectedIds(new Set());
      loadCases(); // refresh list
    } catch (err) {
      setShowConfirm(false);
      showAlert('error', err.response?.data?.message || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  const tester = testers.find(t => t.id === selectedTester);

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Assign Test Cases</h1>
          <p className="page-subtitle">
            Select test cases → choose a tester → assign. Cases appear on the tester's dashboard instantly.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadCases} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16 }}>
          {alert.msg}
          <button onClick={() => setAlert(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* ── Flow steps banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        marginBottom: 20, background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      }}>
        {[
          { n: '1', label: 'Import test cases', sub: 'Excel or manual create', done: true },
          { n: '2', label: 'Select cases + tester', sub: 'Check boxes below', active: true },
          { n: '3', label: 'Click Assign', sub: 'Status → ASSIGNED', active: true },
          { n: '4', label: 'Tester sees cases', sub: 'On their dashboard', done: false },
          { n: '5', label: 'Tester updates status', sub: 'Pass / Fail / Retest', done: false },
        ].map((step, i, arr) => (
          <div key={step.n} style={{
            flex: 1, padding: '12px 14px', textAlign: 'center',
            borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            background: step.active ? 'rgba(88,166,255,0.08)' : 'transparent',
            borderTop: step.active ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', margin: '0 auto 6px',
              background: step.active ? 'var(--accent)' : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
              color: step.active ? '#0d1117' : 'var(--text3)',
            }}>{step.n}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: step.active ? 'var(--accent)' : 'var(--text1)' }}>{step.label}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{step.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>

        {/* ── LEFT: Config panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Filters */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text1)' }}>
              <Filter size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Filter Cases
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Project</label>
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Module</label>
              {modules.length > 0 ? (
                <select value={selectedModule} onChange={e => setSelectedModule(e.target.value)}>
                  <option value="">All Modules</option>
                  {modules.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              ) : (
                <input value={selectedModule} onChange={e => setSelectedModule(e.target.value)}
                  placeholder="Module name (Claims, BN…)" />
              )}
            </div>
          </div>

          {/* Module quick-select */}
          {Object.keys(moduleGroups).length > 0 && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: 'var(--text1)' }}>
                <Layers size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Quick Select by Module
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(moduleGroups).sort().map(([m, cnt]) => (
                  <button key={m} onClick={() => selectByModule(m)} style={{
                    background: 'var(--bg-raised)', border: '1px solid var(--border)',
                    borderRadius: 7, padding: '7px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.12s', fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{ fontSize: 12, color: 'var(--purple)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{m}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>+{cnt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assign settings */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text1)' }}>
              <User size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Assign To
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Select Tester *</label>
              <select value={selectedTester} onChange={e => setSelectedTester(e.target.value)}>
                <option value="">— Choose tester —</option>
                {testers.filter(t => t.active).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}{t.team ? ` (${t.team})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Due Date (optional)</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>

            {tester && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(63,185,80,0.07)', border: '1px solid rgba(63,185,80,0.2)',
                marginBottom: 14,
              }}>
                <div style={{ fontWeight: 700, color: '#3fb950', fontSize: 13 }}>{tester.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{tester.email}</div>
                {tester.team && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>Team: {tester.team}</div>}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!selectedTester || selectedIds.size === 0 || saving}
              onClick={() => setShowConfirm(true)}
            >
              <Send size={14} />
              Assign {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Cases'}
            </button>

            {selectedIds.size === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
                Check cases in the table to select them
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cases table ── */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table toolbar */}
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
                  Unassigned Test Cases
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>
                  {allCases.length} total · {selectedIds.size} selected
                </div>
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search…" style={{ paddingLeft: 28, width: 180, fontSize: 12, height: 32 }} />
                </div>
                {/* Status filter */}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  style={{ fontSize: 12, height: 32, width: 160 }}>
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_SME_REVIEW">Pending SME</option>
                  <option value="SME_APPROVED">SME Approved</option>
                </select>
                {/* Clear */}
                {(search || statusFilter) && (
                  <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => { setSearch(''); setStatusFilter(''); }}>
                    <X size={11} /> Clear
                  </button>
                )}
              </div>
            </div>

            {casesLoading ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>Loading cases…</div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text3)' }}>
                <ClipboardList size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                  No unassigned cases found
                </div>
                <div style={{ fontSize: 12 }}>
                  {allCases.length === 0
                    ? 'Import test cases first, then come here to assign them'
                    : 'All cases are already assigned or try changing the filter'}
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer',
                          color: selectedIds.size === displayed.length && displayed.length > 0 ? 'var(--accent)' : 'var(--text3)',
                          display: 'flex', alignItems: 'center' }}>
                          {selectedIds.size === displayed.length && displayed.length > 0
                            ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </th>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Module</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(tc => {
                      const checked = selectedIds.has(tc.id);
                      return (
                        <tr key={tc.id}
                          style={{ cursor: 'pointer', background: checked ? 'rgba(88,166,255,0.05)' : undefined }}
                          onClick={() => toggleOne(tc.id)}>
                          <td onClick={e => { e.stopPropagation(); toggleOne(tc.id); }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer',
                              color: checked ? 'var(--accent)' : 'var(--text3)', display: 'flex', alignItems: 'center' }}>
                              {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {tc.code}
                          </td>
                          <td style={{ maxWidth: 280, fontSize: 13 }}>{tc.title}</td>
                          <td>
                            {tc.module?.name
                              ? <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                                  background: 'rgba(188,140,255,0.1)', color: 'var(--purple)',
                                  padding: '2px 8px', borderRadius: 4 }}>{tc.module.name}</span>
                              : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
                              color: PRIORITY_COLOR[tc.priority] || '#8b949e' }}>
                              {tc.priority}
                            </span>
                          </td>
                          <td><StatusBadge status={tc.status} /></td>
                          <td style={{ fontSize: 12, color: 'var(--text2)' }}>{tc.project?.name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirm && tester && (
        <ConfirmModal
          selected={selectedCases}
          tester={tester}
          dueDate={dueDate}
          saving={saving}
          onConfirm={handleAssign}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
