// ============================================
// USBFingerprintScanner.tsx
// Settings page component for managing USB scanner
// ============================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  PowerSettingsNew as PowerIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Usb as UsbIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const FINGERPRINT_SERVICE_URL = 'http://localhost:8080';

interface ScannerStatus {
  status: string;
  device_opened: boolean;
  initialized: boolean;
  mock_mode: boolean;
  enrolled_count: number;
  fp_width?: number;
  fp_height?: number;
}

const USBFingerprintScanner: React.FC = () => {
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<string[]>([]);
  
  // Test capture state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureResult, setCaptureResult] = useState<any>(null);

  // Check scanner status
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/health`);
      if (!response.ok) throw new Error('Service not responding');
      const data = await response.json();
      setStatus(data);
      
      // Also fetch enrolled users
      const enrolledResponse = await fetch(`${FINGERPRINT_SERVICE_URL}/enrolled`);
      if (enrolledResponse.ok) {
        const enrolledData = await enrolledResponse.json();
        setEnrolledUsers(enrolledData.enrolled || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to connect to fingerprint service');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Initialize scanner
  const initializeScanner = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/init`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        await checkStatus();
      } else {
        setError(data.error || 'Failed to initialize scanner');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Test capture
  const testCapture = async () => {
    setCapturing(true);
    setCaptureResult(null);
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/capture`, {
        method: 'POST',
      });
      const data = await response.json();
      setCaptureResult(data);
    } catch (e: any) {
      setCaptureResult({ success: false, error: e.message });
    } finally {
      setCapturing(false);
    }
  };

  // Clear enrolled templates
  const clearEnrolled = async () => {
    if (!window.confirm('Are you sure you want to clear all enrolled fingerprints from scanner memory?')) {
      return;
    }
    try {
      const response = await fetch(`${FINGERPRINT_SERVICE_URL}/clear`, {
        method: 'POST',
      });
      if (response.ok) {
        await checkStatus();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll status every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.device_opened || status?.mock_mode;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FingerprintIcon /> USB Fingerprint Scanner
      </Typography>

      {/* Connection Status Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isConnected ? 'success.light' : 'error.light',
                }}
              >
                {loading ? (
                  <CircularProgress size={30} />
                ) : isConnected ? (
                  <CheckCircleIcon sx={{ fontSize: 30, color: 'success.main' }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 30, color: 'error.main' }} />
                )}
              </Box>
              <Box>
                <Typography variant="h6">
                  {loading ? 'Checking...' : isConnected ? 'Scanner Connected' : 'Scanner Disconnected'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {status?.mock_mode ? 'Running in Mock Mode (Testing)' : 
                   isConnected ? 'ZKTeco ZK9500 Ready' : 
                   'Start the fingerprint service'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={checkStatus}
                disabled={loading}
              >
                Refresh
              </Button>
              {!isConnected && (
                <Button
                  variant="contained"
                  startIcon={<PowerIcon />}
                  onClick={initializeScanner}
                  disabled={loading}
                >
                  Initialize
                </Button>
              )}
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              <Typography variant="body2" sx={{ mt: 1 }}>
                Make sure the Python fingerprint service is running:
                <code style={{ display: 'block', marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                  python usb-fingerprint-service.py
                </code>
              </Typography>
            </Alert>
          )}

          {status && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <UsbIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">Device</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {status.device_opened ? 'Connected' : 'Not Found'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">Mode</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {status.mock_mode ? 'Mock' : 'Production'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <PersonIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">Enrolled</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {status.enrolled_count} users
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">Resolution</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {status.fp_width || 256}x{status.fp_height || 288}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      {isConnected && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Scanner Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FingerprintIcon />}
                onClick={() => setTestDialogOpen(true)}
              >
                Test Capture
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearEnrolled}
                disabled={enrolledUsers.length === 0}
              >
                Clear Enrolled ({enrolledUsers.length})
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Enrolled Users */}
      {isConnected && enrolledUsers.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Enrolled in Scanner Memory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These fingerprints are loaded in the scanner's memory for quick 1:N identification.
              Your database may have more enrolled employees.
            </Typography>
            <List dense>
              {enrolledUsers.map((userId) => (
                <ListItem key={userId}>
                  <ListItemIcon>
                    <FingerprintIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Employee ID: ${userId}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Enrolled" size="small" color="success" variant="outlined" />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Instructions when disconnected */}
      {!isConnected && !loading && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Setup Instructions
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>1.</ListItemIcon>
                <ListItemText 
                  primary="Install ZKTeco SDK"
                  secondary="Run setup.exe from ZKFinger SDK to install drivers"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>2.</ListItemIcon>
                <ListItemText 
                  primary="Connect ZK9500 Scanner"
                  secondary="Plug the USB fingerprint scanner into your computer"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>3.</ListItemIcon>
                <ListItemText 
                  primary="Start Fingerprint Service"
                  secondary={
                    <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>
                      python usb-fingerprint-service.py
                    </code>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>4.</ListItemIcon>
                <ListItemText 
                  primary="For Testing (No Scanner)"
                  secondary={
                    <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>
                      python usb-fingerprint-service.py --mock
                    </code>
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      {/* Test Capture Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Fingerprint Capture</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {capturing ? (
              <Box>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography>Place your finger on the scanner...</Typography>
                <LinearProgress sx={{ mt: 2 }} />
              </Box>
            ) : captureResult ? (
              <Box>
                {captureResult.success ? (
                  <>
                    <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" color="success.main">Capture Successful!</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Template size: {captureResult.size} bytes
                    </Typography>
                    <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.100', maxHeight: 100, overflow: 'auto' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {captureResult.template?.substring(0, 200)}...
                      </Typography>
                    </Paper>
                  </>
                ) : (
                  <>
                    <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                    <Typography variant="h6" color="error.main">Capture Failed</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {captureResult.error}
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Box>
                <FingerprintIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography>Click the button below to test fingerprint capture</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={testCapture}
            disabled={capturing}
            startIcon={capturing ? <CircularProgress size={20} /> : <FingerprintIcon />}
          >
            {capturing ? 'Capturing...' : captureResult ? 'Try Again' : 'Capture'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default USBFingerprintScanner;