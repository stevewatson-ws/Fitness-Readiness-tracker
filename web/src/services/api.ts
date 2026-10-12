import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fi_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post('/api/auth/register', { email, password, full_name: fullName }),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  me: () => api.get('/api/auth/me'),

  logout: () => {
    localStorage.removeItem('fi_token');
    api.post('/api/auth/logout').catch(() => {});
  },
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileApi = {
  get:    ()        => api.get('/api/profile'),
  update: (data: any) => api.put('/api/profile', data),
  completeOnboarding: () => api.post('/api/profile/onboarding-complete'),
};

// ─── Readiness ────────────────────────────────────────────────────────────────
export const readinessApi = {
  today:    (force = false) => api.get(`/api/readiness/today?force=${force}`),
  forDate:  (d: string)     => api.get(`/api/readiness/${d}`),
  trend:    (days = 14)     => api.get(`/api/readiness/trend?days=${days}`),
  history:  (start?: string, end?: string) =>
    api.get('/api/readiness/history', { params: { start_date: start, end_date: end } }),
  explain:  (d: string)     => api.get(`/api/readiness/explain/${d}`),
  whatIf:   (overrides: Record<string, number>, baseDate?: string) =>
    api.post('/api/readiness/what-if', { overrides, base_date: baseDate }),
};

// ─── Health Data ──────────────────────────────────────────────────────────────
export const healthApi = {
  addRecord:   (record: any)          => api.post('/api/health-records', record),
  bulkAdd:     (records: any[])       => api.post('/api/health-records/bulk', { records }),
  list:        (params?: any)         => api.get('/api/health-records', { params }),
  addWorkout:  (workout: any)         => api.post('/api/workouts', workout),
  listWorkouts:(params?: any)         => api.get('/api/workouts', { params }),
  bulkWorkouts:(workouts: any[])      => api.post('/api/workouts/bulk', workouts),
};

// ─── Check-In ─────────────────────────────────────────────────────────────────
export const checkInApi = {
  submit:  (data: any) => api.post('/api/checkin', data),
  today:   ()          => api.get('/api/checkin/today'),
};

// ─── Baseline ─────────────────────────────────────────────────────────────────
export const baselineApi = {
  get:     ()  => api.get('/api/baseline'),
  compute: ()  => api.post('/api/baseline/compute'),
};

// ─── Insights ─────────────────────────────────────────────────────────────────
export const insightsApi = {
  get: () => api.get('/api/insights'),
};

// ─── Simulator ────────────────────────────────────────────────────────────────
export const simulatorApi = {
  scenarios: ()                            => api.get('/api/simulator/scenarios'),
  load:      (scenario: string, days = 42) =>
    api.post(`/api/simulator/load?scenario=${scenario}&days=${days}`),
};
