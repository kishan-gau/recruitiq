import { describe, it, expect } from 'vitest';
import {
  calculateSalaryPay,
  calculateHourlyPay,
  calculateTaxWithholding,
  calculateNetPay,
  calculateSocialContributions,
  validatePayrollData,
  SURINAME_TAX_BRACKETS,
  type TaxBracket,
  type PayrollData,
} from '../../../src/utils/calculations';

describe('Payroll Calculations', () => {
  describe('calculateSalaryPay', () => {
    it('calculates bi-weekly salary correctly', () => {
      const result = calculateSalaryPay(60000, 'bi-weekly');
      expect(result).toBe(2307.69);
    });

    it('calculates monthly salary correctly', () => {
      const result = calculateSalaryPay(60000, 'monthly');
      expect(result).toBe(5000);
    });

    it('calculates weekly salary correctly', () => {
      const result = calculateSalaryPay(52000, 'weekly');
      expect(result).toBe(1000);
    });

    it('calculates semi-monthly salary correctly', () => {
      const result = calculateSalaryPay(48000, 'semi-monthly');
      expect(result).toBe(2000);
    });

    it('handles decimal results with proper rounding', () => {
      const result = calculateSalaryPay(55555, 'bi-weekly');
      expect(result).toBe(2136.73);
    });

    it('handles very large salaries', () => {
      const result = calculateSalaryPay(1000000, 'monthly');
      expect(result).toBe(83333.33);
    });

    it('handles zero salary', () => {
      const result = calculateSalaryPay(0, 'monthly');
      expect(result).toBe(0);
    });
  });

  describe('calculateHourlyPay', () => {
    it('calculates regular hours only', () => {
      const result = calculateHourlyPay(25, 40, 0);
      expect(result).toBe(1000);
    });

    it('calculates regular + overtime at 1.5x', () => {
      const result = calculateHourlyPay(20, 40, 10);
      // 40 * $20 = $800
      // 10 * $20 * 1.5 = $300
      // Total = $1,100
      expect(result).toBe(1100);
    });

    it('calculates double-time overtime', () => {
      const result = calculateHourlyPay(15, 40, 8, 2.0);
      // 40 * $15 = $600
      // 8 * $15 * 2 = $240
      // Total = $840
      expect(result).toBe(840);
    });

    it('handles zero regular hours', () => {
      const result = calculateHourlyPay(25, 0, 5);
      expect(result).toBe(187.50);
    });

    it('handles zero overtime hours', () => {
      const result = calculateHourlyPay(30, 35, 0);
      expect(result).toBe(1050);
    });

    it('handles decimal hours', () => {
      const result = calculateHourlyPay(20, 37.5, 2.25);
      // 37.5 * $20 = $750
      // 2.25 * $20 * 1.5 = $67.50
      // Total = $817.50
      expect(result).toBe(817.50);
    });

    it('handles very high hourly rate', () => {
      const result = calculateHourlyPay(250, 40, 0);
      expect(result).toBe(10000);
    });

    it('handles fractional cents with proper rounding', () => {
      const result = calculateHourlyPay(20.33, 37.25, 0);
      expect(result).toBe(757.29);
    });
  });

  describe('calculateTaxWithholding', () => {
    it('calculates tax for income in first bracket (tax-free)', () => {
      const result = calculateTaxWithholding(10000, SURINAME_TAX_BRACKETS);
      expect(result).toBe(0);
    });

    it('calculates tax at bracket boundary (exactly tax-free limit)', () => {
      const result = calculateTaxWithholding(15000, SURINAME_TAX_BRACKETS);
      expect(result).toBe(0);
    });

    it('calculates tax for income in second bracket', () => {
      const result = calculateTaxWithholding(20000, SURINAME_TAX_BRACKETS);
      // First 15000: 0
      // Next 5000: 5000 * 0.08 = 400
      expect(result).toBe(400);
    });

    it('calculates tax for income spanning multiple brackets', () => {
      const result = calculateTaxWithholding(40000, SURINAME_TAX_BRACKETS);
      // First 15000: 0
      // Next 15000: 15000 * 0.08 = 1200
      // Next 10000: 10000 * 0.15 = 1500
      // Total: 2700
      expect(result).toBe(2700);
    });

    it('calculates tax for high income (top bracket)', () => {
      const result = calculateTaxWithholding(60000, SURINAME_TAX_BRACKETS);
      // First 15000: 0
      // Next 15000: 15000 * 0.08 = 1200
      // Next 20000: 20000 * 0.15 = 3000
      // Next 10000: 10000 * 0.25 = 2500
      // Total: 6700
      expect(result).toBe(6700);
    });

    it('calculates tax for very high income', () => {
      const result = calculateTaxWithholding(100000, SURINAME_TAX_BRACKETS);
      // First 15000: 0
      // Next 15000: 15000 * 0.08 = 1200
      // Next 20000: 20000 * 0.15 = 3000
      // Next 50000: 50000 * 0.25 = 12500
      // Total: 16700
      expect(result).toBe(16700);
    });

    it('handles zero income', () => {
      const result = calculateTaxWithholding(0, SURINAME_TAX_BRACKETS);
      expect(result).toBe(0);
    });

    it('handles custom tax brackets', () => {
      const customBrackets: TaxBracket[] = [
        { min: 0, max: 10000, rate: 0.1 },
        { min: 10000, max: null, rate: 0.2 },
      ];
      const result = calculateTaxWithholding(15000, customBrackets);
      // First 10000: 10000 * 0.1 = 1000
      // Next 5000: 5000 * 0.2 = 1000
      // Total: 2000
      expect(result).toBe(2000);
    });
  });

  describe('calculateNetPay', () => {
    it('calculates net pay with tax only', () => {
      const result = calculateNetPay(3000, 450, []);
      expect(result).toBe(2550);
    });

    it('calculates net pay with tax and single deduction', () => {
      const result = calculateNetPay(3000, 450, [100]);
      expect(result).toBe(2450);
    });

    it('calculates net pay with tax and multiple deductions', () => {
      const result = calculateNetPay(3000, 450, [100, 50, 25]);
      // 3000 - 450 - 100 - 50 - 25 = 2375
      expect(result).toBe(2375);
    });

    it('prevents negative net pay', () => {
      const result = calculateNetPay(1000, 800, [300]);
      // Would be -100, but clamped to 0
      expect(result).toBe(0);
    });

    it('prevents negative net pay when deductions exceed gross', () => {
      const result = calculateNetPay(1000, 100, [500, 500]);
      expect(result).toBe(0);
    });

    it('handles no deductions', () => {
      const result = calculateNetPay(2500, 375, []);
      expect(result).toBe(2125);
    });

    it('handles zero tax and deductions', () => {
      const result = calculateNetPay(2000, 0, []);
      expect(result).toBe(2000);
    });

    it('rounds to 2 decimal places', () => {
      const result = calculateNetPay(2500.555, 375.333, [100.111]);
      expect(result).toBe(2025.11);
    });

    it('handles many small deductions', () => {
      const deductions = Array(10).fill(10.50);
      const result = calculateNetPay(1000, 100, deductions);
      // 1000 - 100 - (10.50 * 10) = 795
      expect(result).toBe(795);
    });
  });

  describe('calculateSocialContributions', () => {
    it('calculates AOV and AWW with default rates', () => {
      const result = calculateSocialContributions(5000);
      expect(result.aov).toBe(400); // 8%
      expect(result.aww).toBe(75);  // 1.5%
      expect(result.total).toBe(475);
    });

    it('calculates with custom rates', () => {
      const result = calculateSocialContributions(5000, 0.1, 0.02);
      expect(result.aov).toBe(500); // 10%
      expect(result.aww).toBe(100); // 2%
      expect(result.total).toBe(600);
    });

    it('handles zero gross pay', () => {
      const result = calculateSocialContributions(0);
      expect(result.aov).toBe(0);
      expect(result.aww).toBe(0);
      expect(result.total).toBe(0);
    });

    it('rounds each contribution correctly', () => {
      const result = calculateSocialContributions(3333.33);
      expect(result.aov).toBe(266.67);
      expect(result.aww).toBe(50.00);
      expect(result.total).toBe(316.67);
    });
  });

  describe('validatePayrollData', () => {
    it('validates correct salary data', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'salary',
        compensationAmount: 60000,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates correct hourly data', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'hourly',
        compensationAmount: 25,
        regularHours: 40,
        overtimeHours: 5,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing worker ID', () => {
      const data: PayrollData = {
        workerId: '',
        compensationType: 'salary',
        compensationAmount: 60000,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker ID is required');
    });

    it('rejects zero compensation', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'salary',
        compensationAmount: 0,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Compensation amount must be positive');
    });

    it('rejects negative compensation', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'salary',
        compensationAmount: -1000,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
    });

    it('rejects hourly data without hours', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'hourly',
        compensationAmount: 25,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Regular hours must be specified and non-negative');
    });

    it('rejects negative regular hours', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'hourly',
        compensationAmount: 25,
        regularHours: -5,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
    });

    it('rejects negative overtime hours', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'hourly',
        compensationAmount: 25,
        regularHours: 40,
        overtimeHours: -2,
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Overtime hours cannot be negative');
    });

    it('rejects negative deductions', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'salary',
        compensationAmount: 60000,
        deductions: [100, -50],
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deductions cannot be negative');
    });

    it('accepts zero deductions', () => {
      const data: PayrollData = {
        workerId: 'W001',
        compensationType: 'salary',
        compensationAmount: 60000,
        deductions: [0],
      };
      const result = validatePayrollData(data);
      expect(result.isValid).toBe(true);
    });
  });
});
