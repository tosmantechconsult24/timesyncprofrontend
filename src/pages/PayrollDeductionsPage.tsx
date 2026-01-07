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
  getPendingDeductions,
  createDeduction,
  approveDeduction,
  rejectDeduction
} from '../services/payrollApi';
import { employeesApi } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface Deduction {
  id: string;
  employeeId: string;
  deductionType: string;
  amount: number;
  reason?: string;
  description?: string;
  month: string;
  status: string;
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

const PayrollDeductionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    deductionType: 'infraction',
    amount: '',
    reason: '',
    description: '',
    month: new Date().toISOString().split('T')[0].substring(0, 7)
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedDeduction, setSelectedDeduction] = useState<Deduction | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const { data: deductions, isLoading: deductionLoading, error: deductionError } = useQuery({
    queryKey: ['pendingDeductions'],
    queryFn: () => getPendingDeductions(),
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
    mutationFn: (data: any) => createDeduction(data),
    onSuccess: () => {
      setSuccessMessage('Deduction created successfully');
      setOpenDialog(false);
      queryClient.invalidateQueries({ queryKey: ['pendingDeductions'] });
      setFormData({
        deductionType: 'infraction',
        amount: '',
        reason: '',
        description: '',
        month: new Date().toISOString().split('T')[0].substring(0, 7)
      });
      setSelectedEmployee(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to create deduction');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (data: { id: string; notes: string }) => approveDeduction(data.id, data.notes),
    onSuccess: () => {
      setSuccessMessage('Deduction approved successfully');
      setApprovalDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pendingDeductions'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to approve deduction');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) => rejectDeduction(data.id, data.reason),
    onSuccess: () => {
      setSuccessMessage('Deduction rejected successfully');
      setApprovalDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pendingDeductions'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to reject deduction');
    }
  });

  const handleOpenDialog = () => {
    setSelectedEmployee(null);
    setFormData({
      deductionType: 'infraction',
      amount: '',
      reason: '',
      description: '',
      month: new Date().toISOString().split('T')[0].substring(0, 7)
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
    if (!selectedEmployee || !formData.amount || !formData.reason) {
      setError('Employee, amount, and reason are required');
      return;
    }

    try {
      await createMutation.mutateAsync({
        employeeId: selectedEmployee.id,
        deductionType: formData.deductionType,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        description: formData.description,
        month: `${formData.month}-01`
      });
    } catch (err) {
      // Error is handled by mutation error callback
    }
  };

  const handleOpenApprovalDialog = (deduction: Deduction) => {
    setSelectedDeduction(deduction);
    setApprovalNotes('');
    setApprovalDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedDeduction) return;
    try {
      await approveMutation.mutateAsync({
        id: selectedDeduction.id,
        notes: approvalNotes
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!selectedDeduction) return;
    try {
      await rejectMutation.mutateAsync({
        id: selectedDeduction.id,
        reason: approvalNotes
      });
    } catch (err) {
      // Error handled by mutation
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
      case 'applied':
        return 'info';
      default:
        return 'default';
    }
  };

  const deductionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      infraction: 'Infraction',
      loan: 'Loan',
      tax: 'Tax',
      insurance: 'Insurance',
      other: 'Other'
    };
    return labels[type] || type;
  };

  if (deductionLoading || employeesLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Skeleton variant="text" width={350} height={40} />
          <Skeleton variant="rectangular" width={150} height={40} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Skeleton variant="rectangular" height={80} />
          <Skeleton variant="rectangular" height={80} />
        </Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  const pendingCount = deductions?.filter((d: Deduction) => d.status === 'pending').length || 0;
  const totalAmount = deductions
    ?.filter((d: Deduction) => d.status === 'pending')
    .reduce((sum: number, d: Deduction) => sum + d.amount, 0) || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <h1>Payroll Deductions Management</h1>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Deduction
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {deductionError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load deductions: {(deductionError as any).message || 'Unknown error'}</Alert>}
      {employeesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load employees: {(employeesError as any).message || 'Unknown error'}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Pending Deductions
            </Typography>
            <Typography variant="h5">{pendingCount}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Pending Amount
            </Typography>
            <Typography variant="h5">{formatCurrency(totalAmount)}</Typography>
          </CardContent>
        </Card>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Employee</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Reason</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Month</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {deductions && deductions.length > 0 ? (
              deductions.map((deduction: Deduction) => (
                <TableRow key={deduction.id}>
                  <TableCell>
                    <div>{deduction.Employee.employeeId}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {deduction.Employee.firstName} {deduction.Employee.lastName}
                    </div>
                  </TableCell>
                  <TableCell>{deductionTypeLabel(deduction.deductionType)}</TableCell>
                  <TableCell>{deduction.reason}</TableCell>
                  <TableCell align="right">{formatCurrency(deduction.amount)}</TableCell>
                  <TableCell>{new Date(deduction.month).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}</TableCell>
                  <TableCell>
                    <Chip
                      label={deduction.status}
                      color={statusColor(deduction.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {deduction.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleOpenApprovalDialog(deduction)}
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
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  No pending deductions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Deduction Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Deduction</DialogTitle>
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

          <FormControl fullWidth>
            <InputLabel>Deduction Type</InputLabel>
            <Select
              name="deductionType"
              value={formData.deductionType}
              onChange={(e: any) => setFormData(prev => ({ ...prev, deductionType: e.target.value }))}
              label="Deduction Type"
            >
              <MenuItem value="infraction">Infraction</MenuItem>
              <MenuItem value="loan">Loan Recovery</MenuItem>
              <MenuItem value="tax">Tax</MenuItem>
              <MenuItem value="insurance">Insurance</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            fullWidth
            required
            placeholder="e.g., Late arrival fine, Uniform shortage"
          />

          <TextField
            label="Amount (₦)"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange}
            fullWidth
            required
            inputProps={{ step: '0.01', min: '0' }}
          />

          <TextField
            label="Month"
            name="month"
            type="month"
            value={formData.month}
            onChange={handleInputChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            multiline
            rows={2}
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
            {createMutation.isPending ? 'Creating...' : 'Create Deduction'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDeduction
            ? `Approve Deduction - ${selectedDeduction.Employee.firstName} ${selectedDeduction.Employee.lastName}`
            : 'Approve Deduction'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {selectedDeduction && (
            <>
              <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <Typography><strong>Type:</strong> {deductionTypeLabel(selectedDeduction.deductionType)}</Typography>
                <Typography><strong>Reason:</strong> {selectedDeduction.reason}</Typography>
                <Typography><strong>Amount:</strong> {formatCurrency(selectedDeduction.amount)}</Typography>
                <Typography><strong>Month:</strong> {new Date(selectedDeduction.month).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })}</Typography>
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
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollDeductionsPage;
