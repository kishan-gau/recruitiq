/**
 * Time Off Calendar Page
 * Displays a calendar view of all time-off requests
 */

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useTimeOffRequests } from '@/hooks/useTimeOff';
import type { TimeOffType } from '@/types/timeOff.types';

const TIME_OFF_TYPE_COLORS: Record<TimeOffType, string> = {
  vacation: 'bg-blue-500',
  sick: 'bg-red-500',
  personal: 'bg-purple-500',
  bereavement: 'bg-gray-500',
  maternity: 'bg-pink-500',
  paternity: 'bg-indigo-500',
  unpaid: 'bg-yellow-500',
};

export default function TimeOffCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch requests for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: requests = [], isLoading } = useTimeOffRequests({
    status: 'approved', // Only show approved requests on calendar
  });

  // Filter requests to current month
  const monthRequests = useMemo(() => {
    return requests.filter((request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      return (
        (start >= monthStart && start <= monthEnd) ||
        (end >= monthStart && end <= monthEnd) ||
        (start <= monthStart && end >= monthEnd)
      );
    });
  }, [requests, monthStart, monthEnd]);

  // Get calendar days (including padding from previous/next month)
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get requests for a specific day
  const getRequestsForDay = (day: Date) => {
    return monthRequests.filter((request) => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      return start <= dayEnd && end >= dayStart;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Time Off Calendar</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View approved time-off requests on a calendar
          </p>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayRequests = getRequestsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-b border-r border-gray-200 dark:border-gray-700 ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900' : ''
                } ${isTodayDate ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      !isCurrentMonth
                        ? 'text-gray-400 dark:text-gray-600'
                        : isTodayDate
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {isTodayDate && (
                    <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  )}
                </div>

                {/* Time-Off Requests */}
                <div className="space-y-1">
                  {dayRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className={`text-xs px-2 py-1 rounded text-white ${
                        TIME_OFF_TYPE_COLORS[request.timeOffType]
                      } truncate cursor-pointer hover:opacity-80`}
                      title={`${request.employee?.firstName} ${request.employee?.lastName} - ${request.timeOffType}`}
                    >
                      {request.employee?.firstName} {request.employee?.lastName?.charAt(0)}.
                    </div>
                  ))}
                  {dayRequests.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                      +{dayRequests.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(TIME_OFF_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded ${color}`}></div>
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                {type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {monthRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold mt-2">{monthRequests.length}</p>
              </div>
              <CalendarIcon className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Unique Employees</p>
                <p className="text-3xl font-bold mt-2">
                  {new Set(monthRequests.map((r) => r.employeeId)).size}
                </p>
              </div>
              <CalendarIcon className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Days Off</p>
                <p className="text-3xl font-bold mt-2">
                  {monthRequests.reduce((sum, r) => sum + r.totalDays, 0)}
                </p>
              </div>
              <CalendarIcon className="h-12 w-12 text-green-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

