// ============================================
// TerminalsSettings.tsx
// Terminal management using Bridge API directly
// ============================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Router as RouterIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';

// Bridge URL - Update this if your bridge runs on different host/port
const BRIDGE_URL = 'http://localhost:3000';

interface Terminal {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  isOnline: boolean;
  lastSync?: string;
  employeeCount?: number;
}

const TerminalsSettings: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchTerminals();
  }, []);

  const fetchTerminals = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check bridge health first
      const healthResponse = await fetch(`${BRIDGE_URL}/health`, {
        method: 'GET',
      }).catch(() => null);

      if (!healthResponse || !healthResponse.ok) {
        setBridgeOnline(false);
        setError('Bridge is not running');
        setLoading(false);
        return;
      }

      setBridgeOnline(true);

      // Fetch terminals from bridge
      const response = await fetch(`${BRIDGE_URL}/api/terminals`);
      if (!response.ok) throw new Error('Failed to fetch terminals');

      const data = await response.json();
      setTerminals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (terminalId: string) => {
    setTestingId(terminalId);

    try {
      const response = await fetch(`${BRIDGE_URL}/api/terminals/${terminalId}/test`, {
        method: 'POST',
      });
      const result = await response.json();

      setSnackbar({
        open: true,
        message: result.success ? '✓ Terminal is online!' : '✗ Terminal is offline',
        severity: result.success ? 'success' : 'error',
      });

      // Refresh list
      await fetchTerminals();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Test failed',
        severity: 'error',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncEmployees = async (terminalId: string) => {
    setSyncingId(terminalId);

    try {
      // Get users currently on terminal
      const response = await fetch(`${BRIDGE_URL}/api/terminals/${terminalId}/users`);
      const result = await response.json();

      setSnackbar({
        open: true,
        message: `Terminal has ${result.count || 0} users synced`,
        severity: 'success',
      });

      await fetchTerminals();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || 'Sync failed',
        severity: 'error',
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleCheckAll = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${BRIDGE_URL}/check-all`, { method: 'POST' });
      const result = await response.json();

      const online = result.results?.filter((t: any) => t.online).length || 0;
      const total = result.results?.length || 0;

      setSnackbar({
        open: true,
        message: `Checked ${total} terminals: ${online} online, ${total - online} offline`,
        severity: 'success',
      });

      await fetchTerminals();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error',
      });
      setLoading(false);
    }
  };

  // Bridge not running state
  if (!bridgeOnline && !loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouterIcon /> Terminals
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Bridge is not running
          </Typography>
          <Typography variant="body2">
            The TimeSync Bridge must be running to communicate with ZKTeco terminals.
          </Typography>
          <Box
            component="code"
            sx={{
              display: 'block',
              mt: 2,
              p: 1.5,
              bgcolor: 'grey.900',
              color: 'grey.100',
              borderRadius: 1,
              fontFamily: 'monospace',
            }}
          >
            cd bridge && npm start
          </Box>
        </Alert>

        <Button variant="contained" onClick={fetchTerminals} startIcon={<RefreshIcon />}>
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouterIcon /> Terminals
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleCheckAll}
            disabled={loading}
          >
            Check All
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setSnackbar({
                open: true,
                message: 'To add terminals, edit bridge/config.json',
                severity: 'success',
              });
            }}
          >
            Add Terminal
          </Button>
        </Box>
      </Box>

      {/* Bridge Status */}
      <Alert
        severity={bridgeOnline ? 'success' : 'warning'}
        sx={{ mb: 3 }}
        icon={bridgeOnline ? <CheckCircleIcon /> : <CancelIcon />}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>Bridge: {bridgeOnline ? 'Connected' : 'Disconnected'}</span>
          {bridgeOnline && (
            <Button
              size="small"
              color="inherit"
              href={`${BRIDGE_URL}/dashboard`}
              target="_blank"
            >
              Open Dashboard
            </Button>
          )}
        </Box>
      </Alert>

      {/* Error */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : terminals.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <RouterIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" gutterBottom>
              No terminals configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add terminals by editing <code>bridge/config.json</code>
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {terminals.map((terminal) => (
            <Grid item xs={12} md={6} key={terminal.id}>
              <Card
                sx={{
                  borderLeft: 4,
                  borderLeftColor: terminal.isOnline ? 'success.main' : 'error.main',
                }}
              >
                <CardContent>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {terminal.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {terminal.ipAddress}:{terminal.port}
                      </Typography>
                    </Box>
                    <Chip
                      icon={terminal.isOnline ? <WifiIcon /> : <WifiOffIcon />}
                      label={terminal.isOnline ? 'Online' : 'Offline'}
                      color={terminal.isOnline ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>

                  {/* Info */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users synced: {terminal.employeeCount || 0}
                    {terminal.lastSync && (
                      <> • Last check: {new Date(terminal.lastSync).toLocaleTimeString()}</>
                    )}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleTestConnection(terminal.id)}
                      disabled={testingId === terminal.id}
                      startIcon={testingId === terminal.id ? <CircularProgress size={16} /> : <RefreshIcon />}
                    >
                      Test
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSyncEmployees(terminal.id)}
                      disabled={syncingId === terminal.id || !terminal.isOnline}
                      startIcon={syncingId === terminal.id ? <CircularProgress size={16} /> : <SyncIcon />}
                    >
                      Sync
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TerminalsSettings;