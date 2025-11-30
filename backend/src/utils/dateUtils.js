/**
 * Date Utility Functions
 * Centralized date handling with timezone awareness
 * 
 * CRITICAL: This module enforces date handling standards across the codebase
 * - All dates stored in UTC in database
 * - All date operations are timezone-aware
 * - Consistent date formatting across API
 * - DST-safe date arithmetic
 * 
 * @module utils/dateUtils
 */

import { 
  format, 
  parseISO, 
  addDays, 
  addMonths, 
  addYears,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  isEqual,
  differenceInDays,
  differenceInHours,
  differenceInMinutes
} from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import Joi from 'joi';

/**
 * Standard date formats used across the application
 */
export const DateFormats = {
  DATABASE: 'yyyy-MM-dd',              // PostgreSQL DATE columns
  API_DATE: 'yyyy-MM-dd',              // API date-only fields
  API_DATETIME: "yyyy-MM-dd'T'HH:mm:ssXXX", // API timestamp fields (ISO 8601)
  DISPLAY_DATE: 'MMM dd, yyyy',        // User-facing date display
  DISPLAY_DATETIME: 'MMM dd, yyyy h:mm a', // User-facing datetime display
  ISO8601: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"  // Full ISO 8601
};

/**
 * Default timezone (UTC) - used when no timezone specified
 */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Gets current UTC time
 * @returns {Date} Current date/time in UTC
 */
export function nowUTC() {
  return new Date();
}

/**
 * Gets current time in specified timezone
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {Date} Current date/time in specified timezone
 */
export function nowInTimezone(timezone = DEFAULT_TIMEZONE) {
  return toZonedTime(new Date(), timezone);
}

/**
 * Parses date string and converts to UTC Date object
 * Accepts multiple formats:
 * - ISO 8601: "2025-11-27T15:30:00Z"
 * - Date only: "2025-11-27"
 * - Date object
 * 
 * @param {string|Date} dateInput - Date string or Date object
 * @param {string} timezone - Source timezone if date string has no timezone info
 * @returns {Date} Date object in UTC
 * @throws {Error} If date is invalid
 */
export function parseDate(dateInput, timezone = DEFAULT_TIMEZONE) {
  if (!dateInput) {
    throw new Error('Date input is required');
  }

  // Already a Date object
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error('Invalid Date object');
    }
    return dateInput;
  }

  // Parse ISO 8601 string
  if (typeof dateInput === 'string') {
    // Check if it's a date-only string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Date-only: assume start of day in specified timezone
      const zonedDate = toZonedTime(`${dateInput}T00:00:00`, timezone);
      return fromZonedTime(zonedDate, timezone);
    }

    // ISO 8601 with timezone
    const parsed = parseISO(dateInput);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${dateInput}`);
    }
    return parsed;
  }

  throw new Error('Date must be a string or Date object');
}

/**
 * Formats date for database storage (UTC, YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format (UTC)
 */
export function formatForDB(date) {
  const parsed = parseDate(date);
  // Use formatInTimeZone to ensure we format in UTC, not local timezone
  return formatInTimeZone(parsed, 'UTC', DateFormats.DATABASE);
}

/**
 * Formats date for API response (ISO 8601 with timezone)
 * @param {Date|string} date - Date to format
 * @param {string} timezone - Target timezone for display
 * @returns {string} ISO 8601 formatted string
 */
export function formatForAPI(date, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date);
  return formatInTimeZone(parsed, timezone, DateFormats.API_DATETIME);
}

/**
 * Formats date for user display
 * @param {Date|string} date - Date to format
 * @param {string} timezone - User's timezone
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export function formatForDisplay(date, timezone = DEFAULT_TIMEZONE, includeTime = false) {
  const parsed = parseDate(date);
  const formatString = includeTime ? DateFormats.DISPLAY_DATETIME : DateFormats.DISPLAY_DATE;
  return formatInTimeZone(parsed, timezone, formatString);
}

/**
 * Converts date to specific timezone
 * @param {Date|string} date - Date to convert
 * @param {string} timezone - Target timezone
 * @returns {Date} Date in target timezone
 */
export function toTimezone(date, timezone) {
  const parsed = parseDate(date);
  return toZonedTime(parsed, timezone);
}

/**
 * Converts date from specific timezone to UTC
 * @param {Date} date - Date in source timezone
 * @param {string} timezone - Source timezone
 * @returns {Date} Date in UTC
 */
export function fromTimezone(date, timezone) {
  return fromZonedTime(date, timezone);
}

/**
 * Gets start of day in specified timezone
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone
 * @returns {Date} Start of day in UTC
 */
export function startOfDayInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date, timezone);
  const zonedDate = toZonedTime(parsed, timezone);
  const startDate = startOfDay(zonedDate);
  return fromZonedTime(startDate, timezone);
}

/**
 * Gets end of day in specified timezone
 * @param {Date|string} date - Date
 * @param {string} timezone - Timezone
 * @returns {Date} End of day in UTC
 */
export function endOfDayInTimezone(date, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date, timezone);
  const zonedDate = toZonedTime(parsed, timezone);
  const endDate = endOfDay(zonedDate);
  return fromZonedTime(endDate, timezone);
}

/**
 * DST-safe date arithmetic: Add days
 * @param {Date|string} date - Start date
 * @param {number} days - Number of days to add
 * @param {string} timezone - Timezone for calculation
 * @returns {Date} Result date in UTC
 */
export function addDaysInTimezone(date, days, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date, timezone);
  const zonedDate = toZonedTime(parsed, timezone);
  const result = addDays(zonedDate, days);
  return fromZonedTime(result, timezone);
}

/**
 * DST-safe date arithmetic: Add months
 * @param {Date|string} date - Start date
 * @param {number} months - Number of months to add
 * @param {string} timezone - Timezone for calculation
 * @returns {Date} Result date in UTC
 */
export function addMonthsInTimezone(date, months, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date, timezone);
  const zonedDate = toZonedTime(parsed, timezone);
  const result = addMonths(zonedDate, months);
  return fromZonedTime(result, timezone);
}

/**
 * DST-safe date arithmetic: Add years
 * @param {Date|string} date - Start date
 * @param {number} years - Number of years to add
 * @param {string} timezone - Timezone for calculation
 * @returns {Date} Result date in UTC
 */
export function addYearsInTimezone(date, years, timezone = DEFAULT_TIMEZONE) {
  const parsed = parseDate(date, timezone);
  const zonedDate = toZonedTime(parsed, timezone);
  const result = addYears(zonedDate, years);
  return fromZonedTime(result, timezone);
}

/**
 * Safe date comparison: Check if date1 is after date2
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if date1 is after date2
 */
export function isAfterDate(date1, date2) {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);
  return isAfter(parsed1, parsed2);
}

/**
 * Safe date comparison: Check if date1 is before date2
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if date1 is before date2
 */
export function isBeforeDate(date1, date2) {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);
  return isBefore(parsed1, parsed2);
}

/**
 * Safe date comparison: Check if dates are equal
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if dates are equal
 */
export function isEqualDate(date1, date2) {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);
  return isEqual(parsed1, parsed2);
}

/**
 * Calculate difference between dates
 * @param {Date|string} date1 - Start date
 * @param {Date|string} date2 - End date
 * @param {'days'|'hours'|'minutes'} unit - Unit of measurement
 * @returns {number} Difference in specified unit
 */
export function dateDifference(date1, date2, unit = 'days') {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);
  
  switch (unit) {
    case 'days':
      return differenceInDays(parsed2, parsed1);
    case 'hours':
      return differenceInHours(parsed2, parsed1);
    case 'minutes':
      return differenceInMinutes(parsed2, parsed1);
    default:
      throw new Error(`Invalid unit: ${unit}. Use 'days', 'hours', or 'minutes'`);
  }
}

/**
 * Joi validation schema for date-only fields (YYYY-MM-DD or ISO 8601)
 */
export const dateOnlyValidation = Joi.alternatives().try(
  Joi.date().iso(),
  Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
).messages({
  'alternatives.match': 'Date must be in YYYY-MM-DD or ISO 8601 format',
  'string.pattern.base': 'Date must be in YYYY-MM-DD format'
});

/**
 * Joi validation schema for datetime fields (ISO 8601 only)
 */
export const dateTimeValidation = Joi.date().iso().messages({
  'date.format': 'DateTime must be in ISO 8601 format'
});

/**
 * Joi validation schema for future date
 */
export const futureDateValidation = dateOnlyValidation.custom((value, helpers) => {
  const parsed = parseDate(value);
  if (!isAfter(parsed, nowUTC())) {
    return helpers.error('date.future');
  }
  return value;
}).messages({
  'date.future': 'Date must be in the future'
});

/**
 * Joi validation schema for past date
 */
export const pastDateValidation = dateOnlyValidation.custom((value, helpers) => {
  const parsed = parseDate(value);
  if (!isBefore(parsed, nowUTC())) {
    return helpers.error('date.past');
  }
  return value;
}).messages({
  'date.past': 'Date must be in the past'
});

/**
 * Validates and parses date input for API requests
 * @param {string|Date} dateInput - Date from API request
 * @param {string} fieldName - Field name for error messages
 * @param {string} timezone - Timezone for date-only strings
 * @returns {Date} Parsed and validated Date object
 * @throws {ValidationError} If date is invalid
 */
export function validateAndParseDate(dateInput, fieldName = 'date', timezone = DEFAULT_TIMEZONE) {
  if (!dateInput) {
    throw new Error(`${fieldName} is required`);
  }

  try {
    return parseDate(dateInput, timezone);
  } catch (error) {
    throw new Error(`Invalid ${fieldName}: ${error.message}`);
  }
}

/**
 * Creates a timezone-aware date range for database queries
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {string} timezone - Timezone for date boundaries
 * @returns {Object} Object with startUTC and endUTC
 */
export function createDateRange(startDate, endDate, timezone = DEFAULT_TIMEZONE) {
  const startUTC = startOfDayInTimezone(startDate, timezone);
  const endUTC = endOfDayInTimezone(endDate, timezone);
  
  return {
    startUTC,
    endUTC,
    startFormatted: formatForDB(startUTC),
    endFormatted: formatForDB(endUTC)
  };
}

export default {
  DateFormats,
  DEFAULT_TIMEZONE,
  nowUTC,
  nowInTimezone,
  parseDate,
  formatForDB,
  formatForAPI,
  formatForDisplay,
  toTimezone,
  fromTimezone,
  startOfDayInTimezone,
  endOfDayInTimezone,
  addDaysInTimezone,
  addMonthsInTimezone,
  addYearsInTimezone,
  isAfterDate,
  isBeforeDate,
  isEqualDate,
  dateDifference,
  dateOnlyValidation,
  dateTimeValidation,
  futureDateValidation,
  pastDateValidation,
  validateAndParseDate,
  createDateRange
};
