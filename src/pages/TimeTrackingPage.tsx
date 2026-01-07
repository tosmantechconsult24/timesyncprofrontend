import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, Tooltip, CircularProgress,
  Avatar, Alert, Snackbar, Autocomplete, Card, CardContent, Tabs, Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FilterList as FilterIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Timer as TimerIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { timeEntriesApi, employeesApi } from '../services/api';

interface TimeEntry {
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
  clockIn: string;
  clockOut?: string;
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  status: string;
  location?: string;
  verifyMethod?: string;
  notes?: string;
  isManualEntry: boolean;
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  photo?: string;
  department?: { name: string };
}

const TimeTrackingPage: React.FC = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [statusFilter, setStatusFilter] = useState('');
  
  // Manual Entry Dialog
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    employeeId: '',
    clockIn: '',
    clockOut: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchTimeEntries();
  }, [page, rowsPerPage, selectedEmployee, startDate, endDate, statusFilter]);

  // Auto clock-out check every 5 minutes
  useEffect(() => {
    const autoClockoutInterval = setInterval(async () => {
      try {
        const result = await timeEntriesApi.autoClockout();
        if (result.clockedOutCount > 0) {
          console.log(`Auto clocked out ${result.clockedOutCount} employees`);
          // Refresh time entries to show updated data
          fetchTimeEntries();
          showSnackbar(`${result.clockedOutCount} employees auto clocked out after shift end`, 'success');
        }
      } catch (error) {
        console.error('Auto clock-out check failed:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(autoClockoutInterval);
  }, [page, rowsPerPage, selectedEmployee, startDate, endDate, statusFilter]);

  // Refresh time entries every 10 seconds for real-time updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchTimeEntries();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(refreshInterval);
  }, [page, rowsPerPage, selectedEmployee, startDate, endDate, statusFilter]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.list({ limit: 1000, status: 'active' });
      setEmployees(response.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      
      if (selectedEmployee) {
        params.employeeId = selectedEmployee.id;
      }
      if (startDate) {
        params.startDate = format(startDate, 'yyyy-MM-dd');
      }
      if (endDate) {
        params.endDate = format(endDate, 'yyyy-MM-dd');
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await timeEntriesApi.list(params);
      setTimeEntries(response.entries || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
      showSnackbar('Failed to load time entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  // Export functionality
  const handleExport = async () => {
    try {
      // Generate CSV
      const headers = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Date',
        'Clock In',
        'Clock Out',
        'Total Hours',
        'Regular Hours',
        'Overtime Hours',
        'Status',
        'Location',
        'Verify Method',
        'Notes'
      ];
      
      const rows = timeEntries.map(entry => [
        entry.employee.employeeId,
        `${entry.employee.firstName} ${entry.employee.lastName}`,
        entry.employee.department?.name || '',
        format(parseISO(entry.clockIn), 'yyyy-MM-dd'),
        format(parseISO(entry.clockIn), 'HH:mm:ss'),
        entry.clockOut ? format(parseISO(entry.clockOut), 'HH:mm:ss') : '',
        entry.totalHours?.toFixed(2) || '',
        entry.regularHours?.toFixed(2) || '',
        entry.overtimeHours?.toFixed(2) || '',
        entry.status,
        entry.location || '',
        entry.verifyMethod || '',
        entry.notes || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const fileName = selectedEmployee
        ? `attendance_${selectedEmployee.employeeId}_${format(startDate || new Date(), 'yyyyMMdd')}_${format(endDate || new Date(), 'yyyyMMdd')}.csv`
        : `attendance_all_${format(startDate || new Date(), 'yyyyMMdd')}_${format(endDate || new Date(), 'yyyyMMdd')}.csv`;
      
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Export successful', 'success');
    } catch (error) {
      showSnackbar('Export failed', 'error');
    }
  };

  // Manual Entry
  const handleOpenManualEntry = () => {
    setManualEntryData({
      employeeId: selectedEmployee?.id || '',
      clockIn: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      clockOut: '',
      notes: ''
    });
    setManualEntryOpen(true);
  };

  const handleSaveManualEntry = async () => {
    if (!manualEntryData.employeeId || !manualEntryData.clockIn) {
      showSnackbar('Please select an employee and enter clock in time', 'error');
      return;
    }
    
    setSaving(true);
    try {
      await timeEntriesApi.create({
        employeeId: manualEntryData.employeeId,
        clockIn: new Date(manualEntryData.clockIn).toISOString(),
        clockOut: manualEntryData.clockOut ? new Date(manualEntryData.clockOut).toISOString() : undefined,
        notes: manualEntryData.notes,
        isManualEntry: true
      });
      
      showSnackbar('Manual entry created successfully', 'success');
      setManualEntryOpen(false);
      fetchTimeEntries();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to create entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSelectedEmployee(null);
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
    setStatusFilter('');
  };

  // Summary stats for selected employee
  const getSummaryStats = () => {
    const totalHours = timeEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const regularHours = timeEntries.reduce((sum, e) => sum + (e.regularHours || 0), 0);
    const overtimeHours = timeEntries.reduce((sum, e) => sum + (e.overtimeHours || 0), 0);
    const totalDays = timeEntries.length;
    
    return { totalHours, regularHours, overtimeHours, totalDays };
  };

  const stats = getSummaryStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in': return 'success';
      case 'clocked_out': return 'default';
      case 'approved': return 'primary';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Time Tracking
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={timeEntries.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenManualEntry}
            >
              Manual Entry
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeId})`}
                value={selectedEmployee}
                onChange={(_, newValue) => {
                  setSelectedEmployee(newValue);
                  setPage(0);
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={option.photo} sx={{ width: 32, height: 32 }}>
                      {option.firstName[0]}{option.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {option.firstName} {option.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.employeeId} {option.department && `• ${option.department.name}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Employee"
                    placeholder="Type to search..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setPage(0);
                }}
                slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setPage(0);
                }}
                slotProps={{ textField: { fullWidth: true, size: 'medium' } }}
              />
            </Grid>
            
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="clocked_in">Clocked In</MenuItem>
                  <MenuItem value="clocked_out">Clocked Out</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                sx={{ height: 56 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards (show when employee is selected) */}
        {selectedEmployee && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CalendarIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">{stats.totalDays}</Typography>
                  <Typography variant="body2" color="text.secondary">Days Worked</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TimerIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">{stats.totalHours.toFixed(1)}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AccessTimeIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">{stats.regularHours.toFixed(1)}</Typography>
                  <Typography variant="body2" color="text.secondary">Regular Hours</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AccessTimeIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">{stats.overtimeHours.toFixed(1)}</Typography>
                  <Typography variant="body2" color="text.secondary">Overtime Hours</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Time Entries Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Clock In</TableCell>
                  <TableCell>Clock Out</TableCell>
                  <TableCell align="right">Breaktime (min)</TableCell>
                  <TableCell align="right">Total Hours</TableCell>
                  <TableCell align="right">Regular</TableCell>
                  <TableCell align="right">Overtime</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : timeEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No time entries found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  timeEntries.map((entry) => (
                    <TableRow key={entry.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={entry.employee.photo} sx={{ width: 32, height: 32 }}>
                            {entry.employee.firstName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {entry.employee.firstName} {entry.employee.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.employee.employeeId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(entry.clockIn), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(entry.clockIn), 'hh:mm a')}
                      </TableCell>
                      <TableCell>
                        {entry.clockOut ? format(parseISO(entry.clockOut), 'hh:mm a') : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">60</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {entry.totalHours?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {entry.regularHours?.toFixed(2) || '-'}
                      </TableCell>
                      <TableCell align="right">
                        {entry.overtimeHours ? (
                          <Typography color="warning.main" fontWeight="medium">
                            {entry.overtimeHours.toFixed(2)}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={entry.status.replace('_', ' ')} 
                          size="small" 
                          color={getStatusColor(entry.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          {entry.verifyMethod || '-'}
                          {entry.isManualEntry && (
                            <Chip label="Manual" size="small" sx={{ ml: 1, height: 18 }} />
                          )}
                        </Typography>
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
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>

        {/* Manual Entry Dialog */}
        <Dialog open={manualEntryOpen} onClose={() => setManualEntryOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Manual Time Entry</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.employeeId})`}
                value={employees.find(e => e.id === manualEntryData.employeeId) || null}
                onChange={(_, newValue) => {
                  setManualEntryData({ ...manualEntryData, employeeId: newValue?.id || '' });
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={option.photo} sx={{ width: 32, height: 32 }}>
                      {option.firstName[0]}{option.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {option.firstName} {option.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.employeeId}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Employee *"
                    placeholder="Search and select employee..."
                  />
                )}
              />
              
              <TextField
                label="Clock In *"
                type="datetime-local"
                value={manualEntryData.clockIn}
                onChange={(e) => setManualEntryData({ ...manualEntryData, clockIn: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Clock Out"
                type="datetime-local"
                value={manualEntryData.clockOut}
                onChange={(e) => setManualEntryData({ ...manualEntryData, clockOut: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Notes"
                value={manualEntryData.notes}
                onChange={(e) => setManualEntryData({ ...manualEntryData, notes: e.target.value })}
                fullWidth
                multiline
                rows={2}
                placeholder="Reason for manual entry..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setManualEntryOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSaveManualEntry}
              disabled={saving}
            >
              {saving ? <CircularProgress size={24} /> : 'Save Entry'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default TimeTrackingPage;