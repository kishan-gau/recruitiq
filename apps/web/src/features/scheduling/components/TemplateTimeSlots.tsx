import React, { useMemo } from 'react';
import { Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { type Station, type Shift, type ShiftTemplate, type Worker } from '../types';
import { formatTime, formatDuration, isTimeInRange, parseTimeSlot } from '../utils';

export interface TemplateTimeSlotsProps {
  station: Station;
  template: ShiftTemplate;
  currentDate: Date;
  shifts: Shift[];
  workers: Worker[];
  onShiftClick?: (shift: Shift) => void;
  onTimeSlotClick?: (timeSlot: string, stationId: string) => void;
  showEmployeeDetails?: boolean;
}

interface TimeSlotData {
  timeSlot: string;
  startTime: Date;
  endTime: Date;
  shifts: Shift[];
  requiredRoles: string[];
  isFullyStaffed: boolean;
  hasGaps: boolean;
  coverage: {
    assigned: number;
    required: number;
    percentage: number;
  };
}

/**
 * TemplateTimeSlots - Renders template-based time slots with employee assignments
 * 
 * Features:
 * - Template-based time slot visualization
 * - Employee assignment display with role matching
 * - Coverage analysis and gap detection
 * - Interactive time slot selection
 * - Role-based staffing requirements
 */
const TemplateTimeSlots: React.FC<TemplateTimeSlotsProps> = ({
  station,
  template,
  currentDate,
  shifts,
  workers,
  onShiftClick,
  onTimeSlotClick,
  showEmployeeDetails = true
}) => {
  // Process template time slots with shift assignments
  const processedSlots = useMemo(() => {
    if (!template.timeSlots || template.timeSlots.length === 0) {
      return [];
    }

    return template.timeSlots.map(timeSlot => {
      const { startTime, endTime } = parseTimeSlot(timeSlot, currentDate);
      
      // Find shifts that overlap with this time slot
      const slotShifts = shifts.filter(shift => {
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);
        
        return (
          shift.stationId === station.id &&
          shift.date === currentDate.toISOString().split('T')[0] &&
          (
            isTimeInRange(shiftStart, startTime, endTime) ||
            isTimeInRange(shiftEnd, startTime, endTime) ||
            (shiftStart <= startTime && shiftEnd >= endTime)
          )
        );
      });

      // Calculate required roles from template
      const requiredRoles = template.requiredRoles || [];
      const totalRequired = requiredRoles.length;
      
      // Count assigned roles
      const assignedRoles = slotShifts.reduce((acc, shift) => {
        const worker = workers.find(w => w.id === shift.workerId);
        if (worker && worker.roles) {
          worker.roles.forEach(role => {
            if (requiredRoles.includes(role)) {
              acc.add(role);
            }
          });
        }
        return acc;
      }, new Set<string>());

      const assigned = assignedRoles.size;
      const coverage = {
        assigned,
        required: totalRequired,
        percentage: totalRequired > 0 ? (assigned / totalRequired) * 100 : 100
      };

      return {
        timeSlot,
        startTime,
        endTime,
        shifts: slotShifts,
        requiredRoles,
        isFullyStaffed: assigned >= totalRequired,
        hasGaps: assigned < totalRequired,
        coverage
      } satisfies TimeSlotData;
    });
  }, [template, station.id, currentDate, shifts, workers]);

  // Group consecutive time slots with same staffing status
  const groupedSlots = useMemo(() => {
    if (processedSlots.length === 0) return [];

    const groups: TimeSlotData[][] = [];
    let currentGroup: TimeSlotData[] = [processedSlots[0]];

    for (let i = 1; i < processedSlots.length; i++) {
      const currentSlot = processedSlots[i];
      const lastSlot = currentGroup[currentGroup.length - 1];

      // Group slots with same staffing status
      if (
        currentSlot.isFullyStaffed === lastSlot.isFullyStaffed &&
        currentSlot.coverage.percentage === lastSlot.coverage.percentage
      ) {
        currentGroup.push(currentSlot);
      } else {
        groups.push(currentGroup);
        currentGroup = [currentSlot];
      }
    }

    groups.push(currentGroup);
    return groups;
  }, [processedSlots]);

  const handleTimeSlotClick = (timeSlot: string) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(timeSlot, station.id);
    }
  };

  const getSlotStatusColor = (slot: TimeSlotData) => {
    if (slot.isFullyStaffed) {
      return 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700';
    }
    if (slot.coverage.percentage >= 50) {
      return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700';
    }
    return 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700';
  };

  const getStatusIcon = (slot: TimeSlotData) => {
    if (slot.isFullyStaffed) {
      return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
    }
    if (slot.hasGaps) {
      return <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
    return <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
  };

  if (processedSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p>No time slots defined in template</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Template Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {template.name}
        </h4>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span>{template.requiredRoles?.join(', ') || 'No specific roles'}</span>
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-1">
        {groupedSlots.map((group, groupIndex) => {
          const firstSlot = group[0];
          const lastSlot = group[group.length - 1];
          const groupStartTime = formatTime(firstSlot.startTime);
          const groupEndTime = formatTime(lastSlot.endTime);
          
          return (
            <div
              key={groupIndex}
              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${getSlotStatusColor(firstSlot)}`}
              onClick={() => handleTimeSlotClick(`${groupStartTime}-${groupEndTime}`)}
            >
              {/* Time Range Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(firstSlot)}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {groupStartTime} - {groupEndTime}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    ({formatDuration(firstSlot.startTime, lastSlot.endTime)})
                  </span>
                </div>
                
                {/* Coverage Badge */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {firstSlot.coverage.assigned}/{firstSlot.coverage.required}
                  </span>
                  <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                    {Math.round(firstSlot.coverage.percentage)}%
                  </span>
                </div>
              </div>

              {/* Assigned Employees */}
              {showEmployeeDetails && group.some(slot => slot.shifts.length > 0) && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {group.flatMap(slot => slot.shifts).map((shift) => {
                      const worker = workers.find(w => w.id === shift.workerId);
                      if (!worker) return null;

                      return (
                        <button
                          key={shift.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onShiftClick) {
                              onShiftClick(shift);
                            }
                          }}
                          className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {worker.name}
                          </span>
                          {worker.roles && worker.roles.length > 0 && (
                            <span className="text-gray-500 dark:text-gray-400">
                              ({worker.roles.join(', ')})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staffing Gaps Warning */}
              {firstSlot.hasGaps && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-red-800 dark:text-red-300">
                        Understaffed
                      </p>
                      <p className="text-red-700 dark:text-red-400">
                        Missing {firstSlot.coverage.required - firstSlot.coverage.assigned} {
                          firstSlot.coverage.required - firstSlot.coverage.assigned === 1 ? 'person' : 'people'
                        }
                      </p>
                      {firstSlot.requiredRoles.length > 0 && (
                        <p className="text-red-600 dark:text-red-400 mt-1">
                          Required roles: {firstSlot.requiredRoles.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateTimeSlots;