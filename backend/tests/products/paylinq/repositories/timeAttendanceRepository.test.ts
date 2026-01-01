/**
 * TimeAttendanceRepository Unit Tests
 * 
 * Tests for time and attendance data access layer.
 * Covers shift types, clock events, time entries, and rated time tracking.
 * 
 * VERIFIED METHODS:
 * 1. createShiftType(shiftData, organizationId, userId)
 * 2. findShiftTypes(organizationId, filters)
 * 3. findShiftTypeById(shiftTypeId, organizationId)
 * 4. updateShiftType(shiftTypeId, updateData, organizationId, userId)
 * 5. createTimeEvent(eventData, organizationId, userId)
 * 6. findOpenClockEvent(employeeId, organizationId)
 * 7. findTimeEvents(employeeId, organizationId, filters)
 * 8. createTimeEntry(entryData, organizationId, userId)
 * 9. findTimeEntryById(timeEntryId, organizationId)
 * 10. findTimeEntries(criteria, organizationId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceRepository from '../../../../src/products/paylinq/repositories/timeAttendanceRepository.js';

describe('TimeAttendanceRepository', () => {
  let repository: TimeAttendanceRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testShiftTypeId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';
  const testTimeEntryId = '523e4567-e89b-12d3-a456-426614174004';
  const testEventId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new TimeAttendanceRepository({ query: mockQuery });
  });

  describe('createShiftType', () => {
    it('should create shift type', async () => {
      const shiftData = {
        shiftName: 'Morning Shift',
        shiftCode: 'MORNING',
        startTime: '08:00',
        endTime: '16:00',
        breakDuration: 60
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testShiftTypeId, ...shiftData }] });

      const result = await repository.createShiftType(shiftData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shift_types'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'shift_types' }
      );
    });
  });

  describe('findShiftTypes', () => {
    it('should return all shift types for organization', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testShiftTypeId }] });

      const result = await repository.findShiftTypes(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM shift_types'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'shift_types' }
      );
    });

    it('should filter by active status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findShiftTypes(testOrgId, { isActive: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = $'),
        expect.arrayContaining([testOrgId, true]),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('findShiftTypeById', () => {
    it('should return shift type by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testShiftTypeId, organization_id: testOrgId }] });

      const result = await repository.findShiftTypeById(testShiftTypeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testShiftTypeId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'shift_types' }
      );
    });
  });

  describe('updateShiftType', () => {
    it('should update shift type', async () => {
      const updates = { shiftName: 'Updated Shift', breakDuration: 45 };
      mockQuery.mockResolvedValue({ rows: [{ id: testShiftTypeId, ...updates }] });

      const result = await repository.updateShiftType(testShiftTypeId, updates, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shift_types'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'shift_types' }
      );
    });
  });

  describe('createTimeEvent', () => {
    it('should create clock-in event', async () => {
      const eventData = {
        employeeId: testEmployeeId,
        eventType: 'clock_in',
        eventTimestamp: new Date(),
        location: 'Office'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testEventId, ...eventData }] });

      const result = await repository.createTimeEvent(eventData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO time_events'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'time_events' }
      );
    });
  });

  describe('findOpenClockEvent', () => {
    it('should return open clock event for employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testEventId, event_type: 'clock_in', clock_out_time: null }] });

      const result = await repository.findOpenClockEvent(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        expect.arrayContaining([testEmployeeId, testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'time_events' }
      );
    });

    it('should return null when no open event', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findOpenClockEvent(testEmployeeId, testOrgId);

      expect(result).toBeNull();
    });
  });

  describe('findTimeEvents', () => {
    it('should return time events for employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testEventId }] });

      const result = await repository.findTimeEvents(testEmployeeId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE employee_id = $1'),
        [testEmployeeId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'time_events' }
      );
    });

    it('should filter by date range', async () => {
      const filters = {
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30')
      };
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findTimeEvents(testEmployeeId, testOrgId, filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND event_timestamp >= $'),
        expect.any(Array),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('createTimeEntry', () => {
    it('should create time entry', async () => {
      const entryData = {
        employeeId: testEmployeeId,
        workDate: '2025-06-15',
        startTime: '08:00',
        endTime: '17:00',
        hoursWorked: 9.0,
        status: 'submitted'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testTimeEntryId, ...entryData }] });

      const result = await repository.createTimeEntry(entryData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO time_entries'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'time_entries' }
      );
    });
  });

  describe('findTimeEntryById', () => {
    it('should return time entry by ID', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTimeEntryId, organization_id: testOrgId }] });

      const result = await repository.findTimeEntryById(testTimeEntryId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testTimeEntryId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'time_entries' }
      );
    });
  });

  describe('findTimeEntries', () => {
    it('should find time entries by criteria', async () => {
      const criteria = { employeeId: testEmployeeId, status: 'submitted' };
      mockQuery.mockResolvedValue({ rows: [{ id: testTimeEntryId }] });

      const result = await repository.findTimeEntries(criteria, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM time_entries'),
        expect.arrayContaining([testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'time_entries' }
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findTimeEntries({ status: 'approved' }, testOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $'),
        expect.arrayContaining([testOrgId, 'approved']),
        testOrgId,
        expect.any(Object)
      );
    });
  });
});
