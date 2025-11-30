import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute, AuthProvider } from '@recruitiq/auth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load pages for code splitting
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Employees
const EmployeesList = lazy(() => import('@/pages/employees/EmployeesList'));
const EmployeeDetails = lazy(() => import('@/pages/employees/EmployeeDetails'));
const EmployeeCreate = lazy(() => import('@/pages/employees/EmployeeCreate'));
const EmployeeEdit = lazy(() => import('@/pages/employees/EmployeeEdit'));
const OrgChart = lazy(() => import('@/pages/employees/OrgChart'));

// Contracts
const ContractsList = lazy(() => import('@/pages/contracts/ContractsList'));
const ContractDetails = lazy(() => import('@/pages/contracts/ContractDetails'));
const ContractCreate = lazy(() => import('@/pages/contracts/ContractCreate'));
const ContractEdit = lazy(() => import('@/pages/contracts/ContractEdit'));
const ContractsExpiringList = lazy(() => import('@/pages/contracts/ContractsExpiringList'));

// Performance
const ReviewsList = lazy(() => import('@/pages/performance/ReviewsList'));
const ReviewDetails = lazy(() => import('@/pages/performance/ReviewDetails'));
const ReviewCreate = lazy(() => import('@/pages/performance/ReviewCreate'));
const ReviewEdit = lazy(() => import('@/pages/performance/ReviewEdit'));
const GoalsList = lazy(() => import('@/pages/performance/GoalsList'));
const GoalDetails = lazy(() => import('@/pages/performance/GoalDetails'));
const GoalCreate = lazy(() => import('@/pages/performance/GoalCreate'));
const GoalEdit = lazy(() => import('@/pages/performance/GoalEdit'));

// Time Off
const TimeOffRequests = lazy(() => import('@/pages/time-off/TimeOffRequests'));
const TimeOffRequestDetails = lazy(() => import('@/pages/time-off/TimeOffRequestDetails'));
const TimeOffRequestCreate = lazy(() => import('@/pages/time-off/TimeOffRequestCreate'));
const TimeOffRequestEdit = lazy(() => import('@/pages/time-off/TimeOffRequestEdit'));
const TimeOffBalance = lazy(() => import('@/pages/time-off/TimeOffBalance'));
const TimeOffCalendar = lazy(() => import('@/pages/time-off/TimeOffCalendar'));
const TimeOffTypesManagement = lazy(() => import('@/pages/time-off/TimeOffTypesManagement'));

// Attendance
const AttendanceDashboard = lazy(() => import('@/pages/attendance/AttendanceDashboard'));
const AttendanceRecords = lazy(() => import('@/pages/attendance/AttendanceRecords'));
const ManualAttendanceEntry = lazy(() => import('@/pages/attendance/ManualAttendanceEntry'));

// Benefits
const BenefitPlansList = lazy(() => import('@/pages/benefits/BenefitPlansList'));
const BenefitPlanDetails = lazy(() => import('@/pages/benefits/BenefitPlanDetails'));
const BenefitPlanForm = lazy(() => import('@/pages/benefits/BenefitPlanForm'));
const EnrollmentsList = lazy(() => import('@/pages/benefits/EnrollmentsList'));
const EnrollmentDetails = lazy(() => import('@/pages/benefits/EnrollmentDetails'));
const EnrollmentForm = lazy(() => import('@/pages/benefits/EnrollmentForm'));

// Documents
const DocumentsDashboard = lazy(() => import('@/pages/documents/DocumentsDashboard'));
const DocumentsList = lazy(() => import('@/pages/documents/DocumentsList'));
const DocumentUpload = lazy(() => import('@/pages/documents/DocumentUpload'));
const DocumentDetails = lazy(() => import('@/pages/documents/DocumentDetails'));

// Departments & Locations
const DepartmentsList = lazy(() => import('@/pages/departments/DepartmentsList'));
const DepartmentHierarchy = lazy(() => import('@/pages/departments/DepartmentHierarchy'));
const DepartmentDetails = lazy(() => import('@/pages/departments/DepartmentDetails'));
const DepartmentNew = lazy(() => import('@/pages/departments/DepartmentNew'));
const DepartmentEdit = lazy(() => import('@/pages/departments/DepartmentEdit'));
const LocationsList = lazy(() => import('@/pages/locations/LocationsList'));
const LocationNew = lazy(() => import('@/pages/locations/LocationNew'));
const LocationDetails = lazy(() => import('@/pages/locations/LocationDetails'));
const LocationEdit = lazy(() => import('@/pages/locations/LocationEdit'));

// Reports & Settings
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'));
const HeadcountReport = lazy(() => import('@/pages/reports/HeadcountReport'));
const TurnoverReport = lazy(() => import('@/pages/reports/TurnoverReport'));
const AttendanceReport = lazy(() => import('@/pages/reports/AttendanceReport'));
const TimeOffReport = lazy(() => import('@/pages/reports/TimeOffReport'));
const BenefitsReport = lazy(() => import('@/pages/reports/BenefitsReport'));
const PerformanceReport = lazy(() => import('@/pages/reports/PerformanceReport'));
const Settings = lazy(() => import('@/pages/settings/Settings'));
const RolesPermissions = lazy(() => import('@/pages/settings/RolesPermissions'));
const BulkUserAccessManagement = lazy(() => import('@/pages/settings/BulkUserAccessManagement'));

// ScheduleHub
const ScheduleHubDashboard = lazy(() => import('@/pages/schedulehub/ScheduleHubDashboard'));
const WorkersList = lazy(() => import('@/pages/schedulehub/WorkersList'));
const SchedulesList = lazy(() => import('@/pages/schedulehub/SchedulesList'));
const ScheduleBuilder = lazy(() => import('@/pages/schedulehub/ScheduleBuilder'));
const ScheduleHubTimeOff = lazy(() => import('@/pages/schedulehub/TimeOffRequests'));
const ShiftSwapMarketplace = lazy(() => import('@/pages/schedulehub/ShiftSwapMarketplace'));
const StationManagement = lazy(() => import('@/pages/schedulehub/stations/StationManagement'));
const StationDetails = lazy(() => import('@/pages/schedulehub/stations/StationDetails'));
const RolesList = lazy(() => import('@/pages/schedulehub/RolesList'));
const ShiftSwapApprovalQueue = lazy(() => import('@/pages/schedulehub/shift-swaps/ShiftSwapApprovalQueue'));
const SwapRequestInbox = lazy(() => import('@/pages/schedulehub/shift-swaps/SwapRequestInbox'));
const AvailabilityManagement = lazy(() => import('@/pages/schedulehub/AvailabilityManagement'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute redirectTo="/login" requireProduct="nexus">
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Employees */}
                  <Route path="employees">
                    <Route index element={<EmployeesList />} />
                    <Route path="new" element={<EmployeeCreate />} />
                    <Route path="org-chart" element={<OrgChart />} />
                    <Route path=":id" element={<EmployeeDetails />} />
                    <Route path=":id/edit" element={<EmployeeEdit />} />
                  </Route>

                  {/* Contracts */}
                  <Route path="contracts">
                    <Route index element={<ContractsList />} />
                    <Route path="new" element={<ContractCreate />} />
                    <Route path="expiring" element={<ContractsExpiringList />} />
                    <Route path=":id" element={<ContractDetails />} />
                    <Route path=":id/edit" element={<ContractEdit />} />
                  </Route>

                  {/* Performance */}
                  <Route path="performance">
                    <Route path="reviews">
                      <Route index element={<ReviewsList />} />
                      <Route path="new" element={<ReviewCreate />} />
                      <Route path=":id" element={<ReviewDetails />} />
                      <Route path=":id/edit" element={<ReviewEdit />} />
                    </Route>
                    <Route path="goals">
                      <Route index element={<GoalsList />} />
                      <Route path="new" element={<GoalCreate />} />
                      <Route path=":id" element={<GoalDetails />} />
                      <Route path=":id/edit" element={<GoalEdit />} />
                    </Route>
                  </Route>

                  {/* Time Off */}
                  <Route path="time-off">
                    <Route path="requests">
                      <Route index element={<TimeOffRequests />} />
                      <Route path="new" element={<TimeOffRequestCreate />} />
                      <Route path=":id" element={<TimeOffRequestDetails />} />
                      <Route path=":id/edit" element={<TimeOffRequestEdit />} />
                    </Route>
                    <Route path="balance" element={<TimeOffBalance />} />
                    <Route path="calendar" element={<TimeOffCalendar />} />
                    <Route path="types" element={<TimeOffTypesManagement />} />
                  </Route>

                  {/* Attendance */}
                  <Route path="attendance">
                    <Route index element={<AttendanceDashboard />} />
                    <Route path="records" element={<AttendanceRecords />} />
                    <Route path="manual-entry" element={<ManualAttendanceEntry />} />
                  </Route>

                  {/* Benefits */}
                  <Route path="benefits">
                    <Route path="plans">
                      <Route index element={<BenefitPlansList />} />
                      <Route path="new" element={<BenefitPlanForm />} />
                      <Route path=":id" element={<BenefitPlanDetails />} />
                      <Route path=":id/edit" element={<BenefitPlanForm />} />
                    </Route>
                    <Route path="enrollments">
                      <Route index element={<EnrollmentsList />} />
                      <Route path="new" element={<EnrollmentForm />} />
                      <Route path=":id" element={<EnrollmentDetails />} />
                    </Route>
                  </Route>

                  {/* Departments */}
                  <Route path="departments">
                    <Route index element={<DepartmentsList />} />
                    <Route path="hierarchy" element={<DepartmentHierarchy />} />
                    <Route path="create" element={<DepartmentNew />} />
                    <Route path=":id" element={<DepartmentDetails />} />
                    <Route path=":id/edit" element={<DepartmentEdit />} />
                  </Route>

                  {/* Locations */}
                  <Route path="locations">
                    <Route index element={<LocationsList />} />
                    <Route path="new" element={<LocationNew />} />
                    <Route path=":id" element={<LocationDetails />} />
                    <Route path=":id/edit" element={<LocationEdit />} />
                  </Route>

                  {/* Documents */}
                  <Route path="documents">
                    <Route index element={<DocumentsList />} />
                    <Route path="dashboard" element={<DocumentsDashboard />} />
                    <Route path="upload" element={<DocumentUpload />} />
                    <Route path=":id" element={<DocumentDetails />} />
                  </Route>

                  {/* ScheduleHub */}
                  <Route path="schedulehub">
                    <Route index element={<ScheduleHubDashboard />} />
                    <Route path="workers" element={<WorkersList />} />
                    <Route path="schedules" element={<SchedulesList />} />
                    <Route path="schedules/builder" element={<ScheduleBuilder />} />
                    <Route path="schedules/create" element={<ScheduleBuilder />} />
                    <Route path="stations">
                      <Route index element={<StationManagement />} />
                      <Route path=":id" element={<StationDetails />} />
                    </Route>
                    <Route path="roles" element={<RolesList />} />
                    <Route path="time-off" element={<ScheduleHubTimeOff />} />
                    <Route path="shift-swaps">
                      <Route index element={<ShiftSwapMarketplace />} />
                      <Route path="approvals" element={<ShiftSwapApprovalQueue />} />
                      <Route path="inbox" element={<SwapRequestInbox />} />
                    </Route>
                    <Route path="availability" element={<AvailabilityManagement />} />
                  </Route>

                  {/* Reports & Settings */}
                  <Route path="reports">
                    <Route index element={<ReportsDashboard />} />
                    <Route path="headcount" element={<HeadcountReport />} />
                    <Route path="turnover" element={<TurnoverReport />} />
                    <Route path="attendance" element={<AttendanceReport />} />
                    <Route path="time-off" element={<TimeOffReport />} />
                    <Route path="benefits" element={<BenefitsReport />} />
                    <Route path="performance" element={<PerformanceReport />} />
                  </Route>
                  <Route path="settings">
                    <Route index element={<Settings />} />
                    <Route path="roles-permissions" element={<RolesPermissions />} />
                    <Route path="bulk-user-access" element={<BulkUserAccessManagement />} />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
