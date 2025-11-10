import { useState, useEffect } from 'react';
import { Dialog, FormField, Input, TextArea, Select } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import FormulaBuilder from './FormulaBuilder';

interface PayComponent {
  id?: string;
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  category: string;
  calculationType: 'fixed' | 'percentage' | 'formula';
  defaultValue?: number;
  formula?: string;
  isRecurring: boolean;
  isTaxable: boolean;
  status: 'active' | 'inactive';
  description: string;
}

interface PayComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (component: PayComponent) => Promise<void>;
  component?: PayComponent | null;
  mode: 'add' | 'edit';
}

const initialFormData: Omit<PayComponent, 'id'> = {
  name: '',
  code: '',
  type: 'earning',
  category: '',
  calculationType: 'fixed',
  defaultValue: undefined,
  formula: '',
  isRecurring: true,
  isTaxable: true,
  status: 'active',
  description: '',
};

export default function PayComponentFormModal({
  isOpen,
  onClose,
  onSubmit,
  component,
  mode,
}: PayComponentFormModalProps) {
  const { error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PayComponent, string>>>({});
  const [formData, setFormData] = useState<Omit<PayComponent, 'id'>>(initialFormData);

  useEffect(() => {
    if (component && mode === 'edit') {
      setFormData({
        name: component.name,
        code: component.code,
        type: component.type,
        category: component.category,
        calculationType: component.calculationType,
        defaultValue: component.defaultValue,
        formula: component.formula || '',
        isRecurring: component.isRecurring,
        isTaxable: component.isTaxable,
        status: component.status,
        description: component.description,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [component, mode, isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PayComponent, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    else if (!/^[A-Z0-9_]+$/.test(formData.code))
      newErrors.code = 'Code must contain only uppercase letters, numbers, and underscores';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
    if (formData.calculationType === 'formula') {
      if (!formData.formula?.trim()) {
        newErrors.formula = 'Formula is required when calculation type is formula';
      }
    } else {
      if (formData.defaultValue === undefined || formData.defaultValue === null) {
        newErrors.defaultValue = 'Default value is required for fixed and percentage calculation types';
      } else if (isNaN(Number(formData.defaultValue)) || Number(formData.defaultValue) < 0) {
        newErrors.defaultValue = 'Default value must be a positive number';
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
      const submitData: PayComponent = {
        ...formData,
        ...(component?.id && { id: component.id }),
      };

      await onSubmit(submitData);
      handleClose();
    } catch (err) {
      // Handle validation errors from API
      const apiError = err as any;
      if (apiError.response?.status === 400 && apiError.response?.data?.errors) {
        const fieldLabels: Record<string, string> = {
          name: 'Name',
          type: 'Type',
          category: 'Category',
          calculationType: 'Calculation Type',
          value: 'Value',
          formula: 'Formula',
          description: 'Description',
        };
        
        const errors = apiError.response.data.errors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        showError(errors || 'Please fix the validation errors');
      } else {
        showError(apiError.response?.data?.message || (apiError instanceof Error ? apiError.message : 'Failed to save pay component'));
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

  const handleChange = (field: keyof Omit<PayComponent, 'id'>, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const typeOptions = [
    { value: 'earning', label: 'Earning' },
    { value: 'deduction', label: 'Deduction' },
  ];

  const calculationTypeOptions = [
    { value: 'fixed', label: 'Fixed Amount' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'formula', label: 'Formula' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const categoryOptions = {
    earning: [
      { value: 'Regular Pay', label: 'Regular Pay' },
      { value: 'Additional Pay', label: 'Additional Pay' },
      { value: 'Benefits', label: 'Benefits' },
      { value: 'Bonus', label: 'Bonus' },
      { value: 'Allowance', label: 'Allowance' },
    ],
    deduction: [
      { value: 'Social Security', label: 'Social Security' },
      { value: 'Insurance', label: 'Insurance' },
      { value: 'Tax', label: 'Tax' },
      { value: 'Loan', label: 'Loan' },
      { value: 'Other', label: 'Other' },
    ],
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'add' ? 'Add Pay Component' : 'Edit Pay Component'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Name" required error={errors.name}>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Base Salary"
              disabled={isLoading}
            />
          </FormField>

          <FormField label="Code" required error={errors.code}>
            <Input
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., BASE"
              disabled={isLoading || mode === 'edit'}
              maxLength={20}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Type" required>
            <Select
              value={formData.type}
              onChange={(e) => {
                handleChange('type', e.target.value);
                handleChange('category', ''); // Reset category when type changes
              }}
              options={typeOptions}
              disabled={isLoading}
            />
          </FormField>

          <FormField label="Category" required error={errors.category}>
            <Select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              options={categoryOptions[formData.type]}
              disabled={isLoading}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Calculation Type" required>
            <Select
              value={formData.calculationType}
              onChange={(e) => {
                handleChange('calculationType', e.target.value);
                if (e.target.value === 'formula') {
                  handleChange('defaultValue', undefined);
                } else {
                  handleChange('formula', '');
                }
              }}
              options={calculationTypeOptions}
              disabled={isLoading}
            />
          </FormField>

          {formData.calculationType !== 'formula' && (
            <FormField
              label={formData.calculationType === 'percentage' ? 'Percentage (%)' : 'Amount (SRD)'}
              required
              error={errors.defaultValue}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.defaultValue ?? ''}
                onChange={(e) => handleChange('defaultValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder={formData.calculationType === 'percentage' ? 'e.g., 8.33' : 'e.g., 5000'}
                disabled={isLoading}
              />
            </FormField>
          )}
        </div>

        {/* Formula Builder - Full Width when active */}
        {formData.calculationType === 'formula' && (
          <div className="col-span-full">
            <FormulaBuilder
              value={formData.formula ?? ''}
              onChange={(formula) => handleChange('formula', formula)}
              disabled={isLoading}
              componentType={formData.type}
            />
            {errors.formula && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.formula}</p>
            )}
          </div>
        )}

        <FormField label="Description" required error={errors.description}>
          <TextArea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter a detailed description of this component"
            rows={3}
            disabled={isLoading}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Status" required>
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={statusOptions}
              disabled={isLoading}
            />
          </FormField>

          <FormField label="Recurring">
            <div className="flex items-center h-10">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleChange('isRecurring', e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Applies every pay period
                </span>
              </label>
            </div>
          </FormField>

          <FormField label="Taxable">
            <div className="flex items-center h-10">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTaxable}
                  onChange={(e) => handleChange('isTaxable', e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Subject to taxation
                </span>
              </label>
            </div>
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>{mode === 'add' ? 'Add Component' : 'Save Changes'}</>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}


