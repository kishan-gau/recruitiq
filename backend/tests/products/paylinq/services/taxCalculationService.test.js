/**
 * Tax Calculation Service - Unit Tests
 * 
 * Tests for tax calculation business logic, deductions, allowances, tax rule sets,
 * and bracket-based progressive tax calculations.
 * 
 * Coverage Target: 90%+
 * 
 * @module tests/products/paylinq/services/taxCalculationService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TaxCalculationService } from '../../../../src/products/paylinq/services/taxCalculationService.js';
import TaxEngineRepository from '../../../../src/products/paylinq/repositories/taxEngineRepository.js';
import DeductionRepository from '../../../../src/products/paylinq/repositories/deductionRepository.js';
import AllowanceService from '../../../../src/products/paylinq/services/AllowanceService.js';
import { ValidationError, NotFoundError } from '../../../../src/middleware/errorHandler.js';

// Mock dependencies
jest.mock('../../../../src/products/paylinq/repositories/taxEngineRepository.js');
jest.mock('../../../../src/products/paylinq/repositories/deductionRepository.js');
jest.mock('../../../../src/products/paylinq/services/AllowanceService.js');
jest.mock('../../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TaxCalculationService', () => {
  let service;
  let mockTaxEngineRepository;
  let mockDeductionRepository;
  let mockAllowanceService;

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testEmployeeRecordId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockTaxEngineRepository = {
      createTaxRuleSet: jest.fn(),
      findTaxRuleSets: jest.fn(),
      findTaxRuleSetById: jest.fn(),
      updateTaxRuleSet: jest.fn(),
      softDeleteTaxRuleSet: jest.fn(),
      findApplicableTaxRuleSets: jest.fn(),
      createTaxBracket: jest.fn(),
      bulkCreateTaxBrackets: jest.fn(),
      findTaxBrackets: jest.fn(),
      findTaxBracketById: jest.fn(),
      updateTaxBracket: jest.fn(),
      softDeleteTaxBracket: jest.fn(),
      createAllowance: jest.fn(),
      calculateBracketTax: jest.fn(),
      calculateFlatRateTax: jest.fn(),
      getSurinameseWageTaxBrackets: jest.fn(),
      getSurinameseAOVRate: jest.fn(),
      getSurinameseAWWRate: jest.fn()
    };

    mockDeductionRepository = {
      createEmployeeDeduction: jest.fn(),
      findEmployeeDeductions: jest.fn(),
      findEmployeeDeductionById: jest.fn(),
      updateEmployeeDeduction: jest.fn(),
      softDeleteEmployeeDeduction: jest.fn(),
      findActiveDeductionsForPayroll: jest.fn()
    };

    mockAllowanceService = {
      calculateTaxFreeAllowance: jest.fn(),
      applyHolidayAllowance: jest.fn(),
      applyBonusAllowance: jest.fn()
    };

    // Inject mocks
    service = new TaxCalculationService(
      mockTaxEngineRepository,
      mockDeductionRepository,
      mockAllowanceService
    );
  });

  // ==================== DEDUCTION TESTS ====================

  describe('createDeduction', () => {
    it('should create a deduction with valid data', async () => {
      const deductionData = {
        employeeRecordId: testEmployeeRecordId,
        deductionType: 'pension',
        deductionName: 'Retirement Contribution',
        deductionCode: 'PENSION_401K',
        calculationType: 'percentage',
        deductionPercentage: 5,
        isPreTax: true,
        isRecurring: true,
        frequency: 'per_payroll',
        effectiveFrom: new Date('2025-01-01'),
        isActive: true,
        priority: 1
      };

      const createdDeduction = {
        id: '423e4567-e89b-12d3-a456-426614174003',
        ...deductionData,
        organization_id: testOrgId,
        created_by: testUserId
      };

      mockDeductionRepository.createEmployeeDeduction.mockResolvedValue(createdDeduction);

      const result = await service.createDeduction(deductionData, testOrgId, testUserId);

      expect(result).toEqual(createdDeduction);
      expect(mockDeductionRepository.createEmployeeDeduction).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeRecordId: testEmployeeRecordId,
          deductionType: 'pension',
          calculationType: 'percentage'
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid deduction type', async () => {
      const invalidData = {
        employeeRecordId: testEmployeeRecordId,
        deductionType: 'invalid_type',
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createDeduction(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for fixed_amount without amount', async () => {
      const invalidData = {
        employeeRecordId: testEmployeeRecordId,
        deductionType: 'pension',
        calculationType: 'fixed_amount',
        // Missing deductionAmount
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createDeduction(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for percentage without percentage value', async () => {
      const invalidData = {
        employeeRecordId: testEmployeeRecordId,
        deductionType: 'pension',
        calculationType: 'percentage',
        // Missing deductionPercentage
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createDeduction(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid effective date range', async () => {
      const invalidData = {
        employeeRecordId: testEmployeeRecordId,
        deductionType: 'pension',
        calculationType: 'fixed_amount',
        deductionAmount: 100,
        effectiveFrom: new Date('2025-12-31'),
        effectiveTo: new Date('2025-01-01') // Before effectiveFrom
      };

      await expect(
        service.createDeduction(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getDeductionsByOrganization', () => {
    it('should return deductions for organization', async () => {
      const deductions = [
        { id: '523e4567-e89b-12d3-a456-426614174004', deduction_type: 'pension' },
        { id: '623e4567-e89b-12d3-a456-426614174005', deduction_type: 'insurance' }
      ];

      mockDeductionRepository.findEmployeeDeductions.mockResolvedValue(deductions);

      const result = await service.getDeductionsByOrganization(testOrgId);

      expect(result).toEqual(deductions);
      expect(mockDeductionRepository.findEmployeeDeductions).toHaveBeenCalledWith(
        {},
        testOrgId
      );
    });

    it('should apply filters when provided', async () => {
      const filters = { deductionType: 'pension', isActive: true };

      mockDeductionRepository.findEmployeeDeductions.mockResolvedValue([]);

      await service.getDeductionsByOrganization(testOrgId, filters);

      expect(mockDeductionRepository.findEmployeeDeductions).toHaveBeenCalledWith(
        filters,
        testOrgId
      );
    });
  });

  describe('getDeductionsByEmployee', () => {
    it('should return deductions for specific employee', async () => {
      const deductions = [{ id: '723e4567-e89b-12d3-a456-426614174006', employee_record_id: testEmployeeRecordId }];

      mockDeductionRepository.findEmployeeDeductions.mockResolvedValue(deductions);

      const result = await service.getDeductionsByEmployee(
        testEmployeeRecordId,
        testOrgId
      );

      expect(result).toEqual(deductions);
      expect(mockDeductionRepository.findEmployeeDeductions).toHaveBeenCalledWith(
        { employeeRecordId: testEmployeeRecordId },
        testOrgId
      );
    });
  });

  describe('getDeductionById', () => {
    it('should return deduction by ID', async () => {
      const deduction = { id: '823e4567-e89b-12d3-a456-426614174007', deduction_type: 'pension' };

      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(deduction);

      const result = await service.getDeductionById('ded-123e4567-e89b-12d3-a456-426614174000', testOrgId);

      expect(result).toEqual(deduction);
      expect(mockDeductionRepository.findEmployeeDeductionById).toHaveBeenCalledWith(
        'ded-123e4567-e89b-12d3-a456-426614174000',
        testOrgId
      );
    });
  });

  describe('updateDeduction', () => {
    it('should update deduction with valid data', async () => {
      const existingDeduction = { id: '923e4567-e89b-12d3-a456-426614174008', deduction_type: 'pension' };
      const updates = { deductionAmount: 200, isActive: false };
      const updatedDeduction = { ...existingDeduction, ...updates };

      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(existingDeduction);
      mockDeductionRepository.updateEmployeeDeduction.mockResolvedValue(updatedDeduction);

      const result = await service.updateDeduction(
        'ded-123',
        testOrgId,
        updates,
        testUserId
      );

      expect(result).toEqual(updatedDeduction);
      expect(mockDeductionRepository.updateEmployeeDeduction).toHaveBeenCalledWith(
        'ded-123',
        updates,
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError if deduction does not exist', async () => {
      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(null);

      await expect(
        service.updateDeduction('ded-999', testOrgId, {}, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid effective date range', async () => {
      const existingDeduction = { id: 'a23e4567-e89b-12d3-a456-426614174009' };
      const updates = {
        effectiveFrom: new Date('2025-12-31'),
        effectiveTo: new Date('2025-01-01')
      };

      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(existingDeduction);

      await expect(
        service.updateDeduction('ded-123', testOrgId, updates, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteDeduction', () => {
    it('should soft delete deduction', async () => {
      const existingDeduction = { id: 'b23e4567-e89b-12d3-a456-426614174010' };

      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(existingDeduction);
      mockDeductionRepository.softDeleteEmployeeDeduction.mockResolvedValue(true);

      const result = await service.deleteDeduction('ded-123e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId);

      expect(result).toBe(true);
      expect(mockDeductionRepository.softDeleteEmployeeDeduction).toHaveBeenCalledWith(
        'ded-123e4567-e89b-12d3-a456-426614174000',
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError if deduction does not exist', async () => {
      mockDeductionRepository.findEmployeeDeductionById.mockResolvedValue(null);

      await expect(
        service.deleteDeduction('ded-999e4567-e89b-12d3-a456-426614174999', testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== TAX RULE SET TESTS ====================

  describe('createTaxRuleSet', () => {
    it('should create tax rule set with valid data', async () => {
      const ruleSetData = {
        taxType: 'income',
        taxName: 'Federal Income Tax',
        country: 'SR',
        effectiveFrom: new Date('2025-01-01'),
        isActive: true,
        calculationMethod: 'bracket'
      };

      const createdRuleSet = {
        id: 'c23e4567-e89b-12d3-a456-426614174011',
        ...ruleSetData,
        organization_id: testOrgId
      };

      mockTaxEngineRepository.createTaxRuleSet.mockResolvedValue(createdRuleSet);

      const result = await service.createTaxRuleSet(ruleSetData, testOrgId, testUserId);

      expect(result).toEqual(createdRuleSet);
      expect(mockTaxEngineRepository.createTaxRuleSet).toHaveBeenCalledWith(
        expect.objectContaining({
          taxType: 'income',
          taxName: 'Federal Income Tax',
          country: 'SR'
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid tax type', async () => {
      const invalidData = {
        taxType: 'invalid_type',
        taxName: 'Test Tax',
        country: 'SR',
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createTaxRuleSet(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid country code', async () => {
      const invalidData = {
        taxType: 'income',
        taxName: 'Test Tax',
        country: 'INVALID', // Should be 2 chars
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createTaxRuleSet(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for invalid effective date range', async () => {
      const invalidData = {
        taxType: 'income',
        taxName: 'Test Tax',
        country: 'SR',
        effectiveFrom: new Date('2025-12-31'),
        effectiveTo: new Date('2025-01-01')
      };

      await expect(
        service.createTaxRuleSet(invalidData, testOrgId, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('getTaxRuleSets', () => {
    it('should return tax rule sets for organization', async () => {
      const ruleSets = [
        { id: 'rule-1', tax_type: 'income' },
        { id: 'rule-2', tax_type: 'wage' }
      ];

      mockTaxEngineRepository.findTaxRuleSets.mockResolvedValue(ruleSets);

      const result = await service.getTaxRuleSets(testOrgId);

      expect(result).toEqual(ruleSets);
      expect(mockTaxEngineRepository.findTaxRuleSets).toHaveBeenCalledWith(
        testOrgId,
        {}
      );
    });

    it('should apply filters when provided', async () => {
      const filters = { taxType: 'income', isActive: true };

      mockTaxEngineRepository.findTaxRuleSets.mockResolvedValue([]);

      await service.getTaxRuleSets(testOrgId, filters);

      expect(mockTaxEngineRepository.findTaxRuleSets).toHaveBeenCalledWith(
        testOrgId,
        filters
      );
    });
  });

  describe('getTaxRuleSetById', () => {
    it('should return tax rule set by ID', async () => {
      const ruleSet = { id: 'f23e4567-e89b-12d3-a456-426614174014', tax_type: 'income' };

      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(ruleSet);

      const result = await service.getTaxRuleSetById('rule-123', testOrgId);

      expect(result).toEqual(ruleSet);
    });
  });

  describe('updateTaxRuleSet', () => {
    it('should update tax rule set', async () => {
      const existingRuleSet = { id: '023e4567-e89b-12d3-a456-426614174015', tax_type: 'income' };
      const updates = { isActive: false, description: 'Updated description' };
      const updatedRuleSet = { ...existingRuleSet, ...updates };

      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(existingRuleSet);
      mockTaxEngineRepository.updateTaxRuleSet.mockResolvedValue(updatedRuleSet);

      const result = await service.updateTaxRuleSet('rule-123', testOrgId, updates);

      expect(result).toEqual(updatedRuleSet);
      expect(mockTaxEngineRepository.updateTaxRuleSet).toHaveBeenCalledWith(
        'rule-123',
        updates,
        testOrgId
      );
    });

    it('should throw NotFoundError if rule set does not exist', async () => {
      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(null);

      await expect(
        service.updateTaxRuleSet('rule-999', testOrgId, {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid date range', async () => {
      const existingRuleSet = { id: '123e4567-e89b-12d3-a456-426614174016' };
      const updates = {
        effectiveFrom: new Date('2025-12-31'),
        effectiveTo: new Date('2025-01-01')
      };

      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(existingRuleSet);

      await expect(
        service.updateTaxRuleSet('rule-123', testOrgId, updates)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteTaxRuleSet', () => {
    it('should soft delete tax rule set', async () => {
      const existingRuleSet = { id: '223e4567-e89b-12d3-a456-426614174017' };

      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(existingRuleSet);
      mockTaxEngineRepository.softDeleteTaxRuleSet.mockResolvedValue(true);

      const result = await service.deleteTaxRuleSet('rule-123e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId);

      expect(result).toBe(true);
      expect(mockTaxEngineRepository.softDeleteTaxRuleSet).toHaveBeenCalledWith(
        'rule-123e4567-e89b-12d3-a456-426614174000',
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError if rule set does not exist', async () => {
      mockTaxEngineRepository.findTaxRuleSetById.mockResolvedValue(null);

      await expect(
        service.deleteTaxRuleSet('rule-999e4567-e89b-12d3-a456-426614174999', testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getApplicableTaxRuleSets', () => {
    it('should return applicable tax rule sets for jurisdiction', async () => {
      const ruleSets = [
        { id: 'rule-1', tax_type: 'income' },
        { id: 'rule-2', tax_type: 'wage' }
      ];

      mockTaxEngineRepository.findApplicableTaxRuleSets.mockResolvedValue(ruleSets);

      const result = await service.getApplicableTaxRuleSets(
        'SR',
        new Date('2025-01-01'),
        testOrgId
      );

      expect(result).toEqual(ruleSets);
      expect(mockTaxEngineRepository.findApplicableTaxRuleSets).toHaveBeenCalledWith(
        'SR',
        new Date('2025-01-01'),
        testOrgId,
        null,
        null
      );
    });

    it('should include state and locality when provided', async () => {
      mockTaxEngineRepository.findApplicableTaxRuleSets.mockResolvedValue([]);

      await service.getApplicableTaxRuleSets(
        'SR',
        new Date('2025-01-01'),
        testOrgId,
        'CA',
        'San Francisco'
      );

      expect(mockTaxEngineRepository.findApplicableTaxRuleSets).toHaveBeenCalledWith(
        'SR',
        new Date('2025-01-01'),
        testOrgId,
        'CA',
        'San Francisco'
      );
    });
  });

  // ==================== TAX BRACKET TESTS ====================

  describe('createTaxBracket', () => {
    it('should create tax bracket with valid data', async () => {
      const bracketData = {
        taxRuleSetId: '523e4567-e89b-12d3-a456-426614174020',
        bracketOrder: 1,
        incomeMin: 0,
        incomeMax: 10000,
        ratePercentage: 10,
        fixedAmount: 0
      };

      const createdBracket = {
        id: '623e4567-e89b-12d3-a456-426614174021',
        ...bracketData,
        organization_id: testOrgId
      };

      mockTaxEngineRepository.createTaxBracket.mockResolvedValue(createdBracket);

      const result = await service.createTaxBracket(bracketData, testOrgId, testUserId);

      expect(result).toEqual(createdBracket);
      expect(mockTaxEngineRepository.createTaxBracket).toHaveBeenCalledWith(
        expect.objectContaining({
          taxRuleSetId: '523e4567-e89b-12d3-a456-426614174020',
          bracketOrder: 1,
          incomeMin: 0
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid UUID', async () => {
      const invalidData = {
        taxRuleSetId: 'invalid-uuid',
        bracketOrder: 1,
        incomeMin: 0,
        ratePercentage: 10
      };

      await expect(
        service.createTaxBracket(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error for incomeMax less than incomeMin', async () => {
      const invalidData = {
        taxRuleSetId: '523e4567-e89b-12d3-a456-426614174020',
        bracketOrder: 1,
        incomeMin: 10000,
        incomeMax: 5000, // Less than min
        ratePercentage: 10
      };

      await expect(
        service.createTaxBracket(invalidData, testOrgId, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('bulkCreateTaxBrackets', () => {
    it('should create multiple tax brackets', async () => {
      const brackets = [
        {
          taxRuleSetId: '823e4567-e89b-12d3-a456-426614174023',
          bracketOrder: 1,
          incomeMin: 0,
          incomeMax: 10000,
          ratePercentage: 10,
          fixedAmount: 0
        },
        {
          taxRuleSetId: '823e4567-e89b-12d3-a456-426614174023',
          bracketOrder: 2,
          incomeMin: 10000,
          incomeMax: 25000,
          ratePercentage: 15,
          fixedAmount: 1000
        }
      ];

      const createdBrackets = brackets.map((b, i) => ({
        id: `bracket-${i}23e4567-e89b-12d3-a456-426614174000`,
        ...b
      }));

      mockTaxEngineRepository.bulkCreateTaxBrackets.mockResolvedValue(createdBrackets);

      const result = await service.bulkCreateTaxBrackets(brackets, testOrgId, testUserId);

      expect(result).toEqual(createdBrackets);
      expect(mockTaxEngineRepository.bulkCreateTaxBrackets).toHaveBeenCalledWith(
        brackets,
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError if any bracket is invalid', async () => {
      const brackets = [
        {
          taxRuleSetId: 'rule-123e4567-e89b-12d3-a456-426614174000',
          bracketOrder: 1,
          incomeMin: 0,
          ratePercentage: 10
        },
        {
          taxRuleSetId: 'invalid-uuid-not-a-guid', // Invalid
          bracketOrder: 2,
          incomeMin: 10000,
          ratePercentage: 15
        }
      ];

      await expect(
        service.bulkCreateTaxBrackets(brackets, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTaxBrackets', () => {
    it('should return tax brackets for rule set', async () => {
      const brackets = [
        { id: 'bracket-1', bracket_order: 1 },
        { id: 'bracket-2', bracket_order: 2 }
      ];

      mockTaxEngineRepository.findTaxBrackets.mockResolvedValue(brackets);

      const result = await service.getTaxBrackets('rule-123', testOrgId);

      expect(result).toEqual(brackets);
      expect(mockTaxEngineRepository.findTaxBrackets).toHaveBeenCalledWith(
        'rule-123',
        testOrgId
      );
    });
  });

  describe('updateTaxBracket', () => {
    it('should update tax bracket', async () => {
      const existingBracket = { id: 'bracket-123', rate_percentage: 10 };
      const updates = { ratePercentage: 12 };
      const updatedBracket = { ...existingBracket, rate_percentage: 12 };

      mockTaxEngineRepository.findTaxBracketById.mockResolvedValue(existingBracket);
      mockTaxEngineRepository.updateTaxBracket.mockResolvedValue(updatedBracket);

      const result = await service.updateTaxBracket('bracket-123', testOrgId, updates);

      expect(result).toEqual(updatedBracket);
    });

    it('should throw NotFoundError if bracket does not exist', async () => {
      mockTaxEngineRepository.findTaxBracketById.mockResolvedValue(null);

      await expect(
        service.updateTaxBracket('bracket-999', testOrgId, {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid income range', async () => {
      const existingBracket = { id: 'bracket-123' };
      const updates = {
        incomeMin: 10000,
        incomeMax: 5000 // Less than min
      };

      mockTaxEngineRepository.findTaxBracketById.mockResolvedValue(existingBracket);

      await expect(
        service.updateTaxBracket('bracket-123', testOrgId, updates)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteTaxBracket', () => {
    it('should soft delete tax bracket', async () => {
      const existingBracket = { id: 'bracket-123e4567-e89b-12d3-a456-426614174000' };

      mockTaxEngineRepository.findTaxBracketById.mockResolvedValue(existingBracket);
      mockTaxEngineRepository.softDeleteTaxBracket.mockResolvedValue(true);

      const result = await service.deleteTaxBracket('bracket-123e4567-e89b-12d3-a456-426614174000', testOrgId, testUserId);

      expect(result).toBe(true);
      expect(mockTaxEngineRepository.softDeleteTaxBracket).toHaveBeenCalledWith(
        'bracket-123e4567-e89b-12d3-a456-426614174000',
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError if bracket does not exist', async () => {
      mockTaxEngineRepository.findTaxBracketById.mockResolvedValue(null);

      await expect(
        service.deleteTaxBracket('bracket-999e4567-e89b-12d3-a456-426614174999', testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== ALLOWANCE TESTS ====================

  describe('createAllowance', () => {
    it('should create allowance with valid data', async () => {
      const allowanceData = {
        allowanceType: 'personal',
        allowanceName: 'Personal Allowance',
        country: 'SR',
        amount: 9000,
        isPercentage: false,
        effectiveFrom: new Date('2025-01-01'),
        isActive: true
      };

      const createdAllowance = {
        id: 'allow-123e4567-e89b-12d3-a456-426614174000',
        ...allowanceData,
        organization_id: testOrgId
      };

      mockTaxEngineRepository.createAllowance.mockResolvedValue(createdAllowance);

      const result = await service.createAllowance(allowanceData, testOrgId, testUserId);

      expect(result).toEqual(createdAllowance);
      expect(mockTaxEngineRepository.createAllowance).toHaveBeenCalledWith(
        expect.objectContaining({
          allowanceType: 'personal',
          amount: 9000
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw error for percentage allowance exceeding 100%', async () => {
      const invalidData = {
        allowanceType: 'personal',
        allowanceName: 'Personal Allowance',
        country: 'SR',
        amount: 150, // > 100
        isPercentage: true,
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createAllowance(invalidData, testOrgId, testUserId)
      ).rejects.toThrow();
    });

    it('should throw ValidationError for invalid allowance type', async () => {
      const invalidData = {
        allowanceType: 'invalid_type',
        allowanceName: 'Test',
        country: 'SR',
        amount: 100,
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.createAllowance(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== TAX CALCULATION TESTS ====================
  // NOTE: These tests are temporarily skipped due to database mocking complexity
  // They should be converted to integration tests or refactored to use proper mocking

  /**
   * calculateEmployeeTaxes - MOVED TO INTEGRATION TESTS
   * 
   * This method orchestrates multiple services and repositories:
   * - _getEmployeeResidenceStatus (database query)
   * - allowanceService.calculateTaxFreeAllowance (external service)
   * - taxEngineRepository.findApplicableTaxRuleSets (repository)
   * - taxEngineRepository.findTaxBrackets (repository)
   * - deductionRepository.findActiveDeductionsForPayroll (repository)
   * 
   * Reason for migration: 5+ dependencies make unit testing impractical.
   * Unit tests with excessive mocking test mock setup, not real behavior.
   * 
   * Integration tests provide higher confidence and are more maintainable.
   * 
   * Location: tests/integration/paylinq/tax-calculation.test.js
   * 
   * See TESTING_STANDARDS.md - "Test Classification: Unit vs Integration" section.
   */

  describe('calculateEmployeeTaxesWithComponents', () => {
    it('should calculate taxes with component-based approach', async () => {
      const components = [
        {
          componentCode: 'REGULAR_SALARY',
          componentName: 'Regular Salary',
          amount: 8000,
          isTaxable: true,
          allowanceType: 'tax_free_sum_monthly'
        },
        {
          componentCode: 'VAKANTIEGELD',
          componentName: 'Holiday Allowance',
          amount: 2000,
          isTaxable: true,
          allowanceType: 'holiday_allowance'
        }
      ];

      const payDate = new Date('2025-01-15');

      // Mock allowances
      mockAllowanceService.calculateTaxFreeAllowance.mockResolvedValue(7000);
      mockAllowanceService.applyHolidayAllowance.mockResolvedValue({
        appliedAmount: 1800
      });

      // Mock tax rule sets
      const wageTaxRuleSet = {
        id: 'wage-rule-1',
        tax_type: 'wage',
        calculation_mode: 'proportional_distribution',
        calculation_method: 'bracket'
      };

      mockTaxEngineRepository.findApplicableTaxRuleSets.mockResolvedValue([wageTaxRuleSet]);

      // Mock brackets
      const brackets = [
        { bracket_order: 1, income_min: 0, rate_percentage: 10 }
      ];

      mockTaxEngineRepository.findTaxBrackets.mockResolvedValue(brackets);
      mockTaxEngineRepository.calculateBracketTax.mockResolvedValue(120); // Total wage tax

      // Mock AOV and AWW
      mockTaxEngineRepository.getSurinameseAOVRate.mockResolvedValue({
        id: 'aov-1',
        calculation_mode: 'component_based'
      });
      mockTaxEngineRepository.getSurinameseAWWRate.mockResolvedValue({
        id: 'aww-1',
        calculation_mode: 'component_based'
      });

      mockTaxEngineRepository.findTaxBrackets
        .mockResolvedValueOnce(brackets) // Wage tax
        .mockResolvedValueOnce([{ rate_percentage: 4 }]) // AOV
        .mockResolvedValueOnce([{ rate_percentage: 1.5 }]); // AWW

      mockTaxEngineRepository.calculateFlatRateTax
        .mockResolvedValueOnce(40) // AOV component 1
        .mockResolvedValueOnce(8) // AOV component 2
        .mockResolvedValueOnce(15) // AWW component 1
        .mockResolvedValueOnce(3); // AWW component 2

      const result = await service.calculateEmployeeTaxesWithComponents(
        testEmployeeRecordId,
        components,
        payDate,
        'monthly',
        testOrgId
      );

      expect(result.summary).toMatchObject({
        totalGrossPay: 10000,
        totalTaxFreeAllowance: 8800,
        totalTaxableIncome: 1200,
        componentCount: 2
      });

      expect(result.componentTaxes).toHaveLength(2);
      expect(result.componentTaxes[0]).toMatchObject({
        componentCode: 'REGULAR_SALARY',
        amount: 8000,
        taxFreeAllowance: 7000,
        taxableIncome: 1000
      });
    });

    it('should skip non-taxable components', async () => {
      const components = [
        {
          componentCode: 'REGULAR_SALARY',
          componentName: 'Regular Salary',
          amount: 8000,
          isTaxable: true,
          allowanceType: 'tax_free_sum_monthly'
        },
        {
          componentCode: 'REIMBURSEMENT',
          componentName: 'Expense Reimbursement',
          amount: 500,
          isTaxable: false
        }
      ];

      mockAllowanceService.calculateTaxFreeAllowance.mockResolvedValue(7000);
      mockTaxEngineRepository.findApplicableTaxRuleSets.mockResolvedValue([]);
      mockTaxEngineRepository.getSurinameseWageTaxBrackets.mockResolvedValue([]);
      mockTaxEngineRepository.getSurinameseAOVRate.mockResolvedValue(null);
      mockTaxEngineRepository.getSurinameseAWWRate.mockResolvedValue(null);

      const result = await service.calculateEmployeeTaxesWithComponents(
        testEmployeeRecordId,
        components,
        new Date('2025-01-15'),
        'monthly',
        testOrgId
      );

      const nonTaxableComponent = result.componentTaxes.find(c => c.componentCode === 'REIMBURSEMENT');
      expect(nonTaxableComponent).toMatchObject({
        isTaxable: false,
        taxFreeAllowance: 0,
        taxableIncome: 0,
        totalTax: 0
      });
    });

    it('should throw ValidationError if no components provided', async () => {
      await expect(
        service.calculateEmployeeTaxesWithComponents(
          testEmployeeRecordId,
          [],
          new Date('2025-01-15'),
          'monthly',
          testOrgId
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if organizationId missing', async () => {
      const components = [
        {
          componentCode: 'REGULAR_SALARY',
          amount: 8000,
          isTaxable: true
        }
      ];

      await expect(
        service.calculateEmployeeTaxesWithComponents(
          testEmployeeRecordId,
          components,
          new Date('2025-01-15'),
          'monthly',
          null // Missing organizationId
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should apply bonus allowance for bonus_gratuity components', async () => {
      const components = [
        {
          componentCode: 'BONUS',
          componentName: '13th Month Bonus',
          amount: 5000,
          isTaxable: true,
          allowanceType: 'bonus_gratuity'
        }
      ];

      mockAllowanceService.applyBonusAllowance.mockResolvedValue({
        appliedAmount: 4500
      });

      mockTaxEngineRepository.findApplicableTaxRuleSets.mockResolvedValue([]);
      mockTaxEngineRepository.getSurinameseWageTaxBrackets.mockResolvedValue([]);
      mockTaxEngineRepository.getSurinameseAOVRate.mockResolvedValue(null);
      mockTaxEngineRepository.getSurinameseAWWRate.mockResolvedValue(null);

      const result = await service.calculateEmployeeTaxesWithComponents(
        testEmployeeRecordId,
        components,
        new Date('2025-01-15'),
        'monthly',
        testOrgId
      );

      expect(mockAllowanceService.applyBonusAllowance).toHaveBeenCalledWith(
        testEmployeeRecordId,
        5000,
        2025,
        testOrgId
      );

      expect(result.componentTaxes[0]).toMatchObject({
        taxFreeAllowance: 4500,
        taxableIncome: 500
      });
    });
  });

  describe('getYearToDateTaxSummary', () => {
    it('should return YTD tax summary structure', async () => {
      const result = await service.getYearToDateTaxSummary(
        testEmployeeRecordId,
        2025,
        testOrgId
      );

      expect(result).toMatchObject({
        employeeRecordId: testEmployeeRecordId,
        year: 2025,
        ytdGrossPay: 0,
        ytdFederalTax: 0,
        ytdStateTax: 0,
        ytdSocialSecurity: 0,
        ytdMedicare: 0,
        ytdTotalTaxes: 0,
        message: expect.stringContaining('MVP')
      });
    });
  });

  describe('setupMonthlyTaxFreeAllowance', () => {
    it('should create monthly tax-free allowance', async () => {
      const allowance = {
        id: 'allow-123',
        allowance_type: 'standard',
        amount: 9000,
        country: 'SR'
      };

      mockTaxEngineRepository.createAllowance.mockResolvedValue(allowance);

      const result = await service.setupMonthlyTaxFreeAllowance(testOrgId, testUserId);

      expect(result).toEqual(allowance);
      expect(mockTaxEngineRepository.createAllowance).toHaveBeenCalledWith(
        expect.objectContaining({
          allowanceType: 'standard',
          amount: 9000,
          country: 'SR'
        }),
        testOrgId,
        testUserId
      );
    });
  });

  describe('setupSurinameseTaxRules', () => {
    it('should setup default Surinamese tax rules', async () => {
      const wageTaxRuleSet = { id: '923e4567-e89b-12d3-a456-426614174024', tax_type: 'wage' };
      const aovRuleSet = { id: 'a23e4567-e89b-12d3-a456-426614174025', tax_type: 'social_security' };
      const awwRuleSet = { id: 'b23e4567-e89b-12d3-a456-426614174026', tax_type: 'medicare' };

      mockTaxEngineRepository.createTaxRuleSet
        .mockResolvedValueOnce(wageTaxRuleSet)
        .mockResolvedValueOnce(aovRuleSet)
        .mockResolvedValueOnce(awwRuleSet);

      const bracket = { id: 'c23e4567-e89b-12d3-a456-426614174027' };
      mockTaxEngineRepository.createTaxBracket.mockResolvedValue(bracket);

      const result = await service.setupSurinameseTaxRules(testOrgId, testUserId);

      expect(result).toMatchObject({
        wageTaxRuleSet,
        aovRuleSet,
        awwRuleSet
      });

      expect(result.brackets).toHaveLength(4); // 4 wage tax brackets
      expect(mockTaxEngineRepository.createTaxRuleSet).toHaveBeenCalledTimes(3);
      expect(mockTaxEngineRepository.createTaxBracket).toHaveBeenCalledTimes(6); // 4 wage + 1 AOV + 1 AWW
    });
  });
});
