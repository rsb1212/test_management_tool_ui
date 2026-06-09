import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, ExternalLink, X } from 'lucide-react';
import { notificationApi } from '../api';
import { useNavigate } from 'react-router-dom';

const TYPE_ICON = {
  ASSIGNED:    { icon: '', color: '#58a6ff' },
  REASSIGNED:  { icon: '🔄', color: '#d29922' },
  DUE_SOON:    { icon: '', color: '#d29922' },
  OVERDUE:     { icon: '', color: '#f85149' },
  DEFECT_RAISED:{ icon: '', color: '#f85149' },
  SME_APPROVED:{ icon: '✅', color: '#3fb950' },
  SME_REJECTED:{ icon: '❌', color: '#f85149' },
  UAT_READY:   { icon: '', color: '#bc8cff' },
  SIGN_OFF:    { icon: '', color: '#3fb950' },
};

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
}

export default function NotificationBell() {
  const [open,          setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.list(),
        notificationApi.unreadCount(),
      ]);
      setNotifications(listRes.data.data || []);
      setUnread(countRes.data.data?.count || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) { console.error(err); }
  };

  const handleClick = (n) => {
    if (!n.isRead) handleMarkRead(n.id, { stopPropagation: () => {} });
    if (n.entityType === 'TEST_CASE') navigate('/my-cases');
    else if (n.entityType === 'DEFECT') navigate('/defects');
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        style={{
          position: 'relative', background: 'none', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
          color: open ? 'var(--accent)' : 'var(--text2)',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.12s',
        }}
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: '#f85149', color: '#fff',
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
            borderRadius: '50%', width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 480,
          background: 'var(--bg-card)', border: '1px solid var(--border2)',
          borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          zIndex: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)' }}>
              Notifications {unread > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, background: '#f85149',
                  color: '#fff', borderRadius: 8, padding: '1px 6px',
                  fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {unread} new
                </span>
              )}
            </span>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_ICON[n.type] || { icon: '🔔', color: 'var(--accent)' };
                return (
                  <div key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                      background: n.isRead ? 'transparent' : 'rgba(88,166,255,0.05)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(88,166,255,0.05)'}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13,
                        color: 'var(--text1)', marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text3)',
                        fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button onClick={(e) => handleMarkRead(n.id, e)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text3)', padding: 2, flexShrink: 0,
                      }} title="Mark read">
                        <X size={13} />
                      </button>
                    )}
                    {!n.isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: meta.color, flexShrink: 0, marginTop: 5,
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
