/**
 * Dashboard Service Tests
 * 
 * Unit tests for dashboard business logic and data transformation.
 * Tests the critical transformation from repository data → frontend structure.
 * 
 * Tests would have caught:
 * - ❌ Missing summary object transformation
 * - ❌ Incorrect data structure mapping
 * - ❌ calculateDaysUntilNextPayroll edge cases
 */

import { jest } from '@jest/globals';
import dashboardService from '../../../../src/products/paylinq/services/dashboardService.js';
import dashboardRepository from '../../../../src/products/paylinq/repositories/dashboardRepository.js';

// Mock dependencies
jest.mock('../../../../src/products/paylinq/repositories/dashboardRepository.js');
jest.mock('../../../../src/utils/logger.js');

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getDashboardOverview - Main Dashboard Data
  // ============================================================================
  
  describe('getDashboardOverview', () => {
    test('should transform repository data into frontend structure', async () => {
      // Mock repository responses
      const mockPayrollMetrics = {
        totalPayrollRuns: 5,
        completedRuns: 4,
        processingRuns: 1,
        totalPaychecks: 20,
        totalGrossPay: 50000,
        totalNetPay: 40000,
        totalTaxes: 8000,
        totalDeductions: 2000
      };

      const mockEmployeeMetrics = {
        totalEmployees: 10,
        activeEmployees: 8,
        inactiveEmployees: 2,
        workerTypesCount: 3,
        workerTypeBreakdown: []
      };

      const mockTimesheetMetrics = {
        totalTimesheets: 15,
        pendingApproval: 3,
        approved: 10,
        rejected: 2,
        totalHours: 600,
        overtimeHours: 20
      };

      const mockUpcomingPayrolls = [
        {
          id: 'pr-1',
          period_start: '2024-11-01',
          period_end: '2024-11-15',
          payment_date: '2024-11-20',
          status: 'draft'
        }
      ];

      const mockRecentActivity = [
        { id: 'act-1', type: 'payroll_run', description: 'Payroll completed' }
      ];

      dashboardRepository.getPayrollMetrics.mockResolvedValue(mockPayrollMetrics);
      dashboardRepository.getEmployeeMetrics.mockResolvedValue(mockEmployeeMetrics);
      dashboardRepository.getTimesheetMetrics.mockResolvedValue(mockTimesheetMetrics);
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue(mockUpcomingPayrolls);
      dashboardRepository.getRecentActivity.mockResolvedValue(mockRecentActivity);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      // CRITICAL: Verify summary object exists (would have caught TypeError)
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalWorkers');
      expect(result.summary).toHaveProperty('activeWorkers');
      expect(result.summary).toHaveProperty('workersTrend');
      expect(result.summary).toHaveProperty('pendingApprovals');
      expect(result.summary).toHaveProperty('daysUntilPayroll');
      expect(result.summary).toHaveProperty('monthlyCost');
      expect(result.summary).toHaveProperty('costTrend');

      // Verify correct mapping
      expect(result.summary.totalWorkers).toBe(10); // From employeeMetrics.totalEmployees
      expect(result.summary.activeWorkers).toBe(8); // From employeeMetrics.activeEmployees
      expect(result.summary.pendingApprovals).toBe(3); // From timesheetMetrics.pendingApproval
      expect(result.summary.monthlyCost).toBe(50000); // From payrollMetrics.totalGrossPay

      // Verify other required fields
      expect(result).toHaveProperty('payroll');
      expect(result).toHaveProperty('employees');
      expect(result).toHaveProperty('timesheets');
      expect(result).toHaveProperty('upcomingPayrolls');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('pendingApprovals');
    });

    test('should handle empty database (0 employees, 0 payrolls)', async () => {
      // Mock empty data
      dashboardRepository.getPayrollMetrics.mockResolvedValue({
        totalPayrollRuns: 0,
        completedRuns: 0,
        processingRuns: 0,
        totalPaychecks: 0,
        totalGrossPay: 0,
        totalNetPay: 0,
        totalTaxes: 0,
        totalDeductions: 0
      });

      dashboardRepository.getEmployeeMetrics.mockResolvedValue({
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        workerTypesCount: 0,
        workerTypeBreakdown: []
      });

      dashboardRepository.getTimesheetMetrics.mockResolvedValue({
        totalTimesheets: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        totalHours: 0,
        overtimeHours: 0
      });

      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      // Verify all numbers are 0, not null or undefined
      expect(result.summary.totalWorkers).toBe(0);
      expect(result.summary.activeWorkers).toBe(0);
      expect(result.summary.pendingApprovals).toBe(0);
      expect(result.summary.daysUntilPayroll).toBe(0);
      expect(result.summary.monthlyCost).toBe(0);
      expect(result.summary.workersTrend).toBe(0);
      expect(result.summary.costTrend).toBe(0);

      // Verify arrays are empty, not null
      expect(result.upcomingPayrolls).toEqual([]);
      expect(result.recentActivity).toEqual([]);
      expect(result.pendingApprovals).toEqual([]);
    });

    test('should calculate days until next payroll correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      dashboardRepository.getPayrollMetrics.mockResolvedValue({});
      dashboardRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0 });
      dashboardRepository.getTimesheetMetrics.mockResolvedValue({ pendingApproval: 0 });
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([
        {
          id: 'pr-1',
          payment_date: futureDate.toISOString(),
          status: 'draft'
        }
      ]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      expect(result.summary.daysUntilPayroll).toBe(7);
    });

    test('should return 0 days when no upcoming payrolls', async () => {
      dashboardRepository.getPayrollMetrics.mockResolvedValue({});
      dashboardRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0 });
      dashboardRepository.getTimesheetMetrics.mockResolvedValue({ pendingApproval: 0 });
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      expect(result.summary.daysUntilPayroll).toBe(0);
    });

    test('should return 0 days when payment_date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      dashboardRepository.getPayrollMetrics.mockResolvedValue({});
      dashboardRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0 });
      dashboardRepository.getTimesheetMetrics.mockResolvedValue({ pendingApproval: 0 });
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([
        {
          id: 'pr-1',
          payment_date: pastDate.toISOString(),
          status: 'completed'
        }
      ]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      expect(result.summary.daysUntilPayroll).toBe(0);
    });

    test('should handle null payment_date gracefully', async () => {
      dashboardRepository.getPayrollMetrics.mockResolvedValue({});
      dashboardRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0 });
      dashboardRepository.getTimesheetMetrics.mockResolvedValue({ pendingApproval: 0 });
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([
        {
          id: 'pr-1',
          payment_date: null,
          status: 'draft'
        }
      ]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30);

      expect(result.summary.daysUntilPayroll).toBe(0);
    });

    test('should use correct period parameter', async () => {
      dashboardRepository.getPayrollMetrics.mockResolvedValue({});
      dashboardRepository.getEmployeeMetrics.mockResolvedValue({ totalEmployees: 0 });
      dashboardRepository.getTimesheetMetrics.mockResolvedValue({ pendingApproval: 0 });
      dashboardRepository.getUpcomingPayrolls.mockResolvedValue([]);
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      await dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 60);

      // Verify startDate is 60 days ago
      const call = dashboardRepository.getPayrollMetrics.mock.calls[0];
      expect(call[0]).toBe('9ee50aee-76c3-46ce-87ed-005c6dd893ef');
      
      const startDate = call[1];
      const endDate = call[2];
      const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(60);
    });

    test('should handle repository errors gracefully', async () => {
      dashboardRepository.getPayrollMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        dashboardService.getDashboardOverview('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 30)
      ).rejects.toThrow('Database connection failed');
    });
  });

  // ============================================================================
  // getPayrollStats - Detailed Payroll Statistics
  // ============================================================================
  
  describe('getPayrollStats', () => {
    test('should return payroll statistics', async () => {
      const mockStats = {
        totalPayrollRuns: 10,
        totalGrossPay: 100000,
        totalNetPay: 80000
      };

      dashboardRepository.getPayrollMetrics.mockResolvedValue(mockStats);

      const result = await dashboardService.getPayrollStats(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        '2024-01-01',
        '2024-12-31'
      );

      expect(result).toEqual(mockStats);
      expect(dashboardRepository.getPayrollMetrics).toHaveBeenCalledWith(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        expect.any(Date),
        expect.any(Date)
      );
    });

    test('should default to current month when dates not provided', async () => {
      dashboardRepository.getPayrollMetrics.mockResolvedValue({});

      await dashboardService.getPayrollStats('9ee50aee-76c3-46ce-87ed-005c6dd893ef', null, null);

      const call = dashboardRepository.getPayrollMetrics.mock.calls[0];
      const startDate = call[1];
      
      // Should be first day of current month
      expect(startDate.getDate()).toBe(1);
    });
  });

  // ============================================================================
  // getEmployeeStats - Employee Statistics
  // ============================================================================
  
  describe('getEmployeeStats', () => {
    test('should return employee statistics', async () => {
      const mockStats = {
        totalEmployees: 50,
        activeEmployees: 45,
        inactiveEmployees: 5,
        workerTypesCount: 4,
        workerTypeBreakdown: []
      };

      dashboardRepository.getEmployeeMetrics.mockResolvedValue(mockStats);

      const result = await dashboardService.getEmployeeStats('9ee50aee-76c3-46ce-87ed-005c6dd893ef');

      expect(result).toEqual(mockStats);
    });
  });

  // ============================================================================
  // getRecentActivity - Recent Activity List
  // ============================================================================
  
  describe('getRecentActivity', () => {
    test('should return recent activity', async () => {
      const mockActivity = [
        { id: 'act-1', type: 'payroll', description: 'Payroll completed' },
        { id: 'act-2', type: 'timesheet', description: 'Timesheet approved' }
      ];

      dashboardRepository.getRecentActivity.mockResolvedValue(mockActivity);

      const result = await dashboardService.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      expect(result).toEqual(mockActivity);
      expect(dashboardRepository.getRecentActivity).toHaveBeenCalledWith(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        10
      );
    });

    test('should handle empty activity list', async () => {
      dashboardRepository.getRecentActivity.mockResolvedValue([]);

      const result = await dashboardService.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      expect(result).toEqual([]);
    });
  });
});


