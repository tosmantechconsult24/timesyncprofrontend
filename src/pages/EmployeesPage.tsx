import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  IconButton, Chip, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, CardActions, Menu, MenuItem, Tooltip,
  Alert, Snackbar, CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Sync as SyncIcon,
  Fingerprint as FingerprintIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

import { employeesApi, departmentsApi, shiftsApi, terminalsApi } from '../services/api';
import EmployeeForm from '../components/EmployeeForm';
import FingerprintEnrollmentDialog from '../components/FingerprintEnrollmentDialog';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  shiftId?: string;
  shift?: { id: string; name: string };
  designation?: string;
  status: string;
  fingerprintEnrolled: boolean;
  faceEnrolled: boolean;
  joinDate?: string;
}

interface Terminal {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  isOnline: boolean;
  location?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Simple Fingerprint Enrollment Dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollEmployee, setEnrollEmployee] = useState<Employee | null>(null);

  // Menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuEmployee, setMenuEmployee] = useState<Employee | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await employeesApi.getAll({
        offset: page * rowsPerPage,
        limit: rowsPerPage,
        search: searchQuery
      });
      setEmployees(response.employees || []);
      setTotalCount(response.total || 0);
    } catch (error: any) {
      showSnackbar('Failed to load employees', 'error');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery]);

  const fetchDepartments = async () => {
    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments');
    }
  };

  const fetchShifts = async () => {
    try {
      const data = await shiftsApi.getAll();
      setShifts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load shifts');
      setShifts([]);
    }
  };

  const fetchTerminals = async () => {
    try {
      const data = await terminalsApi.getAll();
      setTerminals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load terminals');
      setTerminals([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchShifts();
    fetchTerminals();
  }, [fetchEmployees]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setFormOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    try {
      await employeesApi.delete(employeeToDelete.id);
      showSnackbar('Employee deleted successfully', 'success');
      fetchEmployees();
    } catch (error: any) {
      showSnackbar('Failed to delete employee', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleFormClose = (saved: boolean) => {
    setFormOpen(false);
    setSelectedEmployee(null);
    if (saved) fetchEmployees();
  };

  const handleSyncEmployee = async (employee: Employee) => {
    try {
      await employeesApi.update(employee.id, { synced: true });
      showSnackbar(`${employee.firstName} synced to terminals`, 'success');
    } catch (error: any) {
      showSnackbar('Failed to sync employee', 'error');
    }
    setMenuAnchor(null);
  };

  const handleOpenEnrollDialog = (employee: Employee) => {
    setEnrollEmployee(employee);
    setEnrollDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, employee: Employee) => {
    setMenuAnchor(event.currentTarget);
    setMenuEmployee(employee);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuEmployee(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on_leave': return 'warning';
      default: return 'default';
    }
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Employee ID</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Designation</TableCell>
            <TableCell>Shift</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Biometrics</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id} hover>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={employee.photo} alt={employee.firstName}>
                    {employee.firstName?.[0]}{employee.lastName?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {employee.firstName} {employee.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {employee.email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>{employee.employeeId}</TableCell>
              <TableCell>{employee.department?.name || '-'}</TableCell>
              <TableCell>{employee.designation || '-'}</TableCell>
              <TableCell>{employee.shift?.name || '-'}</TableCell>
              <TableCell>
                <Chip label={employee.status} size="small" color={getStatusColor(employee.status)} />
              </TableCell>
              <TableCell>
                <Tooltip title={employee.fingerprintEnrolled ? 'Fingerprint enrolled' : 'Enroll fingerprint'}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenEnrollDialog(employee)}
                    color={employee.fingerprintEnrolled ? 'success' : 'default'}
                  >
                    <FingerprintIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              <TableCell align="right">
                <IconButton onClick={(e) => handleMenuOpen(e, employee)}>
                  <MoreVertIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </TableContainer>
  );

  const renderGridView = () => (
    <Grid container spacing={3}>
      {employees.map((employee) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <Avatar src={employee.photo} sx={{ width: 80, height: 80, mb: 1 }}>
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </Avatar>
                <Typography variant="h6" align="center">
                  {employee.firstName} {employee.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">{employee.employeeId}</Typography>
                <Chip label={employee.status} size="small" color={getStatusColor(employee.status)} sx={{ mt: 1 }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  <BusinessIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {employee.department?.name || 'No department'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <BadgeIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {employee.designation || 'No designation'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <ScheduleIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {employee.shift?.name || 'No shift'}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Tooltip title={employee.fingerprintEnrolled ? 'Fingerprint enrolled' : 'Enroll fingerprint'}>
                  <IconButton
                    onClick={() => handleOpenEnrollDialog(employee)}
                    color={employee.fingerprintEnrolled ? 'success' : 'default'}
                  >
                    <FingerprintIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <IconButton size="small" onClick={() => handleEditEmployee(employee)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleDeleteClick(employee)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Employees</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddEmployee}>
          Add Employee
        </Button>
      </Box>

      {/* Search & View Mode */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search employees..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 300 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Table view">
            <IconButton onClick={() => setViewMode('table')} color={viewMode === 'table' ? 'primary' : 'default'}>
              <ViewListIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Grid view">
            <IconButton onClick={() => setViewMode('grid')} color={viewMode === 'grid' ? 'primary' : 'default'}>
              <ViewModuleIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Employee List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : employees.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6">No employees found</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start by adding your first employee
          </Typography>
          <Button variant="contained" onClick={handleAddEmployee}>Add Employee</Button>
        </Paper>
      ) : viewMode === 'table' ? renderTableView() : renderGridView()}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuEmployee && handleEditEmployee(menuEmployee)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => menuEmployee && handleSyncEmployee(menuEmployee)}>
          <SyncIcon fontSize="small" sx={{ mr: 1 }} /> Sync to Terminals
        </MenuItem>
        <MenuItem onClick={() => menuEmployee && handleOpenEnrollDialog(menuEmployee)}>
          <FingerprintIcon fontSize="small" sx={{ mr: 1 }} />
          {menuEmployee?.fingerprintEnrolled ? 'Re-enroll Fingerprint' : 'Enroll Fingerprint'}
        </MenuItem>
        <MenuItem onClick={() => menuEmployee && handleDeleteClick(menuEmployee)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Employee Form */}
      <EmployeeForm
        open={formOpen}
        employee={selectedEmployee}
        departments={departments}
        shifts={shifts}
        onClose={handleFormClose}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {employeeToDelete?.firstName} {employeeToDelete?.lastName}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Simple & Clean Fingerprint Enrollment Dialog */}
      <FingerprintEnrollmentDialog
        open={enrollDialogOpen}
        onClose={() => setEnrollDialogOpen(false)}
        employee={enrollEmployee}
        onSuccess={() => {
          showSnackbar('Fingerprint enrolled successfully!', 'success');
          fetchEmployees(); // Refresh list to show checkmark
          setEnrollDialogOpen(false);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
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
}