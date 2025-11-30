/**
 * AvailabilityCalendar Component
 * 
 * Displays worker availability in a weekly/monthly grid view
 * Shows availability patterns, conflicts, and allows quick navigation
 */

import { useState, useMemo } from 'react';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Users, Clock, AlertTriangle } from 'lucide-react';

interface AvailabilityRule {
  id: string;
  workerId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string;
  isRecurring: boolean;
  effectiveDate?: string;
  expirationDate?: string;
}

interface WorkerAvailability {
  workerId: string;
  workerName: string;
  rules: AvailabilityRule[];
}

interface AvailabilityCalendarProps {
  availability: WorkerAvailability[];
  viewMode?: 'week' | 'month';
  onDateSelect?: (date: Date, workerId: string) => void;
  onRuleClick?: (rule: AvailabilityRule) => void;
  showWorkerNames?: boolean;
  highlightConflicts?: boolean;
}

const MINUTES_IN_HOUR = 60;

export default function AvailabilityCalendar({
  availability,
  onDateSelect,
  onRuleClick,
  showWorkerNames = true,
  highlightConflicts = true,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate week boundaries
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Convert time string (HH:mm) to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * MINUTES_IN_HOUR + minutes;
  };

  // Get availability rules for a specific day and worker
  const getAvailabilityForDay = (workerId: string, date: Date): AvailabilityRule[] => {
    const worker = availability.find(w => w.workerId === workerId);
    if (!worker) return [];

    const dayOfWeek = date.getDay();

    return worker.rules.filter(rule => {
      // Check if rule applies to this day of week
      if (rule.dayOfWeek !== dayOfWeek) return false;

      // Check effective date
      if (rule.effectiveDate) {
        const effectiveDate = parseISO(rule.effectiveDate);
        if (date < effectiveDate) return false;
      }

      // Check expiration date
      if (rule.expirationDate) {
        const expirationDate = parseISO(rule.expirationDate);
        if (date > expirationDate) return false;
      }

      return true;
    });
  };

  // Calculate total hours available for a day
  const calculateDayHours = (rules: AvailabilityRule[]): number => {
    let totalMinutes = 0;

    rules.forEach(rule => {
      const start = timeToMinutes(rule.startTime);
      const end = timeToMinutes(rule.endTime);
      totalMinutes += end - start;
    });

    return totalMinutes / MINUTES_IN_HOUR;
  };

  // Detect conflicts (overlapping availability rules)
  const detectConflicts = (rules: AvailabilityRule[]): boolean => {
    if (rules.length < 2) return false;

    for (let i = 0; i < rules.length - 1; i++) {
      const rule1Start = timeToMinutes(rules[i].startTime);
      const rule1End = timeToMinutes(rules[i].endTime);

      for (let j = i + 1; j < rules.length; j++) {
        const rule2Start = timeToMinutes(rules[j].startTime);
        const rule2End = timeToMinutes(rules[j].endTime);

        // Check for overlap
        if (
          (rule1Start < rule2End && rule1End > rule2Start) ||
          (rule2Start < rule1End && rule2End > rule1Start)
        ) {
          return true;
        }
      }
    }

    return false;
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    let totalWorkers = availability.length;
    let workersWithAvailability = 0;
    let totalRules = 0;
    let conflictCount = 0;

    availability.forEach(worker => {
      if (worker.rules.length > 0) {
        workersWithAvailability++;
      }
      totalRules += worker.rules.length;

      // Check for conflicts in each day
      daysInWeek.forEach(day => {
        const dayRules = getAvailabilityForDay(worker.workerId, day);
        if (detectConflicts(dayRules)) {
          conflictCount++;
        }
      });
    });

    return {
      totalWorkers,
      workersWithAvailability,
      totalRules,
      conflictCount,
    };
  }, [availability, daysInWeek]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with Navigation */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Availability Calendar
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Today
            </button>

            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Next week"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Week Display */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>

          {/* Statistics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{statistics.workersWithAvailability}/{statistics.totalWorkers} workers</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{statistics.totalRules} rules</span>
            </div>
            {highlightConflicts && statistics.conflictCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{statistics.conflictCount} conflicts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {showWorkerNames && (
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
                  Worker
                </th>
              )}
              {daysInWeek.map(day => (
                <th
                  key={day.toISOString()}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]"
                >
                  <div>{format(day, 'EEE')}</div>
                  <div className={`text-xs ${isSameDay(day, new Date()) ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {format(day, 'MMM d')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {availability.map((worker, workerIndex) => (
              <tr key={worker.workerId || `worker-${workerIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {showWorkerNames && (
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                    {worker.workerName}
                  </td>
                )}
                {daysInWeek.map(day => {
                  const dayRules = getAvailabilityForDay(worker.workerId, day);
                  const hasRules = dayRules.length > 0;
                  const totalHours = calculateDayHours(dayRules);
                  const hasConflict = highlightConflicts && detectConflicts(dayRules);

                  return (
                    <td
                      key={`${worker.workerId}-${day.toISOString()}`}
                      className={`px-2 py-3 text-center cursor-pointer transition-colors ${
                        hasRules ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } ${hasConflict ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                      onClick={() => onDateSelect?.(day, worker.workerId)}
                    >
                      {hasRules ? (
                        <div className="space-y-1">
                          {dayRules.map((rule, index) => (
                            <div
                              key={rule.id || `${worker.workerId}-${day.toISOString()}-${index}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRuleClick?.(rule);
                              }}
                              className={`text-xs px-2 py-1 rounded ${
                                hasConflict
                                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                  : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                              } hover:opacity-80 transition-opacity`}
                            >
                              {rule.startTime} - {rule.endTime}
                            </div>
                          ))}
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
                            {totalHours.toFixed(1)}h
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Not available
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {availability.length === 0 && (
        <div className="px-4 py-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No worker availability data to display</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Add availability rules to see them here
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-700 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Available</span>
          </div>
          {highlightConflicts && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Conflict</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Not available</span>
          </div>
        </div>
      </div>
    </div>
  );
}
