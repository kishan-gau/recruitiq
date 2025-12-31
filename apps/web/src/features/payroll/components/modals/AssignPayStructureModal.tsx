import { AlertCircle, Eye, Package } from 'lucide-react';
import { useState, useEffect } from 'react';

import Badge from '@recruitiq/ui';
import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea } from '@recruitiq/ui';
import { usePayStructureTemplates, useAssignPayStructureToWorker, usePayStructureComponents } from '@/hooks';

interface AssignPayStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
}

export default function AssignPayStructureModal({
  isOpen,
  onClose,
  workerId,
  workerName,
}: AssignPayStructureModalProps) {
  const [formData, setFormData] = useState({
    templateId: '',
    effectiveFrom: '',
    effectiveTo: '',
    assignmentReason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Fetch published templates
  const { data: templates, isLoading: isLoadingTemplates } = usePayStructureTemplates();
  const assignMutation = useAssignPayStructureToWorker();

  // Fetch components for preview when template is selected
  const { data: previewComponents, isLoading: isLoadingPreview } = usePayStructureComponents(
    formData.templateId || ''
  );

  // Get only published templates (status = 'active' means published) and sort by name then version
  const publishedTemplates = templates?.filter((t: any) => t.status === 'active' || t.status === 'published')
    .sort((a: any, b: any) => {
      // First sort by template name
      const nameCompare = a.templateName.localeCompare(b.templateName);
      if (nameCompare !== 0) return nameCompare;
      // Then by version (descending - newest first)
      return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' });
    }) || [];

  const selectedTemplate = templates?.find((t: any) => t.id === formData.templateId);

  // Helper function to display component calculation value
  const getComponentValue = (component: any) => {
    switch (component.calculationType) {
      case 'fixed':
        return component.defaultAmount ? `$${component.defaultAmount.toFixed(2)}` : 'No amount';
      case 'percentage':
        return component.percentageRate 
          ? `${(component.percentageRate * 100).toFixed(2)}% of ${component.percentageOf || 'base'}`
          : 'No rate';
      case 'formula':
        return component.formulaExpression || 'Formula';
      case 'hourly_rate':
        return component.rateMultiplier ? `$${component.rateMultiplier.toFixed(2)}/hr` : 'No rate';
      case 'tiered':
        return 'Tiered rates';
      default:
        return component.calculationType;
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        templateId: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        assignmentReason: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.templateId) {
      newErrors.templateId = 'Please select a pay structure template';
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective date is required';
    }

    if (formData.effectiveTo && formData.effectiveFrom) {
      const fromDate = new Date(formData.effectiveFrom);
      const toDate = new Date(formData.effectiveTo);
      if (toDate <= fromDate) {
        newErrors.effectiveTo = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await assignMutation.mutateAsync({
        employeeId: workerId,
        data: {
          templateId: formData.templateId,
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo || undefined,
          assignmentReason: formData.assignmentReason || undefined,
        },
      });
      onClose();
    } catch (error: any) {
      // Handle specific constraint errors
      const errorMessage = error?.response?.data?.message || error?.message || '';
      
      if (errorMessage.includes('unique_current_worker_structure')) {
        setErrors({
          effectiveFrom: 'This worker already has a pay structure assigned for this date range. Please end-date the existing assignment first or choose a different effective date.',
        });
      }
      
      console.error('Failed to assign pay structure:', error);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Pay Structure Template"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Assigning to: {workerName}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                This will replace the worker's current pay structure assignment (if any). Any existing component
                overrides will be preserved.
              </p>
            </div>
          </div>
        </div>

        <FormField label="Pay Structure Template" required error={errors.templateId}>
          <select
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            value={formData.templateId}
            onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
          >
            <option value="">Select a template...</option>
            {isLoadingTemplates ? (
              <option value="">Loading templates...</option>
            ) : publishedTemplates.length > 0 ? (
              publishedTemplates.map((template: any) => (
                <option key={template.id} value={template.id}>
                  {template.templateName} (v{template.version})
                  {template.effectiveFrom && ` - Effective: ${new Date(template.effectiveFrom).toLocaleDateString()}`}
                  {template.isOrganizationDefault && ' [Default]'}
                </option>
              ))
            ) : (
              <option value="">No published templates available</option>
            )}
          </select>
        </FormField>

        {/* Template Preview */}
        {formData.templateId && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {showPreview ? 'Hide' : 'Show'} Template Preview
                </span>
              </div>
              {selectedTemplate && (
                <Badge variant="blue" className="text-xs">
                  {previewComponents?.length || 0} Components
                </Badge>
              )}
            </button>
            
            {showPreview && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                {isLoadingPreview ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    Loading components...
                  </p>
                ) : previewComponents && previewComponents.length > 0 ? (
                  <div className="space-y-2">
                    {previewComponents.map((component: any) => (
                      <div
                        key={component.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center space-x-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {component.componentName}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {getComponentValue(component)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    No components in this template
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Effective From"
            required
            error={errors.effectiveFrom}
          >
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            />
          </FormField>

          <FormField
            label="Effective To"
            error={errors.effectiveTo}
            hint="Optional - leave blank for indefinite"
          >
            <Input
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Assignment Reason" hint="Optional - explain why this assignment is being made">
          <TextArea
            value={formData.assignmentReason}
            onChange={(e) => setFormData({ ...formData, assignmentReason: e.target.value })}
            placeholder="e.g., Promotion to Senior Developer, New hire with standard structure..."
            rows={3}
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
            disabled={assignMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={assignMutation.isPending || publishedTemplates.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Template'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

