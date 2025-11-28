/**
 * Bonus Tax Service Unit Tests
 * 
 * Tests for Article 17 (Bijzondere Beloning) bonus tax calculations
 * 
 * VERIFIED METHOD SIGNATURES (from source):
 * 1. async calculateBonusTax(params)
 * 2. async calculateMultipleBonusTax(bonuses, params)
 * 3. getLoontijdvakkenCountForBonusType(bonusType, loontijdvak) - synchronous helper
 * 
 * EXPORT PATTERN: ✅ Class export (supports DI)
 * DTO USAGE: ❌ No DTOs (returns calculated values)
 * VALIDATION: ✅ Uses Joi schemas
 * 
 * @see backend/src/products/paylinq/services/bonusTaxService.js
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import BonusTaxService from '../../../../src/products/paylinq/services/bonusTaxService.js';
import { ValidationError } from '../../../../src/utils/errors.js';

describe('BonusTaxService', () => {
  let service;
  let mockTaxCalculationService;
  let mockLoontijdvakService;

  // Test constants (valid UUIDs)
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';

  // Helper to create valid bonus tax params
  const createValidBonusParams = (overrides = {}) => ({
    bonusAmount: 15000,
    regularWage: 5000,
    loontijdvakkenCount: 3,
    loontijdvak: 'monthly',
    taxYear: 2025,
    organizationId: testOrgId,
    isResident: true,
    ...overrides
  });

  beforeEach(() => {
    // Mock TaxCalculationService
    mockTaxCalculationService = {
      calculateWageTax: jest.fn()
    };

    // Mock LoontijdvakService
    mockLoontijdvakService = {
      getPeriodsPerYear: jest.fn()
    };

    // Inject mocks
    service = new BonusTaxService(mockTaxCalculationService, mockLoontijdvakService);
  });

  describe('calculateBonusTax', () => {
    describe('Article 17 Formula - Correct Implementation', () => {
      it('should calculate bonus tax using Article 17 formula', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 15000,
          regularWage: 5000,
          loontijdvakkenCount: 3 // Quarterly bonus covering 3 months
        });

        // Mock tax calculations
        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1250) // Tax on combined wage (10000)
          .mockResolvedValueOnce(500);  // Tax on regular wage (5000)

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert - Formula verification
        // Step 1: bonusPerPeriod = 15000 / 3 = 5000
        expect(result.breakdown.bonusPerPeriod).toBe(5000);

        // Step 2: combinedWage = 5000 + 5000 = 10000
        expect(result.breakdown.combinedWage).toBe(10000);

        // Step 3 & 4: Tax calculations
        expect(result.breakdown.taxOnCombined).toBe(1250);
        expect(result.breakdown.taxOnRegular).toBe(500);

        // Step 5: taxDifferencePerPeriod = 1250 - 500 = 750
        expect(result.breakdown.taxDifferencePerPeriod).toBe(750);

        // Step 6: totalBonusTax = 750 × 3 = 2250
        expect(result.totalBonusTax).toBe(2250);

        // Effective rate = 2250 / 15000 = 0.15 (15%)
        expect(result.breakdown.effectiveRate).toBe(0.15);
      });

      it('should call calculateWageTax with correct parameters', async () => {
        // Arrange
        const params = createValidBonusParams();

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1000)
          .mockResolvedValueOnce(400);

        // Act
        await service.calculateBonusTax(params);

        // Assert - First call (combined wage)
        expect(mockTaxCalculationService.calculateWageTax).toHaveBeenNthCalledWith(1, {
          taxableIncome: 10000, // regularWage (5000) + bonusPerPeriod (5000)
          loontijdvak: 'monthly',
          taxYear: 2025,
          organizationId: testOrgId,
          isResident: true
        });

        // Assert - Second call (regular wage only)
        expect(mockTaxCalculationService.calculateWageTax).toHaveBeenNthCalledWith(2, {
          taxableIncome: 5000, // regularWage only
          loontijdvak: 'monthly',
          taxYear: 2025,
          organizationId: testOrgId,
          isResident: true
        });
      });

      it('should include Article 17 method in breakdown', async () => {
        // Arrange
        const params = createValidBonusParams();

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1000)
          .mockResolvedValueOnce(500);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.breakdown.method).toBe('Article 17 - Bijzondere Beloning');
      });
    });

    describe('Different Bonus Scenarios', () => {
      it('should calculate monthly bonus (1 period)', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 5000,
          regularWage: 5000,
          loontijdvakkenCount: 1 // Monthly bonus
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1250) // Tax on combined (10000)
          .mockResolvedValueOnce(500);  // Tax on regular (5000)

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.breakdown.bonusPerPeriod).toBe(5000);
        expect(result.breakdown.combinedWage).toBe(10000);
        expect(result.totalBonusTax).toBe(750); // (1250 - 500) × 1
      });

      it('should calculate annual bonus (12 periods)', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 60000,
          regularWage: 5000,
          loontijdvakkenCount: 12 // 13th month / annual bonus
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1250) // Tax on combined (10000)
          .mockResolvedValueOnce(500);  // Tax on regular (5000)

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.breakdown.bonusPerPeriod).toBe(5000); // 60000 / 12
        expect(result.breakdown.combinedWage).toBe(10000);
        expect(result.totalBonusTax).toBe(9000); // (1250 - 500) × 12
      });

      it('should calculate semi-annual bonus (6 periods)', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 30000,
          regularWage: 5000,
          loontijdvakkenCount: 6
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1250)
          .mockResolvedValueOnce(500);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.breakdown.bonusPerPeriod).toBe(5000); // 30000 / 6
        expect(result.totalBonusTax).toBe(4500); // (1250 - 500) × 6
      });

      it('should handle weekly pay periods', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 26000,
          regularWage: 1000,
          loontijdvakkenCount: 52, // Annual bonus for weekly paid employee
          loontijdvak: 'weekly'
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(150) // Tax on combined (1500)
          .mockResolvedValueOnce(100); // Tax on regular (1000)

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.breakdown.bonusPerPeriod).toBe(500); // 26000 / 52
        expect(result.breakdown.combinedWage).toBe(1500);
        expect(result.totalBonusTax).toBe(2600); // (150 - 100) × 52
      });
    });

    describe('Edge Cases & Rounding', () => {
      it('should handle zero bonus amount', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 0,
          regularWage: 5000,
          loontijdvakkenCount: 1
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(500)
          .mockResolvedValueOnce(500);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        expect(result.totalBonusTax).toBe(0);
        expect(result.breakdown.effectiveRate).toBe(0);
      });

      it('should round all monetary values to 2 decimal places', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 10000,
          regularWage: 3333.33,
          loontijdvakkenCount: 3
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1111.11)
          .mockResolvedValueOnce(555.55);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert - All values should have max 2 decimal places
        expect(result.totalBonusTax).toBe(1666.68); // (1111.11 - 555.55) × 3
        expect(result.breakdown.bonusPerPeriod).toBe(3333.33);
        expect(result.breakdown.combinedWage).toBe(6666.66);
        expect(result.breakdown.taxDifferencePerPeriod).toBe(555.56);
      });

      it('should round effective rate to 4 decimal places', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: 7777.77,
          regularWage: 5000,
          loontijdvakkenCount: 3
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1234.56)
          .mockResolvedValueOnce(789.01);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert
        const expectedTax = (1234.56 - 789.01) * 3;
        const expectedRate = expectedTax / 7777.77;
        expect(result.breakdown.effectiveRate).toBe(Math.round(expectedRate * 10000) / 10000);
      });

      it('should handle non-resident employees', async () => {
        // Arrange
        const params = createValidBonusParams({
          isResident: false
        });

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1500) // Non-resident rate
          .mockResolvedValueOnce(750);

        // Act
        const result = await service.calculateBonusTax(params);

        // Assert - Verify non-resident flag passed to tax calc
        expect(mockTaxCalculationService.calculateWageTax).toHaveBeenCalledWith(
          expect.objectContaining({ isResident: false })
        );
        expect(result.totalBonusTax).toBe(2250);
      });
    });

    describe('Validation', () => {
      it('should throw ValidationError for negative bonus amount', async () => {
        // Arrange
        const params = createValidBonusParams({
          bonusAmount: -1000
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"bonusAmount" must be greater than or equal to 0');
      });

      it('should throw ValidationError for negative regular wage', async () => {
        // Arrange
        const params = createValidBonusParams({
          regularWage: -500
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"regularWage" must be greater than or equal to 0');
      });

      it('should throw ValidationError for zero loontijdvakken count', async () => {
        // Arrange
        const params = createValidBonusParams({
          loontijdvakkenCount: 0
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('\"loontijdvakkenCount\" must be greater than or equal to 1');
      });

      it('should throw ValidationError for loontijdvakken count > 52', async () => {
        // Arrange
        const params = createValidBonusParams({
          loontijdvakkenCount: 53
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"loontijdvakkenCount" must be less than or equal to 52');
      });

      it('should throw ValidationError for invalid loontijdvak type', async () => {
        // Arrange
        const params = createValidBonusParams({
          loontijdvak: 'invalid'
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"loontijdvak" must be one of [daily, weekly, monthly, yearly]');
      });

      it('should validate loontijdvak enum values', async () => {
        // Valid values: daily, weekly, monthly, yearly
        const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];

        for (const loontijdvak of validTypes) {
          const params = createValidBonusParams({ loontijdvak });

          mockTaxCalculationService.calculateWageTax
            .mockResolvedValueOnce(1000)
            .mockResolvedValueOnce(500);

          await expect(service.calculateBonusTax(params))
            .resolves.toBeDefined();
        }
      });

      it('should throw ValidationError for tax year < 2020', async () => {
        // Arrange
        const params = createValidBonusParams({
          taxYear: 2019
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"taxYear" must be greater than or equal to 2020');
      });

      it('should throw ValidationError for tax year > 2100', async () => {
        // Arrange
        const params = createValidBonusParams({
          taxYear: 2101
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"taxYear" must be less than or equal to 2100');
      });

      it('should throw ValidationError for invalid UUID', async () => {
        // Arrange
        const params = createValidBonusParams({
          organizationId: 'not-a-uuid'
        });

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('"organizationId" must be a valid GUID');
      });

      it('should require all mandatory fields', async () => {
        // Test missing each required field
        const requiredFields = [
          'bonusAmount',
          'regularWage',
          'loontijdvakkenCount',
          'loontijdvak',
          'taxYear',
          'organizationId'
        ];

        for (const field of requiredFields) {
          const params = createValidBonusParams();
          delete params[field];

          await expect(service.calculateBonusTax(params))
            .rejects.toThrow('is required');
        }
      });

      it('should default isResident to true when not provided', async () => {
        // Arrange
        const params = createValidBonusParams();
        delete params.isResident;

        mockTaxCalculationService.calculateWageTax
          .mockResolvedValueOnce(1000)
          .mockResolvedValueOnce(500);

        // Act
        await service.calculateBonusTax(params);

        // Assert - Should use default true
        expect(mockTaxCalculationService.calculateWageTax).toHaveBeenCalledWith(
          expect.objectContaining({ isResident: true })
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw error when TaxCalculationService not injected', async () => {
        // Arrange
        const serviceWithoutDeps = new BonusTaxService(null, mockLoontijdvakService);
        const params = createValidBonusParams();

        // Act & Assert
        await expect(serviceWithoutDeps.calculateBonusTax(params))
          .rejects.toThrow('TaxCalculationService must be injected');
      });

      it('should propagate tax calculation errors', async () => {
        // Arrange
        const params = createValidBonusParams();
        const taxError = new Error('Tax bracket not found');

        mockTaxCalculationService.calculateWageTax
          .mockRejectedValueOnce(taxError);

        // Act & Assert
        await expect(service.calculateBonusTax(params))
          .rejects.toThrow('Tax bracket not found');
      });
    });
  });

  describe('getLoontijdvakkenCountForBonusType', () => {
    beforeEach(() => {
      // Mock periods per year for different loontijdvak types
      mockLoontijdvakService.getPeriodsPerYear.mockImplementation((loontijdvak) => {
        const periods = {
          'daily': 260,
          'weekly': 52,
          'monthly': 12,
          'yearly': 1
        };
        return periods[loontijdvak] || 12;
      });
    });

    describe('Monthly Pay Periods', () => {
      it('should return 1 for spot bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('spot_bonus', 'monthly');
        expect(count).toBe(1);
      });

      it('should return 1 for performance bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('performance_bonus', 'monthly');
        expect(count).toBe(1);
      });

      it('should return 1 for monthly bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('monthly_bonus', 'monthly');
        expect(count).toBe(1);
      });

      it('should return 3 for quarterly bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('quarterly_bonus', 'monthly');
        expect(count).toBe(3); // 12 / 4 = 3
      });

      it('should return 6 for semi-annual bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('semi_annual_bonus', 'monthly');
        expect(count).toBe(6); // 12 / 2 = 6
      });

      it('should return 12 for annual bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('annual_bonus', 'monthly');
        expect(count).toBe(12);
      });

      it('should return 12 for 13th month', () => {
        const count = service.getLoontijdvakkenCountForBonusType('13th_month', 'monthly');
        expect(count).toBe(12);
      });

      it('should return 1 for holiday allowance (defaults to spot bonus)', () => {
        // holiday_allowance not in bonusTypeMap, so defaults to 1
        const count = service.getLoontijdvakkenCountForBonusType('holiday_allowance', 'monthly');
        expect(count).toBe(1);
      });
    });

    describe('Weekly Pay Periods', () => {
      it('should return 13 for quarterly bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('quarterly_bonus', 'weekly');
        expect(count).toBe(13); // 52 / 4 = 13
      });

      it('should return 26 for semi-annual bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('semi_annual_bonus', 'weekly');
        expect(count).toBe(26); // 52 / 2 = 26
      });

      it('should return 52 for annual bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('annual_bonus', 'weekly');
        expect(count).toBe(52);
      });
    });

    describe('Yearly Pay Period', () => {
      it('should return 1 for annual bonus', () => {
        const count = service.getLoontijdvakkenCountForBonusType('annual_bonus', 'yearly');
        expect(count).toBe(1);
      });
    });

    it('should call loontijdvakService.getPeriodsPerYear', () => {
      service.getLoontijdvakkenCountForBonusType('quarterly_bonus', 'monthly');
      expect(mockLoontijdvakService.getPeriodsPerYear).toHaveBeenCalledWith('monthly');
    });
  });
});
