import { AlertCircle, DollarSign, Percent } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea } from '@recruitiq/ui';

import { usePayStructureComponents, useAddPayStructureOverride } from '@/hooks';

interface ComponentOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerStructureId: string;
  templateId: string;
  workerName: string;
}

export default function ComponentOverrideModal({
  isOpen,
  onClose,
  workerStructureId,
  templateId,
  workerName,
}: ComponentOverrideModalProps) {
  const [formData, setFormData] = useState({
    componentCode: '',
    overrideReason: '',
    effectiveFrom: '',
    effectiveTo: '',
    calculationMethod: 'fixed' as 'fixed' | 'percentage' | 'hourly' | 'formula',
    fixedAmount: '',
    percentageValue: '',
    hourlyRate: '',
    formula: '',
    isDisabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch components for the template
  const { data: components, isLoading: isLoadingComponents } = usePayStructureComponents(templateId);
  const overrideMutation = useAddPayStructureOverride();

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        componentCode: '',
        overrideReason: '',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
        calculationMethod: 'fixed',
        fixedAmount: '',
        percentageValue: '',
        hourlyRate: '',
        formula: '',
        isDisabled: false,
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.componentCode) {
      newErrors.componentCode = 'Please select a component';
    }

    if (!formData.overrideReason.trim()) {
      newErrors.overrideReason = 'Override reason is required';
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

    // Validate calculation values based on method
    if (!formData.isDisabled) {
      switch (formData.calculationMethod) {
        case 'fixed':
          if (!formData.fixedAmount || parseFloat(formData.fixedAmount) < 0) {
            newErrors.fixedAmount = 'Fixed amount must be a positive number';
          }
          break;
        case 'percentage':
          if (!formData.percentageValue || parseFloat(formData.percentageValue) < 0 || parseFloat(formData.percentageValue) > 100) {
            newErrors.percentageValue = 'Percentage must be between 0 and 100';
          }
          break;
        case 'hourly':
          if (!formData.hourlyRate || parseFloat(formData.hourlyRate) < 0) {
            newErrors.hourlyRate = 'Hourly rate must be a positive number';
          }
          break;
        case 'formula':
          if (!formData.formula.trim()) {
            newErrors.formula = 'Formula is required';
          }
          break;
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
      const overrideData: any = {
        componentCode: formData.componentCode,
        overrideReason: formData.overrideReason,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || undefined,
        isDisabled: formData.isDisabled,
      };

      // Add calculation values based on method
      if (!formData.isDisabled) {
        switch (formData.calculationMethod) {
          case 'fixed':
            overrideData.fixedAmount = parseFloat(formData.fixedAmount);
            break;
          case 'percentage':
            overrideData.percentageValue = parseFloat(formData.percentageValue);
            break;
          case 'hourly':
            overrideData.hourlyRate = parseFloat(formData.hourlyRate);
            break;
          case 'formula':
            overrideData.formula = formData.formula;
            break;
        }
      }

      await overrideMutation.mutateAsync({
        employeeId: workerStructureId, // Note: This endpoint expects employeeId but we're passing worker structure ID
        data: overrideData,
      });
      onClose();
    } catch (error) {
      // Error handled by mutation
      console.error('Failed to add component override:', error);
    }
  };

  const selectedComponent = components?.find((c: any) => c.componentCode === formData.componentCode);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Component Override"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Adding override for: {workerName}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Component overrides allow you to customize specific pay components for this worker without affecting
                the template or other workers.
              </p>
            </div>
          </div>
        </div>

        <FormField label="Component" required error={errors.componentCode}>
          <select
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            value={formData.componentCode}
            onChange={(e) => {
              const component = components?.find((c: any) => c.componentCode === e.target.value);
              setFormData({
                ...formData,
                componentCode: e.target.value,
                calculationMethod: (component?.calculationType || 'fixed') as any,
              });
            }}
          >
            <option value="">Select a component...</option>
            {isLoadingComponents ? (
              <option value="">Loading components...</option>
            ) : components && components.length > 0 ? (
              components.map((component: any) => (
                <option key={component.id} value={component.componentCode}>
                  {component.componentName} ({component.componentType})
                </option>
              ))
            ) : (
              <option value="">No components available</option>
            )}
          </select>
        </FormField>

        {selectedComponent && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Current calculation:</span> {selectedComponent.calculationType}
              {selectedComponent.calculationType === 'fixed' && selectedComponent.fixedAmount && (
                <span> - ${selectedComponent.fixedAmount}</span>
              )}
              {selectedComponent.calculationType === 'percentage' && selectedComponent.percentageValue && (
                <span> - {selectedComponent.percentageValue}%</span>
              )}
            </p>
          </div>
        )}

        <FormField label="Override Reason" required error={errors.overrideReason}>
          <TextArea
            value={formData.overrideReason}
            onChange={(e) => setFormData({ ...formData, overrideReason: e.target.value })}
            placeholder="e.g., Performance bonus, Special allowance, Temporary adjustment..."
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective From" required error={errors.effectiveFrom}>
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            />
          </FormField>

          <FormField label="Effective To" error={errors.effectiveTo} hint="Optional">
            <Input
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
            />
          </FormField>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="isDisabled"
              checked={formData.isDisabled}
              onChange={(e) => setFormData({ ...formData, isDisabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isDisabled" className="text-sm font-medium text-gray-900 dark:text-white">
              Disable this component for this worker
            </label>
          </div>

          {!formData.isDisabled && (
            <>
              <FormField label="Calculation Method">
                <select
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
                  value={formData.calculationMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      calculationMethod: e.target.value as any,
                    })
                  }
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                  <option value="hourly">Hourly Rate</option>
                  <option value="formula">Formula</option>
                </select>
              </FormField>

              {formData.calculationMethod === 'fixed' && (
                <FormField label="Fixed Amount" required error={errors.fixedAmount}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.fixedAmount}
                      onChange={(e) => setFormData({ ...formData, fixedAmount: e.target.value })}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </FormField>
              )}

              {formData.calculationMethod === 'percentage' && (
                <FormField label="Percentage Value" required error={errors.percentageValue}>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Percent className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.percentageValue}
                      onChange={(e) => setFormData({ ...formData, percentageValue: e.target.value })}
                      className="pr-10"
                      placeholder="0.00"
                    />
                  </div>
                </FormField>
              )}

              {formData.calculationMethod === 'hourly' && (
                <FormField label="Hourly Rate" required error={errors.hourlyRate}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </FormField>
              )}

              {formData.calculationMethod === 'formula' && (
                <FormField label="Formula" required error={errors.formula}>
                  <TextArea
                    value={formData.formula}
                    onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                    placeholder="e.g., base_salary * 0.10"
                    rows={3}
                  />
                </FormField>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
            disabled={overrideMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={overrideMutation.isPending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {overrideMutation.isPending ? 'Adding...' : 'Add Override'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

