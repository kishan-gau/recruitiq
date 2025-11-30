/**
 * AvailabilityEditor Component
 * 
 * Interactive interface for creating and editing worker availability rules
 * Features drag-and-drop time selection and visual feedback
 */

import React, { useState, useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { Clock, Plus, Trash2, Copy, Save, X, AlertCircle } from 'lucide-react';

interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;
}

interface AvailabilityRule {
  id?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  effectiveDate?: string;
  expirationDate?: string;
}

interface AvailabilityEditorProps {
  workerId: string;
  workerName: string;
  existingRules?: AvailabilityRule[];
  onSave: (rules: AvailabilityRule[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
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

const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return format(addMinutes(new Date(2000, 0, 1, 0, 0), hour * 60 + minute), 'HH:mm');
});

export default function AvailabilityEditor({
  workerId,
  workerName,
  existingRules = [],
  onSave,
  onCancel,
  isSubmitting = false,
}: AvailabilityEditorProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>(
    existingRules.length > 0
      ? existingRules
      : [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isRecurring: true }]
  );
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [errors, setErrors] = useState<string[]>([]);

  // Validation
  const validateRules = useCallback((rulesToValidate: AvailabilityRule[]): string[] => {
    const validationErrors: string[] = [];

    rulesToValidate.forEach((rule, index) => {
      // Check if end time is after start time
      if (rule.startTime >= rule.endTime) {
        validationErrors.push(
          `Rule ${index + 1}: End time must be after start time`
        );
      }

      // Check for overlaps within the same day
      const sameDayRules = rulesToValidate.filter(r => r.dayOfWeek === rule.dayOfWeek);
      sameDayRules.forEach((otherRule, otherIndex) => {
        if (otherRule === rule) return;

        const rule1Start = timeToMinutes(rule.startTime);
        const rule1End = timeToMinutes(rule.endTime);
        const rule2Start = timeToMinutes(otherRule.startTime);
        const rule2End = timeToMinutes(otherRule.endTime);

        if (
          (rule1Start < rule2End && rule1End > rule2Start) ||
          (rule2Start < rule1End && rule2End > rule1Start)
        ) {
          validationErrors.push(
            `Rules overlap on ${DAYS_OF_WEEK.find(d => d.value === rule.dayOfWeek)?.label}: ${rule.startTime}-${rule.endTime} and ${otherRule.startTime}-${otherRule.endTime}`
          );
        }
      });

      // Check expiration date is after effective date
      if (rule.effectiveDate && rule.expirationDate) {
        if (rule.effectiveDate >= rule.expirationDate) {
          validationErrors.push(
            `Rule ${index + 1}: Expiration date must be after effective date`
          );
        }
      }
    });

    // Remove duplicates
    return [...new Set(validationErrors)];
  }, []);

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Add new rule
  const handleAddRule = () => {
    const newRule: AvailabilityRule = {
      dayOfWeek: selectedDay,
      startTime: '09:00',
      endTime: '17:00',
      isRecurring: true,
    };
    setRules([...rules, newRule]);
  };

  // Remove rule
  const handleRemoveRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    setErrors(validateRules(updatedRules));
  };

  // Update rule
  const handleUpdateRule = (index: number, field: keyof AvailabilityRule, value: any) => {
    const updatedRules = rules.map((rule, i) =>
      i === index ? { ...rule, [field]: value } : rule
    );
    setRules(updatedRules);
    setErrors(validateRules(updatedRules));
  };

  // Copy rule to other days
  const handleCopyRule = (index: number) => {
    const ruleToCopy = rules[index];
    const otherDays = DAYS_OF_WEEK.filter(day => day.value !== ruleToCopy.dayOfWeek);

    const newRules = otherDays.map(day => ({
      ...ruleToCopy,
      id: undefined, // New rule, no ID yet
      dayOfWeek: day.value,
    }));

    setRules([...rules, ...newRules]);
  };

  // Copy rule to all weekdays
  const handleCopyToWeekdays = (index: number) => {
    const ruleToCopy = rules[index];
    const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday

    const newRules = weekdays
      .filter(day => day !== ruleToCopy.dayOfWeek)
      .map(day => ({
        ...ruleToCopy,
        id: undefined,
        dayOfWeek: day,
      }));

    setRules([...rules, ...newRules]);
  };

  // Copy rule to all weekend days
  const handleCopyToWeekend = (index: number) => {
    const ruleToCopy = rules[index];
    const weekend = [0, 6]; // Sunday and Saturday

    const newRules = weekend
      .filter(day => day !== ruleToCopy.dayOfWeek)
      .map(day => ({
        ...ruleToCopy,
        id: undefined,
        dayOfWeek: day,
      }));

    setRules([...rules, ...newRules]);
  };

  // Handle save
  const handleSave = async () => {
    const validationErrors = validateRules(rules);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await onSave(rules);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to save availability']);
    }
  };

  // Get rules for selected day
  const selectedDayRules = rules.filter(rule => rule.dayOfWeek === selectedDay);

  // Calculate total hours for selected day
  const calculateTotalHours = (dayRules: AvailabilityRule[]): number => {
    let totalMinutes = 0;
    dayRules.forEach(rule => {
      const start = timeToMinutes(rule.startTime);
      const end = timeToMinutes(rule.endTime);
      totalMinutes += end - start;
    });
    return totalMinutes / 60;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Availability
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {workerName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || errors.length > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-900 mb-2">
                Please fix the following errors:
              </h3>
              <ul className="text-sm text-red-800 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Day Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Day
          </label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map(day => {
              const dayRules = rules.filter(r => r.dayOfWeek === day.value);
              const hasRules = dayRules.length > 0;

              return (
                <button
                  key={day.value}
                  onClick={() => setSelectedDay(day.value)}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    selectedDay === day.value
                      ? 'border-blue-500 bg-blue-50'
                      : hasRules
                      ? 'border-green-200 bg-green-50 hover:border-green-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900">
                    {day.short}
                  </div>
                  {hasRules && (
                    <div className="text-xs text-gray-500 mt-1">
                      {calculateTotalHours(dayRules).toFixed(1)}h
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rules for Selected Day */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label} Availability
              {selectedDayRules.length > 0 && (
                <span className="ml-2 text-gray-500">
                  ({calculateTotalHours(selectedDayRules).toFixed(1)} hours)
                </span>
              )}
            </h3>
            <button
              onClick={handleAddRule}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Time Slot
            </button>
          </div>

          {selectedDayRules.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No availability set for this day</p>
              <button
                onClick={handleAddRule}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Add a time slot
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => {
                if (rule.dayOfWeek !== selectedDay) return null;

                return (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Time Selection */}
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <select
                            value={rule.startTime}
                            onChange={(e) => handleUpdateRule(index, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <select
                            value={rule.endTime}
                            onChange={(e) => handleUpdateRule(index, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleCopyToWeekdays(index)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy to all weekdays"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveRule(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove time slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Copy Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Quick copy:</span>
                      <button
                        onClick={() => handleCopyToWeekdays(index)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        All Weekdays
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleCopyToWeekend(index)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Weekend
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => handleCopyRule(index)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        All Other Days
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total rules:</span>
              <span className="ml-2 font-medium text-gray-900">{rules.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Days with availability:</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Set(rules.map(r => r.dayOfWeek)).size} / 7
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
