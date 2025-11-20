/**
 * AttendanceController Tests
 * Tests for attendance tracking HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Step 1: Create mock SERVICE as a CLASS (critical for ES6 class controllers)
class MockAttendanceService {
  clockIn = jest.fn();
  clockOut = jest.fn();
  getAttendanceRecord = jest.fn();
  getEmployeeAttendance = jest.fn();
  createManualAttendance = jest.fn();
  getAttendanceSummary = jest.fn();
  getTodayAttendance = jest.fn();
  getAttendanceStatistics = jest.fn();
}

// Step 2: Mock the service module BEFORE importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/attendanceService.js', () => ({
  default: MockAttendanceService
}));

// Step 3: Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Step 4: Import controller AFTER mocking dependencies
const { default: AttendanceController } = await import('../../../../src/products/nexus/controllers/attendanceController.js');

describe('AttendanceController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance (instantiates MockAttendanceService)
    controller = new AttendanceController();

    // Mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-456'
      },
      params: {},
      query: {},
      body: {}
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('clockIn', () => {
    it('should clock in employee and return 201', async () => {
      const clockInData = {
        employeeId: 'emp-123',
        location: 'Main Office'
      };
      const attendance = { id: 'att-123', ...clockInData, clockInTime: '2025-11-17T09:00:00Z' };

      mockReq.body = clockInData;
      controller.service.clockIn.mockResolvedValue(attendance);

      await controller.clockIn(mockReq, mockRes);

      expect(controller.service.clockIn).toHaveBeenCalledWith(
        clockInData,
        'org-123',
        'user-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: attendance
      });
    });

    it('should handle validation errors with 400', async () => {
      const error = new Error('Employee already clocked in');
      mockReq.body = { employeeId: 'emp-123' };
      controller.service.clockIn.mockRejectedValue(error);

      await controller.clockIn(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee already clocked in'
      });
    });
  });

  describe('clockOut', () => {
    it('should clock out employee', async () => {
      mockReq.body = { 
        employeeId: 'emp-123', 
        notes: 'End of shift' 
      };
      const attendance = { 
        id: 'att-123', 
        employeeId: 'emp-123',
        clockOutTime: '2025-11-17T17:00:00Z' 
      };
      controller.service.clockOut.mockResolvedValue(attendance);

      await controller.clockOut(mockReq, mockRes);

      expect(controller.service.clockOut).toHaveBeenCalledWith(
        'emp-123',
        { notes: 'End of shift' },
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: attendance
      });
    });

    it('should return 400 when employeeId is missing', async () => {
      mockReq.body = { notes: 'End of shift' };

      await controller.clockOut(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'employeeId is required'
      });
      expect(controller.service.clockOut).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockReq.body = { employeeId: 'emp-123' };
      const error = new Error('Employee not clocked in');
      controller.service.clockOut.mockRejectedValue(error);

      await controller.clockOut(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAttendance', () => {
    it('should get attendance record by id', async () => {
      mockReq.params = { id: 'att-123' };
      const attendance = { 
        id: 'att-123', 
        employeeId: 'emp-123',
        clockInTime: '2025-11-17T09:00:00Z' 
      };
      controller.service.getAttendanceRecord.mockResolvedValue(attendance);

      await controller.getAttendance(mockReq, mockRes);

      expect(controller.service.getAttendanceRecord).toHaveBeenCalledWith('att-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: attendance
      });
    });

    it('should return 404 when attendance record not found', async () => {
      mockReq.params = { id: 'att-999' };
      const error = new Error('Attendance record not found');
      controller.service.getAttendanceRecord.mockRejectedValue(error);

      await controller.getAttendance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Attendance record not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'att-123' };
      const error = new Error('Database error');
      controller.service.getAttendanceRecord.mockRejectedValue(error);

      await controller.getAttendance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEmployeeAttendance', () => {
    it('should get employee attendance with default pagination', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      const attendance = [
        { id: 'att-1', clockInTime: '2025-11-17T09:00:00Z' },
        { id: 'att-2', clockInTime: '2025-11-16T09:00:00Z' }
      ];
      controller.service.getEmployeeAttendance.mockResolvedValue(attendance);

      await controller.getEmployeeAttendance(mockReq, mockRes);

      expect(controller.service.getEmployeeAttendance).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        { limit: 50, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: attendance
      });
    });

    it('should get employee attendance with date filters and custom pagination', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { 
        startDate: '2025-11-01', 
        endDate: '2025-11-17',
        limit: '20',
        offset: '10'
      };
      const attendance = [{ id: 'att-1', clockInTime: '2025-11-17T09:00:00Z' }];
      controller.service.getEmployeeAttendance.mockResolvedValue(attendance);

      await controller.getEmployeeAttendance(mockReq, mockRes);

      expect(controller.service.getEmployeeAttendance).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        { 
          startDate: '2025-11-01',
          endDate: '2025-11-17',
          limit: 20, 
          offset: 10 
        }
      );
    });

    it('should handle errors', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      const error = new Error('Database error');
      controller.service.getEmployeeAttendance.mockRejectedValue(error);

      await controller.getEmployeeAttendance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createManualAttendance', () => {
    it('should create manual attendance record', async () => {
      const attendanceData = {
        employeeId: 'emp-123',
        date: '2025-11-17',
        clockInTime: '09:00:00',
        clockOutTime: '17:00:00',
        reason: 'Manual entry'
      };
      const attendance = { id: 'att-123', ...attendanceData };

      mockReq.body = attendanceData;
      controller.service.createManualAttendance.mockResolvedValue(attendance);

      await controller.createManualAttendance(mockReq, mockRes);

      expect(controller.service.createManualAttendance).toHaveBeenCalledWith(
        attendanceData,
        'org-123',
        'user-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: attendance
      });
    });

    it('should handle validation errors', async () => {
      const error = new Error('Invalid time format');
      mockReq.body = { employeeId: 'emp-123' };
      controller.service.createManualAttendance.mockRejectedValue(error);

      await controller.createManualAttendance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getAttendanceSummary', () => {
    it('should get attendance summary', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { 
        startDate: '2025-11-01', 
        endDate: '2025-11-17' 
      };
      const summary = {
        totalDays: 17,
        workingDays: 12,
        presentDays: 11,
        absentDays: 1,
        attendanceRate: 91.67
      };
      controller.service.getAttendanceSummary.mockResolvedValue(summary);

      await controller.getAttendanceSummary(mockReq, mockRes);

      expect(controller.service.getAttendanceSummary).toHaveBeenCalledWith(
        'emp-123',
        '2025-11-01',
        '2025-11-17',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: summary
      });
    });

    it('should return 400 when dates are missing', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { startDate: '2025-11-01' }; // Missing endDate

      await controller.getAttendanceSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required'
      });
      expect(controller.service.getAttendanceSummary).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { startDate: '2025-11-01', endDate: '2025-11-17' };
      const error = new Error('Database error');
      controller.service.getAttendanceSummary.mockRejectedValue(error);

      await controller.getAttendanceSummary(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTodayAttendance', () => {
    it('should get today attendance', async () => {
      const todayAttendance = [
        { employeeId: 'emp-1', status: 'present', clockInTime: '09:00:00' },
        { employeeId: 'emp-2', status: 'absent' }
      ];
      controller.service.getTodayAttendance.mockResolvedValue(todayAttendance);

      await controller.getTodayAttendance(mockReq, mockRes);

      expect(controller.service.getTodayAttendance).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: todayAttendance
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      controller.service.getTodayAttendance.mockRejectedValue(error);

      await controller.getTodayAttendance(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAttendanceStatistics', () => {
    it('should get attendance statistics', async () => {
      const stats = {
        averageAttendance: 95.5,
        totalEmployees: 100,
        presentToday: 98,
        lateArrivals: 5,
        earlyDepartures: 2
      };
      controller.service.getAttendanceStatistics.mockResolvedValue(stats);

      await controller.getAttendanceStatistics(mockReq, mockRes);

      expect(controller.service.getAttendanceStatistics).toHaveBeenCalledWith(
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Invalid period');
      controller.service.getAttendanceStatistics.mockRejectedValue(error);

      await controller.getAttendanceStatistics(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});