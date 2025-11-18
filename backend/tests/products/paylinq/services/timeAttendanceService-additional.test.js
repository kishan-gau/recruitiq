/**
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-services
 * @group time-attendance-additional
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceService from '../../../../src/products/paylinq/services/timeAttendanceService.js';
import { NotFoundError } from '../../../../src/middleware/errorHandler.js';

jest.mock('../../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('TimeAttendanceService - Additional Methods', () => {
  let service;
  let mockRepository;
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174000';
  const timeEntryId = '423e4567-e89b-12d3-a456-426614174000';
  const timesheetId = '523e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      // Clock event methods
      findActiveClockEntries: jest.fn(),
      findClockEventsByEmployee: jest.fn(),
      
      // Time entry methods
      findTimeEntries: jest.fn(),
      findTimeEntryById: jest.fn(),
      updateTimeEntry: jest.fn(),
      updateTimeEntryStatus: jest.fn(),
      deleteTimeEntry: jest.fn(),
      findEmployeePayComponents: jest.fn(),
      createRatedTimeLine: jest.fn(),
      getHoursSummary: jest.fn(),
      createTimeEntry: jest.fn(),
      
      // Timesheet methods
      createTimesheet: jest.fn(),
      findTimesheetsByOrganization: jest.fn(),
      findTimesheetsByEmployee: jest.fn(),
      findTimesheetsByPayrollRun: jest.fn(),
      findTimesheetById: jest.fn(),
      updateTimesheet: jest.fn(),
      submitTimesheet: jest.fn(),
      approveTimesheet: jest.fn(),
      rejectTimesheet: jest.fn(),
      deleteTimesheet: jest.fn(),
    };

    // Inject mock repository
    service = new TimeAttendanceService();
    service.timeAttendanceRepository = mockRepository;
  });

  // ==================== ALIAS METHODS ====================

  describe('getActiveClockEntries', () => {
    it('should return active clock entries', async () => {
      // Arrange
      const mockEntries = [
        { id: 'entry-1', employee_id: testEmployeeId, event_type: 'clock_in' },
        { id: 'entry-2', employee_id: 'other-employee', event_type: 'clock_in' }
      ];
      mockRepository.findActiveClockEntries.mockResolvedValue(mockEntries);

      // Act
      const result = await service.getActiveClockEntries(testOrgId);

      // Assert
      expect(result).toEqual(mockEntries);
      expect(result.length).toBe(2);
      expect(mockRepository.findActiveClockEntries).toHaveBeenCalledWith(testOrgId);
    });

    it('should return empty array when no active entries', async () => {
      // Arrange
      mockRepository.findActiveClockEntries.mockResolvedValue([]);

      // Act
      const result = await service.getActiveClockEntries(testOrgId);

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getClockHistoryByEmployee', () => {
    it('should return clock history for employee', async () => {
      // Arrange
      const mockHistory = [
        { id: 'event-1', event_type: 'clock_in', event_timestamp: new Date() },
        { id: 'event-2', event_type: 'clock_out', event_timestamp: new Date() }
      ];
      mockRepository.findClockEventsByEmployee.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getClockHistoryByEmployee(testEmployeeId, testOrgId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockRepository.findClockEventsByEmployee).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId,
        {}
      );
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = {
        fromDate: '2025-01-01',
        toDate: '2025-01-31'
      };
      mockRepository.findClockEventsByEmployee.mockResolvedValue([]);

      // Act
      await service.getClockHistoryByEmployee(testEmployeeId, testOrgId, filters);

      // Assert
      expect(mockRepository.findClockEventsByEmployee).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId,
        filters
      );
    });
  });

  describe('getTimeEntriesByOrganization', () => {
    it('should delegate to getTimeEntries method', async () => {
      // Arrange
      const mockEntries = [{ id: 'entry-1' }];
      mockRepository.findTimeEntries = jest.fn().mockResolvedValue(mockEntries);

      // Act
      const result = await service.getTimeEntriesByOrganization(testOrgId);

      // Assert
      expect(result).toEqual(mockEntries);
    });
  });

  // ==================== BULK OPERATIONS ====================

  describe('bulkApproveTimeEntries', () => {
    it('should approve multiple time entries successfully', async () => {
      // Arrange
      const timeEntryIds = ['entry-1', 'entry-2', 'entry-3'];
      
      // Mock each time entry approval
      const mockEntry1 = { id: 'entry-1', status: 'approved' };
      const mockEntry2 = { id: 'entry-2', status: 'approved' };
      const mockEntry3 = { id: 'entry-3', status: 'approved' };

      mockRepository.findTimeEntryById
        .mockResolvedValueOnce(mockEntry1)
        .mockResolvedValueOnce(mockEntry2)
        .mockResolvedValueOnce(mockEntry3);

      mockRepository.updateTimeEntryStatus
        .mockResolvedValueOnce(mockEntry1)
        .mockResolvedValueOnce(mockEntry2)
        .mockResolvedValueOnce(mockEntry3);

      // Mock pay components (needed for createRatedTimeLines)
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        {
          id: 'comp-1',
          component_code: 'REGULAR_PAY',
          default_rate: 25.0,
          category: 'regular_pay'
        }
      ]);
      
      mockRepository.createRatedTimeLine.mockResolvedValue({ id: 'line-1' });

      // Act
      const result = await service.bulkApproveTimeEntries(timeEntryIds, testOrgId, testUserId);

      // Assert
      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle partial failures in bulk approval', async () => {
      // Arrange
      const timeEntryIds = ['entry-1', 'entry-2', 'entry-3'];
      
      // First entry succeeds
      mockRepository.findTimeEntryById
        .mockResolvedValueOnce({ id: 'entry-1', status: 'pending' })
        .mockResolvedValueOnce(null) // Second entry not found
        .mockResolvedValueOnce({ id: 'entry-3', status: 'pending' });

      mockRepository.updateTimeEntryStatus
        .mockResolvedValueOnce({ id: 'entry-1', status: 'approved' })
        .mockResolvedValueOnce({ id: 'entry-3', status: 'approved' });

      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { id: 'comp-1', component_code: 'REGULAR_PAY', default_rate: 25.0 }
      ]);
      mockRepository.createRatedTimeLine.mockResolvedValue({ id: 'line-1' });

      // Act
      const result = await service.bulkApproveTimeEntries(timeEntryIds, testOrgId, testUserId);

      // Assert
      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results.some(r => !r.success)).toBe(true);
    });

    it('should return all failures when all entries fail', async () => {
      // Arrange
      const timeEntryIds = ['entry-1', 'entry-2'];
      
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act
      const result = await service.bulkApproveTimeEntries(timeEntryIds, testOrgId, testUserId);

      // Assert
      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.results.every(r => !r.success)).toBe(true);
    });
  });

  // ==================== DELETE OPERATIONS ====================

  describe('deleteTimeEntry', () => {
    it('should soft delete time entry', async () => {
      // Arrange
      mockRepository.deleteTimeEntry.mockResolvedValue(true);

      // Act
      const result = await service.deleteTimeEntry(timeEntryId, testOrgId, testUserId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.deleteTimeEntry).toHaveBeenCalledWith(
        timeEntryId,
        testOrgId,
        testUserId
      );
    });

    it('should return false when time entry does not exist', async () => {
      // Arrange
      mockRepository.deleteTimeEntry.mockResolvedValue(false);

      // Act
      const result = await service.deleteTimeEntry('non-existent-id', testOrgId, testUserId);
      
      // Assert - service doesn't throw, just returns false
      expect(result).toBe(false);
    });

    it('should delegate deletion to repository', async () => {
      // Arrange - service doesn't validate status, repository handles it
      mockRepository.deleteTimeEntry.mockResolvedValue(true);

      // Act
      const result = await service.deleteTimeEntry(timeEntryId, testOrgId, testUserId);
      
      // Assert
      expect(result).toBe(true);
      expect(mockRepository.deleteTimeEntry).toHaveBeenCalledWith(
        timeEntryId,
        testOrgId,
        testUserId
      );
    });
  });

  // ==================== HOURS SUMMARY ====================

  describe('getHoursSummary', () => {
    it('should return hours summary for employee', async () => {
      // Arrange
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const mockSummary = {
        employee_id: testEmployeeId,
        total_hours: 160,
        regular_hours: 140,
        overtime_hours: 20,
        pto_hours: 0
      };
      mockRepository.getHoursSummary.mockResolvedValue(mockSummary);

      // Act
      const result = await service.getHoursSummary(
        testEmployeeId,
        fromDate,
        toDate,
        testOrgId
      );

      // Assert
      expect(result).toEqual(mockSummary);
      expect(mockRepository.getHoursSummary).toHaveBeenCalledWith(
        testEmployeeId,
        fromDate,
        toDate,
        testOrgId
      );
    });

    it('should handle empty hours summary', async () => {
      // Arrange
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');
      const emptySummary = {
        employee_id: testEmployeeId,
        total_hours: 0,
        regular_hours: 0,
        overtime_hours: 0,
        pto_hours: 0
      };
      mockRepository.getHoursSummary.mockResolvedValue(emptySummary);

      // Act
      const result = await service.getHoursSummary(
        testEmployeeId,
        fromDate,
        toDate,
        testOrgId
      );

      // Assert
      expect(result.total_hours).toBe(0);
    });
  });

  // ==================== TIMESHEET OPERATIONS ====================

  describe('createTimesheet', () => {
    it('should create timesheet with valid data', async () => {
      // Arrange
      const timesheetData = {
        employeeId: testEmployeeId,  // Service maps employeeId → employeeRecordId
        periodStart: '2025-01-01',
        workedHours: 40,
        regularHours: 40,
        overtimeHours: 0
      };
      const mockCreatedEntry = {
        id: timesheetId,
        employee_record_id: testEmployeeId,
        worked_hours: 40,
        status: 'draft'
      };
      // createTimesheet calls createTimeEntry internally
      mockRepository.createTimeEntry.mockResolvedValue(mockCreatedEntry);

      // Act
      const result = await service.createTimesheet(timesheetData, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(mockCreatedEntry);
      expect(mockRepository.createTimeEntry).toHaveBeenCalled();
    });
  });

  describe('getTimesheetsByOrganization', () => {
    it('should return timesheets for organization', async () => {
      // Arrange
      const mockTimesheets = [
        { id: 'timesheet-1', status: 'submitted' },
        { id: 'timesheet-2', status: 'draft' }
      ];
      // getTimesheetsByOrganization → getTimeEntriesByOrganization → getTimeEntries → findTimeEntries
      mockRepository.findTimeEntries.mockResolvedValue(mockTimesheets);

      // Act
      const result = await service.getTimesheetsByOrganization(testOrgId);

      // Assert
      expect(result).toEqual(mockTimesheets);
      expect(mockRepository.findTimeEntries).toHaveBeenCalledWith(
        {},
        testOrgId
      );
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = { status: 'submitted' };
      mockRepository.findTimeEntries.mockResolvedValue([]);

      // Act
      await service.getTimesheetsByOrganization(testOrgId, filters);

      // Assert
      expect(mockRepository.findTimeEntries).toHaveBeenCalledWith(
        filters,
        testOrgId
      );
    });
  });

  describe('getTimesheetsByEmployee', () => {
    it('should return timesheets for employee', async () => {
      // Arrange
      const mockTimesheets = [{ id: timesheetId, employee_record_id: testEmployeeId }];
      mockRepository.findTimeEntries.mockResolvedValue(mockTimesheets);

      // Act
      const result = await service.getTimesheetsByEmployee(testEmployeeId, testOrgId);

      // Assert
      expect(result).toEqual(mockTimesheets);
      expect(mockRepository.findTimeEntries).toHaveBeenCalledWith(
        { employeeRecordId: testEmployeeId },
        testOrgId
      );
    });
  });

  describe('getTimesheetsByPayrollRun', () => {
    it('should return timesheets for payroll run', async () => {
      // Arrange
      const payrollRunId = 'run-123';
      const mockTimesheets = [{ id: timesheetId, payroll_run_id: payrollRunId }];
      mockRepository.findTimeEntries.mockResolvedValue(mockTimesheets);

      // Act
      const result = await service.getTimesheetsByPayrollRun(payrollRunId, testOrgId);

      // Assert
      expect(result).toEqual(mockTimesheets);
      expect(mockRepository.findTimeEntries).toHaveBeenCalledWith(
        { payrollRunId: payrollRunId },
        testOrgId
      );
    });
  });

  describe('getTimesheetById', () => {
    it('should return timesheet by ID', async () => {
      // Arrange
      const mockTimesheet = { id: timesheetId, status: 'draft' };
      mockRepository.findTimeEntryById.mockResolvedValue(mockTimesheet);

      // Act
      const result = await service.getTimesheetById(timesheetId, testOrgId);

      // Assert
      expect(result).toEqual(mockTimesheet);
      expect(mockRepository.findTimeEntryById).toHaveBeenCalledWith(timesheetId, testOrgId);
    });

    it('should return null when timesheet not found', async () => {
      // Arrange
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act
      const result = await service.getTimesheetById('non-existent-id', testOrgId);
      
      // Assert - service returns null, doesn't throw
      expect(result).toBeNull();
    });
  });

  describe('updateTimesheet', () => {
    it('should update timesheet', async () => {
      // Arrange
      const updateData = { notes: 'Updated notes' };
      const existingTimesheet = { id: timesheetId, status: 'draft' };
      const updatedTimesheet = { ...existingTimesheet, ...updateData };
      
      mockRepository.findTimeEntryById.mockResolvedValue(existingTimesheet);
      mockRepository.updateTimeEntry.mockResolvedValue(updatedTimesheet);

      // Act
      const result = await service.updateTimesheet(timesheetId, testOrgId, updateData);

      // Assert
      expect(result).toEqual(updatedTimesheet);
      expect(mockRepository.findTimeEntryById).toHaveBeenCalledWith(timesheetId, testOrgId);
    });

    it('should throw error when timesheet not found', async () => {
      // Arrange
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act & Assert - getTimeEntryById returns null, updateTimeEntry tries to access null.status
      await expect(
        service.updateTimesheet(timesheetId, testOrgId, {})
      ).rejects.toThrow();
    });

    it('should prevent updates to submitted timesheets', async () => {
      // Arrange
      const submittedTimesheet = { id: timesheetId, status: 'submitted' };
      mockRepository.findTimeEntryById.mockResolvedValue(submittedTimesheet);

      // Act & Assert
      await expect(
        service.updateTimesheet(timesheetId, testOrgId, { notes: 'test' })
      ).rejects.toThrow('Cannot update time entry with status');
    });
  });

  describe('submitTimesheet', () => {
    it('should submit draft timesheet', async () => {
      // Arrange
      const draftTimesheet = { id: timesheetId, status: 'draft' };
      const submittedTimesheet = { ...draftTimesheet, status: 'submitted' };
      
      mockRepository.findTimeEntryById.mockResolvedValue(draftTimesheet);
      mockRepository.updateTimeEntry.mockResolvedValue(submittedTimesheet);

      // Act
      const result = await service.submitTimesheet(timesheetId, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(submittedTimesheet);
      expect(mockRepository.findTimeEntryById).toHaveBeenCalledWith(timesheetId, testOrgId);
    });

    it('should throw error when timesheet already submitted', async () => {
      // Arrange
      const submittedTimesheet = { id: timesheetId, status: 'submitted' };
      mockRepository.findTimeEntryById.mockResolvedValue(submittedTimesheet);

      // Act & Assert
      await expect(
        service.submitTimesheet(timesheetId, testOrgId, testUserId)
      ).rejects.toThrow('Only draft timesheets can be submitted');
    });

    it('should throw NotFoundError when timesheet not found', async () => {
      // Arrange
      mockRepository.findTimesheetById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitTimesheet(timesheetId, testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('approveTimesheet', () => {
    it('should approve submitted timesheet', async () => {
      // Arrange
      const approvedEntry = {
        id: timesheetId,
        status: 'approved',
        employee_id: testEmployeeId,
        regular_hours: 40,
        overtime_hours: 0
      };
      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([]);
      mockRepository.createRatedTimeLine.mockResolvedValue({ id: 'line-1' });

      // Act
      const result = await service.approveTimesheet(timesheetId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.updateTimeEntryStatus).toHaveBeenCalledWith(
        timesheetId,
        'approved',
        testOrgId,
        testUserId
      );
      expect(result).toEqual(approvedEntry);
    });

    it('should throw error when timesheet update fails', async () => {
      // Arrange
      const error = new Error('Update failed');
      mockRepository.updateTimeEntryStatus.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.approveTimesheet(timesheetId, testOrgId, testUserId)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('rejectTimesheet', () => {
    it('should reject submitted timesheet with reason', async () => {
      // Arrange
      const submittedTimesheet = { id: timesheetId, status: 'submitted' };
      const rejectionReason = 'Missing clock entries for Jan 5';
      const rejectedTimesheet = { ...submittedTimesheet, status: 'rejected', notes: rejectionReason };
      
      mockRepository.findTimeEntryById.mockResolvedValue(submittedTimesheet);
      mockRepository.updateTimeEntry.mockResolvedValue(rejectedTimesheet);

      // Act
      const result = await service.rejectTimesheet(timesheetId, testOrgId, testUserId, rejectionReason);

      // Assert
      expect(mockRepository.findTimeEntryById).toHaveBeenCalledWith(timesheetId, testOrgId);
      expect(mockRepository.updateTimeEntry).toHaveBeenCalledWith(
        timesheetId,
        { status: 'rejected', notes: rejectionReason },
        testOrgId,
        testUserId
      );
      expect(result).toEqual(rejectedTimesheet);
    });


    it('should throw NotFoundError when timesheet not found', async () => {
      // Arrange
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.rejectTimesheet(timesheetId, testOrgId, testUserId, 'reason')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTimesheet', () => {
    it('should soft delete draft timesheet', async () => {
      // Arrange
      mockRepository.deleteTimeEntry.mockResolvedValue(true);

      // Act
      const result = await service.deleteTimesheet(timesheetId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.deleteTimeEntry).toHaveBeenCalledWith(
        timesheetId,
        testOrgId,
        testUserId
      );
      expect(result).toBe(true);
    });

    it('should return false when timesheet not found', async () => {
      // Arrange
      mockRepository.deleteTimeEntry.mockResolvedValue(false);

      // Act
      const result = await service.deleteTimesheet(timesheetId, testOrgId, testUserId);

      // Assert
      expect(result).toBe(false);
    });

    it('should delegate deletion to deleteTimeEntry', async () => {
      // Arrange
      mockRepository.deleteTimeEntry.mockResolvedValue(true);

      // Act
      const result = await service.deleteTimesheet(timesheetId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.deleteTimeEntry).toHaveBeenCalledWith(
        timesheetId,
        testOrgId,
        testUserId
      );
      expect(result).toBe(true);
    });
  });
});
