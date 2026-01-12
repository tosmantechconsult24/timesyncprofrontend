// ============================================
// KioskSetup.tsx - Kiosk Configuration Page
// Allows configuring kiosk settings locally
// ============================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Divider,
  Chip,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  Fingerprint as FingerprintIcon,
  LocationOn as LocationIcon,
  Devices as DevicesIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  getKioskConfig,
  setKioskConfig,
  clearKioskConfig,
  getFullConfig,
  KioskConfig,
} from '../config/environment';

const KioskSetup: React.FC = () => {
  const [config, setConfig] = useState<KioskConfig>({
    location_id: '',
    kiosk_id: '',
    backend_url: 'https://timesyncprobackend.onrender.com',
    fingerprint_service_url: 'http://localhost:8080',
    kiosk_mode: false,
    company_name: '',
    location_name: '',
  });
  
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [fingerprintStatus, setFingerprintStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Load existing config on mount
  useEffect(() => {
    const existingConfig = getKioskConfig();
    if (existingConfig) {
      setConfig(existingConfig);
    }
    checkConnections();
  }, []);

  const checkConnections = async () => {
    // Check backend
    setBackendStatus('checking');
    try {
      const response = await fetch(`${config.backend_url}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      setBackendStatus(response.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }

    // Check fingerprint service
    setFingerprintStatus('checking');
    try {
      const response = await fetch(`${config.fingerprint_service_url}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      setFingerprintStatus(response.ok ? 'online' : 'offline');
    } catch {
      setFingerprintStatus('offline');
    }
  };

  const handleSave = () => {
    try {
      setKioskConfig(config);
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
      
      // Optionally save to fingerprint service
      fetch(`${config.fingerprint_service_url}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: config.location_id,
          kiosk_id: config.kiosk_id,
          backend_url: config.backend_url,
          company_name: config.company_name,
          location_name: config.location_name,
        }),
      }).catch(() => {
        // Ignore if fingerprint service not available
      });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReset = () => {
    clearKioskConfig();
    setConfig({
      location_id: '',
      kiosk_id: '',
      backend_url: 'https://timesyncprobackend.onrender.com',
      fingerprint_service_url: 'http://localhost:8080',
      kiosk_mode: false,
      company_name: '',
      location_name: '',
    });
    setSaved(false);
  };

  const handleChange = (field: keyof KioskConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const getStatusChip = (status: 'checking' | 'online' | 'offline') => {
    switch (status) {
      case 'checking':
        return <Chip label="Checking..." size="small" color="default" />;
      case 'online':
        return <Chip label="Online" size="small" color="success" icon={<CheckIcon />} />;
      case 'offline':
        return <Chip label="Offline" size="small" color="error" icon={<ErrorIcon />} />;
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DevicesIcon /> Kiosk Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure this device as a TimeSyncPro kiosk terminal. Settings are stored locally.
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configuration saved successfully!
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Connection Status
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CloudIcon color="primary" />
                  <Typography>Cloud Backend</Typography>
                </Box>
                {getStatusChip(backendStatus)}
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FingerprintIcon color="primary" />
                  <Typography>Fingerprint Service</Typography>
                </Box>
                {getStatusChip(fingerprintStatus)}
              </Paper>
            </Grid>
          </Grid>
          <Button
            startIcon={<RefreshIcon />}
            onClick={checkConnections}
            sx={{ mt: 2 }}
          >
            Refresh Status
          </Button>
        </CardContent>
      </Card>

      {/* Server Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CloudIcon /> Server Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Backend URL"
                value={config.backend_url}
                onChange={handleChange('backend_url')}
                placeholder="https://timesyncprobackend.onrender.com"
                helperText="Cloud backend API URL"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Fingerprint Service URL"
                value={config.fingerprint_service_url}
                onChange={handleChange('fingerprint_service_url')}
                placeholder="http://localhost:8080"
                helperText="Local fingerprint scanner service URL"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Location Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon /> Location & Device
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={config.company_name || ''}
                onChange={handleChange('company_name')}
                placeholder="Your Company"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location Name"
                value={config.location_name || ''}
                onChange={handleChange('location_name')}
                placeholder="Main Office"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location ID"
                value={config.location_id}
                onChange={handleChange('location_id')}
                placeholder="location-001"
                helperText="Unique identifier for this location"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Kiosk ID"
                value={config.kiosk_id}
                onChange={handleChange('kiosk_id')}
                placeholder="kiosk-001"
                helperText="Unique identifier for this device"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="large"
        >
          Save Configuration
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleReset}
          size="large"
        >
          Reset to Defaults
        </Button>
      </Box>

      {/* Current Config Debug */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Configuration
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <pre style={{ margin: 0, overflow: 'auto' }}>
              {JSON.stringify(getFullConfig(), null, 2)}
            </pre>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KioskSetup;
