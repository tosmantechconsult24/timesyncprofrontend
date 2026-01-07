// ============================================
// FingerprintEnrollmentDialog.tsx
// Fixed to use port 5000 for backend
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Avatar,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Replay as RetryIcon,
  TouchApp as TouchAppIcon,
} from '@mui/icons-material';

// ============================================
// CONFIGURATION - UPDATE THESE IF NEEDED
// ============================================
const FINGERPRINT_SERVICE_URL = 'http://localhost:8080';
const API_BASE_URL = 'http://localhost:5001/api';
const CAPTURE_TIMEOUT = 15000; // 15 seconds timeout per capture

// ============================================
// TYPES
// ============================================
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: { name: string };
  fingerprintEnrolled?: boolean;
}

interface FingerprintEnrollmentDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

const STEPS = ['Capture 1', 'Capture 2', 'Capture 3', 'Saving'];

// ============================================
// COMPONENT
// ============================================
const FingerprintEnrollmentDialog: React.FC<FingerprintEnrollmentDialogProps> = ({
  open,
  onClose,
  employee,
  onSuccess,
}) => {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scannerConnected, setScannerConnected] = useState(false);
  const [checkingScanner, setCheckingScanner] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Refs to track current templates (avoids stale closure issues)
  const templatesRef = useRef<string[]>([]);

  // Update ref when templates change
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // ============================================
  // CHECK SCANNER CONNECTION
  // ============================================
  const checkScanner = useCallback(async () => {
    setCheckingScanner(true);
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        const connected = data.device_opened || data.mock_mode;
        setScannerConnected(connected);
        console.log('[Enrollment] Scanner check:', connected ? 'Connected' : 'Disconnected');
      } else {
        setScannerConnected(false);
      }
    } catch (e) {
      console.error('[Enrollment] Scanner check failed:', e);
      setScannerConnected(false);
    } finally {
      setCheckingScanner(false);
    }
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      checkScanner();
      setActiveStep(0);
      setTemplates([]);
      templatesRef.current = [];
      setError(null);
      setSuccess(false);
      setSaving(false);
      setStatusMessage('');
      setCountdown(0);
    }
  }, [open, checkScanner]);

  // ============================================
  // CAPTURE FINGERPRINT WITH RETRY
  // ============================================
  const captureFingerprint = async () => {
    setCapturing(true);
    setError(null);
    
    const captureNumber = templatesRef.current.length + 1;
    setStatusMessage(`Capture ${captureNumber}: Place finger on scanner...`);
    
    // Start countdown
    let timeLeft = CAPTURE_TIMEOUT / 1000;
    setCountdown(timeLeft);
    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT);

      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(countdownInterval);
      setCountdown(0);

      const data = await response.json();
      console.log(`[Enrollment] Capture ${captureNumber} response:`, data.success ? 'SUCCESS' : data.error);

      if (!data.success) {
        throw new Error(data.error || 'Capture failed. Place finger firmly on scanner.');
      }

      // Add template to array using ref for current value
      const newTemplates = [...templatesRef.current, data.template];
      setTemplates(newTemplates);
      templatesRef.current = newTemplates;
      
      console.log(`[Enrollment] Captured template ${newTemplates.length}/3`);
      setStatusMessage(`✓ Capture ${newTemplates.length} complete!`);

      if (newTemplates.length < 3) {
        // Move to next capture step
        setActiveStep(newTemplates.length);
        
        // Brief pause before allowing next capture
        await new Promise(resolve => setTimeout(resolve, 500));
        setStatusMessage('Lift finger, then place again for next capture');
      } else {
        // All 3 captures done, proceed to save
        setActiveStep(3);
        setStatusMessage('All captures complete. Saving...');
        
        // Small delay then save
        await new Promise(resolve => setTimeout(resolve, 300));
        await saveFingerprint(newTemplates);
      }
    } catch (e: any) {
      clearInterval(countdownInterval);
      setCountdown(0);
      
      console.error(`[Enrollment] Capture ${captureNumber} error:`, e);
      
      if (e.name === 'AbortError') {
        setError('Capture timeout - no finger detected. Click to try again.');
      } else {
        setError(e.message || 'Failed to capture fingerprint');
      }
      setStatusMessage('');
    } finally {
      setCapturing(false);
    }
  };

  // ============================================
  // SAVE FINGERPRINT (Merge + Store)
  // ============================================
  const saveFingerprint = async (capturedTemplates: string[]) => {
    if (!employee) return;

    setSaving(true);
    setError(null);

    try {
      // Step 1: Merge templates in Python service
      setStatusMessage('Merging fingerprint templates...');
      console.log('[Enrollment] Merging', capturedTemplates.length, 'templates');
      
      const enrollResponse = await fetch(`${FINGERPRINT_SERVICE_URL}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: employee.employeeId,
          templates: capturedTemplates,
        }),
      });

      const enrollData = await enrollResponse.json();
      console.log('[Enrollment] Merge response:', enrollData.success ? 'SUCCESS' : enrollData.error);

      if (!enrollData.success) {
        throw new Error(enrollData.error || 'Failed to merge fingerprint templates');
      }

      // Step 2: Save merged template to backend database
      setStatusMessage('Saving to database...');
      console.log('[Enrollment] Saving to:', `${API_BASE_URL}/employees/fingerprint-enroll/${employee.id}`);
      
      const saveResponse = await fetch(`${API_BASE_URL}/employees/fingerprint-enroll/${employee.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: enrollData.template,
          fingerNo: 0,
          quality: 100,
        }),
      });

      console.log('[Enrollment] Save response status:', saveResponse.status);

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('[Enrollment] Save error response:', errorText);
        
        let errorMessage = 'Failed to save fingerprint to database';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
            errorMessage = 'Backend server not responding correctly. Check backend logs.';
          }
        }
        throw new Error(errorMessage);
      }

      const saveResult = await saveResponse.json();
      console.log('[Enrollment] Save result:', saveResult);

      setSuccess(true);
      setStatusMessage('Fingerprint enrolled successfully!');
      
      // Auto close after success
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (e: any) {
      console.error('[Enrollment] Save error:', e);
      setError(e.message || 'Failed to save fingerprint');
      setStatusMessage('');
      // Reset to allow retry
      setActiveStep(2);
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handleRetry = () => {
    setTemplates([]);
    templatesRef.current = [];
    setActiveStep(0);
    setError(null);
    setSuccess(false);
    setStatusMessage('');
    setCountdown(0);
  };

  const handleClose = () => {
    if (!capturing && !saving) {
      onClose();
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (!employee) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { minHeight: 550 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FingerprintIcon color="primary" />
          <Box>
            <Typography variant="h6">Fingerprint Enrollment</Typography>
            <Typography variant="body2" color="text.secondary">
              {employee.firstName} {employee.lastName} ({employee.employeeId})
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Scanner Check */}
        {checkingScanner ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Checking scanner connection...</Typography>
          </Box>
        ) : !scannerConnected ? (
          <Box sx={{ py: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">Scanner not connected!</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Make sure the fingerprint service is running:
              </Typography>
              <Box 
                component="code" 
                sx={{ 
                  display: 'block', 
                  mt: 1, 
                  p: 1, 
                  bgcolor: 'grey.100', 
                  borderRadius: 1,
                  fontSize: '0.85rem'
                }}
              >
                python usb-fingerprint-service.py
              </Box>
            </Alert>
            <Button variant="outlined" onClick={checkScanner} fullWidth>
              Check Again
            </Button>
          </Box>
        ) : (
          <>
            {/* Employee Info */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 50, height: 50, bgcolor: 'primary.main' }}>
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {employee.firstName} {employee.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {employee.employeeId} • {employee.department?.name || 'No Department'}
                  </Typography>
                </Box>
                {employee.fingerprintEnrolled && (
                  <Chip label="Re-enrolling" color="warning" size="small" />
                )}
              </Box>
            </Paper>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map((label, index) => (
                <Step key={label} completed={index < activeStep || success}>
                  <StepLabel error={index === activeStep && !!error}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Instructions */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Instructions:</strong> Place your finger flat on the scanner. 
                After each capture, <strong>lift your finger</strong> and place it again.
                You have {CAPTURE_TIMEOUT / 1000} seconds for each capture.
              </Typography>
            </Alert>

            {/* Main Content */}
            <Box sx={{ textAlign: 'center', py: 2, minHeight: 180 }}>
              {success ? (
                // Success State
                <Box>
                  <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h5" color="success.main" gutterBottom>
                    Enrollment Successful!
                  </Typography>
                  <Typography color="text.secondary">
                    Fingerprint saved for {employee.firstName} {employee.lastName}
                  </Typography>
                </Box>
              ) : error ? (
                // Error State
                <Box>
                  <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                  <Typography variant="h6" color="error.main" gutterBottom>
                    {activeStep === 3 ? 'Save Failed' : 'Capture Failed'}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2, px: 2 }}>
                    {error}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<RetryIcon />}
                      onClick={handleRetry}
                    >
                      Start Over
                    </Button>
                    {activeStep < 3 && templates.length > 0 && (
                      <Button
                        variant="contained"
                        startIcon={<FingerprintIcon />}
                        onClick={captureFingerprint}
                      >
                        Retry Capture {templates.length + 1}
                      </Button>
                    )}
                  </Box>
                </Box>
              ) : capturing || saving ? (
                // Capturing/Saving State
                <Box>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                    <CircularProgress 
                      size={100} 
                      thickness={2}
                      variant={countdown > 0 ? "determinate" : "indeterminate"}
                      value={countdown > 0 ? (countdown / (CAPTURE_TIMEOUT / 1000)) * 100 : undefined}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                      }}
                    >
                      {countdown > 0 ? (
                        <Typography variant="h4" color="primary">{countdown}</Typography>
                      ) : (
                        <FingerprintIcon sx={{ fontSize: 50, color: 'primary.main' }} />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {saving ? 'Saving Fingerprint...' : `Capture ${templates.length + 1} of 3`}
                  </Typography>
                  <Typography color="text.secondary">
                    {statusMessage || (saving ? 'Please wait...' : 'Keep finger on scanner...')}
                  </Typography>
                  {capturing && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                      <TouchAppIcon color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Keep finger steady
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                // Ready to Capture State
                <Box>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: 'primary.main',
                        transform: 'scale(1.05)',
                      },
                    }}
                    onClick={captureFingerprint}
                  >
                    <FingerprintIcon sx={{ fontSize: 60, color: 'white' }} />
                  </Box>
                  
                  <Typography variant="h5" gutterBottom>
                    Capture {activeStep + 1} of 3
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {statusMessage || (activeStep === 0 
                      ? 'Click the button to start'
                      : 'Lift finger and place again')}
                  </Typography>

                  {/* Capture Progress Indicators */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    {[0, 1, 2].map((index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: templates.length > index ? 'success.main' : 'grey.300',
                          color: 'white',
                          fontWeight: 'bold',
                          transition: 'all 0.3s',
                        }}
                      >
                        {templates.length > index ? <CheckCircleIcon /> : index + 1}
                      </Box>
                    ))}
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<FingerprintIcon />}
                    onClick={captureFingerprint}
                    disabled={capturing}
                    sx={{ px: 4, py: 1.5 }}
                  >
                    {activeStep === 0 ? 'Start Capture' : `Capture ${activeStep + 1}`}
                  </Button>
                </Box>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={capturing || saving}>
          {success ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FingerprintEnrollmentDialog;