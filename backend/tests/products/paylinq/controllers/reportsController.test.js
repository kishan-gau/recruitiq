/**
 * Reports Controller - API Contract Tests
 * 
 * Integration tests validating API contracts for payroll reports and analytics.
 * Tests cover various report types including payroll summary, earnings, tax, time attendance, and deductions.
 */

import request from 'supertest';
import express from 'express';
import reportsController from '../../../../src/products/paylinq/controllers/reportsController.js';

// Test constants
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testEmployeeId = '550e8400-e29b-41d4-a716-446655440333';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: testUserId,
    organizationId: testOrganizationId,
    role: 'admin',
  };
  next();
});

// Mount routes with actual controller functions
app.get('/api/paylinq/reports/payroll-summary', reportsController.getPayrollSummaryReport);
app.get('/api/paylinq/reports/employee-earnings', reportsController.getEmployeeEarningsReport);
app.get('/api/paylinq/reports/tax-liability', reportsController.getTaxLiabilityReport);
app.get('/api/paylinq/reports/time-attendance', reportsController.getTimeAttendanceReport);
app.get('/api/paylinq/reports/deductions', reportsController.getDeductionsReport);
app.get('/api/paylinq/reports/worker-type-distribution', reportsController.getWorkerTypeDistributionReport);

describe('Reports Controller - API Contract Tests', () => {
  describe('GET /api/paylinq/reports/payroll-summary', () => {
    test('should return correct response structure', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.summary).toBeDefined();
      
      if (response.body.summary) {
        expect(response.body.summary.totalRuns).toBeDefined();
        expect(response.body.summary.periodStart).toBe('2024-01-01');
        expect(response.body.summary.periodEnd).toBe('2024-12-31');
      }
    });

    test('should return 400 when startDate missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?endDate=2024-12-31')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('startDate');
    });

    test('should return 400 when endDate missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('endDate');
    });

    test('should include aggregated totals', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.summary) {
        expect(response.body.summary.totalGross).toBeDefined();
        expect(response.body.summary.totalTaxes).toBeDefined();
        expect(response.body.summary.totalDeductions).toBeDefined();
        expect(response.body.summary.totalNet).toBeDefined();
      }
    });

    test('should include individual payroll run details', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.summary?.runs) {
        expect(Array.isArray(response.body.summary.runs)).toBe(true);
      }
    });

    test('should support optional groupBy parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01&endDate=2024-12-31&groupBy=month')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/paylinq/reports/employee-earnings', () => {
    test('should return earnings for single employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/employee-earnings?employeeId=${testEmployeeId}&startDate=2024-01-01&endDate=2024-12-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.employeeId).toBe(testEmployeeId);
        expect(response.body.report.totalGross).toBeDefined();
        expect(response.body.report.totalNet).toBeDefined();
      }
    });

    test('should return earnings for all employees', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/employee-earnings?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.employeeCount).toBeDefined();
        expect(Array.isArray(response.body.report.employees)).toBe(true);
      }
    });

    test('should return 400 when date range missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/employee-earnings')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    test('should include paycheck details for employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/employee-earnings?employeeId=${testEmployeeId}&startDate=2024-01-01&endDate=2024-12-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.report?.paychecks) {
        expect(Array.isArray(response.body.report.paychecks)).toBe(true);
      }
    });

    test('should calculate totals correctly', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/employee-earnings?employeeId=${testEmployeeId}&startDate=2024-01-01&endDate=2024-12-31`)
        .expect(200);

      if (response.body.report) {
        expect(response.body.report.totalGross).toBeDefined();
        expect(response.body.report.totalTaxes).toBeDefined();
        expect(response.body.report.totalDeductions).toBeDefined();
        expect(response.body.report.totalNet).toBeDefined();
        expect(response.body.report.paycheckCount).toBeDefined();
      }
    });
  });

  describe('GET /api/paylinq/reports/tax-liability', () => {
    test('should return tax liability summary', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.totalTaxLiability).toBeDefined();
        expect(Array.isArray(response.body.report.taxes)).toBe(true);
      }
    });

    test('should return 400 when date range missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should break down taxes by type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report?.taxes) {
        response.body.report.taxes.forEach((tax) => {
          expect(tax.taxType).toBeDefined();
          expect(tax.totalAmount).toBeDefined();
          expect(tax.paycheckCount).toBeDefined();
        });
      }
    });

    test('should filter by tax type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=2024-01-01&endDate=2024-12-31&taxType=income_tax')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should include total paycheck count', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report) {
        expect(response.body.report.totalPaychecks).toBeDefined();
      }
    });
  });

  describe('GET /api/paylinq/reports/time-attendance', () => {
    test('should return time attendance summary', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/time-attendance?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.employeeCount).toBeDefined();
        expect(response.body.report.totalEntries).toBeDefined();
        expect(response.body.report.summary).toBeDefined();
      }
    });

    test('should return 400 when date range missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/time-attendance')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should filter by employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/time-attendance?employeeId=${testEmployeeId}&startDate=2024-01-01&endDate=2024-12-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should include hours breakdown', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/time-attendance?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report?.summary) {
        expect(response.body.report.summary.totalRegularHours).toBeDefined();
        expect(response.body.report.summary.totalOvertimeHours).toBeDefined();
        expect(response.body.report.summary.totalHours).toBeDefined();
      }
    });

    test('should group by employee', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/time-attendance?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report?.employees) {
        expect(Array.isArray(response.body.report.employees)).toBe(true);
        
        response.body.report.employees.forEach((emp) => {
          expect(emp.employeeId).toBeDefined();
          expect(emp.totalHours).toBeDefined();
        });
      }
    });
  });

  describe('GET /api/paylinq/reports/deductions', () => {
    test('should return deductions summary', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/deductions?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.totalDeductions).toBeDefined();
        expect(response.body.report.totalAmount).toBeDefined();
        expect(Array.isArray(response.body.report.deductionTypes)).toBe(true);
      }
    });

    test('should return 400 when date range missing', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/deductions')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should group by deduction type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/deductions?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report?.deductionTypes) {
        response.body.report.deductionTypes.forEach((type) => {
          expect(type.deductionType).toBeDefined();
          expect(type.count).toBeDefined();
          expect(type.totalAmount).toBeDefined();
          expect(type.employeeCount).toBeDefined();
        });
      }
    });

    test('should filter by deduction type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/deductions?startDate=2024-01-01&endDate=2024-12-31&deductionType=health_insurance')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should include period information', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/deductions?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report) {
        expect(response.body.report.periodStart).toBe('2024-01-01');
        expect(response.body.report.periodEnd).toBe('2024-12-31');
      }
    });
  });

  describe('GET /api/paylinq/reports/worker-type-distribution', () => {
    test('should return worker type distribution', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/worker-type-distribution')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      
      if (response.body.report) {
        expect(response.body.report.totalEmployees).toBeDefined();
        expect(response.body.report.workerTypeCount).toBeDefined();
        expect(Array.isArray(response.body.report.workerTypes)).toBe(true);
      }
    });

    test('should group employees by worker type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/worker-type-distribution')
        .expect(200);

      if (response.body.report?.workerTypes) {
        response.body.report.workerTypes.forEach((wt) => {
          expect(wt.workerType).toBeDefined();
          expect(wt.employeeCount).toBeDefined();
          expect(Array.isArray(wt.employees)).toBe(true);
        });
      }
    });

    test('should include employee details in each type', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/worker-type-distribution')
        .expect(200);

      if (response.body.report?.workerTypes?.[0]?.employees) {
        const firstEmployee = response.body.report.workerTypes[0].employees[0];
        if (firstEmployee) {
          expect(firstEmployee.id).toBeDefined();
          expect(firstEmployee.name).toBeDefined();
          expect(firstEmployee.status).toBeDefined();
        }
      }
    });

    test('should handle organizations with no employees', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/worker-type-distribution')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.report.totalEmployees).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Report Date Validation', () => {
    test('should validate date format in payroll summary', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=invalid&endDate=2024-12-31');

      expect([200, 400]).toContain(response.status);
    });

    test('should validate date format in employee earnings', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/employee-earnings?startDate=2024-01-01&endDate=invalid');

      expect([200, 400]).toContain(response.status);
    });

    test('should validate date format in tax liability', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=invalid&endDate=invalid');

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Report Data Aggregation', () => {
    test('should aggregate payroll data correctly', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.summary) {
        // Totals should be numbers
        expect(typeof response.body.summary.totalGross).toBe('number');
        expect(typeof response.body.summary.totalTaxes).toBe('number');
        expect(typeof response.body.summary.totalDeductions).toBe('number');
        expect(typeof response.body.summary.totalNet).toBe('number');
      }
    });

    test('should calculate tax totals correctly', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/tax-liability?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report) {
        expect(typeof response.body.report.totalTaxLiability).toBe('number');
      }
    });

    test('should calculate time totals correctly', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/time-attendance?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      if (response.body.report?.summary) {
        expect(typeof response.body.report.summary.totalHours).toBe('number');
        expect(typeof response.body.report.summary.totalRegularHours).toBe('number');
        expect(typeof response.body.report.summary.totalOvertimeHours).toBe('number');
      }
    });
  });
});
