// ============================================
// api.ts - Complete API service with all method aliases
// Backend: localhost:5000 (via Vite proxy)
// Bridge: localhost:3000 (direct connection)
// ============================================

import axios from 'axios';

// Backend API - relative URL (Vite proxy routes to localhost:5000)
const BACKEND_URL = '/api';

// Bridge API - direct connection for terminal operations
const BRIDGE_URL = 'http://localhost:3000';

// Backend API instance
const backendApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Bridge API instance
const bridgeApi = axios.create({
  baseURL: BRIDGE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add auth token to backend requests
backendApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - redirect to login
backendApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await backendApi.post('/auth/login', { email, password });
    // Store token if returned
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      const response = await backendApi.post('/auth/logout');
      return response.data;
    } catch {
      return { success: true };
    }
  },
  
  me: async () => {
    const response = await backendApi.get('/auth/me');
    return response.data;
  },

  register: async (data: any) => {
    const response = await backendApi.post('/auth/register', data);
    return response.data;
  },
};

// ============================================
// EMPLOYEES API
// ============================================
export const employeesApi = {
  getAll: async (params?: any) => {
    const response = await backendApi.get('/employees', { params });
    return response.data;
  },
  
  list: async (params?: any) => {
    const response = await backendApi.get('/employees', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await backendApi.get(`/employees/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/employees/${id}`);
    return response.data;
  },
  
  create: async (data: FormData | any) => {
    const response = await backendApi.post('/employees', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },
  
  update: async (id: string, data: FormData | any) => {
    const response = await backendApi.put(`/employees/${id}`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await backendApi.delete(`/employees/${id}`);
    return response.data;
  },

  enrollFingerprint: async (employeeId: string, data: { template: string; visitorId: string }) => {
    const response = await backendApi.post(`/employees/${employeeId}/fingerprint`, data);
    return response.data;
  },
};

// ============================================
// DEPARTMENTS API
// ============================================
export const departmentsApi = {
  getAll: async () => {
    const response = await backendApi.get('/departments');
    return response.data;
  },

  list: async () => {
    const response = await backendApi.get('/departments');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await backendApi.get(`/departments/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/departments/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await backendApi.post('/departments', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/departments/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await backendApi.delete(`/departments/${id}`);
    return response.data;
  },
};

// ============================================
// SHIFTS API
// ============================================
export const shiftsApi = {
  getAll: async () => {
    const response = await backendApi.get('/shifts');
    return response.data;
  },

  list: async () => {
    const response = await backendApi.get('/shifts');
    return response.data;
  },
  
  getById: async (id: string) => {
    const response = await backendApi.get(`/shifts/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/shifts/${id}`);
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await backendApi.post('/shifts', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/shifts/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await backendApi.delete(`/shifts/${id}`);
    return response.data;
  },
};

// ============================================
// ATTENDANCE API
// ============================================
export const attendanceApi = {
  getAll: async (params?: any) => {
    const response = await backendApi.get('/attendance', { params });
    return response.data;
  },
  
  list: async (params?: any) => {
    const response = await backendApi.get('/attendance', { params });
    return response.data;
  },

  clockIn: async (employeeId: string, data?: any) => {
    const response = await backendApi.post('/attendance/clock-in', { employeeId, ...data });
    return response.data;
  },
  
  clockOut: async (employeeId: string, data?: any) => {
    const response = await backendApi.post('/attendance/clock-out', { employeeId, ...data });
    return response.data;
  },

  record: async (employeeId: string, type: string, data?: any) => {
    const response = await backendApi.post('/attendance/record', { employeeId, type, ...data });
    return response.data;
  },

  getByEmployee: async (employeeId: string, params?: any) => {
    const response = await backendApi.get(`/attendance/employee/${employeeId}`, { params });
    return response.data;
  },

  getToday: async () => {
    const response = await backendApi.get('/attendance/today');
    return response.data;
  },
};

// ============================================
// TIME ENTRIES API
// ============================================
export const timeEntriesApi = {
  getAll: async (params?: any) => {
    const response = await backendApi.get('/time-entries', { params });
    return response.data;
  },

  list: async (params?: any) => {
    const response = await backendApi.get('/time-entries', { params });
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await backendApi.post('/time-entries', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/time-entries/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await backendApi.delete(`/time-entries/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/time-entries/${id}`);
    return response.data;
  },

  autoClockout: async () => {
    const response = await backendApi.post('/time-entries/auto-clockout');
    return response.data;
  },
};

// ============================================
// LEAVES API
// ============================================
export const leavesApi = {
  getAll: async (params?: any) => {
    const response = await backendApi.get('/leaves', { params });
    return response.data;
  },

  list: async (params?: any) => {
    const response = await backendApi.get('/leaves', { params });
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await backendApi.post('/leaves', data);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/leaves/${id}`);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/leaves/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await backendApi.delete(`/leaves/${id}`);
    return response.data;
  },
  
  approve: async (id: string, data?: any) => {
    const response = await backendApi.post(`/leaves/${id}/approve`, data);
    return response.data;
  },
  
  reject: async (id: string, data?: any) => {
    const response = await backendApi.post(`/leaves/${id}/reject`, data);
    return response.data;
  },

  verifyFingerprint: async (id: string, data?: any) => {
    const response = await backendApi.post(`/leaves/${id}/verify-fingerprint`, data);
    return response.data;
  },
};

// ============================================
// TERMINALS API - Uses BRIDGE directly
// ============================================
export const terminalsApi = {
  isBridgeOnline: async (): Promise<boolean> => {
    try {
      const response = await bridgeApi.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  },

  getAll: async () => {
    try {
      const response = await bridgeApi.get('/api/terminals');
      return response.data;
    } catch {
      return [];
    }
  },

  list: async () => {
    try {
      const response = await bridgeApi.get('/api/terminals');
      return response.data;
    } catch {
      return [];
    }
  },

  getById: async (id: string) => {
    const response = await bridgeApi.get(`/api/terminals/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await bridgeApi.get(`/api/terminals/${id}`);
    return response.data;
  },

  test: async (id: string) => {
    const response = await bridgeApi.post(`/api/terminals/${id}/test`);
    return response.data;
  },

  testByIp: async (ipAddress: string, port: number = 4370) => {
    const response = await bridgeApi.post('/api/terminals/test/test', { ipAddress, port });
    return response.data;
  },

  getInfo: async (id: string) => {
    const response = await bridgeApi.get(`/api/terminals/${id}/info`);
    return response.data;
  },

  getUsers: async (id: string) => {
    const response = await bridgeApi.get(`/api/terminals/${id}/users`);
    return response.data;
  },

  syncEmployee: async (terminalId: string, employee: any) => {
    const response = await bridgeApi.post(`/api/terminals/${terminalId}/sync-employee`, employee);
    return response.data;
  },

  syncAllEmployees: async (terminalId: string, employees: any[]) => {
    const response = await bridgeApi.post(`/api/terminals/${terminalId}/sync-all`, { employees });
    return response.data;
  },

  deleteUser: async (terminalId: string, employeeId: string) => {
    const response = await bridgeApi.delete(`/api/terminals/${terminalId}/users/${employeeId}`);
    return response.data;
  },

  startEnrollment: async (terminalId: string, employeeId: string, fingerIndex: number = 0) => {
    const response = await bridgeApi.post(`/api/terminals/${terminalId}/enroll`, {
      employeeId,
      fingerIndex,
    });
    return response.data;
  },

  cancelEnrollment: async (terminalId: string) => {
    const response = await bridgeApi.post(`/api/terminals/${terminalId}/cancel-enroll`);
    return response.data;
  },

  getAttendance: async (terminalId: string) => {
    const response = await bridgeApi.get(`/api/terminals/${terminalId}/attendance`);
    return response.data;
  },

  checkAll: async () => {
    const response = await bridgeApi.post('/check-all');
    return response.data;
  },

  create: async (data: any) => {
    const response = await backendApi.post('/terminals', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/terminals/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await backendApi.delete(`/terminals/${id}`);
    return response.data;
  },
};

// ============================================
// REPORTS API
// ============================================
export const reportsApi = {
  getAttendanceSummary: async (params?: any) => {
    const response = await backendApi.get('/reports/attendance-summary', { params });
    return response.data;
  },
  
  getEmployeeReport: async (employeeId: string, params?: any) => {
    const response = await backendApi.get(`/reports/employee/${employeeId}`, { params });
    return response.data;
  },
  
  getDepartmentReport: async (departmentId: string, params?: any) => {
    const response = await backendApi.get(`/reports/department/${departmentId}`, { params });
    return response.data;
  },

  getMonthlyReport: async (params?: any) => {
    const response = await backendApi.get('/reports/monthly', { params });
    return response.data;
  },
};

// ============================================
// DASHBOARD API
// ============================================
export const dashboardApi = {
  getStats: async () => {
    const response = await backendApi.get('/dashboard/stats');
    return response.data;
  },
  
  getTodayAttendance: async () => {
    const response = await backendApi.get('/dashboard/today-attendance');
    return response.data;
  },

  getRecentActivity: async () => {
    const response = await backendApi.get('/dashboard/recent-activity');
    return response.data;
  },
};

// ============================================
// USERS API
// ============================================
export const usersApi = {
  getAll: async () => {
    const response = await backendApi.get('/users');
    return response.data;
  },

  list: async () => {
    const response = await backendApi.get('/users');
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await backendApi.post('/users', data);
    return response.data;
  },
  
  update: async (id: string, data: any) => {
    const response = await backendApi.put(`/users/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await backendApi.delete(`/users/${id}`);
    return response.data;
  },

  get: async (id: string) => {
    const response = await backendApi.get(`/users/${id}`);
    return response.data;
  },

  // Get role statistics and limits
  getRoleStats: async () => {
    const response = await backendApi.get('/users/admin/role-stats');
    return response.data;
  },

  // Get available employees for role assignment
  getAvailableEmployees: async () => {
    const response = await backendApi.get('/users/admin/available-employees');
    return response.data;
  },
};

// ============================================
// SETTINGS API
// ============================================
export const settingsApi = {
  get: async () => {
    const response = await backendApi.get('/settings');
    return response.data;
  },

  update: async (data: any) => {
    const response = await backendApi.put('/settings', data);
    return response.data;
  },
};

// Export default
export default {
  auth: authApi,
  employees: employeesApi,
  departments: departmentsApi,
  shifts: shiftsApi,
  attendance: attendanceApi,
  timeEntries: timeEntriesApi,
  leaves: leavesApi,
  terminals: terminalsApi,
  reports: reportsApi,
  dashboard: dashboardApi,
  users: usersApi,
  settings: settingsApi,
};

// Export backendApi for direct use in components requiring authenticated API calls
export { backendApi };