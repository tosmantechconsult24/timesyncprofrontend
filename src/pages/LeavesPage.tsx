import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, Tooltip, CircularProgress,
  Avatar, Alert, Snackbar, Autocomplete, Tabs, Tab, Card, CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, differenceInDays } from 'date-fns';
import { leavesApi, employeesApi } from '../services/api';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    photo?: string;
    department?: { name: string };
  };
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  createdAt: string;
  approvedById?: string;
  approvedAt?: string;
  User?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photo?: string;
  department?: { name: string };
}

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave', color: '#EF4444' },
  { value: 'vacation', label: 'Vacation', color: '#3B82F6' },
  { value: 'personal', label: 'Personal Leave', color: '#8B5CF6' },
  { value: 'maternity', label: 'Maternity Leave', color: '#EC4899' },
  { value: 'paternity', label: 'Paternity Leave', color: '#06B6D4' },
  { value: 'unpaid', label: 'Unpaid Leave', color: '#6B7280' }
];

const LeavesPage: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  
  // New Leave Request Dialog
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newRequest, setNewRequest] = useState({
    leaveType: 'vacation',
    startDate: null as Date | null,
    endDate: null as Date | null,
    reason: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Approval Dialog
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [fingerprintRequired, setFingerprintRequired] = useState(false);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchLeaveRequests();
  }, [page, rowsPerPage, leaveTypeFilter, tabValue]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.getAll({ limit: 1000 });
      setEmployees(response.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params: any = { page: page + 1, limit: rowsPerPage };
      
      if (tabValue === 1) params.status = 'pending';
      else if (tabValue === 2) params.status = 'approved';
      else if (tabValue === 3) params.status = 'rejected';
      
      if (leaveTypeFilter) params.leaveType = leaveTypeFilter;
      
      const response = await leavesApi.getAll(params);
      setLeaveRequests(response.requests || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const calculateTotalDays = () => {
    if (!newRequest.startDate || !newRequest.endDate) return 0;
    return differenceInDays(newRequest.endDate, newRequest.startDate) + 1;
  };

  const handleOpenNewRequest = () => {
    setSelectedEmployee(null);
    setNewRequest({ leaveType: 'vacation', startDate: null, endDate: null, reason: '' });
    setNewRequestOpen(true);
  };

  const handleSaveNewRequest = async () => {
    if (!selectedEmployee || !newRequest.startDate || !newRequest.endDate) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await leavesApi.create({
        employeeId: selectedEmployee.id,
        leaveType: newRequest.leaveType,
        startDate: format(newRequest.startDate, 'yyyy-MM-dd'),
        endDate: format(newRequest.endDate, 'yyyy-MM-dd'),
        totalDays: calculateTotalDays(),
        reason: newRequest.reason
      });
      
      showSnackbar('Leave request created successfully', 'success');
      setNewRequestOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to create leave request', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenApproval = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setFingerprintVerified(false);
    setFingerprintRequired(true); // Require fingerprint for approval
    setApprovalDialogOpen(true);
  };

  const handleVerifyFingerprint = async () => {
    if (!selectedRequest) return;
    try {
      // Call fingerprint verification endpoint
      // In a real implementation, this would scan a fingerprint
      await leavesApi.verifyFingerprint(selectedRequest.id, { fingerprintData: 'mock_fingerprint_data' });
      setFingerprintVerified(true);
      showSnackbar('Fingerprint verified successfully', 'success');
    } catch (error: any) {
      showSnackbar('Fingerprint verification failed', 'error');
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    // Check if fingerprint is required and verified
    if (fingerprintRequired && !fingerprintVerified) {
      showSnackbar('Please verify fingerprint before approval', 'error');
      return;
    }
    
    try {
      await leavesApi.approve(selectedRequest.id, { status: 'approved' });
      showSnackbar('Leave request approved', 'success');
      setApprovalDialogOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      showSnackbar('Failed to approve', 'error');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await leavesApi.reject(selectedRequest.id, { reason: rejectionReason });
      showSnackbar('Leave request rejected', 'success');
      setApprovalDialogOpen(false);
      fetchLeaveRequests();
    } catch (error: any) {
      showSnackbar('Failed to reject', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getLeaveTypeInfo = (type: string) => {
    return LEAVE_TYPES.find(t => t.value === type) || { label: type, color: '#6B7280' };
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">Leave Management</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewRequest}>
            New Leave Request
          </Button>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setPage(0); }}>
            <Tab label="All Requests" />
            <Tab label="Pending" />
            <Tab label="Approved" />
            <Tab label="Rejected" />
          </Tabs>
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Leave Type</InputLabel>
            <Select value={leaveTypeFilter} label="Leave Type" onChange={(e) => setLeaveTypeFilter(e.target.value)}>
              <MenuItem value="">All Types</MenuItem>
              {LEAVE_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell align="center">Days</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approved By</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell>
                  </TableRow>
                ) : leaveRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No leave requests found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={request.employee?.photo} sx={{ width: 32, height: 32 }}>
                            {request.employee?.firstName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {request.employee?.firstName} {request.employee?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.employee?.employeeId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getLeaveTypeInfo(request.leaveType).label}
                          size="small"
                          sx={{ bgcolor: `${getLeaveTypeInfo(request.leaveType).color}20`, color: getLeaveTypeInfo(request.leaveType).color }}
                        />
                      </TableCell>
                      <TableCell>{format(parseISO(request.startDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(parseISO(request.endDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell align="center"><strong>{request.totalDays}</strong></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={request.status} size="small" color={getStatusColor(request.status) as any} />
                      </TableCell>
                      <TableCell>
                        {request.User ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {request.User.firstName} {request.User.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.User.email}
                            </Typography>
                            {request.approvedAt && (
                              <Typography variant="caption" color="text.secondary">
                                {format(parseISO(request.approvedAt), 'MMM dd, yyyy')}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => handleOpenApproval(request)}>
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => handleOpenApproval(request)}>
                                <CloseIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </Paper>

        {/* New Leave Request Dialog */}
        <Dialog open={newRequestOpen} onClose={() => setNewRequestOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeId})`}
                value={selectedEmployee}
                onChange={(_, newValue) => setSelectedEmployee(newValue)}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={option.photo} sx={{ width: 32, height: 32 }}>
                      {option.firstName[0]}{option.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.firstName} {option.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.employeeId} {option.department && `• ${option.department.name}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="Select Employee *" placeholder="Search and select employee..." />
                )}
              />
              
              <FormControl fullWidth>
                <InputLabel>Leave Type *</InputLabel>
                <Select
                  value={newRequest.leaveType}
                  label="Leave Type *"
                  onChange={(e) => setNewRequest({ ...newRequest, leaveType: e.target.value })}
                >
                  {LEAVE_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Start Date *"
                    value={newRequest.startDate}
                    onChange={(date) => setNewRequest({ ...newRequest, startDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="End Date *"
                    value={newRequest.endDate}
                    onChange={(date) => setNewRequest({ ...newRequest, endDate: date })}
                    minDate={newRequest.startDate || undefined}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
              
              {newRequest.startDate && newRequest.endDate && (
                <Alert severity="info">Total Days: <strong>{calculateTotalDays()}</strong></Alert>
              )}
              
              <TextField
                label="Reason"
                value={newRequest.reason}
                onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewRequestOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveNewRequest} disabled={saving || !selectedEmployee || !newRequest.startDate || !newRequest.endDate}>
              {saving ? <CircularProgress size={24} /> : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Review Leave Request</DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box sx={{ pt: 2 }}>
                <Card sx={{ mb: 2, bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Employee</Typography>
                        <Typography fontWeight="medium">
                          {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Leave Type</Typography>
                        <Typography fontWeight="medium">{getLeaveTypeInfo(selectedRequest.leaveType).label}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Duration</Typography>
                        <Typography fontWeight="medium">
                          {format(parseISO(selectedRequest.startDate), 'MMM dd')} - {format(parseISO(selectedRequest.endDate), 'MMM dd, yyyy')}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Total Days</Typography>
                        <Typography fontWeight="medium">{selectedRequest.totalDays} days</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Fingerprint Verification Section */}
                {fingerprintRequired && (
                  <Alert 
                    severity={fingerprintVerified ? 'success' : 'warning'}
                    sx={{ mb: 2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FingerprintIcon />
                        <span>{fingerprintVerified ? 'Fingerprint Verified' : 'Fingerprint verification required'}</span>
                      </Box>
                      {!fingerprintVerified && (
                        <Button 
                          size="small" 
                          onClick={handleVerifyFingerprint}
                          variant="outlined"
                        >
                          Verify
                        </Button>
                      )}
                    </Box>
                  </Alert>
                )}

                <TextField
                  label="Rejection Reason (optional)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Provide a reason if rejecting this request"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button color="error" variant="outlined" onClick={handleReject} startIcon={<CloseIcon />}>Reject</Button>
            <Button 
              color="success" 
              variant="contained" 
              onClick={handleApprove} 
              startIcon={<CheckIcon />}
              disabled={fingerprintRequired && !fingerprintVerified}
            >
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default LeavesPage;