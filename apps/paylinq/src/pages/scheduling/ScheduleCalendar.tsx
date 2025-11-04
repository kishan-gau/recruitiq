import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Users, Download } from 'lucide-react';
import { ScheduleGrid, Badge } from '@/components/ui';
import type { Schedule, Employee } from '@/components/ui';
import { mockWorkers } from '@/utils/mockData';
import { formatDate } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import ShiftModal from '@/components/modals/ShiftModal';

export default function ScheduleCalendar() {
  const { success } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2025-11-03')); // Monday
  const [shiftModal, setShiftModal] = useState<{ isOpen: boolean; employeeId?: string; date?: string }>({ isOpen: false });

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysForGrid = dayNames.map((name, i) => {
    const date = weekDays[i];
    return `${name} ${date.getDate()}/${date.getMonth() + 1}`;
  });

  // Convert mock workers to Employee type
  const employees: Employee[] = mockWorkers
    .filter((w) => w.status === 'active')
    .map((w) => ({
      id: w.id,
      fullName: w.fullName,
      employeeNumber: w.employeeNumber,
    }));

  // Mock schedule data
  const schedules: Schedule[] = [
    // John Doe (SR-001)
    { id: '1-mon', workerId: '1', day: daysForGrid[0], startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '1-tue', workerId: '1', day: daysForGrid[1], startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '1-wed', workerId: '1', day: daysForGrid[2], startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '1-thu', workerId: '1', day: daysForGrid[3], startTime: '08:00', endTime: '17:00', type: 'regular' },
    { id: '1-fri', workerId: '1', day: daysForGrid[4], startTime: '08:00', endTime: '17:00', type: 'regular' },
    
    // Jane Smith (SR-002)
    { id: '2-mon', workerId: '2', day: daysForGrid[0], startTime: '09:00', endTime: '18:00', type: 'regular' },
    { id: '2-tue', workerId: '2', day: daysForGrid[1], startTime: '09:00', endTime: '18:00', type: 'regular' },
    { id: '2-wed', workerId: '2', day: daysForGrid[2], startTime: '09:00', endTime: '18:00', type: 'regular' },
    { id: '2-thu', workerId: '2', day: daysForGrid[3], startTime: '09:00', endTime: '18:00', type: 'regular' },
    { id: '2-fri', workerId: '2', day: daysForGrid[4], startTime: '09:00', endTime: '18:00', type: 'regular' },
    { id: '2-sat', workerId: '2', day: daysForGrid[5], startTime: '09:00', endTime: '13:00', type: 'overtime' },
    
    // Maria Garcia (SR-003)
    { id: '3-mon', workerId: '3', day: daysForGrid[0], startTime: '07:00', endTime: '15:00', type: 'regular' },
    { id: '3-tue', workerId: '3', day: daysForGrid[1], startTime: '07:00', endTime: '15:00', type: 'regular' },
    { id: '3-wed', workerId: '3', day: daysForGrid[2], startTime: '07:00', endTime: '15:00', type: 'regular' },
    { id: '3-thu', workerId: '3', day: daysForGrid[3], startTime: '07:00', endTime: '15:00', type: 'regular' },
    { id: '3-fri', workerId: '3', day: daysForGrid[4], startTime: '07:00', endTime: '15:00', type: 'regular' },
    
    // Peter Chen (SR-004)
    { id: '4-tue', workerId: '4', day: daysForGrid[1], startTime: '10:00', endTime: '14:00', type: 'regular' },
    { id: '4-thu', workerId: '4', day: daysForGrid[3], startTime: '10:00', endTime: '14:00', type: 'regular' },
    { id: '4-sat', workerId: '4', day: daysForGrid[5], startTime: '09:00', endTime: '17:00', type: 'regular' },
    { id: '4-sun', workerId: '4', day: daysForGrid[6], startTime: '09:00', endTime: '17:00', type: 'holiday' },
    
    // Sarah Johnson (SR-005)
    { id: '5-mon', workerId: '5', day: daysForGrid[0], startTime: '13:00', endTime: '21:00', type: 'regular' },
    { id: '5-tue', workerId: '5', day: daysForGrid[1], startTime: '13:00', endTime: '21:00', type: 'regular' },
    { id: '5-wed', workerId: '5', day: daysForGrid[2], startTime: '13:00', endTime: '21:00', type: 'regular' },
    { id: '5-thu', workerId: '5', day: daysForGrid[3], startTime: '13:00', endTime: '21:00', type: 'regular' },
    { id: '5-fri', workerId: '5', day: daysForGrid[4], startTime: '13:00', endTime: '21:00', type: 'regular' },
  ];

  // Calculate total scheduled hours
  const totalHours = schedules.reduce((sum, schedule) => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
    return sum + hours;
  }, 0);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    setCurrentWeekStart(monday);
  };

  const handleCellClick = (workerId: string, day: string) => {
    // Extract date from day string (e.g., "Monday 3/11" -> "2025-11-03")
    const dayIndex = daysForGrid.indexOf(day);
    const date = weekDays[dayIndex];
    setShiftModal({ isOpen: true, employeeId: workerId, date: date.toISOString().split('T')[0] });
  };

  const handleShiftSuccess = () => {
    // In real app, this would trigger a refetch
    success('Shift added successfully');
  };

  const handleExport = () => {
    success('Schedule exported successfully');
    // TODO: Implement actual export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scheduling</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage employee schedules and shifts
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShiftModal({ isOpen: true })}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Add Shift</span>
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <button
          onClick={goToPreviousWeek}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(weekDays[0].toISOString())} - {formatDate(weekDays[6].toISOString())}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Week {Math.ceil((weekDays[0].getDate()) / 7)}
            </p>
          </div>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextWeek}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Employees</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Shifts</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{schedules.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overtime Shifts</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {schedules.filter((s) => s.type === 'overtime').length}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <Badge variant="blue" size="sm">Regular</Badge>
          <Badge variant="purple" size="sm">Overtime</Badge>
          <Badge variant="green" size="sm">Holiday</Badge>
        </div>
      </div>

      {/* Schedule Grid */}
      <ScheduleGrid
        schedules={schedules}
        employees={employees}
        days={daysForGrid}
        onCellClick={handleCellClick}
      />

      {/* Shift Modal */}
      <ShiftModal
        isOpen={shiftModal.isOpen}
        onClose={() => setShiftModal({ isOpen: false })}
        employeeId={shiftModal.employeeId}
        date={shiftModal.date}
        onSuccess={handleShiftSuccess}
      />

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 Click on any cell to add or edit a shift. Colors indicate shift type: Blue (Regular), Purple (Overtime), Green (Holiday).
        </p>
      </div>
    </div>
  );
}
