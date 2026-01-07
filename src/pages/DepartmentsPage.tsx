import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, CardActions, Tooltip, CircularProgress,
  Checkbox, List, ListItem, ListItemIcon, ListItemText, ListItemAvatar,
  Avatar, Divider, Alert, Snackbar, FormControlLabel, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { departmentsApi, employeesApi } from '../services/api';

interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  color?: string;
  isActive: boolean;
  createdBy?: string;
  _count?: { employees: number };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  photo?: string;
  departmentId?: string;
  department?: { id: string; name: string };
}

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    color: '#3B82F6'
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentsApi.list();
      setDepartments(Array.isArray(data) ? data : data.departments || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      showSnackbar('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.list({ limit: 1000 });
      setEmployees(response.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenForm = (department?: Department) => {
    if (department) {
      setSelectedDepartment(department);
      setFormData({
        name: department.name,
        description: department.description || '',
        managerId: department.managerId || '',
        color: department.color || '#3B82F6'
      });
    } else {
      setSelectedDepartment(null);
      setFormData({ name: '', description: '', managerId: '', color: '#3B82F6' });
    }
    setFormDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    try {
      if (selectedDepartment) {
        await departmentsApi.update(selectedDepartment.id, formData);
        showSnackbar('Department updated successfully', 'success');
      } else {
        await departmentsApi.create(formData);
        showSnackbar('Department created successfully', 'success');
      }
      setFormDialogOpen(false);
      fetchDepartments();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to save department', 'error');
    }
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;
    try {
      await departmentsApi.delete(selectedDepartment.id);
      showSnackbar('Department deleted successfully', 'success');
      setDeleteDialogOpen(false);
      fetchDepartments();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to delete department', 'error');
    }
  };

  // Assign Employees Functions
  const handleOpenAssignDialog = (department: Department) => {
    setSelectedDepartment(department);
    // Pre-select employees already in this department
    const currentEmployees = employees
      .filter(emp => emp.departmentId === department.id)
      .map(emp => emp.id);
    setSelectedEmployees(currentEmployees);
    setAssignDialogOpen(true);
  };

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployeesForAssignment.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployeesForAssignment.map(emp => emp.id));
    }
  };

  const handleAssignEmployees = async () => {
    if (!selectedDepartment) return;
    
    setAssigning(true);
    try {
      // Get employees to add (newly selected)
      const currentDeptEmployees = employees
        .filter(emp => emp.departmentId === selectedDepartment.id)
        .map(emp => emp.id);
      
      const toAdd = selectedEmployees.filter(id => !currentDeptEmployees.includes(id));
      const toRemove = currentDeptEmployees.filter(id => !selectedEmployees.includes(id));
      
      // Update employees - add to department
      for (const empId of toAdd) {
        await employeesApi.update(empId, { departmentId: selectedDepartment.id });
      }
      
      // Update employees - remove from department
      for (const empId of toRemove) {
        await employeesApi.update(empId, { departmentId: null });
      }
      
      showSnackbar(`Successfully updated ${toAdd.length + toRemove.length} employee assignments`, 'success');
      setAssignDialogOpen(false);
      fetchEmployees();
      fetchDepartments();
    } catch (error: any) {
      showSnackbar('Failed to assign employees', 'error');
    } finally {
      setAssigning(false);
    }
  };

  // Filter employees for assignment dialog
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const filteredEmployeesForAssignment = employees.filter(emp => {
    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(searchLower) ||
      emp.lastName.toLowerCase().includes(searchLower) ||
      emp.employeeId.toLowerCase().includes(searchLower)
    );
  });

  // Filter departments
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeCount = (departmentId: string) => {
    return employees.filter(emp => emp.departmentId === departmentId).length;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Departments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Department
        </Button>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Departments Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredDepartments.map((department) => (
            <Grid item xs={12} sm={6} md={4} key={department.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderTop: 4,
                  borderColor: department.color || '#3B82F6'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ color: department.color || '#3B82F6', mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold">
                      {department.name}
                    </Typography>
                  </Box>
                  
                  {department.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {department.description}
                    </Typography>
                  )}
                  
                  {department.managerName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Manager:
                      </Typography>
                      <Chip 
                        label={department.managerName}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}
                  
                  {department.createdBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Created by:
                      </Typography>
                      <Chip 
                        label={department.createdBy}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {getEmployeeCount(department.id)} employees
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenAssignDialog(department)}
                    variant="outlined"
                  >
                    Assign Employees
                  </Button>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenForm(department)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => {
                        setSelectedDepartment(department);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Department Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDepartment ? 'Edit Department' : 'Add Department'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Department Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Manager</InputLabel>
              <Select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                label="Manager"
              >
                <MenuItem value="">No Manager</MenuItem>
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="body2" gutterBottom>Department Color</Typography>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: 60, height: 40, cursor: 'pointer' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveDepartment}>
            {selectedDepartment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Employees Dialog */}
      <Dialog 
        open={assignDialogOpen} 
        onClose={() => setAssignDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon color="primary" />
            Assign Employees to {selectedDepartment?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select employees to assign to this department. Unchecking will remove them from the department.
            </Alert>
            
            <TextField
              fullWidth
              placeholder="Search employees..."
              value={employeeSearchTerm}
              onChange={(e) => setEmployeeSearchTerm(e.target.value)}
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedEmployees.length === filteredEmployeesForAssignment.length && filteredEmployeesForAssignment.length > 0}
                  indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < filteredEmployeesForAssignment.length}
                  onChange={handleSelectAll}
                />
              }
              label={`Select All (${selectedEmployees.length} selected)`}
            />
          </Box>
          
          <Divider />
          
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredEmployeesForAssignment.map((employee) => (
              <ListItem
                key={employee.id}
                dense
                button
                onClick={() => handleToggleEmployee(employee.id)}
                sx={{
                  bgcolor: selectedEmployees.includes(employee.id) ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedEmployees.includes(employee.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemAvatar>
                  <Avatar src={employee.photo} sx={{ width: 36, height: 36 }}>
                    {employee.firstName[0]}{employee.lastName[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${employee.firstName} ${employee.lastName}`}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{employee.employeeId}</span>
                      {employee.department && employee.departmentId !== selectedDepartment?.id && (
                        <Chip 
                          label={employee.department.name} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                />
                {employee.departmentId === selectedDepartment?.id && (
                  <Chip 
                    label="Current" 
                    size="small" 
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignEmployees}
            disabled={assigning}
            startIcon={assigning ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {assigning ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDepartment?.name}"? 
            This will remove the department assignment from all employees.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteDepartment}>
            Delete
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
  );
};

export default DepartmentsPage;