/**
 * Date utility functions for calendar components
 */

/**
 * Formats a time string (HH:mm:ss or HH:mm) to display format
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  
  try {
    // Handle both HH:mm:ss and HH:mm formats
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    // Convert to 12-hour format
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

/**
 * Formats a date string to display format
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Formats a date to short format (MMM DD)
 */
export const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Gets the start of the week for a given date (Sunday)
 */
export const getStartOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Gets the end of the week for a given date (Saturday)
 */
export const getEndOfWeek = (date: Date): Date => {
  const result = getStartOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Gets the start of the month for a given date
 */
export const getStartOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Gets the end of the month for a given date
 */
export const getEndOfMonth = (date: Date): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Checks if two dates are the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Gets the week dates for a given date
 */
export const getWeekDates = (date: Date): Date[] => {
  const startOfWeek = getStartOfWeek(date);
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDates.push(day);
  }
  
  return weekDates;
};

/**
 * Gets the month dates for a given date (including dates from previous/next month to fill the grid)
 */
export const getMonthDates = (date: Date): Date[] => {
  const startOfMonth = getStartOfMonth(date);
  const endOfMonth = getEndOfMonth(date);
  const startOfCalendar = getStartOfWeek(startOfMonth);
  const endOfCalendar = getEndOfWeek(endOfMonth);
  
  const dates = [];
  const current = new Date(startOfCalendar);
  
  while (current <= endOfCalendar) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};