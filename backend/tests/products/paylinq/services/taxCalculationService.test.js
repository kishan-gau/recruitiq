/**
 * Tax Calculation Service Tests
 * 
 * Unit tests for TaxCalculationService business logic.
 */

import TaxCalculationService from '../../../../src/products/paylinq/services/taxCalculationService.js';
import TaxRepository from '../../../../src/products/paylinq/repositories/taxRepository.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock dependencies

describe('TaxCalculationService', () => {
  let service;
  let mockTaxRepository;
  let mockPayrollRepository;

  beforeEach(() => {
    service = new TaxCalculationService();
    mockTaxRepository = TaxRepository.mock.instances[0];
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('calculateEmployeeTaxes', () => {
    test('should calculate federal income tax', async () => {
      const mockEmployee = {
        id: 'record-123',
        tax_filing_status: 'single',
        tax_exemptions: 1
      };

      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'income_tax',
        tax_rate: 15.0,
        is_active: true
      };

      const mockBrackets = [
        { min_income: 0, max_income: 25000, tax_rate: 10, flat_amount: 0 },
        { min_income: 25001, max_income: 75000, tax_rate: 20, flat_amount: 2500 },
        { min_income: 75001, max_income: null, tax_rate: 30, flat_amount: 12500 }
      ];

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue(mockBrackets);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      const result = await service.calculateEmployeeTaxes(
        'record-123',
        5000,
        '2024-01-01',
        'org-789'
      );

      expect(result).toBeDefined();
      expect(result.totalTaxes).toBeGreaterThan(0);
      expect(mockTaxRepository.createTaxCalculation).toHaveBeenCalled();
    });

    test('should calculate progressive tax brackets correctly', async () => {
      const mockEmployee = {
        id: 'record-123',
        tax_filing_status: 'single',
        tax_exemptions: 0
      };

      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'income_tax',
        is_active: true
      };

      // Progressive brackets
      const mockBrackets = [
        { min_income: 0, max_income: 10000, tax_rate: 10, flat_amount: 0 },
        { min_income: 10001, max_income: 30000, tax_rate: 20, flat_amount: 1000 },
        { min_income: 30001, max_income: null, tax_rate: 30, flat_amount: 5000 }
      ];

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue(mockBrackets);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      // Income: 50,000
      // Bracket 1 (0-10,000): 10,000 * 10% = 1,000
      // Bracket 2 (10,001-30,000): 20,000 * 20% = 4,000
      // Bracket 3 (30,001-50,000): 20,000 * 30% = 6,000
      // Total: 11,000
      const result = await service.calculateEmployeeTaxes(
        'record-123',
        50000,
        '2024-01-01',
        'org-789'
      );

      expect(result.totalTaxes).toBeCloseTo(11000, 0);
    });

    test('should handle single bracket income', async () => {
      const mockEmployee = {
        id: 'record-123',
        tax_filing_status: 'single'
      };

      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'income_tax',
        is_active: true
      };

      const mockBrackets = [
        { min_income: 0, max_income: 50000, tax_rate: 15, flat_amount: 0 }
      ];

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue(mockBrackets);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      // Income: 30,000 in single bracket
      // Tax: 30,000 * 15% = 4,500
      const result = await service.calculateEmployeeTaxes(
        'record-123',
        30000,
        '2024-01-01',
        'org-789'
      );

      expect(result.totalTaxes).toBeCloseTo(4500, 0);
    });

    test('should apply tax exemptions', async () => {
      const mockEmployee = {
        id: 'record-123',
        tax_filing_status: 'single',
        tax_exemptions: 2
      };

      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'income_tax',
        is_active: true
      };

      const mockBrackets = [
        { min_income: 0, max_income: null, tax_rate: 20, flat_amount: 0 }
      ];

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue(mockBrackets);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      const result = await service.calculateEmployeeTaxes(
        'record-123',
        50000,
        '2024-01-01',
        'org-789'
      );

      // With exemptions, taxable income should be reduced
      expect(result.totalTaxes).toBeLessThan(50000 * 0.20);
    });

    test('should calculate payroll taxes (Social Security, Medicare)', async () => {
      const mockEmployee = {
        id: 'record-123'
      };

      const mockTaxConfigs = [
        { id: 'tax-1', tax_type: 'social_security', tax_rate: 6.2, is_active: true },
        { id: 'tax-2', tax_type: 'medicare', tax_rate: 1.45, is_active: true }
      ];

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue(mockTaxConfigs);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue([]);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      const grossPay = 5000;
      const result = await service.calculateEmployeeTaxes(
        'record-123',
        grossPay,
        '2024-01-01',
        'org-789'
      );

      // Social Security: 5000 * 6.2% = 310
      // Medicare: 5000 * 1.45% = 72.5
      // Total: 382.5
      expect(result.socialSecurity).toBeCloseTo(310, 0);
      expect(result.medicare).toBeCloseTo(72.5, 1);
      expect(result.totalTaxes).toBeCloseTo(382.5, 0);
    });

    test('should apply Social Security wage cap', async () => {
      const mockEmployee = {
        id: 'record-123'
      };

      const mockTaxConfig = {
        id: 'tax-1',
        tax_type: 'social_security',
        tax_rate: 6.2,
        wage_cap: 160200,
        is_active: true
      };

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue([]);
      mockTaxRepository.getTotalTaxForPeriod = jest.fn().mockResolvedValue(9900); // Already paid on 160,000
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      // Current pay: 10,000
      // YTD wages would be 160,000 + 10,000 = 170,000
      // Should only tax 200 more (cap - YTD)
      const result = await service.calculateEmployeeTaxes(
        'record-123',
        10000,
        '2024-12-01',
        'org-789'
      );

      // Should tax minimal amount due to cap
      expect(result.socialSecurity).toBeLessThan(10000 * 0.062);
    });

    test('should handle zero income', async () => {
      const mockEmployee = {
        id: 'record-123'
      };

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([]);

      const result = await service.calculateEmployeeTaxes(
        'record-123',
        0,
        '2024-01-01',
        'org-789'
      );

      expect(result.totalTaxes).toBe(0);
      expect(result.federalTax).toBe(0);
    });

    test('should throw error if employee not found', async () => {
      mockPayrollRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.calculateEmployeeTaxes('nonexistent', 5000, '2024-01-01', 'org-789')
      ).rejects.toThrow('not found');
    });
  });

  describe('calculateTaxWithholding', () => {
    test('should calculate federal withholding', async () => {
      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'withholding',
        tax_rate: 15.0
      };

      mockTaxRepository.findTaxConfigurationsByType = jest.fn().mockResolvedValue([mockTaxConfig]);

      const result = await service.calculateTaxWithholding(
        5000,
        'single',
        1,
        'org-789'
      );

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(5000);
    });

    test('should adjust withholding based on filing status', async () => {
      const mockTaxConfig = {
        id: 'tax-config-1',
        tax_type: 'withholding',
        tax_rate: 15.0
      };

      mockTaxRepository.findTaxConfigurationsByType = jest.fn().mockResolvedValue([mockTaxConfig]);

      const singleWithholding = await service.calculateTaxWithholding(
        5000,
        'single',
        0,
        'org-789'
      );

      const marriedWithholding = await service.calculateTaxWithholding(
        5000,
        'married',
        0,
        'org-789'
      );

      // Married filing typically has lower withholding
      expect(marriedWithholding).toBeLessThanOrEqual(singleWithholding);
    });
  });

  describe('Tax Configuration Management', () => {
    describe('createTaxConfiguration', () => {
      test('should create tax configuration with validation', async () => {
        const taxConfigData = {
          taxType: 'income_tax',
          taxName: 'Federal Income Tax',
          taxRate: 15.5,
          isActive: true,
          effectiveFrom: '2024-01-01'
        };

        mockTaxRepository.createTaxConfiguration = jest.fn().mockResolvedValue({
          id: 'tax-config-123',
          ...taxConfigData
        });

        const result = await service.createTaxConfiguration(
          taxConfigData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.tax_type).toBe('income_tax');
      });

      test('should validate tax rate is positive', async () => {
        const invalidData = {
          taxType: 'income_tax',
          taxName: 'Invalid Tax',
          taxRate: -5,
          isActive: true,
          effectiveFrom: '2024-01-01'
        };

        await expect(
          service.createTaxConfiguration(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate tax rate is within reasonable range', async () => {
        const invalidData = {
          taxType: 'income_tax',
          taxName: 'Invalid Tax',
          taxRate: 150, // 150% is unreasonable
          isActive: true,
          effectiveFrom: '2024-01-01'
        };

        await expect(
          service.createTaxConfiguration(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('createTaxBracket', () => {
      test('should create tax bracket with validation', async () => {
        const bracketData = {
          taxConfigurationId: 'tax-config-123',
          bracketName: 'Low Income',
          minIncome: 0,
          maxIncome: 25000,
          taxRate: 10.0,
          flatAmount: 0
        };

        mockTaxRepository.createTaxBracket = jest.fn().mockResolvedValue({
          id: 'bracket-456',
          ...bracketData
        });

        const result = await service.createTaxBracket(
          bracketData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.min_income).toBe(0);
        expect(result.max_income).toBe(25000);
      });

      test('should validate min_income < max_income', async () => {
        const invalidData = {
          taxConfigurationId: 'tax-config-123',
          minIncome: 50000,
          maxIncome: 25000,
          taxRate: 10.0
        };

        await expect(
          service.createTaxBracket(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/max.*income.*greater/i);
      });

      test('should allow null max_income for unlimited bracket', async () => {
        const validData = {
          taxConfigurationId: 'tax-config-123',
          bracketName: 'High Income',
          minIncome: 100000,
          maxIncome: null,
          taxRate: 35.0,
          flatAmount: 15000
        };

        mockTaxRepository.createTaxBracket = jest.fn().mockResolvedValue({
          id: 'bracket-999',
          ...validData
        });

        const result = await service.createTaxBracket(
          validData,
          'org-789',
          'user-123'
        );

        expect(result.max_income).toBeNull();
      });
    });
  });

  describe('Tax Deduction Management', () => {
    describe('calculatePreTaxDeductions', () => {
      test('should calculate total pre-tax deductions', async () => {
        const mockDeductions = [
          { deduction_amount: 500, is_pre_tax: true },
          { deduction_amount: 300, is_pre_tax: true },
          { deduction_amount: 200, is_pre_tax: false }
        ];

        mockTaxRepository.findTaxDeductions = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.calculatePreTaxDeductions('record-123', 'org-789');

        // Only pre-tax: 500 + 300 = 800
        expect(result).toBe(800);
      });

      test('should return 0 if no deductions', async () => {
        mockTaxRepository.findTaxDeductions = jest.fn().mockResolvedValue([]);

        const result = await service.calculatePreTaxDeductions('record-123', 'org-789');

        expect(result).toBe(0);
      });
    });

    describe('createTaxDeduction', () => {
      test('should create pre-tax deduction', async () => {
        const deductionData = {
          employeeRecordId: 'record-123',
          deductionType: 'retirement_401k',
          deductionName: '401(k) Contribution',
          deductionAmount: 500,
          isPreTax: true
        };

        mockTaxRepository.createTaxDeduction = jest.fn().mockResolvedValue({
          id: 'deduction-456',
          ...deductionData
        });

        const result = await service.createTaxDeduction(
          deductionData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.is_pre_tax).toBe(true);
      });

      test('should validate deduction amount is positive', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          deductionType: 'retirement_401k',
          deductionAmount: -100,
          isPreTax: true
        };

        await expect(
          service.createTaxDeduction(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });
  });

  describe('Tax Reporting', () => {
    describe('getTaxSummary', () => {
      test('should generate tax summary for period', async () => {
        const mockCalculations = [
          { calculated_tax: 500, tax_type: 'income_tax' },
          { calculated_tax: 310, tax_type: 'social_security' },
          { calculated_tax: 72.5, tax_type: 'medicare' }
        ];

        mockTaxRepository.findTaxCalculations = jest.fn().mockResolvedValue(mockCalculations);

        const result = await service.getTaxSummary(
          'record-123',
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result.totalTaxes).toBeCloseTo(882.5, 1);
        expect(result.breakdown).toHaveProperty('income_tax');
        expect(result.breakdown).toHaveProperty('social_security');
        expect(result.breakdown).toHaveProperty('medicare');
      });

      test('should handle empty period', async () => {
        mockTaxRepository.findTaxCalculations = jest.fn().mockResolvedValue([]);

        const result = await service.getTaxSummary(
          'record-123',
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result.totalTaxes).toBe(0);
        expect(Object.keys(result.breakdown).length).toBe(0);
      });
    });

    describe('getYearToDateTaxes', () => {
      test('should calculate YTD tax totals', async () => {
        mockTaxRepository.getTotalTaxForPeriod = jest.fn().mockResolvedValue(12500);

        const result = await service.getYearToDateTaxes(
          'record-123',
          2024,
          'org-789'
        );

        expect(result).toBe(12500);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.findById = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.calculateEmployeeTaxes('record-123', 5000, '2024-01-01', 'org-789')
      ).rejects.toThrow('Database error');
    });

    test('should handle invalid tax configuration', async () => {
      mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'record-123' });
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([
        { tax_type: 'income_tax', tax_rate: null }
      ]);

      await expect(
        service.calculateEmployeeTaxes('record-123', 5000, '2024-01-01', 'org-789')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle negative income gracefully', async () => {
      const mockEmployee = { id: 'record-123' };
      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([]);

      const result = await service.calculateEmployeeTaxes(
        'record-123',
        -1000,
        '2024-01-01',
        'org-789'
      );

      expect(result.totalTaxes).toBe(0);
    });

    test('should handle very large income', async () => {
      const mockEmployee = { id: 'record-123' };
      const mockTaxConfig = {
        tax_type: 'income_tax',
        tax_rate: 35.0,
        is_active: true
      };

      mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
      mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
      mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue([]);
      mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

      const result = await service.calculateEmployeeTaxes(
        'record-123',
        10000000,
        '2024-01-01',
        'org-789'
      );

      expect(result.totalTaxes).toBeGreaterThan(0);
      expect(result.totalTaxes).toBeLessThan(10000000);
    });
  });
});
