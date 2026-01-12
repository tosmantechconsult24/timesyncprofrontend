/// <reference types="vite/client" />
// ============================================
// environment.ts - Centralized Environment Configuration
// Manages API URLs for Cloud Backend + Local Fingerprint Service
// ============================================

// Cloud Backend API URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://timesyncprobackend.onrender.com';

// Local Fingerprint Service URL (runs on Windows kiosk/tablet)
export const FINGERPRINT_SERVICE_URL = import.meta.env.VITE_FINGERPRINT_SERVICE_URL || 'http://localhost:8080';

// Bridge URL for ZKTeco network terminals (if used)
export const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3000';

// API endpoints
export const API_URL = `${BACKEND_URL}/api`;

// Environment detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Kiosk mode detection (from local config or URL param)
export const isKioskMode = () => {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('kiosk') === 'true') return true;
  
  // Check localStorage config
  const kioskConfig = localStorage.getItem('kiosk_config');
  if (kioskConfig) {
    try {
      const config = JSON.parse(kioskConfig);
      return config.kiosk_mode === true;
    } catch {
      return false;
    }
  }
  
  return false;
};

// Load kiosk configuration from local storage
export interface KioskConfig {
  location_id: string;
  kiosk_id: string;
  backend_url: string;
  fingerprint_service_url: string;
  kiosk_mode: boolean;
  company_name?: string;
  location_name?: string;
}

export const getKioskConfig = (): KioskConfig | null => {
  const config = localStorage.getItem('kiosk_config');
  if (config) {
    try {
      return JSON.parse(config);
    } catch {
      return null;
    }
  }
  return null;
};

export const setKioskConfig = (config: KioskConfig): void => {
  localStorage.setItem('kiosk_config', JSON.stringify(config));
};

export const clearKioskConfig = (): void => {
  localStorage.removeItem('kiosk_config');
};

// Get effective URLs (considering kiosk config override)
export const getBackendUrl = (): string => {
  const kioskConfig = getKioskConfig();
  return kioskConfig?.backend_url || BACKEND_URL;
};

export const getFingerprintServiceUrl = (): string => {
  const kioskConfig = getKioskConfig();
  return kioskConfig?.fingerprint_service_url || FINGERPRINT_SERVICE_URL;
};

// Export configuration for debugging
export const getFullConfig = () => ({
  backend_url: getBackendUrl(),
  fingerprint_service_url: getFingerprintServiceUrl(),
  bridge_url: BRIDGE_URL,
  is_development: isDevelopment,
  is_production: isProduction,
  is_kiosk_mode: isKioskMode(),
  kiosk_config: getKioskConfig(),
});

export default {
  BACKEND_URL,
  FINGERPRINT_SERVICE_URL,
  BRIDGE_URL,
  API_URL,
  isDevelopment,
  isProduction,
  isKioskMode,
  getKioskConfig,
  setKioskConfig,
  clearKioskConfig,
  getBackendUrl,
  getFingerprintServiceUrl,
  getFullConfig,
};
