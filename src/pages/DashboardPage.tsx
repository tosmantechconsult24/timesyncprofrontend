import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Skeleton, Avatar, Chip, LinearProgress,
} from '@mui/material';
import { People, CheckCircle, Cancel, BeachAccess, TrendingUp, AccessTime } from '@mui/icons-material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardApi } from '../services/api';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}20`, color }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const DashboardPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
  });

  const { data: chartData } = useQuery({
    queryKey: ['attendance-chart'],
    queryFn: dashboardApi.getTodayAttendance,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    placeholderData: keepPreviousData, // Keep previous data while fetching to prevent blipping
  });

  if (isLoading) {
    return (
      <Box>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const overview = (stats as any)?.overview || {};
  const workHours = (stats as any)?.workHours || {};
  
  // Ensure chart data is an array - handle both direct array and nested object responses
  const attendanceChart = Array.isArray(chartData) 
    ? chartData 
    : chartData?.weeklyData || chartData?.attendance || [];
  
  const deptChart = Array.isArray(chartData) && chartData.length > 0 && chartData[0]?.count && !chartData[0]?.dayName
    ? chartData
    : chartData?.departmentData || chartData?.department || [];

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Employees"
            value={overview.totalEmployees || 0}
            icon={<People />}
            color="#3b82f6"
            subtitle={`${overview.activeEmployees || 0} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Present Today"
            value={overview.presentToday || 0}
            icon={<CheckCircle />}
            color="#10b981"
            subtitle={`${overview.attendanceRate || 0}% attendance`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Absent Today"
            value={overview.absentToday || 0}
            icon={<Cancel />}
            color="#ef4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="On Leave"
            value={overview.onLeaveToday || 0}
            icon={<BeachAccess />}
            color="#f59e0b"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Weekly Attendance Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Weekly Attendance
              </Typography>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={Array.isArray(attendanceChart) ? attendanceChart : []}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dayName" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: 8,
                      color: '#f1f5f9',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorPresent)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                By Department
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={Array.isArray(deptChart) ? deptChart : []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="name"
                  >
                    {(Array.isArray(deptChart) ? deptChart : []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {(Array.isArray(deptChart) ? deptChart : []).slice(0, 4).map((dept: any, index: number) => (
                  <Chip
                    key={dept.name}
                    label={`${dept.name}: ${dept.count}`}
                    size="small"
                    sx={{ bgcolor: COLORS[index % COLORS.length] + '20', color: COLORS[index % COLORS.length] }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Work Hours Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Work Hours This Month
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                <Box>
                  <Typography variant="h3" fontWeight={700} color="primary">
                    {workHours.thisMonth?.toFixed(0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h3" fontWeight={700} color="secondary">
                    {workHours.overtime?.toFixed(0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overtime Hours
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color={workHours.change >= 0 ? 'success' : 'error'} />
                <Typography color={workHours.change >= 0 ? 'success.main' : 'error.main'}>
                  {workHours.change >= 0 ? '+' : ''}{workHours.change || 0}% vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ mt: 2 }}>
                {((stats as any)?.recentActivity || []).slice(0, 5).map((activity: any, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1.5,
                      borderBottom: index < 4 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar sx={{ width: 36, height: 36, bgcolor: activity.type === 'clock_in' ? 'success.main' : 'info.main' }}>
                      <AccessTime fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {activity.employee}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.type === 'clock_in' ? 'Clocked In' : 'Clocked Out'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
                {(!((stats as any)?.recentActivity) || ((stats as any)?.recentActivity.length === 0)) && (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No recent activity
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
