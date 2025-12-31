/**
 * Pay Schedule Service Unit Tests
 * 
 * Tests for pay schedule management functionality.
 * Covers schedule CRUD operations and next pay date calculations.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Arrange-Act-Assert structure
 * - EXACT method names from service (verified against source)
 * - Valid UUID formats (no prefixes)
 * 
 * VERIFIED METHODS (from source analysis):
 * 1. createPaySchedule(scheduleData, organizationId, userId)
 * 2. getPayScheduleById(scheduleId, organizationId)
 * 3. getPaySchedules(organizationId)
 * 4. calculateNextPayDate(lastPayDate, frequency)
 * 5. PAY_FREQUENCIES constant
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import payScheduleService, { 
  PAY_FREQUENCIES,
  createPaySchedule,
  getPayScheduleById,
  getPaySchedules,
  calculateNextPayDate
} from '../../../../src/products/paylinq/services/payScheduleService.js';

describe('Pay Schedule Service', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testScheduleId = '660e8400-e29b-41d4-a716-446655440002';

  // ==================== PAY_FREQUENCIES Constant ====================

  describe('PAY_FREQUENCIES', () => {
    it('should define all valid pay frequencies', () => {
      expect(PAY_FREQUENCIES).toBeDefined();
      expect(PAY_FREQUENCIES.WEEKLY).toBe('weekly');
      expect(PAY_FREQUENCIES.BI_WEEKLY).toBe('bi_weekly');
      expect(PAY_FREQUENCIES.SEMI_MONTHLY).toBe('semi_monthly');
      expect(PAY_FREQUENCIES.MONTHLY).toBe('monthly');
    });

    it('should have 4 frequency types', () => {
      expect(Object.keys(PAY_FREQUENCIES)).toHaveLength(4);
    });
  });

  // ==================== createPaySchedule ====================

  describe('createPaySchedule', () => {
    it('should create pay schedule with valid weekly frequency', async () => {
      // Arrange
      const scheduleData = {
        name: 'Weekly Payroll',
        frequency: PAY_FREQUENCIES.WEEKLY,
        startDate: '2024-01-01'
      };

      // Act
      const result = await createPaySchedule(scheduleData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(scheduleData.name);
      expect(result.frequency).toBe(scheduleData.frequency);
      expect(result.organization_id).toBe(testOrgId);
      expect(result.created_by).toBe(testUserId);
    });

    it('should create pay schedule with bi-weekly frequency', async () => {
      // Arrange
      const scheduleData = {
        name: 'Bi-Weekly Payroll',
        frequency: PAY_FREQUENCIES.BI_WEEKLY
      };

      // Act
      const result = await createPaySchedule(scheduleData, testOrgId, testUserId);

      // Assert
      expect(result.frequency).toBe(PAY_FREQUENCIES.BI_WEEKLY);
    });

    it('should create pay schedule with semi-monthly frequency', async () => {
      // Arrange
      const scheduleData = {
        name: 'Semi-Monthly Payroll',
        frequency: PAY_FREQUENCIES.SEMI_MONTHLY
      };

      // Act
      const result = await createPaySchedule(scheduleData, testOrgId, testUserId);

      // Assert
      expect(result.frequency).toBe(PAY_FREQUENCIES.SEMI_MONTHLY);
    });

    it('should create pay schedule with monthly frequency', async () => {
      // Arrange
      const scheduleData = {
        name: 'Monthly Payroll',
        frequency: PAY_FREQUENCIES.MONTHLY
      };

      // Act
      const result = await createPaySchedule(scheduleData, testOrgId, testUserId);

      // Assert
      expect(result.frequency).toBe(PAY_FREQUENCIES.MONTHLY);
    });

    it('should throw error for invalid frequency', async () => {
      // Arrange
      const scheduleData = {
        name: 'Invalid Schedule',
        frequency: 'invalid_frequency'
      };

      // Act & Assert
      await expect(
        createPaySchedule(scheduleData, testOrgId, testUserId)
      ).rejects.toThrow('Invalid pay frequency');
    });

    it('should include all schedule data in result', async () => {
      // Arrange
      const scheduleData = {
        name: 'Complete Schedule',
        frequency: PAY_FREQUENCIES.WEEKLY,
        startDate: '2024-01-01',
        description: 'Test schedule with all fields'
      };

      // Act
      const result = await createPaySchedule(scheduleData, testOrgId, testUserId);

      // Assert
      expect(result.name).toBe(scheduleData.name);
      expect(result.frequency).toBe(scheduleData.frequency);
      expect(result.startDate).toBe(scheduleData.startDate);
      expect(result.description).toBe(scheduleData.description);
    });
  });

  // ==================== getPayScheduleById ====================

  describe('getPayScheduleById', () => {
    it('should return null for non-existent schedule', async () => {
      // Act
      const result = await getPayScheduleById(testScheduleId, testOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it('should accept valid UUID for schedule ID', async () => {
      // Act & Assert - should not throw
      await expect(
        getPayScheduleById(testScheduleId, testOrgId)
      ).resolves.toBeDefined();
    });
  });

  // ==================== getPaySchedules ====================

  describe('getPaySchedules', () => {
    it('should return empty array when no schedules exist', async () => {
      // Act
      const result = await getPaySchedules(testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should accept valid organization ID', async () => {
      // Act & Assert - should not throw
      await expect(
        getPaySchedules(testOrgId)
      ).resolves.toBeDefined();
    });
  });

  // ==================== calculateNextPayDate ====================

  describe('calculateNextPayDate', () => {
    const baseDate = new Date('2024-01-15');

    it('should calculate next weekly pay date (7 days)', () => {
      // Act
      const nextDate = calculateNextPayDate(baseDate, PAY_FREQUENCIES.WEEKLY);

      // Assert
      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getDate()).toBe(22); // 15 + 7 = 22
      expect(nextDate.getMonth()).toBe(0); // January (0-indexed)
    });

    it('should calculate next bi-weekly pay date (14 days)', () => {
      // Act
      const nextDate = calculateNextPayDate(baseDate, PAY_FREQUENCIES.BI_WEEKLY);

      // Assert
      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getDate()).toBe(29); // 15 + 14 = 29
      expect(nextDate.getMonth()).toBe(0); // January
    });

    it('should calculate next semi-monthly pay date (15 days)', () => {
      // Act
      const nextDate = calculateNextPayDate(baseDate, PAY_FREQUENCIES.SEMI_MONTHLY);

      // Assert
      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getDate()).toBe(30); // 15 + 15 = 30
      expect(nextDate.getMonth()).toBe(0); // January
    });

    it('should calculate next monthly pay date (1 month)', () => {
      // Act
      const nextDate = calculateNextPayDate(baseDate, PAY_FREQUENCIES.MONTHLY);

      // Assert
      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getDate()).toBe(15);
      expect(nextDate.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should handle month rollover for weekly frequency', () => {
      // Arrange - Jan 28
      const endOfMonth = new Date('2024-01-28');

      // Act
      const nextDate = calculateNextPayDate(endOfMonth, PAY_FREQUENCIES.WEEKLY);

      // Assert
      expect(nextDate.getDate()).toBe(4); // Feb 4
      expect(nextDate.getMonth()).toBe(1); // February
    });

    it('should handle year rollover for monthly frequency', () => {
      // Arrange - Dec 15
      const endOfYear = new Date('2024-12-15');

      // Act
      const nextDate = calculateNextPayDate(endOfYear, PAY_FREQUENCIES.MONTHLY);

      // Assert
      expect(nextDate.getDate()).toBe(15);
      expect(nextDate.getMonth()).toBe(0); // January of next year
      expect(nextDate.getFullYear()).toBe(2025);
    });

    it('should accept date as string', () => {
      // Act
      const nextDate = calculateNextPayDate('2024-01-15', PAY_FREQUENCIES.WEEKLY);

      // Assert
      expect(nextDate).toBeInstanceOf(Date);
      expect(nextDate.getDate()).toBe(22);
    });

    it('should handle leap year for monthly calculation', () => {
      // Arrange - Feb 29 in leap year
      const leapDay = new Date('2024-02-29');

      // Act
      const nextDate = calculateNextPayDate(leapDay, PAY_FREQUENCIES.MONTHLY);

      // Assert
      expect(nextDate.getMonth()).toBe(2); // March
      expect(nextDate.getDate()).toBe(29);
    });

    it('should not modify original date object', () => {
      // Arrange
      const originalDate = new Date('2024-01-15');
      const originalTimestamp = originalDate.getTime();

      // Act
      calculateNextPayDate(originalDate, PAY_FREQUENCIES.WEEKLY);

      // Assert
      expect(originalDate.getTime()).toBe(originalTimestamp);
    });
  });

  // ==================== Default Export ====================

  describe('default export', () => {
    it('should export all functions and constants', () => {
      expect(payScheduleService).toBeDefined();
      expect(payScheduleService.createPaySchedule).toBe(createPaySchedule);
      expect(payScheduleService.getPayScheduleById).toBe(getPayScheduleById);
      expect(payScheduleService.getPaySchedules).toBe(getPaySchedules);
      expect(payScheduleService.calculateNextPayDate).toBe(calculateNextPayDate);
      expect(payScheduleService.PAY_FREQUENCIES).toBe(PAY_FREQUENCIES);
    });
  });
});
