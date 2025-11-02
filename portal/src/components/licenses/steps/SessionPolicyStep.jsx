import { Shield, Info } from 'lucide-react';
import { SESSION_POLICY_OPTIONS, MAX_SESSIONS_OPTIONS } from '../../../constants/licenseConstants';

export default function SessionPolicyStep({ formData, onChange, errors }) {
  const handleChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Security & Session Policy</h2>
        <p className="text-gray-600">
          Configure how users can authenticate and manage their sessions
        </p>
      </div>

      {/* Session Policy Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Session Policy <span className="text-red-500">*</span>
        </label>
        
        <div className="grid grid-cols-1 gap-4">
          {SESSION_POLICY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange('sessionPolicy', option.value)}
              className={`relative flex items-start p-4 border-2 rounded-lg text-left transition-all ${
                formData.sessionPolicy === option.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex-shrink-0 text-3xl mr-4">{option.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{option.title}</h3>
                  {formData.sessionPolicy === option.value && (
                    <Shield className="w-5 h-5 text-teal-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {errors.sessionPolicy && (
          <p className="text-sm text-red-600">{errors.sessionPolicy}</p>
        )}
      </div>

      {/* Max Sessions Per User (only for multiple sessions mode) */}
      {formData.sessionPolicy === 'multiple' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Maximum Sessions Per User
          </label>
          <select
            value={formData.maxSessionsPerUser}
            onChange={(e) => handleChange('maxSessionsPerUser', parseInt(e.target.value))}
            className="input-field"
          >
            {MAX_SESSIONS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500">
            Oldest sessions will be automatically revoked when this limit is exceeded
          </p>
        </div>
      )}

      {/* Concurrent Login Detection */}
      <div className="space-y-3">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="concurrentLoginDetection"
            checked={formData.concurrentLoginDetection}
            onChange={(e) => handleChange('concurrentLoginDetection', e.target.checked)}
            className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
          />
          <label htmlFor="concurrentLoginDetection" className="ml-3">
            <span className="block text-sm font-medium text-gray-700">
              Enable Concurrent Login Detection
            </span>
            <span className="block text-sm text-gray-500 mt-1">
              Detect and alert when the same account logs in from different locations simultaneously
            </span>
          </label>
        </div>
      </div>

      {/* Mandatory MFA (for shared VPS deployments) */}
      {formData.deploymentType === 'cloud-shared' && (
        <div className="space-y-3">
          <div className="flex items-start p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="mfaRequired"
              checked={formData.mfaRequired || formData.deploymentType === 'cloud-shared'}
              onChange={(e) => handleChange('mfaRequired', e.target.checked)}
              disabled={formData.deploymentType === 'cloud-shared'}
              className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="mfaRequired" className="ml-3">
              <span className="block text-sm font-medium text-amber-900">
                🔐 Require Multi-Factor Authentication (MFA) for All Users
              </span>
              <span className="block text-sm text-amber-800 mt-1">
                <strong>Mandatory for shared deployments.</strong> Users will be required to enable MFA and cannot disable it.
                This is a security best practice for multi-tenant environments.
              </span>
            </label>
          </div>
        </div>
      )}

      {formData.deploymentType !== 'cloud-shared' && (
        <div className="space-y-3">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="mfaRequired"
              checked={formData.mfaRequired}
              onChange={(e) => handleChange('mfaRequired', e.target.checked)}
              className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="mfaRequired" className="ml-3">
              <span className="block text-sm font-medium text-gray-700">
                Require Multi-Factor Authentication (MFA)
              </span>
              <span className="block text-sm text-gray-500 mt-1">
                Make MFA mandatory for all users in this organization (recommended for enhanced security)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Session Policy Best Practices</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Single Session:</strong> Best for enforcing per-user licenses and preventing credential sharing
              </li>
              <li>
                <strong>Multiple Sessions:</strong> Better user experience for legitimate multi-device usage
              </li>
              <li>
                <strong>Concurrent Detection:</strong> Helps identify suspicious login patterns and account compromises
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
