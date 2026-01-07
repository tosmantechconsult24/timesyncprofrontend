// ============================================
// DepartmentDashboard.tsx
// Manager's view of their department
// ============================================

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Avatar,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  Schedule as LateIcon,
  EventNote as LeaveIcon,
  Block as SuspendIcon,
  CheckCircleOutline as ApproveIcon,
  HighlightOff as RejectIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

interface DepartmentStats {
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeave: number;
  attendanceRate: number;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  status: string;
  shift: { name: string; startTime: string; endTime: string } | null;
  hasFingerprint: boolean;
  todayStatus?: 'present' | 'absent' | 'late' | 'leave';
}

interface LeaveRequest {
  id: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
}

const API_BASE = '/api';

// Fetch functions
const fetchDepartmentStats = async (departmentId: string): Promise<DepartmentStats> => {
  const res = await fetch(`${API_BASE}/departments/${departmentId}/stats`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const fetchDepartmentEmployees = async (departmentId: string): Promise<Employee[]> => {
  const res = await fetch(`${API_BASE}/employees?departmentId=${departmentId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch employees');
  const data = await res.json();
  return data.employees;
};

const fetchPendingLeaves = async (departmentId: string): Promise<LeaveRequest[]> => {
  const res = await fetch(`${API_BASE}/leaves?departmentId=${departmentId}&status=PENDING`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch leaves');
  const data = await res.json();
  return data.leaves;
};

const DepartmentDashboard: React.FC<{ departmentId: string; departmentName: string }> = ({
  departmentId,
  departmentName,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [leaveActionDialog, setLeaveActionDialog] = useState<{ open: boolean; leave: LeaveRequest | null; action: 'approve' | 'reject' }>({
    open: false,
    leave: null,
    action: 'approve',
  });
  const [reviewNote, setReviewNote] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['departmentStats', departmentId],
    queryFn: () => fetchDepartmentStats(departmentId),
    refetchInterval: 60000, // Refresh every minute
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
  });

  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['departmentEmployees', departmentId],
    queryFn: () => fetchDepartmentEmployees(departmentId),
    placeholderData: keepPreviousData,
  });

  const { data: pendingLeaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['pendingLeaves', departmentId],
    queryFn: () => fetchPendingLeaves(departmentId),
    placeholderData: keepPreviousData,
  });

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: async ({ employeeId, reason }: { employeeId: string; reason: string }) => {
      const res = await fetch(`${API_BASE}/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: 'SUSPENDED', reason }),
      });
      if (!res.ok) throw new Error('Failed to suspend employee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentEmployees'] });
      queryClient.invalidateQueries({ queryKey: ['departmentStats'] });
      setSuspendDialogOpen(false);
      setSelectedEmployee(null);
      setSuspendReason('');
    },
  });

  const leaveActionMutation = useMutation({
    mutationFn: async ({ leaveId, action, note }: { leaveId: string; action: 'approve' | 'reject'; note: string }) => {
      const res = await fetch(`${API_BASE}/leaves/${leaveId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} leave`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      setLeaveActionDialog({ open: false, leave: null, action: 'approve' });
      setReviewNote('');
    },
  });

  const handleSuspend = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSuspendDialogOpen(true);
  };

  const confirmSuspend = () => {
    if (selectedEmployee && suspendReason) {
      suspendMutation.mutate({ employeeId: selectedEmployee.id, reason: suspendReason });
    }
  };

  const handleLeaveAction = (leave: LeaveRequest, action: 'approve' | 'reject') => {
    setLeaveActionDialog({ open: true, leave, action });
  };

  const confirmLeaveAction = () => {
    if (leaveActionDialog.leave) {
      leaveActionMutation.mutate({
        leaveId: leaveActionDialog.leave.id,
        action: leaveActionDialog.action,
        note: reviewNote,
      });
    }
  };

  const getStatusChip = (status: string) => {
    const config: Record<string, { color: 'success' | 'error' | 'warning' | 'info'; label: string }> = {
      present: { color: 'success', label: 'Present' },
      absent: { color: 'error', label: 'Absent' },
      late: { color: 'warning', label: 'Late' },
      leave: { color: 'info', label: 'On Leave' },
      ACTIVE: { color: 'success', label: 'Active' },
      SUSPENDED: { color: 'error', label: 'Suspended' },
      INACTIVE: { color: 'warning', label: 'Inactive' },
    };
    const c = config[status] || { color: 'info', label: status };
    return <Chip size="small" color={c.color} label={c.label} />;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {departmentName} Dashboard
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['departmentStats'] });
            queryClient.invalidateQueries({ queryKey: ['departmentEmployees'] });
            queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>
                    Total Employees
                  </Typography>
                  <Typography color="white" variant="h3" fontWeight="bold">
                    {statsLoading ? '-' : stats?.totalEmployees || 0}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>
                    Present Today
                  </Typography>
                  <Typography color="white" variant="h3" fontWeight="bold">
                    {statsLoading ? '-' : stats?.presentToday || 0}
                  </Typography>
                </Box>
                <PresentIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>
                    Absent Today
                  </Typography>
                  <Typography color="white" variant="h3" fontWeight="bold">
                    {statsLoading ? '-' : stats?.absentToday || 0}
                  </Typography>
                </Box>
                <AbsentIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="white" variant="body2" sx={{ opacity: 0.8 }}>
                    Attendance Rate
                  </Typography>
                  <Typography color="white" variant="h3" fontWeight="bold">
                    {statsLoading ? '-' : `${stats?.attendanceRate || 0}%`}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Employees" icon={<PeopleIcon />} iconPosition="start" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pending Leaves
                {pendingLeaves && pendingLeaves.length > 0 && (
                  <Chip size="small" color="error" label={pendingLeaves.length} />
                )}
              </Box>
            }
            icon={<LeaveIcon />} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>

      {/* Employees Tab */}
      {activeTab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Biometric</TableCell>
                <TableCell>Today</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : employees?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No employees in this department
                  </TableCell>
                </TableRow>
              ) : (
                employees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: emp.status === 'ACTIVE' ? 'primary.main' : 'grey.500' }}>
                          {emp.firstName[0]}{emp.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {emp.firstName} {emp.lastName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{emp.employeeId}</TableCell>
                    <TableCell>
                      {emp.shift ? (
                        <Typography variant="body2">
                          {emp.shift.name}<br />
                          <Typography variant="caption" color="text.secondary">
                            {emp.shift.startTime} - {emp.shift.endTime}
                          </Typography>
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={emp.hasFingerprint ? 'success' : 'default'}
                        label={emp.hasFingerprint ? 'Registered' : 'Not Set'}
                      />
                    </TableCell>
                    <TableCell>
                      {emp.todayStatus ? getStatusChip(emp.todayStatus) : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(emp.status)}
                    </TableCell>
                    <TableCell>
                      {emp.status === 'ACTIVE' && (
                        <Tooltip title="Suspend Employee">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleSuspend(emp)}
                          >
                            <SuspendIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pending Leaves Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Leave Type</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leavesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : pendingLeaves?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No pending leave requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingLeaves?.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {leave.employee.firstName} {leave.employee.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {leave.employee.employeeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={leave.leaveType} />
                    </TableCell>
                    <TableCell>
                      {format(parseISO(leave.startDate), 'MMM dd')} - {format(parseISO(leave.endDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{leave.reason || '-'}</TableCell>
                    <TableCell>
                      {format(parseISO(leave.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Approve">
                          <IconButton
                            color="success"
                            size="small"
                            onClick={() => handleLeaveAction(leave, 'approve')}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleLeaveAction(leave, 'reject')}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)}>
        <DialogTitle>Suspend Employee</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Suspending {selectedEmployee?.firstName} {selectedEmployee?.lastName} will prevent them from clocking in/out.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Suspension"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmSuspend}
            disabled={!suspendReason || suspendMutation.isPending}
          >
            {suspendMutation.isPending ? <CircularProgress size={24} /> : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Action Dialog */}
      <Dialog open={leaveActionDialog.open} onClose={() => setLeaveActionDialog({ open: false, leave: null, action: 'approve' })}>
        <DialogTitle>
          {leaveActionDialog.action === 'approve' ? 'Approve' : 'Reject'} Leave Request
        </DialogTitle>
        <DialogContent>
          {leaveActionDialog.leave && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Employee:</strong> {leaveActionDialog.leave.employee.firstName} {leaveActionDialog.leave.employee.lastName}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {leaveActionDialog.leave.leaveType}
              </Typography>
              <Typography variant="body2">
                <strong>Period:</strong> {format(parseISO(leaveActionDialog.leave.startDate), 'MMM dd')} - {format(parseISO(leaveActionDialog.leave.endDate), 'MMM dd, yyyy')}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Note (Optional)"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveActionDialog({ open: false, leave: null, action: 'approve' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={leaveActionDialog.action === 'approve' ? 'success' : 'error'}
            onClick={confirmLeaveAction}
            disabled={leaveActionMutation.isPending}
          >
            {leaveActionMutation.isPending ? <CircularProgress size={24} /> : leaveActionDialog.action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DepartmentDashboard;