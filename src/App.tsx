// ============================================
// App.tsx - Complete with ColorModeContext
// ============================================

import React, { useEffect, useState, useMemo, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, PaletteMode } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Store
import { useAuthStore } from './store/authStore';

// Layout
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ShiftsPage from './pages/ShiftsPage';
import AttendancePage from './pages/AttendancePage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import LeavesPage from './pages/LeavesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import TimeStationKiosk from './pages/TimeStationKiosk';
import EmployeeRatesPage from './pages/EmployeeRatesPage';
import InfractionsPage from './pages/InfractionsPage';
import PayrollDeductionsPage from './pages/PayrollDeductionsPage';

// ============================================
// Color Mode Context - EXPORTED
// ============================================
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: 'dark' as PaletteMode,
});

// Loading component
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: 'white',
    fontSize: '18px',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #333',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      Loading...
    </div>
  </div>
);

// Get design tokens based on mode
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          // Dark mode
          primary: {
            main: '#6366f1',
            light: '#818cf8',
            dark: '#4f46e5',
          },
          secondary: {
            main: '#22c55e',
            light: '#4ade80',
            dark: '#16a34a',
          },
          background: {
            default: '#0f0f23',
            paper: '#1a1a2e',
          },
          text: {
            primary: '#ffffff',
            secondary: '#a1a1aa',
          },
        }
      : {
          // Light mode
          primary: {
            main: '#4f46e5',
            light: '#6366f1',
            dark: '#4338ca',
          },
          secondary: {
            main: '#16a34a',
            light: '#22c55e',
            dark: '#15803d',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
          text: {
            primary: '#1f2937',
            secondary: '#6b7280',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

// Query client with optimized settings to prevent UI blipping
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Data stays fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Keep unused data for 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Public Route Component
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Auth Initializer Component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuth } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setInitialized(true);
    };
    init();
  }, [checkAuth]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

// Main App Component
const App: React.FC = () => {
  // Color mode state
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('colorMode');
    return (savedMode as PaletteMode) || 'dark';
  });

  // Color mode context value
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('colorMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  // Theme
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <BrowserRouter>
              <AuthInitializer>
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <LoginPage />
                      </PublicRoute>
                    }
                  />
                  <Route
                    path="/kiosk"
                    element={<TimeStationKiosk />}
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="departments" element={<DepartmentsPage />} />
                    <Route path="shifts" element={<ShiftsPage />} />
                    <Route path="attendance" element={<AttendancePage />} />
                    <Route path="time-tracking" element={<TimeTrackingPage />} />
                    <Route path="leaves" element={<LeavesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="employee-rates" element={<EmployeeRatesPage />} />
                    <Route path="infractions" element={<InfractionsPage />} />
                    <Route path="payroll-deductions" element={<PayrollDeductionsPage />} />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </AuthInitializer>
            </BrowserRouter>
          </LocalizationProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </QueryClientProvider>
  );
};

export default App;