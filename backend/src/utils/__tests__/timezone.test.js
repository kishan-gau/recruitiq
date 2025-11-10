/**
 * Timezone Utility Tests
 * 
 * Tests for timezone conversion and formatting
 */

import {
  nowUTC,
  toUTC,
  fromUTC,
  toUTCDateString,
  toDateStringInTimezone,
  parseDateInTimezone,
  formatForDatabase,
  formatInTimezone,
  calculateHours,
  startOfDayInTimezone,
  endOfDayInTimezone,
  isValidTimezone,
  DEFAULT_TIMEZONE,
  TIMEZONE_FORMATS
} from '../timezone.js';

describe('Timezone Utilities', () => {
  describe('Core Functions', () => {
    it('nowUTC should return current UTC date', () => {
      const now = nowUTC();
      expect(now).toBeInstanceOf(Date);
      expect(now.toISOString()).toMatch(/Z$/);
    });

    it('toUTC should convert local date to UTC', () => {
      const localDate = new Date('2025-11-07T10:00:00');
      const utcDate = toUTC(localDate, 'America/New_York');
      
      expect(utcDate).toBeInstanceOf(Date);
      // EST is UTC-5, so 10:00 EST = 15:00 UTC
      expect(utcDate.getUTCHours()).toBe(15);
    });

    it('fromUTC should convert UTC to local timezone', () => {
      const utcDate = new Date('2025-11-07T15:00:00Z');
      const localDate = fromUTC(utcDate, 'America/New_York');
      
      expect(localDate).toBeInstanceOf(Date);
    });

    it('should handle string dates', () => {
      const dateString = '2025-11-07T10:00:00Z';
      const utcDate = toUTC(dateString);
      
      expect(utcDate).toBeInstanceOf(Date);
      expect(utcDate.toISOString()).toBe(dateString);
    });
  });

  describe('Date-Only Operations', () => {
    it('toUTCDateString should format as YYYY-MM-DD', () => {
      const date = new Date('2025-11-07T10:30:00Z');
      const dateString = toUTCDateString(date);
      
      expect(dateString).toBe('2025-11-07');
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('toDateStringInTimezone should respect timezone', () => {
      // 11:00 PM on Nov 6 in UTC is Nov 6
      const utcDate = new Date('2025-11-06T23:00:00Z');
      
      // In Pacific (UTC-8), it's still Nov 6 (3:00 PM)
      const pacificDate = toDateStringInTimezone(utcDate, 'America/Los_Angeles');
      expect(pacificDate).toBe('2025-11-06');
      
      // In Tokyo (UTC+9), it's Nov 7 (8:00 AM)
      const tokyoDate = toDateStringInTimezone(utcDate, 'Asia/Tokyo');
      expect(tokyoDate).toBe('2025-11-07');
    });

    it('parseDateInTimezone should parse date in timezone', () => {
      const dateString = '2025-11-07';
      const utcDate = parseDateInTimezone(dateString, 'America/New_York');
      
      expect(utcDate).toBeInstanceOf(Date);
      // Start of day in EST should be 05:00 UTC (EST is UTC-5)
      expect(utcDate.getUTCHours()).toBe(5);
    });
  });

  describe('Formatting', () => {
    it('formatForDatabase should return ISO string', () => {
      const date = new Date('2025-11-07T10:30:00Z');
      const formatted = formatForDatabase(date);
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('formatInTimezone should format in specific timezone', () => {
      const utcDate = new Date('2025-11-07T15:00:00Z');
      
      // Format in Eastern time (10:00 AM)
      const eastern = formatInTimezone(
        utcDate,
        'America/New_York',
        TIMEZONE_FORMATS.DISPLAY_DATETIME
      );
      
      expect(eastern).toContain('10:00 AM');
    });
  });

  describe('Date Range Operations', () => {
    it('startOfDayInTimezone should get start of day', () => {
      const date = new Date('2025-11-07T15:00:00Z');
      const start = startOfDayInTimezone(date, 'America/New_York');
      
      // Start of day in EST (00:00 EST = 05:00 UTC)
      expect(start.getUTCHours()).toBe(5);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
    });

    it('endOfDayInTimezone should get end of day', () => {
      const date = new Date('2025-11-07T15:00:00Z');
      const end = endOfDayInTimezone(date, 'America/New_York');
      
      // End of day in EST (23:59:59.999 EST = 04:59:59.999 UTC next day)
      expect(end.getUTCHours()).toBe(4);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
    });
  });

  describe('Time Calculations', () => {
    it('calculateHours should calculate difference', () => {
      const start = new Date('2025-11-07T10:00:00Z');
      const end = new Date('2025-11-07T18:00:00Z');
      
      const hours = calculateHours(start, end);
      expect(hours).toBe(8);
    });

    it('should handle string dates in calculations', () => {
      const start = '2025-11-07T10:00:00Z';
      const end = '2025-11-07T18:00:00Z';
      
      const hours = calculateHours(start, end);
      expect(hours).toBe(8);
    });
  });

  describe('Validation', () => {
    it('isValidTimezone should validate timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone(null)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null dates gracefully', () => {
      expect(() => toUTC(null)).toThrow();
      expect(() => fromUTC(null)).toThrow();
    });

    it('should handle invalid date strings', () => {
      expect(() => toUTC('invalid-date')).toThrow();
    });

    it('should handle timezone crossing midnight', () => {
      // 11 PM UTC on Nov 6
      const date = new Date('2025-11-06T23:00:00Z');
      
      // In Tokyo (UTC+9), it's 8 AM on Nov 7
      const tokyoDate = toDateStringInTimezone(date, 'Asia/Tokyo');
      expect(tokyoDate).toBe('2025-11-07');
      
      // In Pacific (UTC-8), it's 3 PM on Nov 6
      const pacificDate = toDateStringInTimezone(date, 'America/Los_Angeles');
      expect(pacificDate).toBe('2025-11-06');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle clock-in/out scenario', () => {
      // Employee clocks in at 9 AM EST
      const clockIn = parseDateInTimezone('2025-11-07', 'America/New_York');
      clockIn.setHours(9, 0, 0, 0);
      
      // Employee clocks out at 5 PM EST
      const clockOut = new Date(clockIn);
      clockOut.setHours(17, 0, 0, 0);
      
      // Calculate worked hours
      const hours = calculateHours(clockIn, clockOut);
      expect(hours).toBe(8);
      
      // Format for database (UTC)
      const clockInUTC = formatForDatabase(clockIn);
      const clockOutUTC = formatForDatabase(clockOut);
      
      expect(clockInUTC).toMatch(/Z$/);
      expect(clockOutUTC).toMatch(/Z$/);
    });

    it('should handle payroll period boundaries', () => {
      // Payroll period: Nov 1 - Nov 15 in organization timezone
      const orgTimezone = 'America/New_York';
      
      const periodStart = parseDateInTimezone('2025-11-01', orgTimezone);
      const periodEnd = parseDateInTimezone('2025-11-15', orgTimezone);
      
      // Add 23:59:59 to get end of day
      const periodEndOfDay = endOfDayInTimezone('2025-11-15', orgTimezone);
      
      // Verify boundaries are in UTC
      expect(periodStart.toISOString()).toMatch(/Z$/);
      expect(periodEndOfDay.toISOString()).toMatch(/Z$/);
      
      // Period should be exactly 15 days
      const days = (periodEndOfDay - periodStart) / (1000 * 60 * 60 * 24);
      expect(Math.floor(days)).toBe(14); // Nov 1 00:00 to Nov 15 23:59
    });

    it('should handle hire date (date-only field)', () => {
      // Hire date is a date-only field, no timezone conversion
      const hireDate = '2025-11-07';
      
      // Store as-is in database
      expect(hireDate).toBe('2025-11-07');
      
      // Display formatted
      const formatted = formatInTimezone(
        new Date(hireDate),
        'America/New_York',
        TIMEZONE_FORMATS.DISPLAY_DATE
      );
      
      expect(formatted).toContain('Nov');
      expect(formatted).toContain('07');
      expect(formatted).toContain('2025');
    });
  });
});
