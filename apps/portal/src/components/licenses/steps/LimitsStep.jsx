/**
 * Limits and Duration Step Component
 */
import { DURATION_OPTIONS } from '../../../constants/licenseConstants';

export default function LimitsStep({ formData, onChange, errors = {} }) {
  const handleNumberChange = (field, value) => {
    const numValue = value === '' ? null : parseInt(value);
    onChange({ ...formData, [field]: numValue });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Limits & Duration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Max Users</label>
          <input
            type="number"
            className={`input ${errors.maxUsers ? 'border-red-500' : ''}`}
            value={formData.maxUsers || ''}
            onChange={(e) => handleNumberChange('maxUsers', e.target.value)}
            placeholder="Unlimited"
            min="0"
            aria-invalid={!!errors.maxUsers}
            aria-describedby={errors.maxUsers ? 'maxUsers-error' : 'maxUsers-help'}
          />
          {errors.maxUsers ? (
            <p id="maxUsers-error" className="text-sm text-red-600 mt-1">{errors.maxUsers}</p>
          ) : (
            <p id="maxUsers-help" className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          )}
        </div>

        <div>
          <label className="label">Max Workspaces</label>
          <input
            type="number"
            className={`input ${errors.maxWorkspaces ? 'border-red-500' : ''}`}
            value={formData.maxWorkspaces || ''}
            onChange={(e) => handleNumberChange('maxWorkspaces', e.target.value)}
            placeholder="Unlimited"
            min="0"
            aria-invalid={!!errors.maxWorkspaces}
            aria-describedby={errors.maxWorkspaces ? 'maxWorkspaces-error' : 'maxWorkspaces-help'}
          />
          {errors.maxWorkspaces ? (
            <p id="maxWorkspaces-error" className="text-sm text-red-600 mt-1">{errors.maxWorkspaces}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          )}
        </div>

        <div>
          <label className="label">Max Jobs</label>
          <input
            type="number"
            className={`input ${errors.maxJobs ? 'border-red-500' : ''}`}
            value={formData.maxJobs || ''}
            onChange={(e) => handleNumberChange('maxJobs', e.target.value)}
            placeholder="Unlimited"
            min="0"
            aria-invalid={!!errors.maxJobs}
            aria-describedby={errors.maxJobs ? 'maxJobs-error' : 'maxJobs-help'}
          />
          {errors.maxJobs ? (
            <p id="maxJobs-error" className="text-sm text-red-600 mt-1">{errors.maxJobs}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          )}
        </div>

        <div>
          <label className="label">Max Candidates</label>
          <input
            type="number"
            className={`input ${errors.maxCandidates ? 'border-red-500' : ''}`}
            value={formData.maxCandidates || ''}
            onChange={(e) => handleNumberChange('maxCandidates', e.target.value)}
            placeholder="Unlimited"
            min="0"
            aria-invalid={!!errors.maxCandidates}
            aria-describedby={errors.maxCandidates ? 'maxCandidates-error' : 'maxCandidates-help'}
          />
          {errors.maxCandidates ? (
            <p id="maxCandidates-error" className="text-sm text-red-600 mt-1">{errors.maxCandidates}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
          )}
        </div>
      </div>

      <div>
        <label className="label">
          License Duration <span className="text-red-500">*</span>
        </label>
        <select
          className={`input ${errors.durationMonths ? 'border-red-500' : ''}`}
          value={formData.durationMonths}
          onChange={(e) => onChange({ ...formData, durationMonths: parseInt(e.target.value) })}
          aria-invalid={!!errors.durationMonths}
          aria-describedby={errors.durationMonths ? 'durationMonths-error' : undefined}
        >
          {DURATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.durationMonths && (
          <p id="durationMonths-error" className="text-sm text-red-600 mt-1">{errors.durationMonths}</p>
        )}
      </div>
    </div>
  );
}
