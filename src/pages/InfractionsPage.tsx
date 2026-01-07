import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Paper,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Typography,
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getPendingInfractions,
  createInfraction,
  approveInfraction,
  rejectInfraction
} from '../services/payrollApi';
import { employeesApi } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface Infraction {
  id: string;
  employeeId: string;
  type: string;
  severity: string;
  amount?: number;
  description: string;
  date: string;
  status: string;
  reportedBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvedAt?: string;
  Employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation?: string;
  };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
}

const InfractionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    severity: 'minor',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedInfraction, setSelectedInfraction] = useState<Infraction | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const { data: infractions, isLoading: infractionLoading, error: infractionError } = useQuery({
    queryKey: ['pendingInfractions'],
    queryFn: () => getPendingInfractions(),
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
    staleTime: 30000, // Data stays fresh for 30 seconds
  });

  const { data: employeesData, isLoading: employeesLoading, error: employeesError } = useQuery<any>({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    placeholderData: keepPreviousData,
    staleTime: 60000, // Employees data stays fresh for 1 minute
  });
  
  const employees = Array.isArray(employeesData) ? employeesData : employeesData?.employees || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => createInfraction(data),
    onSuccess: () => {
      setSuccessMessage('Infraction recorded successfully');
      setOpenDialog(false);
      queryClient.invalidateQueries({ queryKey: ['pendingInfractions'] });
      setFormData({
        type: '',
        severity: 'minor',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setSelectedEmployee(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to record infraction');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (data: { id: string; notes: string }) => approveInfraction(data.id, data.notes),
    onSuccess: () => {
      setSuccessMessage('Infraction approved successfully');
      setApprovalDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pendingInfractions'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDeductions'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to approve infraction');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) => rejectInfraction(data.id, data.reason),
    onSuccess: () => {
      setSuccessMessage('Infraction rejected successfully');
      setApprovalDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pendingInfractions'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to reject infraction');
    }
  });

  const handleOpenDialog = () => {
    setSelectedEmployee(null);
    setFormData({
      type: '',
      severity: 'minor',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  const handleSelectEmployee = (event: any) => {
    const employee = employees?.find((e: Employee) => e.id === event.target.value);
    setSelectedEmployee(employee || null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !formData.type || !formData.description) {
      setError('Employee, infraction type, and description are required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: selectedEmployee.id,
        type: formData.type,
        severity: formData.severity,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        description: formData.description,
        date: formData.date
      });
    } catch (err) {
      // Error is handled by mutation error callback
    }
  };

  const handleOpenApprovalDialog = (infraction: Infraction) => {
    setSelectedInfraction(infraction);
    setApprovalNotes('');
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedInfraction) return;
    try {
      await approveMutation.mutateAsync({
        id: selectedInfraction.id,
        notes: approvalNotes
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!selectedInfraction) return;
    try {
      await rejectMutation.mutateAsync({
        id: selectedInfraction.id,
        reason: approvalNotes
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'minor':
        return 'warning';
      case 'major':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  if (infractionLoading || employeesLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="rectangular" width={180} height={40} />
        </Box>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <h1>Infractions Management</h1>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Record New Infraction
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {infractionError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load infractions: {(infractionError as any).message || 'Unknown error'}</Alert>}
      {employeesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load employees: {(employeesError as any).message || 'Unknown error'}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pending Approvals
          </Typography>
          <Typography color="textSecondary" sx={{ mb: 2 }}>
            {infractions?.filter((i: Infraction) => i.status === 'pending').length || 0} infractions awaiting approval
          </Typography>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Employee</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Severity</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {infractions && infractions.length > 0 ? (
              infractions.map((infraction: Infraction) => (
                <TableRow key={infraction.id}>
                  <TableCell>
                    <div>{infraction.Employee.employeeId}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {infraction.Employee.firstName} {infraction.Employee.lastName}
                    </div>
                  </TableCell>
                  <TableCell>{infraction.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={infraction.severity}
                      color={severityColor(infraction.severity) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {infraction.amount ? formatCurrency(infraction.amount) : '-'}
                  </TableCell>
                  <TableCell>{infraction.description}</TableCell>
                  <TableCell>{new Date(infraction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={infraction.status}
                      color={statusColor(infraction.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {infraction.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleOpenApprovalDialog(infraction)}
                        >
                          Approve
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No infractions recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Record Infraction Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Record New Infraction</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth required>
            <InputLabel>Select Employee</InputLabel>
            <Select
              label="Select Employee"
              onChange={handleSelectEmployee}
              value={selectedEmployee?.id || ''}
            >
              {employees?.map((emp: Employee) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Infraction Type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            fullWidth
            required
            placeholder="e.g., Late Arrival, Absence, Misconduct"
          />

          <FormControl fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              name="severity"
              value={formData.severity}
              onChange={(e: any) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              label="Severity"
            >
              <MenuItem value="minor">Minor</MenuItem>
              <MenuItem value="major">Major</MenuItem>
              <MenuItem value="critical">Critical</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Deduction Amount (₦) - Optional"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ step: '0.01', min: '0' }}
          />

          <TextField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={3}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Recording...' : 'Record Infraction'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedInfraction
            ? `Approve Infraction - ${selectedInfraction.Employee.firstName} ${selectedInfraction.Employee.lastName}`
            : 'Approve Infraction'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedInfraction && (
            <>
              <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <Typography><strong>Type:</strong> {selectedInfraction.type}</Typography>
                <Typography><strong>Severity:</strong> <Chip label={selectedInfraction.severity} size="small" /></Typography>
                <Typography><strong>Amount:</strong> {selectedInfraction.amount ? formatCurrency(selectedInfraction.amount) : '-'}</Typography>
                <Typography><strong>Description:</strong> {selectedInfraction.description}</Typography>
              </Box>
            </>
          )}
          <TextField
            label="Approval Notes (Optional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleReject()}
            variant="outlined"
            color="error"
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
          </Button>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color="success"
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Approving...' : 'Approve & Create Deduction'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InfractionsPage;
