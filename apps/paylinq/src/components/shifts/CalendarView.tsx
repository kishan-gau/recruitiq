import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, MapPin, AlertTriangle } from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';

interface Shift {
  id: string;
  employeeId: string;
  stationId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'needs_coverage';
  worker?: {
    firstName: string;
    lastName: string;
  };
  station?: {
    name: string;
  };
  role?: {
    name: string;
  };
}

interface CalendarViewProps {
  shifts: Shift[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onShiftClick?: (shift: Shift) => void;
  viewType?: 'week' | 'month';
}

const CalendarView: React.FC<CalendarViewProps> = ({
  shifts = [],
  selectedDate = new Date(),
  onDateChange,
  onShiftClick,
  viewType = 'week'
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);

  // Generate calendar days based on view type
  const calendarDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    if (viewType === 'week') {
      // Generate 7 days for week view
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        days.push(day);
      }
    } else {
      // Generate month view (6 weeks)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const startOfCalendar = new Date(startOfMonth);
      startOfCalendar.setDate(startOfMonth.getDate() - startOfMonth.getDay());

      for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
        const day = new Date(startOfCalendar);
        day.setDate(startOfCalendar.getDate() + i);
        days.push(day);
      }
    }

    return days;
  }, [currentDate, viewType]);

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped: { [key: string]: Shift[] } = {};
    
    shifts.forEach(shift => {
      const dateKey = shift.shiftDate.split('T')[0]; // Extract YYYY-MM-DD
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(shift);
    });

    // Sort shifts by start time within each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return grouped;
  }, [shifts]);

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewType === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'needs_coverage': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateHeader = (date: Date) => {
    if (viewType === 'week') {
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate().toString(),
        month: date.toLocaleDateString('en-US', { month: 'short' })
      };
    } else {
      return {
        day: '',
        date: date.getDate().toString(),
        month: ''
      };
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {viewType === 'week' ? 'Week of ' : ''}
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric',
              ...(viewType === 'week' && { day: 'numeric' })
            })}
          </h2>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateCalendar('prev')}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigateCalendar('next')}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`grid ${viewType === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-px bg-gray-200`}>
        {/* Weekday Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayShifts = shiftsByDate[dateKey] || [];
          const { day, date: dayNum, month } = formatDateHeader(date);

          return (
            <div
              key={index}
              className={`bg-white p-2 min-h-[120px] ${
                viewType === 'month' && !isCurrentMonth(date) ? 'bg-gray-50 text-gray-400' : ''
              } ${isToday(date) ? 'bg-blue-50' : ''}`}
            >
              {/* Date Header */}
              <div className="flex items-center justify-between mb-2">
                <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-900'}`}>
                  {viewType === 'week' && (
                    <div className="text-xs text-gray-500">{day}</div>
                  )}
                  <div>{dayNum}</div>
                  {viewType === 'week' && month && (
                    <div className="text-xs text-gray-500">{month}</div>
                  )}
                </div>
                {dayShifts.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Shifts */}
              <div className="space-y-1">
                {dayShifts.slice(0, viewType === 'week' ? 10 : 3).map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => onShiftClick?.(shift)}
                    className={`p-2 rounded text-xs border cursor-pointer hover:shadow-sm transition-shadow ${getShiftStatusColor(shift.status)}`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                    </div>
                    
                    {shift.worker && (
                      <div className="flex items-center space-x-1 mb-1">
                        <User className="w-3 h-3" />
                        <span>{shift.worker.firstName} {shift.worker.lastName}</span>
                      </div>
                    )}
                    
                    {shift.station && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{shift.station.name}</span>
                      </div>
                    )}

                    {shift.status === 'needs_coverage' && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-yellow-700">Needs Coverage</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Show "X more" if there are additional shifts */}
                {dayShifts.length > (viewType === 'week' ? 10 : 3) && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayShifts.length - (viewType === 'week' ? 10 : 3)} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-gray-600 font-medium">Status:</span>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200"></div>
            <span>Needs Coverage</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
            <span>Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;