// ============================================
// services/payrollApi.ts - Payroll API Service
// ============================================

import axios from 'axios';

const BACKEND_URL = '/api';

// Create a separate axios instance for payroll API
const payrollApi = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add auth token to requests
payrollApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
payrollApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
// EMPLOYEE RATES
// ============================================

export async function getEmployeeRate(employeeId: string) {
  const response = await payrollApi.get(`/payroll/rates/${employeeId}`);
  return response.data;
}

export async function updateEmployeeRate(employeeId: string, data: {
  hourlyRate?: number;
  dailyRate?: number;
  salary?: number;
  overtimeRate?: number;
  rateType?: string;
  notes?: string;
}) {
  const response = await payrollApi.put(`/payroll/rates/${employeeId}`, data);
  return response.data;
}

export async function getAllEmployeeRates(departmentId?: string) {
  const params = departmentId ? { departmentId } : {};
  const response = await payrollApi.get('/payroll/rates', { params });
  return response.data;
}

// ============================================
// PAYROLL DEDUCTIONS
// ============================================

export async function createDeduction(data: {
  employeeId: string;
  deductionType: string;
  amount: number;
  reason?: string;
  description?: string;
  month: string;
}) {
  const response = await payrollApi.post('/payroll/deductions', data);
  return response.data;
}

export async function approveDeduction(deductionId: string, notes?: string) {
  const response = await payrollApi.put(`/payroll/deductions/${deductionId}/approve`, { notes });
  return response.data;
}

export async function rejectDeduction(deductionId: string, reason?: string) {
  const response = await payrollApi.put(`/payroll/deductions/${deductionId}/reject`, { reason });
  return response.data;
}

export async function getEmployeeDeductions(employeeId: string, month?: string, status?: string) {
  const params: any = {};
  if (month) params.month = month;
  if (status) params.status = status;
  const response = await payrollApi.get(`/payroll/deductions/employee/${employeeId}`, { params });
  return response.data;
}

export async function getPendingDeductions() {
  const response = await payrollApi.get('/payroll/deductions/pending');
  return response.data;
}

// ============================================
// INFRACTIONS
// ============================================

export async function createInfraction(data: {
  employeeId: string;
  type: string;
  severity?: string;
  amount?: number;
  description: string;
  date: string;
}) {
  const response = await payrollApi.post('/payroll/infractions', data);
  return response.data;
}

export async function approveInfraction(infractionId: string, notes?: string, autoCreateDeduction?: boolean) {
  const response = await payrollApi.put(`/payroll/infractions/${infractionId}/approve`, {
    notes,
    autoCreateDeduction: autoCreateDeduction !== false
  });
  return response.data;
}

export async function rejectInfraction(infractionId: string, reason?: string) {
  const response = await payrollApi.put(`/payroll/infractions/${infractionId}/reject`, { reason });
  return response.data;
}

export async function getEmployeeInfractions(employeeId: string, status?: string) {
  const params: any = {};
  if (status) params.status = status;
  const response = await payrollApi.get(`/payroll/infractions/employee/${employeeId}`, { params });
  return response.data;
}

export async function getPendingInfractions() {
  const response = await payrollApi.get('/payroll/infractions/pending');
  return response.data;
}
