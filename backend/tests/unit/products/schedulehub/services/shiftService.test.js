/**
 * Unit tests for ShiftService
 * Tests time tracking, clock in/out functionality, and Paylinq integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock database pool before importing the service
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient)
};

// Mock external services
const mockPaylinqIntegration = {
  recordTimeEntryFromScheduleHub: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

// Mock dependencies using Jest ES modules pattern
jest.unstable_mockModule('../../../../../src/config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../../../../../src/products/paylinq/services/integrationService.js', () => ({
  default: class MockPaylinqIntegrationService {
    recordTimeEntryFromScheduleHub = mockPaylinqIntegration.recordTimeEntryFromScheduleHub;
  }
}));

jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import the service after mocking
const { default: ShiftService } = await import('../../../../../src/products\schedulehub/services/shiftService.js');

describe('ShiftService', () => {
  let service;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const shiftId = 'shift-123e4567-e89b-12d3-a456-426614174000';
  const employeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    service = new ShiftService();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('clockOut', () => {
    const validClockOutData = {
      shiftId,
      clockOutTime: new Date('2025-01-15T17:00:00Z'),
      actualBreakMinutes: 30
    };

    const mockShiftData = {
      id: shiftId,
      employee_id: employeeId,
      organization_id: organizationId,
      shift_date: '2025-01-15',
      start_time: new Date('2025-01-15T09:00:00Z'),
      end_time: new Date('2025-01-15T17:00:00Z'),
      break_minutes: 30,
      status: 'in_progress',
      clock_in_time: new Date('2025-01-15T09:00:00Z'),
      clock_out_time: null,
      first_name: 'John',
      last_name: 'Doe',
      employment_type: 'full_time'
    };

    beforeEach(() => {
      // Default successful transaction flow
      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockShiftData] }) // SELECT shift
        .mockResolvedValueOnce({ rows: [{ ...mockShiftData, clock_out_time: validClockOutData.clockOutTime, status: 'completed' }] }) // UPDATE shift
        .mockResolvedValueOnce({ command: 'COMMIT' }); // COMMIT

      mockPaylinqIntegration.recordTimeEntryFromScheduleHub.mockResolvedValue({
        timeEntryId: 'time-entry-123',
        success: true
      });
    });

    describe('validation', () => {
      it('should validate required shiftId as UUID', async () => {
        const invalidData = {
          ...validClockOutData,
          shiftId: 'invalid-uuid'
        };

        await expect(
          service.clockOut(invalidData, organizationId, userId)
        ).rejects.toThrow('Validation error');
      });

      it('should require shiftId', async () => {
        const invalidData = {
          clockOutTime: validClockOutData.clockOutTime,
          actualBreakMinutes: 30
        };

        await expect(
          service.clockOut(invalidData, organizationId, userId)
        ).rejects.toThrow('Validation error');
      });

      it('should require clockOutTime', async () => {
        const invalidData = {
          shiftId: validClockOutData.shiftId,
          actualBreakMinutes: 30
        };

        await expect(
          service.clockOut(invalidData, organizationId, userId)
        ).rejects.toThrow('Validation error');
      });

      it('should allow null actualBreakMinutes', async () => {
        const dataWithNullBreak = {
          ...validClockOutData,
          actualBreakMinutes: null
        };

        await service.clockOut(dataWithNullBreak, organizationId, userId);

        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE scheduling.shift'),
          expect.arrayContaining([
            validClockOutData.clockOutTime,
            0, // null actualBreakMinutes should use scheduled break_minutes (30) or default to 0
            expect.any(Number), // actual_hours
            userId,
            shiftId
          ])
        );
      });

      it('should validate actualBreakMinutes is non-negative', async () => {
        const invalidData = {
          ...validClockOutData,
          actualBreakMinutes: -10
        };

        await expect(
          service.clockOut(invalidData, organizationId, userId)
        ).rejects.toThrow('Validation error');
      });
    });

    describe('business logic validation', () => {
      it('should throw error if shift not found', async () => {
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [] }); // No shift found

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Shift not found');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error if shift already completed', async () => {
        const completedShift = { ...mockShiftData, status: 'completed' };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [completedShift] });

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Shift already completed');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should throw error if shift is cancelled', async () => {
        const cancelledShift = { ...mockShiftData, status: 'cancelled' };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [cancelledShift] });

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Cannot clock out cancelled shift');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should throw error if not clocked in', async () => {
        const notClockedInShift = { ...mockShiftData, clock_in_time: null };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [notClockedInShift] });

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Cannot clock out before clocking in');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should throw error if already clocked out', async () => {
        const alreadyClockedOutShift = { 
          ...mockShiftData, 
          clock_out_time: new Date('2025-01-15T16:30:00Z') 
        };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [alreadyClockedOutShift] });

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Shift already clocked out');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });

    describe('time calculations', () => {
      it('should calculate regular and overtime hours for full-time worker', async () => {
        // 9 hours worked (9am - 6pm) - 30 min break = 8.5 hours
        // 8 regular + 0.5 overtime
        const clockOutTime = new Date('2025-01-15T18:00:00Z'); // 18:00 (6 PM)
        const clockOutData = {
          ...validClockOutData,
          clockOutTime,
          actualBreakMinutes: 30
        };

        await service.clockOut(clockOutData, organizationId, userId);

        // Check the UPDATE query for shift
        const updateCall = mockClient.query.mock.calls.find(call => 
          call[0].includes('UPDATE scheduling.shift')
        );
        
        expect(updateCall).toBeTruthy();
        expect(updateCall[1][2]).toBe(8.5); // actual_hours = 8.5
      });

      it('should calculate hours correctly for part-time worker', async () => {
        const partTimeShift = { 
          ...mockShiftData, 
          employment_type: 'part_time',
          start_time: new Date('2025-01-15T09:00:00Z'),
          end_time: new Date('2025-01-15T13:00:00Z') // 4-hour shift
        };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [partTimeShift] })
          .mockResolvedValueOnce({ rows: [{ ...partTimeShift, status: 'completed' }] })
          .mockResolvedValueOnce({ command: 'COMMIT' });

        // Work 5 hours (1 hour overtime for part-time)
        const clockOutTime = new Date('2025-01-15T14:00:00Z');
        const clockOutData = {
          shiftId,
          clockOutTime,
          actualBreakMinutes: 0
        };

        const result = await service.clockOut(clockOutData, organizationId, userId);

        expect(result.timeTracking.workedHours).toBe(5);
        expect(result.timeTracking.regularHours).toBe(4); // Scheduled hours
        expect(result.timeTracking.overtimeHours).toBe(1); // Overtime
      });

      it('should use default break minutes when actualBreakMinutes is null', async () => {
        const clockOutData = {
          shiftId,
          clockOutTime: new Date('2025-01-15T17:00:00Z'),
          actualBreakMinutes: null
        };

        await service.clockOut(clockOutData, organizationId, userId);

        // Should use shift.break_minutes (30) as default
        const updateCall = mockClient.query.mock.calls.find(call => 
          call[0].includes('UPDATE scheduling.shift')
        );
        
        expect(updateCall[1][1]).toBe(30); // actual_break_minutes uses default
      });

      it('should handle zero break minutes', async () => {
        const clockOutData = {
          ...validClockOutData,
          actualBreakMinutes: 0
        };

        await service.clockOut(clockOutData, organizationId, userId);

        const result = await service.clockOut(clockOutData, organizationId, userId);
        expect(result.timeTracking.breakMinutes).toBe(0);
      });
    });

    describe('Paylinq integration', () => {
      it('should record time entry in Paylinq after successful clock out', async () => {
        const result = await service.clockOut(validClockOutData, organizationId, userId);

        expect(mockPaylinqIntegration.recordTimeEntryFromScheduleHub).toHaveBeenCalledWith({
          employeeId,
          shiftId,
          organizationId,
          workDate: mockShiftData.shift_date,
          regularHours: 8,
          overtimeHours: 0,
          clockIn: mockShiftData.clock_in_time,
          clockOut: validClockOutData.clockOutTime
        }, userId);

        expect(result.payrollIntegration).toEqual({
          timeEntryId: 'time-entry-123',
          success: true
        });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Time entry recorded in Paylinq',
          expect.objectContaining({
            shiftId,
            employeeId,
            timeEntryId: 'time-entry-123',
            organizationId
          })
        );
      });

      it('should not fail clock out if Paylinq integration fails', async () => {
        mockPaylinqIntegration.recordTimeEntryFromScheduleHub.mockRejectedValue(
          new Error('Paylinq service unavailable')
        );

        const result = await service.clockOut(validClockOutData, organizationId, userId);

        // Clock out should still succeed
        expect(result.shift.status).toBe('completed');
        expect(result.payrollIntegration).toBeNull();
        
        // Should log the error
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error recording time entry in Paylinq',
          expect.objectContaining({
            shiftId,
            employeeId,
            error: 'Paylinq service unavailable'
          })
        );
      });

      it('should pass correct time data to Paylinq with overtime', async () => {
        // 10 hours worked (9am - 7pm) - 30 min break = 9.5 hours
        // 8 regular + 1.5 overtime
        const clockOutTime = new Date('2025-01-15T19:00:00Z'); // 19:00 (7 PM)
        const clockOutData = {
          ...validClockOutData,
          clockOutTime,
          actualBreakMinutes: 30
        };

        await service.clockOut(clockOutData, organizationId, userId);

        expect(mockPaylinqIntegration.recordTimeEntryFromScheduleHub).toHaveBeenCalledWith({
          employeeId,
          shiftId,
          organizationId,
          workDate: mockShiftData.shift_date,
          regularHours: 8,
          overtimeHours: 1.5,
          clockIn: mockShiftData.clock_in_time,
          clockOut: clockOutTime
        }, userId);
      });
    });

    describe('database transaction handling', () => {
      it('should rollback transaction on database error', async () => {
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [mockShiftData] })
          .mockRejectedValueOnce(new Error('Database connection lost')); // UPDATE fails

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Database connection lost');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should release connection even if rollback fails', async () => {
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(new Error('SELECT failed'))
          .mockRejectedValueOnce(new Error('ROLLBACK failed'));

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('SELECT failed');

        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should commit transaction on success', async () => {
        await service.clockOut(validClockOutData, organizationId, userId);

        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });
    });

    describe('response format', () => {
      it('should return complete clock out result', async () => {
        const result = await service.clockOut(validClockOutData, organizationId, userId);

        expect(result).toEqual({
          shift: expect.objectContaining({
            id: shiftId,
            clock_out_time: validClockOutData.clockOutTime,
            status: 'completed'
          }),
          timeTracking: {
            workedHours: 8,
            regularHours: 8,
            overtimeHours: 0,
            breakMinutes: 30
          },
          payrollIntegration: {
            timeEntryId: 'time-entry-123',
            success: true
          },
          message: 'Shift completed and time entry recorded'
        });
      });
    });

    describe('logging', () => {
      it('should log successful clock out', async () => {
        await service.clockOut(validClockOutData, organizationId, userId);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Shift clocked out',
          {
            shiftId,
            workerId: employeeId,
            workedHours: 8,
            regularHours: 8,
            overtimeHours: 0,
            organizationId
          }
        );
      });

      it('should log errors with context', async () => {
        const error = new Error('Test error');
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(error);

        await expect(
          service.clockOut(validClockOutData, organizationId, userId)
        ).rejects.toThrow('Test error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error clocking out shift',
          expect.objectContaining({
            shiftId,
            error: 'Test error'
          })
        );
      });
    });
  });

  describe('clockIn', () => {
    const clockInTime = new Date('2025-01-15T09:00:00Z');
    
    const mockShiftData = {
      id: shiftId,
      employee_id: employeeId,
      organization_id: organizationId,
      status: 'scheduled',
      clock_in_time: null,
      clock_out_time: null
    };

    beforeEach(() => {
      mockClient.query
        .mockResolvedValueOnce({ command: 'BEGIN' }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockShiftData] }) // SELECT shift
        .mockResolvedValueOnce({ rows: [{ ...mockShiftData, clock_in_time: clockInTime, status: 'in_progress' }] }) // UPDATE shift
        .mockResolvedValueOnce({ command: 'COMMIT' }); // COMMIT
    });

    describe('successful clock in', () => {
      it('should clock in employee successfully', async () => {
        const result = await service.clockIn(shiftId, clockInTime, organizationId, userId);

        expect(result).toEqual({
          shift: expect.objectContaining({
            id: shiftId,
            clock_in_time: clockInTime,
            status: 'in_progress'
          }),
          message: 'Shift started successfully'
        });

        // Verify database calls
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM scheduling.shift'),
          [shiftId, organizationId]
        );

        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE scheduling.shift'),
          [clockInTime, userId, shiftId]
        );

        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should log successful clock in', async () => {
        await service.clockIn(shiftId, clockInTime, organizationId, userId);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Shift clocked in',
          {
            shiftId,
            workerId: employeeId,
            organizationId
          }
        );
      });
    });

    describe('validation errors', () => {
      it('should throw error if shift not found', async () => {
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [] }); // No shift found

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Shift not found');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should throw error if shift already completed', async () => {
        const completedShift = { ...mockShiftData, status: 'completed' };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [completedShift] });

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Shift already completed');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should throw error if shift is cancelled', async () => {
        const cancelledShift = { ...mockShiftData, status: 'cancelled' };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [cancelledShift] });

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Cannot clock in to cancelled shift');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });

      it('should throw error if already clocked in', async () => {
        const alreadyClockedInShift = { 
          ...mockShiftData, 
          clock_in_time: new Date('2025-01-15T08:00:00Z') 
        };
        
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [alreadyClockedInShift] });

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Shift already clocked in');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      });
    });

    describe('database transaction handling', () => {
      it('should rollback transaction on database error', async () => {
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockResolvedValueOnce({ rows: [mockShiftData] })
          .mockRejectedValueOnce(new Error('Database error'));

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Database error');

        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
      });

      it('should log errors with context', async () => {
        const error = new Error('Test database error');
        mockClient.query
          .mockResolvedValueOnce({ command: 'BEGIN' })
          .mockRejectedValueOnce(error);

        await expect(
          service.clockIn(shiftId, clockInTime, organizationId, userId)
        ).rejects.toThrow('Test database error');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error clocking in shift',
          expect.objectContaining({
            shiftId,
            error: 'Test database error'
          })
        );
      });
    });
  });

  describe('constructor', () => {
    it('should initialize with PaylinqIntegrationService and logger', () => {
      const service = new ShiftService();
      
      expect(service.paylinqIntegration).toBeDefined();
      expect(service.logger).toBeDefined();
    });

    it('should have clockOutSchema validation', () => {
      const service = new ShiftService();
      
      expect(service.clockOutSchema).toBeDefined();
      expect(service.clockOutSchema.validate).toBeDefined();
    });
  });
});