/**
 * Timezone Utility for Frontend Applications
 * 
 * Lightweight timezone handling for React applications
 * Uses date-fns-tz for timezone conversions
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface UserWithTimezone {
  timezone?: string;
}

export interface OrganizationWithTimezone {
  timezone?: string;
}

export type DateInput = string | Date | null | undefined;

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_TIMEZONE = 'UTC';

export const TIMEZONE_FORMATS = {
  ISO8601: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  ISO8601_DATE: 'yyyy-MM-dd',
  ISO8601_TIME: 'HH:mm:ss',
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a',
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_TIME: 'h:mm a',
  DISPLAY_DATE_SHORT: 'MM/dd/yyyy',
  DISPLAY_DATETIME_SHORT: 'MM/dd/yyyy h:mm a',
};

export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
];

// ============================================================================
// BROWSER TIMEZONE DETECTION
// ============================================================================

/**
 * Get the user's browser timezone
 * @returns {string} IANA timezone identifier
 */
export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Get timezone from user context or browser
 * @param {object} user - User object with timezone preference
 * @param {object} organization - Organization object with timezone
 * @returns {string} IANA timezone identifier
 */
export function getUserTimezone(user?: UserWithTimezone, organization?: OrganizationWithTimezone): string {
  return user?.timezone || organization?.timezone || getBrowserTimezone();
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean} True if valid
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// DATE PARSING
// ============================================================================

/**
 * Parse ISO date string safely
 * @param {string|Date} date - Date string or Date object
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(date: DateInput): Date | null {
  if (!date) return null;
  
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }
  
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    return isValid(parsed) ? parsed : null;
  }
  
  return null;
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format UTC date in user's timezone
 * @param {string|Date} utcDate - UTC date
 * @param {string} timezone - Target timezone
 * @param {string} formatString - Format pattern
 * @returns {string} Formatted date string
 */
export function formatInTimezone(
  utcDate: DateInput,
  timezone: string = DEFAULT_TIMEZONE,
  formatString: string = TIMEZONE_FORMATS.DISPLAY_DATETIME
): string {
  if (!utcDate) return '';
  
  const date = parseDate(utcDate);
  if (!date) return '';
  
  try {
    return formatInTimeZone(date, timezone, formatString);
  } catch {
    return format(date, formatString);
  }
}

/**
 * Format date for display (uses user's timezone)
 * @param {string|Date} utcDate - UTC date
 * @param {string} timezone - User's timezone
 * @param {string} formatString - Format pattern
 * @returns {string} Formatted date string
 */
export function formatDate(
  utcDate: DateInput,
  timezone: string = getBrowserTimezone(),
  formatString: string = TIMEZONE_FORMATS.DISPLAY_DATE
): string {
  return formatInTimezone(utcDate, timezone, formatString);
}

/**
 * Format datetime for display (uses user's timezone)
 * @param {string|Date} utcDate - UTC date
 * @param {string} timezone - User's timezone
 * @param {string} formatString - Format pattern
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(
  utcDate: DateInput,
  timezone: string = getBrowserTimezone(),
  formatString: string = TIMEZONE_FORMATS.DISPLAY_DATETIME
): string {
  return formatInTimezone(utcDate, timezone, formatString);
}

/**
 * Format time for display (uses user's timezone)
 * @param {string|Date} utcDate - UTC date
 * @param {string} timezone - User's timezone
 * @returns {string} Formatted time string
 */
export function formatTime(
  utcDate: DateInput,
  timezone: string = getBrowserTimezone()
): string {
  return formatInTimezone(utcDate, timezone, TIMEZONE_FORMATS.DISPLAY_TIME);
}

// ============================================================================
// DATE CONVERSION
// ============================================================================

/**
 * Convert local date input to UTC for API submission
 * @param {Date|string} localDate - Local date
 * @param {string} timezone - Source timezone
 * @returns {string} ISO8601 UTC string
 */
export function toUTC(localDate: DateInput, timezone: string = getBrowserTimezone()): string | null {
  if (!localDate) return null;
  
  const date = parseDate(localDate);
  if (!date) return null;
  
  try {
    const utcDate = fromZonedTime(date, timezone);
    return utcDate.toISOString();
  } catch {
    return date.toISOString();
  }
}

/**
 * Convert UTC date to local timezone
 * @param {string|Date} utcDate - UTC date
 * @param {string} timezone - Target timezone
 * @returns {Date} Date in target timezone
 */
export function toLocal(utcDate: DateInput, timezone: string = getBrowserTimezone()): Date | null {
  if (!utcDate) return null;
  
  const date = parseDate(utcDate);
  if (!date) return null;
  
  try {
    return toZonedTime(date, timezone);
  } catch {
    return date;
  }
}

// ============================================================================
// DATE-ONLY OPERATIONS (for date fields without time)
// ============================================================================

/**
 * Format date-only field (no timezone conversion)
 * Use for fields like hire_date, birth_date that are date-only
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} formatString - Format pattern
 * @returns {string} Formatted date string
 */
export function formatDateOnly(
  dateString: string | null | undefined,
  formatString: string = TIMEZONE_FORMATS.DISPLAY_DATE
): string {
  if (!dateString) return '';
  
  try {
    // Parse as local date (no timezone conversion)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (!isValid(date)) return dateString;
    
    return format(date, formatString);
  } catch {
    return dateString;
  }
}

/**
 * Convert Date object to date-only string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function toDateString(date: DateInput): string {
  if (!date) return '';
  
  const dateObj = parseDate(date);
  if (!dateObj) return '';
  
  return format(dateObj, TIMEZONE_FORMATS.ISO8601_DATE);
}

// ============================================================================
// RELATIVE TIME
// ============================================================================

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} date - Date to compare
 * @param {string|Date} baseDate - Base date for comparison (default: now)
 * @returns {string} Relative time string
 */
export function getRelativeTime(date: DateInput, baseDate: DateInput = new Date()): string {
  const dateObj = parseDate(date);
  const baseObj = parseDate(baseDate);
  
  if (!dateObj || !baseObj) return '';
  
  const diffMs = baseObj.getTime() - dateObj.getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
  const diffDays = Math.floor(Math.abs(diffMs) / 86400000);
  
  const isPast = diffMs > 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${prefix}${diffMins} minute${diffMins > 1 ? 's' : ''}${suffix}`;
  if (diffHours < 24) return `${prefix}${diffHours} hour${diffHours > 1 ? 's' : ''}${suffix}`;
  if (diffDays < 7) return `${prefix}${diffDays} day${diffDays > 1 ? 's' : ''}${suffix}`;
  if (diffDays < 30) return `${prefix}${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}${suffix}`;
  if (diffDays < 365) return `${prefix}${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''}${suffix}`;
  
  return `${prefix}${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''}${suffix}`;
}

// ============================================================================
// TIMEZONE INFO
// ============================================================================

/**
 * Get timezone abbreviation (e.g., PST, EST, UTC)
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Reference date (for DST)
 * @returns {string} Timezone abbreviation
 */
export function getTimezoneAbbr(timezone = getBrowserTimezone(), date = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date)
      .find(part => part.type === 'timeZoneName')?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get timezone offset string (e.g., "+05:30", "-08:00")
 * @param {string} timezone - IANA timezone identifier
 * @param {Date} date - Reference date (for DST)
 * @returns {string} Offset string
 */
export function getTimezoneOffset(timezone = getBrowserTimezone(), date = new Date()) {
  try {
    const formatted = formatInTimeZone(date, timezone, 'xxx');
    return formatted;
  } catch {
    return '+00:00';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  DEFAULT_TIMEZONE,
  TIMEZONE_FORMATS,
  COMMON_TIMEZONES,
  
  // Detection
  getBrowserTimezone,
  getUserTimezone,
  
  // Validation
  isValidTimezone,
  
  // Parsing
  parseDate,
  
  // Formatting
  formatInTimezone,
  formatDate,
  formatDateTime,
  formatTime,
  formatDateOnly,
  toDateString,
  
  // Conversion
  toUTC,
  toLocal,
  
  // Relative time
  getRelativeTime,
  
  // Timezone info
  getTimezoneAbbr,
  getTimezoneOffset,
};
