import { useState, useEffect, useCallback } from 'react';
import { reportApi, projectApi, testCaseApi, defectApi } from '../api';
import { useAuth } from '../hooks/useAuth';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { RefreshCw, ChevronDown, ChevronRight, Download, CheckCircle2,
  XCircle, Clock, AlertTriangle, BarChart2, Activity, Shield } from 'lucide-react';

const S = {
  Pass:        { color: '#00e676', bg: 'rgba(0,230,118,0.12)'   },
  Fail:        { color: '#ff5252', bg: 'rgba(255,82,82,0.12)'   },
  InProgress:  { color: '#ffb74d', bg: 'rgba(255,183,77,0.12)'  },
  NA:          { color: '#ffd740', bg: 'rgba(255,215,64,0.12)'  },
  NotReleased: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  Defect:      { color: '#ff9800', bg: 'rgba(255,152,0,0.12)'   },
  Assigned:    { color: '#00d4ff', bg: 'rgba(0,212,255,0.12)'   },
  Draft:       { color: '#8899aa', bg: 'rgba(136,153,170,0.12)' },
};

function StatTile({ label, value, color, bg, icon: Icon, subtitle }) {
  return (
    <div style={{
      background: bg || 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 14px', textAlign: 'center',
      borderTop: `3px solid ${color || 'var(--accent)'}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
    >
      {Icon && <Icon size={16} style={{ color, marginBottom: 6, opacity: 0.8 }} />}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24,
        fontWeight: 700, color: color || 'var(--accent)', lineHeight: 1 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      {subtitle && <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function ProgressBar({ value, color = 'var(--accent)', label }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</span>
          <span style={{ fontSize: 11, color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 8, background: 'var(--bg-deep)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function ProjectTree({ projects, selectedId, onSelect }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id, e) => { e.stopPropagation(); setExpanded(p => ({ ...p, [id]: !p[id] })); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {projects.map(p => (
        <div key={p.id}>
          <div onClick={() => onSelect(p.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
            background: selectedId === p.id ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${selectedId === p.id ? 'var(--accent)' : 'transparent'}`,
            fontSize: 13, color: selectedId === p.id ? 'var(--accent)' : 'var(--text1)',
            transition: 'all 0.12s',
          }}>
            <span onClick={e => p.subProjects?.length > 0 ? toggle(p.id, e) : null}
              style={{ color: 'var(--text3)', display: 'flex', flexShrink: 0 }}>
              {p.subProjects?.length > 0
                ? (expanded[p.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
                : <span style={{ width: 12 }} />}
            </span>
            <span style={{ fontWeight: p.parentProjectId ? 400 : 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </div>
          {expanded[p.id] && p.subProjects?.length > 0 && (
            <div style={{ marginLeft: 18, borderLeft: '2px solid var(--border)', paddingLeft: 4 }}>
              {p.subProjects.map(sub => (
                <div key={sub.id} onClick={() => onSelect(sub.id)} style={{
                  padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                  background: selectedId === sub.id ? 'var(--accent-dim)' : 'transparent',
                  color: selectedId === sub.id ? 'var(--accent)' : 'var(--text2)',
                  marginBottom: 1, transition: 'all 0.12s',
                }}>{sub.name}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dashboard,       setDashboard]       = useState(null);
  const [modules,         setModules]         = useState([]);
  const [defects,         setDefects]         = useState([]);
  const [loading,         setLoading]         = useState(false);

  const isSME     = user?.role === 'SME';
  const isManager = ['MANAGER', 'ADMIN'].includes(user?.role);
  const isTester  = user?.role === 'TESTER';

  // Load project list on mount
  useEffect(() => {
    projectApi.list().then(r => {
      const all = r.data.data || [];
      setProjects(all);
      if (all.length > 0) {
        // Auto-select first sub-project if available, otherwise first root project
        const first = all[0].subProjects?.length > 0 ? all[0].subProjects[0] : all[0];
        setSelectedProject(first.id);
      }
    }).catch(err => console.error(err));
  }, []);

  // Load dashboard data whenever selectedProject changes
  const load = useCallback(() => {
    if (!selectedProject) return;
    setLoading(true);

    const calls = [
      reportApi.dashboard(selectedProject),
      reportApi.moduleBreakdown(selectedProject),
      defectApi.list(selectedProject),
    ];

    Promise.all(calls)
      .then(([dr, mr, dfr]) => {
        setDashboard(dr.data.data);
        setModules(mr.data.data || []);
        setDefects(dfr.data.data || []);
      })
      .catch(err => {
        console.error(err);
        setDashboard(null);
        setModules([]);
        setDefects([]);
      })
      .finally(() => setLoading(false));
  }, [selectedProject]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!selectedProject) return;
    testCaseApi.exportTestCases(selectedProject).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-cases-${selectedProject}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch(err => console.error(err));
  };

  const d = dashboard;

  // ── Derived metrics ──────────────────────────────────────────
  const totalExecuted   = d ? Number(d.passed) + Number(d.failed) + Number(d.defectRaised) : 0;
  const executionPct    = d && d.totalTestCases > 0
    ? Math.round((totalExecuted / d.totalTestCases) * 100) : 0;
  const passPct         = d?.passRate ?? 0;
  const openDefects     = defects.filter(df => ['NEW','OPEN','IN_PROGRESS'].includes(df.status)).length;
  const criticalDefects = defects.filter(df => df.severity === 'CRITICAL').length;

  // ── Chart data ───────────────────────────────────────────────
  const pieData = d ? [
    { name: 'Pass',         value: Number(d.passed),       color: S.Pass.color },
    { name: 'Fail',         value: Number(d.failed),       color: S.Fail.color },
    { name: 'In Progress',  value: Number(d.inProgress),   color: S.InProgress.color },
    { name: 'NA',           value: Number(d.naCount),      color: S.NA.color },
    { name: 'Not Released', value: Number(d.notReleased),  color: S.NotReleased.color },
    { name: 'Defect',       value: Number(d.defectRaised), color: S.Defect.color },
    { name: 'Assigned',     value: Number(d.assigned),     color: S.Assigned.color },
    { name: 'Draft',        value: Number(d.draft),        color: S.Draft.color },
  ].filter(x => x.value > 0) : [];

  const barData = modules.slice(0, 14).map(m => ({
    name:      m.moduleName.length > 16 ? m.moduleName.slice(0, 14) + '…' : m.moduleName,
    Pass:      Number(m.passed),
    Fail:      Number(m.failed),
    'In Prog': Number(m.inProgress),
    NA:        Number(m.naCount),
    'Not Rel': Number(m.notReleased),
  }));

  // ── SME-specific dashboard title/subtitle ────────────────────
  const pageTitle    = isSME ? 'SME Review Dashboard' : isManager ? 'Manager Dashboard' : 'Project Status';
  const pageSubtitle = isSME ? 'Project review metrics and test case quality overview' :
                       isTester ? 'Your project execution status' : 'Real-time project test metrics';

  return (
    <div style={{ display: 'flex', gap: 20 }}>

      {/* ── Project tree sidebar ─────────────────────── */}
      <div style={{ width: 210, flexShrink: 0 }}>
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title" style={{ fontSize: 11 }}>PROJECTS</span>
          </div>
          {projects.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No projects</div>
            : <ProjectTree projects={projects} selectedId={selectedProject} onSelect={setSelectedProject} />
          }
        </div>
      </div>

      {/* ── Main content ─────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Page header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">
              {d ? `📁 ${d.projectName}` : pageSubtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(isManager || isTester) && (
              <button className="btn btn-secondary" onClick={handleExport}
                disabled={!selectedProject} title="Download all test cases as Excel">
                <Download size={14} /> Export Excel
              </button>
            )}
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : '' }} />
              Refresh
            </button>
          </div>
        </div>

        {loading && <div className="loading">Loading dashboard…</div>}

        {!loading && !d && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-text">Select a project to view the dashboard</div>
            <div className="empty-sub">Choose a project from the sidebar</div>
          </div>
        )}

        {!loading && d && (
          <>
            {/* ── SME Banner ─────────────────────────────────────── */}
            {isSME && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.2)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              }}>
                <Shield size={18} style={{ color: '#22d3ee', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                    SME Reviewer View
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Showing quality metrics and test coverage for review purposes
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22d3ee',
                    fontFamily: 'var(--font-mono)' }}>{d.smeApproved}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    SME Approved
                  </div>
                </div>
              </div>
            )}

            {/* ── Row 1: Key stats ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 10, marginBottom: 12 }}>
              <StatTile label="Total TCs"    value={d.totalTestCases} color="var(--accent)"
                icon={BarChart2} />
              <StatTile label="Executed"      value={totalExecuted}    color="#00d4ff"
                icon={Activity} subtitle={`${executionPct}% of total`} />
              <StatTile label="Pass"          value={d.passed}         color={S.Pass.color}
                bg={S.Pass.bg}  icon={CheckCircle2} />
              <StatTile label="Fail"          value={d.failed}         color={S.Fail.color}
                bg={S.Fail.bg}  icon={XCircle} />
              <StatTile label="In Progress"   value={d.inProgress}     color={S.InProgress.color}
                bg={S.InProgress.bg} icon={Clock} />
              <StatTile label="Defect Raised" value={d.defectRaised}   color={S.Defect.color}
                bg={S.Defect.bg} icon={AlertTriangle} />
            </div>

            {/* ── Row 2: More metrics ───────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 10, marginBottom: 20 }}>
              <StatTile label="NA"            value={d.naCount}        color={S.NA.color}          bg={S.NA.bg} />
              <StatTile label="Not Released"  value={d.notReleased}    color={S.NotReleased.color} bg={S.NotReleased.bg} />
              <StatTile label="Assigned"      value={d.assigned}       color={S.Assigned.color}    bg={S.Assigned.bg} />
              <StatTile label="Retest"        value={d.retest}         color="#ce93d8" />
              <StatTile label="Pass Rate"
                value={`${d.passRate}%`}
                color={d.passRate >= 80 ? '#00e676' : d.passRate >= 60 ? '#ffd740' : '#ff5252'} />
              <StatTile label="Exec Rate"
                value={`${executionPct}%`}
                color={executionPct >= 80 ? '#00e676' : '#ffb74d'} />
            </div>

            {/* ── Execution progress bars ───────────────────────── */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <span className="card-title">Execution Progress</span>
                <span style={{ fontSize: 11, color: 'var(--text3)',
                  fontFamily: 'var(--font-mono)' }}>
                  {totalExecuted} / {d.totalTestCases} test cases executed
                </span>
              </div>
              <ProgressBar value={executionPct}   color="#00d4ff"  label="Overall Execution Rate" />
              <ProgressBar value={passPct}         color="#00e676"  label="Pass Rate (of executed)" />
              <ProgressBar
                value={d.totalTestCases > 0 ? Math.round(Number(d.defectRaised)/d.totalTestCases*100) : 0}
                color="#ff9800" label="Defect Rate" />
            </div>

            {/* ── Defects summary (visible to all roles) ─────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr',
              gap: 16, marginBottom: 20 }}>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Defects Overview</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Total Defects',    value: defects.length,   color: 'var(--accent)' },
                    { label: 'Open / Active',    value: openDefects,      color: '#ff9800' },
                    { label: 'Critical',         value: criticalDefects,  color: '#ff5252' },
                    { label: 'Fixed / Closed',   value: defects.filter(df => ['FIXED','CLOSED'].includes(df.status)).length, color: '#00e676' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '8px 0',
                      borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color,
                        fontFamily: 'var(--font-mono)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Pie chart ──────────────────────────── */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Status Distribution</span>
                </div>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-raised)',
                        border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v, n) => [`${v} TCs`, n]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: 30 }}>
                    <div className="empty-text">No execution data yet</div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Module bar chart ──────────────────────────────── */}
            {barData.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                  <span className="card-title">Module Execution Breakdown</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {modules.length} modules
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 26)}>
                  <BarChart data={barData} layout="vertical"
                    margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={120}
                      tick={{ fill: 'var(--text2)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-raised)',
                      border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="Pass"     stackId="a" fill={S.Pass.color} />
                    <Bar dataKey="Fail"     stackId="a" fill={S.Fail.color} />
                    <Bar dataKey="In Prog"  stackId="a" fill={S.InProgress.color} />
                    <Bar dataKey="NA"       stackId="a" fill={S.NA.color} />
                    <Bar dataKey="Not Rel"  stackId="a" fill={S.NotReleased.color} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Module status detail table ─────────────────────── */}
            {modules.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Module Status Detail</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Module</th>
                        <th style={{ color: 'var(--accent)' }}>Total</th>
                        <th style={{ color: S.Pass.color }}>Pass</th>
                        <th style={{ color: S.Fail.color }}>Fail</th>
                        <th style={{ color: S.InProgress.color }}>In Progress</th>
                        <th style={{ color: S.NA.color }}>NA</th>
                        <th style={{ color: S.NotReleased.color }}>Not Released</th>
                        <th style={{ color: S.Defect.color }}>Defect</th>
                        <th>Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(m => (
                        <tr key={m.moduleId}>
                          <td style={{ fontWeight: 600 }}>{m.moduleName}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{m.total}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.Pass.color }}>{m.passed}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.Fail.color }}>{m.failed}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.InProgress.color }}>{m.inProgress}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.NA.color }}>{m.naCount}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.NotReleased.color }}>{m.notReleased}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: S.Defect.color }}>{m.defectRaised}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--bg-deep)',
                                borderRadius: 3, overflow: 'hidden', minWidth: 50 }}>
                                <div style={{ height: '100%', borderRadius: 3,
                                  width: `${m.passRate}%`,
                                  background: m.passRate >= 80 ? S.Pass.color
                                    : m.passRate >= 60 ? S.NA.color : S.Fail.color }} />
                              </div>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                                color: m.passRate >= 80 ? S.Pass.color
                                  : m.passRate >= 60 ? S.NA.color : S.Fail.color }}>
                                {m.passRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
