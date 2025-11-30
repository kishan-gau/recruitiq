import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Copy, Clock } from 'lucide-react';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilityEditorProps {
  employeeId: string;
  initialAvailability?: DayAvailability[];
  onSave: (availability: DayAvailability[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultTimeSlot = (): TimeSlot => ({
  id: generateId(),
  startTime: '09:00',
  endTime: '17:00',
});

const createDefaultDayAvailability = (dayOfWeek: number): DayAvailability => ({
  dayOfWeek,
  isAvailable: false,
  timeSlots: [],
});

export default function AvailabilityEditor({
  employeeId,
  initialAvailability = [],
  onSave,
  onCancel,
  isLoading = false,
}: AvailabilityEditorProps) {
  // Initialize availability for all days of the week
  const [availability, setAvailability] = useState<DayAvailability[]>(() => {
    const availabilityMap = new Map(
      initialAvailability.map((day) => [day.dayOfWeek, day])
    );

    return DAYS_OF_WEEK.map(({ value }) =>
      availabilityMap.get(value) || createDefaultDayAvailability(value)
    );
  });

  const [copiedDay, setCopiedDay] = useState<DayAvailability | null>(null);

  const handleToggleDay = useCallback((dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const isAvailable = !day.isAvailable;
          return {
            ...day,
            isAvailable,
            timeSlots: isAvailable && day.timeSlots.length === 0
              ? [createDefaultTimeSlot()]
              : day.timeSlots,
          };
        }
        return day;
      })
    );
  }, []);

  const handleAddTimeSlot = useCallback((dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            timeSlots: [...day.timeSlots, createDefaultTimeSlot()],
          };
        }
        return day;
      })
    );
  }, []);

  const handleRemoveTimeSlot = useCallback((dayOfWeek: number, slotId: string) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedSlots = day.timeSlots.filter((slot) => slot.id !== slotId);
          return {
            ...day,
            timeSlots: updatedSlots,
            isAvailable: updatedSlots.length > 0,
          };
        }
        return day;
      })
    );
  }, []);

  const handleUpdateTimeSlot = useCallback(
    (dayOfWeek: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
      setAvailability((prev) =>
        prev.map((day) => {
          if (day.dayOfWeek === dayOfWeek) {
            return {
              ...day,
              timeSlots: day.timeSlots.map((slot) =>
                slot.id === slotId ? { ...slot, [field]: value } : slot
              ),
            };
          }
          return day;
        })
      );
    },
    []
  );

  const handleCopyDay = useCallback((dayOfWeek: number) => {
    const dayToCopy = availability.find((day) => day.dayOfWeek === dayOfWeek);
    if (dayToCopy) {
      setCopiedDay(dayToCopy);
    }
  }, [availability]);

  const handlePasteDay = useCallback((dayOfWeek: number) => {
    if (!copiedDay) return;

    setAvailability((prev) =>
      prev.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            isAvailable: copiedDay.isAvailable,
            timeSlots: copiedDay.timeSlots.map((slot) => ({
              ...slot,
              id: generateId(), // Generate new IDs for copied slots
            })),
          };
        }
        return day;
      })
    );
  }, [copiedDay]);

  const handleSave = useCallback(() => {
    // Filter out days with no time slots or not available
    const validAvailability = availability.filter(
      (day) => day.isAvailable && day.timeSlots.length > 0
    );
    onSave(validAvailability);
  }, [availability, onSave]);

  const validateTimeSlot = (slot: TimeSlot): string | null => {
    if (!slot.startTime || !slot.endTime) {
      return 'Both start and end times are required';
    }
    if (slot.startTime >= slot.endTime) {
      return 'End time must be after start time';
    }
    return null;
  };

  const hasConflicts = (day: DayAvailability): boolean => {
    const sortedSlots = [...day.timeSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      if (sortedSlots[i].endTime > sortedSlots[i + 1].startTime) {
        return true;
      }
    }
    return false;
  };

  const getDayLabel = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || '';
  };

  const getDayShort = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.short || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Edit Availability</h3>
          <p className="text-sm text-gray-600 mt-1">
            Set your weekly availability by selecting days and time slots
          </p>
        </div>
        {copiedDay && (
          <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            <Copy className="w-4 h-4 mr-2" />
            {getDayLabel(copiedDay.dayOfWeek)} copied
          </div>
        )}
      </div>

      {/* Availability Editor */}
      <div className="space-y-4">
        {availability.map((day) => {
          const dayName = getDayLabel(day.dayOfWeek);
          const dayShort = getDayShort(day.dayOfWeek);
          const hasError = day.isAvailable && hasConflicts(day);

          return (
            <div
              key={day.dayOfWeek}
              className={`border rounded-lg overflow-hidden ${
                day.isAvailable ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              } ${hasError ? 'border-red-300' : ''}`}
            >
              {/* Day Header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={() => handleToggleDay(day.dayOfWeek)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 font-medium text-gray-900">
                      {dayName}
                    </span>
                  </label>
                  {hasError && (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      Time conflicts detected
                    </span>
                  )}
                </div>

                {day.isAvailable && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyDay(day.dayOfWeek)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy day"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {copiedDay && (
                      <button
                        onClick={() => handlePasteDay(day.dayOfWeek)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Paste day"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAddTimeSlot(day.dayOfWeek)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Slot</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Time Slots */}
              {day.isAvailable && day.timeSlots.length > 0 && (
                <div className="p-4 space-y-3">
                  {day.timeSlots.map((slot) => {
                    const error = validateTimeSlot(slot);
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) =>
                                handleUpdateTimeSlot(
                                  day.dayOfWeek,
                                  slot.id,
                                  'startTime',
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                error ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) =>
                                handleUpdateTimeSlot(
                                  day.dayOfWeek,
                                  slot.id,
                                  'endTime',
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                error ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTimeSlot(day.dayOfWeek, slot.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove time slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {day.isAvailable && day.timeSlots.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No time slots added</p>
                  <button
                    onClick={() => handleAddTimeSlot(day.dayOfWeek)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add your first time slot
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || availability.every((day) => !day.isAvailable)}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}
