import { Check } from 'lucide-react';
import clsx from 'clsx';
import { formatDate } from '../../utils/helpers';

export interface TimelineRun {
  id: string;
  period: string;
  startDate: Date;
  endDate: Date;
  status: 'completed' | 'current' | 'upcoming';
}

interface PayrollTimelineProps {
  runs: TimelineRun[];
  onSelect?: (runId: string) => void;
  className?: string;
}

export default function PayrollTimeline({ runs, onSelect, className }: PayrollTimelineProps) {
  return (
    <div className={clsx('relative', className)}>
      {/* Timeline line */}
      <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800" />

      {/* Timeline items */}
      <div className="relative flex justify-between">
        {runs.map((run) => {
          const isCompleted = run.status === 'completed';
          const isCurrent = run.status === 'current';
          const isUpcoming = run.status === 'upcoming';

          return (
            <button
              key={run.id}
              onClick={() => onSelect?.(run.id)}
              className={clsx(
                'flex flex-col items-center group',
                onSelect && 'cursor-pointer'
              )}
            >
              {/* Circle */}
              <div
                className={clsx(
                  'w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all',
                  isCompleted && 'bg-green-500 border-green-500',
                  isCurrent && 'bg-blue-500 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/30 animate-pulse',
                  isUpcoming && 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700',
                  onSelect && 'group-hover:scale-110'
                )}
              >
                {isCompleted && <Check className="w-6 h-6 text-white" />}
                {isCurrent && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>

              {/* Label */}
              <div className="mt-4 text-center">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    (isCompleted || isCurrent) && 'text-gray-900 dark:text-white',
                    isUpcoming && 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {run.period}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatDate(run.startDate.toISOString())} - {formatDate(run.endDate.toISOString())}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
