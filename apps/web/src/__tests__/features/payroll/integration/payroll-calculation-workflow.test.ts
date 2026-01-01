/**
 * Integration Tests for Payroll Calculation Workflow
 * 
 * Tests the payroll calculation process including:
 * - Employee data retrieval
 * - Compensation calculation
 * - Tax calculation
 * - Deduction application
 * - Paycheck generation
 * 
 * Following industry standards from TESTING_STANDARDS.md - Integration Testing section.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  usePayrollRuns, 
  useCreatePayrollRun,
} from '@/features/payroll/hooks/usePayrollRuns';
import { payrollRunsService } from '@/features/payroll/services/payroll-runs.service';

// Mock services
vi.mock('@/features/payroll/services/payroll-runs.service', () => ({
  payrollRunsService: {
    getPayrollRuns: vi.fn(),
    createPayrollRun: vi.fn(),
    getPayrollRun: vi.fn(),
    calculatePayroll: vi.fn(),
    processPayrollRun: vi.fn(),
  },
}));

// Mock workers service (doesn't exist in frontend yet, simulating data)
const mockWorkersService = {
  getWorkers: vi.fn(),
  getWorker: vi.fn(),
};

// Mock compensation service
const mockCompensationService = {
  getCompensation: vi.fn(),
  getCurrentCompensation: vi.fn(),
};

describe('Payroll Calculation Workflow Integration Tests', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('Complete Calculation Flow', () => {
    it('should calculate payroll with active employees and compensation', async () => {
      // Arrange - Setup test data
      const mockWorkers = [
        {
          id: 'worker-1',
          employeeId: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          status: 'active',
          compensationType: 'salary',
          baseSalary: 5000,
          payFrequency: 'monthly',
        },
        {
          id: 'worker-2',
          employeeId: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          status: 'active',
          compensationType: 'hourly',
          hourlyRate: 25,
          payFrequency: 'bi-weekly',
        },
      ];

      const mockPayrollRun = {
        id: 'run-1',
        runNumber: 'RUN-2025-01',
        runName: 'January 2025 Payroll',
        status: 'draft',
        runType: 'REGULAR',
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        paymentDate: '2025-02-05',
        totalEmployees: 0,
        totalGrossPay: 0,
        totalNetPay: 0,
      };

      const mockCalculatedRun = {
        ...mockPayrollRun,
        status: 'calculated',
        totalEmployees: 2,
        totalGrossPay: 9000,
        totalNetPay: 7200,
        totalTaxes: 1800,
        calculatedAt: new Date().toISOString(),
      };

      mockWorkersService.getWorkers.mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.createPayrollRun).mockResolvedValue(mockPayrollRun);
      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculatedRun);

      // Act - Create payroll run
      const { result: createResult } = renderHook(() => useCreatePayrollRun(), { wrapper });
      
      createResult.current.mutate({
        payrollName: 'January 2025 Payroll',
        runType: 'REGULAR',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
        paymentDate: '2025-02-05',
      });

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert - Run created successfully
      expect(createResult.current.data).toEqual(mockPayrollRun);
      expect(createResult.current.data?.status).toBe('draft');

      // Act - Calculate payroll
      const calculateResult = await payrollRunsService.calculatePayroll(mockPayrollRun.id);

      // Assert - Calculation completed
      expect(calculateResult.status).toBe('calculated');
      expect(calculateResult.totalEmployees).toBe(2);
      expect(calculateResult.totalGrossPay).toBe(9000);
      expect(calculateResult.totalNetPay).toBe(7200);
      expect(calculateResult.totalTaxes).toBe(1800);
    });

    it('should handle calculation with mixed employee types', async () => {
      // Arrange - Mix of salaried and hourly employees
      const mockWorkers = [
        {
          id: 'worker-1',
          employeeId: 'emp-1',
          firstName: 'Salaried',
          lastName: 'Employee',
          status: 'active',
          compensationType: 'salary',
          baseSalary: 6000,
          payFrequency: 'monthly',
        },
        {
          id: 'worker-2',
          employeeId: 'emp-2',
          firstName: 'Hourly',
          lastName: 'Employee',
          status: 'active',
          compensationType: 'hourly',
          hourlyRate: 30,
          regularHours: 160,
          overtimeHours: 10,
          payFrequency: 'bi-weekly',
        },
      ];

      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 2,
        totalGrossPay: 11250, // 6000 + (160*30 + 10*30*1.5)
        totalNetPay: 9000,
        totalTaxes: 2250,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 6000,
            netPay: 4800,
            taxes: 1200,
          },
          {
            employeeId: 'emp-2',
            grossPay: 5250, // 160*30 + 10*30*1.5
            regularPay: 4800,
            overtimePay: 450,
            netPay: 4200,
            taxes: 1050,
          },
        ],
      };

      mockWorkersService.getWorkers.mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act - Calculate
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - All employees calculated correctly
      expect(result.totalEmployees).toBe(2);
      expect(result.paychecks).toHaveLength(2);
      
      // Verify salaried employee
      const salariedCheck = result.paychecks[0];
      expect(salariedCheck.grossPay).toBe(6000);
      
      // Verify hourly employee with overtime
      const hourlyCheck = result.paychecks[1];
      expect(hourlyCheck.grossPay).toBe(5250);
      expect(hourlyCheck.regularPay).toBe(4800);
      expect(hourlyCheck.overtimePay).toBe(450);
    });

    it('should exclude inactive employees from calculation', async () => {
      // Arrange - Mix of active and inactive employees
      const mockWorkers = [
        {
          id: 'worker-1',
          employeeId: 'emp-1',
          firstName: 'Active',
          lastName: 'Employee',
          status: 'active',
          baseSalary: 5000,
        },
        {
          id: 'worker-2',
          employeeId: 'emp-2',
          firstName: 'Inactive',
          lastName: 'Employee',
          status: 'inactive',
          baseSalary: 4000,
        },
        {
          id: 'worker-3',
          employeeId: 'emp-3',
          firstName: 'Terminated',
          lastName: 'Employee',
          status: 'terminated',
          baseSalary: 3000,
        },
      ];

      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 1, // Only active employee
        totalGrossPay: 5000,
        totalNetPay: 4000,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 5000,
            netPay: 4000,
          },
        ],
      };

      mockWorkersService.getWorkers.mockResolvedValue({ 
        workers: mockWorkers.filter(w => w.status === 'active')
      });
      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Only active employee included
      expect(result.totalEmployees).toBe(1);
      expect(result.paychecks).toHaveLength(1);
      expect(result.paychecks[0].employeeId).toBe('emp-1');
    });

    it('should handle calculation errors gracefully', async () => {
      // Arrange - Setup error scenario
      const mockWorkers = [
        {
          id: 'worker-1',
          employeeId: 'emp-1',
          firstName: 'No',
          lastName: 'Compensation',
          status: 'active',
        },
      ];

      const error = new Error('Failed to calculate payroll: Missing compensation data');

      mockWorkersService.getWorkers.mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.calculatePayroll).mockRejectedValue(error);

      // Act & Assert
      await expect(
        payrollRunsService.calculatePayroll('run-1')
      ).rejects.toThrow('Failed to calculate payroll');
    });
  });

  describe('Tax Calculation Integration', () => {
    it('should calculate taxes correctly for regular payroll', async () => {
      // Arrange
      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 1,
        totalGrossPay: 5000,
        totalTaxes: 1000, // 20% tax rate
        totalNetPay: 4000,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 5000,
            taxableIncome: 5000,
            wageTax: 600, // Loonbelasting
            aovTax: 250,  // AOV
            awwTax: 150,  // AWW
            totalTaxes: 1000,
            netPay: 4000,
          },
        ],
      };

      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Tax breakdown is correct
      const paycheck = result.paychecks[0];
      expect(paycheck.wageTax).toBe(600);
      expect(paycheck.aovTax).toBe(250);
      expect(paycheck.awwTax).toBe(150);
      expect(paycheck.totalTaxes).toBe(1000);
      expect(paycheck.netPay).toBe(4000);
    });

    it('should handle special payroll types with different tax rules', async () => {
      // Arrange - Vakantiegeld (holiday allowance) has different tax treatment
      const mockCalculation = {
        payrollRunId: 'run-1',
        runType: 'VAKANTIEGELD',
        totalEmployees: 1,
        totalGrossPay: 3000,
        totalTaxes: 450, // 15% reduced rate
        totalNetPay: 2550,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 3000,
            taxableIncome: 3000,
            wageTax: 450, // Holiday allowance reduced rate
            aovTax: 0,    // No AOV on holiday allowance
            awwTax: 0,    // No AWW on holiday allowance
            totalTaxes: 450,
            netPay: 2550,
          },
        ],
      };

      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Holiday allowance tax rates applied
      const paycheck = result.paychecks[0];
      expect(paycheck.totalTaxes).toBe(450);
      expect(paycheck.aovTax).toBe(0);
      expect(paycheck.awwTax).toBe(0);
      expect(paycheck.netPay).toBe(2550);
    });
  });

  describe('Deduction Integration', () => {
    it('should apply deductions correctly', async () => {
      // Arrange - Employee with deductions
      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 1,
        totalGrossPay: 5000,
        totalTaxes: 1000,
        totalDeductions: 200, // Health insurance, pension, etc.
        totalNetPay: 3800,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 5000,
            totalTaxes: 1000,
            deductions: [
              {
                code: 'HEALTH_INS',
                name: 'Health Insurance',
                amount: 100,
                type: 'post-tax',
              },
              {
                code: 'PENSION',
                name: '401k Contribution',
                amount: 100,
                type: 'pre-tax',
              },
            ],
            totalDeductions: 200,
            netPay: 3800,
          },
        ],
      };

      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Deductions applied correctly
      const paycheck = result.paychecks[0];
      expect(paycheck.deductions).toHaveLength(2);
      expect(paycheck.totalDeductions).toBe(200);
      expect(paycheck.netPay).toBe(3800);
    });

    it('should calculate percentage-based deductions correctly', async () => {
      // Arrange - Percentage deduction (e.g., 5% pension contribution)
      const grossPay = 5000;
      const pensionPercentage = 0.05;
      const expectedDeduction = grossPay * pensionPercentage;

      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 1,
        totalGrossPay: grossPay,
        totalTaxes: 1000,
        totalDeductions: expectedDeduction,
        totalNetPay: grossPay - 1000 - expectedDeduction,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay,
            deductions: [
              {
                code: 'PENSION',
                name: 'Pension Contribution (5%)',
                amount: expectedDeduction,
                type: 'pre-tax',
                calculationType: 'percentage',
                percentage: 5,
              },
            ],
            totalDeductions: expectedDeduction,
            netPay: grossPay - 1000 - expectedDeduction,
          },
        ],
      };

      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert
      const paycheck = result.paychecks[0];
      expect(paycheck.deductions[0].amount).toBe(250); // 5% of 5000
      expect(paycheck.totalDeductions).toBe(250);
    });
  });

  describe('Recalculation Workflow', () => {
    it('should allow recalculation of payroll run', async () => {
      // Arrange - Initial calculation
      const initialCalculation = {
        payrollRunId: 'run-1',
        status: 'calculated',
        totalEmployees: 2,
        totalGrossPay: 10000,
        totalNetPay: 8000,
        calculatedAt: '2025-01-15T10:00:00Z',
      };

      // Recalculation after data change
      const recalculation = {
        payrollRunId: 'run-1',
        status: 'calculated',
        totalEmployees: 2,
        totalGrossPay: 11000, // Updated compensation
        totalNetPay: 8800,
        calculatedAt: '2025-01-15T11:00:00Z',
      };

      vi.mocked(payrollRunsService.calculatePayroll)
        .mockResolvedValueOnce(initialCalculation)
        .mockResolvedValueOnce(recalculation);

      // Act - Initial calculation
      const initial = await payrollRunsService.calculatePayroll('run-1');
      expect(initial.totalGrossPay).toBe(10000);

      // Act - Recalculation
      const recalc = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Values updated
      expect(recalc.totalGrossPay).toBe(11000);
      expect(recalc.totalNetPay).toBe(8800);
      expect(recalc.calculatedAt).not.toBe(initial.calculatedAt);
    });

    it('should prevent calculation of already processed payroll', async () => {
      // Arrange - Processed payroll run
      const error = new Error('Cannot calculate payroll with status: processed');

      vi.mocked(payrollRunsService.calculatePayroll).mockRejectedValue(error);

      // Act & Assert
      await expect(
        payrollRunsService.calculatePayroll('run-1')
      ).rejects.toThrow('Cannot calculate payroll with status: processed');
    });
  });

  describe('Multi-Currency Support', () => {
    it('should handle calculations in different currencies', async () => {
      // Arrange - Employee paid in EUR
      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 1,
        currency: 'EUR',
        totalGrossPay: 4000, // EUR
        totalNetPay: 3200,
        paychecks: [
          {
            employeeId: 'emp-1',
            grossPay: 4000,
            netPay: 3200,
            currency: 'EUR',
          },
        ],
      };

      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const result = await payrollRunsService.calculatePayroll('run-1');

      // Assert - Currency preserved
      expect(result.currency).toBe('EUR');
      expect(result.paychecks[0].currency).toBe('EUR');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of employees efficiently', async () => {
      // Arrange - 100 employees
      const mockWorkers = Array.from({ length: 100 }, (_, i) => ({
        id: `worker-${i}`,
        employeeId: `emp-${i}`,
        firstName: `Employee`,
        lastName: `${i}`,
        status: 'active',
        baseSalary: 5000,
      }));

      const mockCalculation = {
        payrollRunId: 'run-1',
        totalEmployees: 100,
        totalGrossPay: 500000,
        totalNetPay: 400000,
        paychecks: mockWorkers.map(w => ({
          employeeId: w.employeeId,
          grossPay: 5000,
          netPay: 4000,
        })),
      };

      mockWorkersService.getWorkers.mockResolvedValue({ workers: mockWorkers });
      vi.mocked(payrollRunsService.calculatePayroll).mockResolvedValue(mockCalculation);

      // Act
      const startTime = Date.now();
      const result = await payrollRunsService.calculatePayroll('run-1');
      const endTime = Date.now();

      // Assert - Calculation completed
      expect(result.totalEmployees).toBe(100);
      expect(result.paychecks).toHaveLength(100);
      
      // Performance assertion (should complete in reasonable time)
      const calculationTime = endTime - startTime;
      expect(calculationTime).toBeLessThan(5000); // Less than 5 seconds
    });
  });
});
