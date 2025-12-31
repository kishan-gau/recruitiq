import { Calendar } from 'lucide-react';
import { useState } from 'react';

import { RunTypeSelector } from '@/components/common/RunTypeSelector';
import { Dialog } from '@recruitiq/ui';
import { FormField, Input } from '@recruitiq/ui';
import { useToast } from '@/hooks/useToast';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';

interface CreatePayrollRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePayrollRunModal({ isOpen, onClose, onSuccess }: CreatePayrollRunModalProps) {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRunType, setSelectedRunType] = useState<any>(null);
  const [formData, setFormData] = useState({
    payrollName: `Payroll ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    payPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    payPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    paymentDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toISOString().split('T')[0],
    description: '',
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.payrollName?.trim()) newErrors.payrollName = 'Payroll name is required';
    if (!selectedRunType) newErrors.runType = 'Run type is required';
    if (!formData.payPeriodStart) newErrors.payPeriodStart = 'Start date is required';
    if (!formData.payPeriodEnd) newErrors.payPeriodEnd = 'End date is required';
    if (formData.payPeriodStart && formData.payPeriodEnd && formData.payPeriodStart >= formData.payPeriodEnd) {
      newErrors.payPeriodEnd = 'End date must be after start date';
    }
    if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
    if (formData.paymentDate && formData.payPeriodEnd && formData.paymentDate < formData.payPeriodEnd) {
      newErrors.paymentDate = 'Payment date should be after period end date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsLoading(true);

    try {
      const response = await paylinq.createPayrollRun({
        payrollName: formData.payrollName,
        periodStart: formData.payPeriodStart,
        periodEnd: formData.payPeriodEnd,
        paymentDate: formData.paymentDate,
        runType: selectedRunType?.typeCode,
        status: 'draft',
      });

      if (response.success) {
        toast.success('Payroll run created successfully');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      // Handle validation errors from API
      if (err.response?.status === 400 && err.response?.data?.details) {
        const apiErrors = err.response.data.details;
        const fieldErrors: Record<string, string> = {};
        
        // Map API field names to form field names
        const fieldMap: Record<string, string> = {
          'periodStart': 'payPeriodStart',
          'periodEnd': 'payPeriodEnd',
          'paymentDate': 'paymentDate',
          'payrollName': 'payrollName',
        };
        
        apiErrors.forEach((apiError: any) => {
          const formField = fieldMap[apiError.field] || apiError.field;
          fieldErrors[formField] = apiError.message;
        });
        
        setErrors(fieldErrors);
        toast.error('Please fix the validation errors');
      } else {
        // Handle other errors
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to create payroll run. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Create Payroll Run"
      size="md"
      data-testid="create-payroll-modal"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            data-testid="cancel-button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            data-testid="submit-button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Payroll Run'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-start space-x-2">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            A new payroll run will be created for all active employees within the specified period.
          </p>
        </div>

        <FormField label="Payroll Name" required error={errors.payrollName}>
          <Input
            name="payrollName"
            data-testid="payroll-name-input"
            value={formData.payrollName}
            onChange={(e) => handleChange('payrollName', e.target.value)}
            placeholder="e.g., November 2024 Payroll"
            error={!!errors.payrollName}
          />
        </FormField>

        <RunTypeSelector
          value={selectedRunType}
          onChange={(runType) => {
            setSelectedRunType(runType);
            if (errors.runType) {
              const newErrors = { ...errors };
              delete newErrors.runType;
              setErrors(newErrors);
            }
          }}
          required
          error={errors.runType}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Period Start Date" required error={errors.payPeriodStart}>
            <Input
              type="date"
              name="periodStart"
              data-testid="period-start-input"
              value={formData.payPeriodStart}
              onChange={(e) => handleChange('payPeriodStart', e.target.value)}
              error={!!errors.payPeriodStart}
            />
          </FormField>

          <FormField label="Period End Date" required error={errors.payPeriodEnd}>
            <Input
              type="date"
              name="periodEnd"
              data-testid="period-end-input"
              value={formData.payPeriodEnd}
              onChange={(e) => handleChange('payPeriodEnd', e.target.value)}
              error={!!errors.payPeriodEnd}
            />
          </FormField>
        </div>

        <FormField label="Payment Date" required error={errors.paymentDate}>
          <Input
            type="date"
            name="paymentDate"
            data-testid="payment-date-input"
            value={formData.paymentDate}
            onChange={(e) => handleChange('paymentDate', e.target.value)}
            error={!!errors.paymentDate}
          />
        </FormField>

        <FormField label="Description">
          <Input
            name="description"
            data-testid="description-input"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description..."
          />
        </FormField>

        {formData.payPeriodStart && formData.payPeriodEnd && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Period Summary</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(formData.payPeriodStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' → '}
              {new Date(formData.payPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Payment: {new Date(formData.paymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
