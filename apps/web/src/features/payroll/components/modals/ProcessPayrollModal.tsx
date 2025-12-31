import { AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import CurrencyDisplay from '@/components/ui/CurrencyDisplay';
import { Dialog } from '@recruitiq/ui';
import { FormField, Input } from '@recruitiq/ui';
import { useToast } from '@/hooks/useToast';
import { usePaylinqAPI } from '@/hooks';
import { handleApiError } from '@/utils/errorHandler';

interface ProcessPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollRun: {
    id: string;
    period: string;
    startDate: string;
    endDate: string;
    payDate: string;
    employeeCount: number;
    totalGross: number;
  } | null;
  onSuccess: () => void;
}

export default function ProcessPayrollModal({ isOpen, onClose, payrollRun, onSuccess }: ProcessPayrollModalProps) {
  const { paylinq } = usePaylinqAPI();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'review' | 'confirm'>('review');
  const [approvalNotes, setApprovalNotes] = useState('');

  const handleProcess = async () => {
    if (step === 'review') {
      setStep('confirm');
      return;
    }

    setIsLoading(true);

    try {
      const response = await paylinq.processPayrollRun({
        payrollRunId: payrollRun?.id || '',
      });

      if (response.success) {
        success(`Payroll for ${payrollRun?.period} processed successfully`);
        onSuccess();
        onClose();
        setStep('review');
        setApprovalNotes('');
      }
    } catch (err: any) {
      // Handle validation errors from API
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const fieldLabels: Record<string, string> = {
          payrollRunId: 'Payroll Run',
          processingDate: 'Processing Date',
          notes: 'Notes',
        };
        
        const errors = err.response.data.errors
          .map((e: any) => `${fieldLabels[e.field] || e.field}: ${e.message}`)
          .join(', ');
        error(errors || 'Please fix the validation errors');
      } else {
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to process payroll',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('review');
  };

  if (!payrollRun) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Process Payroll - ${payrollRun.period}`}
      size="lg"
      footer={
        <>
          <button
            onClick={step === 'confirm' ? handleBack : onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={handleProcess}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : step === 'review' ? 'Continue to Confirmation' : 'Process Payroll'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {step === 'review' && (
          <>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold mb-1">Review before processing</p>
                <p>Please review the payroll details carefully before proceeding. This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payroll Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pay Period</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{payrollRun.period}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pay Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(payrollRun.payDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Employees</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{payrollRun.employeeCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Gross</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <CurrencyDisplay amount={payrollRun.totalGross} />
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Pre-Process Checks</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">All time entries approved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tax calculations verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Bank account details validated</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No outstanding issues</span>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-semibold mb-1">Final Confirmation Required</p>
                <p>You are about to process payroll for {payrollRun.employeeCount} employees. This will:</p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>Generate payslips for all employees</li>
                  <li>Create bank transfer files</li>
                  <li>Lock the payroll period</li>
                  <li>Send notifications to employees</li>
                </ul>
              </div>
            </div>

            <FormField label="Approval Notes (Optional)">
              <Input
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this payroll run..."
              />
            </FormField>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Final Amount to be Processed
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                <CurrencyDisplay amount={payrollRun.totalGross} />
              </p>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
