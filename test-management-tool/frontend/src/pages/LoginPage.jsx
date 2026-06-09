import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Eye, EyeOff, Shield, Sun, Moon } from 'lucide-react';
import './LoginPage.css';

/* Demo accounts — colours adapt per theme */
const DEMO_ACCOUNTS = [
  { role: 'MANAGER', email: 'manager@testmgmt.io', password: 'manager123',
    lightColor: '#e0437a', darkColor: '#a78bfa', initial: 'M' },
  { role: 'TESTER',  email: 'tester@testmgmt.io',  password: 'tester123',
    lightColor: '#2e7d32', darkColor: '#10b981', initial: 'T' },
  { role: 'SME',     email: 'sme@testmgmt.io',      password: 'sme12345',
    lightColor: '#ad1457', darkColor: '#22d3ee', initial: 'S' },
  { role: 'ADMIN',   email: 'admin@testmgmt.io',    password: 'admin123',
    lightColor: '#c62828', darkColor: '#f87171', initial: 'A' },
];

export default function LoginPage() {
  const { login }              = useAuth();
  const { isDark, toggle }     = useTheme();
  const navigate               = useNavigate();
  const [form,    setForm]     = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]  = useState(false);
  const [error,   setError]    = useState('');
  const [loading, setLoading]  = useState(false);
  const [demoLoading, setDemoLoading] = useState('');

  const doLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      await login(String(email), String(password));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
      setDemoLoading('');
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); doLogin(form.email, form.password); };

  const handleDemo = async (acc) => {
    setDemoLoading(acc.role);
    setError('');
    try {
      await login(acc.email, acc.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Demo login failed');
    } finally { setDemoLoading(''); }
  };

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-bg">
        <div className="grid-overlay" />
      </div>

      {/* Day / Night toggle — top-right corner */}
      <button className="login-theme-toggle" onClick={toggle}>
        {isDark
          ? <Sun  size={14} style={{ color: '#f59e0b' }} />
          : <Moon size={14} style={{ color: '#6b2d45' }} />}
        {isDark ? 'Light' : 'Dark'}
      </button>

      {/* Login card */}
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-icon">TM</div>
          <h1 className="login-title">TestMgmt Pro</h1>
          <p className="login-sub">Testing Lifecycle Management Platform</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="you@testmgmt.io"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>Password</label>
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              style={{
                position: 'absolute', right: 12, top: 34,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 2, display: 'flex',
              }}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : <><Shield size={15} /> Sign In</>}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="demo-section">
          <div className="demo-divider">
            <span>DEMO ACCOUNTS</span>
          </div>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map(acc => {
              const color = isDark ? acc.darkColor : acc.lightColor;
              return (
                <button
                  key={acc.role}
                  className="demo-btn"
                  disabled={!!demoLoading || loading}
                  onClick={() => handleDemo(acc)}
                  style={{ '--demo-color': color }}
                >
                  <span
                    className="demo-avatar"
                    style={{
                      background: `${color}22`,
                      color,
                    }}
                  >
                    {demoLoading === acc.role ? '…' : acc.initial}
                  </span>
                  <span className="demo-info">
                    <span className="demo-role" style={{ color }}>{acc.role}</span>
                    <span className="demo-email">{acc.email}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="login-footer">
          Spring Boot 3.2 · React 18 · PostgreSQL 15
        </div>
      </div>
    </div>
  );
}
