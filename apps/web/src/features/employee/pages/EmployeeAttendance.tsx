import { useState } from 'react';
import { Clock, Calendar as CalendarIcon, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMonthlyAttendance, useAttendanceStatistics } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/**
 * Employee Attendance Page
 * Mobile-optimized attendance tracking and history
 * 
 * Features:
 * - Monthly calendar view
 * - Daily attendance records
 * - Statistics summary
 */
export default function EmployeeAttendance() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: attendance, isLoading: attendanceLoading } = useMonthlyAttendance(
    user?.employeeId || '',
    year,
    month
  );
  
  const { data: statistics } = useAttendanceStatistics(user?.employeeId || '', 'month');

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getAttendanceStatus = (day: number) => {
    if (!attendance) return null;
    return attendance.find((a: any) => new Date(a.date).getDate() === day);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  if (attendanceLoading && !attendance) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          My Attendance
        </h1>
        <p className="text-sm opacity-90 mt-2">
          Track your attendance history
        </p>
      </div>

      <div className="p-4 space-y-6 -mt-4">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-100 rounded-xl p-4">
              <p className="text-sm text-green-800 font-medium">Present</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {statistics.daysPresent || 0}
              </p>
            </div>
            <div className="bg-red-100 rounded-xl p-4">
              <p className="text-sm text-red-800 font-medium">Absent</p>
              <p className="text-2xl font-bold text-red-900 mt-1">
                {statistics.daysAbsent || 0}
              </p>
            </div>
            <div className="bg-yellow-100 rounded-xl p-4">
              <p className="text-sm text-yellow-800 font-medium">Late</p>
              <p className="text-2xl font-bold text-yellow-900 mt-1">
                {statistics.daysLate || 0}
              </p>
            </div>
            <div className="bg-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium">Hours</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {statistics.totalHours || 0}h
              </p>
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-muted rounded-lg touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="font-semibold">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-muted rounded-lg touch-manipulation"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty cells for days before month starts */}
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {/* Actual days */}
              {days.map((day) => {
                const status = getAttendanceStatus(day);
                const isToday = 
                  day === new Date().getDate() &&
                  month === new Date().getMonth() + 1 &&
                  year === new Date().getFullYear();

                return (
                  <div
                    key={day}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                      ${isToday ? 'ring-2 ring-primary' : ''}
                      ${!status ? 'bg-muted/30 text-muted-foreground' : ''}
                      ${status?.status === 'present' ? 'bg-green-100 text-green-900' : ''}
                      ${status?.status === 'absent' ? 'bg-red-100 text-red-900' : ''}
                      ${status?.status === 'late' ? 'bg-yellow-100 text-yellow-900' : ''}
                      ${status?.status === 'off' ? 'bg-blue-100 text-blue-900' : ''}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Legend</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-green-100 rounded"></div>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-red-100 rounded"></div>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-yellow-100 rounded"></div>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-blue-100 rounded"></div>
                  <span>Day Off</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Attendance List */}
        {attendance && attendance.length > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h2 className="font-semibold mb-3">Recent Records</h2>
            <div className="space-y-3">
              {attendance.slice(0, 5).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.clockIn && `${new Date(record.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      {record.clockOut && ` - ${new Date(record.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${record.status === 'present' ? 'bg-green-100 text-green-800' : ''}
                    ${record.status === 'absent' ? 'bg-red-100 text-red-800' : ''}
                    ${record.status === 'late' ? 'bg-yellow-100 text-yellow-800' : ''}
                  `}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
