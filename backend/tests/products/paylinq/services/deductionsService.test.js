/**
 * Deductions Service Tests
 * 
 * Unit tests for DeductionsService business logic.
 */

import DeductionsService from '../../../../src/products/paylinq/services/deductionsService.js';
import TaxRepository from '../../../../src/products/paylinq/repositories/taxRepository.js';

// Mock dependencies

describe('DeductionsService', () => {
  let service;
  let mockTaxRepository;

  beforeEach(() => {
    service = new DeductionsService();
    mockTaxRepository = TaxRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Deduction Type Management', () => {
    describe('createDeductionType', () => {
      test('should create pre-tax deduction type', async () => {
        const deductionData = {
          deductionName: '401k Contribution',
          deductionType: 'retirement',
          calculationType: 'percentage',
          defaultAmount: 5.0,
          isPreTax: true,
          isActive: true
        };

        mockTaxRepository.createDeductionType = jest.fn().mockResolvedValue({
          id: 'deduction-123',
          ...deductionData
        });

        const result = await service.createDeductionType(
          deductionData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.deduction_name).toBe('401k Contribution');
        expect(result.is_pre_tax).toBe(true);
      });

      test('should create post-tax deduction type', async () => {
        const deductionData = {
          deductionName: 'Garnishment',
          deductionType: 'legal',
          calculationType: 'fixed',
          defaultAmount: 200.0,
          isPreTax: false,
          isActive: true
        };

        mockTaxRepository.createDeductionType = jest.fn().mockResolvedValue({
          id: 'deduction-456',
          ...deductionData
        });

        const result = await service.createDeductionType(
          deductionData,
          'org-789',
          'user-123'
        );

        expect(result.is_pre_tax).toBe(false);
      });

      test('should validate required fields', async () => {
        const invalidData = {
          deductionName: 'Test Deduction'
          // Missing required fields
        };

        await expect(
          service.createDeductionType(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate calculation type', async () => {
        const invalidData = {
          deductionName: 'Test',
          deductionType: 'retirement',
          calculationType: 'invalid_type',
          defaultAmount: 5.0,
          isPreTax: true,
          isActive: true
        };

        await expect(
          service.createDeductionType(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate positive default amount', async () => {
        const invalidData = {
          deductionName: 'Test',
          deductionType: 'retirement',
          calculationType: 'percentage',
          defaultAmount: -5.0,
          isPreTax: true,
          isActive: true
        };

        await expect(
          service.createDeductionType(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/positive/i);
      });
    });

    describe('getDeductionTypes', () => {
      test('should retrieve all deduction types', async () => {
        const mockTypes = [
          { id: 'type-1', deduction_type: 'retirement', is_pre_tax: true },
          { id: 'type-2', deduction_type: 'health', is_pre_tax: true }
        ];

        mockTaxRepository.findDeductionTypes = jest.fn().mockResolvedValue(mockTypes);

        const result = await service.getDeductionTypes('org-789');

        expect(result).toEqual(mockTypes);
      });

      test('should filter pre-tax deductions', async () => {
        const mockPreTax = [
          { id: 'type-1', is_pre_tax: true }
        ];

        mockTaxRepository.findDeductionTypes = jest.fn().mockResolvedValue(mockPreTax);

        const result = await service.getDeductionTypes('org-789', { isPreTax: true });

        expect(result.every(d => d.is_pre_tax)).toBe(true);
      });
    });
  });

  describe('Employee Deduction Management', () => {
    describe('assignDeduction', () => {
      test('should assign percentage deduction to employee', async () => {
        const assignmentData = {
          employeeRecordId: 'record-123',
          deductionTypeId: 'type-456',
          amount: 10.0, // 10% of gross pay
          effectiveDate: '2024-01-01'
        };

        const mockDeductionType = {
          id: 'type-456',
          calculation_type: 'percentage'
        };

        mockTaxRepository.findDeductionTypeById = jest.fn().mockResolvedValue(mockDeductionType);
        mockTaxRepository.createEmployeeDeduction = jest.fn().mockResolvedValue({
          id: 'deduction-789',
          ...assignmentData
        });

        const result = await service.assignDeduction(
          assignmentData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.amount).toBe(10.0);
      });

      test('should assign fixed deduction to employee', async () => {
        const assignmentData = {
          employeeRecordId: 'record-123',
          deductionTypeId: 'type-456',
          amount: 250.0, // Fixed $250 per pay period
          effectiveDate: '2024-01-01'
        };

        const mockDeductionType = {
          id: 'type-456',
          calculation_type: 'fixed'
        };

        mockTaxRepository.findDeductionTypeById = jest.fn().mockResolvedValue(mockDeductionType);
        mockTaxRepository.createEmployeeDeduction = jest.fn().mockResolvedValue({
          id: 'deduction-789',
          ...assignmentData
        });

        const result = await service.assignDeduction(
          assignmentData,
          'org-789',
          'user-123'
        );

        expect(result.amount).toBe(250.0);
      });

      test('should validate deduction type exists', async () => {
        mockTaxRepository.findDeductionTypeById = jest.fn().mockResolvedValue(null);

        await expect(
          service.assignDeduction({
            employeeRecordId: 'record-123',
            deductionTypeId: 'nonexistent',
            amount: 10.0,
            effectiveDate: '2024-01-01'
          }, 'org-789', 'user-123')
        ).rejects.toThrow(/not found/i);
      });
    });

    describe('updateEmployeeDeduction', () => {
      test('should update deduction amount', async () => {
        const updates = {
          amount: 15.0 // Increase from 10% to 15%
        };

        mockTaxRepository.updateEmployeeDeduction = jest.fn().mockResolvedValue({
          id: 'deduction-123',
          ...updates
        });

        const result = await service.updateEmployeeDeduction(
          'deduction-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result.amount).toBe(15.0);
      });
    });

    describe('terminateDeduction', () => {
      test('should terminate employee deduction', async () => {
        mockTaxRepository.updateEmployeeDeduction = jest.fn().mockResolvedValue({
          id: 'deduction-123',
          is_active: false,
          end_date: '2024-12-31'
        });

        const result = await service.terminateDeduction(
          'deduction-123',
          '2024-12-31',
          'org-789',
          'user-123'
        );

        expect(result.is_active).toBe(false);
        expect(result.end_date).toBeDefined();
      });
    });

    describe('getEmployeeDeductions', () => {
      test('should retrieve active deductions for employee', async () => {
        const mockDeductions = [
          { id: 'ded-1', deduction_type: 'retirement', is_active: true },
          { id: 'ded-2', deduction_type: 'health', is_active: true }
        ];

        mockTaxRepository.findEmployeeDeductions = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.getEmployeeDeductions('record-123', 'org-789');

        expect(result).toEqual(mockDeductions);
      });
    });
  });

  describe('Deduction Calculations', () => {
    describe('calculateDeduction', () => {
      test('should calculate percentage deduction', async () => {
        const grossPay = 5000.0;
        const deductionAmount = 10.0; // 10%

        const result = service.calculatePercentageDeduction(grossPay, deductionAmount);

        expect(result).toBe(500.0); // 10% of $5000
      });

      test('should calculate fixed deduction', async () => {
        const deductionAmount = 250.0;

        const result = service.calculateFixedDeduction(deductionAmount);

        expect(result).toBe(250.0);
      });

      test('should calculate all deductions for paycheck', async () => {
        const grossPay = 5000.0;
        const mockDeductions = [
          { id: 'ded-1', amount: 10.0, calculation_type: 'percentage', is_pre_tax: true },  // 401k: $500
          { id: 'ded-2', amount: 200.0, calculation_type: 'fixed', is_pre_tax: true },     // Health: $200
          { id: 'ded-3', amount: 100.0, calculation_type: 'fixed', is_pre_tax: false }     // Garnishment: $100
        ];

        mockTaxRepository.findEmployeeDeductions = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.calculateAllDeductions(
          'record-123',
          grossPay,
          'org-789'
        );

        expect(result.totalPreTax).toBe(700.0);  // $500 + $200
        expect(result.totalPostTax).toBe(100.0); // $100
        expect(result.totalDeductions).toBe(800.0);
      });
    });

    describe('calculateNetPay', () => {
      test('should calculate net pay with deductions and taxes', async () => {
        const grossPay = 5000.0;
        const deductions = {
          totalPreTax: 700.0,
          totalPostTax: 100.0
        };
        const taxes = 800.0;

        const result = service.calculateNetPay(grossPay, deductions, taxes);

        // Net = Gross - PreTax - Taxes - PostTax
        // Net = 5000 - 700 - 800 - 100 = 3400
        expect(result).toBe(3400.0);
      });

      test('should handle zero deductions', async () => {
        const grossPay = 5000.0;
        const deductions = {
          totalPreTax: 0,
          totalPostTax: 0
        };
        const taxes = 800.0;

        const result = service.calculateNetPay(grossPay, deductions, taxes);

        expect(result).toBe(4200.0); // 5000 - 800
      });
    });
  });

  describe('Deduction Limits', () => {
    describe('enforceDeductionLimits', () => {
      test('should enforce 401k contribution limit', async () => {
        const annualLimit = 23000.0; // 2024 IRS limit
        const yearToDateContributions = 22000.0;
        const requestedDeduction = 2000.0;

        const result = service.enforceAnnualLimit(
          requestedDeduction,
          yearToDateContributions,
          annualLimit
        );

        expect(result).toBe(1000.0); // Can only contribute $1000 more
      });

      test('should allow deduction within limit', async () => {
        const annualLimit = 23000.0;
        const yearToDateContributions = 10000.0;
        const requestedDeduction = 500.0;

        const result = service.enforceAnnualLimit(
          requestedDeduction,
          yearToDateContributions,
          annualLimit
        );

        expect(result).toBe(500.0); // Full amount allowed
      });

      test('should enforce maximum deduction percentage', async () => {
        const grossPay = 5000.0;
        const requestedPercentage = 95.0; // 95%
        const maxPercentage = 75.0; // Max 75% of gross pay

        const result = service.enforceMaxPercentage(
          grossPay,
          requestedPercentage,
          maxPercentage
        );

        expect(result).toBe(3750.0); // 75% of $5000
      });
    });
  });

  describe('Deduction Reporting', () => {
    describe('getDeductionSummary', () => {
      test('should generate deduction summary for period', async () => {
        const mockDeductions = [
          { deduction_type: 'retirement', amount: 500, is_pre_tax: true },
          { deduction_type: 'retirement', amount: 500, is_pre_tax: true },
          { deduction_type: 'health', amount: 200, is_pre_tax: true }
        ];

        mockTaxRepository.findDeductionsForPeriod = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.getDeductionSummary(
          'record-123',
          '2024-01-01',
          '2024-12-31',
          'org-789'
        );

        expect(result.totalAmount).toBe(1200.0);
        expect(result.byType.retirement).toBe(1000.0);
        expect(result.byType.health).toBe(200.0);
      });
    });

    describe('getYearToDateDeductions', () => {
      test('should calculate YTD deductions by type', async () => {
        const mockDeductions = [
          { deduction_type: 'retirement', amount: 500 },
          { deduction_type: 'retirement', amount: 500 },
          { deduction_type: 'retirement', amount: 500 }
        ];

        mockTaxRepository.findDeductionsForPeriod = jest.fn().mockResolvedValue(mockDeductions);

        const result = await service.getYearToDateDeductions(
          'record-123',
          '2024-01-01',
          '2024-06-30',
          'org-789'
        );

        expect(result.retirement).toBe(1500.0);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockTaxRepository.createDeductionType = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.createDeductionType({
          deductionName: 'Test',
          deductionType: 'retirement',
          calculationType: 'percentage',
          defaultAmount: 5.0,
          isPreTax: true,
          isActive: true
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle invalid deduction amount', async () => {
      await expect(
        service.calculatePercentageDeduction(5000, -10)
      ).toThrow(/positive/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero gross pay', async () => {
      const grossPay = 0;
      const deductionPercentage = 10.0;

      const result = service.calculatePercentageDeduction(grossPay, deductionPercentage);

      expect(result).toBe(0);
    });

    test('should handle employee with no deductions', async () => {
      mockTaxRepository.findEmployeeDeductions = jest.fn().mockResolvedValue([]);

      const result = await service.calculateAllDeductions(
        'record-123',
        5000.0,
        'org-789'
      );

      expect(result.totalPreTax).toBe(0);
      expect(result.totalPostTax).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });

    test('should handle deduction exceeding gross pay', async () => {
      const grossPay = 1000.0;
      const requestedPercentage = 150.0; // 150% (invalid)

      const result = service.enforceMaxPercentage(grossPay, requestedPercentage, 100);

      expect(result).toBe(1000.0); // Capped at gross pay
    });
  });
});
