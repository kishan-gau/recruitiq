import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, ProtectedRoute } from '@recruitiq/auth';
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

// Attendance
const AttendanceDashboard = lazy(() => import('@/pages/attendance/AttendanceDashboard'));
const AttendanceRecords = lazy(() => import('@/pages/attendance/AttendanceRecords'));

// Benefits
const BenefitPlansList = lazy(() => import('@/pages/benefits/BenefitPlansList'));
const BenefitPlanDetails = lazy(() => import('@/pages/benefits/BenefitPlanDetails'));
const BenefitPlanForm = lazy(() => import('@/pages/benefits/BenefitPlanForm'));
const EnrollmentsList = lazy(() => import('@/pages/benefits/EnrollmentsList'));
const EnrollmentDetails = lazy(() => import('@/pages/benefits/EnrollmentDetails'));

// Documents
const DocumentsList = lazy(() => import('@/pages/documents/DocumentsList'));
const DocumentUpload = lazy(() => import('@/pages/documents/DocumentUpload'));
const DocumentDetails = lazy(() => import('@/pages/documents/DocumentDetails'));

// Departments & Locations
const DepartmentsList = lazy(() => import('@/pages/departments/DepartmentsList'));
const DepartmentDetails = lazy(() => import('@/pages/departments/DepartmentDetails'));
const DepartmentNew = lazy(() => import('@/pages/departments/DepartmentNew'));
const DepartmentEdit = lazy(() => import('@/pages/departments/DepartmentEdit'));
const LocationsList = lazy(() => import('@/pages/locations/LocationsList'));
const LocationNew = lazy(() => import('@/pages/locations/LocationNew'));
const LocationDetails = lazy(() => import('@/pages/locations/LocationDetails'));
const LocationEdit = lazy(() => import('@/pages/locations/LocationEdit'));

// Reports & Settings
const ReportsDashboard = lazy(() => import('@/pages/reports/ReportsDashboard'));
const Settings = lazy(() => import('@/pages/settings/Settings'));

// ScheduleHub
const ScheduleHubDashboard = lazy(() => import('@/pages/schedulehub/ScheduleHubDashboard'));
const WorkersList = lazy(() => import('@/pages/schedulehub/WorkersList'));
const SchedulesList = lazy(() => import('@/pages/schedulehub/SchedulesList'));
const ScheduleBuilder = lazy(() => import('@/pages/schedulehub/ScheduleBuilder'));
const ScheduleHubTimeOff = lazy(() => import('@/pages/schedulehub/TimeOffRequests'));
const ShiftSwapMarketplace = lazy(() => import('@/pages/schedulehub/ShiftSwapMarketplace'));

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
                  </Route>

                  {/* Attendance */}
                  <Route path="attendance">
                    <Route index element={<AttendanceDashboard />} />
                    <Route path="records" element={<AttendanceRecords />} />
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
                      <Route path=":id" element={<EnrollmentDetails />} />
                    </Route>
                  </Route>

                  {/* Departments */}
                  <Route path="departments">
                    <Route index element={<DepartmentsList />} />
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
                    <Route path="time-off" element={<ScheduleHubTimeOff />} />
                    <Route path="shift-swaps" element={<ShiftSwapMarketplace />} />
                  </Route>

                  {/* Reports & Settings */}
                  <Route path="reports" element={<ReportsDashboard />} />
                  <Route path="settings" element={<Settings />} />

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
