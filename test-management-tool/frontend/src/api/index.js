import axios from 'axios';

// const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (data) => api.post('/api/v1/auth/login', data),
  register:       (data) => api.post('/api/v1/auth/register', data),
  changePassword: (data) => api.post('/api/v1/auth/change-password', data),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectApi = {
  list:           ()           => api.get('/api/v1/projects'),             // nested (root + subs)
  listFlat:       ()           => api.get('/api/v1/projects/flat'),        // flat list for dropdowns
  subProjects:    (id)         => api.get(`/api/v1/projects/${id}/sub-projects`),
  get:            (id)         => api.get(`/api/v1/projects/${id}`),
  create:         (data)       => api.post('/api/v1/projects', data),
  update:         (id, data)   => api.put(`/api/v1/projects/${id}`, data),
  deactivate:     (id)         => api.delete(`/api/v1/projects/${id}`),
};

// ── Modules ───────────────────────────────────────────────────────────────────
export const moduleApi = {
  listByProject: (projectId) => api.get('/api/v1/modules', { params: { projectId } }),
};

// ── Test Cases ────────────────────────────────────────────────────────────────
export const testCaseApi = {
  list:           (params)       => api.get('/api/v1/testcases', { params }),
  get:            (id)           => api.get(`/api/v1/testcases/${id}`),
  create:         (data)         => api.post('/api/v1/testcases', data),
  update:         (id, data)     => api.put(`/api/v1/testcases/${id}`, data),
  delete:         (id)           => api.delete(`/api/v1/testcases/${id}`),
  editTestCase:   (id, data)     => api.put(`/api/v1/testcases/${id}/edit`, data),
  forwardToSME:   (id)           => api.patch(`/api/v1/testcases/${id}/forward-sme`),
  smeQueue:       (projectId)    => api.get('/api/v1/testcases/sme-queue', { params: { projectId } }),
  smeReview:      (id, data)     => api.put(`/api/v1/testcases/${id}/sme-review`, data),
  bulkApprove:    (data)         => api.post('/api/v1/testcases/bulk-approve', data),
  requestChanges: (id, data)     => api.post(`/api/v1/testcases/${id}/request-changes`, data),
  // Assign by explicit ID list
  assign:         (data)         => api.post('/api/v1/testcases/assign', data),
  // NEW Feature 2 — assign ALL SME_APPROVED cases in a module to a tester
  assignByModule: (data)         => api.post('/api/v1/testcases/assign-by-module', data),
  signOff:        (projectId, data) => api.post(`/api/v1/testcases/signoff/${projectId}`, data),
  importExcel: (projectId, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/v1/testcases/import', form, {
      params: { projectId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () =>
    api.get('/api/v1/testcases/import/template', { responseType: 'blob' }),
  exportTestCases: (projectId) =>
    api.get('/api/v1/testcases/export', { params: { projectId }, responseType: 'blob' }),
};

// ── Defects ───────────────────────────────────────────────────────────────────
export const defectApi = {
  list:         (projectId) => api.get('/api/v1/defects', { params: { projectId } }),
  create:       (data)      => api.post('/api/v1/defects', data),
  updateStatus: (id, status) =>
    api.patch(`/api/v1/defects/${id}/status`, null, { params: { status } }),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  dashboard:       (projectId) =>
    api.get('/api/v1/reports/manager-dashboard', { params: { projectId } }),
  allDashboards:   ()           => api.get('/api/v1/reports/manager-dashboard/all'),
  moduleBreakdown: (projectId)  =>
    api.get('/api/v1/reports/module-breakdown',  { params: { projectId } }),
};

// ── Executions ────────────────────────────────────────────────────────────────
export const executionApi = {
  submit:  (data)        => api.post('/api/v1/executions', data),
  update:  (id, data)    => api.put(`/api/v1/executions/${id}`, data),
  getById: (id)          => api.get(`/api/v1/executions/${id}`),
  history: (testCaseId)  => api.get(`/api/v1/executions/testcase/${testCaseId}/history`),
  list:    (params)      => api.get('/api/v1/executions', { params }),
  summary: (projectId)   =>
    api.get('/api/v1/executions/summary', { params: { projectId } }),
  delete:  (id)          => api.delete(`/api/v1/executions/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  list:          (activeOnly = true) =>
    api.get('/api/v1/users', { params: { activeOnly } }),
  // NEW Feature 1 — GET /api/v1/users/testers used by assignment modals
  listTesters:   ()                  => api.get('/api/v1/users/testers'),
  listByRole:    (role)              =>
    api.get('/api/v1/users/by-role', { params: { role } }),
  getById:       (id)                => api.get(`/api/v1/users/${id}`),
  me:            ()                  => api.get('/api/v1/users/me'),
  // NEW Feature 1 — POST /api/v1/users  (manager creates tester)
  create:        (data)              => api.post('/api/v1/users', data),
  update:        (id, data)          => api.put(`/api/v1/users/${id}`, data),
  resetPassword: (id, data)          =>
    api.patch(`/api/v1/users/${id}/reset-password`, data),
  activate:      (id)                => api.patch(`/api/v1/users/${id}/activate`),
  deactivate:    (id)                => api.patch(`/api/v1/users/${id}/deactivate`),
  updateRole:    (id, role)          =>
    api.patch(`/api/v1/users/${id}/role`, { role }),
};

// ── Productivity ──────────────────────────────────────────────────────────────
export const productivityApi = {
  // Manager: team summary
  team: (projectId) =>
    api.get('/api/v1/productivity/team', {
      params: projectId ? { projectId } : {},
    }),
  // Manager: one tester full breakdown (includes dailyHistory)
  tester: (userId, projectId) =>
    api.get(`/api/v1/productivity/tester/${userId}`, {
      params: projectId ? { projectId } : {},
    }),
  // Manager: one tester's daily entries only
  testerDaily: (userId, days = 30) =>
    api.get(`/api/v1/productivity/tester/${userId}/daily`, { params: { days } }),
  // NEW Feature 5 — tester views their own productivity
  me: (projectId) =>
    api.get('/api/v1/productivity/me', {
      params: projectId ? { projectId } : {},
    }),
  // NEW Feature 3 — manager daily tracking dashboard
  dailyTracking: (date) =>
    api.get('/api/v1/productivity/daily-tracking', {
      params: date ? { date } : {},
    }),
};

export default api;

// ── Tags ─────────────────────────────────────────────────────
export const tagApi = {
  listByProject: (projectId) => api.get('/api/v1/tags', { params: { projectId } }),
  create:        (data)      => api.post('/api/v1/tags', data),
  addToCase:     (tcId, tagId) => api.post(`/api/v1/testcases/${tcId}/tags/${tagId}`),
  removeFromCase:(tcId, tagId) => api.delete(`/api/v1/testcases/${tcId}/tags/${tagId}`),
};

// ── Requirements ─────────────────────────────────────────────
export const requirementApi = {
  listByProject: (projectId) => api.get('/api/v1/requirements', { params: { projectId } }),
  create:        (data)      => api.post('/api/v1/requirements', data),
  link:    (tcId, reqId) => api.post(`/api/v1/requirements/testcases/${tcId}/link/${reqId}`),
  unlink:  (tcId, reqId) => api.delete(`/api/v1/requirements/testcases/${tcId}/unlink/${reqId}`),
};

// ── Attachments ───────────────────────────────────────────────
export const attachmentApi = {
  uploadToExecution: (execId, file) => {
    const form = new FormData(); form.append('file', file);
    return api.post(`/api/v1/executions/${execId}/attachments`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadToDefect: (defectId, file) => {
    const form = new FormData(); form.append('file', file);
    return api.post(`/api/v1/defects/${defectId}/attachments`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listForExecution: (execId)  => api.get(`/api/v1/executions/${execId}/attachments`),
  listForDefect:    (defectId) => api.get(`/api/v1/defects/${defectId}/attachments`),
  downloadUrl:      (id)      => `/api/v1/attachments/${id}/download`,
  download:         (id)      => api.get(`/api/v1/attachments/${id}/download`, { responseType: 'blob' }),
  delete:           (id)      => api.delete(`/api/v1/attachments/${id}`),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  list:         ()   => api.get('/api/v1/notifications/me'),
  unreadCount:  ()   => api.get('/api/v1/notifications/me/unread-count'),
  markRead:     (id) => api.patch(`/api/v1/notifications/${id}/read`),
  markAllRead:  ()   => api.patch('/api/v1/notifications/read-all'),
};

// ── Version History ───────────────────────────────────────────
export const versionApi = {
  list:   (tcId)            => api.get(`/api/v1/testcases/${tcId}/versions`),
  get:    (tcId, versionNo) => api.get(`/api/v1/testcases/${tcId}/versions/${versionNo}`),
};

// ── Global Search ─────────────────────────────────────────────
export const searchApi = {
  search: (q, projectId) => api.get('/api/v1/search', { params: { q, ...(projectId ? { projectId } : {}) } }),
};

// ── Workflow extras ───────────────────────────────────────────
export const workflowApi = {
  reassign:          (id, data) => api.patch(`/api/v1/testcases/${id}/reassign`, data),
  sendUAT:           (id, data) => api.patch(`/api/v1/testcases/${id}/send-uat`, data),
  startUAT:          (id)       => api.patch(`/api/v1/testcases/${id}/uat-start`),
  passUAT:           (id, data) => api.patch(`/api/v1/testcases/${id}/uat-pass`, data),
  sendRedevelopment: (id, data) => api.patch(`/api/v1/testcases/${id}/send-redevelopment`, data),
  clone:             (id, data) => api.post(`/api/v1/testcases/${id}/clone`, data),
};

// ── Workload (appended) ───────────────────────────────────────
export const workloadApi = {
  team: () => api.get('/api/v1/productivity/workload'),
};
