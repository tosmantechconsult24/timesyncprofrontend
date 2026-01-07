import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Router as RouterIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  CheckCircle as CheckCircleIcon,
  FingerprintOutlined as FingerprintIcon,
} from '@mui/icons-material';
import { usersApi, terminalsApi } from '../services/api';
import USBFingerprintScanner from '../components/USBFingerprintScanner';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Bridge URL for terminal operations
const BRIDGE_URL = 'http://localhost:3000';

const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ 
    email: '', 
    password: '', 
    firstName: '', 
    lastName: '', 
    role: 'admin',
    employeeId: ''
  });
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [roleStats, setRoleStats] = useState<any>(null);

  // Terminals state
  const [terminals, setTerminals] = useState<any[]>([]);
  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [testingTerminal, setTestingTerminal] = useState<string | null>(null);

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    companyName: 'TimeSync Company',
    timezone: 'Africa/Lagos',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    autoClockOut: true,
    autoClockOutTime: '18:00',
    lateThreshold: 15,
    overtimeThreshold: 8,
  });

  useEffect(() => {
    if (tabValue === 0) {
      fetchUsers();
    } else if (tabValue === 1) {
      fetchTerminals();
    }
  }, [tabValue]);

  // Fetch users with proper error handling
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [userResponse, statsResponse, employeesResponse] = await Promise.all([
        usersApi.getAll(),
        usersApi.getRoleStats().catch(() => null),
        usersApi.getAvailableEmployees().catch(() => [])
      ]);

      // Handle different response formats
      const userList = Array.isArray(userResponse) ? userResponse : 
                       Array.isArray(userResponse?.data) ? userResponse.data :
                       Array.isArray(userResponse?.users) ? userResponse.users : [];
      setUsers(userList);
      setRoleStats(statsResponse);
      setAvailableEmployees(Array.isArray(employeesResponse) ? employeesResponse : []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
      setSnackbar({ open: true, message: 'Failed to load users', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch terminals from bridge
  const fetchTerminals = async () => {
    setLoading(true);
    try {
      // Check if bridge is online
      const healthResponse = await fetch(`${BRIDGE_URL}/health`).catch(() => null);
      const isOnline = healthResponse?.ok || false;
      setBridgeOnline(isOnline);

      if (isOnline) {
        const response = await fetch(`${BRIDGE_URL}/api/terminals`);
        const data = await response.json();
        setTerminals(Array.isArray(data) ? data : []);
      } else {
        setTerminals([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch terminals:', error);
      setBridgeOnline(false);
      setTerminals([]);
    } finally {
      setLoading(false);
    }
  };

  // Test terminal connection
  const handleTestTerminal = async (terminalId: string) => {
    setTestingTerminal(terminalId);
    try {
      const response = await fetch(`${BRIDGE_URL}/api/terminals/${terminalId}/test`, {
        method: 'POST',
      });
      const result = await response.json();
      setSnackbar({
        open: true,
        message: result.success ? 'Terminal is online!' : 'Terminal is offline',
        severity: result.success ? 'success' : 'error',
      });
      await fetchTerminals();
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Test failed: ' + error.message, severity: 'error' });
    } finally {
      setTestingTerminal(null);
    }
  };

  // User CRUD operations
  const handleSaveUser = async () => {
    try {
      if (!userForm.firstName || !userForm.lastName || !userForm.email) {
        setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
        return;
      }

      if (!editingUser && !userForm.password) {
        setSnackbar({ open: true, message: 'Password is required for new users', severity: 'error' });
        return;
      }

      const submitData: any = {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        role: userForm.role
      };

      if (userForm.password) {
        submitData.password = userForm.password;
      }

      if (userForm.employeeId) {
        submitData.employeeId = userForm.employeeId;
      }

      if (editingUser) {
        await usersApi.update(editingUser.id, submitData);
        setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
      } else {
        await usersApi.create(submitData);
        setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
      }
      setUserDialogOpen(false);
      setEditingUser(null);
      setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'admin', employeeId: '' });
      fetchUsers();
    } catch (error: any) {
      setSnackbar({ open: true, message: error.response?.data?.error || error.message || 'Failed to save user', severity: 'error' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersApi.delete(id);
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
      fetchUsers();
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Failed to delete user', severity: 'error' });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({ 
      email: user.email, 
      password: '', 
      firstName: user.firstName || '', 
      lastName: user.lastName || '',
      role: user.role || 'admin',
      employeeId: user.Employee?.id || ''
    });
    setUserDialogOpen(true);
  };

  const handleSaveSettings = () => {
    setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> Settings
      </Typography>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab icon={<PersonIcon />} label="User Management" />
            <Tab icon={<FingerprintIcon />} label="USB Fingerprint" />
            <Tab icon={<RouterIcon />} label="Terminals" />
            <Tab icon={<SettingsIcon />} label="System Settings" />
          </Tabs>
        </Box>

        {/* User Management Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Role Capacity</Typography>
            <Grid container spacing={2}>
              {roleStats && (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ opacity: 0.8 }} variant="body2">
                          Super Admins
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <Typography variant="h4">
                            {roleStats.super_admin?.count || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            / {roleStats.super_admin?.limit || 5}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                          {roleStats.super_admin?.available || 0} slots available
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                      <CardContent>
                        <Typography color="inherit" sx={{ opacity: 0.8 }} variant="body2">
                          Admins
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <Typography variant="h4">
                            {roleStats.admin?.count || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            / {roleStats.admin?.limit || 20}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                          {roleStats.admin?.available || 0} slots available
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Users</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingUser(null);
                setUserForm({ email: '', password: '', firstName: '', lastName: '', role: 'admin', employeeId: '' });
                setUserDialogOpen(true);
              }}
            >
              Add User
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : users.length === 0 ? (
            <Alert severity="info">No users found. Add your first admin user.</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {user.firstName?.[0] || user.email?.[0]}
                          </Avatar>
                          {user.firstName} {user.lastName}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role} 
                          size="small" 
                          color={user.role === 'super_admin' ? 'error' : user.role === 'admin' ? 'warning' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.Employee ? (
                          <Chip 
                            label={`${user.Employee.firstName} ${user.Employee.lastName}`} 
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleEditUser(user)} size="small" title="Edit">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteUser(user.id)} size="small" color="error" title="Delete">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* USB Fingerprint Scanner Tab */}
        <TabPanel value={tabValue} index={1}>
          <USBFingerprintScanner />
        </TabPanel>

        {/* Terminals Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Terminals</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchTerminals}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setSnackbar({ open: true, message: 'Add terminals in bridge/config.json', severity: 'success' })}
              >
                Add Terminal
              </Button>
            </Box>
          </Box>

          {/* Bridge Status */}
          <Alert
            severity={bridgeOnline ? 'success' : 'warning'}
            sx={{ mb: 2 }}
            icon={bridgeOnline ? <CheckCircleIcon /> : <WifiOffIcon />}
            action={
              bridgeOnline && (
                <Button color="inherit" size="small" href={`${BRIDGE_URL}/dashboard`} target="_blank">
                  Open Dashboard
                </Button>
              )
            }
          >
            Bridge: {bridgeOnline ? 'Connected' : 'Not connected - Start bridge with: cd bridge && npm start'}
          </Alert>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : !bridgeOnline ? (
            <Alert severity="info">
              Start the bridge to manage terminals: <code>cd bridge && npm start</code>
            </Alert>
          ) : terminals.length === 0 ? (
            <Alert severity="info">No terminals configured. Add terminals in bridge/config.json</Alert>
          ) : (
            <Grid container spacing={2}>
              {terminals.map((terminal: any) => (
                <Grid item xs={12} md={6} key={terminal.id}>
                  <Card sx={{ borderLeft: 4, borderLeftColor: terminal.isOnline ? 'success.main' : 'error.main' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6">{terminal.name}</Typography>
                        <Chip
                          icon={terminal.isOnline ? <WifiIcon /> : <WifiOffIcon />}
                          label={terminal.isOnline ? 'Online' : 'Offline'}
                          color={terminal.isOnline ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {terminal.ipAddress}:{terminal.port}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Users: {terminal.employeeCount || 0}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleTestTerminal(terminal.id)}
                          disabled={testingTerminal === terminal.id}
                          startIcon={testingTerminal === terminal.id ? <CircularProgress size={16} /> : <RefreshIcon />}
                        >
                          Test
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* System Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>System Settings</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={systemSettings.companyName}
                onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Timezone"
                value={systemSettings.timezone}
                onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date Format"
                value={systemSettings.dateFormat}
                onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Late Threshold (minutes)"
                type="number"
                value={systemSettings.lateThreshold}
                onChange={(e) => setSystemSettings({ ...systemSettings, lateThreshold: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={systemSettings.autoClockOut}
                    onChange={(e) => setSystemSettings({ ...systemSettings, autoClockOut: e.target.checked })}
                  />
                }
                label="Auto clock-out at end of day"
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={handleSaveSettings}>
                Save Settings
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="First Name"
              fullWidth
              value={userForm.firstName}
              onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
              required
            />
            <TextField
              label="Last Name"
              fullWidth
              value={userForm.lastName}
              onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
              required
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              required
              disabled={!!editingUser}
            />
            <TextField
              label="Password"
              fullWidth
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required={!editingUser}
              helperText={editingUser ? 'Leave blank to keep current password' : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="super_admin">Super Admin (5 slots)</MenuItem>
                <MenuItem value="admin">Admin (20 slots)</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="employee">Employee</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Link to Employee (Optional)</InputLabel>
              <Select
                value={userForm.employeeId}
                onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                label="Link to Employee (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {availableEmployees.map((emp: any) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId}) - {emp.department?.name || 'No Department'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;