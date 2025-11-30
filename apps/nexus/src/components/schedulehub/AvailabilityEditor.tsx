/**
 * AvailabilityEditor Component
 * 
 * Interactive editor for setting worker availability patterns with drag-and-drop
 * Supports multiple time slots per day and recurring patterns
 */

import React, { useState, useCallback, useMemo } from 'react';
import { format, startOfWeek, addDays, parse, isSameDay } from 'date-fns';

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  date: Date;
  dayOfWeek: number;
  slots: TimeSlot[];
}

interface AvailabilityEditorProps {
  workerId: string;
  initialAvailability?: DayAvailability[];
  onSave: (availability: DayAvailability[]) => Promise<void>;
  onCancel: () => void;
  mode?: 'week' | 'day';
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export default function AvailabilityEditor({
  workerId,
  initialAvailability = [],
  onSave,
  onCancel,
  mode = 'week',
}: AvailabilityEditorProps) {
  const [availability, setAvailability] = useState<DayAvailability[]>(
    initialAvailability.length > 0
      ? initialAvailability
      : initializeWeekAvailability()
  );
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday
  const [isSaving, setIsSaving] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; time: string } | null>(null);

  function initializeWeekAvailability(): DayAvailability[] {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => ({
      date: addDays(weekStart, i),
      dayOfWeek: (i + 1) % 7, // Convert to 0=Sunday format
      slots: [],
    }));
  }

  const currentDayAvailability = useMemo(() => {
    if (mode === 'day') {
      return availability.find((a) => a.dayOfWeek === selectedDay);
    }
    return null;
  }, [availability, selectedDay, mode]);

  const addTimeSlot = useCallback((dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const newSlot: TimeSlot = {
            startTime: '09:00',
            endTime: '17:00',
          };
          return {
            ...day,
            slots: [...day.slots, newSlot],
          };
        }
        return day;
      })
    );
  }, []);

  const updateTimeSlot = useCallback(
    (dayOfWeek: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
      setAvailability((prev) =>
        prev.map((day) => {
          if (day.dayOfWeek === dayOfWeek) {
            const updatedSlots = [...day.slots];
            updatedSlots[slotIndex] = {
              ...updatedSlots[slotIndex],
              [field]: value,
            };
            return {
              ...day,
              slots: updatedSlots,
            };
          }
          return day;
        })
      );
    },
    []
  );

  const removeTimeSlot = useCallback((dayOfWeek: number, slotIndex: number) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            slots: day.slots.filter((_, i) => i !== slotIndex),
          };
        }
        return day;
      })
    );
  }, []);

  const handleDragStart = useCallback((day: number, time: string) => {
    setDragStart({ day, time });
  }, []);

  const handleDragEnd = useCallback(
    (endDay: number, endTime: string) => {
      if (!dragStart) return;

      const startHour = parseInt(dragStart.time.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      const startMinute = parseInt(dragStart.time.split(':')[1]);
      const endMinute = parseInt(endTime.split(':')[1]);

      if (dragStart.day === endDay && startHour < endHour) {
        const newSlot: TimeSlot = {
          startTime: dragStart.time,
          endTime: endTime,
        };

        setAvailability((prev) =>
          prev.map((day) => {
            if (day.dayOfWeek === dragStart.day) {
              return {
                ...day,
                slots: [...day.slots, newSlot],
              };
            }
            return day;
          })
        );
      }

      setDragStart(null);
    },
    [dragStart]
  );

  const copyToAllDays = useCallback((dayOfWeek: number) => {
    const sourceDay = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (!sourceDay) return;

    setAvailability((prev) =>
      prev.map((day) => ({
        ...day,
        slots: [...sourceDay.slots],
      }))
    );
  }, [availability]);

  const clearDay = useCallback((dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            slots: [],
          };
        }
        return day;
      })
    );
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(availability);
    } catch (error) {
      console.error('Failed to save availability:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const validateTimeSlot = (slot: TimeSlot): string | null => {
    const start = parse(slot.startTime, 'HH:mm', new Date());
    const end = parse(slot.endTime, 'HH:mm', new Date());

    if (start >= end) {
      return 'End time must be after start time';
    }

    return null;
  };

  const hasValidationErrors = useMemo(() => {
    return availability.some((day) =>
      day.slots.some((slot) => validateTimeSlot(slot) !== null)
    );
  }, [availability]);

  if (mode === 'day' && currentDayAvailability) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Availability - {DAYS_OF_WEEK[selectedDay]}
            </h2>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {DAYS_OF_WEEK.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <DayEditor
            dayAvailability={currentDayAvailability}
            onAddSlot={() => addTimeSlot(selectedDay)}
            onUpdateSlot={(slotIndex, field, value) =>
              updateTimeSlot(selectedDay, slotIndex, field, value)
            }
            onRemoveSlot={(slotIndex) => removeTimeSlot(selectedDay, slotIndex)}
            onCopyToAll={() => copyToAllDays(selectedDay)}
            onClear={() => clearDay(selectedDay)}
          />
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || hasValidationErrors}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    );
  }

  // Week view
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Edit Weekly Availability
        </h2>

        <div className="grid grid-cols-7 gap-4">
          {availability.map((day) => (
            <div key={day.dayOfWeek} className="border border-gray-200 rounded-lg p-3">
              <h3 className="font-medium text-sm text-gray-900 mb-2">
                {DAYS_OF_WEEK[day.dayOfWeek]}
              </h3>

              <div className="space-y-2">
                {day.slots.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Not available</p>
                ) : (
                  day.slots.map((slot, index) => (
                    <div
                      key={index}
                      className="bg-green-50 border border-green-200 rounded px-2 py-1"
                    >
                      <p className="text-xs text-green-900">
                        {slot.startTime} - {slot.endTime}
                      </p>
                      <button
                        onClick={() => removeTimeSlot(day.dayOfWeek, index)}
                        className="text-xs text-red-600 hover:text-red-800 mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => addTimeSlot(day.dayOfWeek)}
                className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800"
              >
                + Add Time
              </button>

              <div className="mt-2 pt-2 border-t border-gray-200 flex gap-1">
                <button
                  onClick={() => copyToAllDays(day.dayOfWeek)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                  title="Copy to all days"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => clearDay(day.dayOfWeek)}
                  className="text-xs text-red-600 hover:text-red-800"
                  title="Clear day"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || hasValidationErrors}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}

// Day editor component for detailed editing
interface DayEditorProps {
  dayAvailability: DayAvailability;
  onAddSlot: () => void;
  onUpdateSlot: (slotIndex: number, field: 'startTime' | 'endTime', value: string) => void;
  onRemoveSlot: (slotIndex: number) => void;
  onCopyToAll: () => void;
  onClear: () => void;
}

function DayEditor({
  dayAvailability,
  onAddSlot,
  onUpdateSlot,
  onRemoveSlot,
  onCopyToAll,
  onClear,
}: DayEditorProps) {
  return (
    <div>
      <div className="space-y-4 mb-4">
        {dayAvailability.slots.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No availability set for this day</p>
            <button
              onClick={onAddSlot}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Time Slot
            </button>
          </div>
        ) : (
          <>
            {dayAvailability.slots.map((slot, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <select
                    value={slot.startTime}
                    onChange={(e) => onUpdateSlot(index, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <select
                    value={slot.endTime}
                    onChange={(e) => onUpdateSlot(index, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => onRemoveSlot(index)}
                  className="mt-6 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Remove time slot"
                >
                  🗑️
                </button>
              </div>
            ))}

            <button
              onClick={onAddSlot}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + Add Another Time Slot
            </button>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCopyToAll}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          📋 Copy to All Days
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
        >
          🗑️ Clear Day
        </button>
      </div>
    </div>
  );
}
