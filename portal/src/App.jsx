import { Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
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
      </Route>
    </Routes>
  );
}

export default App;
