// =============================================================================
// SCHEDULEHUB UTILITIES
// =============================================================================

import { format, parseISO, isAfter, isBefore, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';

// =============================================================================
// TIME AND DATE UTILITIES
// =============================================================================

/**
 * Formats time for display (e.g., "14:30" -> "2:30 PM")
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Formats time range for display
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Calculates shift duration in minutes
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  let endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight shifts
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60; // Add 24 hours
  }
  
  return endTotalMinutes - startTotalMinutes;
}

/**
 * Formats duration in minutes to hours and minutes
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Converts 24-hour time to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to 24-hour time
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Checks if two time ranges overlap
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);
  
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
}

/**
 * Gets current week date range
 */
export function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(now, { weekStartsOn: 1 })
  };
}

/**
 * Gets dates for a week
 */
export function getWeekDates(weekStart: Date): Date[] {
  return eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6)
  });
}

/**
 * Gets time slots for a day (every 30 minutes)
 */
export function generateTimeSlots(startHour = 0, endHour = 24, intervalMinutes = 30): Array<{ time: string; label: string }> {
  const slots = [];
  const totalMinutes = (endHour - startHour) * 60;
  
  for (let minutes = startHour * 60; minutes < startHour * 60 + totalMinutes; minutes += intervalMinutes) {
    const time = minutesToTime(minutes);
    const label = formatTime(time);
    slots.push({ time, label });
  }
  
  return slots;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validates that end time is after start time
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }
  
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // Allow overnight shifts
  return endMinutes > startMinutes || endMinutes < startMinutes;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number (basic)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// =============================================================================
// DATA TRANSFORMATION UTILITIES
// =============================================================================

/**
 * Groups items by a key
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Creates a lookup map from array
 */
export function createLookup<T>(items: T[], keyFn: (item: T) => string): Record<string, T> {
  return items.reduce((lookup, item) => {
    lookup[keyFn(item)] = item;
    return lookup;
  }, {} as Record<string, T>);
}

/**
 * Sorts items by multiple keys
 */
export function sortByKeys<T>(
  items: T[],
  keyFns: Array<(item: T) => any>,
  directions: Array<'asc' | 'desc'> = []
): T[] {
  return [...items].sort((a, b) => {
    for (let i = 0; i < keyFns.length; i++) {
      const aValue = keyFns[i](a);
      const bValue = keyFns[i](b);
      const direction = directions[i] || 'asc';
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Filters items by multiple predicates
 */
export function filterByPredicates<T>(
  items: T[],
  predicates: Array<(item: T) => boolean>
): T[] {
  return items.filter(item => predicates.every(predicate => predicate(item)));
}

// =============================================================================
// SCHEDULING SPECIFIC UTILITIES
// =============================================================================

/**
 * Gets day of week number (1 = Monday, 7 = Sunday)
 */
export function getDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

/**
 * Gets day name from day number
 */
export function getDayName(dayNumber: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNumber] || '';
}

/**
 * Gets short day name from day number
 */
export function getShortDayName(dayNumber: number): string {
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[dayNumber] || '';
}

/**
 * Checks if a date falls within a time-off period
 */
export function isDateInTimeOff(
  date: Date,
  timeOffStart: Date,
  timeOffEnd: Date
): boolean {
  return isWithinInterval(date, { start: timeOffStart, end: timeOffEnd });
}

/**
 * Calculates weekly hours for shifts
 */
export function calculateWeeklyHours(shifts: Array<{ startTime: string; endTime: string }>): number {
  return shifts.reduce((total, shift) => {
    const duration = calculateShiftDuration(shift.startTime, shift.endTime);
    return total + (duration / 60); // Convert to hours
  }, 0);
}

/**
 * Checks if worker exceeds maximum hours
 */
export function exceedsMaxHours(
  currentShifts: Array<{ startTime: string; endTime: string }>,
  newShift: { startTime: string; endTime: string },
  maxHours: number
): boolean {
  const currentHours = calculateWeeklyHours(currentShifts);
  const newShiftHours = calculateShiftDuration(newShift.startTime, newShift.endTime) / 60;
  return currentHours + newShiftHours > maxHours;
}

/**
 * Gets next occurrence of a day
 */
export function getNextDayOccurrence(dayOfWeek: number, fromDate: Date = new Date()): Date {
  const daysToAdd = (dayOfWeek - getDayOfWeek(fromDate) + 7) % 7;
  return addDays(fromDate, daysToAdd === 0 ? 7 : daysToAdd);
}

// =============================================================================
// STATUS AND DISPLAY UTILITIES
// =============================================================================

/**
 * Gets status color class
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'text-green-600',
    inactive: 'text-gray-500',
    pending: 'text-yellow-600',
    approved: 'text-green-600',
    denied: 'text-red-600',
    cancelled: 'text-gray-500',
    draft: 'text-blue-600',
    published: 'text-green-600',
    archived: 'text-gray-500',
    scheduled: 'text-blue-600',
    in_progress: 'text-orange-600',
    completed: 'text-green-600',
    no_show: 'text-red-600'
  };
  
  return statusColors[status] || 'text-gray-500';
}

/**
 * Gets status badge class
 */
export function getStatusBadgeClass(status: string): string {
  const statusClasses: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    draft: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    no_show: 'bg-red-100 text-red-800'
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Capitalizes first letter of each word
 */
export function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncates text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// =============================================================================
// EXPORT ALL UTILITIES
// =============================================================================

export const ScheduleUtils = {
  // Time utilities
  formatTime,
  formatTimeRange,
  calculateShiftDuration,
  formatDuration,
  timeToMinutes,
  minutesToTime,
  timesOverlap,
  getCurrentWeek,
  getWeekDates,
  generateTimeSlots,
  
  // Validation
  isValidTimeFormat,
  isValidTimeRange,
  isValidEmail,
  isValidPhone,
  
  // Data transformation
  groupBy,
  createLookup,
  sortByKeys,
  filterByPredicates,
  
  // Scheduling specific
  getDayOfWeek,
  getDayName,
  getShortDayName,
  isDateInTimeOff,
  calculateWeeklyHours,
  exceedsMaxHours,
  getNextDayOccurrence,
  
  // Display
  getStatusColor,
  getStatusBadgeClass,
  capitalizeWords,
  truncateText
};