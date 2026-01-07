import React, { useState, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, Avatar, Menu, MenuItem, Divider, useTheme, Badge, Tooltip,
} from '@mui/material';
import {
  Dashboard, People, Business, Schedule, AccessTime, EventNote, Description, Settings,
  Menu as MenuIcon, ChevronLeft, Brightness4, Brightness7, Logout, Notifications,
  Timer, BeachAccess, Payments, Error,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { ColorModeContext } from '../../App';

const drawerWidth = 260;
const collapsedWidth = 72;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', permission: 'attendance:read' },
  { text: 'Employees', icon: <People />, path: '/employees', permission: 'employees:read' },
  { text: 'Departments', icon: <Business />, path: '/departments', permission: 'departments:read' },
  { text: 'Shifts', icon: <Schedule />, path: '/shifts', permission: 'shifts:read' },
  { text: 'Attendance', icon: <AccessTime />, path: '/attendance', permission: 'attendance:read' },
  { text: 'Time Tracking', icon: <Timer />, path: '/time-tracking', permission: 'attendance:read' },
  { text: 'Leaves', icon: <BeachAccess />, path: '/leaves', permission: 'leaves:read' },
  { text: 'Reports', icon: <Description />, path: '/reports', permission: 'reports:read' },
  { text: 'Employee Rates', icon: <Payments />, path: '/employee-rates', permission: 'settings:read', adminOnly: true },
  { text: 'Infractions', icon: <Error />, path: '/infractions', permission: 'settings:read', adminOnly: true },
  { text: 'Deductions', icon: <Payments />, path: '/payroll-deductions', permission: 'settings:read', adminOnly: true },
  { text: 'Settings', icon: <Settings />, path: '/settings', permission: 'settings:read' },
];

const Layout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const colorMode = useContext(ColorModeContext);
  
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(item => {
    if ((item as any).adminOnly && user?.role !== 'super_admin' && user?.role !== 'admin') {
      return false;
    }
    return hasPermission(item.permission) || user?.role === 'super_admin';
  });

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? collapsedWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: collapsed ? collapsedWidth : drawerWidth,
            boxSizing: 'border-box',
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
              : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccessTime sx={{ color: '#fff' }} />
          </Box>
          {!collapsed && (
            <Typography variant="h6" sx={{ fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TimeSync
            </Typography>
          )}
        </Box>

        <Divider sx={{ mx: 2 }} />

        {/* Menu Items */}
        <List sx={{ px: 1, py: 2, flex: 1 }}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip title={collapsed ? item.text : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: 2,
                      minHeight: 48,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: 2,
                      background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                      '&:hover': { background: isActive ? undefined : theme.palette.action.hover },
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: collapsed ? 0 : 40, 
                      justifyContent: 'center',
                      color: isActive ? '#fff' : theme.palette.text.secondary,
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText 
                        primary={item.text} 
                        sx={{ color: isActive ? '#fff' : theme.palette.text.primary }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {/* User Info */}
        {!collapsed && (
          <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.role?.replace('_', ' ')}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* App Bar */}
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            bgcolor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar>
            <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ mr: 2 }}>
              {collapsed ? <MenuIcon /> : <ChevronLeft />}
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              {menuItems.find(m => m.path === location.pathname)?.text || 'Dashboard'}
            </Typography>

            <IconButton onClick={colorMode.toggleColorMode} sx={{ mr: 1 }}>
              {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>

            <IconButton sx={{ mr: 1 }}>
              <Badge badgeContent={0} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.firstName?.[0]}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Typography variant="body2">{user?.email}</Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
