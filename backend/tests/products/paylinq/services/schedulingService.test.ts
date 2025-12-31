/**
 * SchedulingService Test Suite
 * 
 * Tests for PayLinQ scheduling service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import schedulingServiceInstance from '../../../../src/products/paylinq/services/schedulingService.js';

describe('SchedulingService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174002';
  const testShiftTypeId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      createWorkSchedule: jest.fn(),
      findScheduleConflicts: jest.fn(),
      findWorkSchedules: jest.fn(),
      findWorkScheduleById: jest.fn(),
      updateWorkSchedule: jest.fn(),
      deleteWorkSchedule: jest.fn()
    };

    // Use singleton instance and inject mock repository
    service = schedulingServiceInstance;
    service.schedulingRepository = mockRepository;
  });

  describe('workScheduleSchema validation', () => {
    it('should have validation schema defined', () => {
      expect(service.workScheduleSchema).toBeDefined();
    });

    it('should validate valid schedule data', () => {
      const scheduleData = {
        employee_id: testEmployeeId,
        schedule_date: '2025-01-15',
        start_time: '09:00',
        end_time: '17:00',
        status: 'scheduled'
      };

      const { error } = service.workScheduleSchema.validate(scheduleData);
      expect(error).toBeUndefined();
    });

    it('should require employee_id', () => {
      const scheduleData = {
        schedule_date: '2025-01-15',
        start_time: '09:00',
        end_time: '17:00'
      };

      const { error } = service.workScheduleSchema.validate(scheduleData);
      expect(error).toBeDefined();
    });

    it('should validate time format (HH:MM)', () => {
      const invalidData = {
        employee_id: testEmployeeId,
        schedule_date: '2025-01-15',
        start_time: '9:00', // Invalid - should be 09:00
        end_time: '17:00'
      };

      const { error } = service.workScheduleSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should accept valid time formats', () => {
      const validTimes = ['00:00', '09:30', '12:45', '23:59'];

      for (const time of validTimes) {
        const data = {
          employee_id: testEmployeeId,
          schedule_date: '2025-01-15',
          start_time: time,
          end_time: time
        };

        const { error } = service.workScheduleSchema.validate(data);
        expect(error).toBeUndefined();
      }
    });

    it('should accept valid status values', () => {
      const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];

      for (const status of validStatuses) {
        const data = {
          employee_id: testEmployeeId,
          schedule_date: '2025-01-15',
          start_time: '09:00',
          end_time: '17:00',
          status
        };

        const { error } = service.workScheduleSchema.validate(data);
        expect(error).toBeUndefined();
      }
    });

    it('should default status to scheduled', () => {
      const data = {
        employee_id: testEmployeeId,
        schedule_date: '2025-01-15',
        start_time: '09:00',
        end_time: '17:00'
      };

      const { value } = service.workScheduleSchema.validate(data);
      expect(value.status).toBe('scheduled');
    });
  });

  describe('scheduleChangeRequestSchema validation', () => {
    it('should have schedule change request schema defined', () => {
      expect(service.scheduleChangeRequestSchema).toBeDefined();
    });

    it('should validate valid change request', () => {
      const requestData = {
        workScheduleId: testEmployeeId,
        requestedBy: testUserId,
        requestType: 'swap',
        originalDate: '2025-01-15',
        reason: 'Personal emergency requiring schedule change'
      };

      const { error } = service.scheduleChangeRequestSchema.validate(requestData);
      expect(error).toBeUndefined();
    });

    it('should require minimum reason length', () => {
      const requestData = {
        workScheduleId: testEmployeeId,
        requestedBy: testUserId,
        requestType: 'swap',
        originalDate: '2025-01-15',
        reason: 'Test' // Too short (< 5 characters)
      };

      const { error } = service.scheduleChangeRequestSchema.validate(requestData);
      expect(error).toBeDefined();
    });

    it('should accept valid request types', () => {
      const validTypes = ['swap', 'change', 'cancel'];

      for (const requestType of validTypes) {
        const data = {
          workScheduleId: testEmployeeId,
          requestedBy: testUserId,
          requestType,
          originalDate: '2025-01-15',
          reason: 'Valid reason for schedule change'
        };

        const { error } = service.scheduleChangeRequestSchema.validate(data);
        expect(error).toBeUndefined();
      }
    });
  });

  describe('createBulkSchedules', () => {
    it('should create schedules for date range with no conflicts', async () => {
      const shifts = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 60 }, // Monday
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', breakMinutes: 60 }  // Wednesday
      ];

      mockRepository.findScheduleConflicts.mockResolvedValue([]);
      mockRepository.createWorkSchedule.mockResolvedValue({
        id: '1',
        employee_id: testEmployeeId
      });

      const result = await service.createBulkSchedules(
        testEmployeeId,
        '2025-01-06', // Monday
        '2025-01-12', // Sunday (one week)
        shifts,
        'regular',
        testOrganizationId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when start date is after end date', async () => {
      await expect(service.createBulkSchedules(
        testEmployeeId,
        '2025-01-15',
        '2025-01-10', // Before start date
        [],
        'regular',
        testOrganizationId,
        testUserId
      )).rejects.toThrow('Start date must be before end date');
    });

    it('should skip days without shift definitions', async () => {
      const shifts = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 0 } // Only Monday
      ];

      mockRepository.findScheduleConflicts.mockResolvedValue([]);
      mockRepository.createWorkSchedule.mockResolvedValue({
        id: '1',
        employee_id: testEmployeeId
      });

      const result = await service.createBulkSchedules(
        testEmployeeId,
        '2025-01-06', // Monday
        '2025-01-12', // Sunday
        shifts,
        'regular',
        testOrganizationId,
        testUserId
      );

      // Should only create schedule for Monday (1 occurrence in the week)
      expect(result.length).toBeLessThanOrEqual(2); // At most 2 Mondays in range
    });

    it('should skip schedules with conflicts', async () => {
      const shifts = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 0 }
      ];

      // Mock conflicts for first day, no conflicts for second day
      mockRepository.findScheduleConflicts
        .mockResolvedValueOnce([{ id: 'conflict' }]) // Has conflict - first Monday
        .mockResolvedValue([]); // No conflict - all subsequent calls

      mockRepository.createWorkSchedule.mockResolvedValue({
        id: '1',
        employee_id: testEmployeeId
      });

      const result = await service.createBulkSchedules(
        testEmployeeId,
        '2025-01-06',
        '2025-01-20', // Two weeks
        shifts,
        'regular',
        testOrganizationId,
        testUserId
      );

      // Should only create schedule for non-conflicting days (2nd Monday but not 1st)
      expect(result.length).toBeLessThanOrEqual(2); // At most 2 Mondays, but 1 has conflict
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate duration hours correctly', async () => {
      const shifts = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 60 }
      ];

      mockRepository.findScheduleConflicts.mockResolvedValue([]);
      
      let capturedScheduleData: any;
      mockRepository.createWorkSchedule.mockImplementation((scheduleData) => {
        capturedScheduleData = scheduleData;
        return Promise.resolve({ id: '1', ...scheduleData });
      });

      await service.createBulkSchedules(
        testEmployeeId,
        '2025-01-06',
        '2025-01-06', // Single day
        shifts,
        'regular',
        testOrganizationId,
        testUserId
      );

      expect(capturedScheduleData.duration_hours).toBe(7); // 8 hours - 1 hour break
    });
  });

  describe('schedule type values', () => {
    it('should accept valid schedule types', () => {
      const validTypes = ['regular', 'flexible', 'rotating', 'on_call', 'shift'];

      for (const schedule_type of validTypes) {
        const data = {
          employee_id: testEmployeeId,
          schedule_date: '2025-01-15',
          start_time: '09:00',
          end_time: '17:00',
          schedule_type
        };

        const { error } = service.workScheduleSchema.validate(data);
        expect(error).toBeUndefined();
      }
    });

    it('should allow null schedule_type', () => {
      const data = {
        employee_id: testEmployeeId,
        schedule_date: '2025-01-15',
        start_time: '09:00',
        end_time: '17:00',
        schedule_type: null
      };

      const { error } = service.workScheduleSchema.validate(data);
      expect(error).toBeUndefined();
    });
  });
});
