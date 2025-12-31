/**
 * Time and Duration Formatting Utilities
 */

/**
 * Format a time string or Date object for display
 * @param time - Time in HH:MM format or Date object
 * @param use12Hour - Use 12-hour format (default: false)
 * @returns Formatted time string
 */
export function formatTime(time: string | Date, use12Hour = false): string {
  if (time instanceof Date) {
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: use12Hour 
    });
  }
  
  // If it's already a string in HH:MM format, return as is or convert to 12-hour
  if (typeof time === 'string') {
    if (use12Hour) {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return time;
  }
  
  return '';
}

/**
 * Format a duration in minutes to a readable string
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "2h 30m", "45m", "8h")
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Format a time slot for display
 * @param startTime - Start time (HH:MM format or Date)
 * @param endTime - End time (HH:MM format or Date)
 * @returns Formatted string (e.g., "09:00 - 17:00")
 */
export function formatTimeSlot(startTime: string | Date, endTime: string | Date): string {
  const formatTime = (time: string | Date): string => {
    if (time instanceof Date) {
      return time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    return time;
  };
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Parse time string to minutes since midnight
 * @param timeString - Time in HH:MM format
 * @returns Minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string
 * @param minutes - Minutes since midnight
 * @returns Time string in HH:MM format
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
