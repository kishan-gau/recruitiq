/**
 * Add/Edit Template Inclusion Modal
 * 
 * Form for configuring template inclusions with:
 * - Template selection
 * - Version constraints
 * - Inclusion mode
 * - Priority ordering
 * - Component filters
 */

import { X, Info, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import {
  usePayStructureTemplates,
  useAddTemplateInclusion,
  useUpdateTemplateInclusion,
  type TemplateInclusion,
  type CreateTemplateInclusionInput,
} from '@/hooks/usePayStructures';

interface AddInclusionModalProps {
  parentTemplateId: string;
  inclusion?: TemplateInclusion | null;
  onClose: () => void;
}

type InclusionMode = 'merge' | 'override' | 'append';

export default function AddInclusionModal({ 
  parentTemplateId, 
  inclusion, 
  onClose 
}: AddInclusionModalProps) {
  const { success, error: showError } = useToast();

  // Fetch available templates (only active/published ones can be included)
  const { data: templates = [], isLoading: loadingTemplates } = usePayStructureTemplates({
    params: { status: 'active' },
  });

  // Mutations
  const addInclusion = useAddTemplateInclusion();
  const updateInclusion = useUpdateTemplateInclusion();

  // Form state
  const [formData, setFormData] = useState<CreateTemplateInclusionInput>({
    includedTemplateCode: inclusion?.includedTemplateCode || '',
    versionConstraint: inclusion?.versionConstraint || 'latest',
    inclusionPriority: inclusion?.inclusionPriority || 1,
    inclusionMode: (inclusion?.inclusionMode as InclusionMode) || 'merge',
    isActive: inclusion?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current template (API already filters by status=active)
  const availableTemplates = templates.filter((t: any) => t.id !== parentTemplateId);

  // Debug: Log templates (can be removed after testing)
  console.log('AddInclusionModal - Available templates:', {
    total: templates.length,
    afterFilter: availableTemplates.length,
    templates: availableTemplates.map(t => ({ 
      id: t.id, 
      name: t.templateName, 
      code: t.templateCode,
      status: t.status 
    }))
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.includedTemplateCode) {
      newErrors.includedTemplateCode = 'Please select a template';
    }

    if (formData.inclusionPriority < 1) {
      newErrors.inclusionPriority = 'Priority must be at least 1';
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
      if (inclusion) {
        // Update existing inclusion
        await updateInclusion.mutateAsync({
          parentTemplateId,
          inclusionId: inclusion.id,
          data: formData,
        });
        success('Inclusion updated successfully');
      } else {
        // Add new inclusion
        await addInclusion.mutateAsync({
          parentTemplateId,
          data: formData,
        });
        success('Inclusion added successfully');
      }
      onClose();
    } catch (error: any) {
      showError(error.message || 'Failed to save inclusion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateTemplateInclusionInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {inclusion ? 'Edit' : 'Add'} Template Inclusion
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Include Template <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.includedTemplateCode}
              onChange={(e) => handleChange('includedTemplateCode', e.target.value)}
              disabled={!!inclusion || loadingTemplates}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            >
              <option value="">Select a template...</option>
              {availableTemplates.map((template: any) => (
                <option key={template.id} value={template.templateCode}>
                  {template.templateName} ({template.templateCode}) v{template.version}
                </option>
              ))}
            </select>
            {errors.includedTemplateCode && (
              <p className="mt-1 text-sm text-red-600">{errors.includedTemplateCode}</p>
            )}
            {inclusion && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Template cannot be changed after creation
              </p>
            )}
          </div>

          {/* Version Constraint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Version Constraint
            </label>
            <select
              value={formData.versionConstraint}
              onChange={(e) => handleChange('versionConstraint', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="latest">Latest version</option>
              <option value="^1.0.0">^1.0.0 (Compatible with 1.x.x)</option>
              <option value="~1.0.0">~1.0.0 (Patch updates only)</option>
              <option value="=1.0.0">=1.0.0 (Exact version)</option>
            </select>
            <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Version constraint types:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">latest</code> - Always use newest version</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">^1.0.0</code> - Allow minor and patch updates (1.x.x)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">~1.0.0</code> - Allow patch updates only (1.0.x)</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">=1.0.0</code> - Pin to exact version</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Inclusion Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Inclusion Mode
            </label>
            <div className="space-y-2">
              {(['merge', 'override', 'append'] as const).map((mode) => (
                <label key={mode} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="inclusionMode"
                    value={mode}
                    checked={formData.inclusionMode === mode}
                    onChange={(e) => handleChange('inclusionMode', e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {mode}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {getModeDescription(mode)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.inclusionPriority}
              onChange={(e) => handleChange('inclusionPriority', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.inclusionPriority && (
              <p className="mt-1 text-sm text-red-600">{errors.inclusionPriority}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Lower numbers are processed first. Templates with the same priority are processed in creation order.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Warning for circular dependencies */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Important:</strong> Circular dependencies will be detected and prevented. 
                Make sure the included template doesn't reference this template directly or indirectly.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loadingTemplates}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : inclusion ? 'Update' : 'Add'} Inclusion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function for mode descriptions
function getModeDescription(mode: InclusionMode): string {
  switch (mode) {
    case 'merge':
      return 'Components from included template are added. Existing components in parent are kept (no overrides).';
    case 'override':
      return 'Components from included template replace matching components in parent by component code.';
    case 'append':
      return 'All components from included template are added, even if codes match (creates duplicates with different IDs).';
    default:
      return '';
  }
}
