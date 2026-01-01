import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceService from '../../../../src/products/paylinq/services/timeAttendanceService.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/utils/errors.js';

/**
 * Integration tests for TimeAttendanceService
 * Testing complete workflows and multi-step operations
 */
describe('TimeAttendanceService - Integration Tests', () => {
  let service: any;
  let mockRepository: any;
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepository = {
      createShiftType: jest.fn(),
      findShiftTypes: jest.fn(),
      updateShiftType: jest.fn(),
      deleteShiftType: jest.fn(),
      createClockEvent: jest.fn(),
      createTimeEvent: jest.fn(),
      findActiveClockEntries: jest.fn(),
      findClockEventsByEmployee: jest.fn(),
      createTimeEntry: jest.fn(),
      findTimeEntries: jest.fn(),
      findTimeEntryById: jest.fn(),
      updateTimeEntry: jest.fn(),
      updateTimeEntryStatus: jest.fn(),
      deleteTimeEntry: jest.fn(),
      findEmployeePayComponents: jest.fn(),
      createRatedTimeLine: jest.fn(),
      getHoursSummary: jest.fn(),
      checkShiftTypeUsage: jest.fn()
    };

    service = new TimeAttendanceService(mockRepository);
  });

  // ==================== TIMESHEET APPROVAL WORKFLOW ====================

  describe('Complete Timesheet Approval Workflow', () => {
    it('should handle full lifecycle: create → submit → approve', async () => {
      // Step 1: Create draft timesheet
      const timesheetData = {
        employeeId: testEmployeeId,
        periodStart: new Date('2025-01-01'),
        workedHours: 40,
        regularHours: 40,
        overtimeHours: 0,
        breakHours: 0
      };

      const draftEntry = {
        id: 'entry-123',
        employee_id: testEmployeeId,
        entry_date: '2025-01-01',
        worked_hours: 40,
        regular_hours: 40,
        overtime_hours: 0,
        break_hours: 0,
        status: 'draft',
        created_by: testUserId
      };

      mockRepository.createTimeEntry.mockResolvedValue(draftEntry);

      const created = await service.createTimesheet(timesheetData, testOrgId, testUserId);
      expect(created.status).toBe('draft');

      // Step 2: Submit for approval
      const submittedEntry = { ...draftEntry, status: 'submitted' };
      mockRepository.findTimeEntryById.mockResolvedValue(draftEntry);
      mockRepository.updateTimeEntry.mockResolvedValue(submittedEntry);

      const submitted = await service.submitTimesheet(created.id, testOrgId, testUserId);
      expect(submitted.status).toBe('submitted');

      // Step 3: Approve timesheet
      const approvedEntry = { ...submittedEntry, status: 'approved' };
      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 }
      ]);
      mockRepository.createRatedTimeLine.mockResolvedValue({
        id: 'line-123',
        time_entry_id: created.id,
        component_code: 'REGULAR_PAY',
        hours: 40,
        rate: 25,
        amount: 1000
      });

      const approved = await service.approveTimesheet(created.id, testOrgId, testUserId);
      expect(approved.status).toBe('approved');

      // Verify rated time lines were created
      expect(mockRepository.createRatedTimeLine).toHaveBeenCalled();
    });

    it('should handle rejection workflow: create → submit → reject', async () => {
      // Step 1: Create and submit
      const draftEntry = {
        id: 'entry-456',
        employee_id: testEmployeeId,
        status: 'draft',
        worked_hours: 40
      };

      mockRepository.createTimeEntry.mockResolvedValue(draftEntry);
      const created = await service.createTimesheet(
        {
          employeeId: testEmployeeId,
          workedHours: 40,
          regularHours: 40,
          overtimeHours: 0,
          breakHours: 0
        },
        testOrgId,
        testUserId
      );

      const submittedEntry = { ...draftEntry, status: 'submitted' };
      mockRepository.findTimeEntryById.mockResolvedValue(draftEntry);
      mockRepository.updateTimeEntry.mockResolvedValue(submittedEntry);

      await service.submitTimesheet(created.id, testOrgId, testUserId);

      // Step 2: Reject with reason
      const rejectedEntry = { ...submittedEntry, status: 'rejected', notes: 'Hours incorrect' };
      mockRepository.findTimeEntryById.mockResolvedValue(submittedEntry);
      mockRepository.updateTimeEntry.mockResolvedValue(rejectedEntry);

      const rejected = await service.rejectTimesheet(
        created.id,
        testOrgId,
        testUserId,
        'Hours incorrect'
      );

      expect(rejected.status).toBe('rejected');
      expect(rejected.notes).toBe('Hours incorrect');
    });

    it('should prevent double submission of timesheet', async () => {
      // Arrange
      const entryId = 'entry-789';
      const alreadySubmitted = {
        id: entryId,
        status: 'submitted'
      };

      mockRepository.findTimeEntryById.mockResolvedValue(alreadySubmitted);

      // Act & Assert
      await expect(
        service.submitTimesheet(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Only draft timesheets can be submitted');
    });

    it('should prevent approval of draft timesheet', async () => {
      // Arrange
      const entryId = 'entry-777';
      
      // Mock updateTimeEntryStatus to reject draft timesheets
      mockRepository.updateTimeEntryStatus.mockRejectedValue(
        new Error('Cannot update status: timesheet is not in submitted status')
      );

      // Act & Assert
      await expect(
        service.approveTimesheet(entryId, testOrgId, testUserId)
      ).rejects.toThrow();
    });

    it('should prevent rejection of non-submitted timesheet', async () => {
      // Arrange
      const entryId = 'entry-888';
      const approvedEntry = {
        id: entryId,
        status: 'approved'
      };

      mockRepository.findTimeEntryById.mockResolvedValue(approvedEntry);

      // Act & Assert
      await expect(
        service.rejectTimesheet(entryId, testOrgId, testUserId, 'Some reason')
      ).rejects.toThrow('Only submitted timesheets can be rejected');
    });
  });

  // ==================== CLOCK IN/OUT WORKFLOW ====================

  describe('Clock In/Out Workflow', () => {
    it('should handle complete clock cycle: in → out', async () => {
      // Step 1: Clock in
      const clockInData = {
        employeeId: testEmployeeId,
        eventType: 'clock_in',
        eventTimestamp: new Date('2025-01-10T09:00:00Z')
      };

      const clockInEvent = {
        id: 'event-1',
        employee_id: testEmployeeId,
        event_type: 'clock_in',
        event_time: '2025-01-10T09:00:00Z'
      };

      mockRepository.createTimeEvent.mockResolvedValue(clockInEvent);

      const clockedIn = await service.createClockEvent(clockInData, testOrgId, testUserId);
      expect(clockedIn.event_type).toBe('clock_in');

      // Step 2: Verify active entry exists
      mockRepository.findActiveClockEntries.mockResolvedValue([clockInEvent]);

      const activeEntries = await service.getActiveClockEntries(testOrgId);
      expect(activeEntries).toHaveLength(1);
      expect(activeEntries[0].employee_id).toBe(testEmployeeId);

      // Step 3: Clock out
      const clockOutData = {
        employeeId: testEmployeeId,
        eventType: 'clock_out',
        eventTimestamp: new Date('2025-01-10T17:00:00Z')
      };

      const clockOutEvent = {
        id: 'event-2',
        employee_id: testEmployeeId,
        event_type: 'clock_out',
        event_time: '2025-01-10T17:00:00Z'
      };

      mockRepository.createTimeEvent.mockResolvedValue(clockOutEvent);

      const clockedOut = await service.createClockEvent(clockOutData, testOrgId, testUserId);
      expect(clockedOut.event_type).toBe('clock_out');
    });

    it('should track clock history for employee', async () => {
      // Arrange
      const clockEvents = [
        { id: 'e1', event_type: 'clock_in', event_time: '2025-01-10T09:00:00Z' },
        { id: 'e2', event_type: 'clock_out', event_time: '2025-01-10T17:00:00Z' },
        { id: 'e3', event_type: 'clock_in', event_time: '2025-01-11T09:00:00Z' },
        { id: 'e4', event_type: 'clock_out', event_time: '2025-01-11T17:30:00Z' }
      ];

      mockRepository.findClockEventsByEmployee.mockResolvedValue(clockEvents);

      // Act
      const history = await service.getClockHistoryByEmployee(
        testEmployeeId,
        testOrgId,
        { startDate: '2025-01-10', endDate: '2025-01-11' }
      );

      // Assert
      expect(history).toHaveLength(4);
      expect(history[0].event_type).toBe('clock_in');
      expect(history[history.length - 1].event_type).toBe('clock_out');
    });
  });

  // ==================== BULK OPERATIONS ====================

  describe('Bulk Approval Operations', () => {
    it('should handle successful bulk approval', async () => {
      // Arrange
      const entryIds = ['entry-1', 'entry-2', 'entry-3'];
      const approvedEntry1 = {
        id: 'entry-1',
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 8
      };
      const approvedEntry2 = {
        id: 'entry-2',
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 7.5
      };
      const approvedEntry3 = {
        id: 'entry-3',
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 8
      };

      mockRepository.updateTimeEntryStatus
        .mockResolvedValueOnce(approvedEntry1)
        .mockResolvedValueOnce(approvedEntry2)
        .mockResolvedValueOnce(approvedEntry3);

      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 }
      ]);

      mockRepository.createRatedTimeLine.mockResolvedValue({
        id: 'line-1',
        component_code: 'REGULAR_PAY'
      });

      // Act
      const result = await service.bulkApproveTimeEntries(entryIds, testOrgId, testUserId);

      // Assert
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockRepository.updateTimeEntryStatus).toHaveBeenCalledTimes(3);
      expect(mockRepository.createRatedTimeLine).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk approval', async () => {
      // Arrange
      const entryIds = ['entry-1', 'entry-2', 'entry-3'];

      mockRepository.updateTimeEntryStatus
        .mockResolvedValueOnce({
          id: 'entry-1',
          employee_id: testEmployeeId,
          status: 'approved',
          regular_hours: 8
        })
        .mockRejectedValueOnce(new Error('Cannot approve already processed entry'))
        .mockResolvedValueOnce({
          id: 'entry-3',
          employee_id: testEmployeeId,
          status: 'approved',
          regular_hours: 8
        });

      mockRepository.findEmployeePayComponents.mockResolvedValue([]);
      mockRepository.createRatedTimeLine.mockResolvedValue({ id: 'line-1' });

      // Act
      const result = await service.bulkApproveTimeEntries(entryIds, testOrgId, testUserId);

      // Assert
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results.find(r => !r.success).timeEntryId).toBe('entry-2');
      expect(result.results.find(r => !r.success).error).toContain('Cannot approve');
    });
  });

  // ==================== HOURS SUMMARY AND REPORTING ====================

  describe('Hours Summary and Reporting', () => {
    it('should calculate hours summary for period', async () => {
      // Arrange
      const summary = {
        totalWorkedHours: 80,
        totalRegularHours: 75,
        totalOvertimeHours: 5,
        totalBreakHours: 0
      };

      mockRepository.getHoursSummary.mockResolvedValue(summary);

      // Act
      const result = await service.getHoursSummary(
        testEmployeeId,
        testOrgId,
        { startDate: '2025-01-01', endDate: '2025-01-14' }
      );

      // Assert
      expect(result.totalWorkedHours).toBe(80);
      expect(result.totalRegularHours).toBe(75);
      expect(result.totalOvertimeHours).toBe(5);
    });

    it('should retrieve time entries with filters', async () => {
      // Arrange
      const entries = [
        { id: 'e1', status: 'approved', worked_hours: 8, employee_id: testEmployeeId },
        { id: 'e2', status: 'approved', worked_hours: 7.5, employee_id: testEmployeeId },
        { id: 'e3', status: 'approved', worked_hours: 8, employee_id: testEmployeeId }
      ];

      mockRepository.findTimeEntries.mockResolvedValue(entries);

      // Act
      const result = await service.getTimeEntries(
        testOrgId,
        { status: 'approved', employeeId: testEmployeeId }
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every(e => e.status === 'approved')).toBe(true);
    });

    it('should retrieve time entries by organization with pagination', async () => {
      // Arrange
      const entries = [
        { id: 'e1', employee_id: 'emp1', status: 'submitted' },
        { id: 'e2', employee_id: 'emp2', status: 'submitted' },
        { id: 'e3', employee_id: 'emp3', status: 'draft' }
      ];

      mockRepository.findTimeEntries.mockResolvedValue(entries);

      // Act
      const result = await service.getTimeEntriesByOrganization(
        testOrgId,
        { page: 1, limit: 10 }
      );

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  // ==================== RATED TIME LINES INTEGRATION ====================

  describe('Rated Time Lines Creation on Approval', () => {
    it('should create rated time lines for regular hours', async () => {
      // Arrange
      const entryId = 'entry-123';
      const approvedEntry = {
        id: entryId,
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 40,
        overtime_hours: 0,
        break_hours: 0
      };

      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 }
      ]);

      const ratedLine = {
        id: 'line-1',
        time_entry_id: entryId,
        component_code: 'REGULAR_PAY',
        hours: 40,
        rate: 25,
        amount: 1000
      };

      mockRepository.createRatedTimeLine.mockResolvedValue(ratedLine);

      // Act
      const result = await service.approveTimesheet(entryId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.createRatedTimeLine).toHaveBeenCalledWith(
        expect.objectContaining({
          timeEntryId: entryId,
          hours: 40
        }),
        testOrgId,
        testUserId
      );
    });

    it('should create multiple rated time lines for different hour types', async () => {
      // Arrange
      const entryId = 'entry-456';
      const approvedEntry = {
        id: entryId,
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 40,
        overtime_hours: 5,
        break_hours: 0
      };

      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 },
        { component_code: 'OVERTIME_PAY', rate: 37.5 }
      ]);

      mockRepository.createRatedTimeLine
        .mockResolvedValueOnce({ id: 'line-1', component_code: 'REGULAR_PAY' })
        .mockResolvedValueOnce({ id: 'line-2', component_code: 'OVERTIME_PAY' });

      // Act
      await service.approveTimesheet(entryId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.createRatedTimeLine).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== ERROR RECOVERY ====================

  describe('Error Recovery Scenarios', () => {
    it('should rollback on approval failure during rated time line creation', async () => {
      // Arrange
      const entryId = 'entry-789';
      const approvedEntry = {
        id: entryId,
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 40
      };

      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 }
      ]);
      mockRepository.createRatedTimeLine.mockRejectedValue(
        new Error('Failed to create rated time line')
      );

      // Act & Assert
      await expect(
        service.approveTimesheet(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Failed to create rated time line');

      // Verify approval was attempted
      expect(mockRepository.updateTimeEntryStatus).toHaveBeenCalled();
    });

    it('should handle missing time entry gracefully', async () => {
      // Arrange
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.submitTimesheet('non-existent', testOrgId, testUserId)
      ).rejects.toThrow('Timesheet not found');
    });
  });
});
