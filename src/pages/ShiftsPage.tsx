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
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  AccessTime as AccessTimeIcon,
  NightsStay as NightsStayIcon
} from '@mui/icons-material';
import { shiftsApi, employeesApi } from '../services/api';

interface Shift {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  graceMinutes: number;
  overtimeAfter: number;
  workingDays: string;
  color?: string;
  isNightShift: boolean;
  isActive: boolean;
  createdBy?: { firstName: string; lastName: string };
}

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email?: string;
  photo?: string;
  shiftId?: string;
  shift?: { id: string; name: string };
  department?: { id: string; name: string };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ShiftsPage: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    graceMinutes: 15,
    overtimeAfter: 8,
    workingDays: [1, 2, 3, 4, 5],
    color: '#10B981',
    isNightShift: false
  });
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const data = await shiftsApi.list();
      setShifts(data);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      showSnackbar('Failed to load shifts', 'error');
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

  const handleOpenForm = (shift?: Shift) => {
    if (shift) {
      setSelectedShift(shift);
      let workingDays: number[] = [];
      try {
        workingDays = JSON.parse(shift.workingDays);
      } catch {
        workingDays = [1, 2, 3, 4, 5];
      }
      setFormData({
        name: shift.name,
        description: shift.description || '',
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        graceMinutes: shift.graceMinutes,
        overtimeAfter: shift.overtimeAfter,
        workingDays,
        color: shift.color || '#10B981',
        isNightShift: shift.isNightShift
      });
    } else {
      setSelectedShift(null);
      setFormData({
        name: '',
        description: '',
        startTime: '09:00',
        endTime: '17:00',
        breakDuration: 60,
        graceMinutes: 15,
        overtimeAfter: 8,
        workingDays: [1, 2, 3, 4, 5],
        color: '#10B981',
        isNightShift: false
      });
    }
    setFormDialogOpen(true);
  };

  const handleSaveShift = async () => {
    try {
      const payload = {
        ...formData,
        workingDays: JSON.stringify(formData.workingDays)
      };
      
      if (selectedShift) {
        await shiftsApi.update(selectedShift.id, payload);
        showSnackbar('Shift updated successfully', 'success');
      } else {
        await shiftsApi.create(payload);
        showSnackbar('Shift created successfully', 'success');
      }
      setFormDialogOpen(false);
      fetchShifts();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to save shift', 'error');
    }
  };

  const handleDeleteShift = async () => {
    if (!selectedShift) return;
    try {
      await shiftsApi.delete(selectedShift.id);
      showSnackbar('Shift deleted successfully', 'success');
      setDeleteDialogOpen(false);
      fetchShifts();
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to delete shift', 'error');
    }
  };

  // Assign Employees Functions
  const handleOpenAssignDialog = (shift: Shift) => {
    setSelectedShift(shift);
    const currentEmployees = employees
      .filter(emp => emp.shiftId === shift.id)
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
    if (!selectedShift) return;
    
    setAssigning(true);
    try {
      const currentShiftEmployees = employees
        .filter(emp => emp.shiftId === selectedShift.id)
        .map(emp => emp.id);
      
      const toAdd = selectedEmployees.filter(id => !currentShiftEmployees.includes(id));
      const toRemove = currentShiftEmployees.filter(id => !selectedEmployees.includes(id));
      
      for (const empId of toAdd) {
        await employeesApi.update(empId, { shiftId: selectedShift.id });
      }
      
      for (const empId of toRemove) {
        await employeesApi.update(empId, { shiftId: null });
      }
      
      showSnackbar(`Successfully updated ${toAdd.length + toRemove.length} employee assignments`, 'success');
      setAssignDialogOpen(false);
      fetchEmployees();
      fetchShifts();
    } catch (error: any) {
      showSnackbar('Failed to assign employees', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleWorkingDay = (day: number) => {
    setFormData(prev => {
      const days = [...prev.workingDays];
      const index = days.indexOf(day);
      if (index > -1) {
        days.splice(index, 1);
      } else {
        days.push(day);
        days.sort();
      }
      return { ...prev, workingDays: days };
    });
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

  // Filter shifts
  const filteredShifts = shifts.filter(shift =>
    shift.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeCount = (shiftId: string) => {
    return employees.filter(emp => emp.shiftId === shiftId).length;
  };

  const formatWorkingDays = (workingDaysJson: string) => {
    try {
      const days = JSON.parse(workingDaysJson);
      return days.map((d: number) => WEEKDAYS[d]).join(', ');
    } catch {
      return 'Mon-Fri';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Shifts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Add Shift
        </Button>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search shifts..."
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

      {/* Shifts Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredShifts.map((shift) => (
            <Grid item xs={12} sm={6} md={4} key={shift.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderTop: 4,
                  borderColor: shift.color || '#10B981'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {shift.isNightShift ? (
                        <NightsStayIcon sx={{ color: shift.color || '#10B981', mr: 1 }} />
                      ) : (
                        <ScheduleIcon sx={{ color: shift.color || '#10B981', mr: 1 }} />
                      )}
                      <Typography variant="h6" fontWeight="bold">
                        {shift.name}
                      </Typography>
                    </Box>
                    {shift.isNightShift && (
                      <Chip label="Night" size="small" color="secondary" />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {shift.startTime} - {shift.endTime}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {formatWorkingDays(shift.workingDays)}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Break: {shift.breakDuration} min | Grace: {shift.graceMinutes} min
                    </Typography>
                  </Box>
                  
                  {shift.createdBy && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Created by:
                      </Typography>
                      <Chip 
                        label={`${shift.createdBy.firstName} ${shift.createdBy.lastName}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {getEmployeeCount(shift.id)} employees
                    </Typography>
                  </Box>
                </CardContent>
                
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenAssignDialog(shift)}
                    variant="outlined"
                  >
                    Assign Employees
                  </Button>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenForm(shift)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => {
                        setSelectedShift(shift);
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

      {/* Shift Form Dialog */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedShift ? 'Edit Shift' : 'Add Shift'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Shift Name"
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
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="End Time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <TextField
                  label="Break (min)"
                  type="number"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Grace (min)"
                  type="number"
                  value={formData.graceMinutes}
                  onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="OT After (hrs)"
                  type="number"
                  value={formData.overtimeAfter}
                  onChange={(e) => setFormData({ ...formData, overtimeAfter: parseFloat(e.target.value) })}
                  fullWidth
                />
              </Grid>
            </Grid>
            
            <Box>
              <Typography variant="body2" gutterBottom>Working Days</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {WEEKDAYS.map((day, index) => (
                  <Chip
                    key={day}
                    label={day}
                    onClick={() => handleToggleWorkingDay(index)}
                    color={formData.workingDays.includes(index) ? 'primary' : 'default'}
                    variant={formData.workingDays.includes(index) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isNightShift}
                  onChange={(e) => setFormData({ ...formData, isNightShift: e.target.checked })}
                />
              }
              label="Night Shift"
            />
            
            <Box>
              <Typography variant="body2" gutterBottom>Shift Color</Typography>
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
          <Button variant="contained" onClick={handleSaveShift}>
            {selectedShift ? 'Update' : 'Create'}
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
            Assign Employees to {selectedShift?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Select employees to assign to this shift. Unchecking will remove them from the shift.
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
                      {employee.shift && employee.shiftId !== selectedShift?.id && (
                        <Chip 
                          label={employee.shift.name} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                />
                {employee.shiftId === selectedShift?.id && (
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
        <DialogTitle>Delete Shift</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedShift?.name}"? 
            This will remove the shift assignment from all employees.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteShift}>
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

export default ShiftsPage;