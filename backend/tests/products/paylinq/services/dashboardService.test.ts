/**
 * DashboardService Test Suite
 * 
 * Tests for PayLinQ dashboard service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DashboardService from '../../../../src/products/paylinq/services/dashboardService.js';

describe('DashboardService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      getPayrollMetrics: jest.fn(),
      getEmployeeMetrics: jest.fn(),
      getTimesheetMetrics: jest.fn(),
      getUpcomingPayrolls: jest.fn(),
      getRecentActivity: jest.fn()
    };

    // Inject mock repository using DI pattern
    service = new DashboardService(mockRepository);
  });

  describe('calculateDaysUntilNextPayroll', () => {
    it('should calculate days until next payroll correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingPayrolls = [
        { payment_date: tomorrow }
      ];

      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      expect(result).toBe(1);
    });

    it('should return 0 for empty payroll array', () => {
      const result = service.calculateDaysUntilNextPayroll([]);

      expect(result).toBe(0);
    });

    it('should return 0 for null/undefined input', () => {
      expect(service.calculateDaysUntilNextPayroll(null)).toBe(0);
      expect(service.calculateDaysUntilNextPayroll(undefined)).toBe(0);
    });

    it('should return 0 for past payment dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const upcomingPayrolls = [
        { payment_date: yesterday }
      ];

      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      expect(result).toBe(0);
    });

    it('should return 0 when payroll has no payment_date', () => {
      const upcomingPayrolls = [
        { id: '123' }
      ];

      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      expect(result).toBe(0);
    });

    it('should calculate multiple days correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const upcomingPayrolls = [
        { payment_date: futureDate }
      ];

      const result = service.calculateDaysUntilNextPayroll(upcomingPayrolls);

      expect(result).toBe(7);
    });
  });

  describe('getDashboardOverview', () => {
    it('should get dashboard overview with all metrics', async () => {
      // Mock repository responses
      const mockPayrollStats = {
        totalGrossPay: 100000,
        totalNetPay: 80000,
        totalTaxes: 20000
      };

      const mockEmployeeStats = {
        totalEmployees: 50,
        activeEmployees: 45
      };

      const mockTimesheetStats = {
        pendingApproval: 10,
        approved: 40
      };

      const mockUpcomingPayrolls = [
        { id: '1', payment_date: new Date('2025-02-15') }
      ];

      const mockRecentActivity = [
        { id: '1', action: 'payroll_run', timestamp: new Date() }
      ];

      mockRepository.getPayrollMetrics.mockResolvedValue(mockPayrollStats);
      mockRepository.getEmployeeMetrics.mockResolvedValue(mockEmployeeStats);
      mockRepository.getTimesheetMetrics.mockResolvedValue(mockTimesheetStats);
      mockRepository.getUpcomingPayrolls.mockResolvedValue(mockUpcomingPayrolls);
      mockRepository.getRecentActivity.mockResolvedValue(mockRecentActivity);

      const result = await service.getDashboardOverview(testOrganizationId, 30);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalWorkers).toBe(50);
      expect(result.summary.activeWorkers).toBe(45);
      expect(result.summary.pendingApprovals).toBe(10);
      expect(result.summary.monthlyCost).toBe(100000);
      expect(result.payroll).toEqual(mockPayrollStats);
      expect(result.employees).toEqual(mockEmployeeStats);
      expect(result.timesheets).toEqual(mockTimesheetStats);
      expect(result.upcomingPayrolls).toEqual(mockUpcomingPayrolls);
      expect(result.recentActivity).toEqual(mockRecentActivity);
    });

    it('should handle missing pendingApproval in timesheet stats', async () => {
      mockRepository.getPayrollMetrics.mockResolvedValue({});
      mockRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0, activeEmployees: 0 });
      mockRepository.getTimesheetMetrics.mockResolvedValue({}); // No pendingApproval
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);

      const result = await service.getDashboardOverview(testOrganizationId);

      expect(result.summary.pendingApprovals).toBe(0);
    });

    it('should call repository methods with correct parameters', async () => {
      mockRepository.getPayrollMetrics.mockResolvedValue({});
      mockRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0, activeEmployees: 0 });
      mockRepository.getTimesheetMetrics.mockResolvedValue({});
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);

      await service.getDashboardOverview(testOrganizationId, 60);

      expect(mockRepository.getPayrollMetrics).toHaveBeenCalledWith(
        testOrganizationId,
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockRepository.getEmployeeMetrics).toHaveBeenCalledWith(testOrganizationId);
      expect(mockRepository.getTimesheetMetrics).toHaveBeenCalledWith(
        testOrganizationId,
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockRepository.getUpcomingPayrolls).toHaveBeenCalledWith(testOrganizationId, 5);
      expect(mockRepository.getRecentActivity).toHaveBeenCalledWith(testOrganizationId, 10);
    });

    it('should use default period of 30 days', async () => {
      mockRepository.getPayrollMetrics.mockResolvedValue({});
      mockRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0, activeEmployees: 0 });
      mockRepository.getTimesheetMetrics.mockResolvedValue({});
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);

      await service.getDashboardOverview(testOrganizationId);

      // Verify dates are approximately 30 days apart
      const calls = mockRepository.getPayrollMetrics.mock.calls[0];
      const startDate = calls[1];
      const endDate = calls[2];
      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('should include empty pending approvals array', async () => {
      mockRepository.getPayrollMetrics.mockResolvedValue({});
      mockRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0, activeEmployees: 0 });
      mockRepository.getTimesheetMetrics.mockResolvedValue({});
      mockRepository.getUpcomingPayrolls.mockResolvedValue([]);
      mockRepository.getRecentActivity.mockResolvedValue([]);

      const result = await service.getDashboardOverview(testOrganizationId);

      expect(result.pendingApprovals).toEqual([]);
    });
  });

  describe('constructor', () => {
    it('should use provided repository', () => {
      const customRepo = { getPayrollMetrics: jest.fn() };
      const testService = new DashboardService(customRepo);

      expect(testService.repository).toBe(customRepo);
    });

    it('should create default repository when none provided', () => {
      const testService = new DashboardService();

      expect(testService.repository).toBeDefined();
    });
  });
});
