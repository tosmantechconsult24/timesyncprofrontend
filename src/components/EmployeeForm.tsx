import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Avatar,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Close as CloseIcon, Fingerprint as FingerprintIcon } from '@mui/icons-material';
import { employeesApi, backendApi } from '../services/api';

interface EmployeeFormProps {
  open: boolean;
  onClose: (saved: boolean) => void;
  employee?: any;
  departments?: any[];
  shifts?: any[];
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  open,
  onClose,
  employee,
  departments = [],
  shifts = []
}) => {
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    joinDate: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [scannerConnected, setScannerConnected] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeId: employee.employeeId || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        designation: employee.designation || '',
        joinDate: employee.joinDate || ''
      });
      // Set existing photo preview
      if (employee.photo) {
        setPhotoPreview(employee.photo);
      } else {
        setPhotoPreview(null);
      }
      // Set fingerprint enrollment status
      setFingerprintEnrolled(employee.fingerprintEnrolled || false);
    } else {
      setFormData({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        designation: '',
        joinDate: ''
      });
      setPhotoPreview(null);
      setFingerprintEnrolled(false);
    }
    setPhotoFile(null);
    setError(null);
    setTabValue(0);
    setEnrollmentMessage(null);
    
    // Check scanner status
    checkScannerStatus();
  }, [employee, open]);

  const checkScannerStatus = async () => {
    try {
      const response = await backendApi.get('/fingerprint/status');
      setScannerConnected(response.data.connected);
    } catch (error) {
      setScannerConnected(false);
    }
  };

  const handleEnrollmentStart = async () => {
    if (!formData.employeeId.trim()) {
      setEnrollmentMessage('Please enter an Employee ID first');
      return;
    }

    setEnrollmentLoading(true);
    setEnrollmentMessage(null);

    try {
      // Step 1: Start enrollment (device interaction)
      const startResponse = await backendApi.post('/fingerprint/enroll/start', {
        employeeId: formData.employeeId,
      });

      if (!startResponse.data.success) {
        throw new Error(startResponse.data.message || 'Failed to start enrollment');
      }

      // Step 2: Wait for fingerprint capture (simulate delay)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Step 3: Complete enrollment - save to database
      const completeResponse = await backendApi.post('/fingerprint/enroll/complete', {
        employeeId: formData.employeeId,
        template: startResponse.data.template, // Template from start enrollment
      });

      if (completeResponse.data.success) {
        setFingerprintEnrolled(true);
        setEnrollmentMessage('✓ Fingerprint enrolled successfully!');
      } else {
        throw new Error(completeResponse.data.message || 'Failed to save fingerprint');
      }
    } catch (error: any) {
      console.error('Enrollment error:', error);
      setEnrollmentMessage(`✗ Error: ${error.response?.data?.error || error.response?.data?.message || error.message}`);
      setFingerprintEnrolled(false);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
    const target = e.target as HTMLInputElement & { name: string; value: string };
    setFormData(prev => ({
      ...prev,
      [target.name]: target.value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!formData.firstName || !formData.lastName || !formData.email) {
        setError('First name, last name, and email are required');
        setLoading(false);
        return;
      }

      // Use FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append('firstName', formData.firstName);
      submitFormData.append('lastName', formData.lastName);
      submitFormData.append('email', formData.email);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('designation', formData.designation);
      submitFormData.append('joinDate', formData.joinDate);
      
      if (formData.employeeId) {
        submitFormData.append('employeeId', formData.employeeId);
      }

      if (photoFile) {
        submitFormData.append('photo', photoFile);
      }

      if (employee?.id) {
        // Update existing employee
        await employeesApi.update(employee.id, submitFormData);
      } else {
        // Create new employee
        await employeesApi.create(submitFormData);
      }
      
      onClose(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        {employee?.id ? 'Edit Employee' : 'Add New Employee'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Tab Navigation */}
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab label="Basic Information" />
            <Tab label="Fingerprint Enrollment" icon={<FingerprintIcon />} iconPosition="start" />
          </Tabs>

          {/* Tab 1: Basic Information */}
          {tabValue === 0 && (
            <Grid container spacing={2}>
              {/* Photo Upload Section */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={photoPreview || undefined}
                    sx={{
                      width: 120,
                      height: 120,
                      backgroundColor: '#e0e0e0',
                      fontSize: '3rem'
                    }}
                  >
                    {photoPreview ? null : (formData.firstName?.[0] || 'E').toUpperCase()}
                  </Avatar>
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="photo-input"
                      type="file"
                      onChange={handlePhotoChange}
                    />
                    <label htmlFor="photo-input">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        size="small"
                      >
                        Upload Image
                      </Button>
                    </label>
                    {photoPreview && (
                      <IconButton
                        size="small"
                        onClick={handleRemovePhoto}
                        sx={{ ml: 1 }}
                        title="Remove photo"
                      >
                        <CloseIcon />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    JPG, PNG or GIF (Max 5MB)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  placeholder="Leave empty for auto-generated ID"
                  helperText="Optional - will be auto-generated if left blank"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Join Date"
                  name="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          )}

          {/* Tab 2: Fingerprint Enrollment */}
          {tabValue === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert severity={scannerConnected ? 'info' : 'warning'}>
                  {scannerConnected 
                    ? '✓ Fingerprint scanner is connected and ready' 
                    : '⚠ Fingerprint scanner is not detected. Connect USB scanner to enable fingerprint enrollment.'}
                </Alert>
              </Grid>

              {scannerConnected && (
                <>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          Fingerprint Enrollment
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            Employee ID:
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                            {formData.employeeId || '(Will be generated if not set above)'}
                          </Typography>
                        </Box>

                        {enrollmentMessage && (
                          <Alert 
                            severity={fingerprintEnrolled ? 'success' : 'error'}
                            sx={{ mb: 2 }}
                          >
                            {enrollmentMessage}
                          </Alert>
                        )}

                        <Box sx={{ mb: 2 }}>
                          {fingerprintEnrolled ? (
                            <Chip
                              label="✓ Fingerprint Enrolled"
                              color="success"
                              variant="filled"
                              sx={{ width: '100%', height: '40px' }}
                            />
                          ) : (
                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              onClick={handleEnrollmentStart}
                              disabled={enrollmentLoading || !scannerConnected}
                              sx={{ height: '40px' }}
                            >
                              {enrollmentLoading ? (
                                <>
                                  <CircularProgress size={20} sx={{ mr: 1 }} />
                                  Enrolling Fingerprint...
                                </>
                              ) : (
                                '👆 Start Fingerprint Enrollment'
                              )}
                            </Button>
                          )}
                        </Box>

                        <Typography variant="caption" color="textSecondary">
                          Place your finger on the scanner when prompted. Hold it steady for 2-3 seconds.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Enrollment Instructions
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>
                            <Typography variant="caption">
                              Ensure the employee is present
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="caption">
                              Click 'Start Fingerprint Enrollment' button above
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="caption">
                              When prompted, place your finger on the scanner
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="caption">
                              Keep your finger steady for 2-3 seconds
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="caption">
                              Wait for the success confirmation
                            </Typography>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </Grid>
                </>
              )}

              {!scannerConnected && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                        Scanner Setup Required
                      </Typography>
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        <li>
                          <Typography variant="caption">
                            Connect the ZKTeco 9500 USB fingerprint scanner
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="caption">
                            Install drivers from ZKTeco website
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="caption">
                            Go to Settings → USB Fingerprint tab
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="caption">
                            Click 'Check Status' to verify scanner connection
                          </Typography>
                        </li>
                        <li>
                          <Typography variant="caption">
                            Return to this form and enroll fingerprint
                          </Typography>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeForm;
