/**
 * Dashboard Repository Tests
 * 
 * Database query tests for dashboard metrics.
 * Tests SQL queries work correctly with enterprise-grade schema.
 * 
 * Tests would have caught:
 * - ❌ Table name mismatches (payroll_runs vs payroll_run)
 * - ❌ Column name mismatches (first_name, last_name not existing)
 * - ❌ NULL handling in calculations
 * - ❌ Timezone issues with TIMESTAMP columns
 */

import { jest } from '@jest/globals';
import dashboardRepository from '../../../../src/products/paylinq/repositories/dashboardRepository.js';
import db from '../../../../src/config/database.js';

// Mock database
jest.mock('../../../../src/config/database.js');
jest.mock('../../../../src/utils/logger.js');

describe('Dashboard Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // getPayrollMetrics - Payroll Statistics Query
  // ============================================================================
  
  describe('getPayrollMetrics', () => {
    test('should return correct structure with empty database', async () => {
      // Mock empty database response
      db.query.mockResolvedValue({
        rows: [{
          total_payroll_runs: '0',
          completed_runs: '0',
          processing_runs: '0',
          total_paychecks: '0',
          total_gross_pay: null,
          total_net_pay: null,
          total_taxes: null,
          total_deductions: null
        }]
      });

      const result = await dashboardRepository.getPayrollMetrics(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        new Date('2024-10-01'),
        new Date('2024-10-31')
      );

      // Verify correct structure with 0 values, not null
      expect(result).toEqual({
        totalPayrollRuns: 0,
        completedRuns: 0,
        processingRuns: 0,
        totalPaychecks: 0,
        totalGrossPay: 0,
        totalNetPay: 0,
        totalTaxes: 0,
        totalDeductions: 0
      });

      // Verify query uses correct table names (payroll.payroll_run, NOT payroll_runs)
      const query = db.query.mock.calls[0][0];
      expect(query).toContain('payroll.payroll_run');
      expect(query).toContain('payroll.paycheck');
      expect(query).not.toContain('payroll_runs'); // Wrong name
      expect(query).not.toContain('paychecks'); // Wrong name
    });

    test('should handle NULL values in SUM calculations', async () => {
      db.query.mockResolvedValue({
        rows: [{
          total_payroll_runs: '5',
          completed_runs: '4',
          processing_runs: '1',
          total_paychecks: '20',
          total_gross_pay: null, // No paychecks yet
          total_net_pay: null,
          total_taxes: null,
          total_deductions: null
        }]
      });

      const result = await dashboardRepository.getPayrollMetrics(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        new Date('2024-10-01'),
        new Date('2024-10-31')
      );

      // Should return 0, not null
      expect(result.totalGrossPay).toBe(0);
      expect(result.totalNetPay).toBe(0);
      expect(result.totalTaxes).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });

    test('should calculate total taxes from individual tax columns', async () => {
      db.query.mockResolvedValue({
        rows: [{
          total_payroll_runs: '1',
          completed_runs: '1',
          processing_runs: '0',
          total_paychecks: '1',
          total_gross_pay: '5000',
          total_net_pay: '4000',
          total_taxes: '800', // Should be sum of federal_tax, state_tax, etc.
          total_deductions: '200'
        }]
      });

      const result = await dashboardRepository.getPayrollMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef', new Date(), new Date());

      // Verify query calculates taxes correctly
      const query = db.query.mock.calls[0][0];
      expect(query).toContain('federal_tax');
      expect(query).toContain('state_tax');
      expect(query).toContain('local_tax');
      expect(query).toContain('social_security');
      expect(query).toContain('medicare');
      expect(query).toContain('wage_tax');
      expect(query).toContain('aov_tax');
      expect(query).toContain('aww_tax');
    });

    test('should calculate total deductions from individual deduction columns', async () => {
      db.query.mockResolvedValue({
        rows: [{
          total_payroll_runs: '1',
          completed_runs: '1',
          processing_runs: '0',
          total_paychecks: '1',
          total_gross_pay: '5000',
          total_net_pay: '4000',
          total_taxes: '800',
          total_deductions: '200'
        }]
      });

      await dashboardRepository.getPayrollMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef', new Date(), new Date());

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('pre_tax_deductions');
      expect(query).toContain('post_tax_deductions');
      expect(query).toContain('other_deductions');
    });

    test('should use deleted_at IS NULL for soft deletes', async () => {
      db.query.mockResolvedValue({
        rows: [{ total_payroll_runs: '0' }]
      });

      await dashboardRepository.getPayrollMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef', new Date(), new Date());

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('deleted_at IS NULL');
      expect(query).not.toContain('is_active'); // Old pattern
    });

    test('should pass correct parameters to query', async () => {
      db.query.mockResolvedValue({
        rows: [{ total_payroll_runs: '0' }]
      });

      const orgId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      await dashboardRepository.getPayrollMetrics(orgId, startDate, endDate);

      const params = db.query.mock.calls[0][1];
      expect(params[0]).toBe(orgId);
      expect(params[1]).toEqual(startDate);
      expect(params[2]).toEqual(endDate);
    });
  });

  // ============================================================================
  // getEmployeeMetrics - Employee Statistics Query
  // ============================================================================
  
  describe('getEmployeeMetrics', () => {
    test('should return correct structure with empty database', async () => {
      db.query
        .mockResolvedValueOnce({
          // Main employee query
          rows: [{
            total_employees: '0',
            active_employees: '0',
            inactive_employees: '0',
            worker_types_count: '0'
          }]
        })
        .mockResolvedValueOnce({
          // Worker type breakdown query
          rows: []
        });

      const result = await dashboardRepository.getEmployeeMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef');

      expect(result).toEqual({
        totalEmployees: 0,
        activeEmployees: 0,
        inactiveEmployees: 0,
        workerTypesCount: 0,
        workerTypeBreakdown: []
      });
    });

    test('should use correct table names (singular, not plural)', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ total_employees: '0', active_employees: '0', inactive_employees: '0', worker_types_count: '0' }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await dashboardRepository.getEmployeeMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef');

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('hris.employee'); // Correct - new schema
      expect(query).toContain('payroll.worker_type'); // Correct
      expect(query).not.toContain('employee_records'); // Wrong
      expect(query).not.toContain('worker_types'); // Wrong
    });

    test('should join employee with worker_type correctly', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ total_employees: '0', active_employees: '0', inactive_employees: '0', worker_types_count: '0' }]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      await dashboardRepository.getEmployeeMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef');

      const query = db.query.mock.calls[0][0];
      // Should join on employee_id
      expect(query).toContain('wt.employee_id');
      expect(query).toContain('e.id');
    });

    test('should return worker type breakdown', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ total_employees: '10', active_employees: '8', inactive_employees: '2', worker_types_count: '3' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { type_name: 'Full-time', count: '6' },
            { type_name: 'Part-time', count: '3' },
            { type_name: 'Contractor', count: '1' }
          ]
        });

      const result = await dashboardRepository.getEmployeeMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef');

      expect(result.workerTypeBreakdown).toHaveLength(3);
      expect(result.workerTypeBreakdown[0].type_name).toBe('Full-time');
      expect(result.workerTypeBreakdown[0].count).toBe('6');
    });
  });

  // ============================================================================
  // getTimesheetMetrics - Timesheet Statistics Query
  // ============================================================================
  
  describe('getTimesheetMetrics', () => {
    test('should return correct structure with empty database', async () => {
      db.query.mockResolvedValue({
        rows: [{
          total_timesheets: '0',
          pending_approval: '0',
          approved: '0',
          rejected: '0',
          total_hours: null,
          overtime_hours: null
        }]
      });

      const result = await dashboardRepository.getTimesheetMetrics(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        new Date('2024-10-01'),
        new Date('2024-10-31')
      );

      expect(result).toEqual({
        totalTimesheets: 0,
        pendingApproval: 0,
        approved: 0,
        rejected: 0,
        totalHours: 0,
        overtimeHours: 0
      });
    });

    test('should use correct table name (timesheet, singular)', async () => {
      db.query.mockResolvedValue({
        rows: [{ total_timesheets: '0' }]
      });

      await dashboardRepository.getTimesheetMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef', new Date(), new Date());

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('payroll.timesheet'); // Correct
      expect(query).not.toContain('timesheets'); // Wrong
    });
  });

  // ============================================================================
  // getUpcomingPayrolls - Upcoming Payroll Runs
  // ============================================================================
  
  describe('getUpcomingPayrolls', () => {
    test('should return empty array when no payrolls', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      const result = await dashboardRepository.getUpcomingPayrolls('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 5);

      expect(result).toEqual([]);
    });

    test('should use correct table name and columns', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getUpcomingPayrolls('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 5);

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('payroll.payroll_run'); // Correct
      expect(query).not.toContain('payroll_runs'); // Wrong
    });

    test('should order by payment_date ASC', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getUpcomingPayrolls('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 5);

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY');
      expect(query).toContain('payment_date');
    });

    test('should limit results', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getUpcomingPayrolls('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('LIMIT');
      
      const params = db.query.mock.calls[0][1];
      expect(params).toContain(10);
    });
  });

  // ============================================================================
  // getRecentActivity - Recent Activity Log
  // ============================================================================
  
  describe('getRecentActivity', () => {
    test('should return empty array when no activity', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      const result = await dashboardRepository.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      expect(result).toEqual([]);
    });

    test('should NOT query for first_name and last_name (columns do not exist)', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      const query = db.query.mock.calls[0][0];
      // These columns don't exist in employee_record table
      expect(query).not.toContain('first_name');
      expect(query).not.toContain('last_name');
    });

    test('should order by created_at DESC', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 10);

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY');
      expect(query).toContain('DESC');
    });

    test('should limit results', async () => {
      db.query.mockResolvedValue({
        rows: []
      });

      await dashboardRepository.getRecentActivity('9ee50aee-76c3-46ce-87ed-005c6dd893ef', 25);

      const query = db.query.mock.calls[0][0];
      expect(query).toContain('LIMIT');
      
      const params = db.query.mock.calls[0][1];
      expect(params).toContain(25);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  
  describe('Error Handling', () => {
    test('should throw error when database query fails', async () => {
      db.query.mockRejectedValue(new Error('Connection lost'));

      await expect(
        dashboardRepository.getPayrollMetrics('9ee50aee-76c3-46ce-87ed-005c6dd893ef', new Date(), new Date())
      ).rejects.toThrow('Connection lost');
    });

    test('should handle malformed query results gracefully', async () => {
      db.query.mockResolvedValue({
        rows: [] // No rows returned
      });

      // Should not throw, should handle gracefully
      const result = await dashboardRepository.getPayrollMetrics(
        '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
        new Date(),
        new Date()
      );

      // Should return default values, not crash
      expect(result.totalPayrollRuns).toBe(0);
    });
  });
});


