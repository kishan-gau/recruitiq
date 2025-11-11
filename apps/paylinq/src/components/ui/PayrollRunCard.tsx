import { Users, Calendar, PlayCircle, Eye } from 'lucide-react';
import clsx from 'clsx';
import StatusBadge from './StatusBadge';
import CurrencyDisplay from './CurrencyDisplay';
import { formatDate } from '../../utils/helpers';

export interface PayrollRun {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'calculating' | 'calculated' | 'approved' | 'processing' | 'processed' | 'cancelled';
  employeeCount: number;
  totalAmount: number;
  type?: string;
}

interface PayrollRunCardProps {
  run: PayrollRun;
  onProcess?: (runId: string) => void;
  onView?: (runId: string) => void;
  className?: string;
}

export default function PayrollRunCard({ run, onProcess, onView, className }: PayrollRunCardProps) {
  const isReadyToProcess = run.status === 'calculated' || run.status === 'approved';
  const canProcess = isReadyToProcess && onProcess;

  return (
    <div
      data-testid="payroll-run-card"
      data-run-id={run.id}
      className={clsx(
        'bg-white dark:bg-gray-900 rounded-lg border p-6 transition-all',
        isReadyToProcess
          ? 'border-blue-300 dark:border-blue-700 shadow-sm'
          : 'border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="run-period">{run.period}</h3>
          {run.type && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{run.type}</p>
          )}
        </div>
        <StatusBadge status={run.status} data-testid="run-status" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-start space-x-2">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Period</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="pay-period">
              {formatDate(run.startDate)} -<br />{formatDate(run.endDate)}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Users className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="employee-count">{run.employeeCount}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
          <CurrencyDisplay amount={run.totalAmount} className="text-sm font-medium" data-testid="total-amount" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {canProcess && (
          <button
            onClick={() => onProcess(run.id)}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Process Payroll</span>
          </button>
        )}
        {onView && (
          <button
            onClick={() => onView(run.id)}
            className={clsx(
              'flex items-center justify-center space-x-2 px-4 py-2 border rounded-lg transition-colors',
              canProcess
                ? 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </button>
        )}
      </div>
    </div>
  );
}
