import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';

import { ProtectedRoute } from '@core/routing/ProtectedRoute';
import { AuthLayout } from '@shared/layouts/AuthLayout';
import { AdaptiveLayout } from '@shared/layouts/AdaptiveLayout';

// Lazy load feature modules

// Auth pages
const Login = lazy(() => import('@core/auth/pages/Login'));
const Register = lazy(() => import('@core/auth/pages/Register'));

// Recruitment module
const RecruitmentDashboard = lazy(() => import('@features/recruitment/pages/Dashboard'));
const JobsPage = lazy(() => import('@features/recruitment/pages/Jobs'));
const CandidatesPage = lazy(() => import('@features/recruitment/pages/Candidates'));
const PipelinePage = lazy(() => import('@features/recruitment/pages/Pipeline'));
const InterviewsPage = lazy(() => import('@features/recruitment/pages/Interviews'));

// HRIS module
const HRISDashboard = lazy(() => import('@features/hris/pages/Dashboard'));
const EmployeesPage = lazy(() => import('@features/hris/pages/Employees'));
const DepartmentsPage = lazy(() => import('@features/hris/pages/Departments'));
const LocationsPage = lazy(() => import('@features/hris/pages/Locations'));
const TimeOffPage = lazy(() => import('@features/hris/pages/TimeOff'));
const AttendancePage = lazy(() => import('@features/hris/pages/Attendance'));
const BenefitsPage = lazy(() => import('@features/hris/pages/Benefits'));
const PerformancePage = lazy(() => import('@features/hris/pages/Performance'));
const ContractsPage = lazy(() => import('@features/hris/pages/Contracts'));
const DocumentsPage = lazy(() => import('@features/hris/pages/Documents'));

// Payroll module
const PayrollDashboard = lazy(() => import('@features/payroll/pages/Dashboard'));
const PayrollRunsPage = lazy(() => import('@features/payroll/pages/PayrollRuns'));
const CompensationPage = lazy(() => import('@features/payroll/pages/Compensation'));
const TaxPage = lazy(() => import('@features/payroll/pages/Tax'));
const DeductionsPage = lazy(() => import('@features/payroll/pages/Deductions'));
const ReportsPage = lazy(() => import('@features/payroll/pages/Reports'));

// ScheduleHub module
const ScheduleHubPage = lazy(() => import('@features/scheduling/pages/ScheduleHubPage'));
const ScheduleAnalyticsPage = lazy(() => import('@features/scheduling/pages/ScheduleAnalyticsPage'));
const SchedulesPage = lazy(() => import('@features/scheduling/pages/SchedulesPage'));
const StationsPage = lazy(() => import('@features/scheduling/pages/StationsPage'));
const ScheduleTimeOffPage = lazy(() => import('@features/scheduling/pages/TimeOffPage'));
const TemplatesPage = lazy(() => import('@features/scheduling/pages/TemplatesPage'));
const ScheduleReportsPage = lazy(() => import('@features/scheduling/pages/ReportsPage'));
const RolesPage = lazy(() => import('@features/scheduling/pages/RolesPage'));
const ScheduleSettingsPage = lazy(() => import('@features/scheduling/pages/SettingsPage'));

// User Settings
const UserSettingsPage = lazy(() => import('@features/settings/pages/UserSettingsPage'));

// Product Settings Hubs
const PayrollSettingsHub = lazy(() => import('@features/payroll/pages/settings/PayrollSettingsHub'));
const HRISSettingsHub = lazy(() => import('@features/hris/pages/settings/HRISSettingsHub'));
const RecruitmentSettingsHub = lazy(() => import('@features/recruitment/pages/settings/RecruitmentSettingsHub'));

// PayLinQ Settings Pages
const GeneralSettings = lazy(() => import('@features/payroll/pages/settings/GeneralSettings'));
const EmailSettings = lazy(() => import('@features/payroll/pages/settings/EmailSettings'));
const NotificationSettings = lazy(() => import('@features/payroll/pages/settings/NotificationSettings'));
const PayrollDefaultsSettings = lazy(() => import('@features/payroll/pages/settings/PayrollDefaultsSettings'));
const LoontijdvakSettings = lazy(() => import('@features/payroll/pages/settings/LoontijdvakSettings'));
const PayrollRolesPermissions = lazy(() => import('@features/payroll/pages/settings/RolesPermissions'));

// HRIS Settings Pages  
const HRISRolesPermissions = lazy(() => import('@features/hris/pages/settings/RolesPermissions'));
const BulkUserAccessManagement = lazy(() => import('@features/hris/pages/settings/BulkUserAccessManagement'));

// Employee Portal (Mobile-first PWA features - Phase 2)
const EmployeeHome = lazy(() => import('@features/employee/pages/EmployeeHome'));
const EmployeeSchedule = lazy(() => import('@features/employee/pages/EmployeeSchedule'));
const EmployeePayslips = lazy(() => import('@features/employee/pages/EmployeePayslips'));
const EmployeeProfile = lazy(() => import('@features/employee/pages/EmployeeProfile'));
const EmployeeTimeOff = lazy(() => import('@features/employee/pages/EmployeeTimeOff'));
const NotificationSettings = lazy(() => import('@features/employee/pages/NotificationSettings'));

/**
 * Application routes
 * Exported as JSX elements for use with <Routes> component
 * Following industry standard pattern with BrowserRouter
 */
export const routes = (
  <>
    {/* Auth routes */}
    <Route path="/auth" element={<AuthLayout />}>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route index element={<Navigate to="/auth/login" replace />} />
    </Route>

    {/* Main app routes - Protected */}
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdaptiveLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/recruitment" replace />} />
      
      {/* Recruitment module */}
      <Route path="recruitment">
        <Route index element={<RecruitmentDashboard />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="interviews" element={<InterviewsPage />} />
        {/* Recruitment Settings */}
        <Route path="settings" element={<RecruitmentSettingsHub />} />
      </Route>

      {/* HRIS module */}
      <Route path="hris">
        <Route index element={<HRISDashboard />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="time-off" element={<TimeOffPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="benefits" element={<BenefitsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        {/* HRIS Settings */}
        <Route path="settings" element={<HRISSettingsHub />} />
        <Route path="settings/roles" element={<HRISRolesPermissions />} />
        <Route path="settings/bulk-users" element={<BulkUserAccessManagement />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
      </Route>

      {/* Payroll module */}
      <Route path="payroll">
        <Route index element={<PayrollDashboard />} />
        <Route path="runs" element={<PayrollRunsPage />} />
        {/* Payroll Settings */}
        <Route path="settings" element={<PayrollSettingsHub />} />
        <Route path="settings/general" element={<GeneralSettings />} />
        <Route path="settings/email" element={<EmailSettings />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
        <Route path="settings/payroll-defaults" element={<PayrollDefaultsSettings />} />
        <Route path="settings/loontijdvak" element={<LoontijdvakSettings />} />
        <Route path="settings/roles" element={<PayrollRolesPermissions />} />
        <Route path="compensation" element={<CompensationPage />} />
        <Route path="tax" element={<TaxPage />} />
        <Route path="deductions" element={<DeductionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* ScheduleHub module */}
      <Route path="scheduling">
        <Route index element={<ScheduleHubPage />} />
        <Route path="hub" element={<ScheduleHubPage />} />
        <Route path="analytics" element={<ScheduleAnalyticsPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="schedules/:view" element={<SchedulesPage />} />
        <Route path="stations" element={<StationsPage />} />
        <Route path="time-off" element={<ScheduleTimeOffPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="reports" element={<ScheduleReportsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="settings" element={<ScheduleSettingsPage />} />
      </Route>

      {/* User Settings (accessible from profile menu) */}
      <Route path="settings" element={<UserSettingsPage />} />

      {/* Employee Portal - Mobile-first self-service (Phase 2) */}
      <Route path="employee">
        <Route index element={<EmployeeHome />} />
        <Route path="schedule" element={<EmployeeSchedule />} />
        <Route path="pay" element={<EmployeePayslips />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="time-off" element={<EmployeeTimeOff />} />
        <Route path="settings/notifications" element={<NotificationSettings />} />
      </Route>
    </Route>
  </>
);
