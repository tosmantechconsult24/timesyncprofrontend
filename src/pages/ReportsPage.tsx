import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField, Tabs, Tab, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { Download, TrendingUp } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { reportsApi } from '../services/api';
import { formatCurrency } from '../utils/currency';

const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: attendanceReport, isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance-report', startDate, endDate],
    queryFn: () => reportsApi.getAttendanceSummary({ startDate, endDate, groupBy: 'day' }),
    enabled: tab === 0,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const { data: overtimeReport, isLoading: loadingOvertime } = useQuery({
    queryKey: ['overtime-report', startDate, endDate],
    queryFn: () => reportsApi.getMonthlyReport({ startDate, endDate, type: 'overtime' }),
    enabled: tab === 1,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const { data: latenessReport, isLoading: loadingLateness } = useQuery({
    queryKey: ['lateness-report', startDate, endDate],
    queryFn: () => reportsApi.getMonthlyReport({ startDate, endDate, type: 'lateness' }),
    enabled: tab === 2,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const { data: payrollReport, isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll-report', startDate, endDate],
    queryFn: () => reportsApi.getMonthlyReport({ startDate, endDate, type: 'payroll' }),
    enabled: tab === 3,
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });

  const summary = attendanceReport?.summary || {};
  const chartData = Array.isArray(attendanceReport) ? attendanceReport : (attendanceReport?.data || []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Reports & Analytics</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="outlined" startIcon={<Download />}>Export</Button>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Attendance" />
        <Tab label="Overtime" />
        <Tab label="Lateness" />
        <Tab label="Payroll" />
      </Tabs>

      {/* Attendance Report */}
      {tab === 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700}>{Math.round(summary.totalHours || 0)}</Typography>
                <Typography color="text.secondary">Total Hours</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700}>{Math.round(summary.totalRegularHours || 0)}</Typography>
                <Typography color="text.secondary">Regular Hours</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700}>{Math.round(summary.totalOvertimeHours || 0)}</Typography>
                <Typography color="text.secondary">Overtime Hours</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700}>{Math.round(summary.averageHoursPerDay || 0)}</Typography>
                <Typography color="text.secondary">Avg Hours/Day</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Attendance Trend</Typography>
              {loadingAttendance ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="present" stroke="#10b981" fill="url(#colorPresent)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Overtime Report */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Overtime Summary</Typography>
            {loadingOvertime ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{Math.round(overtimeReport?.summary?.totalOvertimeHours || 0)}</Typography>
                      <Typography color="text.secondary">Total OT Hours</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{formatCurrency(overtimeReport?.summary?.estimatedCost || 0)}</Typography>
                      <Typography color="text.secondary">Est. Cost</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{overtimeReport?.summary?.employeesWithOvertime || 0}</Typography>
                      <Typography color="text.secondary">Employees</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell align="right">OT Hours</TableCell>
                        <TableCell align="right">OT Days</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(overtimeReport?.topEmployees || []).slice(0, 10).map((emp: any) => (
                        <TableRow key={emp.employee?.id}>
                          <TableCell>{emp.employee?.name}</TableCell>
                          <TableCell>{emp.employee?.department}</TableCell>
                          <TableCell align="right">{emp.overtimeHours?.toFixed(1)}</TableCell>
                          <TableCell align="right">{emp.overtimeDays}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lateness Report */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Lateness Analysis</Typography>
            {loadingLateness ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{latenessReport?.summary?.lateInstances || 0}</Typography>
                      <Typography color="text.secondary">Late Instances</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{Math.round(latenessReport?.summary?.totalLateMinutes || 0)}</Typography>
                      <Typography color="text.secondary">Total Minutes</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{Math.round(latenessReport?.summary?.averageLateMinutes || 0)}</Typography>
                      <Typography color="text.secondary">Avg Minutes</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h4" fontWeight={700}>{latenessReport?.summary?.latenessRate || 0}%</Typography>
                      <Typography color="text.secondary">Rate</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={latenessReport?.dailyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                    <Bar dataKey="lateCount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payroll Report */}
      {tab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Payroll Summary</Typography>
            {loadingPayroll ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={700}>{Math.round(payrollReport?.summary?.totalRegularHours || 0)}</Typography>
                      <Typography color="text.secondary">Regular Hours</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={700}>{Math.round(payrollReport?.summary?.totalOvertimeHours || 0)}</Typography>
                      <Typography color="text.secondary">OT Hours</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={700}>{formatCurrency(payrollReport?.summary?.totalRegularPay || 0)}</Typography>
                      <Typography color="text.secondary">Regular Pay</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={700}>{formatCurrency(payrollReport?.summary?.totalGrossPay || 0)}</Typography>
                      <Typography color="text.secondary">Gross Pay</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell align="right">Regular Hrs</TableCell>
                        <TableCell align="right">OT Hrs</TableCell>
                        <TableCell align="right">Rate</TableCell>
                        <TableCell align="right">Gross Pay</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(payrollReport?.employees || []).slice(0, 15).map((emp: any) => (
                        <TableRow key={emp.employee?.id}>
                          <TableCell>{emp.employee?.name}</TableCell>
                          <TableCell align="right">{emp.regularHours?.toFixed(1)}</TableCell>
                          <TableCell align="right">{emp.overtimeHours?.toFixed(1)}</TableCell>
                          <TableCell align="right">{formatCurrency(emp.hourlyRate)}</TableCell>
                          <TableCell align="right">{formatCurrency(emp.grossPay)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ReportsPage;
