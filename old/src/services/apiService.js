const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

// 用户相关
export const register = (data) => apiFetch('/register', { method: 'POST', body: JSON.stringify(data) });
export const login = (data) => apiFetch('/login', { method: 'POST', body: JSON.stringify(data) });
export const validateInvite = (inviteCode) => apiFetch('/validate-invite', { method: 'POST', body: JSON.stringify({ inviteCode }) });

// 人员
export const getPersonnel = () => apiFetch('/personnel', { method: 'GET' });
export const addPersonnel = (person) => apiFetch('/personnel', { method: 'POST', body: JSON.stringify(person) });
export const updatePersonnel = (id, person) => apiFetch(`/personnel/${id}`, { method: 'PUT', body: JSON.stringify(person) });
export const deletePersonnel = (id) => apiFetch(`/personnel/${id}`, { method: 'DELETE' });

// admin重置演示数据
export const resetDemoData = () => apiFetch('/reset-demo-data', { method: 'POST' });

// 排班
export const getSchedules = () => apiFetch('/schedules', { method: 'GET' });
export const addSchedule = (schedule) => apiFetch('/schedules', { method: 'POST', body: JSON.stringify(schedule) });
export const updateSchedule = (id, schedule) => apiFetch(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(schedule) });
export const deleteSchedule = (id) => apiFetch(`/schedules/${id}`, { method: 'DELETE' });
export const generateSchedules = (startDate, endDate) => apiFetch('/schedules/generate', { method: 'POST', body: JSON.stringify({ startDate, endDate }) });

// 规则
export const getScheduleRules = () => apiFetch('/schedule-rules', { method: 'GET' });
export const addScheduleRule = (rule) => apiFetch('/schedule-rules', { method: 'POST', body: JSON.stringify(rule) });
export const updateScheduleRule = (id, rule) => apiFetch(`/schedule-rules/${id}`, { method: 'PUT', body: JSON.stringify(rule) });
export const deleteScheduleRule = (id) => apiFetch(`/schedule-rules/${id}`, { method: 'DELETE' });

// 岗位
export const getPositions = () => apiFetch('/positions', { method: 'GET' });
export const addPosition = (position) => apiFetch('/positions', { method: 'POST', body: JSON.stringify(position) });
export const updatePosition = (id, position) => apiFetch(`/positions/${id}`, { method: 'PUT', body: JSON.stringify(position) });
export const deletePosition = (id) => apiFetch(`/positions/${id}`, { method: 'DELETE' }); 