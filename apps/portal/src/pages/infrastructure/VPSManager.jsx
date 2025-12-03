import { useState, useEffect } from 'react';
import { Server, Plus, Activity, AlertCircle, CheckCircle, Cloud, CloudOff } from 'lucide-react';
import axios from 'axios';

export default function VPSManager() {
  const [vpsList, setVpsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deploymentServiceStatus, setDeploymentServiceStatus] = useState(null);

  useEffect(() => {
    fetchVPSList();
    fetchStats();
    fetchDeploymentServiceHealth();
  }, []);

  const fetchVPSList = async () => {
    try {
      const response = await axios.get('/api/portal/vps');
      setVpsList(response.data);
    } catch (error) {
      console.error('Failed to fetch VPS list:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/portal/vps/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch VPS stats:', error);
    }
  };

  const fetchDeploymentServiceHealth = async () => {
    try {
      const response = await axios.get('/api/portal/deployment-service/health');
      setDeploymentServiceStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch deployment service status:', error);
      setDeploymentServiceStatus({ status: 'error', enabled: false });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'provisioning':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading VPS infrastructure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPS Infrastructure</h1>
          <p className="text-gray-600 mt-1">Manage your VPS pool and capacity</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Add VPS
        </button>
      </div>

      {/* Deployment Service Status */}
      {deploymentServiceStatus && (
        <div className={`rounded-lg p-4 ${
          deploymentServiceStatus.status === 'healthy' 
            ? 'bg-green-50 border border-green-200' 
            : deploymentServiceStatus.status === 'error' 
              ? 'bg-red-50 border border-red-200'
              : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            {deploymentServiceStatus.status === 'healthy' ? (
              <Cloud className="w-5 h-5 text-green-600" />
            ) : (
              <CloudOff className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <h3 className={`font-medium ${
                deploymentServiceStatus.status === 'healthy' ? 'text-green-900' : 'text-red-900'
              }`}>
                Deployment Service: {deploymentServiceStatus.status === 'healthy' ? 'Connected' : 'Unavailable'}
              </h3>
              <p className={`text-sm ${
                deploymentServiceStatus.status === 'healthy' ? 'text-green-700' : 'text-red-700'
              }`}>
                {deploymentServiceStatus.enabled 
                  ? 'Container orchestration is enabled for new tenant deployments'
                  : 'Using legacy deployment (NGINX config only). Enable with USE_DEPLOYMENT_SERVICE=true'}
              </p>
            </div>
            {deploymentServiceStatus.status === 'healthy' && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                v{deploymentServiceStatus.version || '1.0.0'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total VPS</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_vps || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Shared VPS</p>
                <p className="text-2xl font-bold text-gray-900">{stats.shared_vps || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Server className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dedicated VPS</p>
                <p className="text-2xl font-bold text-gray-900">{stats.dedicated_vps || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Server className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_tenants || 0}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VPS List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">VPS Instances</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VPS Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resources
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vpsList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No VPS instances found</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first VPS
                    </button>
                  </td>
                </tr>
              ) : (
                vpsList.map((vps) => (
                  <tr key={vps.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vps.vps_name}</div>
                        <div className="text-sm text-gray-500">{vps.vps_ip}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vps.deployment_type === 'shared' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {vps.deployment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vps.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vps.status)}`}>
                        {getStatusIcon(vps.status)}
                        {vps.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {vps.deployment_type === 'shared' ? (
                        <div>
                          <div className="text-gray-900">{vps.current_tenants} / {vps.max_tenants} tenants</div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(vps.current_tenants / vps.max_tenants) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">
                          {vps.dedicated_org_name || 'Unassigned'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{vps.cpu_cores} CPU, {Math.round(vps.memory_mb / 1024)}GB RAM</div>
                      <div className="text-xs">
                        CPU: {vps.cpu_usage_percent?.toFixed(1) || '0'}% | 
                        RAM: {vps.memory_usage_percent?.toFixed(1) || '0'}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">VPS Pool Management</h3>
            <p className="text-sm text-blue-700 mt-1">
              This page shows your VPS infrastructure pool. Shared VPS instances host multiple clients, 
              while dedicated VPS instances are assigned to single clients for complete isolation.
            </p>
            <p className="text-sm text-blue-700 mt-2">
              <strong>Tip:</strong> Use the License Manager app (accessible via the app switcher) to provision 
              new clients and assign them to VPS instances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
