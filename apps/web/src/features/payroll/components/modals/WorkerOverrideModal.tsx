import { AlertCircle, DollarSign, Percent, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Dialog } from '@recruitiq/ui';
import { FormField, Input, TextArea } from '@recruitiq/ui';

import type { PayStructureComponent } from '@/hooks';
import type { WorkerOverride } from '@/hooks';

interface WorkerOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  component: PayStructureComponent;
  existingOverride?: WorkerOverride | null;
  workerStructureId: string;
  workerName?: string;
}

export default function WorkerOverrideModal({
  isOpen,
  onClose,
  onSubmit,
  component,
  existingOverride,
  workerStructureId,
  workerName,
}: WorkerOverrideModalProps) {
  const [formData, setFormData] = useState({
    workerStructureId: workerStructureId,
    componentCode: component.componentCode,
    overrideType: 'amount' as 'amount' | 'percentage' | 'formula' | 'rate' | 'disabled',
    overrideAmount: '',
    overridePercentage: '',
    overrideFormula: '',
    overrideRate: '',
    overrideReason: '',
    businessJustification: '',
    effectiveFrom: '',
    effectiveTo: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (existingOverride) {
        // Edit mode - populate form with override data
        setFormData({
          workerStructureId: existingOverride.workerStructureId,
          componentCode: existingOverride.componentCode,
          overrideType: existingOverride.overrideType as any,
          overrideAmount: existingOverride.overrideAmount?.toString() || '',
          overridePercentage: existingOverride.overridePercentage?.toString() || '',
          overrideFormula: existingOverride.overrideFormula || '',
          overrideRate: existingOverride.overrideRate?.toString() || '',
          overrideReason: existingOverride.overrideReason,
          businessJustification: existingOverride.businessJustification || '',
          effectiveFrom: existingOverride.effectiveFrom || '',
          effectiveTo: existingOverride.effectiveTo || '',
          notes: existingOverride.notes || '',
        });
      } else {
        // Add mode - set defaults based on component type
        let defaultType: 'amount' | 'percentage' | 'formula' | 'rate' | 'disabled' = 'amount';
        
        if (component.calculationType === 'percentage') {
          defaultType = 'percentage';
        } else if (component.calculationType === 'hourly_rate') {
          defaultType = 'rate';
        } else if (component.calculationType === 'formula') {
          defaultType = 'formula';
        }

        setFormData({
          workerStructureId: workerStructureId,
          componentCode: component.componentCode,
          overrideType: defaultType,
          overrideAmount: component.fixedAmount?.toString() || '',
          overridePercentage: component.percentageValue?.toString() || '',
          overrideFormula: component.formula || '',
          overrideRate: component.hourlyRate?.toString() || '',
          overrideReason: '',
          businessJustification: '',
          effectiveFrom: '',
          effectiveTo: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, existingOverride, component, workerStructureId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.overrideReason.trim()) {
      newErrors.overrideReason = 'Override reason is required';
    }

    // Validate override values based on type
    switch (formData.overrideType) {
      case 'amount':
        if (!formData.overrideAmount || parseFloat(formData.overrideAmount) < 0) {
          newErrors.overrideAmount = 'Amount must be a positive number';
        }
        break;
      case 'percentage':
        if (!formData.overridePercentage || parseFloat(formData.overridePercentage) < 0 || parseFloat(formData.overridePercentage) > 100) {
          newErrors.overridePercentage = 'Percentage must be between 0 and 100';
        }
        break;
      case 'rate':
        if (!formData.overrideRate || parseFloat(formData.overrideRate) < 0) {
          newErrors.overrideRate = 'Rate must be a positive number';
        }
        break;
      case 'formula':
        if (!formData.overrideFormula.trim()) {
          newErrors.overrideFormula = 'Formula is required';
        }
        break;
    }

    // Validate dates
    if (formData.effectiveFrom && formData.effectiveTo) {
      if (new Date(formData.effectiveFrom) >= new Date(formData.effectiveTo)) {
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

    const submitData: any = {
      workerStructureId: formData.workerStructureId,
      componentCode: formData.componentCode,
      overrideType: formData.overrideType,
      overrideReason: formData.overrideReason,
      businessJustification: formData.businessJustification || undefined,
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || undefined,
      notes: formData.notes || undefined,
    };

    // Add override-specific fields
    switch (formData.overrideType) {
      case 'amount':
        submitData.overrideAmount = parseFloat(formData.overrideAmount);
        break;
      case 'percentage':
        submitData.overridePercentage = parseFloat(formData.overridePercentage) / 100; // Convert to decimal
        break;
      case 'rate':
        submitData.overrideRate = parseFloat(formData.overrideRate);
        break;
      case 'formula':
        submitData.overrideFormula = formData.overrideFormula;
        break;
      case 'disabled':
        submitData.isDisabled = true;
        break;
    }

    onSubmit(submitData);
    onClose();
  };

  // Check if component allows this override type
  const isOverrideTypeAllowed = (type: string) => {
    // Component must have overrides enabled
    if (!component.allowWorkerOverride) return false;
    
    // If specific fields are defined, only allow those
    // Handle null, undefined, and empty array
    const allowedFields = component.overrideAllowedFields;
    if (allowedFields && Array.isArray(allowedFields) && allowedFields.length > 0) {
      return allowedFields.includes(type);
    }
    
    // If allowWorkerOverride is true but no fields specified, allow all types (backward compatibility)
    return true;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={existingOverride ? 'Edit Component Override' : 'Add Component Override'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                {workerName ? `Override for ${workerName}` : 'Worker-Specific Override'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Component: <strong>{component.componentName}</strong> ({component.componentCode})
              </p>
              {component.fixedAmount && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Current template value: ${component.fixedAmount}
                </p>
              )}
              {component.percentageValue && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Current template value: {component.percentageValue}%
                </p>
              )}
            </div>
          </div>
        </div>

        <FormField label="Override Type" required>
          <select
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            value={formData.overrideType}
            onChange={(e) => setFormData({ ...formData, overrideType: e.target.value as any })}
          >
            {isOverrideTypeAllowed('amount') && (
              <option value="amount">Fixed Amount Override</option>
            )}
            {isOverrideTypeAllowed('percentage') && (
              <option value="percentage">Percentage Override</option>
            )}
            {isOverrideTypeAllowed('rate') && (
              <option value="rate">Rate Override</option>
            )}
            {isOverrideTypeAllowed('formula') && (
              <option value="formula">Custom Formula</option>
            )}
            {isOverrideTypeAllowed('disabled') && (
              <option value="disabled">Disable Component</option>
            )}
          </select>
        </FormField>

        {/* Override value fields based on type */}
        {formData.overrideType === 'amount' && (
          <FormField label="Override Amount" required error={errors.overrideAmount}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={formData.overrideAmount}
                onChange={(e) => setFormData({ ...formData, overrideAmount: e.target.value })}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </FormField>
        )}

        {formData.overrideType === 'percentage' && (
          <FormField label="Override Percentage" required error={errors.overridePercentage}>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Percent className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={formData.overridePercentage}
                onChange={(e) => setFormData({ ...formData, overridePercentage: e.target.value })}
                className="pr-10"
                placeholder="0.00"
              />
            </div>
          </FormField>
        )}

        {formData.overrideType === 'rate' && (
          <FormField label="Override Rate" required error={errors.overrideRate}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <Input
                type="number"
                step="0.01"
                value={formData.overrideRate}
                onChange={(e) => setFormData({ ...formData, overrideRate: e.target.value })}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </FormField>
        )}

        {formData.overrideType === 'formula' && (
          <FormField label="Custom Formula" required error={errors.overrideFormula}>
            <TextArea
              value={formData.overrideFormula}
              onChange={(e) => setFormData({ ...formData, overrideFormula: e.target.value })}
              placeholder="e.g., base_salary * 0.15 + allowances"
              rows={3}
            />
          </FormField>
        )}

        {formData.overrideType === 'disabled' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              This component will be disabled for this worker. They will not receive this pay component.
            </p>
          </div>
        )}

        <FormField label="Override Reason" required error={errors.overrideReason}>
          <TextArea
            value={formData.overrideReason}
            onChange={(e) => setFormData({ ...formData, overrideReason: e.target.value })}
            placeholder="e.g., Senior level compensation, Performance bonus, Market adjustment"
            rows={2}
          />
        </FormField>

        <FormField label="Business Justification" hint="Optional">
          <TextArea
            value={formData.businessJustification}
            onChange={(e) => setFormData({ ...formData, businessJustification: e.target.value })}
            placeholder="Additional context or approval details..."
            rows={2}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective From" hint="Optional">
            <Input
              type="date"
              value={formData.effectiveFrom}
              onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
            />
          </FormField>

          <FormField label="Effective To" hint="Optional" error={errors.effectiveTo}>
            <Input
              type="date"
              value={formData.effectiveTo}
              onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="Notes" hint="Optional">
          <TextArea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes or comments..."
            rows={2}
          />
        </FormField>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
          >
            {existingOverride ? 'Update Override' : 'Add Override'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
