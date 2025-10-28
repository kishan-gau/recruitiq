import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
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

// Lazy load public pages
const ApplyJob = lazy(() => import('./pages/public/ApplyJob'))
const ApplicationSuccess = lazy(() => import('./pages/public/ApplicationSuccess'))
const TrackApplication = lazy(() => import('./pages/public/TrackApplication'))
const CareerPage = lazy(() => import('./pages/public/CareerPage'))

// Lazy load applicant pages
const ApplicantSignup = lazy(() => import('./pages/applicant/ApplicantSignup'))
const ApplicantLogin = lazy(() => import('./pages/applicant/ApplicantLogin'))
const ApplicantDashboard = lazy(() => import('./pages/applicant/ApplicantDashboard'))

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

// Protected Route wrapper for recruiters
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isRecruiter } = useAuth();
  
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
  
  if (!isAuthenticated || !isRecruiter) {
    return <Navigate to="/login" replace />;
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
  const { isAuthenticated, isLoading, isRecruiter } = useAuth();

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
        element={isAuthenticated && isRecruiter ? <Navigate to="/" replace /> : <Login />} 
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
                <Route path="/profile" element={<Profile/>} />
                <Route path="/mobile/quick-results" element={<MobileQuickResults/>} />
              </Routes>
            </Suspense>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
