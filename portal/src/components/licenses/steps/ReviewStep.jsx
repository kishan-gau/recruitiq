/**
 * Review and Confirm Step Component
 */
import { DEPLOYMENT_TYPES } from '../../../constants/licenseConstants';

export default function ReviewStep({ formData }) {
  const getDeploymentTypeLabel = (type) => {
    const deployment = DEPLOYMENT_TYPES.find(d => d.value === type);
    return deployment ? deployment.title : type;
  };

  const formatDate = (months) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h2>
      
      <div className="space-y-4">
        {/* Customer Information */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Organization</p>
            <p className="font-medium text-gray-900">{formData.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contact</p>
            <p className="font-medium text-gray-900">{formData.contactName}</p>
            <p className="text-sm text-gray-600">{formData.contactEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Deployment</p>
            <p className="font-medium text-gray-900">
              {getDeploymentTypeLabel(formData.deploymentType)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tier</p>
            <p className="font-medium text-gray-900 capitalize">{formData.tier}</p>
          </div>
        </div>

        {/* Instance URL */}
        {formData.instanceUrl && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Instance URL</p>
            <p className="font-medium text-gray-900">{formData.instanceUrl}</p>
          </div>
        )}

        {/* Limits */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Resource Limits</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-gray-600">
              Users: <span className="font-medium text-gray-900">{formData.maxUsers || 'Unlimited'}</span>
            </p>
            <p className="text-gray-600">
              Workspaces: <span className="font-medium text-gray-900">{formData.maxWorkspaces || 'Unlimited'}</span>
            </p>
            <p className="text-gray-600">
              Jobs: <span className="font-medium text-gray-900">{formData.maxJobs || 'Unlimited'}</span>
            </p>
            <p className="text-gray-600">
              Candidates: <span className="font-medium text-gray-900">{formData.maxCandidates || 'Unlimited'}</span>
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">License Duration</p>
              <p className="text-lg font-semibold text-gray-900">{formData.durationMonths} months</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Expires</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(formData.durationMonths)}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Session Policy */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Security Settings</p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              Session Policy: <span className="font-medium text-gray-900 capitalize">
                {formData.sessionPolicy === 'single' ? '🔐 Single Session (License Enforcement)' : '📱 Multiple Sessions'}
              </span>
            </p>
            {formData.sessionPolicy === 'multiple' && (
              <p className="text-gray-600">
                Max Sessions Per User: <span className="font-medium text-gray-900">{formData.maxSessionsPerUser}</span>
              </p>
            )}
            <p className="text-gray-600">
              Concurrent Login Detection: <span className="font-medium text-gray-900">
                {formData.concurrentLoginDetection ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </p>
            <p className="text-gray-600">
              MFA Requirement: <span className="font-medium text-gray-900">
                {formData.mfaRequired || formData.deploymentType === 'cloud-shared' ? '🔐 Mandatory' : '⚙️ Optional'}
              </span>
              {formData.deploymentType === 'cloud-shared' && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                  Required for Shared VPS
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Features */}
        {formData.features && formData.features.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Enabled Features</p>
            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
