/**
 * Temporal Pattern Service Unit Tests
 * 
 * Tests for temporal pattern evaluation logic including:
 * - Day of week consecutive patterns
 * - Shift type patterns
 * - Hours threshold patterns
 * - Combined patterns
 * - Pattern validation
 * - Edge cases and error handling
 */

import temporalPatternService from '../../../src/products/paylinq/services/temporalPatternService.js';
import TimeAttendanceRepository from '../../../src/products/paylinq/repositories/timeAttendanceRepository.js';
import { ValidationError } from '../../../src/middleware/errorHandler.js';

// Mock the repository
jest.mock('../../../src/products/paylinq/repositories/timeAttendanceRepository.js');

describe('TemporalPatternService', () => {
  let mockTimeAttendanceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTimeAttendanceRepository = TimeAttendanceRepository.mock.instances[0];
  });

  describe('Pattern Validation', () => {
    test('should validate required fields', async () => {
      const invalidPattern = {
        // Missing required fields
      };

      await expect(
        temporalPatternService.evaluatePattern(
          'employee-123',
          invalidPattern,
          'org-456'
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should validate pattern type', async () => {
      const invalidPattern = {
        patternType: 'invalid_type',
        consecutiveCount: 3,
      };

      await expect(
        temporalPatternService.evaluatePattern(
          'employee-123',
          invalidPattern,
          'org-456'
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should validate day of week pattern', async () => {
      const invalidPattern = {
        patternType: 'day_of_week',
        consecutiveCount: 3,
        // Missing dayOfWeek
      };

      await expect(
        temporalPatternService.evaluatePattern(
          'employee-123',
          invalidPattern,
          'org-456'
        )
      ).rejects.toThrow(ValidationError);
    });

    test('should validate consecutive count range', async () => {
      const invalidPattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 400, // Exceeds max of 365
      };

      await expect(
        temporalPatternService.evaluatePattern(
          'employee-123',
          invalidPattern,
          'org-456'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Day of Week Pattern Evaluation', () => {
    test('should qualify worker with 3 consecutive Sundays', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      // Mock time entries - 3 consecutive Sundays
      const mockEntries = [
        { entry_date: '2024-01-07', worked_hours: 8 }, // Sunday
        { entry_date: '2024-01-14', worked_hours: 8 }, // Sunday
        { entry_date: '2024-01-21', worked_hours: 8 }, // Sunday
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-01-28')
      );

      expect(result.qualified).toBe(true);
      expect(result.patternType).toBe('day_of_week');
      expect(result.metadata.actualMaxConsecutive).toBe(3);
      expect(result.metadata.dayOfWeek).toBe('sunday');
    });

    test('should not qualify worker with only 2 consecutive Sundays', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      // Mock time entries - only 2 consecutive Sundays
      const mockEntries = [
        { entry_date: '2024-01-07', worked_hours: 8 }, // Sunday
        { entry_date: '2024-01-14', worked_hours: 8 }, // Sunday
        // Missing third consecutive Sunday
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-01-28')
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(2);
    });

    test('should handle broken consecutive runs correctly', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      // Mock time entries - 2 Sundays, skip one, then 3 Sundays
      const mockEntries = [
        { entry_date: '2024-01-07', worked_hours: 8 }, // Sunday
        { entry_date: '2024-01-14', worked_hours: 8 }, // Sunday
        // Skip 2024-01-21 (break in pattern)
        { entry_date: '2024-01-28', worked_hours: 8 }, // Sunday
        { entry_date: '2024-02-04', worked_hours: 8 }, // Sunday
        { entry_date: '2024-02-11', worked_hours: 8 }, // Sunday
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-02-18')
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.actualMaxConsecutive).toBe(3);
      expect(result.metadata.consecutiveRuns).toHaveLength(1);
      expect(result.metadata.consecutiveRuns[0].count).toBe(3);
    });

    test('should handle empty time entries', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue([]);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456'
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(0);
      expect(result.metadata.totalMatchingDays).toBe(0);
    });

    test('should test different days of week', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'friday',
        consecutiveCount: 4,
        lookbackPeriodDays: 60,
      };

      // Mock 4 consecutive Fridays
      const mockEntries = [
        { entry_date: '2024-01-05', worked_hours: 8 }, // Friday
        { entry_date: '2024-01-12', worked_hours: 8 }, // Friday
        { entry_date: '2024-01-19', worked_hours: 8 }, // Friday
        { entry_date: '2024-01-26', worked_hours: 8 }, // Friday
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-02-02')
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.dayOfWeek).toBe('friday');
    });
  });

  describe('countConsecutiveDays', () => {
    test('should count single entry as 1', () => {
      const entries = [
        { entry_date: '2024-01-07', worked_hours: 8 },
      ];

      const result = temporalPatternService.countConsecutiveDays(entries, 'sunday', 3);

      expect(result.maxConsecutive).toBe(1);
      expect(result.consecutiveRuns).toHaveLength(0);
    });

    test('should identify multiple consecutive runs', () => {
      const entries = [
        { entry_date: '2024-01-07', worked_hours: 8 },
        { entry_date: '2024-01-14', worked_hours: 8 },
        { entry_date: '2024-01-21', worked_hours: 8 },
        // Break
        { entry_date: '2024-02-04', worked_hours: 8 },
        { entry_date: '2024-02-11', worked_hours: 8 },
      ];

      const result = temporalPatternService.countConsecutiveDays(entries, 'sunday', 2);

      expect(result.maxConsecutive).toBe(3);
      expect(result.consecutiveRuns).toHaveLength(2);
      expect(result.consecutiveRuns[0].count).toBe(3); // Sorted by count descending
      expect(result.consecutiveRuns[1].count).toBe(2);
    });

    test('should handle empty array', () => {
      const result = temporalPatternService.countConsecutiveDays([], 'sunday', 3);

      expect(result.maxConsecutive).toBe(0);
      expect(result.consecutiveRuns).toHaveLength(0);
      expect(result.matchingDates).toHaveLength(0);
    });
  });

  describe('Hours Threshold Pattern Evaluation', () => {
    test('should qualify worker with >40 hours in 7 consecutive days', async () => {
      const pattern = {
        patternType: 'hours_threshold',
        hoursThreshold: 40,
        comparisonOperator: 'greater_than',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      // Mock 7 consecutive days with >40 total hours
      const mockEntries = [
        { entry_date: '2024-01-01', worked_hours: 6 },
        { entry_date: '2024-01-02', worked_hours: 7 },
        { entry_date: '2024-01-03', worked_hours: 8 },
        { entry_date: '2024-01-04', worked_hours: 8 },
        { entry_date: '2024-01-05', worked_hours: 6 },
        { entry_date: '2024-01-06', worked_hours: 4 },
        { entry_date: '2024-01-07', worked_hours: 3 }, // Total: 42 hours
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-01-15')
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.qualifyingPeriods).toHaveLength(1);
      expect(result.metadata.qualifyingPeriods[0].totalHours).toBeGreaterThan(40);
    });

    test('should not qualify worker with <40 hours', async () => {
      const pattern = {
        patternType: 'hours_threshold',
        hoursThreshold: 40,
        comparisonOperator: 'greater_than',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      // Mock 7 days with only 35 total hours
      const mockEntries = [
        { entry_date: '2024-01-01', worked_hours: 5 },
        { entry_date: '2024-01-02', worked_hours: 5 },
        { entry_date: '2024-01-03', worked_hours: 5 },
        { entry_date: '2024-01-04', worked_hours: 5 },
        { entry_date: '2024-01-05', worked_hours: 5 },
        { entry_date: '2024-01-06', worked_hours: 5 },
        { entry_date: '2024-01-07', worked_hours: 5 }, // Total: 35 hours
      ];

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const result = await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456',
        new Date('2024-01-15')
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.qualifyingPeriods).toHaveLength(0);
    });
  });

  describe('compareValue', () => {
    test('should compare greater_than correctly', () => {
      expect(temporalPatternService.compareValue(50, 'greater_than', 40)).toBe(true);
      expect(temporalPatternService.compareValue(30, 'greater_than', 40)).toBe(false);
    });

    test('should compare less_than correctly', () => {
      expect(temporalPatternService.compareValue(30, 'less_than', 40)).toBe(true);
      expect(temporalPatternService.compareValue(50, 'less_than', 40)).toBe(false);
    });

    test('should compare equals correctly with tolerance', () => {
      expect(temporalPatternService.compareValue(40.0, 'equals', 40.0)).toBe(true);
      expect(temporalPatternService.compareValue(40.005, 'equals', 40.0)).toBe(true);
      expect(temporalPatternService.compareValue(40.5, 'equals', 40.0)).toBe(false);
    });

    test('should compare greater_or_equal correctly', () => {
      expect(temporalPatternService.compareValue(40, 'greater_or_equal', 40)).toBe(true);
      expect(temporalPatternService.compareValue(41, 'greater_or_equal', 40)).toBe(true);
      expect(temporalPatternService.compareValue(39, 'greater_or_equal', 40)).toBe(false);
    });

    test('should throw on invalid operator', () => {
      expect(() => {
        temporalPatternService.compareValue(40, 'invalid_op', 40);
      }).toThrow(ValidationError);
    });
  });

  describe('countConsecutiveDates', () => {
    test('should count consecutive calendar dates', () => {
      const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];

      const result = temporalPatternService.countConsecutiveDates(dates);

      expect(result.maxConsecutive).toBe(4);
      expect(result.consecutiveRuns).toHaveLength(1);
      expect(result.consecutiveRuns[0].count).toBe(4);
    });

    test('should handle broken runs', () => {
      const dates = ['2024-01-01', '2024-01-02', '2024-01-04', '2024-01-05'];

      const result = temporalPatternService.countConsecutiveDates(dates);

      expect(result.maxConsecutive).toBe(2);
      expect(result.consecutiveRuns).toHaveLength(2);
    });

    test('should handle duplicate dates', () => {
      const dates = ['2024-01-01', '2024-01-01', '2024-01-02'];

      const result = temporalPatternService.countConsecutiveDates(dates);

      expect(result.maxConsecutive).toBe(2);
    });

    test('should handle unsorted dates', () => {
      const dates = ['2024-01-03', '2024-01-01', '2024-01-02'];

      const result = temporalPatternService.countConsecutiveDates(dates);

      expect(result.maxConsecutive).toBe(3);
    });
  });

  describe('testPattern', () => {
    test('should test pattern against multiple workers', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      const employeeIds = ['emp-1', 'emp-2', 'emp-3'];

      // Mock different results for each employee
      mockTimeAttendanceRepository.findTimeEntries = jest.fn()
        .mockResolvedValueOnce([
          { entry_date: '2024-01-07', worked_hours: 8 },
          { entry_date: '2024-01-14', worked_hours: 8 },
          { entry_date: '2024-01-21', worked_hours: 8 },
        ]) // emp-1: qualified
        .mockResolvedValueOnce([
          { entry_date: '2024-01-07', worked_hours: 8 },
        ]) // emp-2: not qualified
        .mockResolvedValueOnce([
          { entry_date: '2024-01-07', worked_hours: 8 },
          { entry_date: '2024-01-14', worked_hours: 8 },
          { entry_date: '2024-01-21', worked_hours: 8 },
          { entry_date: '2024-01-28', worked_hours: 8 },
        ]); // emp-3: qualified

      const result = await temporalPatternService.testPattern(
        pattern,
        employeeIds,
        'org-456'
      );

      expect(result.totalTested).toBe(3);
      expect(result.qualifiedCount).toBe(2);
      expect(result.notQualifiedCount).toBe(1);
      expect(result.qualifiedWorkers).toHaveLength(2);
      expect(result.notQualifiedWorkers).toHaveLength(1);
    });

    test('should handle errors gracefully', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      mockTimeAttendanceRepository.findTimeEntries = jest.fn()
        .mockRejectedValue(new Error('Database error'));

      const result = await temporalPatternService.testPattern(
        pattern,
        ['emp-1'],
        'org-456'
      );

      expect(result.totalTested).toBe(1);
      expect(result.qualifiedCount).toBe(0);
      expect(result.allResults[0].error).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should evaluate pattern within acceptable time', async () => {
      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      // Mock large dataset
      const mockEntries = Array.from({ length: 50 }, (_, i) => ({
        entry_date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`,
        worked_hours: 8,
      }));

      mockTimeAttendanceRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      const startTime = Date.now();
      await temporalPatternService.evaluatePattern(
        'employee-123',
        pattern,
        'org-456'
      );
      const executionTime = Date.now() - startTime;

      // Should complete in less than 100ms
      expect(executionTime).toBeLessThan(100);
    });
  });
});
