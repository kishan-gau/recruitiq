/**
 * AllowanceService Tests
 * 
 * Tests for tax-free allowance calculations and usage tracking.
 * Phase 1: Foundation - Tax Compliance
 */

import { jest } from '@jest/globals';
import AllowanceService from '../../../../src/products/paylinq/services/AllowanceService.js';
import AllowanceRepository from '../../../../src/products/paylinq/repositories/AllowanceRepository.js';
import { ValidationError } from '../../../../src/middleware/errorHandler.js';

// Mock the repository
jest.mock('../../../../src/products/paylinq/repositories/AllowanceRepository.js');

describe('AllowanceService', () => {
  let allowanceService;
  let mockRepository;

  const organizationId = '550e8400-e29b-41d4-a716-446655440000';
  const employeeId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository instance
    mockRepository = {
      findActiveAllowanceByType: jest.fn(),
      getEmployeeAllowanceUsage: jest.fn(),
      recordAllowanceUsage: jest.fn(),
      getAllAllowances: jest.fn(),
      resetAllowanceUsage: jest.fn()
    };

    // Mock the constructor to return our mock
    AllowanceRepository.mockImplementation(() => mockRepository);

    allowanceService = new AllowanceService();
  });

  describe('calculateTaxFreeAllowance', () => {
    it('should calculate tax-free allowance for monthly payroll', async () => {
      // Mock: SRD 9,000 monthly allowance
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: '1',
        allowance_type: 'tax_free_sum_monthly',
        amount: 9000,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true
      });

      const grossPay = 12000;
      const payDate = new Date('2025-11-15');
      const payPeriod = 'monthly';

      const result = await allowanceService.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Should return the lesser of allowance (9,000) or grossPay (12,000)
      expect(result).toBe(9000);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'tax_free_sum_monthly',
        payDate,
        organizationId
      );
    });

    it('should return full gross pay if below allowance threshold', async () => {
      // Mock: SRD 9,000 monthly allowance
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: '1',
        allowance_type: 'tax_free_sum_monthly',
        amount: 9000,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true
      });

      const grossPay = 8000; // Below SRD 9,000
      const payDate = new Date('2025-11-15');
      const payPeriod = 'monthly';

      const result = await allowanceService.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Should return full gross pay since it's less than allowance
      expect(result).toBe(8000);
    });

    it('should return 0 if no allowance found', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      const grossPay = 12000;
      const payDate = new Date('2025-11-15');
      const payPeriod = 'monthly';

      const result = await allowanceService.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      expect(result).toBe(0);
    });

    it('should throw ValidationError if organizationId missing', async () => {
      await expect(
        allowanceService.calculateTaxFreeAllowance(12000, new Date(), 'monthly', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getAvailableHolidayAllowance', () => {
    it('should calculate available allowance with no prior usage', async () => {
      // Mock: SRD 10,016 holiday allowance cap
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: '2',
        allowance_type: 'holiday_allowance',
        amount: 10016,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true
      });

      // Mock: No usage record found
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue(null);

      const year = 2025;
      const result = await allowanceService.getAvailableHolidayAllowance(
        employeeId,
        year,
        organizationId
      );

      // Should return full cap since no usage
      expect(result).toBe(10016);
      expect(mockRepository.findActiveAllowanceByType).toHaveBeenCalledWith(
        'holiday_allowance',
        new Date(year, 0, 1),
        organizationId
      );
    });

    it('should calculate available allowance with partial usage', async () => {
      // Mock: SRD 10,016 holiday allowance cap
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: '2',
        allowance_type: 'holiday_allowance',
        amount: 10016,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true
      });

      // Mock: Already used SRD 5,000
      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue({
        employee_id: employeeId,
        allowance_type: 'holiday_allowance',
        calendar_year: 2025,
        amount_used: 5000
      });

      const year = 2025;
      const result = await allowanceService.getAvailableHolidayAllowance(
        employeeId,
        year,
        organizationId
      );

      // Should return remaining: 10,016 - 5,000 = 5,016
      expect(result).toBe(5016);
    });

    it('should return 0 if allowance fully used', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue({
        id: '2',
        allowance_type: 'holiday_allowance',
        amount: 10016,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true
      });

      mockRepository.getEmployeeAllowanceUsage.mockResolvedValue({
        employee_id: employeeId,
        allowance_type: 'holiday_allowance',
        calendar_year: 2025,
        amount_used: 10016 // Fully used
      });

      const year = 2025;
      const result = await allowanceService.getAvailableHolidayAllowance(
        employeeId,
        year,
        organizationId
      );

      expect(result).toBe(0);
    });

    it('should return 0 if no allowance configured', async () => {
      mockRepository.findActiveAllowanceByType.mockResolvedValue(null);

      const year = 2025;
      const result = await allowanceService.getAvailableHolidayAllowance(
        employeeId,
        year,
        organizationId
      );

      expect(result).toBe(0);
    });
  });

  describe('applyHolidayAllowance', () => {
    it('should apply full payment if within available allowance', async () => {
      // Available: SRD 10,016
      jest.spyOn(allowanceService, 'getAvailableHolidayAllowance')
        .mockResolvedValue(10016);

      mockRepository.recordAllowanceUsage.mockResolvedValue({
        employee_id: employeeId,
        allowance_type: 'holiday_allowance',
        calendar_year: 2025,
        amount_used: 7000 // After this payment
      });

      const paymentAmount = 7000;
      const year = 2025;

      const result = await allowanceService.applyHolidayAllowance(
        employeeId,
        paymentAmount,
        year,
        organizationId
      );

      expect(result).toEqual({
        appliedAmount: 7000,
        remainingForYear: 3016, // 10,016 - 7,000
        taxableAmount: 0 // Fully tax-free
      });

      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        employeeId,
        'holiday_allowance',
        7000,
        year,
        organizationId
      );
    });

    it('should apply partial payment if exceeds available allowance', async () => {
      // Available: SRD 3,000 remaining
      jest.spyOn(allowanceService, 'getAvailableHolidayAllowance')
        .mockResolvedValue(3000);

      mockRepository.recordAllowanceUsage.mockResolvedValue({
        employee_id: employeeId,
        allowance_type: 'holiday_allowance',
        calendar_year: 2025,
        amount_used: 10016 // Cap reached after this payment
      });

      const paymentAmount = 8000;
      const year = 2025;

      const result = await allowanceService.applyHolidayAllowance(
        employeeId,
        paymentAmount,
        year,
        organizationId
      );

      expect(result).toEqual({
        appliedAmount: 3000,  // Only SRD 3,000 can be tax-free
        remainingForYear: 0,  // Cap reached
        taxableAmount: 5000   // SRD 5,000 is taxable
      });

      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        employeeId,
        'holiday_allowance',
        3000, // Only apply what's available
        year,
        organizationId
      );
    });

    it('should not record usage if allowance exhausted', async () => {
      // Available: SRD 0
      jest.spyOn(allowanceService, 'getAvailableHolidayAllowance')
        .mockResolvedValue(0);

      const paymentAmount = 5000;
      const year = 2025;

      const result = await allowanceService.applyHolidayAllowance(
        employeeId,
        paymentAmount,
        year,
        organizationId
      );

      expect(result).toEqual({
        appliedAmount: 0,
        remainingForYear: 0,
        taxableAmount: 5000 // Fully taxable
      });

      // Should not record usage when amount is 0
      expect(mockRepository.recordAllowanceUsage).not.toHaveBeenCalled();
    });
  });

  describe('applyBonusAllowance', () => {
    it('should apply bonus allowance correctly', async () => {
      // Mock: SRD 10,016 bonus allowance available
      jest.spyOn(allowanceService, 'getAvailableBonusAllowance')
        .mockResolvedValue(10016);

      mockRepository.recordAllowanceUsage.mockResolvedValue({
        employee_id: employeeId,
        allowance_type: 'bonus_gratuity',
        calendar_year: 2025,
        amount_used: 5000
      });

      const paymentAmount = 5000;
      const year = 2025;

      const result = await allowanceService.applyBonusAllowance(
        employeeId,
        paymentAmount,
        year,
        organizationId
      );

      expect(result).toEqual({
        appliedAmount: 5000,
        remainingForYear: 5016, // 10,016 - 5,000
        taxableAmount: 0
      });

      expect(mockRepository.recordAllowanceUsage).toHaveBeenCalledWith(
        employeeId,
        'bonus_gratuity',
        5000,
        year,
        organizationId
      );
    });
  });

  describe('getEmployeeAllowanceSummary', () => {
    it('should return comprehensive allowance usage summary', async () => {
      // Mock holiday allowance
      jest.spyOn(allowanceService, 'getAvailableHolidayAllowance')
        .mockResolvedValue(5000); // SRD 5,000 remaining

      // Mock bonus allowance
      jest.spyOn(allowanceService, 'getAvailableBonusAllowance')
        .mockResolvedValue(8000); // SRD 8,000 remaining

      // Mock allowance caps
      mockRepository.findActiveAllowanceByType
        .mockResolvedValueOnce({
          amount: 10016,
          allowance_type: 'holiday_allowance'
        })
        .mockResolvedValueOnce({
          amount: 10016,
          allowance_type: 'bonus_gratuity'
        });

      const year = 2025;

      const result = await allowanceService.getEmployeeAllowanceSummary(
        employeeId,
        year,
        organizationId
      );

      expect(result).toEqual({
        year: 2025,
        employeeId,
        organizationId,
        holidayAllowance: {
          cap: 10016,
          used: 5016, // 10,016 - 5,000
          remaining: 5000,
          percentUsed: '50.08' // (5016/10016)*100
        },
        bonusAllowance: {
          cap: 10016,
          used: 2016, // 10,016 - 8,000
          remaining: 8000,
          percentUsed: '20.13' // (2016/10016)*100
        }
      });
    });
  });

  describe('Security: organizationId validation', () => {
    it('should throw ValidationError for all methods if organizationId missing', async () => {
      await expect(
        allowanceService.calculateTaxFreeAllowance(12000, new Date(), 'monthly', null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.getAvailableHolidayAllowance(employeeId, 2025, null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.applyHolidayAllowance(employeeId, 5000, 2025, null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.getAvailableBonusAllowance(employeeId, 2025, null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.applyBonusAllowance(employeeId, 5000, 2025, null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.getAllAllowances(null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.getEmployeeAllowanceSummary(employeeId, 2025, null)
      ).rejects.toThrow(ValidationError);

      await expect(
        allowanceService.resetAllowanceUsage(employeeId, 'holiday_allowance', 2025, null)
      ).rejects.toThrow(ValidationError);
    });
  });
});
