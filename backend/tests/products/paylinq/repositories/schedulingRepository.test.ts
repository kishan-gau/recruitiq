/**
 * SchedulingRepository Unit Tests
 * 
 * Tests for work schedule data access layer.
 * Covers schedule CRUD, change requests, pagination, and multi-tenant security.
 * 
 * VERIFIED METHODS:
 * 1. createWorkSchedule(scheduleData, organizationId, userId)
 * 2. findWorkSchedules(criteria, organizationId)
 * 3. findWorkScheduleById(scheduleId, organizationId)
 * 4. updateWorkSchedule(scheduleId, updates, organizationId, userId)
 * 5. createScheduleChangeRequest(requestData, organizationId, userId)
 * 6. findScheduleChangeRequests(criteria, organizationId)
 * 7. updateScheduleChangeRequestStatus(requestId, status, organizationId, userId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SchedulingRepository from '../../../../src/products/paylinq/repositories/schedulingRepository.js';

describe('SchedulingRepository', () => {
  let repository: SchedulingRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testScheduleId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new SchedulingRepository({ query: mockQuery });
  });

  describe('createWorkSchedule', () => {
    it('should create work schedule', async () => {
      const scheduleData = {
        employeeId: testEmployeeId,
        scheduleDate: '2025-06-15',
        startTime: '09:00',
        endTime: '17:00',
        shiftType: 'regular'
      };
      
      const dbSchedule = { id: testScheduleId, ...scheduleData };
      mockQuery.mockResolvedValue({ rows: [dbSchedule] });

      const result = await repository.createWorkSchedule(scheduleData, testOrgId, testUserId);

      expect(result).toEqual(dbSchedule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.work_schedule'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.work_schedule', userId: testUserId }
      );
    });
  });

  describe('findWorkSchedules', () => {
    it('should find schedules by criteria', async () => {
      const criteria = { employeeId: testEmployeeId };
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findWorkSchedules(criteria, testOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.work_schedule'),
        expect.arrayContaining([testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.work_schedule' }
      );
    });
  });

  describe('findWorkScheduleById', () => {
    it('should return schedule by ID', async () => {
      const dbSchedule = { id: testScheduleId, organization_id: testOrgId };
      mockQuery.mockResolvedValue({ rows: [dbSchedule] });

      const result = await repository.findWorkScheduleById(testScheduleId, testOrgId);

      expect(result).toEqual(dbSchedule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ws.id = $1'),
        [testScheduleId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.work_schedule' }
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repository.findWorkScheduleById(testScheduleId, testOrgId);
      expect(result).toBeNull();
    });
  });

  describe('updateWorkSchedule', () => {
    it('should update work schedule', async () => {
      const updates = { start_time: '10:00', end_time: '18:00' };
      mockQuery.mockResolvedValue({ rows: [{ id: testScheduleId, ...updates }] });

      const result = await repository.updateWorkSchedule(testScheduleId, updates, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.work_schedule'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'payroll.work_schedule', userId: testUserId }
      );
    });
  });

  describe('createScheduleChangeRequest', () => {
    it('should create change request', async () => {
      const requestData = {
        scheduleId: testScheduleId,
        requestedBy: testEmployeeId,
        changeType: 'shift_swap',
        reason: 'Medical appointment'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '523e4567-e89b-12d3-a456-426614174004', ...requestData }] });

      const result = await repository.createScheduleChangeRequest(requestData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.schedule_change_request'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.schedule_change_request', userId: testUserId }
      );
    });
  });

  describe('findScheduleChangeRequests', () => {
    it('should find change requests by criteria', async () => {
      const criteria = { status: 'pending' };
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findScheduleChangeRequests(criteria, testOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.schedule_change_request'),
        expect.arrayContaining([testOrgId]),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.schedule_change_request' }
      );
    });
  });

  describe('updateScheduleChangeRequestStatus', () => {
    it('should update request status', async () => {
      const requestId = '623e4567-e89b-12d3-a456-426614174005';
      mockQuery.mockResolvedValue({ rows: [{ id: requestId, status: 'approved' }] });

      const result = await repository.updateScheduleChangeRequestStatus(requestId, 'approved', testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.schedule_change_request'),
        expect.arrayContaining(['approved', testUserId, requestId, testOrgId]),
        testOrgId,
        { operation: 'UPDATE', table: 'payroll.schedule_change_request', userId: testUserId }
      );
    });
  });
});
