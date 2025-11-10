import { useState } from 'react';
import { Dialog } from '@/components/ui';
import { useCreateReconciliation } from '@/hooks/usePayments';
import { usePayrollRuns } from '@/hooks/usePayrollRuns';
import type { ReconciliationType } from '@recruitiq/types';

interface NewReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewReconciliationModal({
  isOpen,
  onClose,
  onSuccess,
}: NewReconciliationModalProps) {
  const [payrollRunId, setPayrollRunId] = useState('');
  const [reconciliationType, setReconciliationType] = useState<ReconciliationType>('bank');
  const [reconciliationDate, setReconciliationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expectedTotal, setExpectedTotal] = useState('');
  const [actualTotal, setActualTotal] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useCreateReconciliation();
  const { data: payrollRunsData } = usePayrollRuns({ status: 'processed', limit: 50 });
  const payrollRuns = (payrollRunsData as any)?.runs || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payrollRunId) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        payrollRunId,
        reconciliationType,
        reconciliationDate,
        expectedTotal: expectedTotal ? parseFloat(expectedTotal) : undefined,
        actualTotal: actualTotal ? parseFloat(actualTotal) : undefined,
        notes: notes || undefined,
      });

      // Reset form
      setPayrollRunId('');
      setReconciliationType('bank');
      setReconciliationDate(new Date().toISOString().split('T')[0]);
      setExpectedTotal('');
      setActualTotal('');
      setNotes('');

      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="New Reconciliation"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-reconciliation-form"
            disabled={createMutation.isPending || !payrollRunId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Reconciliation'}
          </button>
        </>
      }
    >
      <form id="new-reconciliation-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Payroll Run */}
        <div>
          <label htmlFor="payrollRunId" className="block text-sm font-medium text-gray-700 mb-1">
            Payroll Run <span className="text-red-500">*</span>
          </label>
          <select
            id="payrollRunId"
            value={payrollRunId}
            onChange={(e) => setPayrollRunId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select a payroll run</option>
            {payrollRuns.map((run: any) => (
              <option key={run.id} value={run.id}>
                {run.runNumber || run.runName} - {new Date(run.payPeriodEnd).toLocaleDateString()}
              </option>
            ))}
          </select>
          {payrollRuns.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No processed payroll runs available
            </p>
          )}
        </div>

        {/* Reconciliation Type */}
        <div>
          <label htmlFor="reconciliationType" className="block text-sm font-medium text-gray-700 mb-1">
            Reconciliation Type <span className="text-red-500">*</span>
          </label>
          <select
            id="reconciliationType"
            value={reconciliationType}
            onChange={(e) => setReconciliationType(e.target.value as ReconciliationType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="bank">Bank Reconciliation</option>
            <option value="gl">General Ledger</option>
            <option value="tax">Tax Reconciliation</option>
            <option value="benefit">Benefits Reconciliation</option>
          </select>
        </div>

        {/* Reconciliation Date */}
        <div>
          <label htmlFor="reconciliationDate" className="block text-sm font-medium text-gray-700 mb-1">
            Reconciliation Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="reconciliationDate"
            value={reconciliationDate}
            onChange={(e) => setReconciliationDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Expected Total */}
        <div>
          <label htmlFor="expectedTotal" className="block text-sm font-medium text-gray-700 mb-1">
            Expected Total (Optional)
          </label>
          <input
            type="number"
            id="expectedTotal"
            value={expectedTotal}
            onChange={(e) => setExpectedTotal(e.target.value)}
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Actual Total */}
        <div>
          <label htmlFor="actualTotal" className="block text-sm font-medium text-gray-700 mb-1">
            Actual Total (Optional)
          </label>
          <input
            type="number"
            id="actualTotal"
            value={actualTotal}
            onChange={(e) => setActualTotal(e.target.value)}
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Add any notes about this reconciliation..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="mt-1 text-xs text-gray-500">{notes.length}/1000 characters</p>
        </div>
      </form>
    </Dialog>
  );
}

