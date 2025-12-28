import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth, AuthProvider } from '@recruitiq/auth'
import { OrganizationProvider } from './context/OrganizationContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { FlowProvider } from './context/FlowContext'
import { isAuthError, isPermissionError } from './utils/errorHandler'
import Sprite from './components/icons/Sprite'
import Login from './pages/Login'
import Layout from './components/Layout'
import DebugOverlay from './components/DebugOverlay'

// Lazy load page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const JobRequisition = lazy(() => import('./pages/JobRequisition'))
const Candidates = lazy(() => import('./pages/Candidates'))
const CandidateDetail = lazy(() => import('./pages/CandidateDetail'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const Interviews = lazy(() => import('./pages/Interviews'))
const MobileQuickResults = lazy(() => import('./pages/MobileQuickResults'))
const Profile = lazy(() => import('./pages/Profile'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Help'))

// Lazy load public pages
const ApplyJob = lazy(() => import('./pages/public/ApplyJob'))
const ApplicationSuccess = lazy(() => import('./pages/public/ApplicationSuccess'))
const TrackApplication = lazy(() => import('./pages/public/TrackApplication'))
const CareerPage = lazy(() => import('./pages/public/CareerPage'))

// Lazy load applicant pages
const ApplicantSignup = lazy(() => import('./pages/applicant/ApplicantSignup'))
const ApplicantLogin = lazy(() => import('./pages/applicant/ApplicantLogin'))
const ApplicantDashboard = lazy(() => import('./pages/applicant/ApplicantDashboard'))

// Create React Query client with smart retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: (failureCount, error) => {
        // Don't retry on auth errors - user needs to log in again
        if (isAuthError(error)) {
          return false;
        }
        // Don't retry on permission errors - user lacks access
        if (isPermissionError(error)) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on network reconnect
    },
    mutations: {
      retry: false, // Never retry mutations
    }
  }
})

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  )
}

// Protected Route wrapper for tenant users
// Checks authentication and product access
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has access to RecruitIQ product
  const hasProductAccess = user?.enabledProducts?.includes('recruitiq');
  if (!hasProductAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-4">
            You don't have access to RecruitIQ. Please contact your administrator to request access.
          </p>
        </div>
      </div>
    );
  }
  
  return children;
}

// Protected Route wrapper for applicants
function ApplicantProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isApplicant } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !isApplicant) {
    return <Navigate to="/applicant/login" replace />;
  }
  
  return children;
}

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <OrganizationProvider>
            <WorkspaceProvider>
              <DataProvider>
                <FlowProvider>
                  <ToastProvider>
                    <Sprite />
                    <AppContent />
                  </ToastProvider>
                </FlowProvider>
              </DataProvider>
            </WorkspaceProvider>
          </OrganizationProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent(){
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - No authentication required */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
      />
      <Route path="/apply/:jobId" element={
        <Suspense fallback={<PageLoader />}>
          <ApplyJob />
        </Suspense>
      } />
      <Route path="/apply/:jobId/success" element={
        <Suspense fallback={<PageLoader />}>
          <ApplicationSuccess />
        </Suspense>
      } />
      <Route path="/track/:trackingCode" element={
        <Suspense fallback={<PageLoader />}>
          <TrackApplication />
        </Suspense>
      } />
      <Route path="/careers/:organizationId" element={
        <Suspense fallback={<PageLoader />}>
          <CareerPage />
        </Suspense>
      } />
      
      {/* Applicant routes */}
      <Route path="/applicant/signup" element={
        <Suspense fallback={<PageLoader />}>
          <ApplicantSignup />
        </Suspense>
      } />
      <Route path="/applicant/login" element={
        <Suspense fallback={<PageLoader />}>
          <ApplicantLogin />
        </Suspense>
      } />
      <Route path="/applicant/dashboard" element={
        <ApplicantProtectedRoute>
          <Suspense fallback={<PageLoader />}>
            <ApplicantDashboard />
          </Suspense>
        </ApplicantProtectedRoute>
      } />
      
      {/* Protected routes - Recruiters only */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <DebugOverlay />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard/>} />
                <Route path="/jobs" element={<Jobs/>} />
                <Route path="/jobs/new" element={<JobRequisition/>} />
                <Route path="/jobs/:id/edit" element={<JobRequisition/>} />
                <Route path="/jobs/:id" element={<JobDetail/>} />
                <Route path="/candidates" element={<Candidates/>} />
                <Route path="/candidates/:id" element={<CandidateDetail/>} />
                <Route path="/interviews" element={<Interviews/>} />
                <Route path="/pipeline" element={<Pipeline/>} />
                <Route path="/reports" element={<Reports/>} />
                <Route path="/settings" element={<Settings/>} />
                <Route path="/help" element={<Help/>} />
                <Route path="/profile" element={<Profile/>} />
                <Route path="/mobile/quick-results" element={<MobileQuickResults/>} />
              </Routes>
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
