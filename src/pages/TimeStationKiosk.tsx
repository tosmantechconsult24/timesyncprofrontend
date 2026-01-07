// ============================================
// TimeStationKiosk.tsx - Complete Kiosk Interface
// FIXED: Uses port 5000 for backend API
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  LinearProgress,
  Snackbar,
} from '@mui/material';
import {
  Login as ClockInIcon,
  Logout as ClockOutIcon,
  EventNote as LeaveIcon,
  PersonAdd as RegisterIcon,
  Fingerprint as FingerprintIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// ============================================
// CONFIGURATION - UPDATE THESE IF NEEDED
// ============================================
const FINGERPRINT_SERVICE_URL = 'http://localhost:8080';
const API_BASE_URL = 'http://localhost:5001/api';

// ============================================
// TYPES
// ============================================
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photo?: string;
  status: string;
  department?: { id: string; name: string };
  shift?: { id: string; name: string; startTime: string; endTime: string };
  fingerprintEnrolled: boolean;
  todayAttendance?: any[];
}

// ============================================
// LEAVE TYPES
// ============================================
const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
];

// ============================================
// MAIN COMPONENT
// ============================================
const TimeStationKiosk: React.FC = () => {
  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Scanner state
  const [scannerConnected, setScannerConnected] = useState(false);
  const [checkingScanner, setCheckingScanner] = useState(true);

  // Dialog states
  const [clockInDialogOpen, setClockInDialogOpen] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);

  // Employee lookup
  const [employeeId, setEmployeeId] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Fingerprint states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'failed' | null>(null);
  const [scanMessage, setScanMessage] = useState('');

  // Leave request
  const [leaveType, setLeaveType] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveFormComplete, setLeaveFormComplete] = useState(false); // NEW: Track if form is filled

  // Admin login for registration
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ============================================
  // EFFECTS
  // ============================================
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check scanner connection
  const checkScannerConnection = useCallback(async () => {
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        const data = await response.json();
        const isConnected = data.device_opened === true || data.mock_mode === true;
        setScannerConnected(isConnected);
        return isConnected;
      }
      setScannerConnected(false);
      return false;
    } catch (e) {
      setScannerConnected(false);
      return false;
    } finally {
      setCheckingScanner(false);
    }
  }, []);

  useEffect(() => {
    checkScannerConnection();
    const interval = setInterval(checkScannerConnection, 5000);
    return () => clearInterval(interval);
  }, [checkScannerConnection]);

  // ============================================
  // HELPERS
  // ============================================
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // ============================================
  // EMPLOYEE LOOKUP
  // ============================================
  
  const lookupEmployee = async (id: string) => {
    if (!id.trim()) {
      setLookupError('Please enter your Employee ID');
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setEmployee(null);

    try {
      console.log('[Kiosk] Looking up employee:', id);
      const response = await fetch(`${API_BASE_URL}/employees/lookup/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Employee not found. Please check your ID.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to lookup employee');
      }

      const data = await response.json();
      console.log('[Kiosk] Employee found:', data.firstName, data.lastName);
      
      if (data.status === 'inactive' || data.status === 'terminated') {
        throw new Error(`Your account is ${data.status}. Please contact HR.`);
      }

      setEmployee({
        id: data.id,
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        photo: data.photo,
        status: data.status,
        department: data.department,
        shift: data.shift,
        fingerprintEnrolled: data.fingerprintEnrolled || false,
        todayAttendance: data.todayAttendance,
      });
    } catch (e: any) {
      console.error('[Kiosk] Lookup error:', e);
      setLookupError(e.message);
    } finally {
      setLookupLoading(false);
    }
  };

  // ============================================
  // FINGERPRINT CAPTURE & VERIFY
  // ============================================
  
  const captureFingerprint = async (): Promise<string | null> => {
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to capture fingerprint');
      }

      return data.template;
    } catch (e: any) {
      throw new Error(e.message || 'Capture failed. Place finger firmly on scanner.');
    }
  };

  const verifyFingerprint = async (storedTemplate: string, capturedTemplate: string): Promise<boolean> => {
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
      
      if (!data.success) {
        return false;
      }

      return data.matched === true || (data.score && data.score > 0);
    } catch (e) {
      return false;
    }
  };

  // ============================================
  // CLOCK IN/OUT HANDLER
  // ============================================
  
  const handleFingerprintScan = async (action: 'clock_in' | 'clock_out') => {
    if (!employee) return;

    setScanning(true);
    setScanResult(null);
    setScanMessage('Place your finger on the scanner...');

    try {
      // Step 1: Capture fingerprint
      console.log('[Kiosk] Capturing fingerprint...');
      const capturedTemplate = await captureFingerprint();
      
      if (!capturedTemplate) {
        throw new Error('Failed to capture fingerprint. Please try again.');
      }
      console.log('[Kiosk] Fingerprint captured');

      setScanMessage('Verifying fingerprint...');

      // Step 2: Get stored template from backend
      console.log('[Kiosk] Fetching stored template for:', employee.id);
      const templateResponse = await fetch(`${API_BASE_URL}/employees/fingerprint-template/${employee.id}`);
      
      if (!templateResponse.ok) {
        const errorData = await templateResponse.json().catch(() => ({}));
        if (templateResponse.status === 404) {
          throw new Error('No fingerprint registered. Please enroll your fingerprint first.');
        }
        throw new Error(errorData.error || 'Failed to fetch fingerprint data');
      }
      
      const templateData = await templateResponse.json();
      const storedTemplate = templateData.template;

      if (!storedTemplate) {
        throw new Error('No fingerprint template found. Please enroll first.');
      }
      console.log('[Kiosk] Got stored template, verifying...');

      // Step 3: Verify fingerprint match
      const isMatch = await verifyFingerprint(storedTemplate, capturedTemplate);
      console.log('[Kiosk] Match result:', isMatch);

      if (!isMatch) {
        throw new Error('Fingerprint does not match. Please try again.');
      }

      setScanMessage('Recording attendance...');

      // Step 4: Record attendance
      console.log('[Kiosk] Recording attendance...');
      const attendanceResponse = await fetch(`${API_BASE_URL}/attendance/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          type: action,
          timestamp: new Date().toISOString(),
          verificationMethod: 'FINGERPRINT',
        }),
      });

      if (!attendanceResponse.ok) {
        const errorData = await attendanceResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record attendance');
      }

      const attendanceResult = await attendanceResponse.json();
      console.log('[Kiosk] Attendance recorded:', attendanceResult);

      setScanResult('success');
      setScanMessage(attendanceResult.message || (
        action === 'clock_in'
          ? `Welcome, ${employee.firstName}! Clocked in at ${formatTime(new Date())}`
          : `Goodbye, ${employee.firstName}! Clocked out at ${formatTime(new Date())}`
      ));

      // Auto close after success
      setTimeout(() => {
        resetAndClose();
      }, 3000);

    } catch (e: any) {
      console.error('[Kiosk] Error:', e);
      setScanResult('failed');
      setScanMessage(e.message || 'An error occurred. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // ============================================
  // LEAVE REQUEST HANDLER
  // ============================================
  
  const handleLeaveFormSubmit = async () => {
    if (!employee || !leaveType || !leaveStartDate || !leaveEndDate) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }
    // Form is complete, now show fingerprint scanner
    setLeaveFormComplete(true);
    setScanMessage('Place your finger on the scanner to authorize leave request...');
    setScanning(true);
  };

  const handleLeaveFingerPrintVerification = async () => {
    if (!employee) {
      showSnackbar('Employee not found', 'error');
      return;
    }

    setLeaveSubmitting(true);

    try {
      // Verify identity with fingerprint
      const capturedTemplate = await captureFingerprint();
      
      if (!capturedTemplate) {
        throw new Error('Failed to capture fingerprint');
      }

      setScanMessage('Verifying identity...');

      const templateResponse = await fetch(`${API_BASE_URL}/employees/fingerprint-template/${employee.id}`);
      if (!templateResponse.ok) {
        throw new Error('No fingerprint registered');
      }
      
      const { template: storedTemplate } = await templateResponse.json();
      const isMatch = await verifyFingerprint(storedTemplate, capturedTemplate);
      
      if (!isMatch) {
        throw new Error('Fingerprint verification failed');
      }

      setScanMessage('Submitting leave request...');

      // Submit leave request
      const response = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to submit leave request');
      }

      setScanResult('success');
      setScanMessage('Leave request submitted successfully!');
      showSnackbar('Leave request submitted with fingerprint authorization', 'success');

      setTimeout(() => {
        resetAndClose();
      }, 3000);

    } catch (e: any) {
      setScanResult('failed');
      setScanMessage(e.message);
      showSnackbar(e.message, 'error');
    } finally {
      setLeaveSubmitting(false);
      setScanning(false);
    }
  };

  // ============================================
  // ADMIN LOGIN FOR REGISTRATION
  // ============================================
  
  const handleAdminLogin = async () => {
    setAdminError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      
      if (!['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'].includes(data.user?.role)) {
        throw new Error('Admin access required');
      }

      setAdminAuthenticated(true);
      localStorage.setItem('kiosk_admin_token', data.token);

    } catch (e: any) {
      setAdminError(e.message);
    }
  };

  // ============================================
  // RESET STATES
  // ============================================
  
  const resetAndClose = () => {
    setEmployeeId('');
    setEmployee(null);
    setLookupError(null);
    setScanResult(null);
    setScanMessage('');
    setScanning(false);
    setLeaveType('');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
    setLeaveFormComplete(false);
    setLeaveDialogOpen(false);
    setLeaveType('');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveReason('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminAuthenticated(false);
    setAdminError(null);
    setClockInDialogOpen(false);
    setClockOutDialogOpen(false);
    setLeaveDialogOpen(false);
    setRegisterDialogOpen(false);
  };

  // ============================================
  // RENDER EMPLOYEE LOOKUP STEP
  // ============================================
  
  const renderEmployeeLookup = () => (
    <Box sx={{ py: 2 }}>
      <Typography variant="body1" color="white" gutterBottom>
        Enter your Employee ID:
      </Typography>
      <TextField
        fullWidth
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        placeholder="e.g., 1001"
        variant="outlined"
        sx={{ 
          mb: 2, 
          '& .MuiOutlinedInput-root': { 
            color: 'white', 
            bgcolor: 'rgba(255,255,255,0.1)',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
          } 
        }}
        onKeyPress={(e) => e.key === 'Enter' && lookupEmployee(employeeId)}
        autoFocus
      />
      {lookupError && (
        <Alert severity="error" sx={{ mb: 2 }}>{lookupError}</Alert>
      )}
      <Button
        fullWidth
        variant="contained"
        onClick={() => lookupEmployee(employeeId)}
        disabled={!employeeId || lookupLoading}
        sx={{ py: 1.5 }}
      >
        {lookupLoading ? <CircularProgress size={24} /> : 'Continue'}
      </Button>
    </Box>
  );

  // ============================================
  // RENDER SCAN RESULT
  // ============================================
  
  const renderScanResult = () => (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      {scanResult === 'success' ? (
        <SuccessIcon sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
      ) : (
        <ErrorIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2 }} />
      )}
      <Typography variant="h6" color="white">{scanMessage}</Typography>
      {scanResult === 'failed' && (
        <Button 
          variant="outlined" 
          sx={{ mt: 2, color: 'white', borderColor: 'white' }}
          onClick={() => {
            setScanResult(null);
            setScanMessage('');
          }}
        >
          Try Again
        </Button>
      )}
    </Box>
  );

  // ============================================
  // RENDER FINGERPRINT SCAN
  // ============================================
  
  const renderFingerprintScan = (action: 'clock_in' | 'clock_out') => (
    <Box sx={{ py: 2 }}>
      {/* Employee Info */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={employee?.photo} 
            sx={{ 
              width: 60, 
              height: 60, 
              bgcolor: action === 'clock_in' ? '#22c55e' : '#ef4444' 
            }}
          >
            {employee?.firstName?.[0]}{employee?.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h6" color="white">
              {employee?.firstName} {employee?.lastName}
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              {employee?.department?.name || 'No Department'}
            </Typography>
            {!employee?.fingerprintEnrolled && (
              <Chip 
                label="Fingerprint Not Enrolled" 
                size="small" 
                color="warning" 
                sx={{ mt: 0.5 }}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Shift Info */}
      {employee?.shift && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TimeIcon sx={{ color: '#f59e0b' }} />
            <Typography variant="subtitle1" color="white">Today's Shift</Typography>
          </Box>
          <Typography variant="h5" color="#4ade80">
            {employee.shift.name}
          </Typography>
          <Typography variant="body1" color="rgba(255,255,255,0.7)">
            {employee.shift.startTime} - {employee.shift.endTime}
          </Typography>
        </Paper>
      )}

      {/* Fingerprint Scan */}
      <Box sx={{ textAlign: 'center' }}>
        {scanning ? (
          <Box>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              <CircularProgress size={80} sx={{ color: action === 'clock_in' ? '#22c55e' : '#ef4444' }} />
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
                }}
              >
                <FingerprintIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
            </Box>
            <Typography color="white">{scanMessage}</Typography>
            <LinearProgress 
              sx={{ 
                mt: 2, 
                maxWidth: 300, 
                mx: 'auto',
                '& .MuiLinearProgress-bar': {
                  bgcolor: action === 'clock_in' ? '#22c55e' : '#ef4444'
                }
              }} 
            />
          </Box>
        ) : (
          <Button
            variant="contained"
            size="large"
            onClick={() => handleFingerprintScan(action)}
            disabled={!employee?.fingerprintEnrolled}
            sx={{
              py: 3,
              px: 6,
              fontSize: '1.2rem',
              background: action === 'clock_in' 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}
            startIcon={<FingerprintIcon sx={{ fontSize: 32 }} />}
          >
            {employee?.fingerprintEnrolled 
              ? `Scan to ${action === 'clock_in' ? 'Clock In' : 'Clock Out'}`
              : 'Fingerprint Not Enrolled'}
          </Button>
        )}
        
        {!employee?.fingerprintEnrolled && (
          <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
            Your fingerprint is not enrolled. Please contact admin to register your fingerprint.
          </Alert>
        )}
      </Box>
    </Box>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
          ⏰ TimeSync
        </Typography>
        <Typography variant="h1" sx={{ color: '#4ade80', fontWeight: 'bold', fontSize: '4rem' }}>
          {formatTime(currentTime)}
        </Typography>
        <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          {formatDate(currentTime)}
        </Typography>
      </Box>

      {/* Scanner Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4 }}>
        <Chip
          icon={checkingScanner ? <CircularProgress size={16} /> : <FingerprintIcon />}
          label={checkingScanner ? 'Checking scanner...' : scannerConnected ? 'Scanner Connected' : 'Scanner Disconnected'}
          color={scannerConnected ? 'success' : 'error'}
        />
        <IconButton 
          size="small" 
          onClick={checkScannerConnection}
          sx={{ color: 'white' }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* API Status */}
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
        Backend: {API_BASE_URL}
      </Typography>

      {/* Main Action Buttons */}
      <Grid container spacing={3} sx={{ maxWidth: 800 }}>
        <Grid item xs={6}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setClockInDialogOpen(true)}
            disabled={!scannerConnected}
            sx={{
              py: 6,
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
              '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
              borderRadius: 4,
            }}
            startIcon={<ClockInIcon sx={{ fontSize: 40 }} />}
          >
            CLOCK IN
          </Button>
        </Grid>

        <Grid item xs={6}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setClockOutDialogOpen(true)}
            disabled={!scannerConnected}
            sx={{
              py: 6,
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' },
              '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
              borderRadius: 4,
            }}
            startIcon={<ClockOutIcon sx={{ fontSize: 40 }} />}
          >
            CLOCK OUT
          </Button>
        </Grid>

        <Grid item xs={6}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setLeaveDialogOpen(true)}
            sx={{
              py: 4,
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
              borderRadius: 4,
            }}
            startIcon={<LeaveIcon sx={{ fontSize: 32 }} />}
          >
            LEAVE REQUEST
          </Button>
        </Grid>

        <Grid item xs={6}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => setRegisterDialogOpen(true)}
            sx={{
              py: 4,
              fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' },
              borderRadius: 4,
            }}
            startIcon={<RegisterIcon sx={{ fontSize: 32 }} />}
          >
            REGISTER EMPLOYEE
          </Button>
        </Grid>
      </Grid>

      {/* Clock In Dialog */}
      <Dialog
        open={clockInDialogOpen}
        onClose={resetAndClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#1a1a2e' } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClockInIcon color="success" />
            Clock In
          </Box>
          <IconButton onClick={resetAndClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {!employee ? renderEmployeeLookup() 
           : scanResult ? renderScanResult() 
           : renderFingerprintScan('clock_in')}
        </DialogContent>
      </Dialog>

      {/* Clock Out Dialog */}
      <Dialog
        open={clockOutDialogOpen}
        onClose={resetAndClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#1a1a2e' } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClockOutIcon color="error" />
            Clock Out
          </Box>
          <IconButton onClick={resetAndClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {!employee ? renderEmployeeLookup() 
           : scanResult ? renderScanResult() 
           : renderFingerprintScan('clock_out')}
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={resetAndClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#1a1a2e' } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LeaveIcon sx={{ color: '#f59e0b' }} />
            Leave Request
          </Box>
          <IconButton onClick={resetAndClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {!employee ? (
            renderEmployeeLookup()
          ) : leaveFormComplete && !scanResult ? (
            // Show fingerprint scanner after form is filled
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <FingerprintIcon sx={{ fontSize: 80, color: '#f59e0b', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Verify with Fingerprint
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                {scanMessage || 'Place your finger on the scanner to authorize this leave request'}
              </Typography>
              
              {scanning && <CircularProgress sx={{ color: '#f59e0b', mb: 2 }} />}
              
              {!scanning && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleLeaveFingerPrintVerification}
                  disabled={leaveSubmitting}
                  sx={{ 
                    py: 1.5,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                  }}
                >
                  {leaveSubmitting ? <CircularProgress size={24} /> : 'Scan Fingerprint'}
                </Button>
              )}

              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setLeaveFormComplete(false);
                  setScanning(false);
                }}
                disabled={leaveSubmitting}
                sx={{ mt: 1, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Back to Form
              </Button>
            </Box>
          ) : scanResult ? (
            renderScanResult()
          ) : (
            // Show leave request form
            <Box sx={{ py: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Leave Type</InputLabel>
                <Select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  label="Leave Type"
                  sx={{ 
                    color: 'white', 
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  {LEAVE_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason (Optional)"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleLeaveFormSubmit}
                disabled={!leaveType || !leaveStartDate || !leaveEndDate}
                sx={{ 
                  py: 1.5,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                }}
              >
                Next: Fingerprint Authorization
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Register Employee Dialog */}
      <Dialog
        open={registerDialogOpen}
        onClose={resetAndClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: '#1a1a2e' } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RegisterIcon sx={{ color: '#6366f1' }} />
            Register Employee
          </Box>
          <IconButton onClick={resetAndClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {!adminAuthenticated ? (
            <Box sx={{ py: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Admin authentication required
              </Alert>
              <TextField
                fullWidth
                label="Admin Email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                }}
              />
              {adminError && <Alert severity="error" sx={{ mb: 2 }}>{adminError}</Alert>}
              <Button
                fullWidth
                variant="contained"
                onClick={handleAdminLogin}
                sx={{ 
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                }}
              >
                Login to Continue
              </Button>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Admin authenticated. You can now register employees.
              </Alert>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  window.open('/employees/new', '_blank');
                  resetAndClose();
                }}
                sx={{ 
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                }}
              >
                Open Employee Registration
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          TimeSync Attendance System v1.0
        </Typography>
        {!scannerConnected && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mt: 1 }}>
            Start fingerprint service: python usb-fingerprint-service.py
          </Typography>
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TimeStationKiosk;