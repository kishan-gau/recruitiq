/**
 * AvailabilityEditor Component
 * 
 * Drag-and-drop interface for setting worker availability patterns
 * 
 * @component
 */

import React, { useState, useCallback } from 'react';
import { Clock, Plus, Trash2, Copy, Save, X } from 'lucide-react';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  dayOfWeek: number;
  slots: TimeSlot[];
}

interface AvailabilityEditorProps {
  workerId: string;
  initialAvailability?: DayAvailability[];
  onSave: (availability: DayAvailability[]) => Promise<void>;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const generateId = () => Math.random().toString(36).substring(2, 11);

const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  workerId,
  initialAvailability = [],
  onSave,
  onCancel,
}) => {
  const [availability, setAvailability] = useState<DayAvailability[]>(() => {
    // Initialize with empty slots for all days if not provided
    if (initialAvailability.length === 0) {
      return DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day.value,
        slots: [],
      }));
    }
    return initialAvailability;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copySource, setCopySource] = useState<number | null>(null);

  // Add a new time slot to a day
  const addSlot = useCallback((dayOfWeek: number) => {
    setAvailability(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        const newSlot: TimeSlot = {
          id: generateId(),
          startTime: '09:00',
          endTime: '17:00',
        };
        return {
          ...day,
          slots: [...day.slots, newSlot],
        };
      }
      return day;
    }));
  }, []);

  // Remove a time slot
  const removeSlot = useCallback((dayOfWeek: number, slotId: string) => {
    setAvailability(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        return {
          ...day,
          slots: day.slots.filter(slot => slot.id !== slotId),
        };
      }
      return day;
    }));
  }, []);

  // Update a time slot
  const updateSlot = useCallback((
    dayOfWeek: number,
    slotId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setAvailability(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        return {
          ...day,
          slots: day.slots.map(slot => {
            if (slot.id === slotId) {
              return { ...slot, [field]: value };
            }
            return slot;
          }),
        };
      }
      return day;
    }));
  }, []);

  // Copy day availability
  const copyDay = useCallback((dayOfWeek: number) => {
    setCopySource(dayOfWeek);
  }, []);

  // Paste day availability
  const pasteDay = useCallback((targetDay: number) => {
    if (copySource === null) return;

    const sourceDay = availability.find(day => day.dayOfWeek === copySource);
    if (!sourceDay) return;

    setAvailability(prev => prev.map(day => {
      if (day.dayOfWeek === targetDay) {
        return {
          ...day,
          slots: sourceDay.slots.map(slot => ({
            ...slot,
            id: generateId(), // Generate new IDs for copied slots
          })),
        };
      }
      return day;
    }));

    setCopySource(null);
  }, [copySource, availability]);

  // Clear day availability
  const clearDay = useCallback((dayOfWeek: number) => {
    setAvailability(prev => prev.map(day => {
      if (day.dayOfWeek === dayOfWeek) {
        return {
          ...day,
          slots: [],
        };
      }
      return day;
    }));
  }, []);

  // Validate time slots
  const validateSlots = (): boolean => {
    for (const day of availability) {
      for (const slot of day.slots) {
        // Check if end time is after start time
        if (slot.endTime <= slot.startTime) {
          alert(`Invalid time range on ${DAYS_OF_WEEK[day.dayOfWeek].label}`);
          return false;
        }

        // Check for overlapping slots
        for (const otherSlot of day.slots) {
          if (slot.id === otherSlot.id) continue;

          const slotStart = slot.startTime;
          const slotEnd = slot.endTime;
          const otherStart = otherSlot.startTime;
          const otherEnd = otherSlot.endTime;

          if (
            (slotStart >= otherStart && slotStart < otherEnd) ||
            (slotEnd > otherStart && slotEnd <= otherEnd) ||
            (slotStart <= otherStart && slotEnd >= otherEnd)
          ) {
            alert(`Overlapping time slots on ${DAYS_OF_WEEK[day.dayOfWeek].label}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateSlots()) return;

    setIsSaving(true);
    try {
      await onSave(availability);
    } catch (error) {
      console.error('Failed to save availability:', error);
      alert('Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Availability
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4 inline mr-1" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 inline mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-800">
          Add time slots for each day when the worker is available. You can copy patterns across days.
        </p>
      </div>

      {/* Days Grid */}
      <div className="p-6 space-y-4">
        {DAYS_OF_WEEK.map(day => {
          const dayData = availability.find(d => d.dayOfWeek === day.value);
          const hasSlots = dayData && dayData.slots.length > 0;

          return (
            <div
              key={day.value}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{day.label}</h3>
                <div className="flex items-center space-x-2">
                  {hasSlots && (
                    <>
                      <button
                        onClick={() => copyDay(day.value)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                        title="Copy this day"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => clearDay(day.value)}
                        className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-100 rounded"
                        title="Clear all slots"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {copySource !== null && copySource !== day.value && (
                    <button
                      onClick={() => pasteDay(day.value)}
                      className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
                    >
                      Paste from {DAYS_OF_WEEK[copySource].label}
                    </button>
                  )}
                  <button
                    onClick={() => addSlot(day.value)}
                    className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded"
                    title="Add time slot"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Time Slots */}
              <div className="p-4 space-y-3">
                {!hasSlots ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No availability set. Click + to add time slots.
                  </p>
                ) : (
                  dayData.slots.map(slot => (
                    <div
                      key={slot.id}
                      className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(day.value, slot.id, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(day.value, slot.id, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeSlot(day.value, slot.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded"
                        title="Remove slot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvailabilityEditor;
