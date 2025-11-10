/**
 * AttendanceService Tests
 * Unit tests for attendance service
 */

import AttendanceService from '../../../../src/products/nexus/services/attendanceService.js';
import AttendanceRepository from '../../../../src/products/nexus/repositories/attendanceRepository.js';
import eventBus from '../../../../src/shared/events/eventBus.js';

describe('AttendanceService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      clockIn: jest.fn(),
      clockOut: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByEmployeeAndDateRange: jest.fn(),
      getCurrentClockIn: jest.fn(),
      createManual: jest.fn()
    };

    AttendanceRepository.mockImplementation(() => mockRepository);
    service = new AttendanceService();
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should clock in employee', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        location: 'Office HQ'
      };

      mockRepository.getCurrentClockIn.mockResolvedValue(null);
      mockRepository.clockIn.mockResolvedValue(mockAttendance);

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        location: 'Office HQ'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await service.clockIn(data, organizationId, userId);

      expect(mockRepository.getCurrentClockIn).toHaveBeenCalledWith(
        data.employeeId,
        organizationId
      );
      expect(mockRepository.clockIn).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.attendance.clockin',
        expect.objectContaining({
          attendanceId: mockAttendance.id,
          employeeId: data.employeeId,
          organizationId
        })
      );
      expect(result).toEqual(mockAttendance);
    });

    it('should validate required fields', async () => {
      const data = {
        // Missing employeeId
        clockIn: '2024-01-15T09:00:00Z'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.clockIn(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should prevent double clock-in', async () => {
      const existingClockIn = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T08:00:00Z',
        clockOut: null
      };

      mockRepository.getCurrentClockIn.mockResolvedValue(existingClockIn);

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.clockIn(data, organizationId, userId)
      ).rejects.toThrow('Employee already clocked in');
    });
  });

  describe('clockOut', () => {
    it('should clock out employee', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: 8.0
      };

      mockRepository.clockOut.mockResolvedValue(mockUpdated);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const data = {
        clockOut: '2024-01-15T17:00:00Z'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await service.clockOut(employeeId, data, organizationId, userId);

      expect(mockRepository.clockOut).toHaveBeenCalledWith(
        employeeId,
        data,
        organizationId
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.attendance.clockout',
        expect.objectContaining({
          attendanceId: mockUpdated.id,
          employeeId,
          hoursWorked: 8.0
        })
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should throw error if no active clock-in', async () => {
      mockRepository.clockOut.mockResolvedValue(null);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const data = {
        clockOut: '2024-01-15T17:00:00Z'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.clockOut(employeeId, data, organizationId, userId)
      ).rejects.toThrow('No active clock-in found for employee');
    });

    it('should validate clockOut is required', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const data = {}; // Missing clockOut
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.clockOut(employeeId, data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('createManualAttendance', () => {
    it('should create manual attendance record', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: 8.0,
        notes: 'Manual entry'
      };

      mockRepository.createManual.mockResolvedValue(mockAttendance);

      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: 8.0,
        notes: 'Manual entry'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      const result = await service.createManualAttendance(data, organizationId, userId);

      expect(mockRepository.createManual).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.attendance.manual.created',
        expect.any(Object)
      );
      expect(result).toEqual(mockAttendance);
    });

    it('should validate required fields for manual entry', async () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z'
        // Missing clockOut and hoursWorked
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.createManualAttendance(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should validate clockOut is after clockIn', async () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T17:00:00Z',
        clockOut: '2024-01-15T09:00:00Z', // Before clockIn
        hoursWorked: 8.0
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.createManualAttendance(data, organizationId, userId)
      ).rejects.toThrow('Clock-out time must be after clock-in time');
    });

    it('should validate hoursWorked is positive', async () => {
      const data = {
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: -1 // Invalid
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const userId = '123e4567-e89b-12d3-a456-426614174003';

      await expect(
        service.createManualAttendance(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('getAttendanceSummary', () => {
    it('should get attendance summary for employee', async () => {
      const mockRecords = [
        {
          id: '1',
          employeeId: '123e4567-e89b-12d3-a456-426614174001',
          clockIn: '2024-01-15T09:00:00Z',
          clockOut: '2024-01-15T17:00:00Z',
          hoursWorked: 8.0
        },
        {
          id: '2',
          employeeId: '123e4567-e89b-12d3-a456-426614174001',
          clockIn: '2024-01-16T09:00:00Z',
          clockOut: '2024-01-16T17:00:00Z',
          hoursWorked: 8.0
        },
        {
          id: '3',
          employeeId: '123e4567-e89b-12d3-a456-426614174001',
          clockIn: '2024-01-17T09:00:00Z',
          clockOut: '2024-01-17T13:00:00Z',
          hoursWorked: 4.0
        }
      ];

      mockRepository.findByEmployeeAndDateRange.mockResolvedValue(mockRecords);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const startDate = '2024-01-15';
      const endDate = '2024-01-17';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.getAttendanceSummary(
        employeeId,
        startDate,
        endDate,
        organizationId
      );

      expect(mockRepository.findByEmployeeAndDateRange).toHaveBeenCalledWith(
        employeeId,
        startDate,
        endDate,
        organizationId
      );
      expect(result).toEqual({
        employeeId,
        startDate,
        endDate,
        totalDays: 3,
        totalHours: 20.0,
        averageHoursPerDay: 6.67,
        records: mockRecords
      });
    });

    it('should handle empty records', async () => {
      mockRepository.findByEmployeeAndDateRange.mockResolvedValue([]);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const startDate = '2024-01-15';
      const endDate = '2024-01-17';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.getAttendanceSummary(
        employeeId,
        startDate,
        endDate,
        organizationId
      );

      expect(result).toEqual({
        employeeId,
        startDate,
        endDate,
        totalDays: 0,
        totalHours: 0,
        averageHoursPerDay: 0,
        records: []
      });
    });
  });

  describe('getAttendanceRecord', () => {
    it('should get attendance record by ID', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174001',
        clockIn: '2024-01-15T09:00:00Z',
        clockOut: '2024-01-15T17:00:00Z',
        hoursWorked: 8.0
      };

      mockRepository.findById.mockResolvedValue(mockRecord);

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.getAttendanceRecord(id, organizationId);

      expect(mockRepository.findById).toHaveBeenCalledWith(id, organizationId);
      expect(result).toEqual(mockRecord);
    });

    it('should throw error if record not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const id = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.getAttendanceRecord(id, organizationId)
      ).rejects.toThrow('Attendance record not found');
    });
  });

  describe('getEmployeeAttendance', () => {
    it('should get all attendance records for employee', async () => {
      const mockRecords = [
        {
          id: '1',
          employeeId: '123e4567-e89b-12d3-a456-426614174001',
          clockIn: '2024-01-15T09:00:00Z',
          hoursWorked: 8.0
        },
        {
          id: '2',
          employeeId: '123e4567-e89b-12d3-a456-426614174001',
          clockIn: '2024-01-16T09:00:00Z',
          hoursWorked: 8.0
        }
      ];

      mockRepository.findByEmployee.mockResolvedValue(mockRecords);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.getEmployeeAttendance(employeeId, organizationId);

      expect(mockRepository.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        {}
      );
      expect(result).toEqual(mockRecords);
    });

    it('should support filtering by date range', async () => {
      mockRepository.findByEmployee.mockResolvedValue([]);

      const employeeId = '123e4567-e89b-12d3-a456-426614174001';
      const organizationId = '123e4567-e89b-12d3-a456-426614174002';
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      await service.getEmployeeAttendance(employeeId, organizationId, filters);

      expect(mockRepository.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        filters
      );
    });
  });
});
