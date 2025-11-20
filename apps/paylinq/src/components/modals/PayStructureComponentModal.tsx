import { useState, useEffect } from 'react';
import { AlertCircle, DollarSign, Percent, Clock, FileText, ListFilter, Settings } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import FormField, { Input, TextArea } from '@/components/ui/FormField';
import CurrencySelector from '@/components/ui/CurrencySelector';
import AvailableComponentsPicker from '@/components/ui/AvailableComponentsPicker';
import ConditionsBuilder from '@/components/ui/ConditionsBuilder';
import MetadataBuilder from '@/components/ui/MetadataBuilder';
import { usePayComponents } from '@/hooks/usePayComponents';
import { useToast } from '@/contexts/ToastContext';
import type { PayStructureComponent } from '@/hooks/usePayStructures';

interface PayStructureComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void> | void;
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
  const { error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'basic' | 'config' | 'conditions' | 'advanced'>('basic');
  const [formData, setFormData] = useState({
    componentCode: '',
    componentName: '',
    componentType: 'earnings' as 'earnings' | 'deductions' | 'taxes' | 'benefits',
    calculationType: 'fixed' as 'fixed' | 'percentage' | 'formula' | 'hourly_rate' | 'tiered',
    sequenceOrder: 1,
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
    // Tax & Pay Impact
    isTaxable: true,
    isMandatory: false,
    affectsGrossPay: true,
    affectsNetPay: true,
    taxCategory: '',
    // Value Constraints
    minAmount: '',
    maxAmount: '',
    minPercentage: '',
    maxPercentage: '',
    maxAnnual: '',
    maxPerPeriod: '',
    // Display & Approval
    displayOnPayslip: true,
    requiresApproval: false,
    accountingCode: '',
    // Currency
    defaultCurrency: 'SRD',
    allowCurrencyOverride: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available pay components
  const { data: availableComponents, isLoading: isLoadingComponents } = usePayComponents();

  useEffect(() => {
    if (isOpen) {
      // Increment reset key to force child components to remount
      setResetKey(prev => prev + 1);
      
      if (component) {
        // Edit mode - populate form with component data
        // Ensure all fields have defined values to prevent controlled/uncontrolled warnings
        const calcType = component.calculationType === 'external' 
          ? 'fixed' 
          : (component.calculationType || 'fixed');
        
        // Map backend fields (both new and legacy) to frontend form fields
        const fixedAmountValue = component.fixedAmount ?? component.defaultAmount;
        // Both percentageValue and percentageRate are stored as decimals (0.05 = 5%), multiply by 100 for display
        const percentageValueRaw = component.percentageRate != null 
          ? component.percentageRate * 100 
          : (component.percentageValue != null ? component.percentageValue * 100 : null);
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
          // Tax & Pay Impact
          isTaxable: component.isTaxable ?? true,
          isMandatory: component.isMandatory ?? false,
          affectsGrossPay: component.affectsGrossPay ?? true,
          affectsNetPay: component.affectsNetPay ?? true,
          taxCategory: component.taxCategory || '',
          // Value Constraints
          minAmount: component.minAmount != null ? component.minAmount.toString() : '',
          maxAmount: component.maxAmount != null ? component.maxAmount.toString() : '',
          minPercentage: component.minPercentage != null ? (component.minPercentage * 100).toString() : '',
          maxPercentage: component.maxPercentage != null ? (component.maxPercentage * 100).toString() : '',
          maxAnnual: component.maxAnnual != null ? component.maxAnnual.toString() : '',
          maxPerPeriod: component.maxPerPeriod != null ? component.maxPerPeriod.toString() : '',
          // Display & Approval
          displayOnPayslip: component.displayOnPayslip ?? true,
          requiresApproval: component.requiresApproval ?? false,
          accountingCode: component.accountingCode || '',
          // Currency
          defaultCurrency: component.currency || component.defaultCurrency || 'SRD',
          allowCurrencyOverride: component.allowCurrencyOverride !== false,
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
          // Tax & Pay Impact
          isTaxable: true,
          isMandatory: false,
          affectsGrossPay: true,
          affectsNetPay: true,
          taxCategory: '',
          // Value Constraints
          minAmount: '',
          maxAmount: '',
          minPercentage: '',
          maxPercentage: '',
          maxAnnual: '',
          maxPerPeriod: '',
          // Display & Approval
          displayOnPayslip: true,
          requiresApproval: false,
          accountingCode: '',
          // Currency
          defaultCurrency: 'SRD',
          allowCurrencyOverride: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, component, existingComponents]);

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
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
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      // Get the first error message to show in toast
      const errorMessages = Object.values(validation.errors);
      if (errorMessages.length > 0) {
        showError(errorMessages[0]);
      } else {
        showError('Please fix the validation errors before submitting');
      }
      return;
    }

    // Map frontend fields to backend expected fields
    const submitData: any = {
      componentCode: formData.componentCode,
      componentName: formData.componentName,
      // Map plural frontend types to singular backend types
      componentCategory: formData.componentType === 'earnings' ? 'earning' : 
                        formData.componentType === 'deductions' ? 'deduction' :
                        formData.componentType === 'taxes' ? 'tax' :
                        formData.componentType === 'benefits' ? 'benefit' :
                        formData.componentType,
      calculationType: formData.calculationType,
      sequenceOrder: formData.sequenceOrder,
      isMandatory: !formData.isOptional, // Map isOptional to isMandatory (inverse)
      displayOnPayslip: formData.displayOnPayslip,
      allowWorkerOverride: formData.allowWorkerOverride,
      overrideAllowedFields: formData.overrideAllowedFields,
      // Tax & Pay Impact
      isTaxable: formData.isTaxable,
      affectsGrossPay: formData.affectsGrossPay,
      affectsNetPay: formData.affectsNetPay,
      taxCategory: formData.taxCategory || null,
      // Value Constraints
      minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null,
      maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
      minPercentage: formData.minPercentage ? parseFloat(formData.minPercentage) / 100 : null,
      maxPercentage: formData.maxPercentage ? parseFloat(formData.maxPercentage) / 100 : null,
      maxAnnual: formData.maxAnnual ? parseFloat(formData.maxAnnual) : null,
      maxPerPeriod: formData.maxPerPeriod ? parseFloat(formData.maxPerPeriod) : null,
      // Display & Approval
      requiresApproval: formData.requiresApproval,
      accountingCode: formData.accountingCode || null,
      // Currency
      defaultCurrency: formData.defaultCurrency,
      allowCurrencyOverride: formData.allowCurrencyOverride,
    };

    // Add calculation-specific fields with backend field names
    switch (formData.calculationType) {
      case 'fixed':
        submitData.defaultAmount = parseFloat(formData.fixedAmount);
        submitData.defaultCurrency = formData.defaultCurrency;
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

    console.log('Submitting component data:', submitData);
    
    setIsSubmitting(true);
    try {
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      // Error is handled by the mutation hook, just prevent modal from closing
      console.error('Error submitting component:', error);
    } finally {
      setIsSubmitting(false);
    }
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

  const handleAddComponentToPercentageBase = (componentCode: string) => {
    setFormData((prev) => ({
      ...prev,
      percentageBase: prev.percentageBase ? `${prev.percentageBase}, ${componentCode}` : componentCode,
    }));
  };

  const handleAddComponentToFormula = (componentCode: string) => {
    setFormData((prev) => ({
      ...prev,
      formula: prev.formula ? `${prev.formula} ${componentCode}` : componentCode,
    }));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={component ? 'Edit Component' : 'Add Component to Template'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-emerald-600 dark:border-blue-400 text-emerald-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-emerald-600 dark:border-blue-400 text-emerald-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conditions')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'conditions'
                ? 'border-emerald-600 dark:border-blue-400 text-emerald-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Rules & Conditions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-emerald-600 dark:border-blue-400 text-emerald-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Settings className="w-4 h-4" />
            Advanced
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <>
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
            
            <AvailableComponentsPicker
              onComponentClick={handleAddComponentToPercentageBase}
              label="Available Variables"
              hint="Click to add a component variable to the percentage base field"
            />
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
          <>
            <FormField 
              label="Custom Formula Expression" 
              required 
              error={errors.formula}
              hint="Use variables with operators +, -, *, /"
            >
              <TextArea
                value={formData.formula}
                onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                placeholder="e.g., (base_salary * 0.10) + (overtime_hours * 1.5)"
                rows={3}
              />
            </FormField>
            
            <AvailableComponentsPicker
              onComponentClick={handleAddComponentToFormula}
              label="Available Variables"
              hint="Click to add a component variable to your formula"
            />
          </>
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
              checked={formData.displayOnPayslip}
              onChange={(e) => setFormData({ ...formData, displayOnPayslip: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-900 dark:text-white">Visible on Payslip</span>
          </label>
        </div>
              </>
            )}

            {/* Configuration Tab */}
            {activeTab === 'config' && (
              <>
                {/* Tax & Pay Impact Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tax & Pay Impact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isTaxable}
                        onChange={(e) => setFormData({ ...formData, isTaxable: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Taxable</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.affectsGrossPay}
                        onChange={(e) => setFormData({ ...formData, affectsGrossPay: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Affects Gross Pay</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.affectsNetPay}
                        onChange={(e) => setFormData({ ...formData, affectsNetPay: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Affects Net Pay</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.requiresApproval}
                        onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Requires Approval</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Tax Category">
                      <Input
                        value={formData.taxCategory}
                        onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value })}
                        placeholder="e.g., standard, exempt"
                      />
                    </FormField>

                    <FormField label="Accounting Code">
                      <Input
                        value={formData.accountingCode}
                        onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })}
                        placeholder="e.g., 5100"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Value Constraints Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Value Constraints</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Minimum Amount">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.minAmount}
                          onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>

                    <FormField label="Maximum Amount">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.maxAmount}
                          onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>

                    <FormField label="Minimum Percentage">
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Percent className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.minPercentage}
                          onChange={(e) => setFormData({ ...formData, minPercentage: e.target.value })}
                          className="pr-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>

                    <FormField label="Maximum Percentage">
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Percent className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.maxPercentage}
                          onChange={(e) => setFormData({ ...formData, maxPercentage: e.target.value })}
                          className="pr-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>

                    <FormField label="Maximum Annual">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.maxAnnual}
                          onChange={(e) => setFormData({ ...formData, maxAnnual: e.target.value })}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>

                    <FormField label="Maximum Per Period">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.maxPerPeriod}
                          onChange={(e) => setFormData({ ...formData, maxPerPeriod: e.target.value })}
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* Currency Settings Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Currency Settings</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
                    <FormField 
                      label="Default Currency" 
                      hint="Currency used for this component in payroll calculations"
                    >
                      <CurrencySelector
                        value={formData.defaultCurrency}
                        onChange={(currency) => setFormData({ ...formData, defaultCurrency: currency })}
                        supportedCurrencies={['SRD', 'USD', 'EUR', 'GBP', 'CAD', 'AUD']}
                      />
                    </FormField>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.allowCurrencyOverride}
                        onChange={(e) => setFormData({ ...formData, allowCurrencyOverride: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">Allow currency override at worker level</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Rules & Conditions Tab */}
            {activeTab === 'conditions' && (
              <ConditionsBuilder
                key={`conditions-${resetKey}`}
                value={formData.conditions}
                onChange={(value) => setFormData({ ...formData, conditions: value })}
              />
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <>
                {/* Worker Override Configuration */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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

                <MetadataBuilder
                  key={`metadata-${resetKey}`}
                  value={formData.metadata}
                  onChange={(value) => setFormData({ ...formData, metadata: value })}
                />
              </>
            )}
          </div>
        </div>


        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="inline w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {component ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>{component ? 'Update Component' : 'Add Component'}</>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}


