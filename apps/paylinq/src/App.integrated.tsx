/**
 * Paylinq App Configuration & Integration
 * 
 * This file shows how to integrate all Phase 1-4 components
 * Update your existing App.tsx with these patterns
 */

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Layout components (Phase 3)
import AppLayout from './components/layout/AppLayout';

// Auth components (Phase 4)
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Page components (Phase 2)
import Dashboard from './pages/Dashboard';
import NotFoundPage from './pages/NotFoundPage';

// Payroll pages
import PayrollRunsList from './pages/payroll/PayrollRunsList';
import PayrollRunDetailsPage from './pages/PayrollRunDetailsPage';
import CreatePayrollRunForm from './pages/CreatePayrollRunForm';

// Timesheet pages
import TimesheetsPage from './pages/TimesheetsPage';
import TimesheetDetailsPage from './pages/TimesheetDetailsPage';
import TimeEntryForm from './pages/TimeEntryForm';

// Compensation pages
import CompensationManagementPage from './pages/CompensationManagementPage';
import CreateCompensationForm from './pages/CreateCompensationForm';

// Reports
import ReportsDashboard from './pages/ReportsDashboard';

// Settings
import SettingsHub from './pages/settings/SettingsHub';
import PayPeriodConfigPage from './pages/PayPeriodConfigPage';
import TaxSettingsPage from './pages/TaxSettingsPage';
import SystemPreferencesPage from './pages/SystemPreferencesPage';
import RolesPermissions from './pages/settings/RolesPermissions';

/**
 * Configure TanStack Query Client
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Router Configuration
 * Using React Router v7 data router API
 */
const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      {
        index: true,
        element: <Dashboard />,
      },

      // Payroll Runs
      {
        path: 'payroll-runs',
        children: [
          {
            index: true,
            element: <PayrollRunsList />,
          },
          {
            path: 'new',
            element: <CreatePayrollRunForm />,
          },
          {
            path: ':id',
            element: <PayrollRunDetailsPage />,
          },
        ],
      },

      // Timesheets
      {
        path: 'timesheets',
        children: [
          {
            index: true,
            element: <TimesheetsPage />,
          },
          {
            path: 'new',
            element: <TimeEntryForm />,
          },
          {
            path: ':id',
            element: <TimesheetDetailsPage />,
          },
          {
            path: ':id/edit',
            element: <TimeEntryForm />,
          },
        ],
      },

      // Compensation
      {
        path: 'compensation',
        children: [
          {
            index: true,
            element: <CompensationManagementPage />,
          },
          {
            path: 'create',
            element: <CreateCompensationForm />,
          },
        ],
      },

      // Reports
      {
        path: 'reports',
        element: <ReportsDashboard />,
      },

      // Settings
      {
        path: 'settings',
        children: [
          {
            index: true,
            element: <SettingsHub />,
          },
          {
            path: 'roles',
            element: <RolesPermissions />,
          },
          {
            path: 'pay-periods',
            element: <PayPeriodConfigPage />,
          },
          {
            path: 'tax',
            element: <TaxSettingsPage />,
          },
          {
            path: 'preferences',
            element: <SystemPreferencesPage />,
          },
        ],
      },
    ],
  },

  // 404 page
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

/**
 * Main App Component
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* React Query Devtools (only in development) */}
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )} */}
    </QueryClientProvider>
  );
}

export default App;

/**
 * INTEGRATION NOTES:
 * 
 * 1. Install dependencies (if not already installed):
 *    pnpm add @tanstack/react-query @tanstack/react-query-devtools
 *    pnpm add react-router-dom
 * 
 * 2. Update your existing App.tsx with this structure
 * 
 * 3. Ensure all page components are created in src/pages/
 * 
 * 4. Ensure layout components are in src/components/layout/
 * 
 * 5. Update import paths based on your tsconfig.json aliases
 * 
 * 6. For API integration:
 *    - Import hooks from @recruitiq/api-client or your hooks folder
 *    - Replace mock data in pages with useQuery/useMutation calls
 *    - See PayrollRunsPage.example.tsx for integration pattern
 * 
 * 7. Environment variables (.env):
 *    VITE_API_BASE_URL=http://localhost:3000/api
 *    VITE_AUTH_ENABLED=true
 * 
 * 8. Next steps:
 *    - Test login flow
 *    - Test protected routes
 *    - Test navigation
 *    - Integrate real API endpoints
 *    - Add error boundary
 *    - Add loading states
 */
