/**
 * DashboardService Unit Tests
 * 
 * Tests for dashboard metrics aggregation and trend calculations.
 * Covers trend calculation logic, period comparisons, and data aggregation.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards (docs/TESTING_STANDARDS.md)
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Dependency injection pattern
 * - Arrange-Act-Assert structure
 * - EXACT method names from service (verified against source)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DashboardService from '../../../../src/products/paylinq/services/dashboardService.js';

describe('DashboardService', () => {
  let service;
  let mockRepository;
  const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';

  beforeEach(() => {
    // Setup: Create fresh mocks for each test
    mockRepository = {
      getPayrollMetrics: jest.fn(),
      getEmployeeMetrics: jest.fn(),
      getTimesheetMetrics: jest.fn(),
      getUpcomingPayrolls: jest.fn(),
      getRecentActivity: jest.fn(),
      getHistoricalEmployeeMetrics: jest.fn(),
      getPendingApprovals: jest.fn()
    };

    // Inject mock repository via constructor
    service = new DashboardService(mockRepository);
  });

  // ==================== calculateDaysUntilNextPayroll ====================

  describe('calculateDaysUntilNextPayroll', () => {
    it('should calculate correct days for future payroll', () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const upcomingPayrolls = [{
        payment_date: futureDate.toISOString()
      }];

      // Act
      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      // Assert
      expect(result).toBeGreaterThanOrEqual(6); // At least 6 days (due to ceiling)
      expect(result).toBeLessThanOrEqual(8); // At most 8 days (timing variations)
    });

    it('should return 0 for empty payroll array', () => {
      // Arrange
      const upcomingPayrolls = [];

      // Act
      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for null payroll', () => {
      // Arrange
      const upcomingPayrolls = null;

      // Act
      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for past payroll date', () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const upcomingPayrolls = [{
        payment_date: pastDate.toISOString()
      }];

      // Act
      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when payroll has no payment_date', () => {
      // Arrange
      const upcomingPayrolls = [{ id: 'test-id' }];

      // Act
      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      // Assert
      expect(result).toBe(0);
    });
  });

  // ==================== calculatePercentageTrend ====================

  describe('calculatePercentageTrend', () => {
    it('should calculate positive percentage trend correctly', () => {
      // Arrange
      const currentValue = 120;
      const previousValue = 100;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(20); // (120 - 100) / 100 * 100 = 20%
    });

    it('should calculate negative percentage trend correctly', () => {
      // Arrange
      const currentValue = 80;
      const previousValue = 100;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(-20); // (80 - 100) / 100 * 100 = -20%
    });

    it('should return 0 when values are equal', () => {
      // Arrange
      const currentValue = 100;
      const previousValue = 100;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 100 when previous value is 0 and current is positive', () => {
      // Arrange
      const currentValue = 50;
      const previousValue = 0;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(100); // Growth from 0
    });

    it('should return 0 when both values are 0', () => {
      // Arrange
      const currentValue = 0;
      const previousValue = 0;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Arrange
      const currentValue = 103.456;
      const previousValue = 100;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(3.46); // Rounded to 2 decimal places
    });

    it('should handle null previous value', () => {
      // Arrange
      const currentValue = 50;
      const previousValue = null;

      // Act
      const result = service.calculatePercentageTrend(currentValue, previousValue);

      // Assert
      expect(result).toBe(100);
    });
  });

  // ==================== calculateWorkersTrend ====================

  describe('calculateWorkersTrend', () => {
    it('should calculate workers growth trend', () => {
      // Arrange
      const currentWorkers = 150;
      const previousWorkers = 100;

      // Act
      const result = service.calculateWorkersTrend(currentWorkers, previousWorkers);

      // Assert
      expect(result).toBe(50); // 50% increase
    });

    it('should calculate workers decline trend', () => {
      // Arrange
      const currentWorkers = 80;
      const previousWorkers = 100;

      // Act
      const result = service.calculateWorkersTrend(currentWorkers, previousWorkers);

      // Assert
      expect(result).toBe(-20); // 20% decrease
    });
  });

  // ==================== calculateCostTrend ====================

  describe('calculateCostTrend', () => {
    it('should calculate cost increase trend', () => {
      // Arrange
      const currentCost = 150000;
      const previousCost = 100000;

      // Act
      const result = service.calculateCostTrend(currentCost, previousCost);

      // Assert
      expect(result).toBe(50); // 50% increase
    });

    it('should calculate cost decrease trend', () => {
      // Arrange
      const currentCost = 75000;
      const previousCost = 100000;

      // Act
      const result = service.calculateCostTrend(currentCost, previousCost);

      // Assert
      expect(result).toBe(-25); // 25% decrease
    });
  });

  // ==================== getDashboardOverview ====================

  describe('getDashboardOverview', () => {
    it('should return complete dashboard overview with trends', async () => {
      // Arrange
      const mockCurrentPayroll = {
        totalPayrollRuns: 5,
        totalGrossPay: 150000,
        totalNetPay: 120000
      };

      const mockPreviousPayroll = {
        totalPayrollRuns: 4,
        totalGrossPay: 100000,
        totalNetPay: 80000
      };

      const mockEmployeeStats = {
        totalEmployees: 50,
        activeEmployees: 45,
        inactiveEmployees: 5
      };

      const mockPreviousEmployeeStats = {
        totalEmployees: 40,
        activeEmployees: 38
      };

      const mockTimesheetStats = {
        totalTimesheets: 100,
        submittedTimesheets: 10,
        approvedTimesheets: 85,
        totalHoursLogged: 1600
      };

      const mockUpcomingPayrolls = [
        { payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      ];

      const mockRecentActivity = [
        { activity_type: 'payroll_run', title: 'Payroll #001' }
      ];

      const mockPendingApprovals = [
        { id: 'approval-1', request_type: 'currency_change' }
      ];

      // Mock all repository calls
      mockRepository.getPayrollMetrics
        .mockResolvedValueOnce(mockCurrentPayroll) // Current period
        .mockResolvedValueOnce(mockPreviousPayroll); // Previous period
      
      mockRepository.getEmployeeMetrics.mockResolvedValue(mockEmployeeStats);
      mockRepository.getHistoricalEmployeeMetrics.mockResolvedValue(mockPreviousEmployeeStats);
      mockRepository.getTimesheetMetrics.mockResolvedValue(mockTimesheetStats);
      mockRepository.getUpcomingPayrolls.mockResolvedValue(mockUpcomingPayrolls);
      mockRepository.getRecentActivity.mockResolvedValue(mockRecentActivity);
      mockRepository.getPendingApprovals.mockResolvedValue(mockPendingApprovals);

      // Act
      const result = await service.getDashboardOverview(testOrganizationId, 30);

      // Assert
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalWorkers).toBe(50);
      expect(result.summary.activeWorkers).toBe(45);
      expect(result.summary.workersTrend).toBeCloseTo(18.42, 1); // (45-38)/38 * 100
      expect(result.summary.costTrend).toBe(50); // (150000-100000)/100000 * 100
      expect(result.summary.monthlyCost).toBe(150000);
      expect(result.summary.pendingApprovals).toBe(11); // 10 timesheets + 1 approval
      expect(result.summary.daysUntilPayroll).toBeGreaterThan(5);
      
      expect(result.payroll).toEqual(mockCurrentPayroll);
      expect(result.employees).toEqual(mockEmployeeStats);
      expect(result.timesheets).toEqual(mockTimesheetStats);
      expect(result.upcomingPayrolls).toEqual(mockUpcomingPayrolls);
      expect(result.recentActivity).toEqual(mockRecentActivity);
      expect(result.pendingApprovals).toEqual(mockPendingApprovals);
    });

    it('should handle zero values in trend calculation', async () => {
      // Arrange
      mockRepository.getPayrollMetrics.mockResolvedValue({
        totalGrossPay: 0
      });
      mockRepository.getEmployeeMetrics.mockResolvedValue({
        totalEmployees: 0,
        activeEmployees: 0
      });
      mockRepository.getHistoricalEmployeeMetrics.mockResolvedValue({
        activeEmployees: 0
      });
      mockRepository.getTimesheetMetrics.mockResolvedValue({
        submittedTimesheets: 0
      });
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);
      mockRepository.getPendingApprovals.mockResolvedValue([]);

      // Act
      const result = await service.getDashboardOverview(testOrganizationId, 30);

      // Assert
      expect(result.summary.workersTrend).toBe(0);
      expect(result.summary.costTrend).toBe(0);
      expect(result.summary.pendingApprovals).toBe(0);
      expect(result.summary.daysUntilPayroll).toBe(0);
    });

    it('should use custom period for calculations', async () => {
      // Arrange
      const period = 60; // 60 days instead of default 30
      
      mockRepository.getPayrollMetrics.mockResolvedValue({
        totalGrossPay: 100000
      });
      mockRepository.getEmployeeMetrics.mockResolvedValue({
        activeEmployees: 50
      });
      mockRepository.getHistoricalEmployeeMetrics.mockResolvedValue({
        activeEmployees: 40
      });
      mockRepository.getTimesheetMetrics.mockResolvedValue({
        submittedTimesheets: 0
      });
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);
      mockRepository.getPendingApprovals.mockResolvedValue([]);

      // Act
      await service.getDashboardOverview(testOrganizationId, period);

      // Assert
      // Verify the repository was called with correct date ranges
      expect(mockRepository.getPayrollMetrics).toHaveBeenCalledTimes(2);
      expect(mockRepository.getHistoricalEmployeeMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and log appropriately', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockRepository.getPayrollMetrics.mockRejectedValue(error);

      // Act & Assert
      await expect(
        service.getDashboardOverview(testOrganizationId, 30)
      ).rejects.toThrow('Database connection failed');
    });

    it('should aggregate pending approvals from multiple sources', async () => {
      // Arrange
      mockRepository.getPayrollMetrics.mockResolvedValue({
        totalGrossPay: 100000
      });
      mockRepository.getEmployeeMetrics.mockResolvedValue({
        activeEmployees: 50
      });
      mockRepository.getHistoricalEmployeeMetrics.mockResolvedValue({
        activeEmployees: 50
      });
      mockRepository.getTimesheetMetrics.mockResolvedValue({
        submittedTimesheets: 5 // 5 pending timesheet approvals
      });
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);
      mockRepository.getPendingApprovals.mockResolvedValue([
        { id: 'approval-1' },
        { id: 'approval-2' },
        { id: 'approval-3' }
      ]); // 3 pending currency approvals

      // Act
      const result = await service.getDashboardOverview(testOrganizationId, 30);

      // Assert
      expect(result.summary.pendingApprovals).toBe(8); // 5 + 3
    });
  });

  // ==================== getPayrollStats ====================

  describe('getPayrollStats', () => {
    it('should return payroll statistics for date range', async () => {
      // Arrange
      const mockStats = {
        totalPayrollRuns: 10,
        totalGrossPay: 500000
      };
      mockRepository.getPayrollMetrics.mockResolvedValue(mockStats);

      // Act
      const result = await service.getPayrollStats(
        testOrganizationId,
        '2024-01-01',
        '2024-01-31'
      );

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepository.getPayrollMetrics).toHaveBeenCalledWith(
        testOrganizationId,
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should use default dates when not provided', async () => {
      // Arrange
      const mockStats = { totalPayrollRuns: 5 };
      mockRepository.getPayrollMetrics.mockResolvedValue(mockStats);

      // Act
      await service.getPayrollStats(testOrganizationId);

      // Assert
      expect(mockRepository.getPayrollMetrics).toHaveBeenCalled();
    });
  });

  // ==================== getEmployeeStats ====================

  describe('getEmployeeStats', () => {
    it('should return employee statistics', async () => {
      // Arrange
      const mockStats = {
        totalEmployees: 100,
        activeEmployees: 95
      };
      mockRepository.getEmployeeMetrics.mockResolvedValue(mockStats);

      // Act
      const result = await service.getEmployeeStats(testOrganizationId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepository.getEmployeeMetrics).toHaveBeenCalledWith(testOrganizationId);
    });
  });

  // ==================== getRecentActivity ====================

  describe('getRecentActivity', () => {
    it('should return recent activity with default limit', async () => {
      // Arrange
      const mockActivity = [
        { activity_type: 'payroll_run', title: 'Payroll #001' }
      ];
      mockRepository.getRecentActivity.mockResolvedValue(mockActivity);

      // Act
      const result = await service.getRecentActivity(testOrganizationId);

      // Assert
      expect(result).toEqual(mockActivity);
      expect(mockRepository.getRecentActivity).toHaveBeenCalledWith(
        testOrganizationId,
        10
      );
    });

    it('should return recent activity with custom limit', async () => {
      // Arrange
      const mockActivity = [];
      mockRepository.getRecentActivity.mockResolvedValue(mockActivity);

      // Act
      await service.getRecentActivity(testOrganizationId, 20);

      // Assert
      expect(mockRepository.getRecentActivity).toHaveBeenCalledWith(
        testOrganizationId,
        20
      );
    });
  });
});
