import { useState, useEffect } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea, Select } from '@recruitiq/ui';

import CurrencySelector from '@/components/ui/CurrencySelector';
import { type ForfaitRule } from '@/hooks';
import { useToast } from '@/hooks/useToast';

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
  defaultCurrency?: string;
  allowCurrencyOverride?: boolean;
}

interface PayComponentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (component: PayComponent) => Promise<void>;
  component?: PayComponent | null;
  mode: 'add' | 'edit';
  availableForfaitRules?: ForfaitRule[];
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
  defaultCurrency: 'SRD',
  allowCurrencyOverride: true,
  // Forfait Rule
  applyForfaitRule: false,
  forfaitRuleId: null,
};

export default function PayComponentFormModal({
  isOpen,
  onClose,
  onSubmit,
  component,
  mode,
  availableForfaitRules,
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
        defaultCurrency: component.defaultCurrency || 'SRD',
        allowCurrencyOverride: component.allowCurrencyOverride !== false,
        // Forfait Rule
        applyForfaitRule: !!((component as any).metadata?.forfaitRuleId || (component as any).forfaitRuleId),
        forfaitRuleId: (component as any).metadata?.forfaitRuleId || (component as any).forfaitRuleId || null,
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

    // Forfait rule validation
    if ((formData as any).applyForfaitRule && !(formData as any).forfaitRuleId) {
      (newErrors as any).forfaitRuleId = 'Please select a forfait rule when forfait rule is enabled';
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
      { value: 'regular_pay', label: 'Regular Pay' },
      { value: 'overtime', label: 'Overtime' },
      { value: 'bonus', label: 'Bonus' },
      { value: 'commission', label: 'Commission' },
      { value: 'allowance', label: 'Allowance' },
      { value: 'other', label: 'Other' },
    ],
    deduction: [
      { value: 'tax', label: 'Tax' },
      { value: 'benefit', label: 'Benefit/Insurance' },
      { value: 'garnishment', label: 'Garnishment' },
      { value: 'loan', label: 'Loan' },
      { value: 'other', label: 'Other' },
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

        {/* Currency Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <FormField label="Default Currency" required>
            <CurrencySelector
              value={formData.defaultCurrency || 'SRD'}
              onChange={(currency) => handleChange('defaultCurrency', currency)}
              disabled={isLoading}
              supportedCurrencies={['SRD', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']}
            />
          </FormField>

          <FormField label="Currency Override">
            <div className="flex items-center h-10">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowCurrencyOverride !== false}
                  onChange={(e) => handleChange('allowCurrencyOverride', e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Allow currency override at worker level
                </span>
              </label>
            </div>
          </FormField>
        </div>

        {/* Forfait Rule Application */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Forfait Rule Application
          </h3>
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={(formData as any).applyForfaitRule}
                onChange={(e) => {
                  const newFormData = { 
                    ...formData, 
                    applyForfaitRule: e.target.checked,
                    forfaitRuleId: e.target.checked ? (formData as any).forfaitRuleId : null
                  };
                  setFormData(newFormData as any);
                }}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-900 dark:text-white">Apply Forfait Rule</span>
            </label>

            {(formData as any).applyForfaitRule && (
              <>
                <FormField 
                  label="Forfait Rule" 
                  error={(errors as any).forfaitRuleId}
                  required
                >
                  <select
                    value={(formData as any).forfaitRuleId || ''}
                    onChange={(e) => setFormData({ ...formData, forfaitRuleId: e.target.value || null } as any)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a forfait rule...</option>
                    {availableForfaitRules?.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name} - {rule.calculationType}
                      </option>
                    ))}
                  </select>
                </FormField>

                {(formData as any).forfaitRuleId && (() => {
                  const selectedRule = availableForfaitRules?.find(r => r.id === (formData as any).forfaitRuleId);
                  return selectedRule ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm space-y-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedRule.name}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        Type: {selectedRule.calculationType}
                      </div>
                      {selectedRule.description && (
                        <div className="text-gray-600 dark:text-gray-400">
                          {selectedRule.description}
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        </div>

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

