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
export const formatShortDate = (date: Date): string => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

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
export const isSameDay = (date1: Date, date2: Date): boolean => date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();

/**
 * Gets all days in a given month
 */
export const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  
  const days: Date[] = [];
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
};

/**
 * Formats a duration in minutes to a human-readable string (e.g., "2h 30m", "45m")
 */
export const formatDuration = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Parses a duration string (e.g., "2h 30m", "45m", "1.5h") to minutes
 */
export const parseDuration = (duration: string): number => {
  if (!duration || duration.trim() === '') return 0;
  
  const trimmed = duration.trim().toLowerCase();
  
  // Handle decimal hours (e.g., "1.5h", "2.25h")
  const decimalHourMatch = trimmed.match(/^(\d+(?:\.\d+)?)h?$/);
  if (decimalHourMatch) {
    return Math.round(parseFloat(decimalHourMatch[1]) * 60);
  }
  
  // Handle hours and minutes (e.g., "2h 30m", "1h", "45m")
  const hourMatch = trimmed.match(/(\d+)h/);
  const minuteMatch = trimmed.match(/(\d+)m/);
  
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;
  
  return hours * 60 + minutes;
};

/**
 * Formats a time slot (start and end time) for display
 */
export const formatTimeSlot = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return '';
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};
