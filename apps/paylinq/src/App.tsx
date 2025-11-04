import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ui';
import Layout from '@/components/layout/Layout';

// Pages (to be created)
import Dashboard from '@/pages/Dashboard';
import WorkersList from '@/pages/workers/WorkersList';
import WorkerDetails from '@/pages/workers/WorkerDetails';
import AddWorker from '@/pages/workers/AddWorker';
import TaxRules from '@/pages/tax-rules/TaxRulesList';
import PayComponents from '@/pages/pay-components/PayComponentsList';
import TimeEntries from '@/pages/time-attendance/TimeEntries';
import Scheduling from '@/pages/scheduling/ScheduleCalendar';
import PayrollRuns from '@/pages/payroll/PayrollRunsList';
import PayrollRunDetails from '@/pages/payroll/PayrollRunDetails';
import Payslips from '@/pages/payslips/PayslipsList';
import Reconciliation from '@/pages/reconciliation/ReconciliationDashboard';
import Reports from '@/pages/reports/ReportsDashboard';
import Settings from '@/pages/settings/Settings';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Workers Management */}
            <Route path="workers" element={<WorkersList />} />
            <Route path="workers/add" element={<AddWorker />} />
            <Route path="workers/:workerId" element={<WorkerDetails />} />
            
            {/* Tax Rules */}
            <Route path="tax-rules" element={<TaxRules />} />
            
            {/* Pay Components */}
            <Route path="pay-components" element={<PayComponents />} />
            
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
            <Route path="settings" element={<Settings />} />
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
