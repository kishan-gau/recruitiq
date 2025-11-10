/**
 * useTimezone Hook
 * 
 * React hook for timezone-aware date handling
 * Provides timezone context and formatting utilities
 */

import { useMemo, useCallback } from 'react';
import { 
  formatDate, 
  formatDateTime, 
  formatTime,
  formatDateOnly,
  toUTC,
  getBrowserTimezone,
  getUserTimezone,
  getRelativeTime,
  toDateString,
  type UserWithTimezone,
  type OrganizationWithTimezone,
  type DateInput
} from '../timezone';

/**
 * Hook for timezone-aware date operations
 * 
 * @param {object} user - User object with timezone preference
 * @param {object} organization - Organization object with timezone
 * @returns {object} Timezone utilities and context
 */
export function useTimezone(user?: UserWithTimezone | null, organization?: OrganizationWithTimezone | null) {
  // Get effective timezone
  const timezone = useMemo(() => 
    getUserTimezone(user ?? undefined, organization ?? undefined),
    [user?.timezone, organization?.timezone]
  );

  // Memoized formatting functions
  const formatters = useMemo(() => ({
    /**
     * Format UTC date as date only
     * @param {string|Date} utcDate - UTC date
     * @returns {string} Formatted date (e.g., "Nov 07, 2025")
     */
    date: (utcDate: DateInput) => formatDate(utcDate, timezone),
    
    /**
     * Format UTC date as date and time
     * @param {string|Date} utcDate - UTC date
     * @returns {string} Formatted datetime (e.g., "Nov 07, 2025 10:30 AM")
     */
    dateTime: (utcDate: DateInput) => formatDateTime(utcDate, timezone),
    
    /**
     * Format UTC date as time only
     * @param {string|Date} utcDate - UTC date
     * @returns {string} Formatted time (e.g., "10:30 AM")
     */
    time: (utcDate: DateInput) => formatTime(utcDate, timezone),
    
    /**
     * Format date-only field (no timezone conversion)
     * Use for hire_date, birth_date, etc.
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {string} Formatted date
     */
    dateOnly: (dateString: string | null | undefined) => formatDateOnly(dateString),
    
    /**
     * Get relative time string
     * @param {string|Date} date - Date to compare
     * @returns {string} Relative time (e.g., "2 hours ago")
     */
    relative: (date: DateInput) => getRelativeTime(date),
  }), [timezone]);

  /**
   * Convert local date to UTC for API submission
   */
  const toUTCCallback = useCallback((localDate: DateInput) => {
    return toUTC(localDate, timezone);
  }, [timezone]);

  /**
   * Convert Date object to YYYY-MM-DD string
   */
  const toDateStringCallback = useCallback((date: DateInput) => {
    return toDateString(date);
  }, []);

  return {
    timezone,
    format: formatters,
    toUTC: toUTCCallback,
    toDateString: toDateStringCallback,
  };
}

/**
 * Hook for date formatting with custom timezone
 * Useful when you need to format in a specific timezone
 * 
 * @param {string} timezone - IANA timezone identifier
 * @returns {object} Formatting utilities
 */
export function useTimezoneFormat(timezone: string = getBrowserTimezone()) {
  const formatters = useMemo(() => ({
    date: (utcDate: DateInput) => formatDate(utcDate, timezone),
    dateTime: (utcDate: DateInput) => formatDateTime(utcDate, timezone),
    time: (utcDate: DateInput) => formatTime(utcDate, timezone),
    dateOnly: (dateString: string | null | undefined) => formatDateOnly(dateString),
    relative: (date: DateInput) => getRelativeTime(date),
  }), [timezone]);

  return formatters;
}

export default useTimezone;
