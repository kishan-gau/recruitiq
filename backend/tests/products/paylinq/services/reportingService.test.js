/**
 * Reporting Service Tests
 * 
 * Unit tests for ReportingService business logic.
 */

import ReportingService from '../../../../src/products/paylinq/services/reportingService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';
import TaxRepository from '../../../../src/products/paylinq/repositories/taxRepository.js';
import ComplianceRepository from '../../../../src/products/paylinq/repositories/complianceRepository.js';

// Mock dependencies

describe('ReportingService', () => {
  let service;
  let mockPayrollRepository;
  let mockTaxRepository;
  let mockComplianceRepository;

  beforeEach(() => {
    service = new ReportingService();
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    mockTaxRepository = TaxRepository.mock.instances[0];
    mockComplianceRepository = ComplianceRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Payroll Reports', () => {
    describe('generatePayrollSummaryReport', () => {
      test('should generate payroll summary for period', async () => {
        const mockPayrollRuns = [
          {
            id: 'run-1',
            gross_pay: 100000,
            net_pay: 75000,
            total_taxes: 20000,
            total_deductions: 5000,
            employee_count: 20
          },
          {
            id: 'run-2',
            gross_pay: 120000,
            net_pay: 90000,
            total_taxes: 24000,
            total_deductions: 6000,
            employee_count: 24
          }
        ];

        mockPayrollRepository.findPayrollRunsForPeriod = jest.fn().mockResolvedValue(mockPayrollRuns);

        const result = await service.generatePayrollSummaryReport(
          '2024-01-01',
          '2024-12-31',
          'org-789'
        );

        expect(result.totalGrossPay).toBe(220000);
        expect(result.totalNetPay).toBe(165000);
        expect(result.totalTaxes).toBe(44000);
        expect(result.totalDeductions).toBe(11000);
        expect(result.payrollRuns).toBe(2);
      });

      test('should handle period with no payroll runs', async () => {
        mockPayrollRepository.findPayrollRunsForPeriod = jest.fn().mockResolvedValue([]);

        const result = await service.generatePayrollSummaryReport(
          '2024-01-01',
          '2024-12-31',
          'org-789'
        );

        expect(result.totalGrossPay).toBe(0);
        expect(result.payrollRuns).toBe(0);
      });
    });

    describe('generatePayrollDetailReport', () => {
      test('should generate detailed payroll report', async () => {
        const mockPaychecks = [
          {
            employee_id: 'emp-1',
            gross_pay: 5000,
            net_pay: 3750,
            federal_tax: 800,
            social_security: 310,
            medicare: 72.5,
            deductions: 67.5
          }
        ];

        mockPayrollRepository.findPaychecksForPayrollRun = jest.fn().mockResolvedValue(mockPaychecks);

        const result = await service.generatePayrollDetailReport('run-123', 'org-789');

        expect(result.paychecks).toHaveLength(1);
        expect(result.summary.totalGross).toBe(5000);
        expect(result.summary.totalNet).toBe(3750);
      });
    });

    describe('generateEmployeePayStub', () => {
      test('should generate pay stub with all details', async () => {
        const mockPaycheck = {
          id: 'check-123',
          employee_id: 'emp-1',
          gross_pay: 5000,
          net_pay: 3750,
          period_start: '2024-01-01',
          period_end: '2024-01-15'
        };

        const mockDeductions = [
          { deduction_type: 'retirement', amount: 500 },
          { deduction_type: 'health', amount: 200 }
        ];

        const mockTaxes = {
          federal_tax: 800,
          state_tax: 200,
          social_security: 310,
          medicare: 72.5
        };

        mockPayrollRepository.findPaycheckById = jest.fn().mockResolvedValue(mockPaycheck);
        mockTaxRepository.findDeductionsForPaycheck = jest.fn().mockResolvedValue(mockDeductions);
        mockTaxRepository.findTaxesForPaycheck = jest.fn().mockResolvedValue(mockTaxes);

        const result = await service.generateEmployeePayStub('check-123', 'org-789');

        expect(result.earnings.grossPay).toBe(5000);
        expect(result.deductions).toHaveLength(2);
        expect(result.taxes.totalTaxes).toBeCloseTo(1382.5, 1);
        expect(result.netPay).toBe(3750);
      });
    });
  });

  describe('Tax Reports', () => {
    describe('generateQuarterlyTaxReport', () => {
      test('should generate quarterly 941 report', async () => {
        const mockTaxData = [
          { federal_tax: 10000, social_security: 6200, medicare: 1450 },
          { federal_tax: 12000, social_security: 7440, medicare: 1740 },
          { federal_tax: 11000, social_security: 6820, medicare: 1595 }
        ];

        mockTaxRepository.findTaxesForPeriod = jest.fn().mockResolvedValue(mockTaxData);

        const result = await service.generateQuarterlyTaxReport(
          2024,
          1, // Q1
          'org-789'
        );

        expect(result.quarter).toBe(1);
        expect(result.year).toBe(2024);
        expect(result.federalIncomeTax).toBe(33000);
        expect(result.socialSecurity.employee).toBe(20460);
        expect(result.medicare.employee).toBe(4785);
      });

      test('should calculate employer matching contributions', async () => {
        const mockTaxData = [
          { social_security: 6200, medicare: 1450 }
        ];

        mockTaxRepository.findTaxesForPeriod = jest.fn().mockResolvedValue(mockTaxData);

        const result = await service.generateQuarterlyTaxReport(2024, 1, 'org-789');

        expect(result.socialSecurity.employer).toBe(6200); // Matches employee
        expect(result.medicare.employer).toBe(1450); // Matches employee
      });
    });

    describe('generateW2Report', () => {
      test('should generate W-2 data for employee', async () => {
        const mockYearlyData = {
          gross_wages: 60000,
          federal_tax: 9600,
          social_security_wages: 60000,
          social_security_tax: 3720,
          medicare_wages: 60000,
          medicare_tax: 870,
          retirement_contributions: 6000
        };

        mockTaxRepository.findYearlyTaxData = jest.fn().mockResolvedValue(mockYearlyData);

        const result = await service.generateW2Report(
          'emp-123',
          2024,
          'org-789'
        );

        expect(result.year).toBe(2024);
        expect(result.box1_wages).toBe(54000); // 60000 - 6000 (401k)
        expect(result.box2_federal).toBe(9600);
        expect(result.box3_ss_wages).toBe(60000);
        expect(result.box4_ss_tax).toBe(3720);
        expect(result.box5_medicare_wages).toBe(60000);
        expect(result.box6_medicare_tax).toBe(870);
      });
    });

    describe('generate1099Report', () => {
      test('should generate 1099-NEC for contractor', async () => {
        const mockContractorPayments = [
          { amount: 10000 },
          { amount: 15000 },
          { amount: 12000 }
        ];

        mockPayrollRepository.findContractorPayments = jest.fn().mockResolvedValue(mockContractorPayments);

        const result = await service.generate1099Report(
          'contractor-123',
          2024,
          'org-789'
        );

        expect(result.year).toBe(2024);
        expect(result.box1_nonemployee_comp).toBe(37000);
      });
    });
  });

  describe('Compliance Reports', () => {
    describe('generateACAReport', () => {
      test('should generate 1095-C eligibility data', async () => {
        const mockEmployees = [
          {
            id: 'emp-1',
            full_time: true,
            average_hours: 35
          },
          {
            id: 'emp-2',
            full_time: false,
            average_hours: 25
          }
        ];

        mockPayrollRepository.findEmployeesForPeriod = jest.fn().mockResolvedValue(mockEmployees);

        const result = await service.generateACAReport(2024, 'org-789');

        expect(result.year).toBe(2024);
        expect(result.eligibleEmployees).toBe(1); // Only full-time
      });
    });

    describe('generateEEOCReport', () => {
      test('should generate EEO-1 demographic data', async () => {
        const mockDemographics = {
          total_employees: 100,
          by_gender: { male: 60, female: 40 },
          by_ethnicity: { white: 50, black: 20, hispanic: 20, asian: 10 },
          by_job_category: { executives: 5, managers: 15, professionals: 60, support: 20 }
        };

        mockPayrollRepository.getEmployeeDemographics = jest.fn().mockResolvedValue(mockDemographics);

        const result = await service.generateEEOCReport(2024, 'org-789');

        expect(result.totalEmployees).toBe(100);
        expect(result.demographics).toBeDefined();
      });
    });
  });

  describe('Department Reports', () => {
    describe('generateDepartmentCostReport', () => {
      test('should calculate costs by department', async () => {
        const mockDepartmentData = [
          {
            department: 'Engineering',
            gross_pay: 500000,
            benefits_cost: 100000,
            taxes: 80000
          },
          {
            department: 'Sales',
            gross_pay: 400000,
            benefits_cost: 80000,
            taxes: 64000
          }
        ];

        mockPayrollRepository.findPayrollByDepartment = jest.fn().mockResolvedValue(mockDepartmentData);

        const result = await service.generateDepartmentCostReport(
          '2024-01-01',
          '2024-12-31',
          'org-789'
        );

        expect(result.departments).toHaveLength(2);
        expect(result.departments[0].totalCost).toBe(680000);
        expect(result.totalOrganizationCost).toBe(1224000);
      });
    });
  });

  describe('Time & Attendance Reports', () => {
    describe('generateTimeSheetReport', () => {
      test('should summarize timesheets for period', async () => {
        const mockTimesheets = [
          { employee_id: 'emp-1', regular_hours: 80, overtime_hours: 5 },
          { employee_id: 'emp-2', regular_hours: 80, overtime_hours: 0 }
        ];

        mockPayrollRepository.findTimesheetsForPeriod = jest.fn().mockResolvedValue(mockTimesheets);

        const result = await service.generateTimeSheetReport(
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result.totalRegularHours).toBe(160);
        expect(result.totalOvertimeHours).toBe(5);
        expect(result.employees).toHaveLength(2);
      });
    });

    describe('generateAttendanceReport', () => {
      test('should track attendance metrics', async () => {
        const mockAttendance = {
          present_days: 20,
          absent_days: 2,
          late_days: 1,
          total_working_days: 22
        };

        mockPayrollRepository.getAttendanceData = jest.fn().mockResolvedValue(mockAttendance);

        const result = await service.generateAttendanceReport(
          'emp-123',
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result.attendanceRate).toBeCloseTo(90.9, 1); // 20/22 * 100
      });
    });
  });

  describe('Custom Reports', () => {
    describe('generateCustomReport', () => {
      test('should execute custom query and format results', async () => {
        const reportConfig = {
          name: 'High Earners',
          filters: { minSalary: 100000 },
          fields: ['employee_id', 'name', 'salary']
        };

        const mockData = [
          { employee_id: 'emp-1', name: 'John Doe', salary: 120000 },
          { employee_id: 'emp-2', name: 'Jane Smith', salary: 150000 }
        ];

        mockPayrollRepository.executeCustomQuery = jest.fn().mockResolvedValue(mockData);

        const result = await service.generateCustomReport(reportConfig, 'org-789');

        expect(result.data).toHaveLength(2);
        expect(result.recordCount).toBe(2);
      });
    });
  });

  describe('Report Scheduling', () => {
    describe('scheduleReport', () => {
      test('should schedule recurring report', async () => {
        const scheduleConfig = {
          reportType: 'payroll_summary',
          frequency: 'monthly',
          recipients: ['admin@company.com'],
          format: 'pdf'
        };

        mockPayrollRepository.createReportSchedule = jest.fn().mockResolvedValue({
          id: 'schedule-123',
          ...scheduleConfig
        });

        const result = await service.scheduleReport(scheduleConfig, 'org-789');

        expect(result.id).toBe('schedule-123');
        expect(result.frequency).toBe('monthly');
      });
    });
  });

  describe('Report Export', () => {
    describe('exportReportToCSV', () => {
      test('should convert report data to CSV format', () => {
        const reportData = {
          headers: ['Name', 'Department', 'Salary'],
          rows: [
            ['John Doe', 'Engineering', 100000],
            ['Jane Smith', 'Sales', 90000]
          ]
        };

        const result = service.exportReportToCSV(reportData);

        expect(result).toContain('Name,Department,Salary');
        expect(result).toContain('John Doe,Engineering,100000');
      });
    });

    describe('exportReportToPDF', () => {
      test('should generate PDF buffer', async () => {
        const reportData = {
          title: 'Payroll Summary',
          data: []
        };

        const result = await service.exportReportToPDF(reportData);

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.findPayrollRunsForPeriod = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.generatePayrollSummaryReport('2024-01-01', '2024-12-31', 'org-789')
      ).rejects.toThrow('Database error');
    });

    test('should handle invalid date range', async () => {
      await expect(
        service.generatePayrollSummaryReport('2024-12-31', '2024-01-01', 'org-789')
      ).rejects.toThrow(/invalid date range/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty result sets', async () => {
      mockPayrollRepository.findPayrollRunsForPeriod = jest.fn().mockResolvedValue([]);

      const result = await service.generatePayrollSummaryReport(
        '2024-01-01',
        '2024-12-31',
        'org-789'
      );

      expect(result.totalGrossPay).toBe(0);
      expect(result.payrollRuns).toBe(0);
    });

    test('should handle very large datasets efficiently', async () => {
      const largeDataset = Array(10000).fill({
        gross_pay: 5000,
        net_pay: 3750,
        total_taxes: 1000,
        total_deductions: 250
      });

      mockPayrollRepository.findPayrollRunsForPeriod = jest.fn().mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await service.generatePayrollSummaryReport(
        '2024-01-01',
        '2024-12-31',
        'org-789'
      );
      const endTime = Date.now();

      expect(result.payrollRuns).toBe(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});
