import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Layout from '@/components/layout/Layout';

// Only import Login eagerly (needed immediately)
import Login from '@/pages/Login';

// Lazy load all protected routes
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const WorkersList = lazy(() => import('@/pages/workers/WorkersList'));
const WorkerDetails = lazy(() => import('@/pages/workers/WorkerDetails'));
const WorkerPayStructureDetail = lazy(() => import('@/pages/WorkerPayStructureDetail'));
const AddWorker = lazy(() => import('@/pages/workers/AddWorker'));
const TaxRules = lazy(() => import('@/pages/tax-rules/TaxRulesList'));
const PayComponents = lazy(() => import('@/pages/pay-components/PayComponentsList'));
const PayStructureTemplateDetail = lazy(() => import('@/pages/pay-structures/PayStructureTemplateDetail'));
const TimeEntries = lazy(() => import('@/pages/time-attendance/TimeEntries'));
const Scheduling = lazy(() => import('@/pages/scheduling/ScheduleCalendar'));
const PayrollRuns = lazy(() => import('@/pages/payroll/PayrollRunsList'));
const PayrollRunDetails = lazy(() => import('@/pages/payroll/PayrollRunDetails'));
const Payslips = lazy(() => import('@/pages/payslips/PayslipsList'));
const Reconciliation = lazy(() => import('@/pages/reconciliation/ReconciliationDashboard'));
const Reports = lazy(() => import('@/pages/reports/ReportsDashboard'));
const SystemPreferences = lazy(() => import('@/pages/SystemPreferencesPage'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Workers Management */}
            <Route path="workers" element={<WorkersList />} />
            <Route path="workers/add" element={<AddWorker />} />
            <Route path="workers/:workerId" element={<WorkerDetails />} />
            <Route path="workers/:employeeId/pay-structure" element={<WorkerPayStructureDetail />} />
            
            {/* Tax Rules */}
            <Route path="tax-rules" element={<TaxRules />} />
            
            {/* Pay Components */}
            <Route path="pay-components" element={<PayComponents />} />
            <Route path="pay-structures/:templateId" element={<PayStructureTemplateDetail />} />
            
            {/* Time & Attendance */}
            <Route path="time-entries" element={<TimeEntries />} />
            
            {/* Scheduling */}
            <Route path="scheduling" element={<Scheduling />} />
            
            {/* Payroll Runs */}
            <Route path="payroll" element={<PayrollRuns />} />
            <Route path="payroll/:runId" element={<PayrollRunDetails />} />
            
            {/* Payslips */}
            <Route path="payslips" element={<Payslips />} />
            
            {/* Reconciliation */}
            <Route path="reconciliation" element={<Reconciliation />} />
            
            {/* Reports */}
            <Route path="reports" element={<Reports />} />
            
            {/* Settings */}
            <Route path="settings" element={<SystemPreferences />} />
            
            {/* 404 */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
