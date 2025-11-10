import { Clock, AlertCircle, Check, X } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import WorkerAvatar from './WorkerAvatar';
import StatusBadge from './StatusBadge';
import { formatDate, formatTime, calculateHours } from '../../utils/helpers';

export interface TimeEntry {
  id: string;
  worker: {
    id: string;
    fullName: string;
    employeeNumber: string;
  };
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  status: 'pending' | 'approved' | 'rejected';
  issues?: string[];
  notes?: string;
}

interface TimeEntryCardProps {
  entry: TimeEntry;
  onApprove?: (entryId: string) => void;
  onReject?: (entryId: string) => void;
  onSelect?: (entryId: string) => void;
  selected?: boolean;
  className?: string;
}

export default function TimeEntryCard({
  entry,
  onApprove,
  onReject,
  onSelect,
  selected = false,
  className,
}: TimeEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalHours = entry.clockOut
    ? calculateHours(entry.clockIn, entry.clockOut, entry.breakMinutes)
    : null;

  const hasIssues = entry.issues && entry.issues.length > 0;
  const isPending = entry.status === 'pending';

  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-900 rounded-lg border transition-all',
        selected
          ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
          : hasIssues
          ? 'border-yellow-300 dark:border-yellow-700'
          : 'border-gray-200 dark:border-gray-800',
        className
      )}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          {/* Worker Info */}
          <div className="flex items-start space-x-3 flex-1">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(entry.id)}
                className="mt-1 h-4 w-4 text-blue-500 focus:ring-emerald-500 border-gray-300 dark:border-gray-700 rounded"
              />
            )}
            <WorkerAvatar fullName={entry.worker.fullName} size="md" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900 dark:text-white">{entry.worker.fullName}</h3>
                <StatusBadge status={entry.status} size="sm" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{entry.worker.employeeNumber}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{formatDate(entry.date)}</p>
            </div>
          </div>

          {/* Hours Display */}
          <div className="text-right">
            {totalHours !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">hours</p>
              </>
            ) : (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</p>
            )}
          </div>
        </div>

        {/* Time Details */}
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              {formatTime(entry.clockIn)} - {entry.clockOut ? formatTime(entry.clockOut) : 'In Progress'}
            </span>
          </div>
          {entry.breakMinutes > 0 && (
            <span className="text-gray-500 dark:text-gray-400">Break: {entry.breakMinutes} min</span>
          )}
        </div>

        {/* Issues Warning */}
        {hasIssues && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Issues Detected</p>
                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                  {entry.issues?.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Notes (Expandable) */}
        {entry.notes && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isExpanded ? 'Hide Notes' : 'Show Notes'}
          </button>
        )}

        {isExpanded && entry.notes && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
          </div>
        )}
      </div>

      {/* Actions (Only for pending entries) */}
      {isPending && (onApprove || onReject) && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          {onApprove && (
            <button
              onClick={() => onApprove(entry.id)}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(entry.id)}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors font-medium"
            >
              <X className="w-4 h-4" />
              <span>Reject</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

