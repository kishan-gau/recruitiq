/**
 * AvailabilityEditor Component
 * 
 * Interactive interface for creating and editing worker availability rules
 * Features drag-and-drop time selection and visual feedback
 */

import { useState, useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { Clock, Plus, Trash2, Copy, Save, AlertCircle } from 'lucide-react';
import type { EmployeeListItem } from '../../../types/employee.types';

interface AvailabilityRule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  availabilityType?: 'recurring' | 'one_time' | 'unavailable';
  specificDate?: string; // For one-time availability
  effectiveDate?: string;
  expirationDate?: string;
  priority?: 'required' | 'preferred' | 'available' | 'unavailable';
  reason?: string;
}

interface AvailabilityEditorProps {
  workerId?: string; // Optional - if provided, it's edit mode
  workerName?: string;
  employees?: EmployeeListItem[]; // List of all employees for selection
  existingRules?: AvailabilityRule[];
  onSave: (rules: AvailabilityRule[], workerIds: string[]) => Promise<void>;
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
  employees = [],
  existingRules = [],
  onSave,
  onCancel,
  isSubmitting = false,
}: AvailabilityEditorProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>(
    existingRules.length > 0
      ? existingRules
      : [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', availabilityType: 'recurring' as const, priority: 'preferred' as const }]
  );
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>(
    workerId ? [workerId] : []
  );
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const isEditMode = !!workerId; // Edit mode if workerId is provided

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
      sameDayRules.forEach((otherRule) => {
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
      availabilityType: 'recurring',
      priority: 'preferred',
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

  // Handle employee selection
  const handleToggleEmployee = (employeeId: string) => {
    if (isEditMode) return; // Can't change in edit mode

    setSelectedWorkerIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (isEditMode) return;
    setSelectedWorkerIds(employees.map(emp => emp.id));
  };

  const handleDeselectAll = () => {
    if (isEditMode) return;
    setSelectedWorkerIds([]);
  };

  // Handle save
  const handleSave = async () => {
    const validationErrors = validateRules(rules);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (selectedWorkerIds.length === 0) {
      setErrors(['Please select at least one employee']);
      return;
    }

    try {
      await onSave(rules, selectedWorkerIds);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isEditMode ? 'Edit Availability' : 'Add Availability'}
            </h2>
            
            {/* Employee Selector */}
            {isEditMode ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {workerName}
              </p>
            ) : (
              <div className="mt-2 relative">
                <button
                  onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                  className="flex items-center justify-between w-full max-w-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedWorkerIds.length === 0
                      ? 'Select employees...'
                      : selectedWorkerIds.length === 1
                      ? employees.find(e => e.id === selectedWorkerIds[0])
                        ? `${employees.find(e => e.id === selectedWorkerIds[0])?.firstName} ${employees.find(e => e.id === selectedWorkerIds[0])?.lastName}`
                        : '1 employee selected'
                      : `${selectedWorkerIds.length} employees selected`}
                  </span>
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {showEmployeeDropdown && (
                  <div className="absolute z-10 mt-1 w-full max-w-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {/* Select All / Deselect All */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {selectedWorkerIds.length} of {employees.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSelectAll}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button
                          onClick={handleDeselectAll}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Employee List */}
                    {employees.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No employees available
                      </div>
                    ) : (
                      <div className="py-1">
                        {employees.map(employee => (
                          <label
                            key={employee.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedWorkerIds.includes(employee.id)}
                              onChange={() => handleToggleEmployee(employee.id)}
                              className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                            />
                            <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                              {employee.firstName} {employee.lastName}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting || errors.length > 0 || selectedWorkerIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                Please fix the following errors:
              </h3>
              <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : hasRules
                      ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {day.short}
                  </div>
                  {hasRules && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label} Availability
              {selectedDayRules.length > 0 && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  ({calculateTotalHours(selectedDayRules).toFixed(1)} hours)
                </span>
              )}
            </h3>
            <button
              onClick={handleAddRule}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Time Slot
            </button>
          </div>

          {selectedDayRules.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No availability set for this day</p>
              <button
                onClick={handleAddRule}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
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
                    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Time Selection */}
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Start Time
                          </label>
                          <select
                            value={rule.startTime}
                            onChange={(e) => handleUpdateRule(index, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            End Time
                          </label>
                          <select
                            value={rule.endTime}
                            onChange={(e) => handleUpdateRule(index, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy to all weekdays"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveRule(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Remove time slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Copy Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Quick copy:</span>
                      <button
                        onClick={() => handleCopyToWeekdays(index)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        All Weekdays
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        onClick={() => handleCopyToWeekend(index)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                      >
                        Weekend
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        onClick={() => handleCopyRule(index)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
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

        {/* Advanced Options */}
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Advanced Options</h4>
          
          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={rules.length > 0 ? (rules[0].priority || 'preferred') : 'preferred'}
              onChange={(e) => {
                const newPriority = e.target.value as 'required' | 'preferred' | 'available' | 'unavailable';
                setRules(rules.map(rule => ({ ...rule, priority: newPriority })));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="required">Required - Must be scheduled during these times</option>
              <option value="preferred">Preferred - Best availability (default)</option>
              <option value="available">Available - Can work if needed</option>
              <option value="unavailable">Unavailable - Cannot work</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Scheduling priority for this availability
            </p>
          </div>

          {/* Reason/Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason / Notes (Optional)
            </label>
            <textarea
              value={rules.length > 0 ? (rules[0].reason || '') : ''}
              onChange={(e) => {
                const newReason = e.target.value;
                setRules(rules.map(rule => ({ ...rule, reason: newReason })));
              }}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="E.g., School schedule, childcare, medical appointment..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional note about this availability (visible to schedulers)
            </p>
          </div>
          
          {/* Recurring Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.length > 0 ? rules[0].availabilityType === 'recurring' : true}
              onChange={(e) => {
                const newRecurring = e.target.checked;
                setRules(rules.map(rule => ({ 
                  ...rule,
                  availabilityType: newRecurring ? 'recurring' : 'one_time'
                })));
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Recurring Weekly</span>
              <p className="text-xs text-gray-500">This schedule repeats every week (uncheck for one-time availability)</p>
            </div>
          </label>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Date (Optional)
              </label>
              <input
                type="date"
                value={rules.length > 0 ? (rules[0].effectiveDate || '') : ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setRules(rules.map(rule => ({ ...rule, effectiveDate: newDate })));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Start date"
              />
              <p className="mt-1 text-xs text-gray-500">When this availability starts</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={rules.length > 0 ? (rules[0].expirationDate || '') : ''}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setRules(rules.map(rule => ({ ...rule, expirationDate: newDate })));
                }}
                min={rules.length > 0 ? rules[0].effectiveDate : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="End date"
              />
              <p className="mt-1 text-xs text-gray-500">When this availability ends</p>
            </div>
          </div>
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
