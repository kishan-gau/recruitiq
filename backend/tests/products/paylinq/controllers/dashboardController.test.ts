/**
 * Dashboard Controller Unit Tests
 * 
 * Tests for PayLinQ dashboard controller HTTP handlers.
 * Covers request/response handling, service integration, and error handling.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Mock req/res objects
 * - Service layer mocking
 * - EXACT method names from controller (verified against source)
 * 
 * VERIFIED METHODS (from source analysis):
 * 1. getDashboardOverview(req, res)
 * 2. getPayrollStats(req, res)
 * 3. getEmployeeStats(req, res)
 * 4. getRecentActivity(req, res)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock repository methods
const mockGetPayrollMetrics = jest.fn();
const mockGetEmployeeMetrics = jest.fn();
const mockGetTimesheetMetrics = jest.fn();
const mockGetUpcomingPayrolls = jest.fn();
const mockGetRecentActivityRepo = jest.fn();

// Mock dashboard repository before service
jest.mock('../../../../src/products/paylinq/repositories/dashboardRepository.js', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      getPayrollMetrics: mockGetPayrollMetrics,
      getEmployeeMetrics: mockGetEmployeeMetrics,
      getTimesheetMetrics: mockGetTimesheetMetrics,
      getUpcomingPayrolls: mockGetUpcomingPayrolls,
      getRecentActivity: mockGetRecentActivityRepo
    }))
  };
});

// Mock dependencies before importing controller
const mockGetDashboardOverview = jest.fn();
const mockGetPayrollStats = jest.fn();
const mockGetEmployeeStats = jest.fn();
const mockGetRecentActivity = jest.fn();

jest.mock('../../../../src/products/paylinq/services/dashboardService.js', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      getDashboardOverview: mockGetDashboardOverview,
      getPayrollStats: mockGetPayrollStats,
      getEmployeeStats: mockGetEmployeeStats,
      getRecentActivity: mockGetRecentActivity
    }))
  };
});

jest.mock('../../../../src/utils/logger.js', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));

import dashboardController from '../../../../src/products/paylinq/controllers/dashboardController.js';

describe('Dashboard Controller', () => {
  let mockReq: any;
  let mockRes: any;

  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Setup: Create fresh mock request/response for each test
    mockReq = {
      user: {
        id: testUserId,
        organization_id: testOrgId,
        user_type: 'tenant',
        email: 'test@example.com'
      },
      query: {},
      params: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    mockGetDashboardOverview.mockClear();
    mockGetPayrollStats.mockClear();
    mockGetEmployeeStats.mockClear();
    mockGetRecentActivity.mockClear();
    mockGetPayrollMetrics.mockClear();
    mockGetEmployeeMetrics.mockClear();
    mockGetTimesheetMetrics.mockClear();
    mockGetUpcomingPayrolls.mockClear();
    mockGetRecentActivityRepo.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
  });

  // ==================== getDashboardOverview ====================

  describe('getDashboardOverview', () => {
    it('should return dashboard data with default period', async () => {
      // Arrange
      const dashboardData = {
        totalEmployees: 50,
        activePayrolls: 3,
        pendingApprovals: 5,
        recentActivity: []
      };
      mockGetDashboardOverview.mockResolvedValue(dashboardData);

      // Act
      await dashboardController.getDashboardOverview(mockReq, mockRes);

      // Assert
      expect(mockGetDashboardOverview).toHaveBeenCalledWith(testOrgId, 30);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      });
    });

    it('should use custom period from query params', async () => {
      // Arrange
      mockReq.query.period = '60';
      mockGetDashboardOverview.mockResolvedValue({});

      // Act
      await dashboardController.getDashboardOverview(mockReq, mockRes);

      // Assert
      expect(mockGetDashboardOverview).toHaveBeenCalledWith(testOrgId, 60);
    });

    it('should return 400 when organization_id is missing', async () => {
      // Arrange
      mockReq.user.organization_id = undefined;

      // Act
      await dashboardController.getDashboardOverview(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Organization ID is required'),
        details: expect.objectContaining({
          userType: 'tenant',
          hasOrganization: false
        })
      });
      expect(mockGetDashboardOverview).not.toHaveBeenCalled();
    });

    it('should return 500 on service error', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockGetDashboardOverview.mockRejectedValue(error);

      // Act
      await dashboardController.getDashboardOverview(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch dashboard data'
      });
    });

    it('should handle missing user object', async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await dashboardController.getDashboardOverview(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockGetDashboardOverview).not.toHaveBeenCalled();
    });
  });

  // ==================== getPayrollStats ====================

  describe('getPayrollStats', () => {
    it('should return payroll statistics with date range', async () => {
      // Arrange
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      mockReq.query = { startDate, endDate };
      
      const stats = {
        totalGrossPay: 100000,
        totalNetPay: 75000,
        totalTaxes: 25000
      };
      mockGetPayrollStats.mockResolvedValue(stats);

      // Act
      await dashboardController.getPayrollStats(mockReq, mockRes);

      // Assert
      expect(mockGetPayrollStats).toHaveBeenCalledWith(testOrgId, startDate, endDate);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats,
        message: 'Payroll statistics retrieved successfully'
      });
    });

    it('should return 400 when organization_id is missing', async () => {
      // Arrange
      mockReq.user.organization_id = null;

      // Act
      await dashboardController.getPayrollStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Organization ID is required'
      });
      expect(mockGetPayrollStats).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      mockGetPayrollStats.mockRejectedValue(error);

      // Act
      await dashboardController.getPayrollStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch payroll statistics'
      });
    });

    it('should work without date range parameters', async () => {
      // Arrange
      mockGetPayrollStats.mockResolvedValue({});

      // Act
      await dashboardController.getPayrollStats(mockReq, mockRes);

      // Assert
      expect(mockGetPayrollStats).toHaveBeenCalledWith(testOrgId, undefined, undefined);
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== getEmployeeStats ====================

  describe('getEmployeeStats', () => {
    it('should return employee statistics', async () => {
      // Arrange
      const stats = {
        totalEmployees: 50,
        activeEmployees: 45,
        onLeave: 3,
        terminated: 2
      };
      mockGetEmployeeStats.mockResolvedValue(stats);

      // Act
      await dashboardController.getEmployeeStats(mockReq, mockRes);

      // Assert
      expect(mockGetEmployeeStats).toHaveBeenCalledWith(testOrgId);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats,
        message: 'Employee statistics retrieved successfully'
      });
    });

    it('should return 400 when organization_id is missing', async () => {
      // Arrange
      mockReq.user.organization_id = undefined;

      // Act
      await dashboardController.getEmployeeStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Organization ID is required'
      });
      expect(mockGetEmployeeStats).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      mockGetEmployeeStats.mockRejectedValue(error);

      // Act
      await dashboardController.getEmployeeStats(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch employee statistics'
      });
    });
  });

  // ==================== getRecentActivity ====================

  describe('getRecentActivity', () => {
    it('should return recent activity with default limit', async () => {
      // Arrange
      const activities = [
        { id: '1', type: 'payroll_run', timestamp: new Date() },
        { id: '2', type: 'employee_added', timestamp: new Date() }
      ];
      mockGetRecentActivity.mockResolvedValue(activities);

      // Act
      await dashboardController.getRecentActivity(mockReq, mockRes);

      // Assert
      expect(mockGetRecentActivity).toHaveBeenCalledWith(testOrgId, 10);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: activities,
        message: 'Recent activity retrieved successfully'
      });
    });

    it('should use custom limit from query params', async () => {
      // Arrange
      mockReq.query.limit = '20';
      mockGetRecentActivity.mockResolvedValue([]);

      // Act
      await dashboardController.getRecentActivity(mockReq, mockRes);

      // Assert
      expect(mockGetRecentActivity).toHaveBeenCalledWith(testOrgId, 20);
    });

    it('should return 400 when organization_id is missing', async () => {
      // Arrange
      mockReq.user.organization_id = null;

      // Act
      await dashboardController.getRecentActivity(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Organization ID is required'
      });
      expect(mockGetRecentActivity).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      mockGetRecentActivity.mockRejectedValue(error);

      // Act
      await dashboardController.getRecentActivity(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch recent activity'
      });
    });
  });

  // ==================== Default Export ====================

  describe('default export', () => {
    it('should export all controller methods', () => {
      expect(dashboardController).toBeDefined();
      expect(dashboardController.getDashboardOverview).toBeDefined();
      expect(dashboardController.getPayrollStats).toBeDefined();
      expect(dashboardController.getEmployeeStats).toBeDefined();
      expect(dashboardController.getRecentActivity).toBeDefined();
    });

    it('should have all methods as functions', () => {
      expect(typeof dashboardController.getDashboardOverview).toBe('function');
      expect(typeof dashboardController.getPayrollStats).toBe('function');
      expect(typeof dashboardController.getEmployeeStats).toBe('function');
      expect(typeof dashboardController.getRecentActivity).toBe('function');
    });
  });
});
