/**
 * Availability Calendar Component
 * 
 * Visual calendar interface for managing worker availability patterns.
 * Features:
 * - Weekly calendar view with time slots
 * - Drag-and-drop time selection
 * - Color-coded availability status
 * - Bulk operations
 * - Recurring patterns
 */

import { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
} from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  ArrowLeft,
  Users,
  Filter,
  Download,
} from 'lucide-react';
import {
  useAvailability,
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  useCreateAvailabilityException,
} from '@/hooks/schedulehub/useAvailability';
import { useEmployees } from '@/hooks/useEmployees';

interface TimeSlot {
  hour: number;
  label: string;
}

interface DayAvailability {
  date: Date;
  dayName: string;
  slots: Array<{
    id?: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    isException?: boolean;
  }>;
}

export default function AvailabilityCalendar() {
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { data: employees } = useEmployees();
  const { data: availability, isLoading } = useAvailability({
    workerId: selectedEmployeeId,
    startDate: format(currentWeek, 'yyyy-MM-dd'),
    endDate: format(addDays(currentWeek, 6), 'yyyy-MM-dd'),
  });

  // Mutations
  const createAvailability = useCreateAvailability();
  const updateAvailability = useUpdateAvailability();
  const deleteAvailability = useDeleteAvailability();
  const createException = useCreateAvailabilityException();

  // Time slots (6 AM to 10 PM in 30-minute intervals)
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push({
        hour: hour * 60, // minutes from midnight
        label: format(setHours(setMinutes(new Date(), 0), hour), 'h:mm a'),
      });
      if (hour < 22) {
        slots.push({
          hour: hour * 60 + 30,
          label: format(setHours(setMinutes(new Date(), 30), hour), 'h:mm a'),
        });
      }
    }
    return slots;
  }, []);

  // Generate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeek, i);
      return {
        date,
        dayName: format(date, 'EEE'),
        fullDate: format(date, 'MMM d'),
        isToday: isSameDay(date, new Date()),
      };
    });
  }, [currentWeek]);

  // Process availability data into calendar format
  const calendarData = useMemo(() => {
    if (!availability) return new Map<string, DayAvailability>();

    const dataMap = new Map<string, DayAvailability>();

    weekDays.forEach((day) => {
      const dateKey = format(day.date, 'yyyy-MM-dd');
      const dayOfWeekNumber = day.date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Find availability rules for this day
      // NOTE: API returns snake_case field names from database
      const dayAvailability = Array.isArray(availability)
        ? availability.filter((rule: any) => {
            // Match recurring availability by day of week number
            if (rule.availability_type === 'recurring' && rule.day_of_week === dayOfWeekNumber) {
              return true;
            }
            // Match one-time or unavailable by specific date
            if ((rule.availability_type === 'one_time' || rule.availability_type === 'unavailable') && 
                rule.specific_date && isSameDay(parseISO(rule.specific_date), day.date)) {
              return true;
            }
            return false;
          })
        : [];

      dataMap.set(dateKey, {
        date: day.date,
        dayName: day.dayName,
        slots: dayAvailability.map((rule: any) => ({
          id: rule.id,
          startTime: rule.start_time, // snake_case from database
          endTime: rule.end_time, // snake_case from database
          isRecurring: rule.availability_type === 'recurring',
          isException: rule.availability_type === 'one_time' || rule.availability_type === 'unavailable',
        })),
      });
    });

    return dataMap;
  }, [availability, weekDays]);

  // Check if a time slot is available
  const isSlotAvailable = (date: Date, time: number): boolean => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = calendarData.get(dateKey);
    if (!dayData || !dayData.slots.length) return false;

    const timeStr = format(setMinutes(setHours(new Date(), Math.floor(time / 60)), time % 60), 'HH:mm');

    return dayData.slots.some((slot) => {
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;
      return timeStr >= slotStart && timeStr < slotEnd;
    });
  };

  // Handle slot click/drag
  const handleSlotInteraction = (dateKey: string, timeIndex: number) => {
    const slotId = `${dateKey}-${timeIndex}`;
    setSelectedSlots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  // Navigation
  const goToPreviousWeek = () => setCurrentWeek((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek((prev) => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Save selected slots as availability
  const handleSaveAvailability = async () => {
    if (!selectedEmployeeId || selectedSlots.size === 0) return;

    // Group consecutive slots by day
    const slotsByDay = new Map<string, number[]>();
    selectedSlots.forEach((slotId) => {
      const [dateKey, timeIndex] = slotId.split('-');
      if (!slotsByDay.has(dateKey)) {
        slotsByDay.set(dateKey, []);
      }
      slotsByDay.get(dateKey)!.push(parseInt(timeIndex));
    });

    // Create availability rules
    for (const [dateKey, timeIndices] of slotsByDay.entries()) {
      const sortedIndices = timeIndices.sort((a, b) => a - b);
      const date = parseISO(dateKey);
      // Convert day of week to number: Sunday = 0, Monday = 1, ..., Saturday = 6
      const dayOfWeekNumber = date.getDay();

      // Group consecutive time slots
      const ranges: Array<{ start: number; end: number }> = [];
      let currentRange = { start: sortedIndices[0], end: sortedIndices[0] };

      for (let i = 1; i < sortedIndices.length; i++) {
        if (sortedIndices[i] === currentRange.end + 1) {
          currentRange.end = sortedIndices[i];
        } else {
          ranges.push(currentRange);
          currentRange = { start: sortedIndices[i], end: sortedIndices[i] };
        }
      }
      ranges.push(currentRange);

      // Create availability for each range
      for (const range of ranges) {
        const startMinutes = timeSlots[range.start].hour;
        const endMinutes = timeSlots[range.end + 1]?.hour || timeSlots[range.end].hour + 30;

        const startTime = format(
          setMinutes(setHours(new Date(), Math.floor(startMinutes / 60)), startMinutes % 60),
          'HH:mm'
        );
        const endTime = format(
          setMinutes(setHours(new Date(), Math.floor(endMinutes / 60)), endMinutes % 60),
          'HH:mm'
        );

        await createAvailability.mutateAsync({
          workerId: selectedEmployeeId,
          availabilityType: 'recurring',
          dayOfWeek: dayOfWeekNumber,
          startTime,
          endTime,
          priority: 'preferred',
        });
      }
    }

    setSelectedSlots(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Back to ScheduleHub */}
      <div className="bg-white px-6 pt-4">
        <Link
          to="/schedulehub"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ScheduleHub
        </Link>
      </div>
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Availability Calendar
            </h1>

            {/* Employee Selection */}
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Employee</option>
              {employees?.map((employee: any) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  viewMode === 'day'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>

            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-lg font-semibold text-gray-900">
              {format(currentWeek, 'MMMM d')} - {format(addDays(currentWeek, 6), 'MMMM d, yyyy')}
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {selectedSlots.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedSlots.size} slots selected</span>
              <button
                onClick={handleSaveAvailability}
                disabled={!selectedEmployeeId || createAvailability.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save Availability
              </button>
              <button
                onClick={() => setSelectedSlots(new Set())}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {!selectedEmployeeId ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Users className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Select an employee to view availability</p>
            <p className="text-sm">Choose an employee from the dropdown above</p>
          </div>
        ) : (
          <div className="min-w-[1200px]">
            {/* Time Column + Day Columns */}
            <div className="flex">
              {/* Time Labels */}
              <div className="w-20 flex-shrink-0 bg-gray-50 border-r border-gray-200">
                <div className="h-16 border-b border-gray-200" /> {/* Header spacer */}
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="h-12 flex items-start justify-end pr-2 pt-1 text-xs text-gray-500 border-b border-gray-100"
                  >
                    {index % 2 === 0 && <span>{slot.label}</span>}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                const dateKey = format(day.date, 'yyyy-MM-dd');
                return (
                  <div key={dateKey} className="flex-1 border-r border-gray-200">
                    {/* Day Header */}
                    <div
                      className={`h-16 flex flex-col items-center justify-center border-b border-gray-200 ${
                        day.isToday ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div
                        className={`text-xs font-medium ${
                          day.isToday ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {day.dayName}
                      </div>
                      <div
                        className={`text-sm font-semibold ${
                          day.isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}
                      >
                        {day.fullDate}
                      </div>
                    </div>

                    {/* Time Slots */}
                    {timeSlots.map((slot, timeIndex) => {
                      const slotId = `${dateKey}-${timeIndex}`;
                      const isSelected = selectedSlots.has(slotId);
                      const isAvailable = isSlotAvailable(day.date, slot.hour);

                      return (
                        <div
                          key={timeIndex}
                          className={`h-12 border-b border-gray-100 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-200'
                              : isAvailable
                              ? 'bg-green-100 hover:bg-green-200'
                              : 'hover:bg-gray-100'
                          }`}
                          onMouseDown={() => {
                            setIsDragging(true);
                            handleSlotInteraction(dateKey, timeIndex);
                          }}
                          onMouseEnter={() => {
                            if (isDragging) {
                              handleSlotInteraction(dateKey, timeIndex);
                            }
                          }}
                          onMouseUp={() => setIsDragging(false)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded" />
            <span className="text-gray-600">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
            <span className="text-gray-600">Unavailable</span>
          </div>
          <div className="ml-auto text-gray-500">
            Click and drag to select time slots • Shift+Click for multiple selections
          </div>
        </div>
      </div>
    </div>
  );
}
