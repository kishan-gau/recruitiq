/**
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-dto
 * @group scheduling-dto
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapScheduleDbToApi,
  mapSchedulesDbToApi,
  mapScheduleApiToDb,
  mapScheduleChangeRequestDbToApi,
  mapScheduleChangeRequestsDbToApi,
  mapScheduleChangeRequestApiToDb,
} from '../../../../src/products/paylinq/dto/schedulingDto.js';

describe('SchedulingDto - Schedule Transformations', () => {
  describe('mapScheduleDbToApi', () => {
    it('should transform DB schedule to API format', () => {
      // Arrange
      const dbSchedule = {
        id: 'schedule-123',
        employee_id: 'emp-456',
        shift_type_id: 'shift-789',
        schedule_date: '2025-01-15',
        start_time: '08:00',
        end_time: '16:00',
        break_duration_minutes: 60,
        notes: 'Test schedule',
        status: 'scheduled',
        organization_id: 'org-123',
        created_at: new Date('2025-01-01T10:00:00Z'),
        updated_at: new Date('2025-01-02T10:00:00Z'),
        created_by: 'user-123',
        updated_by: 'user-456',
        // Joined fields from shift_type table
        shift_name: 'Morning Shift',
        shift_code: 'MORNING',
        // Joined fields from employee table
        employee_number: 'EMP001',
      };

      // Act
      const result = mapScheduleDbToApi(dbSchedule);

      // Assert
      expect(result).toEqual({
        id: 'schedule-123',
        employeeId: 'emp-456',
        shiftTypeId: 'shift-789',
        scheduleDate: '2025-01-15',
        startTime: '08:00',
        endTime: '16:00',
        breakDurationMinutes: 60,
        notes: 'Test schedule',
        status: 'scheduled',
        organizationId: 'org-123',
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-02T10:00:00Z'),
        createdBy: 'user-123',
        updatedBy: 'user-456',
        // Joined fields in camelCase
        shiftName: 'Morning Shift',
        shiftCode: 'MORNING',
        employeeNumber: 'EMP001',
      });
    });

    it('should handle null values correctly', () => {
      // Arrange
      const dbSchedule = {
        id: 'schedule-123',
        employee_id: 'emp-456',
        shift_type_id: null,
        schedule_date: '2025-01-15',
        start_time: '08:00',
        end_time: '16:00',
        break_duration_minutes: null,
        notes: null,
        status: 'scheduled',
        organization_id: 'org-123',
        created_at: new Date('2025-01-01T10:00:00Z'),
        updated_at: null,
        created_by: 'user-123',
        updated_by: null,
        shift_name: null,
        shift_code: null,
        employee_number: null,
      };

      // Act
      const result = mapScheduleDbToApi(dbSchedule);

      // Assert
      expect(result.shiftTypeId).toBeNull();
      expect(result.breakDurationMinutes).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.updatedAt).toBeNull();
      expect(result.updatedBy).toBeNull();
      expect(result.shiftName).toBeNull();
      expect(result.shiftCode).toBeNull();
      expect(result.employeeNumber).toBeNull();
    });

    it('should return null for null input', () => {
      // Act
      const result = mapScheduleDbToApi(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Act
      const result = mapScheduleDbToApi(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should preserve all joined fields from shift_type', () => {
      // Arrange
      const dbSchedule = {
        id: 'schedule-123',
        employee_id: 'emp-456',
        shift_type_id: 'shift-789',
        schedule_date: '2025-01-15',
        start_time: '08:00',
        end_time: '16:00',
        status: 'scheduled',
        organization_id: 'org-123',
        created_at: new Date('2025-01-01T10:00:00Z'),
        created_by: 'user-123',
        shift_name: 'Night Shift',
        shift_code: 'NIGHT',
      };

      // Act
      const result = mapScheduleDbToApi(dbSchedule);

      // Assert
      expect(result.shiftName).toBe('Night Shift');
      expect(result.shiftCode).toBe('NIGHT');
    });
  });

  describe('mapSchedulesDbToApi', () => {
    it('should transform array of DB schedules to API format', () => {
      // Arrange
      const dbSchedules = [
        {
          id: 'schedule-1',
          employee_id: 'emp-1',
          shift_type_id: 'shift-1',
          schedule_date: '2025-01-15',
          start_time: '08:00',
          end_time: '16:00',
          status: 'scheduled',
          organization_id: 'org-123',
          created_at: new Date('2025-01-01T10:00:00Z'),
          created_by: 'user-123',
          shift_name: 'Morning Shift',
          shift_code: 'MORNING',
          employee_number: 'EMP001',
        },
        {
          id: 'schedule-2',
          employee_id: 'emp-2',
          shift_type_id: 'shift-2',
          schedule_date: '2025-01-16',
          start_time: '16:00',
          end_time: '00:00',
          status: 'scheduled',
          organization_id: 'org-123',
          created_at: new Date('2025-01-01T10:00:00Z'),
          created_by: 'user-123',
          shift_name: 'Afternoon Shift',
          shift_code: 'AFTERNOON',
          employee_number: 'EMP002',
        },
      ];

      // Act
      const result = mapSchedulesDbToApi(dbSchedules);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('schedule-1');
      expect(result[0].shiftName).toBe('Morning Shift');
      expect(result[1].id).toBe('schedule-2');
      expect(result[1].shiftName).toBe('Afternoon Shift');
    });

    it('should return empty array for null input', () => {
      // Act
      const result = mapSchedulesDbToApi(null);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      // Act
      const result = mapSchedulesDbToApi(undefined);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      // Act
      const result = mapSchedulesDbToApi('not an array');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      // Act
      const result = mapSchedulesDbToApi([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mapScheduleApiToDb', () => {
    it('should transform API schedule to DB format', () => {
      // Arrange
      const apiSchedule = {
        employeeId: 'emp-456',
        shiftTypeId: 'shift-789',
        scheduleDate: '2025-01-15',
        startTime: '08:00',
        endTime: '16:00',
        breakDurationMinutes: 60,
        notes: 'Test schedule',
        status: 'scheduled',
      };

      // Act
      const result = mapScheduleApiToDb(apiSchedule);

      // Assert
      expect(result).toEqual({
        employee_id: 'emp-456',
        shift_type_id: 'shift-789',
        schedule_date: '2025-01-15',
        start_time: '08:00',
        end_time: '16:00',
        break_duration_minutes: 60,
        notes: 'Test schedule',
        status: 'scheduled',
      });
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiSchedule = {
        employeeId: 'emp-456',
        shiftTypeId: 'shift-789',
        scheduleDate: '2025-01-15',
        // Other fields undefined
      };

      // Act
      const result = mapScheduleApiToDb(apiSchedule);

      // Assert
      expect(result).toEqual({
        employee_id: 'emp-456',
        shift_type_id: 'shift-789',
        schedule_date: '2025-01-15',
      });
      expect(result.start_time).toBeUndefined();
      expect(result.end_time).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });

    it('should return null for null input', () => {
      // Act
      const result = mapScheduleApiToDb(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle partial updates with only changed fields', () => {
      // Arrange
      const apiSchedule = {
        notes: 'Updated notes',
        status: 'confirmed',
      };

      // Act
      const result = mapScheduleApiToDb(apiSchedule);

      // Assert
      expect(result).toEqual({
        notes: 'Updated notes',
        status: 'confirmed',
      });
      expect(Object.keys(result)).toHaveLength(2);
    });
  });

  describe('mapScheduleChangeRequestDbToApi', () => {
    it('should transform DB change request to API format', () => {
      // Arrange
      const dbChangeRequest = {
        id: 'request-123',
        schedule_id: 'schedule-456',
        requested_by: 'user-789',
        change_type: 'shift_swap',
        requested_date: '2025-01-20',
        requested_shift_type_id: 'shift-999',
        reason: 'Personal emergency',
        status: 'pending',
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        organization_id: 'org-123',
        created_at: new Date('2025-01-15T10:00:00Z'),
        updated_at: null,
        // Joined fields
        requester_name: 'John Doe',
        approver_name: null,
      };

      // Act
      const result = mapScheduleChangeRequestDbToApi(dbChangeRequest);

      // Assert
      expect(result).toEqual({
        id: 'request-123',
        scheduleId: 'schedule-456',
        requestedBy: 'user-789',
        changeType: 'shift_swap',
        requestedDate: '2025-01-20',
        requestedShiftTypeId: 'shift-999',
        reason: 'Personal emergency',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        organizationId: 'org-123',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: null,
        requesterName: 'John Doe',
        approverName: null,
      });
    });

    it('should return null for null input', () => {
      // Act
      const result = mapScheduleChangeRequestDbToApi(null);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('mapScheduleChangeRequestsDbToApi', () => {
    it('should transform array of DB change requests to API format', () => {
      // Arrange
      const dbChangeRequests = [
        {
          id: 'request-1',
          schedule_id: 'schedule-1',
          requested_by: 'user-1',
          change_type: 'shift_swap',
          status: 'pending',
          organization_id: 'org-123',
          created_at: new Date('2025-01-15T10:00:00Z'),
          requester_name: 'John Doe',
        },
        {
          id: 'request-2',
          schedule_id: 'schedule-2',
          requested_by: 'user-2',
          change_type: 'time_off',
          status: 'approved',
          organization_id: 'org-123',
          created_at: new Date('2025-01-16T10:00:00Z'),
          requester_name: 'Jane Smith',
        },
      ];

      // Act
      const result = mapScheduleChangeRequestsDbToApi(dbChangeRequests);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('request-1');
      expect(result[0].changeType).toBe('shift_swap');
      expect(result[1].id).toBe('request-2');
      expect(result[1].changeType).toBe('time_off');
    });

    it('should return empty array for null input', () => {
      // Act
      const result = mapScheduleChangeRequestsDbToApi(null);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('mapScheduleChangeRequestApiToDb', () => {
    it('should transform API change request to DB format', () => {
      // Arrange
      const apiChangeRequest = {
        scheduleId: 'schedule-456',
        changeType: 'shift_swap',
        requestedDate: '2025-01-20',
        requestedShiftTypeId: 'shift-999',
        reason: 'Personal emergency',
      };

      // Act
      const result = mapScheduleChangeRequestApiToDb(apiChangeRequest);

      // Assert
      expect(result).toEqual({
        schedule_id: 'schedule-456',
        change_type: 'shift_swap',
        requested_date: '2025-01-20',
        requested_shift_type_id: 'shift-999',
        reason: 'Personal emergency',
      });
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiChangeRequest = {
        scheduleId: 'schedule-456',
        changeType: 'time_off',
        // Other fields undefined
      };

      // Act
      const result = mapScheduleChangeRequestApiToDb(apiChangeRequest);

      // Assert
      expect(result).toEqual({
        schedule_id: 'schedule-456',
        change_type: 'time_off',
      });
    });

    it('should return null for null input', () => {
      // Act
      const result = mapScheduleChangeRequestApiToDb(null);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Field Mapping Accuracy', () => {
    it('should correctly map all snake_case to camelCase fields', () => {
      // Arrange
      const dbSchedule = {
        id: 'test',
        employee_id: 'emp',
        shift_type_id: 'shift',
        schedule_date: 'date',
        start_time: 'start',
        end_time: 'end',
        break_duration_minutes: 30,
        notes: 'notes',
        status: 'status',
        organization_id: 'org',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'creator',
        updated_by: 'updater',
        shift_name: 'name',
        shift_code: 'code',
        employee_number: 'num',
      };

      // Act
      const result = mapScheduleDbToApi(dbSchedule);

      // Assert - verify all fields are camelCase
      expect(result).toHaveProperty('employeeId');
      expect(result).toHaveProperty('shiftTypeId');
      expect(result).toHaveProperty('scheduleDate');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('breakDurationMinutes');
      expect(result).toHaveProperty('organizationId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('createdBy');
      expect(result).toHaveProperty('updatedBy');
      expect(result).toHaveProperty('shiftName');
      expect(result).toHaveProperty('shiftCode');
      expect(result).toHaveProperty('employeeNumber');

      // Verify no snake_case fields exist
      expect(result).not.toHaveProperty('employee_id');
      expect(result).not.toHaveProperty('shift_type_id');
      expect(result).not.toHaveProperty('schedule_date');
      expect(result).not.toHaveProperty('start_time');
      expect(result).not.toHaveProperty('end_time');
    });

    it('should correctly map all camelCase to snake_case fields', () => {
      // Arrange
      const apiSchedule = {
        employeeId: 'emp',
        shiftTypeId: 'shift',
        scheduleDate: 'date',
        startTime: 'start',
        endTime: 'end',
        breakDurationMinutes: 30,
        notes: 'notes',
        status: 'status',
      };

      // Act
      const result = mapScheduleApiToDb(apiSchedule);

      // Assert - verify all fields are snake_case
      expect(result).toHaveProperty('employee_id');
      expect(result).toHaveProperty('shift_type_id');
      expect(result).toHaveProperty('schedule_date');
      expect(result).toHaveProperty('start_time');
      expect(result).toHaveProperty('end_time');
      expect(result).toHaveProperty('break_duration_minutes');

      // Verify no camelCase fields exist
      expect(result).not.toHaveProperty('employeeId');
      expect(result).not.toHaveProperty('shiftTypeId');
      expect(result).not.toHaveProperty('scheduleDate');
      expect(result).not.toHaveProperty('startTime');
      expect(result).not.toHaveProperty('endTime');
      expect(result).not.toHaveProperty('breakDurationMinutes');
    });
  });
});
