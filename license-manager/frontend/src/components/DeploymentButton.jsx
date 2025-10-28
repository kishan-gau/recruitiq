import { useState } from 'react';
import { Rocket, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';

export default function DeploymentButton({ instance, customer, onDeploymentStart }) {
  const [showModal, setShowModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [formData, setFormData] = useState({
    hostname: `recruitiq-${customer?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'instance'}`,
    domain: '',
    email: customer?.email || '',
    region: 'ams0',
  });

  const handleDeploy = async () => {
    if (!formData.email) {
      alert('Email is required for SSL certificate');
      return;
    }

    setIsDeploying(true);

    try {
      const deploymentData = {
        instanceId: instance.id,
        customerId: customer.id,
        customerName: customer.name,
        licenseKey: instance.license_key,
        tier: customer.tier || 'professional',
        hostname: formData.hostname,
        domain: formData.domain || undefined,
        email: formData.email,
        region: formData.region,
      };

      const response = await api.deployInstance(deploymentData);

      if (response.success) {
        alert('Deployment started! Track progress below.');
        setShowModal(false);
        
        // Notify parent component
        if (onDeploymentStart) {
          onDeploymentStart(response.job);
        }
      } else {
        alert(response.error || 'Deployment failed to start');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert(error.response?.data?.error || 'Failed to start deployment');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        disabled={!instance || !customer}
      >
        <Rocket className="w-4 h-4" />
        Deploy Instance
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => !isDeploying && setShowModal(false)}
        title="Deploy RecruitIQ Instance"
      >
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Deployment will create billable resources</p>
              <p>This action will create a new VPS instance on TransIP, which may incur charges according to your TransIP billing plan.</p>
            </div>
          </div>

          {/* Instance Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-900">Instance Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer:</span>
                <span className="ml-2 text-gray-900 font-medium">{customer?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Tier:</span>
                <span className="ml-2 text-gray-900 font-medium capitalize">{customer?.tier || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Instance ID:</span>
                <span className="ml-2 text-gray-900 font-mono text-xs">{instance?.id}</span>
              </div>
              <div>
                <span className="text-gray-500">License Key:</span>
                <span className="ml-2 text-gray-900 font-mono text-xs">{instance?.license_key?.substring(0, 16)}...</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="hostname" className="block text-sm font-medium text-gray-700 mb-1">
                Hostname *
              </label>
              <input
                type="text"
                id="hostname"
                name="hostname"
                value={formData.hostname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="recruitiq-acme"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Hostname for the VPS instance (lowercase, alphanumeric and hyphens only)
              </p>
            </div>

            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                Domain (Optional)
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                If provided, SSL certificate will be obtained for {formData.hostname}.{formData.domain || 'yourdomain.com'}
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin@example.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for Let's Encrypt SSL certificate notifications
              </p>
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                Region
              </label>
              <select
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="ams0">Amsterdam (ams0)</option>
                <option value="rtm0">Rotterdam (rtm0)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              disabled={isDeploying}
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || !formData.email}
              className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting Deployment...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Deploy Now
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
