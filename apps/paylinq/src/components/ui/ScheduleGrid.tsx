import clsx from 'clsx';
import { formatTime } from '../../utils/helpers';

export interface Schedule {
  id: string;
  workerId: string;
  day: string;
  startTime: string;
  endTime: string;
  type: 'regular' | 'overtime' | 'holiday';
}

export interface Employee {
  id: string;
  fullName: string;
  employeeNumber: string;
}

interface ScheduleGridProps {
  schedules: Schedule[];
  employees: Employee[];
  days: string[];
  onCellClick?: (workerId: string, day: string) => void;
  className?: string;
}

export default function ScheduleGrid({ schedules, employees, days, onCellClick, className }: ScheduleGridProps) {
  const getScheduleForCell = (workerId: string, day: string): Schedule | undefined => {
    return schedules.find((s) => s.workerId === workerId && s.day === day);
  };

  const getScheduleColor = (type: Schedule['type']) => {
    switch (type) {
      case 'regular':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300';
      case 'overtime':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300';
      case 'holiday':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className={clsx('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                Employee
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider min-w-[150px]"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {employees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{employee.employeeNumber}</p>
                  </div>
                </td>
                {days.map((day) => {
                  const schedule = getScheduleForCell(employee.id, day);
                  return (
                    <td
                      key={day}
                      className="px-4 py-4 text-center"
                    >
                      {schedule ? (
                        <button
                          onClick={() => onCellClick?.(employee.id, day)}
                          className={clsx(
                            'w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                            getScheduleColor(schedule.type),
                            onCellClick && 'hover:shadow-md cursor-pointer'
                          )}
                        >
                          <div className="font-semibold">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</div>
                          {schedule.type !== 'regular' && (
                            <div className="mt-1 text-[10px] uppercase opacity-75">{schedule.type}</div>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onCellClick?.(employee.id, day)}
                          className={clsx(
                            'w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 text-xs transition-all',
                            onCellClick && 'hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-600 dark:hover:text-blue-400 cursor-pointer'
                          )}
                        >
                          {onCellClick ? '+ Add' : '-'}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No employees to schedule</p>
          </div>
        )}
      </div>
    </div>
  );
}
