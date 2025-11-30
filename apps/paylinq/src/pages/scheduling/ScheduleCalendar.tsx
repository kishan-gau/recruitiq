import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Users, Download } from 'lucide-react';
import ScheduleGrid from '@/components/ui/ScheduleGrid';
import Badge from '@/components/ui/Badge';
import type { Schedule, Employee } from '@/components/ui/ScheduleGrid';
import { formatDate } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import { handleApiError } from '@/utils/errorHandler';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import ShiftModal from '@/components/modals/ShiftModal';
import { useGetCurrentWeekMonday } from '@/hooks/useMemoizedDate';

export default function ScheduleCalendar() {
  const { success, error: showError } = useToast();
  const { paylinq } = usePaylinqAPI();
  const getCurrentWeekMonday = useGetCurrentWeekMonday();
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date('2025-11-03')); // Monday
  const [shiftModal, setShiftModal] = useState<{ isOpen: boolean; employeeId?: string; date?: string }>({ isOpen: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Fetch workers and schedules
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch workers
        const workersResponse = await paylinq.getWorkers({ status: 'active' });
        if (workersResponse.success && workersResponse.employees) {
          const transformedEmployees: Employee[] = workersResponse.employees.map((w: any) => ({
            id: w.employeeId || w.id, // Use employeeId (hris.employee.id) not payroll config id
            fullName: w.fullName,
            employeeNumber: w.employeeNumber,
          }));
          setEmployees(transformedEmployees);
        }

        // Fetch schedules for the current week
        const startDate = currentWeekStart.toISOString().split('T')[0];
        const endDate = new Date(currentWeekStart);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const schedulesResponse = await paylinq.getSchedules({ 
          startDate, 
          endDate: endDateStr 
        });
        
        if (schedulesResponse.success && schedulesResponse.schedules) {
          // Generate daysForGrid inside useEffect to match the current week
          const dayLabels = dayNames.map((name, i) => {
            const date = weekDays[i];
            return `${name} ${date.getDate()}/${date.getMonth() + 1}`;
          });
          
          // Transform API schedules to UI format
          const transformedSchedules: Schedule[] = schedulesResponse.schedules.map((s: any) => {
            const scheduleDate = new Date(s.scheduleDate);
            const dayIndex = (scheduleDate.getDay() + 6) % 7; // Convert to Monday=0 format
            return {
              id: s.id,
              workerId: s.employeeId || s.workerId,
              day: dayLabels[dayIndex],
              startTime: s.startTime,
              endTime: s.endTime,
              type: s.shiftName || 'Regular', // Use shiftName from joined shift_type table
            };
          });
          setSchedules(transformedSchedules);
        } else {
          setSchedules([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch scheduling data:', err);
        handleApiError(err, {
          toast,
          defaultMessage: 'Failed to load scheduling data',
        });
        setEmployees([]);
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Removed daysForGrid from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paylinq, currentWeekStart]);

  // Calculate total scheduled hours
  const totalHours = schedules.reduce((sum, schedule) => {
    const [startHour, startMin] = schedule.startTime.split(':').map(Number);
    const [endHour, endMin] = schedule.endTime.split(':').map(Number);
    const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
    return sum + hours;
  }, 0);

  const goToPreviousWeek = useCallback(() => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  }, [currentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  }, [currentWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(getCurrentWeekMonday());
  }, [getCurrentWeekMonday]);

  const handleCellClick = (workerId: string, day: string) => {
    // Extract date from day string (e.g., "Monday 3/11" -> "2025-11-03")
    const dayIndex = daysForGrid.indexOf(day);
    const date = weekDays[dayIndex];
    setShiftModal({ isOpen: true, employeeId: workerId, date: date.toISOString().split('T')[0] });
  };

  const handleShiftSuccess = () => {
    // Refetch schedules after successful operation
    const fetchSchedules = async () => {
      try {
        const startDate = currentWeekStart.toISOString().split('T')[0];
        const endDate = new Date(currentWeekStart);
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const schedulesResponse = await paylinq.getSchedules({ 
          startDate, 
          endDate: endDateStr 
        });
        
        if (schedulesResponse.success && schedulesResponse.schedules) {
          const transformedSchedules: Schedule[] = schedulesResponse.schedules.map((s: any) => {
            const scheduleDate = new Date(s.scheduleDate);
            const dayIndex = (scheduleDate.getDay() + 6) % 7;
            return {
              id: s.id,
              workerId: s.employeeId || s.workerId,
              day: daysForGrid[dayIndex],
              startTime: s.startTime,
              endTime: s.endTime,
              type: s.shiftType || 'regular',
            };
          });
          setSchedules(transformedSchedules);
        }
      } catch (err) {
        console.error('Failed to refetch schedules:', err);
      }
    };
    
    fetchSchedules();
    success('Shift saved successfully');
  };

  const handleExport = async () => {
    try {
      const startDate = currentWeekStart.toISOString().split('T')[0];
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 6);
      
      await paylinq.exportReport('schedules', {
        startDate,
        endDate: endDate.toISOString().split('T')[0],
        format: 'xlsx',
      });
      
      success('Schedule exported successfully');
    } catch (err: any) {
      console.error('Failed to export schedule:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to export schedule',
      });
    }
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
            onClick={() => {
              // For now, open modal for first employee and current week's Monday
              // In a real app, you'd want to show an employee/date picker first
              const firstEmployee = employees[0];
              const monday = weekDays[0];
              if (firstEmployee && monday) {
                setShiftModal({ 
                  isOpen: true, 
                  employeeId: firstEmployee.id, 
                  date: monday.toISOString().split('T')[0] 
                });
              } else {
                showError('Please ensure employees are loaded before adding a shift');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
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
      {isLoading ? (
        <div className="animate-pulse bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : (
        <ScheduleGrid
          schedules={schedules}
          employees={employees}
          days={daysForGrid}
          onCellClick={handleCellClick}
        />
      )}

      {/* Shift Modal */}
      <ShiftModal
        isOpen={shiftModal.isOpen}
        onClose={() => setShiftModal({ ...shiftModal, isOpen: false })}
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

