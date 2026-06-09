import { useState, useEffect } from 'react';
import { testCaseApi, projectApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import { CheckCheck, UserCheck, MessageSquare, RotateCcw } from 'lucide-react';

export default function WorkflowPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [smeQueue, setSmeQueue] = useState([]);
  const [approvedCases, setApprovedCases] = useState([]);
  const [testers, setTesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [selected, setSelected] = useState([]);
  const [activeTab, setActiveTab] = useState(user?.role === 'SME' ? 'sme' : 'assign');

  // Review modal
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  // Assign modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignTo, setAssignTo] = useState('');

  // Sign-off
  const [signOffNote, setSignOffNote] = useState('');

  useEffect(() => {
    projectApi.list().then(r => {
      setProjects(r.data.data);
      if (r.data.data.length > 0) setSelectedProject(r.data.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    const canAccessSmeQueue = ['SME', 'MANAGER', 'ADMIN'].includes(user?.role);
    const calls = [
      canAccessSmeQueue
        ? testCaseApi.smeQueue(selectedProject)
        : Promise.resolve({ data: { data: [] } }),
      testCaseApi.list({ projectId: selectedProject, status: 'SME_APPROVED', size: 100 }),
    ];
    Promise.all(calls).then(([queueR, approvedR]) => {
      setSmeQueue(queueR.data.data || []);
      setApprovedCases(approvedR.data.data?.content || []);
    }).catch(() => setAlert({ type:'error', msg:'Failed to load workflow data' }))
      .finally(() => setLoading(false));
  }, [selectedProject, user?.role]);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleBulkApprove = async () => {
    if (selected.length === 0) return;
    try {
      await testCaseApi.bulkApprove({ testCaseIds: selected, comment: 'Bulk approved' });
      showAlert('success', `${selected.length} case(s) approved`);
      setSelected([]);
      setSmeQueue(q => q.filter(tc => !selected.includes(tc.id)));
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Bulk approve failed');
    }
  };

  const handleRequestChanges = async () => {
    if (!reviewModal || !reviewNote) return;
    try {
      await testCaseApi.requestChanges(reviewModal.id, { comment: reviewNote });
      showAlert('success', 'Changes requested — case reverted to DRAFT');
      setSmeQueue(q => q.filter(tc => tc.id !== reviewModal.id));
      setReviewModal(null);
      setReviewNote('');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Request changes failed');
    }
  };

  const handleAssign = async () => {
    if (selected.length === 0 || !assignTo) return;
    try {
      await testCaseApi.assign({ testCaseIds: selected, assignedToUserId: assignTo });
      showAlert('success', `${selected.length} case(s) assigned`);
      setSelected([]);
      setAssignModal(false);
      setApprovedCases(cs => cs.filter(tc => !selected.includes(tc.id)));
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleSignOff = async () => {
    if (!selectedProject) return;
    if (!window.confirm('Sign off all PASSED cases in this project?')) return;
    try {
      await testCaseApi.signOff(selectedProject, { notes: signOffNote });
      showAlert('success', 'Project signed off successfully');
      setSignOffNote('');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Sign-off failed');
    }
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const toggleAll = (cases) => {
    const allIds = cases.map(tc => tc.id);
    setSelected(s => s.length === allIds.length ? [] : allIds);
  };

  const isSME = user?.role === 'SME';
  const isManager = ['MANAGER', 'ADMIN'].includes(user?.role);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflow</h1>
          <p className="page-subtitle">SME Review & Manager Assignment Pipeline</p>
        </div>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width:220 }}>
          <option value="">Select project…</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button onClick={() => setAlert(null)} style={{ float:'right', background:'none', border:'none', cursor:'pointer', color:'inherit' }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:24 }}>
        {isSME && (
          <TabBtn active={activeTab === 'sme'} onClick={() => setActiveTab('sme')}>
            SME Review Queue ({smeQueue.length})
          </TabBtn>
        )}
        {isManager && (
          <TabBtn active={activeTab === 'assign'} onClick={() => setActiveTab('assign')}>
            Assign to Testers ({approvedCases.length})
          </TabBtn>
        )}
        {isSME && (
          <TabBtn active={activeTab === 'signoff'} onClick={() => setActiveTab('signoff')}>
            Sign-Off
          </TabBtn>
        )}
      </div>

      {loading && <div className="loading">Loading workflow data…</div>}

      {/* SME Review Queue */}
      {!loading && activeTab === 'sme' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {selected.length > 0 && (
              <button className="btn btn-primary" onClick={handleBulkApprove}>
                <CheckCheck size={15} /> Approve Selected ({selected.length})
              </button>
            )}
          </div>

          {smeQueue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-text">Review queue is empty</div>
              <div className="empty-sub">All cases reviewed — nothing pending</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width:36 }}>
                      <input type="checkbox"
                        checked={selected.length === smeQueue.length && smeQueue.length > 0}
                        onChange={() => toggleAll(smeQueue)} />
                    </th>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {smeQueue.map(tc => (
                    <tr key={tc.id}>
                      <td>
                        <input type="checkbox" checked={selected.includes(tc.id)}
                          onChange={() => toggleSelect(tc.id)} />
                      </td>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)' }}>{tc.code}</td>
                      <td style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tc.title}</td>
                      <td style={{ fontSize:12 }}>{tc.priority}</td>
                      <td>
                        <span style={{
                          fontSize:11, padding:'2px 7px', borderRadius:20, fontWeight:700,
                          background:'rgba(255,215,64,0.15)', color:'#ffd740', fontFamily:'var(--font-mono)'
                        }}>
                          {tc.status.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-2)' }}>
                        {tc.createdBy?.fullName || tc.createdBy?.username || '—'}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={async () => {
                              try {
                                await testCaseApi.bulkApprove({ testCaseIds:[tc.id], comment:'Approved' });
                                showAlert('success', `${tc.code} approved`);
                                setSmeQueue(q => q.filter(x => x.id !== tc.id));
                              } catch(e) { showAlert('error', 'Approve failed'); }
                            }}>
                            <CheckCheck size={13} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => { setReviewModal(tc); setReviewNote(''); }}>
                            <RotateCcw size={13} /> Changes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manager Assignment */}
      {!loading && activeTab === 'assign' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {selected.length > 0 && (
              <button className="btn btn-primary" onClick={() => setAssignModal(true)}>
                <UserCheck size={15} /> Assign Selected ({selected.length})
              </button>
            )}
          </div>

          {approvedCases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-text">No SME-approved cases to assign</div>
              <div className="empty-sub">Cases must be approved by SME before assignment</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width:36 }}>
                      <input type="checkbox"
                        checked={selected.length === approvedCases.length && approvedCases.length > 0}
                        onChange={() => toggleAll(approvedCases)} />
                    </th>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Module</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedCases.map(tc => (
                    <tr key={tc.id}>
                      <td>
                        <input type="checkbox" checked={selected.includes(tc.id)}
                          onChange={() => toggleSelect(tc.id)} />
                      </td>
                      <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)' }}>{tc.code}</td>
                      <td style={{ maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tc.title}</td>
                      <td style={{ fontSize:12 }}>{tc.priority}</td>
                      <td style={{ fontSize:12, color:'var(--text-3)' }}>{tc.module?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sign Off Tab */}
      {!loading && activeTab === 'signoff' && (
        <div style={{ maxWidth:500 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Project Sign-Off</span>
            </div>
            <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:16, lineHeight:1.7 }}>
              Sign off marks all <strong style={{ color:'var(--green)' }}>PASSED</strong> test cases
              in the selected project as <strong style={{ color:'var(--accent)' }}>SIGNED_OFF</strong>.
              This action records the SME's approval for release.
            </p>
            <div className="form-group">
              <label>Sign-Off Notes (optional)</label>
              <textarea value={signOffNote} onChange={e => setSignOffNote(e.target.value)}
                placeholder="e.g. All critical paths verified. Ready for UAT." rows={3} />
            </div>
            <button className="btn btn-primary" onClick={handleSignOff} disabled={!selectedProject}>
              <CheckCheck size={15} /> Record Sign-Off
            </button>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Request Changes</span>
              <button className="modal-close" onClick={() => setReviewModal(null)}>×</button>
            </div>
            <p style={{ color:'var(--text-2)', fontSize:13, marginBottom:16 }}>
              Case <strong style={{ color:'var(--accent)' }}>{reviewModal.code}</strong>: {reviewModal.title}
            </p>
            <div className="form-group">
              <label>Feedback / Changes Required *</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                placeholder="Describe the changes needed…" rows={4} autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRequestChanges} disabled={!reviewNote.trim()}>
                <RotateCcw size={14} /> Request Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAssignModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Assign {selected.length} Case(s)</span>
              <button className="modal-close" onClick={() => setAssignModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Assign To (Tester User ID) *</label>
              <input value={assignTo} onChange={e => setAssignTo(e.target.value)}
                placeholder="Paste tester UUID here" autoFocus />
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>
                Tip: Use the /api/v1/users endpoint to list users, or integrate a user picker.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={!assignTo.trim()}>
                <UserCheck size={14} /> Assign Cases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background:'none', border:'none', borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      color: active ? 'var(--accent)' : 'var(--text-3)',
      padding:'10px 20px', cursor:'pointer', fontSize:14, fontWeight:600,
      fontFamily:'var(--font-sans)', transition:'all 0.15s', marginBottom:-1,
    }}>
      {children}
    </button>
  );
}
