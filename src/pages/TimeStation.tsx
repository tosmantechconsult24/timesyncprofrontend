/**
 * TimeStation.tsx - Main Kiosk Interface
 * USB Fingerprint Scanner based Time and Attendance System
 * For tablet/PC with ZKTECO 9500 USB fingerprint scanner
 */

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
  Card,
  CardContent,
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
  Divider,
  LinearProgress,
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
  Warning as WarningIcon,
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';

// Types
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: string;
  shift?: {
    name: string;
    startTime: string;
    endTime: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  photoUrl?: string;
}

interface FingerprintStatus {
  connected: boolean;
  ready: boolean;
  deviceId?: string;
}

interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
}

// Leave types
const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
];

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TimeStation: React.FC = () => {
  // State management
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scannerStatus, setScannerStatus] = useState<FingerprintStatus>({
    connected: false,
    ready: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [clockInDialogOpen, setClockInDialogOpen] = useState(false);
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [fingerprintDialogOpen, setFingerprintDialogOpen] = useState(false);

  // Form states
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaveType, setLeaveType] = useState('sick');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Fingerprint scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [fingerprintResult, setFingerprintResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [currentAction, setCurrentAction] = useState<'clock_in' | 'clock_out' | null>(null);

  // Initialize and check scanner connection
  useEffect(() => {
    const initializeScanner = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/fingerprint/status`);
        setScannerStatus(response.data);
      } catch (error) {
        console.error('Scanner initialization error:', error);
        setScannerStatus({ connected: false, ready: false });
      }
    };

    initializeScanner();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ============================================
  // EMPLOYEE LOOKUP
  // ============================================

  const handleEmployeeLookup = useCallback(async (empNumber: string) => {
    if (!empNumber.trim()) {
      toast.error('Please enter an employee number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/employees/lookup/${empNumber}`);
      const employee = response.data;

      if (employee.status !== 'active') {
        toast.error(`Employee status: ${employee.status}. Cannot proceed.`);
        setSelectedEmployee(null);
        return;
      }

      setSelectedEmployee(employee);
      toast.success(`Welcome ${employee.firstName} ${employee.lastName}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Employee not found');
      setSelectedEmployee(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================
  // FINGERPRINT SCANNING
  // ============================================

  const startFingerprintScan = useCallback(async (action: 'clock_in' | 'clock_out') => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }

    if (!scannerStatus.ready) {
      toast.error('Fingerprint scanner is not ready. Please check connection.');
      return;
    }

    setIsScanning(true);
    setCurrentAction(action);
    setScanProgress(0);
    setFingerprintResult(null);

    try {
      // Simulate scanning progress
      const progressInterval = setInterval(() => {
        setScanProgress((prev) => {
          const next = prev + Math.random() * 30;
          return next >= 100 ? 100 : next;
        });
      }, 300);

      // Simulate fingerprint capture (replace with actual scanner SDK call)
      const mockTemplate = `FINGERPRINT_${Date.now()}_${Math.random()}`;

      await new Promise((resolve) => setTimeout(resolve, 3000));
      clearInterval(progressInterval);
      setScanProgress(100);

      // Call appropriate endpoint based on action
      const endpoint = action === 'clock_in' ? '/time-entries/kiosk/clock-in' : '/time-entries/kiosk/clock-out';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        employeeId: selectedEmployee.employeeId,
        fingerprintTemplate: mockTemplate,
        verifyMethod: 'fingerprint',
        notes: `${action.replace('_', ' ')} via USB fingerprint scanner`,
      });

      setFingerprintResult({
        success: true,
        message: response.data.message || `${action === 'clock_in' ? 'Clocked in' : 'Clocked out'} successfully!`,
      });

      toast.success(response.data.message);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSelectedEmployee(null);
        setEmployeeNumber('');
        setFingerprintDialogOpen(false);
        setIsScanning(false);
      }, 3000);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Fingerprint verification failed';
      setFingerprintResult({
        success: false,
        message: errorMsg,
      });
      toast.error(errorMsg);
      setIsScanning(false);
    }
  }, [selectedEmployee, scannerStatus.ready]);

  // ============================================
  // CLOCK IN/OUT DIALOG HANDLERS
  // ============================================

  const handleClockInOpen = () => {
    setEmployeeNumber('');
    setSelectedEmployee(null);
    setCurrentAction('clock_in');
    setClockInDialogOpen(true);
  };

  const handleClockInClose = () => {
    setClockInDialogOpen(false);
    setEmployeeNumber('');
    setSelectedEmployee(null);
  };

  const handleProceedToFingerprint = async () => {
    await handleEmployeeLookup(employeeNumber);
    if (selectedEmployee) {
      setClockInDialogOpen(false);
      setFingerprintDialogOpen(true);
    }
  };

  const handleClockOutOpen = () => {
    setEmployeeNumber('');
    setSelectedEmployee(null);
    setCurrentAction('clock_out');
    setClockOutDialogOpen(true);
  };

  const handleClockOutClose = () => {
    setClockOutDialogOpen(false);
    setEmployeeNumber('');
    setSelectedEmployee(null);
  };

  // ============================================
  // LEAVE REQUEST
  // ============================================

  const handleSubmitLeaveRequest = async () => {
    if (!employeeNumber || !leaveType || !leaveStartDate || !leaveEndDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/leaves/kiosk/submit`, {
        employeeId: employeeNumber,
        leaveType,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason,
      });

      toast.success('Leave request submitted successfully!');
      setLeaveDialogOpen(false);
      setEmployeeNumber('');
      setLeaveType('sick');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // EMPLOYEE REGISTRATION
  // ============================================

  const handleEmployeeRegistration = async () => {
    if (!adminUsername || !adminPassword || !employeeNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // This would require an admin authentication endpoint
      // For now, show a placeholder
      toast.success('Admin authentication required');
      // Navigate to registration form or modal
    } catch (error: any) {
      toast.error('Admin authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // UI RENDERING
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
      }}
    >
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          background: 'white',
          marginBottom: 4,
          borderRadius: 2,
        }}
      >
        <Grid container spacing={3} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} sm={6}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333' }}>
              TimeSync Station
            </Typography>
            <Typography variant="body1" sx={{ color: '#666', mt: 1 }}>
              {formatDate(currentTime)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#667eea' }}>
              {formatTime(currentTime)}
            </Typography>
            <Chip
              label={scannerStatus.ready ? 'Scanner Ready' : 'Scanner Not Ready'}
              color={scannerStatus.ready ? 'success' : 'error'}
              size="small"
              sx={{ mt: 1 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Action Buttons */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
            startIcon={<ClockInIcon sx={{ fontSize: '2rem' }} />}
            onClick={handleClockInOpen}
            disabled={!scannerStatus.ready}
          >
            Clock In
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 4,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
            startIcon={<ClockOutIcon sx={{ fontSize: '2rem' }} />}
            onClick={handleClockOutOpen}
            disabled={!scannerStatus.ready}
          >
            Clock Out
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 4,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
            startIcon={<LeaveIcon sx={{ fontSize: '2rem' }} />}
            onClick={() => setLeaveDialogOpen(true)}
          >
            Leave Request
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              py: 4,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              fontSize: '1.1rem',
              fontWeight: 'bold',
            }}
            startIcon={<RegisterIcon sx={{ fontSize: '2rem' }} />}
            onClick={() => setRegisterDialogOpen(true)}
          >
            Register Employee
          </Button>
        </Grid>
      </Grid>

      {/* Scanner Status Alert */}
      {!scannerStatus.ready && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
          Fingerprint scanner is not connected. Please check the USB connection and ensure the ZKTECO
          9500 scanner is properly installed.
        </Alert>
      )}

      {/* ============================================
          DIALOGS
          ============================================ */}

      {/* Clock In Dialog */}
      <Dialog
        open={clockInDialogOpen}
        onClose={handleClockInClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#667eea' }}>
          Clock In
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {!selectedEmployee ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Please enter your employee number to proceed
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Employee Number"
                placeholder="e.g., EMP001"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleProceedToFingerprint()}
                disabled={isLoading}
                sx={{ mb: 2 }}
              />
            </>
          ) : (
            <Card sx={{ mb: 2, background: '#f5f5f5' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 60, height: 60, background: '#667eea' }}>
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selectedEmployee.shift?.name || 'No shift assigned'}
                    </Typography>
                    {selectedEmployee.shift && (
                      <Typography variant="caption" color="textSecondary">
                        {selectedEmployee.shift.startTime} - {selectedEmployee.shift.endTime}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClockInClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={selectedEmployee ? () => startFingerprintScan('clock_in') : handleProceedToFingerprint}
            disabled={isLoading}
            sx={{ background: '#667eea' }}
          >
            {selectedEmployee ? 'Scan Fingerprint' : 'Continue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clock Out Dialog */}
      <Dialog
        open={clockOutDialogOpen}
        onClose={handleClockOutClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#f5576c' }}>
          Clock Out
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {!selectedEmployee ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Please enter your employee number to clock out
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Employee Number"
                placeholder="e.g., EMP001"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleProceedToFingerprint()}
                disabled={isLoading}
                sx={{ mb: 2 }}
              />
            </>
          ) : (
            <Card sx={{ mb: 2, background: '#f5f5f5' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 60, height: 60, background: '#f5576c' }}>
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ready to clock out
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClockOutClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={selectedEmployee ? () => startFingerprintScan('clock_out') : handleProceedToFingerprint}
            disabled={isLoading}
            sx={{ background: '#f5576c' }}
          >
            {selectedEmployee ? 'Scan Fingerprint' : 'Continue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fingerprint Scanning Dialog */}
      <Dialog
        open={fingerprintDialogOpen}
        onClose={() => !isScanning && setFingerprintDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#667eea', display: 'flex', alignItems: 'center', gap: 1 }}>
          <FingerprintIcon /> Fingerprint Scanner
        </DialogTitle>
        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          {isScanning ? (
            <>
              <Box sx={{ my: 4 }}>
                <CircularProgress
                  variant="determinate"
                  value={scanProgress}
                  sx={{ width: 120, height: 120, mx: 'auto' }}
                />
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Scanning Fingerprint...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Please place your finger on the scanner
              </Typography>
              <LinearProgress
                variant="determinate"
                value={scanProgress}
                sx={{ mt: 3 }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                {Math.round(scanProgress)}%
              </Typography>
            </>
          ) : fingerprintResult ? (
            <>
              {fingerprintResult.success ? (
                <>
                  <SuccessIcon
                    sx={{
                      fontSize: 80,
                      color: '#4caf50',
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    Success!
                  </Typography>
                </>
              ) : (
                <>
                  <ErrorIcon
                    sx={{
                      fontSize: 80,
                      color: '#f44336',
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    Verification Failed
                  </Typography>
                </>
              )}
              <Typography variant="body1" sx={{ mt: 2 }}>
                {fingerprintResult.message}
              </Typography>
            </>
          ) : (
            <>
              <FingerprintIcon
                sx={{
                  fontSize: 100,
                  color: '#667eea',
                  mb: 2,
                }}
              />
              <Typography variant="h6" sx={{ mb: 1 }}>
                Ready to Scan
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Click "Start Scan" to begin fingerprint verification
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          {!isScanning && !fingerprintResult && (
            <Button
              variant="contained"
              onClick={() => {
                if (currentAction) {
                  startFingerprintScan(currentAction);
                }
              }}
              sx={{ background: '#667eea' }}
            >
              Start Scan
            </Button>
          )}
          {!isScanning && (
            <Button
              onClick={() => {
                setFingerprintDialogOpen(false);
                setFingerprintResult(null);
              }}
            >
              {fingerprintResult?.success ? 'Done' : 'Cancel'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#4facfe' }}>
          Leave Request
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Employee Number"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Leave Type</InputLabel>
            <Select
              value={leaveType}
              label="Leave Type"
              onChange={(e) => setLeaveType(e.target.value)}
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
            label="Start Date"
            type="date"
            value={leaveStartDate}
            onChange={(e) => setLeaveStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={leaveEndDate}
            onChange={(e) => setLeaveEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Reason (Optional)"
            multiline
            rows={3}
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitLeaveRequest}
            disabled={isLoading}
            sx={{ background: '#4facfe' }}
          >
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Registration Dialog */}
      <Dialog
        open={registerDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#43e97b' }}>
          Register Employee
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Admin credentials required to register new employees
          </Alert>
          <TextField
            fullWidth
            label="Admin/Manager Username"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Admin/Manager Password"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
            New Employee Information
          </Typography>
          <TextField
            fullWidth
            label="Employee Number"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="textSecondary">
            You will be guided through the enrollment process after authentication.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRegisterDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEmployeeRegistration}
            disabled={isLoading}
            sx={{ background: '#43e97b' }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeStation;
