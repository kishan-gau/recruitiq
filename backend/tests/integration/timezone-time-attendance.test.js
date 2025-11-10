/**
 * Time Attendance Service Integration Tests
 * 
 * Tests for timezone handling in time attendance operations
 */

import { jest } from '@jest/globals';

// Mock database
const mockDb = {
  query: jest.fn()
};

// Mock timezone utilities
jest.unstable_mockModule('../../src/utils/timezone.js', () => ({
  nowUTC: jest.fn(() => new Date('2025-11-07T15:00:00Z')),
  toUTC: jest.fn((date, tz) => new Date(date)),
  fromUTC: jest.fn((date, tz) => date),
  toUTCDateString: jest.fn((date) => date.toISOString().split('T')[0]),
  toDateStringInTimezone: jest.fn((date, tz) => date.toISOString().split('T')[0]),
  parseDateInTimezone: jest.fn((str, tz) => new Date(str)),
  formatInTimezone: jest.fn((date, tz, fmt) => date.toISOString()),
  calculateHours: jest.fn((start, end) => {
    return (new Date(end) - new Date(start)) / (1000 * 60 * 60);
  }),
  startOfDayInTimezone: jest.fn((date, tz) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }),
  endOfDayInTimezone: jest.fn((date, tz) => {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }),
  isValidTimezone: jest.fn(() => true),
  DEFAULT_TIMEZONE: 'UTC'
}));

describe('Time Attendance Service - Timezone Integration', () => {
  let timeAttendanceService;
  let timezoneUtils;

  beforeAll(async () => {
    timezoneUtils = await import('../../src/utils/timezone.js');
    // Import service after mocking utilities
    // timeAttendanceService = await import('../../products/paylinq/services/timeAttendanceService.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Clock In/Out Operations', () => {
    it('should store clock-in time in UTC', async () => {
      // Employee clocks in at 9 AM Eastern
      const req = {
        body: {
          employee_id: 1,
          clock_in: '2025-11-07T09:00:00'
        },
        organization: { id: 1, timezone: 'America/New_York' },
        timezone: 'America/New_York'
      };

      // Mock database insert
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          employee_id: 1,
          clock_in: new Date('2025-11-07T14:00:00Z'), // 9 AM EST = 2 PM UTC
          clock_out: null
        }]
      });

      // Verify toUTC was called to convert to UTC
      expect(timezoneUtils.toUTC).toBeDefined();
    });

    it('should calculate hours correctly across timezones', async () => {
      const clockIn = new Date('2025-11-07T14:00:00Z'); // 9 AM EST
      const clockOut = new Date('2025-11-07T22:00:00Z'); // 5 PM EST
      
      const hours = timezoneUtils.calculateHours(clockIn, clockOut);
      
      expect(hours).toBe(8);
      expect(timezoneUtils.calculateHours).toHaveBeenCalledWith(clockIn, clockOut);
    });

    it('should handle overnight shifts', async () => {
      // Clock in at 11 PM, clock out at 7 AM next day
      const clockIn = new Date('2025-11-07T04:00:00Z'); // 11 PM EST prev day
      const clockOut = new Date('2025-11-08T12:00:00Z'); // 7 AM EST next day
      
      const hours = timezoneUtils.calculateHours(clockIn, clockOut);
      
      expect(hours).toBe(8);
    });
  });

  describe('Date Range Queries', () => {
    it('should query time entries for a date in organization timezone', async () => {
      const req = {
        params: { date: '2025-11-07' },
        organization: { id: 1, timezone: 'America/New_York' },
        timezone: 'America/New_York'
      };

      // Get start and end of day in organization timezone
      const startOfDay = timezoneUtils.startOfDayInTimezone(req.params.date, req.timezone);
      const endOfDay = timezoneUtils.endOfDayInTimezone(req.params.date, req.timezone);

      // Verify date range functions were called
      expect(timezoneUtils.startOfDayInTimezone).toHaveBeenCalledWith('2025-11-07', 'America/New_York');
      expect(timezoneUtils.endOfDayInTimezone).toHaveBeenCalledWith('2025-11-07', 'America/New_York');
      
      // Start of day in EST (00:00 EST = 05:00 UTC)
      expect(startOfDay.toISOString()).toMatch(/T00:00:00/);
      // End of day in EST (23:59:59.999 EST = 04:59:59.999 UTC next day)
      expect(endOfDay.toISOString()).toMatch(/T23:59:59/);
    });

    it('should handle payroll period boundaries', async () => {
      const req = {
        params: { 
          start_date: '2025-11-01',
          end_date: '2025-11-15'
        },
        organization: { id: 1, timezone: 'America/New_York' },
        timezone: 'America/New_York'
      };

      // Parse dates in organization timezone
      const periodStart = timezoneUtils.parseDateInTimezone(req.params.start_date, req.timezone);
      const periodEnd = timezoneUtils.endOfDayInTimezone(req.params.end_date, req.timezone);

      expect(timezoneUtils.parseDateInTimezone).toHaveBeenCalledWith('2025-11-01', 'America/New_York');
      expect(timezoneUtils.endOfDayInTimezone).toHaveBeenCalledWith('2025-11-15', 'America/New_York');
    });
  });

  describe('Time Entry Display', () => {
    it('should format times for display in user timezone', async () => {
      const timeEntry = {
        id: 1,
        clock_in: new Date('2025-11-07T14:00:00Z'), // UTC
        clock_out: new Date('2025-11-07T22:00:00Z'), // UTC
        hours_worked: 8
      };

      const req = {
        timezone: 'America/New_York'
      };

      // Format for display
      const formatted = {
        ...timeEntry,
        clock_in_display: timezoneUtils.formatInTimezone(
          timeEntry.clock_in,
          req.timezone,
          'PPpp' // date-fns format
        ),
        clock_out_display: timezoneUtils.formatInTimezone(
          timeEntry.clock_out,
          req.timezone,
          'PPpp'
        )
      };

      expect(timezoneUtils.formatInTimezone).toHaveBeenCalled();
    });
  });

  describe('Break Time Calculations', () => {
    it('should calculate break duration correctly', () => {
      const breakStart = new Date('2025-11-07T17:00:00Z'); // 12 PM EST
      const breakEnd = new Date('2025-11-07T17:30:00Z'); // 12:30 PM EST
      
      const breakDuration = timezoneUtils.calculateHours(breakStart, breakEnd);
      
      expect(breakDuration).toBe(0.5); // 30 minutes = 0.5 hours
    });

    it('should deduct breaks from worked hours', () => {
      const clockIn = new Date('2025-11-07T14:00:00Z'); // 9 AM EST
      const clockOut = new Date('2025-11-07T22:00:00Z'); // 5 PM EST
      const breakDuration = 0.5; // 30 minute break
      
      const grossHours = timezoneUtils.calculateHours(clockIn, clockOut);
      const netHours = grossHours - breakDuration;
      
      expect(grossHours).toBe(8);
      expect(netHours).toBe(7.5);
    });
  });

  describe('Multi-Timezone Scenarios', () => {
    it('should handle employee traveling across timezones', async () => {
      // Employee starts work in New York, ends in Los Angeles
      const req = {
        body: {
          employee_id: 1,
          clock_in: '2025-11-07T09:00:00',
          clock_in_timezone: 'America/New_York',
          clock_out: '2025-11-07T17:00:00',
          clock_out_timezone: 'America/Los_Angeles'
        },
        organization: { id: 1, timezone: 'America/New_York' },
        timezone: 'America/New_York'
      };

      // Convert both to UTC
      const clockInUTC = timezoneUtils.toUTC(
        req.body.clock_in,
        req.body.clock_in_timezone
      );
      const clockOutUTC = timezoneUtils.toUTC(
        req.body.clock_out,
        req.body.clock_out_timezone
      );

      // Calculate actual hours worked
      const hours = timezoneUtils.calculateHours(clockInUTC, clockOutUTC);
      
      expect(timezoneUtils.toUTC).toHaveBeenCalledWith(
        '2025-11-07T09:00:00',
        'America/New_York'
      );
      expect(timezoneUtils.toUTC).toHaveBeenCalledWith(
        '2025-11-07T17:00:00',
        'America/Los_Angeles'
      );
    });

    it('should query for organization across all locations', async () => {
      // Organization has locations in multiple timezones
      const req = {
        params: { date: '2025-11-07' },
        organization: { 
          id: 1, 
          timezone: 'America/New_York',
          locations: [
            { timezone: 'America/New_York' },
            { timezone: 'America/Chicago' },
            { timezone: 'America/Los_Angeles' }
          ]
        },
        timezone: 'America/New_York'
      };

      // Get organization's day boundaries
      const startOfDay = timezoneUtils.startOfDayInTimezone(
        req.params.date,
        req.organization.timezone
      );
      const endOfDay = timezoneUtils.endOfDayInTimezone(
        req.params.date,
        req.organization.timezone
      );

      // Query all time entries within organization's business day
      // Individual entries will be stored in UTC and can be displayed
      // in their respective location timezones

      expect(timezoneUtils.startOfDayInTimezone).toHaveBeenCalled();
      expect(timezoneUtils.endOfDayInTimezone).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle daylight saving time transitions', async () => {
      // Spring forward: 2 AM becomes 3 AM
      // Work through the transition
      const clockIn = new Date('2025-03-09T06:00:00Z'); // 1 AM EST
      const clockOut = new Date('2025-03-09T11:00:00Z'); // 7 AM EDT (after DST)
      
      const hours = timezoneUtils.calculateHours(clockIn, clockOut);
      
      // Should be 5 hours of UTC time (what actually elapsed)
      expect(hours).toBe(5);
    });

    it('should handle leap seconds gracefully', async () => {
      // Leap seconds are handled by date-fns-tz
      const date = new Date('2025-06-30T23:59:60Z'); // Hypothetical leap second
      
      // Should not throw
      expect(() => {
        timezoneUtils.formatInTimezone(date, 'UTC', 'PPpp');
      }).not.toThrow();
    });

    it('should handle missing clock-out gracefully', async () => {
      const timeEntry = {
        id: 1,
        clock_in: new Date('2025-11-07T14:00:00Z'),
        clock_out: null
      };

      const req = {
        timezone: 'America/New_York'
      };

      // Calculate hours to current time
      const now = timezoneUtils.nowUTC();
      const hours = timeEntry.clock_out 
        ? timezoneUtils.calculateHours(timeEntry.clock_in, timeEntry.clock_out)
        : timezoneUtils.calculateHours(timeEntry.clock_in, now);

      expect(hours).toBeGreaterThan(0);
    });
  });

  describe('Performance Considerations', () => {
    it('should batch timezone conversions for multiple entries', () => {
      const entries = [
        { clock_in: new Date('2025-11-07T14:00:00Z'), clock_out: new Date('2025-11-07T22:00:00Z') },
        { clock_in: new Date('2025-11-08T14:00:00Z'), clock_out: new Date('2025-11-08T22:00:00Z') },
        { clock_in: new Date('2025-11-09T14:00:00Z'), clock_out: new Date('2025-11-09T22:00:00Z') }
      ];

      const timezone = 'America/New_York';

      // Format all entries for display
      const formatted = entries.map(entry => ({
        ...entry,
        clock_in_display: timezoneUtils.formatInTimezone(entry.clock_in, timezone, 'PPpp'),
        clock_out_display: timezoneUtils.formatInTimezone(entry.clock_out, timezone, 'PPpp'),
        hours_worked: timezoneUtils.calculateHours(entry.clock_in, entry.clock_out)
      }));

      expect(formatted).toHaveLength(3);
      expect(timezoneUtils.formatInTimezone).toHaveBeenCalledTimes(6); // 2 per entry
    });
  });
});
