import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SecurityDashboard = lazy(() => import('./pages/security/SecurityDashboard'));
const SecurityEvents = lazy(() => import('./pages/security/SecurityEvents'));
const SecurityAlerts = lazy(() => import('./pages/security/SecurityAlerts'));
const LogViewer = lazy(() => import('./pages/logs/LogViewer'));
const SystemLogs = lazy(() => import('./pages/logs/SystemLogs'));
const VPSManager = lazy(() => import('./pages/infrastructure/VPSManager'));
const ClientProvisioning = lazy(() => import('./pages/infrastructure/ClientProvisioning'));

// License Manager Pages
const LicenseDashboard = lazy(() => import('./pages/licenses/Dashboard'));
const CustomerList = lazy(() => import('./pages/licenses/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/licenses/CustomerDetail'));
const LicenseCreate = lazy(() => import('./pages/licenses/LicenseCreate'));
const Analytics = lazy(() => import('./pages/licenses/Analytics'));
const Tiers = lazy(() => import('./pages/licenses/Tiers'));
const LicenseSettings = lazy(() => import('./pages/licenses/Settings'));
const Settings = lazy(() => import('./pages/Settings'));

// User Management Pages
const UserManagement = lazy(() => import('./pages/users/UserManagement'));
const UserCreate = lazy(() => import('./pages/users/UserCreate'));
const UserDetail = lazy(() => import('./pages/users/UserDetail'));
const RoleManagement = lazy(() => import('./pages/roles/RoleManagement'));
const PermissionManagement = lazy(() => import('./pages/permissions/PermissionManagement'));

// Product & Feature Management Pages
const ProductManagement = lazy(() => import('./pages/products/ProductManagement'));
const ProductDetail = lazy(() => import('./pages/products/ProductDetail'));
const FeatureCatalog = lazy(() => import('./pages/features/FeatureCatalog'));
const FeatureDetail = lazy(() => import('./pages/features/FeatureDetail'));
const FeatureForm = lazy(() => import('./pages/features/FeatureForm'));
const FeatureGrants = lazy(() => import('./pages/features/FeatureGrants'));

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
        <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Security Section */}
        <Route path="security">
          <Route index element={<SecurityDashboard />} />
          <Route path="events" element={<SecurityEvents />} />
          <Route path="alerts" element={<SecurityAlerts />} />
        </Route>
        
        {/* Logs Section */}
        <Route path="logs">
          <Route index element={<LogViewer />} />
          <Route path="system" element={<SystemLogs />} />
        </Route>
        
        {/* Infrastructure Section */}
        <Route path="infrastructure">
          <Route index element={<VPSManager />} />
          <Route path="provision" element={<ClientProvisioning />} />
        </Route>
        
        {/* License Manager Section */}
        <Route path="licenses">
          <Route index element={<LicenseDashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="create" element={<LicenseCreate />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="tiers" element={<Tiers />} />
          <Route path="settings" element={<LicenseSettings />} />
        </Route>
        
        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        
        {/* User Management Section */}
        <Route path="users">
          <Route index element={<UserManagement />} />
          <Route path="create" element={<UserCreate />} />
          <Route path=":id" element={<UserDetail />} />
        </Route>
        
        {/* Roles & Permissions Section */}
        <Route path="roles">
          <Route index element={<RoleManagement />} />
        </Route>
        <Route path="permissions">
          <Route index element={<PermissionManagement />} />
        </Route>
        
        {/* Product & Feature Management Section */}
        <Route path="products">
          <Route index element={<ProductManagement />} />
          <Route path=":id" element={<ProductDetail />} />
          <Route path=":id/features" element={<ProductDetail />} />
        </Route>
        <Route path="features">
          <Route index element={<FeatureCatalog />} />
          <Route path="create" element={<FeatureForm />} />
          <Route path=":id" element={<FeatureDetail />} />
          <Route path=":id/edit" element={<FeatureForm />} />
          <Route path=":id/grants" element={<FeatureGrants />} />
        </Route>
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}export default App;
