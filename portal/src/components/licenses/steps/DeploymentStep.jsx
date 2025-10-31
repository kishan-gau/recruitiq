/**
 * Deployment Type Step Component
 */
import { DEPLOYMENT_TYPES } from '../../../constants/licenseConstants';

export default function DeploymentStep({ formData, onChange, errors = {} }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment Type</h2>
      
      <div className="space-y-3">
        {DEPLOYMENT_TYPES.map((option) => (
          <div
            key={option.value}
            onClick={() => onChange({ ...formData, deploymentType: option.value })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              formData.deploymentType === option.value
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            role="radio"
            aria-checked={formData.deploymentType === option.value}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange({ ...formData, deploymentType: option.value });
              }
            }}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                formData.deploymentType === option.value
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-gray-300'
              }`}>
                {formData.deploymentType === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{option.title}</p>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="label">Instance URL (Optional)</label>
        <input
          type="url"
          className={`input ${errors.instanceUrl ? 'border-red-500' : ''}`}
          placeholder="https://customer.recruitiq.com"
          value={formData.instanceUrl}
          onChange={(e) => onChange({ ...formData, instanceUrl: e.target.value })}
          aria-invalid={!!errors.instanceUrl}
          aria-describedby={errors.instanceUrl ? 'instanceUrl-error' : undefined}
        />
        {errors.instanceUrl && (
          <p id="instanceUrl-error" className="text-sm text-red-600 mt-1">{errors.instanceUrl}</p>
        )}
      </div>
    </div>
  );
}
