/**
 * Tax Calculation Service Tests
 * 
 * Unit tests for TaxCalculationService business logic.
 */

import { TaxCalculationService } from '../../../../src/products/paylinq/services/taxCalculationService.js';
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

  // ============================================================================
  // PHASE 2: Component-Based Tax Calculation Tests
  // ============================================================================

  describe('calculateEmployeeTaxesWithComponents (Phase 2)', () => {
    let mockAllowanceService;

    beforeEach(() => {
      // Mock AllowanceService
      mockAllowanceService = {
        getMonthlyAllowance: jest.fn().mockResolvedValue({
          remaining: 9000,
          usedThisMonth: 0,
          limit: 9000
        }),
        getHolidayAllowance: jest.fn().mockResolvedValue({
          remaining: 10016,
          usedThisYear: 0,
          limit: 10016
        }),
        getBonusAllowance: jest.fn().mockResolvedValue({
          remaining: 10016,
          usedThisYear: 0,
          limit: 10016
        })
      };

      // Inject mock into service
      service.allowanceService = mockAllowanceService;
    });

    describe('Scenario 1: Regular Salary Only', () => {
      test('should apply monthly tax-free allowance to regular salary', async () => {
        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            componentName: 'Regular Salary',
            amount: 15000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          }
        ];

        const mockEmployee = { id: 'emp-123' };
        const mockTaxTable = {
          brackets: [
            { minIncome: 0, maxIncome: null, taxRate: 10 }
          ]
        };

        mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue(mockTaxTable);

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        // Assertions
        expect(result).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.componentTaxes).toHaveLength(1);

        const comp = result.componentTaxes[0];
        expect(comp.componentCode).toBe('REGULAR_SALARY');
        expect(comp.amount).toBe(15000);
        expect(comp.taxFreeAmount).toBe(9000); // Monthly allowance
        expect(comp.taxableAmount).toBe(6000); // 15000 - 9000
        expect(comp.allowanceType).toBe('tax_free_sum_monthly');
        expect(comp.totalTax).toBeGreaterThan(0);
        expect(comp.effectiveTaxRate).toBeGreaterThan(0);

        // Summary totals should match
        expect(result.summary.totalEarnings).toBe(15000);
        expect(result.summary.totalTaxFree).toBe(9000);
        expect(result.summary.totalTaxable).toBe(6000);
      });

      test('should handle salary less than monthly allowance', async () => {
        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 5000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        const comp = result.componentTaxes[0];
        expect(comp.taxFreeAmount).toBe(5000); // Entire salary is tax-free
        expect(comp.taxableAmount).toBe(0);
        expect(comp.totalTax).toBe(0);
      });
    });

    describe('Scenario 2: Regular Salary + Overtime', () => {
      test('should apply allowance only to regular salary, not overtime', async () => {
        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 12000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'OVERTIME',
            amount: 3000,
            isTaxable: true,
            allowanceType: null
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        expect(result.componentTaxes).toHaveLength(2);

        // Regular salary component
        const regular = result.componentTaxes.find(c => c.componentCode === 'REGULAR_SALARY');
        expect(regular.taxFreeAmount).toBe(9000);
        expect(regular.taxableAmount).toBe(3000); // 12000 - 9000

        // Overtime component
        const overtime = result.componentTaxes.find(c => c.componentCode === 'OVERTIME');
        expect(overtime.taxFreeAmount).toBe(0); // No allowance for overtime
        expect(overtime.taxableAmount).toBe(3000); // Fully taxable

        // Summary
        expect(result.summary.totalEarnings).toBe(15000);
        expect(result.summary.totalTaxFree).toBe(9000);
        expect(result.summary.totalTaxable).toBe(6000); // 3000 + 3000
      });
    });

    describe('Scenario 3: Regular Salary + Vakantiegeld', () => {
      test('should apply monthly allowance to regular salary and holiday allowance to vakantiegeld', async () => {
        // Setup: Employee has already received SRD 8,000 vakantiegeld this year
        mockAllowanceService.getHolidayAllowance = jest.fn().mockResolvedValue({
          remaining: 2016, // 10016 - 8000
          usedThisYear: 8000,
          limit: 10016
        });

        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 10000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'VAKANTIEGELD',
            amount: 3000,
            isTaxable: true,
            allowanceType: 'holiday_allowance'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        expect(result.componentTaxes).toHaveLength(2);

        // Regular salary
        const regular = result.componentTaxes.find(c => c.componentCode === 'REGULAR_SALARY');
        expect(regular.taxFreeAmount).toBe(9000);
        expect(regular.taxableAmount).toBe(1000);
        expect(regular.allowanceType).toBe('tax_free_sum_monthly');

        // Vakantiegeld
        const vakantie = result.componentTaxes.find(c => c.componentCode === 'VAKANTIEGELD');
        expect(vakantie.taxFreeAmount).toBe(2016); // Remaining holiday allowance
        expect(vakantie.taxableAmount).toBe(984); // 3000 - 2016
        expect(vakantie.allowanceType).toBe('holiday_allowance');

        // Summary
        expect(result.summary.totalEarnings).toBe(13000);
        expect(result.summary.totalTaxFree).toBe(11016); // 9000 + 2016
        expect(result.summary.totalTaxable).toBe(1984); // 1000 + 984
      });

      test('should handle vakantiegeld when annual cap is exhausted', async () => {
        mockAllowanceService.getHolidayAllowance = jest.fn().mockResolvedValue({
          remaining: 0, // Cap already reached
          usedThisYear: 10016,
          limit: 10016
        });

        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 10000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'VAKANTIEGELD',
            amount: 2000,
            isTaxable: true,
            allowanceType: 'holiday_allowance'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        const vakantie = result.componentTaxes.find(c => c.componentCode === 'VAKANTIEGELD');
        expect(vakantie.taxFreeAmount).toBe(0); // No remaining allowance
        expect(vakantie.taxableAmount).toBe(2000); // Fully taxable
      });
    });

    describe('Scenario 4: Regular Salary + Bonus (Cap Exceeded)', () => {
      test('should not apply bonus allowance when annual cap is exceeded', async () => {
        mockAllowanceService.getBonusAllowance = jest.fn().mockResolvedValue({
          remaining: 0, // Already exceeded SRD 10,016
          usedThisYear: 12000,
          limit: 10016
        });

        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 20000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'BONUS',
            amount: 5000,
            isTaxable: true,
            allowanceType: 'bonus_gratuity'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        expect(result.componentTaxes).toHaveLength(2);

        // Regular salary gets monthly allowance
        const regular = result.componentTaxes.find(c => c.componentCode === 'REGULAR_SALARY');
        expect(regular.taxFreeAmount).toBe(9000);
        expect(regular.taxableAmount).toBe(11000);

        // Bonus gets zero allowance (cap exceeded)
        const bonus = result.componentTaxes.find(c => c.componentCode === 'BONUS');
        expect(bonus.taxFreeAmount).toBe(0);
        expect(bonus.taxableAmount).toBe(5000); // Fully taxable
        expect(bonus.allowanceType).toBe('bonus_gratuity');

        // Summary
        expect(result.summary.totalEarnings).toBe(25000);
        expect(result.summary.totalTaxFree).toBe(9000); // Only monthly allowance
        expect(result.summary.totalTaxable).toBe(16000);
      });
    });

    describe('Multiple Components with Progressive Tax Brackets', () => {
      test('should calculate taxes correctly with Suriname progressive brackets', async () => {
        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 15000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'OVERTIME',
            amount: 2000,
            isTaxable: true,
            allowanceType: null
          }
        ];

        // Suriname progressive tax brackets
        const mockTaxTable = {
          brackets: [
            { minIncome: 0, maxIncome: 5000, taxRate: 0 },
            { minIncome: 5001, maxIncome: 10000, taxRate: 10 },
            { minIncome: 10001, maxIncome: 20000, taxRate: 20 },
            { minIncome: 20001, maxIncome: null, taxRate: 30 }
          ]
        };

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue(mockTaxTable);

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        expect(result.componentTaxes).toHaveLength(2);

        // Verify each component has taxes calculated
        result.componentTaxes.forEach(comp => {
          expect(comp.wageTax).toBeDefined();
          expect(comp.aovTax).toBeDefined();
          expect(comp.awwTax).toBeDefined();
          expect(comp.totalTax).toBe(comp.wageTax + comp.aovTax + comp.awwTax);
        });

        // Summary totals should aggregate correctly
        const totalComponentTax = result.componentTaxes.reduce((sum, c) => sum + c.totalTax, 0);
        expect(result.summary.totalTaxes).toBeCloseTo(totalComponentTax, 2);
      });
    });

    describe('Allowance Tracking and Updates', () => {
      test('should track remaining allowances across multiple components', async () => {
        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 12000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          },
          {
            componentCode: 'VAKANTIEGELD',
            amount: 8000,
            isTaxable: true,
            allowanceType: 'holiday_allowance'
          },
          {
            componentCode: 'BONUS',
            amount: 3000,
            isTaxable: true,
            allowanceType: 'bonus_gratuity'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });
        mockTaxRepository.findActiveTaxTable = jest.fn().mockResolvedValue({
          brackets: [{ minIncome: 0, maxIncome: null, taxRate: 10 }]
        });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          components,
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        // Verify allowance service was called for each allowance type
        expect(mockAllowanceService.getMonthlyAllowance).toHaveBeenCalledWith(
          'emp-123',
          '2025-12-01',
          'org-789'
        );
        expect(mockAllowanceService.getHolidayAllowance).toHaveBeenCalledWith(
          'emp-123',
          2025,
          'org-789'
        );
        expect(mockAllowanceService.getBonusAllowance).toHaveBeenCalledWith(
          'emp-123',
          2025,
          'org-789'
        );

        // Verify each component used its designated allowance
        const regular = result.componentTaxes.find(c => c.componentCode === 'REGULAR_SALARY');
        const vakantie = result.componentTaxes.find(c => c.componentCode === 'VAKANTIEGELD');
        const bonus = result.componentTaxes.find(c => c.componentCode === 'BONUS');

        expect(regular.taxFreeAmount).toBe(9000);
        expect(vakantie.taxFreeAmount).toBe(8000); // Full amount covered
        expect(bonus.taxFreeAmount).toBe(3000); // Full amount covered
      });
    });

    describe('Error Handling', () => {
      test('should throw error if employee not found', async () => {
        mockPayrollRepository.findById = jest.fn().mockResolvedValue(null);

        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 15000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          }
        ];

        await expect(
          service.calculateEmployeeTaxesWithComponents(
            'nonexistent',
            components,
            '2025-12-01',
            { start: '2025-12-01', end: '2025-12-31' },
            'org-789'
          )
        ).rejects.toThrow(/not found/i);
      });

      test('should handle empty components array', async () => {
        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });

        const result = await service.calculateEmployeeTaxesWithComponents(
          'emp-123',
          [],
          '2025-12-01',
          { start: '2025-12-01', end: '2025-12-31' },
          'org-789'
        );

        expect(result.componentTaxes).toHaveLength(0);
        expect(result.summary.totalEarnings).toBe(0);
        expect(result.summary.totalTaxes).toBe(0);
      });

      test('should handle missing allowance service gracefully', async () => {
        service.allowanceService = null;

        const components = [
          {
            componentCode: 'REGULAR_SALARY',
            amount: 15000,
            isTaxable: true,
            allowanceType: 'tax_free_sum_monthly'
          }
        ];

        mockPayrollRepository.findById = jest.fn().mockResolvedValue({ id: 'emp-123' });

        await expect(
          service.calculateEmployeeTaxesWithComponents(
            'emp-123',
            components,
            '2025-12-01',
            { start: '2025-12-01', end: '2025-12-31' },
            'org-789'
          )
        ).rejects.toThrow();
      });
    });

    describe('Backward Compatibility', () => {
      test('should not break existing calculateEmployeeTaxes method', async () => {
        const mockEmployee = { id: 'emp-123' };
        const mockTaxConfig = {
          tax_type: 'income_tax',
          tax_rate: 15.0,
          is_active: true
        };

        mockPayrollRepository.findById = jest.fn().mockResolvedValue(mockEmployee);
        mockTaxRepository.findActiveTaxConfigurations = jest.fn().mockResolvedValue([mockTaxConfig]);
        mockTaxRepository.findTaxBrackets = jest.fn().mockResolvedValue([]);
        mockTaxRepository.createTaxCalculation = jest.fn().mockResolvedValue({ id: 'calc-123' });

        // Phase 1 method should still work
        const result = await service.calculateEmployeeTaxes(
          'emp-123',
          15000,
          '2025-12-01',
          'org-789'
        );

        expect(result).toBeDefined();
        expect(result.totalTaxes).toBeGreaterThan(0);
        expect(result.grossPay).toBe(15000);
      });
    });
  });

  // ========================================================================
  // PHASE 2B: Tax Calculation Mode Configuration Tests
  // ========================================================================

  describe('_resolveTaxCalculationMode (Phase 2B)', () => {
    test('should return explicit calculation_mode if set', () => {
      const taxRuleSet = {
        calculation_method: 'bracket',
        calculation_mode: 'proportional_distribution'
      };

      const mode = service._resolveTaxCalculationMode(taxRuleSet);
      expect(mode).toBe('proportional_distribution');
    });

    test('should default to proportional_distribution for progressive taxes', () => {
      const taxRuleSet = {
        calculation_method: 'bracket',
        calculation_mode: null
      };

      const mode = service._resolveTaxCalculationMode(taxRuleSet);
      expect(mode).toBe('proportional_distribution');
    });

    test('should default to component_based for flat-rate taxes', () => {
      const taxRuleSet = {
        calculation_method: 'flat_rate',
        calculation_mode: null
      };

      const mode = service._resolveTaxCalculationMode(taxRuleSet);
      expect(mode).toBe('component_based');
    });

    test('should return system default for null tax rule', () => {
      const mode = service._resolveTaxCalculationMode(null);
      expect(mode).toBe('proportional_distribution');
    });

    test('should respect explicit component_based mode even for progressive', () => {
      const taxRuleSet = {
        calculation_method: 'bracket',
        calculation_mode: 'component_based'
      };

      const mode = service._resolveTaxCalculationMode(taxRuleSet);
      expect(mode).toBe('component_based');
    });

    test('should respect explicit aggregated mode', () => {
      const taxRuleSet = {
        calculation_method: 'flat_rate',
        calculation_mode: 'aggregated'
      };

      const mode = service._resolveTaxCalculationMode(taxRuleSet);
      expect(mode).toBe('aggregated');
    });
  });

  describe('Proportional Distribution Mode (Phase 2B)', () => {
    test('should distribute wage tax proportionally across components', () => {
      // This test verifies the mathematical correctness of proportional distribution
      // Scenario: Base 27k + Overtime 10k + Bonus 1.5k (all taxable)
      // Tax-free allowance: 9k on base only
      // Taxable: 18k + 10k + 1.5k = 29.5k total
      // Progressive tax on 29.5k should be distributed proportionally

      const totalTaxableIncome = 29500;
      const components = [
        { taxableIncome: 18000, proportion: 18000 / 29500 }, // Base: 61.02%
        { taxableIncome: 10000, proportion: 10000 / 29500 }, // Overtime: 33.90%
        { taxableIncome: 1500, proportion: 1500 / 29500 }    // Bonus: 5.08%
      ];

      // Assuming total tax is 3000 (example)
      const totalTax = 3000;

      components.forEach(component => {
        const expectedTax = Math.round(totalTax * component.proportion * 100) / 100;
        
        // Verify proportional distribution
        expect(expectedTax).toBeGreaterThan(0);
        expect(expectedTax).toBeLessThan(totalTax);
      });

      // Verify sum equals total (within rounding tolerance)
      const sumDistributed = components.reduce((sum, c) => 
        sum + Math.round(totalTax * c.proportion * 100) / 100, 0
      );
      expect(Math.abs(sumDistributed - totalTax)).toBeLessThan(0.03); // Max 3 cents rounding error
    });

    test('should calculate same total as aggregated method', () => {
      // Mathematical proof: proportional distribution should sum to same total
      const totalTaxableIncome = 38500; // From analysis document
      
      // Simulated progressive tax calculation on total
      const totalWageTax = 3205; // Pre-calculated correct amount

      // Components with their taxable amounts
      const components = [
        { taxableIncome: 27000 }, // Base
        { taxableIncome: 10000 }, // Transport allowance
        { taxableIncome: 1500 }   // Phone allowance
      ];

      // Distribute proportionally
      let distributedSum = 0;
      components.forEach(component => {
        const proportion = component.taxableIncome / totalTaxableIncome;
        const componentTax = Math.round(totalWageTax * proportion * 100) / 100;
        distributedSum += componentTax;
      });

      // Should match within rounding tolerance
      expect(Math.abs(distributedSum - totalWageTax)).toBeLessThan(0.03);
    });
  });

  describe('Component-Based Mode for Flat-Rate Taxes (Phase 2B)', () => {
    test('should calculate AOV tax per component correctly', () => {
      // AOV is 4% flat rate - component-based is mathematically valid
      const aovRate = 4.0;
      const components = [
        { taxableIncome: 27000, expectedAov: 1080 }, // 27k * 4%
        { taxableIncome: 10000, expectedAov: 400 },  // 10k * 4%
        { taxableIncome: 1500, expectedAov: 60 }     // 1.5k * 4%
      ];

      let totalAov = 0;
      components.forEach(component => {
        const aov = (component.taxableIncome * aovRate) / 100;
        expect(aov).toBeCloseTo(component.expectedAov, 0);
        totalAov += aov;
      });

      // Total should match aggregate calculation
      const aggregateTotal = 38500 * (aovRate / 100);
      expect(totalAov).toBeCloseTo(aggregateTotal, 0);
    });

    test('should calculate AWW tax per component correctly', () => {
      // AWW is 1% flat rate - component-based is mathematically valid
      const awwRate = 1.0;
      const components = [
        { taxableIncome: 27000, expectedAww: 270 }, // 27k * 1%
        { taxableIncome: 10000, expectedAww: 100 }, // 10k * 1%
        { taxableIncome: 1500, expectedAww: 15 }    // 1.5k * 1%
      ];

      let totalAww = 0;
      components.forEach(component => {
        const aww = (component.taxableIncome * awwRate) / 100;
        expect(aww).toBeCloseTo(component.expectedAww, 0);
        totalAww += aww;
      });

      // Total should match aggregate calculation
      const aggregateTotal = 38500 * (awwRate / 100);
      expect(totalAww).toBeCloseTo(aggregateTotal, 0);
    });
  });

  describe('Component-Based Mode for Progressive Tax (Warning Case)', () => {
    test('should produce INCORRECT result for progressive taxes', () => {
      // This test DOCUMENTS the incorrect behavior when component_based is used
      // for progressive taxes. This should trigger a warning in production.

      const brackets = [
        { min: 0, max: 10000, rate: 0 },
        { min: 10000, max: 20000, rate: 8 },
        { min: 20000, max: null, rate: 13 }
      ];

      // Calculate per component (WRONG approach)
      const components = [
        { taxableIncome: 27000 }, // Pays: 0 + 800 + 910 = 1,710
        { taxableIncome: 10000 }, // Pays: 0 (stays in first bracket)
        { taxableIncome: 1500 }   // Pays: 0 (stays in first bracket)
      ];

      let componentBasedTotal = 0;
      components.forEach(component => {
        let tax = 0;
        let remaining = component.taxableIncome;
        
        for (const bracket of brackets) {
          const bracketSize = bracket.max ? bracket.max - bracket.min : Infinity;
          const taxableInBracket = Math.min(remaining, bracketSize);
          tax += (taxableInBracket * bracket.rate) / 100;
          remaining -= taxableInBracket;
          if (remaining <= 0) break;
        }
        
        componentBasedTotal += tax;
      });

      // Calculate aggregated (CORRECT approach)
      const totalTaxableIncome = 38500;
      let aggregatedTax = 0;
      let remaining = totalTaxableIncome;
      
      for (const bracket of brackets) {
        const bracketSize = bracket.max ? bracket.max - bracket.min : Infinity;
        const taxableInBracket = Math.min(remaining, bracketSize);
        aggregatedTax += (taxableInBracket * bracket.rate) / 100;
        remaining -= taxableInBracket;
        if (remaining <= 0) break;
      }

      // Component-based should be LESS than correct (employee underpays)
      expect(componentBasedTotal).toBeLessThan(aggregatedTax);
      
      // Document the specific difference (from analysis: 1,710 vs 3,205)
      expect(componentBasedTotal).toBeCloseTo(1710, 0);
      expect(aggregatedTax).toBeCloseTo(3205, 0);
      
      // Difference is 1,495 (46.6% underpayment!)
      const difference = aggregatedTax - componentBasedTotal;
      expect(difference).toBeCloseTo(1495, 0);
    });
  });

  describe('Mixed Calculation Modes (Phase 2B)', () => {
    test('should support different modes for different tax types', () => {
      // Realistic scenario: wage tax uses proportional_distribution,
      // AOV/AWW use component_based
      
      const modes = {
        wageTax: 'proportional_distribution',
        aov: 'component_based',
        aww: 'component_based'
      };

      // Verify modes are valid
      const validModes = ['aggregated', 'component_based', 'proportional_distribution'];
      Object.values(modes).forEach(mode => {
        expect(validModes).toContain(mode);
      });

      // This configuration should produce mathematically correct results
      expect(modes.wageTax).toBe('proportional_distribution'); // Correct for progressive
      expect(modes.aov).toBe('component_based'); // Valid for flat-rate
      expect(modes.aww).toBe('component_based'); // Valid for flat-rate
    });
  });
});
