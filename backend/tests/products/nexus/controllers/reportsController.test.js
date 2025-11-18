/**
 * @fileoverview Tests for ReportsController
 * @module tests/products/nexus/controllers/reportsController
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock logger
const mockLogger = {
  error: jest.fn()
};

// Mock service class
class MockReportsService {
  getHeadcountReport = jest.fn();
  getTurnoverReport = jest.fn();
  getTimeOffReport = jest.fn();
  getAttendanceReport = jest.fn();
  getPerformanceReport = jest.fn();
  getBenefitsReport = jest.fn();
  getDashboardReport = jest.fn();
}

// Mock modules before importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/reportsService.js', () => ({
  default: MockReportsService
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller after mocking
const { default: ReportsController } = await import('../../../../src/products/nexus/controllers/reportsController.js');

describe('ReportsController', () => {
  let controller;
  let mockReq;
  let mockRes;
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportsController();
    mockService = controller.service;

    mockReq = {
      user: {
        organizationId: 'org-123'
      },
      query: {}
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getHeadcountReport', () => {
    it('should return headcount report successfully', async () => {
      const mockReport = {
        total: 100,
        byDepartment: { Engineering: 50, Sales: 30, HR: 20 },
        trend: [{ month: '2025-01', count: 95 }, { month: '2025-02', count: 100 }]
      };

      mockService.getHeadcountReport.mockResolvedValue(mockReport);

      await controller.getHeadcountReport(mockReq, mockRes);

      expect(mockService.getHeadcountReport).toHaveBeenCalledWith('org-123', mockReq.query);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should handle query parameters', async () => {
      mockReq.query = { department: 'Engineering', location: 'NYC' };
      const mockReport = { total: 50, byLocation: { NYC: 50 } };

      mockService.getHeadcountReport.mockResolvedValue(mockReport);

      await controller.getHeadcountReport(mockReq, mockRes);

      expect(mockService.getHeadcountReport).toHaveBeenCalledWith('org-123', {
        department: 'Engineering',
        location: 'NYC'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.getHeadcountReport.mockRejectedValue(error);

      await controller.getHeadcountReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in getHeadcountReport controller',
        { error: 'Service error' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('getTurnoverReport', () => {
    it('should return turnover report successfully', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const mockReport = {
        turnoverRate: 12.5,
        terminations: 10,
        hires: 15,
        byDepartment: { Engineering: 5, Sales: 3, HR: 2 }
      };

      mockService.getTurnoverReport.mockResolvedValue(mockReport);

      await controller.getTurnoverReport(mockReq, mockRes);

      expect(mockService.getTurnoverReport).toHaveBeenCalledWith('org-123', '2025-01-01', '2025-12-31');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if startDate is missing', async () => {
      mockReq.query = { endDate: '2025-12-31' };

      await controller.getTurnoverReport(mockReq, mockRes);

      expect(mockService.getTurnoverReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required'
      });
    });

    it('should return 400 if endDate is missing', async () => {
      mockReq.query = { startDate: '2025-01-01' };

      await controller.getTurnoverReport(mockReq, mockRes);

      expect(mockService.getTurnoverReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required'
      });
    });

    it('should handle service errors', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const error = new Error('Database error');
      mockService.getTurnoverReport.mockRejectedValue(error);

      await controller.getTurnoverReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in getTurnoverReport controller',
        { error: 'Database error' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getTimeOffReport', () => {
    it('should return time-off report successfully', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const mockReport = {
        totalDays: 150,
        byType: { Vacation: 80, Sick: 40, Personal: 30 },
        byEmployee: [{ employeeId: 'emp-1', days: 10 }]
      };

      mockService.getTimeOffReport.mockResolvedValue(mockReport);

      await controller.getTimeOffReport(mockReq, mockRes);

      expect(mockService.getTimeOffReport).toHaveBeenCalledWith('org-123', '2025-01-01', '2025-12-31');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if dates are missing', async () => {
      mockReq.query = {};

      await controller.getTimeOffReport(mockReq, mockRes);

      expect(mockService.getTimeOffReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'startDate and endDate are required'
      });
    });

    it('should handle service errors', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const error = new Error('Service error');
      mockService.getTimeOffReport.mockRejectedValue(error);

      await controller.getTimeOffReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAttendanceReport', () => {
    it('should return attendance report successfully', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const mockReport = {
        averageAttendance: 95.5,
        totalDays: 250,
        present: 239,
        absent: 11,
        byEmployee: [{ employeeId: 'emp-1', attendanceRate: 98 }]
      };

      mockService.getAttendanceReport.mockResolvedValue(mockReport);

      await controller.getAttendanceReport(mockReq, mockRes);

      expect(mockService.getAttendanceReport).toHaveBeenCalledWith('org-123', '2025-01-01', '2025-12-31');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if dates are missing', async () => {
      mockReq.query = { startDate: '2025-01-01' };

      await controller.getAttendanceReport(mockReq, mockRes);

      expect(mockService.getAttendanceReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const error = new Error('Query error');
      mockService.getAttendanceReport.mockRejectedValue(error);

      await controller.getAttendanceReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPerformanceReport', () => {
    it('should return performance report successfully', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const mockReport = {
        averageRating: 4.2,
        reviewsCompleted: 85,
        topPerformers: [{ employeeId: 'emp-1', rating: 5 }],
        byDepartment: { Engineering: 4.5, Sales: 4.0 }
      };

      mockService.getPerformanceReport.mockResolvedValue(mockReport);

      await controller.getPerformanceReport(mockReq, mockRes);

      expect(mockService.getPerformanceReport).toHaveBeenCalledWith('org-123', '2025-01-01', '2025-12-31');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should return 400 if dates are missing', async () => {
      mockReq.query = { endDate: '2025-12-31' };

      await controller.getPerformanceReport(mockReq, mockRes);

      expect(mockService.getPerformanceReport).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      mockReq.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31'
      };

      const error = new Error('Calculation error');
      mockService.getPerformanceReport.mockRejectedValue(error);

      await controller.getPerformanceReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getBenefitsReport', () => {
    it('should return benefits report successfully', async () => {
      const mockReport = {
        totalEnrollments: 80,
        byPlan: { Health: 75, Dental: 70, Vision: 60 },
        coverage: { Single: 40, Family: 40 },
        enrollmentRate: 80
      };

      mockService.getBenefitsReport.mockResolvedValue(mockReport);

      await controller.getBenefitsReport(mockReq, mockRes);

      expect(mockService.getBenefitsReport).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockService.getBenefitsReport.mockRejectedValue(error);

      await controller.getBenefitsReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in getBenefitsReport controller',
        { error: 'Service error' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service error'
      });
    });
  });

  describe('getDashboardReport', () => {
    it('should return dashboard report successfully', async () => {
      const mockReport = {
        headcount: 100,
        newHires: 5,
        terminations: 2,
        pendingTimeOff: 8,
        recentAttendance: 98.5,
        upcomingReviews: 12,
        benefitsEnrollment: 85
      };

      mockService.getDashboardReport.mockResolvedValue(mockReport);

      await controller.getDashboardReport(mockReq, mockRes);

      expect(mockService.getDashboardReport).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Aggregation error');
      mockService.getDashboardReport.mockRejectedValue(error);

      await controller.getDashboardReport(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in getDashboardReport controller',
        { error: 'Aggregation error' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Aggregation error'
      });
    });
  });
});
