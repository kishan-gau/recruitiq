import { useState, useEffect } from 'react';
import { Server, Users, Package, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from 'axios';

export default function ClientProvisioning() {
  const [formData, setFormData] = useState({
    organizationName: '',
    slug: '',
    tier: 'starter',
    deploymentModel: 'shared',
    vpsId: 'auto',
    adminEmail: '',
    adminName: '',
    adminPassword: ''
  });

  const [availableVPS, setAvailableVPS] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formData.deploymentModel === 'shared') {
      fetchAvailableVPS();
    }
  }, [formData.deploymentModel]);

  const fetchAvailableVPS = async () => {
    try {
      const response = await axios.get('/api/portal/vps/available');
      setAvailableVPS(response.data);
    } catch (error) {
      console.error('Failed to fetch available VPS:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generate slug from organization name
    if (name === 'organizationName' && !formData.slug) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDeploymentStatus(null);

    try {
      const payload = {
        organizationName: formData.organizationName,
        slug: formData.slug,
        tier: formData.tier,
        deploymentModel: formData.deploymentModel,
        adminUser: {
          email: formData.adminEmail,
          name: formData.adminName,
          password: formData.adminPassword
        }
      };

      // Only include vpsId for shared deployments (and not 'auto')
      if (formData.deploymentModel === 'shared' && formData.vpsId !== 'auto') {
        payload.vpsId = parseInt(formData.vpsId);
      }

      const response = await axios.post('/api/portal/instances', payload);
      
      setDeploymentStatus({
        type: 'success',
        message: 'Client provisioned successfully!',
        data: response.data
      });

      // Reset form
      setFormData({
        organizationName: '',
        slug: '',
        tier: 'starter',
        deploymentModel: 'shared',
        vpsId: 'auto',
        adminEmail: '',
        adminName: '',
        adminPassword: ''
      });

    } catch (error) {
      console.error('Provisioning failed:', error);
      setError(error.response?.data?.message || 'Failed to provision client');
      setDeploymentStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to provision client'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTierDescription = (tier) => {
    const descriptions = {
      starter: 'Up to 10 users, 1 workspace - Perfect for small teams',
      professional: 'Up to 50 users, 5 workspaces - Great for growing companies',
      enterprise: 'Unlimited users and workspaces - Full-scale solutions'
    };
    return descriptions[tier];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Provision New Client</h1>
        <p className="text-gray-600 mt-1">Create a new client instance with automated deployment</p>
      </div>

      {/* Deployment Status */}
      {deploymentStatus && (
        <div className={`rounded-lg p-4 ${
          deploymentStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {deploymentStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-medium ${
                deploymentStatus.type === 'success' ? 'text-green-900' : 'text-red-900'
              }`}>
                {deploymentStatus.type === 'success' ? 'Provisioning Complete' : 'Provisioning Failed'}
              </h3>
              <p className={`text-sm mt-1 ${
                deploymentStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {deploymentStatus.message}
              </p>
              {deploymentStatus.type === 'success' && deploymentStatus.data && (
                <div className="mt-3 space-y-1 text-sm text-green-700">
                  <p><strong>Organization:</strong> {deploymentStatus.data.organization.name}</p>
                  <p><strong>Subdomain:</strong> {deploymentStatus.data.deployment.subdomain}.recruitiq.sr</p>
                  <p><strong>Status:</strong> {deploymentStatus.data.deployment.status}</p>
                  {deploymentStatus.data.vps && (
                    <p><strong>VPS:</strong> {deploymentStatus.data.vps.vps_name} ({deploymentStatus.data.vps.vps_ip})</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Provisioning Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Client Details</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Users size={16} />
              Organization Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  pattern="[a-z0-9-]+"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="acme-corp"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will create: {formData.slug || 'your-slug'}.recruitiq.sr
                </p>
              </div>
            </div>
          </div>

          {/* License Tier */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Package size={16} />
              License Tier
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['starter', 'professional', 'enterprise'].map((tier) => (
                <label
                  key={tier}
                  className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.tier === tier
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={tier}
                    checked={formData.tier === tier}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="font-medium text-gray-900 capitalize">{tier}</span>
                  <span className="text-xs text-gray-600 mt-1">
                    {getTierDescription(tier)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Deployment Model */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Server size={16} />
              Deployment Model
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.deploymentModel === 'shared'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deploymentModel"
                  value="shared"
                  checked={formData.deploymentModel === 'shared'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">Shared Hosting</span>
                <span className="text-xs text-gray-600 mt-1">
                  Multi-tenant VPS - Cost-effective solution
                </span>
                <span className="text-xs text-green-600 font-medium mt-2">
                  Standard pricing
                </span>
              </label>

              <label
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.deploymentModel === 'dedicated'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deploymentModel"
                  value="dedicated"
                  checked={formData.deploymentModel === 'dedicated'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <span className="font-medium text-gray-900">Dedicated VPS</span>
                <span className="text-xs text-gray-600 mt-1">
                  Isolated environment - Maximum control
                </span>
                <span className="text-xs text-blue-600 font-medium mt-2">
                  +€100/month
                </span>
              </label>
            </div>

            {/* VPS Selection (for shared only) */}
            {formData.deploymentModel === 'shared' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VPS Selection
                </label>
                <select
                  name="vpsId"
                  value={formData.vpsId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">Auto-select (least loaded)</option>
                  {availableVPS.map((vps) => (
                    <option key={vps.id} value={vps.id}>
                      {vps.vps_name} - {vps.current_tenants}/{vps.max_tenants} tenants ({vps.location})
                    </option>
                  ))}
                </select>
                {availableVPS.length === 0 && formData.vpsId === 'auto' && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No VPS available. Please add a VPS first.
                  </p>
                )}
              </div>
            )}

            {formData.deploymentModel === 'dedicated' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  A new dedicated VPS will be provisioned automatically via TransIP API
                </p>
              </div>
            )}
          </div>

          {/* Admin User */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Admin User Account</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (formData.deploymentModel === 'shared' && availableVPS.length === 0 && formData.vpsId === 'auto')}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Provisioning...
              </>
            ) : (
              'Provision Client'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
