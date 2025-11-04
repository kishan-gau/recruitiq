import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SecurityDashboard from './pages/security/SecurityDashboard';
import SecurityEvents from './pages/security/SecurityEvents';
import SecurityAlerts from './pages/security/SecurityAlerts';
import LogViewer from './pages/logs/LogViewer';
import SystemLogs from './pages/logs/SystemLogs';
import VPSManager from './pages/infrastructure/VPSManager';
import ClientProvisioning from './pages/infrastructure/ClientProvisioning';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// License Manager Pages
import LicenseDashboard from './pages/licenses/Dashboard';
import CustomerList from './pages/licenses/CustomerList';
import CustomerDetail from './pages/licenses/CustomerDetail';
import LicenseCreate from './pages/licenses/LicenseCreate';
import Analytics from './pages/licenses/Analytics';
import Tiers from './pages/licenses/Tiers';
import LicenseSettings from './pages/licenses/Settings';
import Settings from './pages/Settings';

// User Management Pages
import UserManagement from './pages/users/UserManagement';
import UserCreate from './pages/users/UserCreate';
import UserDetail from './pages/users/UserDetail';
import RoleManagement from './pages/roles/RoleManagement';
import PermissionManagement from './pages/permissions/PermissionManagement';

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
      </Route>
    </Routes>
    </>
  );
}

export default App;
