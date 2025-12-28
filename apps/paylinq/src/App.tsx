import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Layout from '@/components/layout/Layout';
import { isAuthError, isPermissionError } from '@/utils/errorHandler';

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
const ShiftTypes = lazy(() => import('@/pages/time-attendance/ShiftTypes'));
const Scheduling = lazy(() => import('@/pages/scheduling/ScheduleCalendar'));
const PayrollRuns = lazy(() => import('@/pages/payroll/PayrollRunsList'));
const PayrollRunDetails = lazy(() => import('@/pages/payroll/PayrollRunDetails'));
const Payslips = lazy(() => import('@/pages/payslips/PayslipsList'));
const Reconciliation = lazy(() => import('@/pages/reconciliation/ReconciliationDashboard'));
const Reports = lazy(() => import('@/pages/reports/ReportsDashboard'));
const SettingsHub = lazy(() => import('@/pages/settings/SettingsHub'));
const GeneralSettings = lazy(() => import('@/pages/settings/GeneralSettings'));
const EmailSettings = lazy(() => import('@/pages/settings/EmailSettings'));
const NotificationSettings = lazy(() => import('@/pages/settings/NotificationSettings'));
const PayrollDefaultsSettings = lazy(() => import('@/pages/settings/PayrollDefaultsSettings'));
const PayPeriodConfigPage = lazy(() => import('@/pages/PayPeriodConfigPage'));
const TaxSettingsPage = lazy(() => import('@/pages/TaxSettingsPage'));
const PayrollRunTypeSettings = lazy(() => import('@/pages/PayrollRunTypeSettings'));
const PayslipTemplates = lazy(() => import('@/pages/settings/payslip-templates/PayslipTemplates'));
const PayslipTemplateEditor = lazy(() => import('@/pages/settings/payslip-templates/PayslipTemplateEditor'));
const WorkerTypes = lazy(() => import('@/pages/worker-types/WorkerTypesList'));
const LoontijdvakSettings = lazy(() => import('@/pages/settings/LoontijdvakSettings'));
const RolesPermissions = lazy(() => import('@/pages/settings/RolesPermissions'));

// Currency & Approvals
const ExchangeRatesPage = lazy(() => import('@/components/currency/ExchangeRatesPage'));
const CurrencyConfigPage = lazy(() => import('@/components/currency/CurrencyConfigPage'));
const ApprovalQueuePage = lazy(() => import('@/components/approvals/ApprovalQueuePage'));

// Compensation
const CompensationManagementPage = lazy(() => import('@/pages/CompensationManagementPage'));
const CreateCompensationForm = lazy(() => import('@/pages/CreateCompensationForm'));

// Create a query client for React Query with smart retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors - user needs to log in again
        if (isAuthError(error)) {
          return false;
        }
        // Don't retry on permission errors - user lacks access
        if (isPermissionError(error)) {
          return false;
        }
        // Don't retry on 404s - these are expected when resources don't exist
        if (error?.response?.status === 404) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false, // Never retry mutations
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ToastProvider>
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
            
            {/* Compensation */}
            <Route path="compensation" element={<CompensationManagementPage />} />
            <Route path="compensation/create" element={<CreateCompensationForm />} />
            
            {/* Reconciliation */}
            <Route path="reconciliation" element={<Reconciliation />} />
            
            {/* Reports */}
            <Route path="reports" element={<Reports />} />
            
            {/* Settings */}
            <Route path="settings" element={<SettingsHub />} />
            <Route path="settings/general" element={<GeneralSettings />} />
            <Route path="settings/email" element={<EmailSettings />} />
            <Route path="settings/notifications" element={<NotificationSettings />} />
            <Route path="settings/worker-types" element={<WorkerTypes />} />
            <Route path="settings/shift-types" element={<ShiftTypes />} />
            <Route path="settings/payroll-defaults" element={<PayrollDefaultsSettings />} />
            <Route path="settings/pay-periods" element={<PayPeriodConfigPage />} />
            <Route path="settings/tax-settings" element={<TaxSettingsPage />} />
            <Route path="settings/payroll-run-types" element={<PayrollRunTypeSettings />} />
            <Route path="settings/payslip-templates" element={<PayslipTemplates />} />
            <Route path="settings/payslip-templates/:id" element={<PayslipTemplateEditor />} />
            <Route path="settings/loontijdvak" element={<LoontijdvakSettings />} />
            <Route path="settings/roles" element={<RolesPermissions />} />
            
            {/* Currency Management (under Payroll Configuration) */}
            <Route path="settings/currency/exchange-rates" element={<ExchangeRatesPage organizationId={''} />} />
            <Route path="settings/currency/configuration" element={<CurrencyConfigPage />} />
            
            {/* Approval Workflows */}
            <Route path="approvals" element={<ApprovalQueuePage />} />
            
            {/* 404 */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
                </Routes>
              </Suspense>
            </ToastProvider>
          </ThemeProvider>
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
