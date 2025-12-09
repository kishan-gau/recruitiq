import React from 'react';
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';
import { Shift } from '../../types/schedulehub';

interface CalendarViewProps {
  shifts: Shift[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  viewType?: 'week' | 'month';
  workerNames?: Record<string, string>;
  stationNames?: Record<string, string>;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  shifts = [],
  selectedDate = new Date(),
  onDateChange,
  onShiftClick,
  viewType = 'week',
  workerNames = {},
  stationNames = {}
}) => {
  // Debug: Log what CalendarView receives
  React.useEffect(() => {
    console.log('DEBUG: CalendarView received props:', {
      shiftsCount: shifts.length,
      shifts: shifts,
      selectedDate,
      viewType,
      firstShift: shifts[0],
      shiftProperties: shifts[0] ? Object.keys(shifts[0]) : [],
      workerNamesCount: Object.keys(workerNames).length,
      stationNamesCount: Object.keys(stationNames).length,
      workerNames,
      stationNames
    });
    
    // Log each shift's structure
    shifts.forEach((shift, index) => {
      console.log(`DEBUG: Shift ${index} structure:`, {
        keys: Object.keys(shift),
        fullShift: shift
      });
    });
  }, [shifts, selectedDate, viewType, workerNames, stationNames]);

  // Helper function to get employee display name
  const getEmployeeName = (employeeId: string | undefined): string => {
    if (!employeeId) {
      console.log(`DEBUG: getEmployeeName called with no employeeId`);
      return 'Unassigned';
    }
    
    console.log(`DEBUG: getEmployeeName called with ID: ${employeeId}`);
    console.log(`DEBUG: Available worker names:`, Object.keys(workerNames));
    
    const name = workerNames[employeeId];
    if (name) {
      console.log(`DEBUG: Using worker name for ID ${employeeId}: ${name}`);
      return name;
    }
    console.log(`DEBUG: No name found for worker ID ${employeeId}, using ID as fallback`);
    return employeeId;
  };

  // Helper function to get station display name
  const getStationName = (stationId: string | undefined): string => {
    if (!stationId) {
      console.log(`DEBUG: getStationName called with no stationId`);
      return 'No Station';
    }
    
    console.log(`DEBUG: getStationName called with ID: ${stationId}`);
    console.log(`DEBUG: Available station names:`, Object.keys(stationNames));
    
    const name = stationNames[stationId];
    if (name) {
      console.log(`DEBUG: Using station name for ID ${stationId}: ${name}`);
      return name;
    }
    console.log(`DEBUG: No name found for station ID ${stationId}, using ID as fallback`);
    return stationId;
  };

  // Use selectedDate prop directly instead of internal state
  const currentDate = selectedDate;

  // Get start of week (Monday)
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Get week days
  const getWeekDays = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };
  
  const weekDays = getWeekDays();

  // Get month calendar days (42 days = 6 weeks)
  const getMonthCalendarDays = (date: Date): Array<{ date: Date; isCurrentMonth: boolean }> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    
    // First day of the calendar (start of week containing first day of month)
    const startDay = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    startDay.setDate(firstDay.getDate() - dayOfWeek);
    
    // Generate 42 days (6 weeks)
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + i);
      days.push({
        date: day,
        isCurrentMonth: day.getMonth() === month
      });
    }
    
    return days;
  };
  
  // Debug: Log the week range being displayed
  React.useEffect(() => {
    console.log('DEBUG: Week range being displayed:', {
      selectedDate: selectedDate,
      currentDate: currentDate,
      weekStart: weekDays[0]?.toDateString(),
      weekEnd: weekDays[6]?.toDateString(),
      weekDays: weekDays.map(d => d.toDateString())
    });
  }, [selectedDate, weekDays]);

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    console.log(`DEBUG: Getting shifts for date ${date.toDateString()}`);
    
    const filteredShifts = shifts.filter(shift => {
      // Debug: Log available properties for first shift only
      if (shifts.indexOf(shift) === 0) {
        console.log('DEBUG: First shift properties:', {
          shiftKeys: Object.keys(shift),
          shift: shift,
          shiftDateValue: shift.shiftDate,
          shiftDateType: typeof shift.shiftDate
        });
      }
      
      // Use the correct shiftDate property
      const shiftDate = new Date(shift.shiftDate);
      const match = shiftDate.toDateString() === date.toDateString();
      
      // Debug: Log the date filtering for first shift only
      if (shifts.indexOf(shift) === 0) {
        console.log('DEBUG: Date filtering result:', {
          targetDate: date.toDateString(),
          shiftDate: shiftDate.toDateString(),
          rawShiftDate: shift.shiftDate,
          match: match
        });
      }
      
      return match;
    });
    
    console.log(`DEBUG: getShiftsForDate(${date.toDateString()}) found ${filteredShifts.length} shifts`);
    return filteredShifts;
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    onDateChange?.(newDate);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'needs_coverage': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </h2>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Toggle removed - controlled by parent component */}
      </div>

      {/* Week View */}
      {viewType === 'week' && (
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {/* Day headers */}
          {weekDays.map((day, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 text-center">
              <div className={`font-medium text-sm ${
                isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {formatDate(day)}
              </div>
            </div>
          ))}
          
          {/* Day columns */}
          {weekDays.map((day: Date, index: number) => {
            const dayShifts = getShiftsForDate(day);
            
            return (
              <div key={index} className="bg-white dark:bg-gray-900 min-h-[400px] p-2">
                {dayShifts.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-8">
                    No shifts
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        onClick={() => onShiftClick?.(shift)}
                        className="p-2 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-colors bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(shift.status)}`}>
                            {shift.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <User className="w-3 h-3 mr-1" />
                            {getEmployeeName(shift.employeeId)}
                          </div>
                          
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <MapPin className="w-3 h-3 mr-1" />
                            {getStationName(shift.stationId)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewType === 'month' && (
        <div className="grid grid-cols-7 gap-1 mt-4">
          {/* Month Header - Days of Week */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700">
              {day}
            </div>
          ))}
          
          {/* Month Calendar Grid */}
          {getMonthCalendarDays(selectedDate).map(({ date, isCurrentMonth }, index) => {
            const dayShifts = shifts.filter(shift => {
              const shiftDate = new Date(shift.shiftDate);
              return shiftDate.toDateString() === date.toDateString();
            });

            console.log(`DEBUG: Month calendar day ${date.toDateString()}:`, {
              isCurrentMonth,
              shiftsCount: dayShifts.length,
              dayShifts
            });

            return (
              <div
                key={index}
                className={`min-h-[120px] p-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 
                  ${!isCurrentMonth ? 'opacity-40' : ''} 
                  ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                onClick={() => onDateChange?.(date)}
              >
                {/* Date Number */}
                <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                  {date.getDate()}
                </div>
                
                {/* Shifts for this day */}
                <div className="space-y-1">
                  {dayShifts.map((shift, shiftIndex) => (
                    <div
                      key={`${shift.id}-${shiftIndex}`}
                      className="p-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShiftClick?.(shift);
                      }}
                    >
                      <div className="font-medium truncate">
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 opacity-80">
                        <User className="w-3 h-3" />
                        <span className="truncate">{getEmployeeName(shift.employeeId)}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-80">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{getStationName(shift.stationId)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarView;