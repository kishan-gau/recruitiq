/**
 * Phase 2 Tests: Temporal Pattern Service
 * Tests for shift type, station, role, hours threshold, and combined patterns
 */

import temporalPatternService from '../../../../src/products/paylinq/services/temporalPatternService.js';
import { ValidationError } from '../../../../src/middleware/errorHandler.js';

// Mock database
jest.mock('../../../../src/config/database.js', () => ({
  query: jest.fn(),
}));

// Mock logger
jest.mock('../../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

import { query } from '../../../../src/config/database.js';

describe('Temporal Pattern Service - Phase 2', () => {
  const mockOrgId = 'org-123';
  const mockEmployeeId = 'emp-456';
  const mockAsOfDate = new Date('2024-03-15');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Shift Type Pattern Evaluation', () => {
    test('should qualify worker with sufficient consecutive shift type days', async () => {
      const pattern = {
        patternType: 'shift_type',
        shiftTypeId: 'shift-night-789',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      // Mock time_entry records with consecutive night shifts
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-03' },
          { entry_date: '2024-03-04' },
          { entry_date: '2024-03-05' },
          { entry_date: '2024-03-06' },
        ],
      });

      // Mock shift type name lookup
      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true);
      expect(result.patternType).toBe('shift_type');
      expect(result.metadata.shiftTypeId).toBe('shift-night-789');
      expect(result.metadata.shiftTypeName).toBe('Night Shift');
      expect(result.metadata.actualMaxConsecutive).toBeGreaterThanOrEqual(5);
      expect(result.metadata.totalMatchingDays).toBe(6);
    });

    test('should not qualify worker with insufficient consecutive shift type days', async () => {
      const pattern = {
        patternType: 'shift_type',
        shiftTypeId: 'shift-night-789',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      // Mock only 3 consecutive days
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-03' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(3);
      expect(result.metadata.requiredConsecutive).toBe(7);
    });

    test('should handle broken consecutive runs correctly', async () => {
      const pattern = {
        patternType: 'shift_type',
        shiftTypeId: 'shift-day-001',
        consecutiveCount: 4,
        lookbackPeriodDays: 30,
      };

      // Mock with gap: 3 days, skip, 2 days
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-03' },
          { entry_date: '2024-03-05' }, // Gap at 03-04
          { entry_date: '2024-03-06' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Day Shift' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(3); // Longest run is 3 days
    });
  });

  describe('Station Pattern Evaluation', () => {
    test('should qualify worker with sufficient consecutive station days', async () => {
      const pattern = {
        patternType: 'station',
        stationId: 'station-warehouse-123',
        consecutiveCount: 10,
        lookbackPeriodDays: 60,
      };

      // Mock 12 consecutive days at warehouse
      const consecutiveDates = Array.from({ length: 12 }, (_, i) => {
        const date = new Date('2024-03-01');
        date.setDate(date.getDate() + i);
        return { shift_date: date.toISOString().split('T')[0] };
      });

      query.mockResolvedValueOnce({
        rows: consecutiveDates,
      });

      query.mockResolvedValueOnce({
        rows: [{ station_name: 'Main Warehouse' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true);
      expect(result.patternType).toBe('station');
      expect(result.metadata.stationName).toBe('Main Warehouse');
      expect(result.metadata.actualMaxConsecutive).toBe(12);
    });

    test('should not qualify worker with no station shifts', async () => {
      const pattern = {
        patternType: 'station',
        stationId: 'station-store-456',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.totalMatchingDays).toBe(0);
      expect(result.metadata.actualMaxConsecutive).toBe(0);
    });
  });

  describe('Role Pattern Evaluation', () => {
    test('should qualify worker with sufficient consecutive role days', async () => {
      const pattern = {
        patternType: 'role',
        roleId: 'role-supervisor-789',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      // Mock 9 consecutive days as supervisor
      const consecutiveDates = Array.from({ length: 9 }, (_, i) => {
        const date = new Date('2024-03-01');
        date.setDate(date.getDate() + i);
        return { shift_date: date.toISOString().split('T')[0] };
      });

      query.mockResolvedValueOnce({
        rows: consecutiveDates,
      });

      query.mockResolvedValueOnce({
        rows: [{ role_name: 'Supervisor' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true);
      expect(result.patternType).toBe('role');
      expect(result.metadata.roleName).toBe('Supervisor');
      expect(result.metadata.actualMaxConsecutive).toBe(9);
      expect(result.metadata.requiredConsecutive).toBe(7);
    });

    test('should handle multiple role runs and pick maximum', async () => {
      const pattern = {
        patternType: 'role',
        roleId: 'role-manager-001',
        consecutiveCount: 5,
        lookbackPeriodDays: 60,
      };

      // Two separate runs: 3 days, gap, 6 days
      query.mockResolvedValueOnce({
        rows: [
          { shift_date: '2024-02-01' },
          { shift_date: '2024-02-02' },
          { shift_date: '2024-02-03' },
          { shift_date: '2024-02-10' }, // Gap
          { shift_date: '2024-02-11' },
          { shift_date: '2024-02-12' },
          { shift_date: '2024-02-13' },
          { shift_date: '2024-02-14' },
          { shift_date: '2024-02-15' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ role_name: 'Manager' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.actualMaxConsecutive).toBe(6); // Longest run
      expect(result.metadata.consecutiveRuns).toHaveLength(2);
    });
  });

  describe('Hours Threshold Pattern Evaluation', () => {
    test('should handle hours threshold evaluation (already implemented)', async () => {
      // This pattern was implemented in earlier phase, just verify it still works
      const pattern = {
        patternType: 'hours_threshold',
        hoursThreshold: 8,
        comparisonOperator: 'greater_or_equal',
        consecutiveCount: 5,
        lookbackPeriodDays: 14,
      };

      // Mock timeAttendanceRepository is needed
      const mockRepository = {
        findTimeEntries: jest.fn().mockResolvedValue([
          { entry_date: '2024-03-01', worked_hours: 8 },
          { entry_date: '2024-03-02', worked_hours: 8.5 },
          { entry_date: '2024-03-03', worked_hours: 9 },
          { entry_date: '2024-03-04', worked_hours: 8 },
          { entry_date: '2024-03-05', worked_hours: 10 },
        ]),
      };

      temporalPatternService.timeAttendanceRepository = mockRepository;

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true);
      expect(result.patternType).toBe('hours_threshold');
    });
  });

  describe('Combined Pattern Evaluation', () => {
    test('should evaluate AND logic correctly', async () => {
      const pattern = {
        patternType: 'combined',
        logicalOperator: 'AND',
        combinedPatterns: [
          {
            patternType: 'day_of_week',
            dayOfWeek: 'sunday',
            consecutiveCount: 2,
            lookbackPeriodDays: 30,
          },
          {
            patternType: 'shift_type',
            shiftTypeId: 'shift-night-001',
            consecutiveCount: 3,
            lookbackPeriodDays: 30,
          },
        ],
      };

      // Mock for day_of_week sub-pattern (qualified)
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-02-18' }, // Sunday
          { entry_date: '2024-02-25' }, // Sunday
          { entry_date: '2024-03-03' }, // Sunday
        ],
      });

      // Mock for shift_type sub-pattern (qualified)
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-03' },
          { entry_date: '2024-03-04' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true); // Both sub-patterns qualified
      expect(result.patternType).toBe('combined');
      expect(result.metadata.logicalOperator).toBe('AND');
      expect(result.metadata.subPatternResults).toHaveLength(2);
      expect(result.metadata.subPatternResults[0].qualified).toBe(true);
      expect(result.metadata.subPatternResults[1].qualified).toBe(true);
    });

    test('should evaluate OR logic correctly', async () => {
      const pattern = {
        patternType: 'combined',
        logicalOperator: 'OR',
        combinedPatterns: [
          {
            patternType: 'station',
            stationId: 'station-a',
            consecutiveCount: 10,
            lookbackPeriodDays: 30,
          },
          {
            patternType: 'role',
            roleId: 'role-supervisor',
            consecutiveCount: 5,
            lookbackPeriodDays: 30,
          },
        ],
      };

      // Station pattern: not qualified (only 3 days)
      query.mockResolvedValueOnce({
        rows: [
          { shift_date: '2024-03-01' },
          { shift_date: '2024-03-02' },
          { shift_date: '2024-03-03' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ station_name: 'Station A' }],
      });

      // Role pattern: qualified (7 consecutive days)
      query.mockResolvedValueOnce({
        rows: [
          { shift_date: '2024-03-05' },
          { shift_date: '2024-03-06' },
          { shift_date: '2024-03-07' },
          { shift_date: '2024-03-08' },
          { shift_date: '2024-03-09' },
          { shift_date: '2024-03-10' },
          { shift_date: '2024-03-11' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ role_name: 'Supervisor' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(true); // At least one qualified (OR logic)
      expect(result.metadata.subPatternResults[0].qualified).toBe(false);
      expect(result.metadata.subPatternResults[1].qualified).toBe(true);
    });

    test('should fail AND when any sub-pattern fails', async () => {
      const pattern = {
        patternType: 'combined',
        logicalOperator: 'AND',
        combinedPatterns: [
          {
            patternType: 'day_of_week',
            dayOfWeek: 'saturday',
            consecutiveCount: 3,
            lookbackPeriodDays: 30,
          },
          {
            patternType: 'shift_type',
            shiftTypeId: 'shift-day',
            consecutiveCount: 5,
            lookbackPeriodDays: 30,
          },
        ],
      };

      // First pattern qualified
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-02-17' },
          { entry_date: '2024-02-24' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-09' },
        ],
      });

      // Second pattern NOT qualified (only 2 days)
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
        ],
      });

      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Day Shift' }],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(false); // AND requires both
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing shiftTypeId gracefully', async () => {
      const pattern = {
        patternType: 'shift_type',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
        // Missing shiftTypeId
      };

      await expect(
        temporalPatternService.evaluatePattern(mockEmployeeId, pattern, mockOrgId, mockAsOfDate)
      ).rejects.toThrow();
    });

    test('should handle database errors gracefully', async () => {
      const pattern = {
        patternType: 'station',
        stationId: 'station-123',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      query.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        temporalPatternService.evaluatePattern(mockEmployeeId, pattern, mockOrgId, mockAsOfDate)
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle empty result sets', async () => {
      const pattern = {
        patternType: 'role',
        roleId: 'role-nonexistent',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await temporalPatternService.evaluatePattern(
        mockEmployeeId,
        pattern,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.totalMatchingDays).toBe(0);
    });
  });

  describe('Test Pattern with Multiple Workers', () => {
    test('should test shift type pattern across multiple workers', async () => {
      const pattern = {
        patternType: 'shift_type',
        shiftTypeId: 'shift-night-001',
        consecutiveCount: 5,
        lookbackPeriodDays: 30,
      };

      const employeeIds = ['emp-1', 'emp-2', 'emp-3'];

      // Mock responses for each employee
      // emp-1: qualified (6 consecutive days)
      query.mockResolvedValueOnce({
        rows: Array.from({ length: 6 }, (_, i) => ({
          entry_date: `2024-03-0${i + 1}`,
        })),
      });
      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      // emp-2: not qualified (3 consecutive days)
      query.mockResolvedValueOnce({
        rows: [
          { entry_date: '2024-03-01' },
          { entry_date: '2024-03-02' },
          { entry_date: '2024-03-03' },
        ],
      });
      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      // emp-3: qualified (5 consecutive days)
      query.mockResolvedValueOnce({
        rows: Array.from({ length: 5 }, (_, i) => ({
          entry_date: `2024-03-0${i + 8}`,
        })),
      });
      query.mockResolvedValueOnce({
        rows: [{ shift_name: 'Night Shift' }],
      });

      const result = await temporalPatternService.testPattern(
        pattern,
        employeeIds,
        mockOrgId,
        mockAsOfDate
      );

      expect(result.totalTested).toBe(3);
      expect(result.qualifiedCount).toBe(2);
      expect(result.notQualifiedCount).toBe(1);
    });
  });
});
