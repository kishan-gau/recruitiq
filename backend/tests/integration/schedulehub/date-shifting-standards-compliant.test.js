/**
 * Test for Date Shifting Bug Fix - Industry Standards Compliant Version
 * Tests the timezone-safe date parsing and validation according to RecruitIQ backend standards
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ScheduleService from '../src/products/schedulehub/services/scheduleService.js';
import { ValidationError } from '../src/utils/errors.js';

describe('ScheduleService - Date Handling Standards Compliance', () => {
  let scheduleService;

  beforeEach(() => {
    scheduleService = new ScheduleService();
  });

  describe('parseDateOnly - Industry Standard Date Parsing', () => {
    it('should parse YYYY-MM-DD format correctly without timezone issues', () => {
      // Test the problematic case that caused the original bug
      const date = scheduleService.parseDateOnly('2025-11-01');
      
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // November is month 10 (0-based)
      expect(date.getDate()).toBe(1);
      
      // Verify it's in local timezone, not UTC
      expect(date.getTimezoneOffset()).toBe(new Date().getTimezoneOffset());
    });

    it('should handle month boundaries correctly', () => {
      const lastDayOct = scheduleService.parseDateOnly('2025-10-31');
      const firstDayNov = scheduleService.parseDateOnly('2025-11-01');
      
      expect(lastDayOct.getMonth()).toBe(9); // October
      expect(firstDayNov.getMonth()).toBe(10); // November
      expect(lastDayOct.getDate()).toBe(31);
      expect(firstDayNov.getDate()).toBe(1);
    });

    it('should throw ValidationError for invalid format', () => {
      expect(() => {
        scheduleService.parseDateOnly('2025/11/01'); // Wrong format
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('Nov 1, 2025'); // Wrong format
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('2025-13-01'); // Invalid month
      }).toThrow(ValidationError); // Our validation correctly catches invalid month
    });

    it('should reject malformed date strings', () => {
      expect(() => {
        scheduleService.parseDateOnly('invalid');
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('');
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly(null);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for impossible dates', () => {
      expect(() => {
        scheduleService.parseDateOnly('2025-02-30'); // February 30th doesn't exist
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('2025-04-31'); // April 31st doesn't exist
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('2025-00-15'); // Month 00 doesn't exist
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.parseDateOnly('2025-11-32'); // Day 32 doesn't exist
      }).toThrow(ValidationError);
    });

    it('should handle Date objects by converting them to YYYY-MM-DD format', () => {
      const dateObj = new Date(2025, 10, 1); // November 1, 2025 (month is 0-indexed)
      const result = scheduleService.parseDateOnly(dateObj);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10); // November (0-indexed)
      expect(result.getDate()).toBe(1);
    });

    it('should handle Date objects with timezone information correctly', () => {
      // Create a Date object that might have timezone issues
      const dateObj = new Date('2025-11-30T21:00:00.000-03:00'); // Brazil timezone
      const result = scheduleService.parseDateOnly(dateObj);
      
      expect(result).toBeInstanceOf(Date);
      // Since 2025-11-30T21:00:00.000-03:00 converts to 2025-12-01T00:00:00.000Z in UTC,
      // the result should be December 1st (the UTC date part)
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11); // December (0-indexed) 
      expect(result.getDate()).toBe(1); // Should be 1st of December
      
      // Test a date that doesn't cross timezone boundaries
      const midDayDate = new Date('2025-11-15T12:00:00.000-03:00'); // Noon Brazil time
      const midDayResult = scheduleService.parseDateOnly(midDayDate);
      expect(midDayResult.getFullYear()).toBe(2025);
      expect(midDayResult.getMonth()).toBe(10); // November (0-indexed) 
      expect(midDayResult.getDate()).toBe(15); // Should remain November 15th
    });
  });

  describe('validateDateRange - Standards-Compliant Validation', () => {
    it('should accept valid date ranges', () => {
      expect(() => {
        scheduleService.validateDateRange('2025-11-01', '2025-11-30');
      }).not.toThrow();

      expect(() => {
        scheduleService.validateDateRange('2025-01-01', '2025-12-31');
      }).not.toThrow();
    });

    it('should reject invalid date formats', () => {
      expect(() => {
        scheduleService.validateDateRange('2025/11/01', '2025-11-30');
      }).toThrow(ValidationError);

      expect(() => {
        scheduleService.validateDateRange('2025-11-01', 'Nov 30, 2025');
      }).toThrow(ValidationError);
    });

    it('should handle Date objects in date ranges', () => {
      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-30');
      
      // Should work with Date objects
      expect(() => {
        scheduleService.validateDateRange(startDate, endDate);
      }).not.toThrow();
      
      // Should work with mixed types (Date + string)
      expect(() => {
        scheduleService.validateDateRange(startDate, '2025-11-30');
      }).not.toThrow();
      
      expect(() => {
        scheduleService.validateDateRange('2025-11-01', endDate);
      }).not.toThrow();
      
      // Should still validate logical order with Date objects
      expect(() => {
        scheduleService.validateDateRange(new Date('2025-11-30'), new Date('2025-11-01'));
      }).toThrow(ValidationError);
    });

    it('should reject end date before start date', () => {
      expect(() => {
        scheduleService.validateDateRange('2025-11-30', '2025-11-01');
      }).toThrow(ValidationError);
    });

    it('should reject equal start and end dates', () => {
      expect(() => {
        scheduleService.validateDateRange('2025-11-01', '2025-11-01');
      }).toThrow(ValidationError);
    });
  });

  describe('Date Iteration Logic - Bug Fix Validation', () => {
    const generateDatesInRange = (startDate, endDate, applicableDays = [1, 2, 3, 4, 5, 6, 7]) => {
      // Simulate the fixed date iteration logic
      const start = scheduleService.parseDateOnly(startDate);
      const end = scheduleService.parseDateOnly(endDate);
      
      const dates = [];
      const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endTime = end.getTime();
      
      while (current.getTime() <= endTime) {
        // Convert JavaScript day (0=Sunday) to our system (1=Monday)
        const jsDay = current.getDay();
        const systemDay = jsDay === 0 ? 7 : jsDay;
        
        if (applicableDays.includes(systemDay)) {
          dates.push(new Date(current.getFullYear(), current.getMonth(), current.getDate()));
        }
        
        // Use timezone-safe date increment
        current.setDate(current.getDate() + 1);
      }
      
      return dates;
    };

    it('should handle the original bug case: November 1-30, 2025', () => {
      const dates = generateDatesInRange('2025-11-01', '2025-11-30');
      
      // Should have 30 dates for November
      expect(dates).toHaveLength(30);
      
      // First date should be November 1st
      expect(dates[0].getFullYear()).toBe(2025);
      expect(dates[0].getMonth()).toBe(10); // November is month 10
      expect(dates[0].getDate()).toBe(1);
      
      // Last date should be November 30th
      const lastDate = dates[dates.length - 1];
      expect(lastDate.getFullYear()).toBe(2025);
      expect(lastDate.getMonth()).toBe(10); // Still November
      expect(lastDate.getDate()).toBe(30);
      
      // No October dates should be included
      const hasOctoberDates = dates.some(date => date.getMonth() === 9);
      expect(hasOctoberDates).toBe(false);
    });

    it('should handle month boundaries correctly', () => {
      // Test crossing month boundary: Oct 30 - Nov 2
      const dates = generateDatesInRange('2025-10-30', '2025-11-02');
      
      expect(dates).toHaveLength(4);
      
      // Should have Oct 30, 31 and Nov 1, 2
      expect(dates[0].getMonth()).toBe(9); // October
      expect(dates[0].getDate()).toBe(30);
      
      expect(dates[1].getMonth()).toBe(9); // October
      expect(dates[1].getDate()).toBe(31);
      
      expect(dates[2].getMonth()).toBe(10); // November
      expect(dates[2].getDate()).toBe(1);
      
      expect(dates[3].getMonth()).toBe(10); // November
      expect(dates[3].getDate()).toBe(2);
    });

    it('should handle year boundaries correctly', () => {
      // Test crossing year boundary: Dec 30, 2024 - Jan 2, 2025
      const dates = generateDatesInRange('2024-12-30', '2025-01-02');
      
      expect(dates).toHaveLength(4);
      
      // Should have Dec 30, 31, 2024 and Jan 1, 2, 2025
      expect(dates[0].getFullYear()).toBe(2024);
      expect(dates[0].getMonth()).toBe(11); // December
      expect(dates[0].getDate()).toBe(30);
      
      expect(dates[1].getFullYear()).toBe(2024);
      expect(dates[1].getMonth()).toBe(11); // December
      expect(dates[1].getDate()).toBe(31);
      
      expect(dates[2].getFullYear()).toBe(2025);
      expect(dates[2].getMonth()).toBe(0); // January
      expect(dates[2].getDate()).toBe(1);
      
      expect(dates[3].getFullYear()).toBe(2025);
      expect(dates[3].getMonth()).toBe(0); // January
      expect(dates[3].getDate()).toBe(2);
    });

    it('should handle leap year correctly', () => {
      // Test Feb 28-29 in leap year 2024
      const dates = generateDatesInRange('2024-02-28', '2024-03-01');
      
      expect(dates).toHaveLength(3);
      
      expect(dates[0].getDate()).toBe(28);
      expect(dates[1].getDate()).toBe(29); // Leap day
      expect(dates[2].getDate()).toBe(1);
      expect(dates[2].getMonth()).toBe(2); // March
    });
  });

  describe('Integration with Joi Validation Schema Patterns', () => {
    it('should work with date-only validation pattern from standards', () => {
      // Test that our parsing works with the Joi patterns from BACKEND_STANDARDS.md
      const testDates = [
        '2025-01-01',
        '2025-12-31',
        '2024-02-29', // Leap year
        '2025-02-28'  // Non-leap year
      ];

      testDates.forEach(dateStr => {
        expect(() => {
          const parsed = scheduleService.parseDateOnly(dateStr);
          expect(parsed).toBeInstanceOf(Date);
          expect(isNaN(parsed.getTime())).toBe(false);
        }).not.toThrow();
      });
    });

    it('should reject formats that would fail Joi YYYY-MM-DD pattern', () => {
      const invalidFormats = [
        '2025-1-1',      // Missing leading zeros
        '25-01-01',      // 2-digit year
        '2025/01/01',    // Wrong separator
        '01-01-2025',    // Wrong order
        '2025-13-01',    // Invalid month (though Date constructor is forgiving)
        '2025-01-32'     // Invalid day
      ];

      // Our regex should catch format issues before Date constructor
      invalidFormats.forEach(dateStr => {
        expect(() => {
          scheduleService.parseDateOnly(dateStr);
        }).toThrow(ValidationError);
      });
    });
  });
});