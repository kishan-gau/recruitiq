/**
 * AllowanceService Unit Tests
 * 
 * Tests for tax-free allowance management and calculations.
 * Covers allowance cap enforcement, yearly usage tracking, and multi-tenant security.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards (docs/TESTING_STANDARDS.md)
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Dependency injection pattern
 * - Arrange-Act-Assert structure
 * - EXACT method names from service (verified against source)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AllowanceService from '../../../../src/products/paylinq/services/AllowanceService.js';
import { ValidationError } from '../../../../src/middleware/errorHandler.js';

describe('AllowanceService', () => {
  let service;
  let mockRepository;
  const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testEmployeeId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Setup: Create fresh mocks for each test
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

  // ==================== calculateTaxFreeAllowance ====================

  describe('calculateTaxFreeAllowance', () => {
    it('should calculate tax-free allowance for monthly period', async () => {
      // Arrange
      const grossPay = 15000;
      const payDate = new Date('2025-11-15');
      const payPeriod = 'monthly';

      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: 'allowance-id',
        amount: 9000.00,
        is_active: true
      });

      // Act
      const result = await service.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(9000.00); // Lesser of allowance (9000) and gross (15000)
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_monthly',
        payDate,
        testOrganizationId
      );
    });

    it('should calculate tax-free allowance for annual period', async () => {
      // Arrange
      const grossPay = 180000;
      const payDate = new Date('2025-11-15');
      const payPeriod = 'annual';

      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 108000.00
      });

      // Act
      const result = await service.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(108000.00);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_annual',
        payDate,
        testOrganizationId
      );
    });

    it('should cap tax-free amount at gross pay when allowance exceeds it', async () => {
      // Arrange
      const grossPay = 5000; // Less than allowance
      const payDate = new Date('2025-11-15');
      const payPeriod = 'monthly';

      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 9000.00 // Higher than gross
      });

      // Act
      const result = await service.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(5000); // Capped at gross pay
    });

    it('should return 0 when no allowance found for date', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      // Act
      const result = await service.calculateTaxFreeAllowance(
        15000,
        new Date('2025-11-15'),
        'monthly',
        testOrganizationId
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.calculateTaxFreeAllowance(15000, new Date(), 'monthly', null)
      ).rejects.toThrow(ValidationError);
      await expect(
        service.calculateTaxFreeAllowance(15000, new Date(), 'monthly', null)
      ).rejects.toThrow(/organizationId is required/);
    });

    it('should handle zero gross pay', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 9000.00
      });

      // Act
      const result = await service.calculateTaxFreeAllowance(
        0,
        new Date('2025-11-15'),
        'monthly',
        testOrganizationId
      );

      // Assert
      expect(result).toBe(0); // Lesser of allowance and zero
    });
  });

  // ==================== getAvailableHolidayAllowance ====================

  describe('getAvailableHolidayAllowance', () => {
    const year = 2025;

    it('should return available holiday allowance when no usage exists', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      // Act
      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(10016.00);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'holiday_allowance',
        expect.any(Date),
        testOrganizationId
      );
    });

    it('should return remaining allowance after partial usage', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue({
        amount_used: 5000.00
      });

      // Act
      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(5016.00); // 10016 - 5000
    });

    it('should return 0 when allowance fully used', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue({
        amount_used: 10016.00
      });

      // Act
      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when no holiday allowance cap exists', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      // Act
      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.getAvailableHolidayAllowance(testEmployeeId, year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== applyHolidayAllowance ====================

  describe('applyHolidayAllowance', () => {
    const year = 2025;

    it('should apply holiday allowance and record usage', async () => {
      // Arrange
      const paymentAmount = 5000.00;
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      mockRepository.recordAllowanceUsage.mockResolvedValue(true);

      // Act
      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        paymentAmount,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.appliedAmount).toBe(5000.00);
      expect(result.remainingForYear).toBe(5016.00); // 10016 - 5000
      expect(result.taxableAmount).toBe(0); // 5000 - 5000
      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'holiday_allowance',
        5000.00,
        year,
        testOrganizationId
      );
    });

    it('should apply partial allowance when payment exceeds available', async () => {
      // Arrange
      const paymentAmount = 12000.00;
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      mockRepository.recordAllowanceUsage.mockResolvedValue(true);

      // Act
      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        paymentAmount,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.appliedAmount).toBe(10016.00); // Capped at available
      expect(result.remainingForYear).toBe(0);
      expect(result.taxableAmount).toBe(1984.00); // 12000 - 10016
    });

    it('should not record usage when no allowance available', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      // Act
      const result = await service.applyHolidayAllowance(
        testEmployeeId,
        5000.00,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.appliedAmount).toBe(0);
      expect(result.taxableAmount).toBe(5000.00);
      expect(mockRepository.recordAllowanceUsage).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.applyHolidayAllowance(testEmployeeId, 5000, year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== getAvailableBonusAllowance ====================

  describe('getAvailableBonusAllowance', () => {
    const year = 2025;

    it('should return available bonus/gratuity allowance', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 8346.67
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      // Act
      const result = await service.getAvailableBonusAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(8346.67);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'bonus_gratuity',
        expect.any(Date),
        testOrganizationId
      );
    });

    it('should return remaining bonus allowance after usage', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 8346.67
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue({
        amount_used: 3000.00
      });

      // Act
      const result = await service.getAvailableBonusAllowance(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result).toBe(5346.67); // 8346.67 - 3000
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.getAvailableBonusAllowance(testEmployeeId, year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== applyBonusAllowance ====================

  describe('applyBonusAllowance', () => {
    const year = 2025;

    it('should apply bonus allowance and record usage', async () => {
      // Arrange
      const paymentAmount = 4000.00;
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 8346.67
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);
      mockRepository.recordAllowanceUsage.mockResolvedValue(true);

      // Act
      const result = await service.applyBonusAllowance(
        testEmployeeId,
        paymentAmount,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.appliedAmount).toBe(4000.00);
      expect(result.remainingForYear).toBe(4346.67); // 8346.67 - 4000
      expect(result.taxableAmount).toBe(0);
      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'bonus_gratuity',
        4000.00,
        year,
        testOrganizationId
      );
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.applyBonusAllowance(testEmployeeId, 4000, year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== getAllAllowances ====================

  describe('getAllAllowances', () => {
    it('should return all allowances for organization', async () => {
      // Arrange
      const mockAllowances = [
        {
          id: 'allowance-1',
          allowance_type: 'holiday_allowance',
          amount: 10016.00
        },
        {
          id: 'allowance-2',
          allowance_type: 'bonus_gratuity',
          amount: 8346.67
        }
      ];

      mockRepository.getAllAllowances.mockResolvedValue(mockAllowances);

      // Act
      const result = await service.getAllAllowances(testOrganizationId);

      // Assert
      expect(result).toEqual(mockAllowances);
      expect(mockRepository.getAllAllowances).toHaveBeenCalledWith(testOrganizationId);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.getAllAllowances(null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== getEmployeeAllowanceSummary ====================

  describe('getEmployeeAllowanceSummary', () => {
    const year = 2025;

    it('should return complete allowance summary for employee', async () => {
      // Arrange
      // Method calls getAvailableHolidayAllowance and getAvailableBonusAllowance internally
      // which each call findActiveAllowanceByType and getEmployeeAllowanceUsage
      mockRepository.findActiveAllowanceByType
        .mockResolvedValueOnce({ amount: 10016.00 }) // getAvailableHolidayAllowance call
        .mockResolvedValueOnce({ amount: 8346.67 })  // getAvailableBonusAllowance call
        .mockResolvedValueOnce({ amount: 10016.00 }) // Summary's own holiday call
        .mockResolvedValueOnce({ amount: 8346.67 }); // Summary's own bonus call
      
      mockRepository.getEmployeeAllowanceUsage
        .mockResolvedValueOnce({ amount_used: 3000.00 }) // Holiday usage
        .mockResolvedValueOnce({ amount_used: 2000.00 }); // Bonus usage

      // Act
      const result = await service.getEmployeeAllowanceSummary(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.year).toBe(year);
      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.organizationId).toBe(testOrganizationId);
      
      expect(result.holidayAllowance.cap).toBe(10016.00);
      expect(result.holidayAllowance.used).toBe(3000.00);
      expect(result.holidayAllowance.remaining).toBe(7016.00);
      expect(parseFloat(result.holidayAllowance.percentUsed)).toBeCloseTo(29.95, 1);
      
      expect(result.bonusAllowance.cap).toBe(8346.67);
      expect(result.bonusAllowance.used).toBe(2000.00);
      expect(result.bonusAllowance.remaining).toBe(6346.67);
    });

    it('should handle zero caps when no allowances exist', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      // Act
      const result = await service.getEmployeeAllowanceSummary(
        testEmployeeId,
        year,
        testOrganizationId
      );

      // Assert
      expect(result.holidayAllowance.cap).toBe(0);
      expect(result.bonusAllowance.cap).toBe(0);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.getEmployeeAllowanceSummary(testEmployeeId, year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== resetAllowanceUsage ====================

  describe('resetAllowanceUsage', () => {
    const year = 2025;

    it('should reset allowance usage for employee', async () => {
      // Arrange
      mockRepository.resetAllowanceUsage.mockResolvedValue(true);

      // Act
      await service.resetAllowanceUsage(
        testEmployeeId,
        'holiday_allowance',
        year,
        testOrganizationId
      );

      // Assert
      expect(mockRepository.resetAllowanceUsage).toHaveBeenCalledWith(
        testEmployeeId,
        'holiday_allowance',
        year,
        testOrganizationId
      );
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      // Act & Assert
      await expect(
        service.resetAllowanceUsage(testEmployeeId, 'holiday_allowance', year, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockRepository.getAllAllowances.mockRejectedValue(
        new Error('Database connection error')
      );

      // Act & Assert
      await expect(
        service.getAllAllowances(testOrganizationId)
      ).rejects.toThrow('Database connection error');
    });

    it('should handle future years in getAvailableHolidayAllowance', async () => {
      // Arrange
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        amount: 10016.00
      });
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      // Act
      const result = await service.getAvailableHolidayAllowance(
        testEmployeeId,
        2026, // Future year
        testOrganizationId
      );

      // Assert
      expect(result).toBe(10016.00);
    });
  });
});
