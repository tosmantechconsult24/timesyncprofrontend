import React, { useState } from 'react';
import {
  Box,
  Button,
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
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getAllEmployeeRates, updateEmployeeRate } from '../services/payrollApi';
import { employeesApi } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  department?: { name: string };
}

interface EmployeeRateData {
  id: string;
  employeeId: string;
  hourlyRate: number;
  dailyRate?: number;
  salary?: number;
  overtimeRate?: number;
  rateType: string;
  effectiveFrom: string;
  effectiveTo?: string;
  Employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    department?: { name: string };
  };
}

const EmployeeRatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    hourlyRate: '',
    dailyRate: '',
    salary: '',
    overtimeRate: '',
    rateType: 'hourly',
    notes: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: rates, isLoading: ratesLoading, error: ratesError } = useQuery({
    queryKey: ['employeeRates'],
    queryFn: () => getAllEmployeeRates(),
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

  const updateMutation = useMutation({
    mutationFn: (data: { employeeId: string; rates: any }) =>
      updateEmployeeRate(data.employeeId, data.rates),
    onSuccess: () => {
      setSuccessMessage('Employee rate updated successfully');
      setOpenDialog(false);
      queryClient.invalidateQueries({ queryKey: ['employeeRates'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to update employee rate');
    }
  });

  const handleOpenDialog = (employee?: EmployeeRateData) => {
    if (employee) {
      setSelectedEmployee(employee.Employee);
      setFormData({
        hourlyRate: employee.hourlyRate.toString(),
        dailyRate: employee.dailyRate?.toString() || '',
        salary: employee.salary?.toString() || '',
        overtimeRate: employee.overtimeRate?.toString() || '',
        rateType: employee.rateType,
        notes: ''
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        hourlyRate: '',
        dailyRate: '',
        salary: '',
        overtimeRate: '',
        rateType: 'hourly',
        notes: ''
      });
    }
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
    if (!selectedEmployee || !formData.hourlyRate) {
      setError('Employee and hourly rate are required');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        employeeId: selectedEmployee.id,
        rates: {
          hourlyRate: parseFloat(formData.hourlyRate),
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
          salary: formData.salary ? parseFloat(formData.salary) : undefined,
          overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : undefined,
          rateType: formData.rateType,
          notes: formData.notes
        }
      });
    } catch (err) {
      // Error is handled by mutation error callback
    }
  };

  if (ratesLoading || employeesLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="rectangular" width={150} height={40} />
        </Box>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <h1>Employee Rates Management</h1>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New Rate
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
      {ratesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load employee rates: {(ratesError as any).message || 'Unknown error'}</Alert>}
      {employeesError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load employees: {(employeesError as any).message || 'Unknown error'}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Employee ID</strong></TableCell>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Designation</strong></TableCell>
              <TableCell align="right"><strong>Hourly Rate</strong></TableCell>
              <TableCell align="right"><strong>Daily Rate</strong></TableCell>
              <TableCell align="right"><strong>Monthly Salary</strong></TableCell>
              <TableCell align="right"><strong>Overtime Rate</strong></TableCell>
              <TableCell><strong>Rate Type</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rates && rates.length > 0 ? (
              rates.map((rate: EmployeeRateData) => (
                <TableRow key={rate.id}>
                  <TableCell>{rate.Employee.employeeId}</TableCell>
                  <TableCell>{`${rate.Employee.firstName} ${rate.Employee.lastName}`}</TableCell>
                  <TableCell>{rate.Employee.designation}</TableCell>
                  <TableCell align="right">{formatCurrency(rate.hourlyRate)}/hr</TableCell>
                  <TableCell align="right">{rate.dailyRate ? formatCurrency(rate.dailyRate) : '-'}</TableCell>
                  <TableCell align="right">{rate.salary ? formatCurrency(rate.salary) : '-'}</TableCell>
                  <TableCell align="right">{rate.overtimeRate ? formatCurrency(rate.overtimeRate) : '-'}</TableCell>
                  <TableCell>{rate.rateType}</TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenDialog(rate)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  No rates configured yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEmployee ? `Edit Rate - ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : 'Add New Employee Rate'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!selectedEmployee && (
            <FormControl fullWidth>
              <InputLabel>Select Employee</InputLabel>
              <Select
                label="Select Employee"
                onChange={handleSelectEmployee}
                value={(selectedEmployee as any)?.id || ''}
              >
                {employees && Array.isArray(employees) && employees.map((emp: Employee) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.employeeId} - {emp.firstName} {emp.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Hourly Rate (₦)"
            name="hourlyRate"
            type="number"
            value={formData.hourlyRate}
            onChange={handleInputChange}
            fullWidth
            required
            inputProps={{ step: '0.01', min: '0' }}
          />

          <TextField
            label="Daily Rate (₦)"
            name="dailyRate"
            type="number"
            value={formData.dailyRate}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ step: '0.01', min: '0' }}
          />

          <TextField
            label="Monthly Salary (₦)"
            name="salary"
            type="number"
            value={formData.salary}
            onChange={handleInputChange}
            fullWidth
            inputProps={{ step: '0.01', min: '0' }}
          />

          <TextField
            label="Overtime Rate (₦)"
            name="overtimeRate"
            type="number"
            value={formData.overtimeRate}
            onChange={handleInputChange}
            fullWidth
            helperText="Default: hourly rate × 1.5"
            inputProps={{ step: '0.01', min: '0' }}
          />

          <FormControl fullWidth>
            <InputLabel>Rate Type</InputLabel>
            <Select
              name="rateType"
              value={formData.rateType}
              onChange={(e: any) => setFormData(prev => ({ ...prev, rateType: e.target.value }))}
              label="Rate Type"
            >
              <MenuItem value="hourly">Hourly</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Notes"
            name="notes"
            value={formData.notes}
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
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Rate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeRatesPage;
