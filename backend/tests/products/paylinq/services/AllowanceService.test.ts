/**
 * AllowanceService Test Suite
 * 
 * Tests for PayLinQ allowance service following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals  
 * - Service layer business logic validation
 * - Repository mocking via dependency injection
 * - Valid UUID v4 formats
 * - Joi schema validation
 * - Multi-tenant isolation validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AllowanceService from '../../../../src/products/paylinq/services/AllowanceService.js';

describe('AllowanceService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findActiveAllowanceByType: jest.fn(),
      getEmployeeAllowanceUsage: jest.fn(),
      recordAllowanceUsage: jest.fn(),
      getAllAllowances: jest.fn(),
      resetAllowanceUsage: jest.fn()
    };
    
    // Inject mock repository via constructor
    service = new AllowanceService(mockRepository);
  });

  // ==================== CALCULATE TAX FREE ALLOWANCE ====================

  describe('calculateTaxFreeAllowance', () => {
    it('should calculate tax-free allowance for resident employee', async () => {
      const mockAllowance = {
        id: '323e4567-e89b-12d3-a456-426614174002',
        organization_id: testOrganizationId,
        allowance_type: 'tax_free_sum_monthly',
        amount: 1500.00,
        is_active: true
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      const result = await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        true
      );

      expect(result).toBe(1500.00);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_monthly',
        expect.any(Date),
        testOrganizationId
      );
    });

    it('should return 0 for non-resident employee per Article 13.1a', async () => {
      // Non-residents do NOT receive tax-free allowance
      const result = await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        false // non-resident
      );

      expect(result).toBe(0);
      expect(mockRepository.findActiveAllowanceByType).not.toHaveBeenCalled();
    });

    it('should return minimum of allowance or gross pay', async () => {
      const mockAllowance = {
        amount: 2000.00
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      // Case 1: Allowance is less than gross pay
      let result = await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        true
      );
      expect(result).toBe(2000.00); // Returns allowance amount

      // Case 2: Gross pay is less than allowance
      result = await service.calculateTaxFreeAllowance(
        1000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        true
      );
      expect(result).toBe(1000.00); // Returns gross pay
    });

    it('should use correct allowance type for monthly period', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue({ amount: 1500.00 });

      await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        true
      );

      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_monthly',
        expect.any(Date),
        testOrganizationId
      );
    });

    it('should use correct allowance type for annual period', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue({ amount: 18000.00 });

      await service.calculateTaxFreeAllowance(
        60000.00,
        new Date('2025-06-15'),
        'annual',
        testOrganizationId,
        true
      );

      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_annual',
        expect.any(Date),
        testOrganizationId
      );
    });

    it('should return 0 when no allowance found', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      const result = await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId,
        true
      );

      expect(result).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.calculateTaxFreeAllowance(5000.00, new Date(), 'monthly', null, true)
      ).rejects.toThrow('organizationId is required for tenant isolation');
    });

    it('should default isResident to true', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue({ amount: 1500.00 });

      // Call without isResident parameter
      await service.calculateTaxFreeAllowance(
        5000.00,
        new Date('2025-06-15'),
        'monthly',
        testOrganizationId
      );

      // Should call repository (means isResident defaults to true)
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalled();
    });
  });

  // ==================== HOLIDAY ALLOWANCE ====================

  describe('getAvailableHolidayAllowance', () => {
    it('should return available holiday allowance', async () => {
      const mockUsage = {
        amount_used: 3000.00,
        amount_remaining: 5000.00
      };

      const mockAllowance = {
        amount: 8000.00
      };

      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(5000.00);
      expect(mockRepository.getEmployeeAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );
    });

    it('should return full allowance when no usage found', async () => {
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      
      const mockAllowance = {
        amount: 8000.00
      };
      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(8000.00);
    });

    it('should return 0 when allowance not configured', async () => {
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.getAvailableHolidayAllowance(testEmployeeId, 2025, null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  describe('applyHolidayAllowance', () => {
    it('should apply holiday allowance when sufficient balance', async () => {
      const mockAllowance = {
        amount: 8000.00
      };

      const mockUsage = {
        amount_used: 2000.00,
        amount_remaining: 6000.00
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.recordAllowanceUsage.mockResolvedValue({
        amount_used: 4000.00,
        amount_remaining: 4000.00
      });

      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(2000.00);
      expect(result.remainingForYear).toBe(4000.00);
      expect(result.taxableAmount).toBe(0);
      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'holiday_allowance',
        2000.00,
        2025,
        testOrganizationId
      );
    });

    it('should apply partial amount when insufficient balance', async () => {
      const mockAllowance = {
        amount: 8000.00
      };

      const mockUsage = {
        amount_used: 7000.00,
        amount_remaining: 1000.00
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.recordAllowanceUsage.mockResolvedValue({});

      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(1000.00);
      expect(result.remainingForYear).toBe(0);
      expect(result.taxableAmount).toBe(1000.00);
    });

    it('should return zero applied when allowance not configured', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(0);
      expect(result.remainingForYear).toBe(0);
      expect(result.taxableAmount).toBe(2000.00);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.applyHolidayAllowance(testEmployeeId, 2000.00, 2025, null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  // ==================== BONUS ALLOWANCE ====================

  describe('getAvailableBonusAllowance', () => {
    it('should return available bonus allowance', async () => {
      const mockUsage = {
        amount_used: 5000.00,
        amount_remaining: 10000.00
      };

      const mockAllowance = {
        amount: 15000.00
      };

      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      const result = await service.getAvailableBonusAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(10000.00);
      expect(mockRepository.getEmployeeAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'bonus_gratuity',
        2025,
        testOrganizationId
      );
    });

    it('should return full allowance when no usage found', async () => {
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      
      const mockAllowance = {
        amount: 15000.00
      };
      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);

      const result = await service.getAvailableBonusAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(15000.00);
    });

    it('should return 0 when allowance not configured', async () => {
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      const result = await service.getAvailableBonusAllowance(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.getAvailableBonusAllowance(testEmployeeId, 2025, null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  describe('applyBonusAllowance', () => {
    it('should apply bonus allowance when sufficient balance', async () => {
      const mockAllowance = {
        amount: 15000.00
      };

      const mockUsage = {
        amount_used: 5000.00,
        amount_remaining: 10000.00
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.recordAllowanceUsage.mockResolvedValue({
        amount_used: 8000.00,
        amount_remaining: 7000.00
      });

      const result = await service.applyBonusAllowance(
        testEmployeeId,
        3000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(3000.00);
      expect(result.remainingForYear).toBe(7000.00);
      expect(result.taxableAmount).toBe(0);
      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'bonus_gratuity',
        3000.00,
        2025,
        testOrganizationId
      );
    });

    it('should apply partial amount when insufficient balance', async () => {
      const mockAllowance = {
        amount: 15000.00
      };

      const mockUsage = {
        amount_used: 14000.00,
        amount_remaining: 1000.00
      };

      mockRepository.findActiveAllowanceByType.mockResolvedValue(mockAllowance);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(mockUsage);
      mockRepository.recordAllowanceUsage.mockResolvedValue({});

      const result = await service.applyBonusAllowance(
        testEmployeeId,
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(1000.00);
      expect(result.remainingForYear).toBe(0);
      expect(result.taxableAmount).toBe(1000.00);
    });

    it('should return zero applied when allowance not configured', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      const result = await service.applyBonusAllowance(
        testEmployeeId,
        2000.00,
        2025,
        testOrganizationId
      );

      expect(result.appliedAmount).toBe(0);
      expect(result.remainingForYear).toBe(0);
      expect(result.taxableAmount).toBe(2000.00);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.applyBonusAllowance(testEmployeeId, 2000.00, 2025, null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  // ==================== GET ALL ALLOWANCES ====================

  describe('getAllAllowances', () => {
    it('should return all allowances for organization', async () => {
      const mockAllowances = [
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          allowance_type: 'tax_free_sum_monthly',
          amount: 1500.00
        },
        {
          id: '423e4567-e89b-12d3-a456-426614174003',
          allowance_type: 'holiday_allowance',
          amount: 8000.00
        }
      ];

      mockRepository.getAllAllowances.mockResolvedValue(mockAllowances);

      const result = await service.getAllAllowances(testOrganizationId);

      expect(result).toEqual(mockAllowances);
      expect(mockRepository.getAllAllowances).toHaveBeenCalledWith(testOrganizationId);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.getAllAllowances(null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  // ==================== EMPLOYEE ALLOWANCE SUMMARY ====================

  describe('getEmployeeAllowanceSummary', () => {
    it('should return summary of all allowances for employee', async () => {
      mockRepository.getEmployeeAllowanceUsage
        .mockResolvedValueOnce({ amount_used: 3000.00 }) // holiday
        .mockResolvedValueOnce({ amount_used: 5000.00 }); // bonus

      mockRepository.findActiveAllowanceByType
        .mockResolvedValueOnce({ amount: 8000.00 }) // holiday (for getAvailable call)
        .mockResolvedValueOnce({ amount: 15000.00 }) // bonus (for getAvailable call)
        .mockResolvedValueOnce({ amount: 8000.00 }) // holiday (for summary call)
        .mockResolvedValueOnce({ amount: 15000.00 }); // bonus (for summary call)

      const result = await service.getEmployeeAllowanceSummary(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result.year).toBe(2025);
      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.holidayAllowance.cap).toBe(8000.00);
      expect(result.holidayAllowance.remaining).toBe(5000.00);
      expect(result.bonusAllowance.cap).toBe(15000.00);
      expect(result.bonusAllowance.remaining).toBe(10000.00);
    });

    it('should handle missing usage records', async () => {
      mockRepository.getEmployeeAllowanceUsage
        .mockResolvedValueOnce(null) // holiday
        .mockResolvedValueOnce(null); // bonus

      mockRepository.findActiveAllowanceByType
        .mockResolvedValueOnce({ amount: 8000.00 }) // holiday (for getAvailable call)
        .mockResolvedValueOnce({ amount: 15000.00 }) // bonus (for getAvailable call)
        .mockResolvedValueOnce({ amount: 8000.00 }) // holiday (for summary call)
        .mockResolvedValueOnce({ amount: 15000.00 }); // bonus (for summary call)

      const result = await service.getEmployeeAllowanceSummary(
        testEmployeeId,
        2025,
        testOrganizationId
      );

      expect(result.holidayAllowance.cap).toBe(8000.00);
      expect(result.holidayAllowance.used).toBe(0);
      expect(result.holidayAllowance.remaining).toBe(8000.00);
      expect(result.bonusAllowance.cap).toBe(15000.00);
      expect(result.bonusAllowance.used).toBe(0);
      expect(result.bonusAllowance.remaining).toBe(15000.00);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.getEmployeeAllowanceSummary(testEmployeeId, 2025, null)
      ).rejects.toThrow('organizationId is required');
    });
  });

  // ==================== RESET ALLOWANCE USAGE ====================

  describe('resetAllowanceUsage', () => {
    it('should reset allowance usage for employee', async () => {
      mockRepository.resetAllowanceUsage.mockResolvedValue(undefined);

      await service.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );

      expect(mockRepository.resetAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'holiday_allowance',
        2025,
        testOrganizationId
      );
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.resetAllowanceUsage(testEmployeeId, 'holiday_allowance', 2025, null)
      ).rejects.toThrow('organizationId is required');
    });

    it('should allow any allowance type (no validation)', async () => {
      mockRepository.resetAllowanceUsage.mockResolvedValue(undefined);

      // Should not throw - service does not validate allowance type
      await service.resetAllowanceUsage(testEmployeeId, 'custom_type', 2025, testOrganizationId);

      expect(mockRepository.resetAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'custom_type',
        2025,
        testOrganizationId
      );
    });
  });

  // ==================== CONSTRUCTOR & DEPENDENCY INJECTION ====================

  describe('constructor', () => {
    it('should create service without repository parameter', () => {
      const svc = new AllowanceService();
      expect(svc).toBeDefined();
      expect(svc.repository).toBeDefined();
    });

    it('should accept custom repository via DI', () => {
      const customRepository = { test: 'repo' };
      const svc = new AllowanceService(customRepository as any);
      expect(svc.repository).toBe(customRepository);
    });
  });
});
