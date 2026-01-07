import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Tabs, Tab, TextField,
} from '@mui/material';
import { CheckCircle, Cancel, BeachAccess, AccessTime, Warning } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { attendanceApi, dashboardApi } from '../services/api';

const AttendancePage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: dashboardStats } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
  });

  const { data: weeklyStatsData } = useQuery({
    queryKey: ['weekly-attendance'],
    queryFn: dashboardApi.getTodayAttendance,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
  });

  const stats = dashboardStats?.overview || {};
  // Ensure weeklyData is an array
  const weeklyData = Array.isArray(weeklyStatsData) ? weeklyStatsData : weeklyStatsData?.weeklyData || weeklyStatsData?.data || [];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Attendance</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Daily View" />
      </Tabs>

      {tab === 0 && (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#10b98120', color: '#10b981' }}><CheckCircle /></Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.presentToday || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Present</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#ef444420', color: '#ef4444' }}><Cancel /></Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.absentToday || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Absent</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#f59e0b20', color: '#f59e0b' }}><BeachAccess /></Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.onLeaveToday || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">On Leave</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#f9731620', color: '#f97316' }}><Warning /></Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.lateToday || 0}</Typography>
                    <Typography variant="body2" color="text.secondary">Late</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Weekly Trend */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Weekly Trend</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={Array.isArray(weeklyData) ? weeklyData : weeklyData?.weeklyData || []}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dayName" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="#667eea" fill="url(#colorCount)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>Daily Attendance</Typography>
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">{stats.presentToday || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Present</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} color="error.main">{stats.absentToday || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Absent</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700} color="warning.main">{stats.lateToday || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Late</Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Select a date to view detailed attendance records
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AttendancePage;
