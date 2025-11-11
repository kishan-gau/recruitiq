import { useState, useEffect } from 'react';
import { AlertCircle, DollarSign, Percent, Clock } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea } from '@/components/ui/FormField';
import { usePayComponents } from '@/hooks/usePayComponents';
import type { PayStructureComponent } from '@/hooks/usePayStructures';

interface PayStructureComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  component?: PayStructureComponent | null;
  existingComponents?: PayStructureComponent[];
}

export default function PayStructureComponentModal({
  isOpen,
  onClose,
  onSubmit,
  component,
  existingComponents = [],
}: PayStructureComponentModalProps) {
  const [formData, setFormData] = useState({
    componentCode: '',
    componentName: '',
    componentType: 'earnings' as 'earnings' | 'deductions' | 'taxes' | 'benefits',
    calculationType: 'fixed' as 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered',
    sequenceOrder: existingComponents.length + 1,
    isOptional: false,
    isVisible: true,
    allowWorkerOverride: false,
    overrideAllowedFields: [] as string[],
    fixedAmount: '',
    percentageValue: '',
    percentageBase: '',
    formula: '',
    hourlyRate: '',
    conditions: '',
    metadata: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available pay components
  const { data: availableComponents, isLoading: isLoadingComponents } = usePayComponents();

  useEffect(() => {
    if (isOpen) {
      if (component) {
        // Edit mode - populate form with component data
        // Ensure all fields have defined values to prevent controlled/uncontrolled warnings
        const calcType = component.calculationType === 'external' 
          ? 'fixed' 
          : (component.calculationType || 'fixed');
        
        // Map backend fields (both new and legacy) to frontend form fields
        const fixedAmountValue = component.fixedAmount ?? component.defaultAmount;
        const percentageValueRaw = component.percentageValue ?? (component.percentageRate ? component.percentageRate * 100 : null);
        const percentageBaseValue = component.percentageBase ?? component.percentageOf;
        const formulaValue = component.formula ?? component.formulaExpression;
        const hourlyRateValue = component.hourlyRate ?? component.rateMultiplier;
        
        setFormData({
          componentCode: component.componentCode || '',
          componentName: component.componentName || '',
          componentType: component.componentType || 'earnings',
          calculationType: calcType as 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered',
          sequenceOrder: component.sequenceOrder ?? existingComponents.length + 1,
          isOptional: component.isOptional ?? false,
          isVisible: component.isVisible ?? true,
          allowWorkerOverride: component.allowWorkerOverride ?? false,
          overrideAllowedFields: component.overrideAllowedFields || [],
          fixedAmount: fixedAmountValue != null ? fixedAmountValue.toString() : '',
          percentageValue: percentageValueRaw != null ? percentageValueRaw.toString() : '',
          percentageBase: percentageBaseValue || '',
          formula: formulaValue || '',
          hourlyRate: hourlyRateValue != null ? hourlyRateValue.toString() : '',
          conditions: component.conditions && Object.keys(component.conditions).length > 0 
            ? JSON.stringify(component.conditions, null, 2) 
            : '',
          metadata: component.metadata && Object.keys(component.metadata).length > 0 
            ? JSON.stringify(component.metadata, null, 2) 
            : '',
        });
      } else {
        // Add mode - reset form
        setFormData({
          componentCode: '',
          componentName: '',
          componentType: 'earnings',
          calculationType: 'fixed',
          sequenceOrder: existingComponents.length + 1,
          isOptional: false,
          isVisible: true,
          allowWorkerOverride: false,
          overrideAllowedFields: [],
          fixedAmount: '',
          percentageValue: '',
          percentageBase: '',
          formula: '',
          hourlyRate: '',
          conditions: '',
          metadata: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, component, existingComponents]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.componentCode.trim()) {
      newErrors.componentCode = 'Component code is required';
    }

    if (!formData.componentName.trim()) {
      newErrors.componentName = 'Component name is required';
    }

    if (!formData.sequenceOrder || formData.sequenceOrder < 1) {
      newErrors.sequenceOrder = 'Sequence order must be at least 1';
    }

    // Validate calculation values based on type
    switch (formData.calculationType) {
      case 'fixed':
        if (!formData.fixedAmount || parseFloat(formData.fixedAmount) < 0) {
          newErrors.fixedAmount = 'Fixed amount must be a positive number';
        }
        break;
      case 'percentage':
        if (!formData.percentageValue || parseFloat(formData.percentageValue) < 0 || parseFloat(formData.percentageValue) > 100) {
          newErrors.percentageValue = 'Percentage must be between 0 and 100';
        }
        if (!formData.percentageBase.trim()) {
          newErrors.percentageBase = 'Percentage base is required (e.g., base_salary, gross_pay)';
        }
        break;
      case 'hourly_rate':
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

    // Validate JSON fields
    if (formData.conditions) {
      try {
        JSON.parse(formData.conditions);
      } catch {
        newErrors.conditions = 'Invalid JSON format';
      }
    }

    if (formData.metadata) {
      try {
        JSON.parse(formData.metadata);
      } catch {
        newErrors.metadata = 'Invalid JSON format';
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

    // Map frontend fields to backend expected fields
    const submitData: any = {
      componentCode: formData.componentCode,
      componentName: formData.componentName,
      componentCategory: formData.componentType === 'earnings' ? 'earning' : 
                        formData.componentType === 'deductions' ? 'deduction' :
                        formData.componentType, // Map earnings->earning, deductions->deduction
      calculationType: formData.calculationType,
      sequenceOrder: formData.sequenceOrder,
      isMandatory: !formData.isOptional, // Map isOptional to isMandatory (inverse)
      displayOnPayslip: formData.isVisible, // Map isVisible to displayOnPayslip
      allowWorkerOverride: formData.allowWorkerOverride,
      overrideAllowedFields: formData.overrideAllowedFields,
    };

    // Add calculation-specific fields with backend field names
    switch (formData.calculationType) {
      case 'fixed':
        submitData.defaultAmount = parseFloat(formData.fixedAmount);
        submitData.defaultCurrency = 'USD'; // TODO: Get from org settings
        break;
      case 'percentage':
        submitData.percentageRate = parseFloat(formData.percentageValue) / 100; // Convert to decimal (0-1)
        submitData.percentageOf = formData.percentageBase;
        break;
      case 'hourly_rate':
        submitData.rateMultiplier = parseFloat(formData.hourlyRate);
        break;
      case 'formula':
        submitData.formulaExpression = formData.formula;
        break;
    }

    // Add optional JSON fields
    if (formData.conditions) {
      try {
        submitData.conditions = JSON.parse(formData.conditions);
      } catch {
        // Already validated
      }
    }

    if (formData.metadata) {
      try {
        submitData.metadata = JSON.parse(formData.metadata);
      } catch {
        // Already validated
      }
    }

    onSubmit(submitData);
    onClose();
  };

  const handleSelectExistingComponent = (componentCode: string) => {
    const selectedComponent = availableComponents?.find((c: any) => c.code === componentCode) as any;
    if (selectedComponent) {
      // Map calculation type from PayComponent to PayStructureComponent format
      let mappedCalculationType: 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered' = 'fixed';
      if (selectedComponent.calculationType === 'percentage') {
        mappedCalculationType = 'percentage';
      } else if (selectedComponent.calculationType === 'formula') {
        mappedCalculationType = 'formula';
      }
      
      setFormData({
        ...formData,
        componentCode: selectedComponent.code,
        componentName: selectedComponent.name,
        componentType: selectedComponent.type === 'earning' ? 'earnings' : 'deductions',
        calculationType: mappedCalculationType,
        fixedAmount: selectedComponent.defaultValue?.toString() || '',
        percentageValue: selectedComponent.defaultValue?.toString() || '',
        formula: selectedComponent.formula || '',
        // Reset override fields when copying
        allowWorkerOverride: false,
        overrideAllowedFields: [],
      });
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={component ? 'Edit Component' : 'Add Component to Template'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        {!component && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  Quick Add from Existing Components
                </p>
                <select
                  className="mt-2 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  onChange={(e) => handleSelectExistingComponent(e.target.value)}
                  value=""
                >
                  <option value="">Select an existing component to copy...</option>
                  {isLoadingComponents ? (
                    <option value="">Loading...</option>
                  ) : availableComponents && availableComponents.length > 0 ? (
                    availableComponents.map((comp: any) => (
                      <option key={comp.id} value={comp.code}>
                        {comp.name} ({comp.type})
                      </option>
                    ))
                  ) : (
                    <option value="">No components available</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Component Code" required error={errors.componentCode}>
            <Input
              value={formData.componentCode}
              onChange={(e) => setFormData({ ...formData, componentCode: e.target.value.toUpperCase() })}
              placeholder="e.g., BASIC_SALARY"
              disabled={!!component}
            />
          </FormField>

          <FormField label="Component Name" required error={errors.componentName}>
            <Input
              value={formData.componentName}
              onChange={(e) => setFormData({ ...formData, componentName: e.target.value })}
              placeholder="e.g., Basic Salary"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Component Type" required>
            <select
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
              value={formData.componentType}
              onChange={(e) => setFormData({ ...formData, componentType: e.target.value as any })}
            >
              <option value="earnings">Earnings</option>
              <option value="deductions">Deductions</option>
              <option value="taxes">Taxes</option>
              <option value="benefits">Benefits</option>
            </select>
          </FormField>

          <FormField label="Sequence Order" required error={errors.sequenceOrder}>
            <Input
              type="number"
              value={formData.sequenceOrder}
              onChange={(e) => setFormData({ ...formData, sequenceOrder: parseInt(e.target.value) || 0 })}
              placeholder="1"
            />
          </FormField>
        </div>

        <FormField label="Calculation Type" required>
          <select
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 dark:focus:ring-blue-400 focus:border-transparent"
            value={formData.calculationType}
            onChange={(e) => setFormData({ ...formData, calculationType: e.target.value as any })}
          >
            <option value="fixed">Fixed Amount</option>
            <option value="percentage">Percentage</option>
            <option value="hourly_rate">Hourly Rate</option>
            <option value="formula">Formula</option>
            <option value="tiered">Tiered</option>
          </select>
        </FormField>

        {/* Calculation-specific fields */}
        {formData.calculationType === 'fixed' && (
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

        {formData.calculationType === 'percentage' && (
          <>
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
            <FormField label="Percentage Base" required error={errors.percentageBase}>
              <Input
                value={formData.percentageBase}
                onChange={(e) => setFormData({ ...formData, percentageBase: e.target.value })}
                placeholder="e.g., base_salary, gross_pay"
              />
            </FormField>
          </>
        )}

        {formData.calculationType === 'hourly_rate' && (
          <FormField label="Hourly Rate" required error={errors.hourlyRate}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Clock className="w-4 h-4 text-gray-400" />
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

        {formData.calculationType === 'formula' && (
          <FormField label="Formula" required error={errors.formula}>
            <TextArea
              value={formData.formula}
              onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
              placeholder="e.g., base_salary * 0.10 + allowances"
              rows={3}
            />
          </FormField>
        )}

        {formData.calculationType === 'tiered' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Tiered calculation setup requires custom configuration. Save this component and configure tiers separately.
            </p>
          </div>
        )}

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isOptional}
              onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">Optional Component</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isVisible}
              onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">Visible on Payslip</span>
          </label>
        </div>

        {/* Worker Override Configuration */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <label className="flex items-center space-x-2 mb-3">
            <input
              type="checkbox"
              checked={formData.allowWorkerOverride}
              onChange={(e) => setFormData({ ...formData, allowWorkerOverride: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Allow Worker-Specific Overrides
            </span>
          </label>
          
          {formData.allowWorkerOverride && (
            <div className="ml-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Select which fields can be overridden for individual workers:
              </p>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.overrideAllowedFields.includes('amount')}
                    onChange={(e) => {
                      const fields = e.target.checked
                        ? [...formData.overrideAllowedFields, 'amount']
                        : formData.overrideAllowedFields.filter(f => f !== 'amount');
                      setFormData({ ...formData, overrideAllowedFields: fields });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Amount (e.g., $500 → $550)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.overrideAllowedFields.includes('percentage')}
                    onChange={(e) => {
                      const fields = e.target.checked
                        ? [...formData.overrideAllowedFields, 'percentage']
                        : formData.overrideAllowedFields.filter(f => f !== 'percentage');
                      setFormData({ ...formData, overrideAllowedFields: fields });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Percentage (e.g., 10% → 12%)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.overrideAllowedFields.includes('formula')}
                    onChange={(e) => {
                      const fields = e.target.checked
                        ? [...formData.overrideAllowedFields, 'formula']
                        : formData.overrideAllowedFields.filter(f => f !== 'formula');
                      setFormData({ ...formData, overrideAllowedFields: fields });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Formula (custom calculation)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.overrideAllowedFields.includes('rate')}
                    onChange={(e) => {
                      const fields = e.target.checked
                        ? [...formData.overrideAllowedFields, 'rate']
                        : formData.overrideAllowedFields.filter(f => f !== 'rate');
                      setFormData({ ...formData, overrideAllowedFields: fields });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Rate (hourly/daily rate)</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.overrideAllowedFields.includes('disabled')}
                    onChange={(e) => {
                      const fields = e.target.checked
                        ? [...formData.overrideAllowedFields, 'disabled']
                        : formData.overrideAllowedFields.filter(f => f !== 'disabled');
                      setFormData({ ...formData, overrideAllowedFields: fields });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Can be disabled for specific workers</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <FormField label="Conditions (JSON)" error={errors.conditions} hint="Optional - JSON format">
          <TextArea
            value={formData.conditions}
            onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
            placeholder='{"minHours": 40, "workerType": "full-time"}'
            rows={3}
          />
        </FormField>

        <FormField label="Metadata (JSON)" error={errors.metadata} hint="Optional - JSON format">
          <TextArea
            value={formData.metadata}
            onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
            placeholder='{"category": "regular", "taxable": true}'
            rows={3}
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
            {component ? 'Update Component' : 'Add Component'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}


