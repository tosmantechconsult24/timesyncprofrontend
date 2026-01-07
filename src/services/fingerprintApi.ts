// ============================================
// fingerprintApi.ts
// Frontend API for USB Fingerprint Scanner
// Communicates with Python fingerprint service
// ============================================

const FINGERPRINT_SERVICE_URL = 'http://localhost:8080';

export interface CaptureResult {
  success: boolean;
  template?: string;
  size?: number;
  error?: string;
  message?: string;
}

export interface EnrollResult {
  success: boolean;
  user_id?: string;
  template?: string;
  error?: string;
  message?: string;
}

export interface VerifyResult {
  success: boolean;
  verified?: boolean;
  score?: number;
  user_id?: string;
  error?: string;
}

export interface IdentifyResult {
  success: boolean;
  identified?: boolean;
  user_id?: string;
  score?: number;
  error?: string;
  message?: string;
}

export interface ServiceStatus {
  status: string;
  initialized: boolean;
  device_opened: boolean;
  mock_mode: boolean;
  enrolled_count: number;
  fp_width: number;
  fp_height: number;
}

class FingerprintApi {
  private baseUrl: string;

  constructor(baseUrl: string = FINGERPRINT_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the fingerprint service is running and device is connected
   */
  async checkHealth(): Promise<ServiceStatus> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Fingerprint service not available');
    }
    return response.json();
  }

  /**
   * Initialize the fingerprint device
   */
  async initialize(): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Terminate/close the fingerprint device
   */
  async terminate(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/terminate`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Capture a single fingerprint
   * User must place finger on scanner
   */
  async capture(): Promise<CaptureResult> {
    const response = await fetch(`${this.baseUrl}/capture`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Enroll a user with 3 fingerprint captures
   * @param userId - The user's ID
   * @param templates - Array of 3 base64 fingerprint templates
   */
  async enroll(userId: string, templates: string[]): Promise<EnrollResult> {
    const response = await fetch(`${this.baseUrl}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, templates }),
    });
    return response.json();
  }

  /**
   * Verify a fingerprint against a specific user (1:1 matching)
   * @param userId - The user's ID
   * @param template - Base64 fingerprint template to verify
   */
  async verify(userId: string, template: string): Promise<VerifyResult> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, template }),
    });
    return response.json();
  }

  /**
   * Identify a fingerprint from all enrolled users (1:N matching)
   * @param template - Base64 fingerprint template to identify
   */
  async identify(template: string): Promise<IdentifyResult> {
    const response = await fetch(`${this.baseUrl}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    });
    return response.json();
  }

  /**
   * Add a template to the identification database
   * (For loading templates from your backend into the scanner's memory)
   */
  async addTemplate(userId: string, template: string): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${this.baseUrl}/add-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, template }),
    });
    return response.json();
  }

  /**
   * Get list of enrolled user IDs
   */
  async getEnrolled(): Promise<{ success: boolean; enrolled: string[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/enrolled`);
    return response.json();
  }

  /**
   * Clear all enrolled templates from the scanner's memory
   */
  async clearDatabase(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/clear`, {
      method: 'POST',
    });
    return response.json();
  }

  /**
   * Complete enrollment flow - captures 3 fingerprints and enrolls
   * @param userId - User ID to enroll
   * @param onProgress - Callback for progress updates
   */
  async enrollWithCaptures(
    userId: string,
    onProgress?: (step: number, total: number, message: string) => void
  ): Promise<EnrollResult> {
    const templates: string[] = [];
    const totalCaptures = 3;

    for (let i = 0; i < totalCaptures; i++) {
      onProgress?.(i + 1, totalCaptures, `Capture ${i + 1} of ${totalCaptures} - Place finger on scanner`);
      
      const captureResult = await this.capture();
      
      if (!captureResult.success) {
        return {
          success: false,
          error: captureResult.error || `Capture ${i + 1} failed`,
        };
      }

      templates.push(captureResult.template!);
      
      if (i < totalCaptures - 1) {
        onProgress?.(i + 1, totalCaptures, 'Lift finger and place again');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    onProgress?.(totalCaptures, totalCaptures, 'Processing enrollment...');
    return this.enroll(userId, templates);
  }

  /**
   * Clock in/out with fingerprint verification
   * @param employeeId - Employee ID
   * @param storedTemplate - Template from your database
   */
  async clockWithVerification(
    employeeId: string,
    storedTemplate: string
  ): Promise<{ success: boolean; verified: boolean; score?: number; error?: string }> {
    // Capture current fingerprint
    const captureResult = await this.capture();
    if (!captureResult.success) {
      return { success: false, verified: false, error: captureResult.error };
    }

    // Verify against stored template
    const verifyResult = await this.verify(employeeId, captureResult.template!);
    return {
      success: verifyResult.success,
      verified: verifyResult.verified || false,
      score: verifyResult.score,
      error: verifyResult.error,
    };
  }

  /**
   * Load templates from your backend into the scanner's memory
   * This enables 1:N identification
   */
  async loadTemplatesFromBackend(backendUrl: string): Promise<{ loaded: number; errors: number }> {
    let loaded = 0;
    let errors = 0;

    try {
      // Fetch all templates from your backend
      const response = await fetch(`${backendUrl}/api/fingerprints`);
      const templates = await response.json();

      // Add each to scanner memory
      for (const fp of templates) {
        const result = await this.addTemplate(fp.employeeId, fp.template);
        if (result.success) {
          loaded++;
        } else {
          errors++;
        }
      }
    } catch (e) {
      console.error('Error loading templates:', e);
    }

    return { loaded, errors };
  }
}

// Export singleton instance
export const fingerprintApi = new FingerprintApi();

export default FingerprintApi;