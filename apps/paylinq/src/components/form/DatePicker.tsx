/**
 * DatePicker Component
 * 
 * Reusable date picker with:
 * - Single date selection
 * - Date range selection
 * - Min/max date constraints
 * - Disabled dates
 * - Custom formatting
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek, isAfter, isBefore } from 'date-fns';
import clsx from 'clsx';

export interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  className?: string;
}

export interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onChange: (startDate: Date | null, endDate: Date | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  error,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  disabledDates = [],
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange(date);
    setIsOpen(false);
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    if (disabledDates.some(d => isSameDay(d, date))) return true;
    return false;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'w-full px-3 py-2 pr-10 text-left border rounded-lg transition-colors',
            'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400',
            error ? 'border-red-300' : 'border-gray-300'
          )}
        >
          {value ? format(value, 'MMM dd, yyyy') : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <Calendar className={clsx('w-4 h-4', disabled ? 'text-gray-300' : 'text-gray-400')} />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-sm font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = value && isSameDay(day, value);
              const isToday = isSameDay(day, new Date());
              const disabled = isDateDisabled(day);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={disabled}
                  className={clsx(
                    'w-8 h-8 rounded text-sm transition-colors',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !disabled && 'text-gray-700 hover:bg-gray-100',
                    isSelected && 'bg-blue-600 text-white hover:bg-blue-700',
                    isToday && !isSelected && 'border border-blue-600',
                    disabled && 'text-gray-300 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleDateClick(new Date())}
              className="w-full py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  label,
  placeholder = 'Select date range',
  error,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startDate || new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (selectingStart || !startDate) {
      onChange(date, null);
      setSelectingStart(false);
    } else {
      if (isBefore(date, startDate)) {
        onChange(date, startDate);
      } else {
        onChange(startDate, date);
      }
      setIsOpen(false);
      setSelectingStart(true);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return isWithinInterval(date, { start: startDate, end: endDate });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    setSelectingStart(true);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const formatDateRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
    } else if (startDate) {
      return format(startDate, 'MMM dd, yyyy');
    }
    return null;
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            'w-full px-3 py-2 pr-10 text-left border rounded-lg transition-colors',
            'focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400',
            error ? 'border-red-300' : 'border-gray-300'
          )}
        >
          {formatDateRange() || (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {(startDate || endDate) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <Calendar className={clsx('w-4 h-4', disabled ? 'text-gray-300' : 'text-gray-400')} />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Calendar Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[280px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="text-sm font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Selection Status */}
          <div className="mb-3 text-xs text-gray-500 text-center">
            {selectingStart ? 'Select start date' : 'Select end date'}
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isStart = startDate && isSameDay(day, startDate);
              const isEnd = endDate && isSameDay(day, endDate);
              const inRange = isDateInRange(day);
              const isToday = isSameDay(day, new Date());
              const disabled = isDateDisabled(day);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={disabled}
                  className={clsx(
                    'w-8 h-8 rounded text-sm transition-colors',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isStart && !isEnd && !inRange && !disabled && 'text-gray-700 hover:bg-gray-100',
                    (isStart || isEnd) && 'bg-blue-600 text-white hover:bg-blue-700',
                    inRange && !isStart && !isEnd && 'bg-blue-100 text-blue-900',
                    isToday && !isStart && !isEnd && 'border border-blue-600',
                    disabled && 'text-gray-300 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 pt-3 border-t border-gray-200 flex space-x-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-1.5 text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(today, today);
                setIsOpen(false);
                setSelectingStart(true);
              }}
              className="flex-1 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

