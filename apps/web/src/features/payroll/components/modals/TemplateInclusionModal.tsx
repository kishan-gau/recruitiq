import { X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { usePayStructureTemplates } from '@/hooks/usePayStructures';
import type { TemplateInclusion } from '@/hooks/usePayStructures';

interface TemplateInclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  inclusion?: TemplateInclusion | null;
  excludeTemplateIds?: string[]; // Templates to exclude from selection (e.g., parent, already included)
}

export default function TemplateInclusionModal({
  isOpen,
  onClose,
  onSubmit,
  inclusion,
  excludeTemplateIds = [],
}: TemplateInclusionModalProps) {
  const { data: allTemplates } = usePayStructureTemplates();
  
  const [formData, setFormData] = useState({
    includedTemplateId: '',
    includedTemplateVersion: '',
    versionConstraint: 'latest' as 'exact' | 'minimum' | 'range' | 'latest',
    minVersion: '',
    maxVersion: '',
    inclusionMode: 'merge' as 'merge' | 'override' | 'append' | 'conditional',
    priority: 100,
    isActive: true,
    conditionExpression: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter available templates
  const availableTemplates = allTemplates?.filter(
    (t) => !excludeTemplateIds.includes(t.id) && t.status === 'published'
  ) || [];

  // Populate form when editing
  useEffect(() => {
    if (inclusion) {
      setFormData({
        includedTemplateId: inclusion.includedTemplateId || '',
        includedTemplateVersion: inclusion.includedTemplateVersion || '',
        versionConstraint: inclusion.versionConstraint || 'latest',
        minVersion: inclusion.minVersion || '',
        maxVersion: inclusion.maxVersion || '',
        inclusionMode: inclusion.inclusionMode || 'merge',
        priority: inclusion.priority || 100,
        isActive: inclusion.isActive ?? true,
        conditionExpression: inclusion.conditionExpression || '',
      });
    }
  }, [inclusion]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.includedTemplateId) {
      newErrors.includedTemplateId = 'Please select a template to include';
    }

    if (formData.versionConstraint === 'exact' && !formData.includedTemplateVersion) {
      newErrors.includedTemplateVersion = 'Version is required for exact constraint';
    }

    if (formData.versionConstraint === 'minimum' && !formData.minVersion) {
      newErrors.minVersion = 'Minimum version is required';
    }

    if (formData.versionConstraint === 'range') {
      if (!formData.minVersion) {
        newErrors.minVersion = 'Minimum version is required for range';
      }
      if (!formData.maxVersion) {
        newErrors.maxVersion = 'Maximum version is required for range';
      }
    }

    if (formData.priority < 1 || formData.priority > 1000) {
      newErrors.priority = 'Priority must be between 1 and 1000';
    }

    if (formData.inclusionMode === 'conditional' && !formData.conditionExpression) {
      newErrors.conditionExpression = 'Condition expression is required for conditional mode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: any = {
        includedTemplateId: formData.includedTemplateId,
        versionConstraint: formData.versionConstraint,
        inclusionMode: formData.inclusionMode,
        priority: formData.priority,
        isActive: formData.isActive,
      };

      if (formData.versionConstraint === 'exact') {
        submitData.includedTemplateVersion = formData.includedTemplateVersion;
      }

      if (formData.versionConstraint === 'minimum') {
        submitData.minVersion = formData.minVersion;
      }

      if (formData.versionConstraint === 'range') {
        submitData.minVersion = formData.minVersion;
        submitData.maxVersion = formData.maxVersion;
      }

      if (formData.conditionExpression) {
        submitData.conditionExpression = formData.conditionExpression;
      }

      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      console.error('Failed to submit template inclusion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        includedTemplateId: '',
        includedTemplateVersion: '',
        versionConstraint: 'latest',
        minVersion: '',
        maxVersion: '',
        inclusionMode: 'merge',
        priority: 100,
        isActive: true,
        conditionExpression: '',
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {inclusion ? 'Edit Template Inclusion' : 'Add Template Inclusion'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template to Include <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.includedTemplateId}
                  onChange={(e) => handleChange('includedTemplateId', e.target.value)}
                  disabled={!!inclusion || isSubmitting}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 ${
                    errors.includedTemplateId
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500'
                  }`}
                >
                  <option value="">Select a template...</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.templateName} (v{template.version}) - {template.templateCode}
                    </option>
                  ))}
                </select>
                {errors.includedTemplateId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.includedTemplateId}
                  </p>
                )}
              </div>

              {/* Version Constraint */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version Constraint <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.versionConstraint}
                    onChange={(e) => handleChange('versionConstraint', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="latest">Always use latest version</option>
                    <option value="exact">Exact version</option>
                    <option value="minimum">Minimum version</option>
                    <option value="range">Version range</option>
                  </select>
                </div>

                {formData.versionConstraint === 'exact' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Exact Version <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.includedTemplateVersion}
                      onChange={(e) => handleChange('includedTemplateVersion', e.target.value)}
                      placeholder="e.g., 1.2.0"
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.includedTemplateVersion
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.includedTemplateVersion && (
                      <p className="mt-1 text-sm text-red-600">{errors.includedTemplateVersion}</p>
                    )}
                  </div>
                )}

                {formData.versionConstraint === 'minimum' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Version <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.minVersion}
                      onChange={(e) => handleChange('minVersion', e.target.value)}
                      placeholder="e.g., 1.0.0"
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.minVersion ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.minVersion && (
                      <p className="mt-1 text-sm text-red-600">{errors.minVersion}</p>
                    )}
                  </div>
                )}

                {formData.versionConstraint === 'range' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Min Version <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.minVersion}
                        onChange={(e) => handleChange('minVersion', e.target.value)}
                        placeholder="e.g., 1.0.0"
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors.minVersion ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.minVersion && (
                        <p className="mt-1 text-sm text-red-600">{errors.minVersion}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Version <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.maxVersion}
                        onChange={(e) => handleChange('maxVersion', e.target.value)}
                        placeholder="e.g., 2.0.0"
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                          errors.maxVersion ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.maxVersion && (
                        <p className="mt-1 text-sm text-red-600">{errors.maxVersion}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Inclusion Mode & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Inclusion Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.inclusionMode}
                    onChange={(e) => handleChange('inclusionMode', e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="merge">Merge - Combine components</option>
                    <option value="override">Override - Replace parent components</option>
                    <option value="append">Append - Add after parent components</option>
                    <option value="conditional">Conditional - Apply with condition</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formData.inclusionMode === 'merge' && 'Combines components from both templates'}
                    {formData.inclusionMode === 'override' && 'Included template replaces parent components'}
                    {formData.inclusionMode === 'append' && 'Adds included components after parent'}
                    {formData.inclusionMode === 'conditional' && 'Only includes if condition is met'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      errors.priority ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lower numbers = higher priority (1-1000)
                  </p>
                </div>
              </div>

              {/* Conditional Expression */}
              {formData.inclusionMode === 'conditional' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Condition Expression <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.conditionExpression}
                    onChange={(e) => handleChange('conditionExpression', e.target.value)}
                    rows={3}
                    placeholder="e.g., worker.department === 'Engineering'"
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm ${
                      errors.conditionExpression
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.conditionExpression && (
                    <p className="mt-1 text-sm text-red-600">{errors.conditionExpression}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    JavaScript expression evaluated at runtime
                  </p>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-emerald-600 border-gray-300 dark:border-gray-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active (include in template resolution)
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {inclusion ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>{inclusion ? 'Update Inclusion' : 'Add Inclusion'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
