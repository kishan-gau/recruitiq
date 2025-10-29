import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SecurityDashboard from './pages/security/SecurityDashboard';
import SecurityEvents from './pages/security/SecurityEvents';
import SecurityAlerts from './pages/security/SecurityAlerts';
import LogViewer from './pages/logs/LogViewer';
import SystemLogs from './pages/logs/SystemLogs';
import LicenseManager from './pages/licenses/LicenseManager';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
        
        {/* License Management */}
        <Route path="licenses" element={<LicenseManager />} />
      </Route>
    </Routes>
  );
}

export default App;
