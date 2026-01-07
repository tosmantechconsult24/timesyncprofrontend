// ============================================
// authStore.ts - Fixed authentication store
// Handles login, logout, and token persistence
// ============================================

import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true, // Start as loading to check initial auth
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authApi.login(email, password);
      
      // Handle different response formats
      const token = response.token || response.accessToken || response.data?.token;
      const user = response.user || response.data?.user || { email, id: 'temp' };
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Store token
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed';
      
      // Clear any stale tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: message,
      });
      
      return false;
    }
  },

  logout: () => {
    // Clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Reset state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    
    // Call API logout (don't wait for it)
    authApi.logout().catch(() => {});
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    
    // No token = not authenticated
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
    
    // Try to get user from localStorage first (faster)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Verify with server in background (don't block UI)
        authApi.me().then(response => {
          const serverUser = response.user || response;
          set({ user: serverUser });
          localStorage.setItem('user', JSON.stringify(serverUser));
        }).catch(() => {
          // Token invalid - logout
          get().logout();
        });
        
        return true;
      } catch {
        // Invalid stored user, continue to server check
      }
    }
    
    // Verify token with server
    try {
      set({ isLoading: true });
      const response = await authApi.me();
      const user = response.user || response;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return true;
    } catch (error) {
      // Token invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      return false;
    }
  },

  clearError: () => set({ error: null }),
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  
  hasPermission: (permission: string) => {
    const state = get();
    // Super admin has all permissions
    if (state.user?.role === 'super_admin') return true;
    // For now, return true if user is authenticated
    // This can be expanded with actual permission checking
    return state.isAuthenticated;
  },
}));

export default useAuthStore;