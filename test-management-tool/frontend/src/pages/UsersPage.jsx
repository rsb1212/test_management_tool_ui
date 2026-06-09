import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  UserPlus, Pencil, Lock, UserCheck, UserX,
  Shield, X, Check, Search, RefreshCw
} from 'lucide-react';

const ROLES    = ['TESTER','VIEWER','SME','MANAGER','ADMIN'];
const MGR_ROLES = ['TESTER','VIEWER'];  // managers can only assign these

const roleColor = {
  ADMIN:   { bg:'rgba(231,76,60,0.15)',   text:'#e74c3c' },
  MANAGER: { bg:'rgba(52,152,219,0.15)',  text:'#3498db' },
  SME:     { bg:'rgba(155,89,182,0.15)', text:'#9b59b6' },
  TESTER:  { bg:'rgba(39,174,96,0.15)',  text:'#27ae60' },
  VIEWER:  { bg:'rgba(149,165,166,0.15)',text:'#95a5a6' },
};

function RoleBadge({ role }) {
  const c = roleColor[role] || { bg:'rgba(100,100,100,0.15)', text:'#aaa' };
  return (
    <span style={{
      padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
      fontFamily:'var(--font-mono)', textTransform:'uppercase',
      background: c.bg, color: c.text,
    }}>{role}</span>
  );
}

/* ── Create / Edit User Modal ──────────────────────────────── */
function UserFormModal({ editUser, allowedRoles, onSave, onClose }) {
  const isEdit = !!editUser;
  const [form, setForm] = useState({
    username:  editUser?.username  || '',
    email:     editUser?.email     || '',
    fullName:  editUser?.fullName  || '',
    team:      editUser?.team      || '',
    role:      editUser?.role      || 'TESTER',
    password:  '',
    active:    editUser?.active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await userApi.update(editUser.id, {
          fullName: form.fullName,
          team:     form.team,
          role:     form.role,
          active:   form.active,
        });
      } else {
        await userApi.create({
          username: form.username,
          email:    form.email,
          fullName: form.fullName,
          team:     form.team,
          role:     form.role,
          password: form.password,
        });
      }
      onSave(isEdit ? 'User updated successfully' : `Tester "${form.fullName}" created successfully`);
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? `Edit — ${editUser.fullName}` : 'Create New Tester'}
          </span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

            {/* Full name */}
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label>Full Name *</label>
              <input value={form.fullName} onChange={e => f('fullName',e.target.value)}
                placeholder="e.g. Priya Sharma" required autoFocus />
            </div>

            {/* Username — only for create */}
            {!isEdit && (
              <div className="form-group">
                <label>Username *</label>
                <input value={form.username} onChange={e => f('username',e.target.value)}
                  placeholder="e.g. priya.sharma" required />
              </div>
            )}

            {/* Email — only for create */}
            {!isEdit && (
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={form.email}
                  onChange={e => f('email',e.target.value)}
                  placeholder="priya@company.com" required />
              </div>
            )}

            {/* Password — only for create */}
            {!isEdit && (
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label>Initial Password *</label>
                <input type="password" value={form.password}
                  onChange={e => f('password',e.target.value)}
                  placeholder="Min 8 characters" required minLength={8} />
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  The user can change this after logging in.
                </div>
              </div>
            )}

            {/* Team */}
            <div className="form-group">
              <label>Team</label>
              <input value={form.team} onChange={e => f('team',e.target.value)}
                placeholder="e.g. QA" />
            </div>

            {/* Role */}
            <div className="form-group">
              <label>Role *</label>
              <select value={form.role} onChange={e => f('role',e.target.value)}>
                {allowedRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {allowedRoles.length === 2 && (
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  Contact an Admin to assign SME / Manager roles.
                </div>
              )}
            </div>

            {/* Active toggle — only for edit */}
            {isEdit && (
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label>Status</label>
                <div style={{ display:'flex', gap:10 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => f('active', val)}
                      className={`btn ${form.active === val ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                      {val ? <><UserCheck size={13}/> Active</> : <><UserX size={13}/> Inactive</>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit
                ? <><Check size={14}/> Save Changes</>
                : <><UserPlus size={14}/> Create User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Reset Password Modal ──────────────────────────────────── */
function ResetPasswordModal({ user, onSave, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await userApi.resetPassword(user.id, { newPassword: password });
      onSave(`Password reset for ${user.fullName}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-header">
          <div>
            <span className="modal-title">Reset Password</span>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
              For: {user.fullName} ({user.email})
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>New Password *</label>
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters" required autoFocus />
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" required />
          </div>

          <div className="info-box" style={{
            borderLeft:'3px solid var(--amber)', background:'rgba(255,215,64,0.07)',
            padding:'10px 14px', borderRadius:'0 8px 8px 0', fontSize:12,
            color:'var(--text2)', marginBottom:12
          }}>
            <strong style={{ color:'var(--amber)' }}>Note:</strong> The user will need to use
            this new password on their next login.
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Resetting…' : <><Lock size={14}/> Reset Password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Users Page
═══════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin   = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER' || isAdmin;

  const allowedRoles = isAdmin ? ROLES : MGR_ROLES;

  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showInactive,setShowInactive]= useState(false);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState('');
  const [alert,       setAlert]       = useState(null);

  // Modals
  const [showCreate,     setShowCreate]     = useState(false);
  const [editUser,       setEditUser]       = useState(null);
  const [resetPwdUser,   setResetPwdUser]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    userApi.list(!showInactive)
      .then(r => setUsers(r.data.data || []))
      .catch(() => showAlert('error', 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [showInactive]);

  useEffect(() => { load(); }, [showInactive]);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleToggleActive = async (u) => {
    const action = u.active ? 'deactivate' : 'activate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.fullName}?`)) return;
    try {
      u.active ? await userApi.deactivate(u.id) : await userApi.activate(u.id);
      showAlert('success', `${u.fullName} ${u.active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err) { showAlert('error', err.response?.data?.message || 'Failed'); }
  };

  // Filter users
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // Stats
  const activeCount = users.filter(u => u.active).length;
  const byRole = ROLES.map(r => ({
    role: r, count: users.filter(u => u.role === r && u.active).length
  })).filter(r => r.count > 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{activeCount} active users · {users.length} total</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary" onClick={load} title="Refresh">
            <RefreshCw size={15} />
          </button>
          {isManager && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <UserPlus size={16} /> New Tester
            </button>
          )}
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.msg}
          <button onClick={() => setAlert(null)}
            style={{ float:'right', background:'none', border:'none', cursor:'pointer', color:'inherit' }}>×</button>
        </div>
      )}

      {/* Role summary pills */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {byRole.map(r => (
          <button key={r.role}
            onClick={() => setFilterRole(filterRole === r.role ? '' : r.role)}
            style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'5px 12px', borderRadius:20, border:'1px solid',
              cursor:'pointer', fontSize:12, fontWeight:700,
              fontFamily:'var(--font-mono)', textTransform:'uppercase',
              background: filterRole === r.role
                ? roleColor[r.role]?.bg : 'var(--bg-raised)',
              color: roleColor[r.role]?.text || 'var(--text2)',
              borderColor: filterRole === r.role
                ? (roleColor[r.role]?.text || 'var(--border)') : 'var(--border)',
            }}>
            {r.role} <span style={{ opacity:0.7 }}>({r.count})</span>
          </button>
        ))}
        {filterRole && (
          <button className="btn btn-secondary btn-sm"
            onClick={() => setFilterRole('')}>
            Clear filter
          </button>
        )}
      </div>

      {/* Search + toggle inactive */}
      <div style={{ display:'flex', gap:12, marginBottom:20, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%',
            transform:'translateY(-50%)', color:'var(--text3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, username…"
            style={{ paddingLeft:32 }}
          />
        </div>
        <label style={{
          display:'flex', alignItems:'center', gap:7, cursor:'pointer',
          fontSize:13, color:'var(--text2)', margin:0,
          textTransform:'none', letterSpacing:0,
        }}>
          <input type="checkbox" checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)} />
          Show inactive users
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <div className="empty-text">No users found</div>
          <div className="empty-sub">
            {search ? `No results for "${search}"` : 'Create a new tester to get started'}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Team</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:34, height:34, borderRadius:'50%',
                        background: roleColor[u.role]?.bg || 'var(--bg-raised)',
                        border:`1px solid ${roleColor[u.role]?.text || 'var(--border)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700,
                        color: roleColor[u.role]?.text || 'var(--text2)',
                        flexShrink:0,
                      }}>
                        {(u.fullName || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text1)' }}>
                          {u.fullName || '—'}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text3)',
                          fontFamily:'var(--font-mono)' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text2)' }}>
                    {u.username}
                  </td>
                  <td style={{ fontSize:12, color:'var(--text2)' }}>{u.team || '—'}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span style={{
                      fontSize:11, fontFamily:'var(--font-mono)', fontWeight:700,
                      color: u.active ? '#00e676' : '#8899aa',
                    }}>
                      {u.active ? '● ACTIVE' : '○ INACTIVE'}
                    </span>
                  </td>
                  <td style={{ fontSize:11, color:'var(--text3)' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      {/* Edit */}
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setEditUser(u)} title="Edit user">
                        <Pencil size={13} />
                      </button>

                      {/* Reset Password */}
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => setResetPwdUser(u)} title="Reset password">
                        <Lock size={13} />
                      </button>

                      {/* Activate / Deactivate */}
                      {/* Can't deactivate yourself */}
                      {u.email !== currentUser?.email && (
                        <button
                          className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-secondary'}`}
                          onClick={() => handleToggleActive(u)}
                          title={u.active ? 'Deactivate' : 'Activate'}>
                          {u.active ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <UserFormModal
          editUser={null}
          allowedRoles={allowedRoles}
          onSave={(msg) => { setShowCreate(false); showAlert('success', msg); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editUser && (
        <UserFormModal
          editUser={editUser}
          allowedRoles={allowedRoles}
          onSave={(msg) => { setEditUser(null); showAlert('success', msg); load(); }}
          onClose={() => setEditUser(null)}
        />
      )}

      {resetPwdUser && (
        <ResetPasswordModal
          user={resetPwdUser}
          onSave={(msg) => { setResetPwdUser(null); showAlert('success', msg); }}
          onClose={() => setResetPwdUser(null)}
        />
      )}
    </div>
  );
}
