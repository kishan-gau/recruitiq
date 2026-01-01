/**
 * Timezone Utility Module
 * 
 * Centralized timezone handling for the entire application.
 * All dates are stored in UTC in the database and converted to user's timezone for display.
 * 
 * Architecture:
 * - Database: All TIMESTAMPTZ columns store UTC
 * - Backend: All date operations use UTC, conversion happens at API boundaries
 * - Frontend: Dates displayed in user's timezone using date-fns-tz
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default timezone (UTC)
 */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Common timezone formats
 */
export const TIMEZONE_FORMATS = {
  ISO8601: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  ISO8601_DATE: 'yyyy-MM-dd',
  ISO8601_TIME: 'HH:mm:ss',
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a',
  DISPLAY_DATE: 'MMM dd, yyyy',
  DISPLAY_TIME: 'h:mm a',
  DATABASE: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", // Always UTC for database
};

/**
 * Supported timezones (can be extended)
 */
export const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean} True if valid
 */
export function isValidTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }
  
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate if a timezone is in our supported list
 * @param {string} timezone - IANA timezone identifier
 * @returns {boolean} True if supported
 */
export function isSupportedTimezone(timezone) {
  return SUPPORTED_TIMEZONES.includes(timezone);
}

/**
 * Get a valid timezone or return default
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Valid timezone
 */
export function getValidTimezone(timezone) {
  if (isValidTimezone(timezone)) {
    return timezone;
  }
  return DEFAULT_TIMEZONE;
}

// ============================================================================
// UTC CONVERSION (Core Functions)
// ============================================================================

/**
 * Convert any date input to UTC Date object
 * This is the primary function for storing dates in the database
 * 
 * @param {Date|string|number} date - Input date
 * @param {string} [sourceTimezone] - Source timezone (if converting from local)
 * @returns {Date} UTC Date object
 */
export function toUTC(date, sourceTimezone = DEFAULT_TIMEZONE) {
  if (!date) {
    throw new Error('Date is required for UTC conversion');
  }

  let dateObj;
  
  // Parse string dates
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    throw new Error('Invalid date format');
  }

  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }

  // If source timezone is not UTC, convert from that timezone to UTC
  if (sourceTimezone !== DEFAULT_TIMEZONE) {
    return fromZonedTime(dateObj, sourceTimezone);
  }

  return dateObj;
}

/**
 * Convert UTC date to a specific timezone
 * Used for display purposes
 * 
 * @param {Date|string} utcDate - UTC date
 * @param {string} targetTimezone - Target timezone
 * @returns {Date} Date in target timezone
 */
export function fromUTC(utcDate, targetTimezone = DEFAULT_TIMEZONE) {
  if (!utcDate) {
    throw new Error('UTC date is required');
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  
  if (!isValid(dateObj)) {
    throw new Error('Invalid UTC date provided');
  }

  const validTimezone = getValidTimezone(targetTimezone);
  return toZonedTime(dateObj, validTimezone);
}

/**
 * Get current UTC timestamp
 * Use this instead of new Date() for consistency
 * 
 * @returns {Date} Current UTC date
 */
export function nowUTC() {
  return new Date();
}

/**
 * Get current date in a specific timezone
 * 
 * @param {string} timezone - Target timezone
 * @returns {Date} Current date in timezone
 */
export function nowInTimezone(timezone = DEFAULT_TIMEZONE) {
  return fromUTC(nowUTC(), timezone);
}

// ============================================================================
// DATE-ONLY OPERATIONS
// ============================================================================

/**
 * Convert a date to date-only string in UTC (YYYY-MM-DD)
 * Use for database DATE columns
 * 
 * @param {Date|string} date - Input date
 * @param {string} [sourceTimezone] - Source timezone
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function toUTCDateString(date, sourceTimezone = DEFAULT_TIMEZONE) {
  const utcDate = toUTC(date, sourceTimezone);
  return format(utcDate, TIMEZONE_FORMATS.ISO8601_DATE);
}

/**
 * Convert a date to date-only string in a specific timezone
 * Use for display purposes
 * 
 * @param {Date|string} utcDate - UTC date
 * @param {string} targetTimezone - Target timezone
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function toDateStringInTimezone(utcDate, targetTimezone = DEFAULT_TIMEZONE) {
  if (!utcDate) {
    throw new Error('Date is required');
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  const validTimezone = getValidTimezone(targetTimezone);
  
  return formatInTimeZone(dateObj, validTimezone, TIMEZONE_FORMATS.ISO8601_DATE);
}

/**
 * Parse a date-only string (YYYY-MM-DD) as start of day in timezone
 * 
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {string} timezone - Timezone for start of day
 * @returns {Date} UTC Date at start of day in timezone
 */
export function parseDateInTimezone(dateString, timezone = DEFAULT_TIMEZONE) {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  // Parse as local date in the timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  
  return fromZonedTime(localDate, timezone);
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format UTC date for database storage
 * Always returns ISO8601 UTC string
 * 
 * @param {Date|string} date - Input date
 * @returns {string} ISO8601 UTC string
 */
export function formatForDatabase(date) {
  const utcDate = toUTC(date);
  return utcDate.toISOString();
}

/**
 * Format UTC date for display in a specific timezone
 * 
 * @param {Date|string} utcDate - UTC date
 * @param {string} timezone - Display timezone
 * @param {string} [formatString] - Format pattern
 * @returns {string} Formatted date string
 */
export function formatInTimezone(utcDate, timezone = DEFAULT_TIMEZONE, formatString = TIMEZONE_FORMATS.DISPLAY_DATETIME) {
  if (!utcDate) {
    return '';
  }

  const dateObj = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  
  if (!isValid(dateObj)) {
    return '';
  }

  const validTimezone = getValidTimezone(timezone);
  return formatInTimeZone(dateObj, validTimezone, formatString);
}

/**
 * Format date for API response
 * Returns ISO8601 string with timezone information
 * 
 * @param {Date|string} date - Input date
 * @param {string} [timezone] - Optional timezone context
 * @returns {object} Date response object
 */
export function formatForAPI(date, timezone = DEFAULT_TIMEZONE) {
  if (!date) {
    return null;
  }

  const utcDate = toUTC(date);
  const validTimezone = getValidTimezone(timezone);
  
  return {
    utc: utcDate.toISOString(),
    timezone: validTimezone,
    local: formatInTimeZone(utcDate, validTimezone, TIMEZONE_FORMATS.ISO8601),
    timestamp: utcDate.getTime(),
  };
}

// ============================================================================
// DATE RANGE OPERATIONS
// ============================================================================

/**
 * Get start of day in a specific timezone (as UTC)
 * 
 * @param {Date|string} date - Input date
 * @param {string} timezone - Timezone
 * @returns {Date} UTC date at start of day in timezone
 */
export function startOfDayInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(dateObj, timezone);
  
  zonedDate.setHours(0, 0, 0, 0);
  
  return fromZonedTime(zonedDate, timezone);
}

/**
 * Get end of day in a specific timezone (as UTC)
 * 
 * @param {Date|string} date - Input date
 * @param {string} timezone - Timezone
 * @returns {Date} UTC date at end of day in timezone
 */
export function endOfDayInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const zonedDate = toZonedTime(dateObj, timezone);
  
  zonedDate.setHours(23, 59, 59, 999);
  
  return fromZonedTime(zonedDate, timezone);
}

/**
 * Get date range for a day in a specific timezone
 * 
 * @param {Date|string} date - Input date
 * @param {string} timezone - Timezone
 * @returns {object} Start and end dates in UTC
 */
export function getDayRangeInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  return {
    start: startOfDayInTimezone(date, timezone),
    end: endOfDayInTimezone(date, timezone),
  };
}

// ============================================================================
// TIME CALCULATIONS
// ============================================================================

/**
 * Calculate hours between two dates
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Hours between dates
 */
export function calculateHours(startDate, endDate) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  const milliseconds = end.getTime() - start.getTime();
  return milliseconds / (1000 * 60 * 60);
}

/**
 * Calculate business days between two dates
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} timezone - Timezone for day boundaries
 * @returns {number} Number of business days
 */
export function calculateBusinessDays(startDate, endDate, timezone = DEFAULT_TIMEZONE) {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= end) {
    const zonedDate = toZonedTime(current, timezone);
    const dayOfWeek = zonedDate.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

// ============================================================================
// TIMEZONE INFORMATION
// ============================================================================

/**
 * Get timezone offset in minutes
 * 
 * @param {string} timezone - IANA timezone
 * @param {Date} [date] - Reference date (for DST)
 * @returns {number} Offset in minutes
 */
export function getTimezoneOffset(timezone, date = nowUTC()) {
  const validTimezone = getValidTimezone(timezone);
  const zonedDate = toZonedTime(date, validTimezone);
  
  return -zonedDate.getTimezoneOffset();
}

/**
 * Get timezone abbreviation (e.g., PST, EST)
 * 
 * @param {string} timezone - IANA timezone
 * @param {Date} [date] - Reference date
 * @returns {string} Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone, date = nowUTC()) {
  const validTimezone = getValidTimezone(timezone);
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: validTimezone,
    timeZoneName: 'short',
  }).formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value || timezone;
}

/**
 * Get detailed timezone information
 * 
 * @param {string} timezone - IANA timezone
 * @returns {object} Timezone details
 */
export function getTimezoneInfo(timezone) {
  const validTimezone = getValidTimezone(timezone);
  const now = nowUTC();
  
  return {
    timezone: validTimezone,
    offset: getTimezoneOffset(validTimezone, now),
    abbreviation: getTimezoneAbbreviation(validTimezone, now),
    currentTime: formatInTimezone(now, validTimezone),
    isDST: isDaylightSavingTime(validTimezone, now),
  };
}

/**
 * Check if date is in daylight saving time
 * 
 * @param {string} timezone - IANA timezone
 * @param {Date} [date] - Reference date
 * @returns {boolean} True if DST is active
 */
export function isDaylightSavingTime(timezone, date = nowUTC()) {
  const validTimezone = getValidTimezone(timezone);
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  const janOffset = getTimezoneOffset(validTimezone, jan);
  const julOffset = getTimezoneOffset(validTimezone, jul);
  const currentOffset = getTimezoneOffset(validTimezone, date);
  
  return currentOffset !== Math.max(janOffset, julOffset);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  DEFAULT_TIMEZONE,
  TIMEZONE_FORMATS,
  SUPPORTED_TIMEZONES,
  
  // Validation
  isValidTimezone,
  isSupportedTimezone,
  getValidTimezone,
  
  // Core conversion
  toUTC,
  fromUTC,
  nowUTC,
  nowInTimezone,
  
  // Date-only operations
  toUTCDateString,
  toDateStringInTimezone,
  parseDateInTimezone,
  
  // Formatting
  formatForDatabase,
  formatInTimezone,
  formatForAPI,
  
  // Date ranges
  startOfDayInTimezone,
  endOfDayInTimezone,
  getDayRangeInTimezone,
  
  // Calculations
  calculateHours,
  calculateBusinessDays,
  
  // Timezone info
  getTimezoneOffset,
  getTimezoneAbbreviation,
  getTimezoneInfo,
  isDaylightSavingTime,
};
