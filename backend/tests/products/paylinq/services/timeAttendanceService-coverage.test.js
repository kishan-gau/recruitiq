import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceService from '../../../../src/products/paylinq/services/timeAttendanceService.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/utils/errors.js';

/**
 * Additional tests to increase coverage for timeAttendanceService
 * Targeting uncovered error paths and edge cases
 */
describe('TimeAttendanceService - Coverage Tests', () => {
  let service;
  let mockRepository;
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepository = {
      createShiftType: jest.fn(),
      findShiftTypes: jest.fn(),
      findShiftTypeById: jest.fn(), // Add missing method
      updateShiftType: jest.fn(),
      deleteShiftType: jest.fn(),
      createClockEvent: jest.fn(),
      createTimeEvent: jest.fn(), // Add for clock event creation
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
      checkShiftTypeUsage: jest.fn(),
      query: jest.fn() // Add query method for raw SQL
    };

    service = new TimeAttendanceService(mockRepository);
  });

  // ==================== ERROR PATH COVERAGE ====================

  describe('createShiftType - error handling', () => {
    it('should throw and log error when creation fails', async () => {
      // Arrange
      const shiftData = {
        shiftName: 'Day Shift',
        shiftCode: 'TEST-DAY-001',
        startTime: '09:00',
        endTime: '17:00',
        durationHours: 8, // ✅ Required field per shiftTypeSchema
        breakDurationMinutes: 60
        // Note: isActive is not in schema, removed
      };
      const dbError = new Error('Database connection failed');
      mockRepository.createShiftType.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.createShiftType(shiftData, testOrgId, testUserId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getShiftTypes - error handling', () => {
    it('should throw and log error when fetch fails', async () => {
      // Arrange
      const dbError = new Error('Query timeout');
      mockRepository.findShiftTypes.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getShiftTypes(testOrgId, {})
      ).rejects.toThrow('Query timeout');
    });
  });

  describe('updateShiftType - error handling', () => {
    it('should throw and log error when update fails', async () => {
      // Arrange
      const shiftTypeId = 'shift-123';
      const updates = { shiftName: 'Updated Shift' }; // Use correct field name
      mockRepository.findShiftTypeById.mockResolvedValue({ id: shiftTypeId }); // Mock existence check
      const dbError = new Error('Constraint violation');
      mockRepository.updateShiftType.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.updateShiftType(shiftTypeId, updates, testOrgId, testUserId)
      ).rejects.toThrow('Constraint violation');
    });
  });

  describe('deleteShiftType - error handling', () => {
    // Note: "in use" check scenario requires integration testing with real database
    // as the service uses direct database queries that cannot be mocked in unit tests

    it.skip('should throw and log error when deletion fails', async () => {
      // TODO: This test uses query() directly with dynamic import which can't be mocked easily
      // Arrange
      const shiftTypeId = '623e4567-e89b-12d3-a456-426614174000'; // Valid UUID
      mockRepository.findShiftTypeById.mockResolvedValue({ id: shiftTypeId }); // Mock existence
      mockRepository.checkShiftTypeUsage.mockResolvedValue({ rows: [{ count: '0' }] });
      const dbError = new Error('Foreign key constraint');
      mockRepository.deleteShiftType.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.deleteShiftType(shiftTypeId, testOrgId, testUserId)
      ).rejects.toThrow('Foreign key constraint');
    });
  });

  describe('createClockEvent - error handling', () => {
    it('should throw and log error when creation fails', async () => {
      // Arrange
      const eventData = {
        employeeId: testEmployeeId,
        eventType: 'clock_in'
      };
      const dbError = new Error('Duplicate entry');
      mockRepository.createTimeEvent.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.createClockEvent(eventData, testOrgId, testUserId)
      ).rejects.toThrow('Duplicate entry');
    });
  });

  describe('getActiveClockEntries - error handling', () => {
    it('should throw and log error when fetch fails', async () => {
      // Arrange
      const dbError = new Error('Connection lost');
      mockRepository.findActiveClockEntries.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getActiveClockEntries(testOrgId)
      ).rejects.toThrow('Connection lost');
    });
  });

  describe('getClockHistoryByEmployee - error handling', () => {
    it('should throw and log error when fetch fails', async () => {
      // Arrange
      const dbError = new Error('Invalid query');
      mockRepository.findClockEventsByEmployee.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getClockHistoryByEmployee(testEmployeeId, testOrgId, {})
      ).rejects.toThrow('Invalid query');
    });
  });

  describe('createTimeEntry - error handling', () => {
    it('should throw and log error when creation fails', async () => {
      // Arrange
      const entryData = {
        employeeId: testEmployeeId,
        entryDate: new Date(),
        workedHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        breakHours: 0
      };
      const dbError = new Error('Unique constraint violation');
      mockRepository.createTimeEntry.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.createTimeEntry(entryData, testOrgId, testUserId)
      ).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('getTimeEntries - error handling', () => {
    it('should throw and log error when fetch fails', async () => {
      // Arrange
      const dbError = new Error('Timeout exceeded');
      mockRepository.findTimeEntries.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getTimeEntries(testOrgId, {})
      ).rejects.toThrow('Timeout exceeded');
    });
  });

  describe('getTimeEntryById - error handling', () => {
    it('should throw and log error when fetch fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const dbError = new Error('Record not found');
      mockRepository.findTimeEntryById.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getTimeEntryById(entryId, testOrgId)
      ).rejects.toThrow('Record not found');
    });
  });

  describe('updateTimeEntry - error handling', () => {
    it('should throw and log error when update fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const draftEntry = { id: entryId, status: 'draft' };
      mockRepository.findTimeEntryById.mockResolvedValue(draftEntry);
      const dbError = new Error('Deadlock detected');
      mockRepository.updateTimeEntry.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.updateTimeEntry(entryId, { workedHours: 10 }, testOrgId, testUserId)
      ).rejects.toThrow('Deadlock detected');
    });
  });

  describe('approveTimeEntry - error handling', () => {
    it('should throw and log error when approval fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const dbError = new Error('Status update failed');
      mockRepository.updateTimeEntryStatus.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.approveTimeEntry(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Status update failed');
    });

    it('should throw and log error when creating rated time lines fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const approvedEntry = {
        id: entryId,
        employee_id: testEmployeeId,
        status: 'approved',
        regular_hours: 8
      };
      mockRepository.updateTimeEntryStatus.mockResolvedValue(approvedEntry);
      mockRepository.findEmployeePayComponents.mockResolvedValue([
        { component_code: 'REGULAR_PAY', rate: 25 }
      ]);
      const rateError = new Error('Failed to create rated time line');
      mockRepository.createRatedTimeLine.mockRejectedValue(rateError);

      // Act & Assert
      await expect(
        service.approveTimeEntry(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Failed to create rated time line');
    });
  });

  describe('rejectTimeEntry - error handling', () => {
    it('should throw and log error when rejection fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const dbError = new Error('Status change not allowed');
      mockRepository.updateTimeEntryStatus.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.rejectTimeEntry(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Status change not allowed');
    });
  });

  describe('deleteTimeEntry - error handling', () => {
    it('should throw and log error when deletion fails', async () => {
      // Arrange
      const entryId = 'entry-123';
      const dbError = new Error('Cannot delete processed entry');
      mockRepository.deleteTimeEntry.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.deleteTimeEntry(entryId, testOrgId, testUserId)
      ).rejects.toThrow('Cannot delete processed entry');
    });
  });

  describe('getHoursSummary - error handling', () => {
    it('should throw and log error when summary fetch fails', async () => {
      // Arrange
      const dbError = new Error('Aggregation error');
      mockRepository.getHoursSummary.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getHoursSummary(testEmployeeId, testOrgId, {})
      ).rejects.toThrow('Aggregation error');
    });
  });

  describe('bulkApproveTimeEntries - error handling', () => {
    it('should handle partial errors in bulk approval', async () => {
      // Arrange
      const entryIds = ['entry-1', 'entry-2', 'entry-3'];
      
      // Mock first entry success
      mockRepository.findTimeEntryById
        .mockResolvedValueOnce({ 
          id: 'entry-1', 
          employee_id: testEmployeeId, 
          status: 'submitted', 
          regular_hours: 8 
        })
        // Mock second entry success (but update will fail)
        .mockResolvedValueOnce({ 
          id: 'entry-2', 
          employee_id: testEmployeeId, 
          status: 'submitted',
          regular_hours: 8 
        })
        // Mock third entry success
        .mockResolvedValueOnce({ 
          id: 'entry-3', 
          employee_id: testEmployeeId, 
          status: 'submitted', 
          regular_hours: 8 
        });

      mockRepository.updateTimeEntryStatus
        .mockResolvedValueOnce({
          id: 'entry-1',
          employee_id: testEmployeeId,
          status: 'approved',
          regular_hours: 8
        })
        .mockRejectedValueOnce(new Error('Constraint violation'))
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
      expect(result.total).toBe(3);
      expect(result.successful).toBe(2); // Count, not array
      expect(result.failed).toBe(1); // Count, not array
      expect(result.results).toHaveLength(3);
      expect(result.results[1].success).toBe(false); // Second entry failed (database constraint)
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty filters in getShiftTypes', async () => {
      // Arrange
      mockRepository.findShiftTypes.mockResolvedValue([]);

      // Act
      const result = await service.getShiftTypes(testOrgId);

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findShiftTypes).toHaveBeenCalledWith(testOrgId, {});
    });

    it('should handle null return from getTimeEntryById', async () => {
      // Arrange
      mockRepository.findTimeEntryById.mockResolvedValue(null);

      // Act
      const result = await service.getTimeEntryById('entry-123', testOrgId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty array from getTimeEntries', async () => {
      // Arrange
      mockRepository.findTimeEntries.mockResolvedValue([]);

      // Act
      const result = await service.getTimeEntries(testOrgId, { status: 'approved' });

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle zero hours in time entry', async () => {
      // Arrange
      const entryData = {
        employeeId: testEmployeeId,
        entryDate: new Date(),
        workedHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        breakHours: 0
      };
      const createdEntry = { ...entryData, id: 'entry-123' };
      mockRepository.createTimeEntry.mockResolvedValue(createdEntry);

      // Act
      const result = await service.createTimeEntry(entryData, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(createdEntry);
    });

    it('should handle empty hours summary', async () => {
      // Arrange
      const emptySummary = {
        totalWorkedHours: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0
      };
      mockRepository.getHoursSummary.mockResolvedValue(emptySummary);

      // Act
      const result = await service.getHoursSummary(testEmployeeId, testOrgId, {});

      // Assert
      expect(result).toEqual(emptySummary);
    });
  });

  // ==================== VALIDATION EDGE CASES ====================

  describe('Validation edge cases', () => {
    it('should validate hours calculation with floating point precision', async () => {
      // Arrange
      const entryData = {
        employeeId: testEmployeeId,
        entryDate: new Date(),
        workedHours: 8.5,
        regularHours: 8.0,
        overtimeHours: 0.5,
        breakHours: 0.0
      };
      const createdEntry = { ...entryData, id: 'entry-123' };
      mockRepository.createTimeEntry.mockResolvedValue(createdEntry);

      // Act
      const result = await service.createTimeEntry(entryData, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(createdEntry);
    });

    it('should reject hours calculation with significant discrepancy', async () => {
      // Arrange
      const entryData = {
        employeeId: testEmployeeId,
        entryDate: new Date(),
        workedHours: 10,
        regularHours: 8,
        overtimeHours: 1, // Sum is 9, not 10
        breakHours: 0
      };

      // Act & Assert
      await expect(
        service.createTimeEntry(entryData, testOrgId, testUserId)
      ).rejects.toThrow('Worked hours must equal sum of regular, overtime, and break hours');
    });
  });
});
