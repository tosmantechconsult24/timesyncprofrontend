// ============================================
// fingerprintService.ts
// REAL USB Fingerprint Scanner Service
// 
// This replaces the simulated fingerprintService in TimeStationKiosk.tsx
// Communicates with Python USB service on port 8080
// ============================================

const FINGERPRINT_SERVICE_URL = 'http://localhost:8080';

export interface FingerprintService {
  isConnected: boolean;
  capture: () => Promise<string>;
  verify: (storedTemplate: string, capturedTemplate: string) => Promise<boolean>;
  enroll: (userId: string, templates: string[]) => Promise<{ success: boolean; template?: string; error?: string }>;
  checkConnection: () => Promise<boolean>;
}

// Create the real fingerprint service
const createFingerprintService = (): FingerprintService => {
  let _isConnected = false;

  const checkConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/health`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[FingerprintService] Health check:', data);
        _isConnected = data.device_opened === true || data.mock_mode === true;
        return _isConnected;
      }
      _isConnected = false;
      return false;
    } catch (e) {
      console.error('[FingerprintService] Health check failed:', e);
      _isConnected = false;
      return false;
    }
  };

  // Check connection on startup
  checkConnection();

  return {
    get isConnected() {
      return _isConnected;
    },

    checkConnection,

    /**
     * Capture a fingerprint from the USB scanner
     * Returns base64 encoded fingerprint template
     */
    capture: async (): Promise<string> => {
      console.log('[FingerprintService] Starting capture...');
      
      try {
        const response = await fetch(`${FINGERPRINT_SERVICE_URL}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        console.log('[FingerprintService] Capture response:', data.success ? 'success' : data.error);

        if (!data.success) {
          throw new Error(data.error || 'Capture failed. Place finger on scanner.');
        }

        return data.template;
      } catch (e: any) {
        console.error('[FingerprintService] Capture error:', e);
        if (e.message.includes('fetch')) {
          throw new Error('Fingerprint service not running. Start: python usb-fingerprint-service.py');
        }
        throw e;
      }
    },

    /**
     * Verify captured fingerprint against stored template (1:1 matching)
     * Uses the /match endpoint on the Python service
     */
    verify: async (storedTemplate: string, capturedTemplate: string): Promise<boolean> => {
      console.log('[FingerprintService] Verifying fingerprint...');
      
      try {
        const response = await fetch(`${FINGERPRINT_SERVICE_URL}/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template1: storedTemplate,
            template2: capturedTemplate,
          }),
        });

        const data = await response.json();
        console.log('[FingerprintService] Match result:', data);
        
        if (!data.success) {
          console.error('[FingerprintService] Match error:', data.error);
          return false;
        }

        // Match is successful if matched is true OR score > 0
        const isMatch = data.matched === true || (data.score && data.score > 0);
        console.log('[FingerprintService] Match:', isMatch, 'Score:', data.score);
        
        return isMatch;
      } catch (e: any) {
        console.error('[FingerprintService] Verification error:', e);
        return false;
      }
    },

    /**
     * Enroll a user with multiple fingerprint captures
     */
    enroll: async (userId: string, templates: string[]) => {
      console.log('[FingerprintService] Enrolling user:', userId);
      
      try {
        const response = await fetch(`${FINGERPRINT_SERVICE_URL}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, templates }),
        });

        const data = await response.json();
        console.log('[FingerprintService] Enroll result:', data.success ? 'success' : data.error);
        return data;
      } catch (e: any) {
        console.error('[FingerprintService] Enroll error:', e);
        return { success: false, error: e.message };
      }
    },
  };
};

// Export singleton instance
export const fingerprintService = createFingerprintService();

export default fingerprintService;