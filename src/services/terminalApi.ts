// ============================================
// frontend/src/services/terminalApi.ts
// API service to communicate with the Bridge
// ============================================

// Bridge URL - change this if bridge is on different host
const BRIDGE_URL = 'http://localhost:3000';

// Helper function to make API calls to bridge
async function bridgeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  try {
    const response = await fetch(`${BRIDGE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Bridge is not running. Start it with: cd bridge && npm start');
    }
    throw error;
  }
}

// ============================================
// Terminal API Functions
// ============================================

export const terminalApi = {
  /**
   * Get all terminals from bridge
   */
  async getAll(): Promise<any[]> {
    return bridgeRequest('/api/terminals');
  },

  /**
   * Get single terminal
   */
  async getById(id: string): Promise<any> {
    return bridgeRequest(`/api/terminals/${id}`);
  },

  /**
   * Test terminal connection
   */
  async test(id: string): Promise<{ success: boolean; message: string }> {
    return bridgeRequest(`/api/terminals/${id}/test`, { method: 'POST' });
  },

  /**
   * Test connection to any IP/port
   */
  async testConnection(ipAddress: string, port: number = 4370): Promise<{ success: boolean; message: string }> {
    return bridgeRequest(`/api/terminals/test/test`, {
      method: 'POST',
      body: JSON.stringify({ ipAddress, port }),
    });
  },

  /**
   * Get terminal device info
   */
  async getInfo(id: string): Promise<any> {
    return bridgeRequest(`/api/terminals/${id}/info`);
  },

  /**
   * Get users on terminal
   */
  async getUsers(id: string): Promise<{ users: any[]; count: number }> {
    return bridgeRequest(`/api/terminals/${id}/users`);
  },

  /**
   * Sync single employee to terminal
   */
  async syncEmployee(terminalId: string, employee: {
    employeeId: string;
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean }> {
    return bridgeRequest(`/api/terminals/${terminalId}/sync-employee`, {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  },

  /**
   * Sync all employees to terminal
   */
  async syncAllEmployees(terminalId: string, employees: any[]): Promise<{ success: boolean; synced: number; errors: number }> {
    return bridgeRequest(`/api/terminals/${terminalId}/sync-all`, {
      method: 'POST',
      body: JSON.stringify({ employees }),
    });
  },

  /**
   * Delete user from terminal
   */
  async deleteUser(terminalId: string, employeeId: string): Promise<{ success: boolean }> {
    return bridgeRequest(`/api/terminals/${terminalId}/users/${employeeId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Start fingerprint enrollment
   */
  async startEnrollment(terminalId: string, employeeId: string, fingerIndex: number = 0): Promise<{
    success: boolean;
    message: string;
  }> {
    return bridgeRequest(`/api/terminals/${terminalId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ employeeId, fingerIndex }),
    });
  },

  /**
   * Cancel fingerprint enrollment
   */
  async cancelEnrollment(terminalId: string): Promise<{ success: boolean }> {
    return bridgeRequest(`/api/terminals/${terminalId}/cancel-enroll`, { method: 'POST' });
  },

  /**
   * Get attendance records from terminal
   */
  async getAttendance(terminalId: string): Promise<{ records: any[]; count: number }> {
    return bridgeRequest(`/api/terminals/${terminalId}/attendance`);
  },
};

// ============================================
// Bridge Status Functions
// ============================================

export const bridgeApi = {
  /**
   * Check if bridge is running
   */
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch(`${BRIDGE_URL}/health`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get bridge status
   */
  async getStatus(): Promise<any> {
    return bridgeRequest('/status');
  },

  /**
   * Check all terminals
   */
  async checkAllTerminals(): Promise<{ results: Array<{ id: string; name: string; online: boolean }> }> {
    return bridgeRequest('/check-all', { method: 'POST' });
  },
};

// Export default
export default {
  terminal: terminalApi,
  bridge: bridgeApi,
};