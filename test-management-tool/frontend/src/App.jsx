import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import LoginPage              from './pages/LoginPage';
import Dashboard              from './pages/Dashboard';
import TestCasesPage          from './pages/TestCasesPage';
import ProjectsPage           from './pages/ProjectsPage';
import DefectsPage            from './pages/DefectsPage';
import WorkflowPage           from './pages/WorkflowPage';
import ProductivityPage       from './pages/ProductivityPage';
import ExecutionPage          from './pages/ExecutionPage';
import UsersPage              from './pages/UsersPage';
import AssignByModulePage     from './pages/AssignByModulePage';
import DailyTrackingPage      from './pages/DailyTrackingPage';
import MyTestCasesPage        from './pages/MyTestCasesPage';
import RequirementsPage       from './pages/RequirementsPage';
import UATWorkflowPage        from './pages/UATWorkflowPage';
import WorkloadDashboardPage  from './pages/WorkloadDashboardPage';
import Layout                 from './components/Layout';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>

            {/* ── General ── */}
            <Route index                element={<Dashboard />} />
            <Route path="projects"      element={<ProjectsPage />} />
            <Route path="test-cases"    element={<TestCasesPage />} />
            <Route path="execution" element={
              <ProtectedRoute roles={['TESTER','MANAGER','ADMIN']}><ExecutionPage /></ProtectedRoute>
            }/>
            <Route path="defects"       element={<DefectsPage />} />

            {/* ── Manager / SME ── */}
            <Route path="workflow" element={
              <ProtectedRoute roles={['SME','MANAGER','ADMIN']}><WorkflowPage /></ProtectedRoute>
            }/>
            <Route path="uat-workflow" element={
              <ProtectedRoute roles={['MANAGER','SME','ADMIN']}><UATWorkflowPage /></ProtectedRoute>
            }/>
            <Route path="assign-by-module" element={
              <ProtectedRoute roles={['MANAGER','ADMIN']}><AssignByModulePage /></ProtectedRoute>
            }/>
            <Route path="daily-tracking" element={
              <ProtectedRoute roles={['MANAGER','ADMIN']}><DailyTrackingPage /></ProtectedRoute>
            }/>
            <Route path="productivity" element={
              <ProtectedRoute roles={['TESTER','MANAGER','ADMIN']}><ProductivityPage /></ProtectedRoute>
            }/>
            <Route path="users" element={
              <ProtectedRoute roles={['MANAGER','ADMIN']}><UsersPage /></ProtectedRoute>
            }/>
            <Route path="workload" element={
              <ProtectedRoute roles={['MANAGER','ADMIN']}><WorkloadDashboardPage /></ProtectedRoute>
            }/>
            <Route path="requirements" element={
              <ProtectedRoute roles={['MANAGER','ADMIN','SME','TESTER','VIEWER']}><RequirementsPage /></ProtectedRoute>
            }/>

            {/* ── Tester ── */}
            <Route path="my-cases" element={
              <ProtectedRoute roles={['TESTER','MANAGER','ADMIN']}><MyTestCasesPage /></ProtectedRoute>
            }/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
