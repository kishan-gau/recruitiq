import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea } from '@/components/ui/FormField';
import { useToast } from '@/contexts/ToastContext';
import type { PayStructureTemplate } from '@/hooks/usePayStructures';

interface PayStructureTemplateFormData {
  templateCode: string;
  templateName: string;
  description?: string;
  isOrganizationDefault: boolean;
  effectiveFrom: string;  // Required - API requires this field
  effectiveTo?: string;
}

interface PayStructureTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: PayStructureTemplateFormData) => Promise<void>;
  template?: PayStructureTemplate | null;
  mode: 'add' | 'edit';
}

const initialFormData: PayStructureTemplateFormData = {
  templateCode: '',
  templateName: '',
  description: '',
  isOrganizationDefault: false,
  effectiveFrom: new Date().toISOString().split('T')[0], // Default to today's date
  effectiveTo: '',
};

export default function PayStructureTemplateModal({
  isOpen,
  onClose,
  onSubmit,
  template,
  mode,
}: PayStructureTemplateModalProps) {
  const { error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PayStructureTemplateFormData, string>>>({});
  const [formData, setFormData] = useState<PayStructureTemplateFormData>(initialFormData);

  useEffect(() => {
    if (template && mode === 'edit') {
      setFormData({
        templateCode: template.templateCode,
        templateName: template.templateName,
        description: template.description || '',
        isOrganizationDefault: template.isOrganizationDefault,
        effectiveFrom: template.effectiveFrom ? new Date(template.effectiveFrom).toISOString().split('T')[0] : '',
        effectiveTo: template.effectiveTo ? new Date(template.effectiveTo).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [template, mode, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PayStructureTemplateFormData, string>> = {};

    if (!formData.templateName.trim()) {
      newErrors.templateName = 'Template name is required';
    }
    
    if (!formData.templateCode.trim()) {
      newErrors.templateCode = 'Template code is required';
    } else if (!/^[A-Z0-9_]+$/.test(formData.templateCode)) {
      newErrors.templateCode = 'Code must contain only uppercase letters, numbers, and underscores';
    }

    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) >= new Date(formData.effectiveTo)) {
        newErrors.effectiveTo = 'Effective to date must be after effective from date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      showError('Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      // Transform data before sending to API
      const submitData: any = {
        ...formData,
        // Convert empty strings to null for optional date fields
        effectiveTo: formData.effectiveTo?.trim() ? formData.effectiveTo : null,
        description: formData.description?.trim() || null,
      };
      
      await onSubmit(submitData);
      handleClose();
    } catch (err: any) {
      console.error('Error submitting template:', err);
      
      // Extract error message from API response
      let errorMessage = err?.response?.data?.message 
        || err?.response?.data?.error
        || err?.message 
        || 'Failed to create template';
      
      // Make database constraint errors more user-friendly
      if (errorMessage.includes('unique_org_default_period')) {
        errorMessage = 'Cannot set as organization default. Another template is already set as the default for this time period. Please either uncheck "Organization Default" or change the effective dates to avoid overlap.';
      } else if (errorMessage.includes('duplicate key')) {
        errorMessage = 'A template with this code already exists. Please use a different template code.';
      }
      
      showError(errorMessage);
      
      // If there are field-specific validation errors, show them
      if (err?.response?.data?.details) {
        const apiErrors: any = {};
        err.response.data.details.forEach((detail: any) => {
          if (detail.path && detail.message) {
            apiErrors[detail.path[0]] = detail.message;
          }
        });
        if (Object.keys(apiErrors).length > 0) {
          setErrors(apiErrors);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const handleChange = (field: keyof PayStructureTemplateFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'add' ? 'Create Pay Structure Template' : 'Edit Pay Structure Template'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Code */}
        <FormField
          label="Template Code"
          required
          error={errors.templateCode}
          hint="Unique identifier (e.g., STANDARD_SALARY, HOURLY_WORKER)"
        >
          <Input
            data-testid="template-code-input"
            value={formData.templateCode}
            onChange={(e) => handleChange('templateCode', e.target.value.toUpperCase())}
            placeholder="e.g., STANDARD_SALARY"
            disabled={mode === 'edit'}
            error={!!errors.templateCode}
          />
        </FormField>

        {/* Template Name */}
        <FormField
          label="Template Name"
          required
          error={errors.templateName}
          hint="Descriptive name for this template"
        >
          <Input
            data-testid="template-name-input"
            value={formData.templateName}
            onChange={(e) => handleChange('templateName', e.target.value)}
            placeholder="e.g., Standard Salaried Employee"
            error={!!errors.templateName}
          />
        </FormField>

        {/* Description */}
        <FormField
          label="Description"
          error={errors.description}
          hint="Explain when this template should be used"
        >
          <TextArea
            data-testid="template-description-input"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the purpose and use case for this template..."
            rows={3}
            error={!!errors.description}
          />
        </FormField>

        {/* Organization Default */}
        <FormField
          label="Organization Default"
          hint="Set this template as the default for all workers"
        >
          <div className="flex items-center gap-2">
            <input
              data-testid="organization-default-checkbox"
              type="checkbox"
              id="isOrganizationDefault"
              checked={formData.isOrganizationDefault}
              onChange={(e) => handleChange('isOrganizationDefault', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
            />
            <label
              htmlFor="isOrganizationDefault"
              className="text-sm text-gray-700 dark:text-gray-300"
            >
              Use this template as the organization-wide default
            </label>
          </div>
        </FormField>

        {/* Effective Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Effective From"
            error={errors.effectiveFrom}
            hint="When this template becomes active"
          >
            <Input
              data-testid="effective-from-input"
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => handleChange('effectiveFrom', e.target.value)}
              error={!!errors.effectiveFrom}
            />
          </FormField>

          <FormField
            label="Effective To"
            error={errors.effectiveTo}
            hint="When this template expires (optional)"
          >
            <Input
              data-testid="effective-to-input"
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => handleChange('effectiveTo', e.target.value)}
              error={!!errors.effectiveTo}
            />
          </FormField>
        </div>

        {/* Info Box */}
        {mode === 'add' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Next Steps</p>
                <p>
                  After creating the template, you'll be able to add pay components, configure
                  calculations, and assign it to workers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {mode === 'add' ? 'Create Template' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}


