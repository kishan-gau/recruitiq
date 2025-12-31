/**
 * Bonus Tax Service (Bijzondere Beloning)
 * 
 * Implements special bonus tax calculation per Wet Loonbelasting Article 17
 * 
 * CRITICAL COMPLIANCE:
 * Article 17 requires bonuses to be taxed differently from regular wages.
 * The tax calculation uses a special formula that considers the number
 * of pay periods covered by the bonus.
 * 
 * Key Concepts:
 * - Bijzondere beloning = Special remuneration (bonus, gratuity, 13th month)
 * - Must be taxed separately using Article 17 method
 * - Requires tracking loontijdvakken (pay periods) covered
 * - Different from regular wage tax calculation
 * 
 * Article 17.2 Formula:
 * 1. Divide bonus by number of periods it covers → bonus per period
 * 2. Add bonus per period to regular wage → combined wage
 * 3. Calculate tax on combined wage
 * 4. Calculate tax on regular wage only
 * 5. Difference × number of periods = total bonus tax
 * 
 * @module products/paylinq/services/BonusTaxService
 */

import Joi from 'joi';
import { ValidationError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';
import LoontijdvakService from './loontijdvakService.js';

/**
 * Bonus Tax Service
 * 
 * Handles bijzondere beloning (special bonus) tax calculations
 */
class BonusTaxService {
  /**
   * Creates instance with optional dependency injection
   * 
   * @param {Object} taxCalculationService - Tax calculation service
   * @param {Object} loontijdvakService - Loontijdvak service
   */
  
  loontijdvakService: any;

  taxCalculationService: any;

constructor(taxCalculationService = null, loontijdvakService = null) {
    this.taxCalculationService = taxCalculationService;
    this.loontijdvakService = loontijdvakService || new LoontijdvakService();
  }

  /**
   * Validation schema for bonus tax calculation
   */
  static get calculateBonusTaxSchema() {
    return Joi.object({
      bonusAmount: Joi.number().min(0).required(),
      regularWage: Joi.number().min(0).required(),
      loontijdvakkenCount: Joi.number().integer().min(1).max(52).required(),
      loontijdvak: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'yearly')
        .required(),
      taxYear: Joi.number().integer().min(2020).max(2100).required(),
      organizationId: Joi.string().uuid().required(),
      isResident: Joi.boolean().default(true)
    });
  }

  /**
   * Calculates tax on bijzondere beloning per Article 17
   * 
   * FORMULA (Article 17.2):
   * 1. bonus_per_period = bonus_amount / loontijdvakken_count
   * 2. combined_wage = regular_wage + bonus_per_period
   * 3. tax_on_combined = calculateWageTax(combined_wage)
   * 4. tax_on_regular = calculateWageTax(regular_wage)
   * 5. tax_difference = tax_on_combined - tax_on_regular
   * 6. total_bonus_tax = tax_difference × loontijdvakken_count
   * 
   * @param {Object} params - Calculation parameters
   * @param {number} params.bonusAmount - Total bonus amount
   * @param {number} params.regularWage - Regular wage per period
   * @param {number} params.loontijdvakkenCount - Number of pay periods covered by bonus
   * @param {string} params.loontijdvak - Pay period type (monthly, yearly, etc.)
   * @param {number} params.taxYear - Tax year for bracket selection
   * @param {string} params.organizationId - Organization UUID
   * @param {boolean} params.isResident - Whether employee is Suriname resident
   * @returns {Promise<Object>} Bonus tax calculation result
   * @returns {number} .totalBonusTax - Total tax on bonus
   * @returns {Object} .breakdown - Detailed calculation breakdown
   * @throws {ValidationError} If parameters are invalid
   * 
   * @example
   * // Quarterly bonus: SRD 15,000 bonus, SRD 5,000 monthly wage
   * calculateBonusTax({
   *   bonusAmount: 15000,
   *   regularWage: 5000,
   *   loontijdvakkenCount: 3,  // 3 months covered
   *   loontijdvak: 'monthly',
   *   taxYear: 2025,
   *   organizationId: 'org-uuid',
   *   isResident: true
   * })
   * // Returns:
   * // {
   * //   totalBonusTax: 2250,
   * //   breakdown: {
   * //     bonusAmount: 15000,
   * //     bonusPerPeriod: 5000,
   * //     regularWage: 5000,
   * //     combinedWage: 10000,
   * //     taxOnCombined: 1250,
   * //     taxOnRegular: 500,
   * //     taxDifferencePerPeriod: 750,
   * //     loontijdvakkenCount: 3,
   * //     totalBonusTax: 2250,
   * //     effectiveRate: 0.15
   * //   }
   * // }
   */
  async calculateBonusTax(params) {
    // Validate input
    const validated = await BonusTaxService.calculateBonusTaxSchema.validateAsync(params);

    const {
      bonusAmount,
      regularWage,
      loontijdvakkenCount,
      loontijdvak,
      taxYear,
      organizationId,
      isResident
    } = validated;

    try {
      // Step 1: Calculate bonus per period (Article 17.2e)
      const bonusPerPeriod = bonusAmount / loontijdvakkenCount;

      // Step 2: Calculate combined wage
      const combinedWage = regularWage + bonusPerPeriod;

      // Step 3: Calculate tax on combined wage
      // Note: This requires the TaxCalculationService to be injected
      if (!this.taxCalculationService) {
        throw new Error(
          'TaxCalculationService must be injected to calculate bonus tax'
        );
      }

      const taxOnCombined = await this.taxCalculationService.calculateWageTax({
        taxableIncome: combinedWage,
        loontijdvak,
        taxYear,
        organizationId,
        isResident
      });

      // Step 4: Calculate tax on regular wage only
      const taxOnRegular = await this.taxCalculationService.calculateWageTax({
        taxableIncome: regularWage,
        loontijdvak,
        taxYear,
        organizationId,
        isResident
      });

      // Step 5: Calculate tax difference per period
      const taxDifferencePerPeriod = taxOnCombined - taxOnRegular;

      // Step 6: Calculate total bonus tax
      const totalBonusTax = taxDifferencePerPeriod * loontijdvakkenCount;

      // Calculate effective tax rate on bonus
      const effectiveRate = bonusAmount > 0 
        ? totalBonusTax / bonusAmount 
        : 0;

      const result = {
        totalBonusTax: Math.round(totalBonusTax * 100) / 100,
        breakdown: {
          bonusAmount,
          bonusPerPeriod: Math.round(bonusPerPeriod * 100) / 100,
          regularWage,
          combinedWage: Math.round(combinedWage * 100) / 100,
          taxOnCombined: Math.round(taxOnCombined * 100) / 100,
          taxOnRegular: Math.round(taxOnRegular * 100) / 100,
          taxDifferencePerPeriod: Math.round(taxDifferencePerPeriod * 100) / 100,
          loontijdvakkenCount,
          totalBonusTax: Math.round(totalBonusTax * 100) / 100,
          effectiveRate: Math.round(effectiveRate * 10000) / 10000,
          method: 'Article 17 - Bijzondere Beloning'
        }
      };

      logger.info('Bonus tax calculated per Article 17', {
        bonusAmount,
        loontijdvakkenCount,
        totalBonusTax: result.totalBonusTax,
        effectiveRate: result.breakdown.effectiveRate,
        organizationId
      });

      return result;

    } catch (_error) {
      logger.error('Bonus tax calculation failed', {
        error: error.message,
        params: validated,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Determines number of loontijdvakken for common bonus types
   * 
   * Helps determine the correct loontijdvakkenCount for different bonus scenarios.
   * Per Article 17.2, the count must reflect the period the bonus covers.
   * 
   * @param {string} bonusType - Type of bonus
   * @param {string} loontijdvak - Pay period type
   * @returns {number} Number of loontijdvakken
   * 
   * Common bonus types:
   * - 'monthly_bonus': 1 period
   * - 'quarterly_bonus': 3 periods (monthly) or 13 periods (weekly)
   * - 'semi_annual_bonus': 6 periods (monthly) or 26 periods (weekly)
   * - 'annual_bonus' / '13th_month': 12 periods (monthly) or 52 periods (weekly)
   * 
   * @example
   * getLoontijdvakkenCountForBonusType('quarterly_bonus', 'monthly') // Returns 3
   * getLoontijdvakkenCountForBonusType('annual_bonus', 'weekly')     // Returns 52
   * getLoontijdvakkenCountForBonusType('13th_month', 'monthly')      // Returns 12
   */
  getLoontijdvakkenCountForBonusType(bonusType, loontijdvak) {
    // Validate loontijdvak
    const periodsPerYear = this.loontijdvakService.getPeriodsPerYear(loontijdvak);

    const bonusTypeMap = {
      // One-time bonuses
      'spot_bonus': 1,
      'performance_bonus': 1,
      'monthly_bonus': 1,

      // Quarterly bonuses
      'quarterly_bonus': Math.round(periodsPerYear / 4),

      // Semi-annual bonuses
      'semi_annual_bonus': Math.round(periodsPerYear / 2),

      // Annual bonuses
      'annual_bonus': periodsPerYear,
      '13th_month': periodsPerYear,
      'year_end_bonus': periodsPerYear,
      'holiday_bonus': periodsPerYear,

      // Project-based (default to 1 period unless specified)
      'project_completion': 1,
      'signing_bonus': 1,
      'retention_bonus': 1
    };

    const count = bonusTypeMap[bonusType];

    if (!count) {
      logger.warn('Unknown bonus type, defaulting to 1 period', {
        bonusType,
        loontijdvak
      });
      return 1;
    }

    return count;
  }

  /**
   * Validates bonus tax calculation requirements per Article 17
   * 
   * Ensures all required data is present for compliant bonus tax calculation.
   * 
   * @param {Object} bonusData - Bonus payment data
   * @param {number} bonusData.amount - Bonus amount
   * @param {number} bonusData.loontijdvakkenCount - Periods covered
   * @param {string} bonusData.bonusType - Type of bonus (optional)
   * @returns {Object} Validation result
   * @returns {boolean} .isValid - Whether data is valid
   * @returns {Array<string>} .errors - Validation errors if any
   * @returns {Array<string>} .warnings - Validation warnings
   * 
   * @example
   * validateBonusCalculationRequirements({
   *   amount: 15000,
   *   loontijdvakkenCount: 3,
   *   bonusType: 'quarterly_bonus'
   * })
   * // Returns: { isValid: true, errors: [], warnings: [] }
   */
  validateBonusCalculationRequirements(bonusData) {
    const errors = [];
    const warnings = [];

    // Validate amount
    if (!bonusData.amount || bonusData.amount <= 0) {
      errors.push('Bonus amount must be greater than zero');
    }

    // Validate loontijdvakkenCount
    if (!bonusData.loontijdvakkenCount || bonusData.loontijdvakkenCount < 1) {
      errors.push('Loontijdvakken count must be at least 1');
    }

    if (bonusData.loontijdvakkenCount > 52) {
      errors.push('Loontijdvakken count cannot exceed 52 (one year)');
    }

    // Warnings for unusual scenarios
    if (bonusData.loontijdvakkenCount === 1 && bonusData.bonusType?.includes('annual')) {
      warnings.push(
        'Annual bonus type with loontijdvakkenCount=1 is unusual. ' +
        'Consider using 12 (monthly) or 52 (weekly) periods for accurate tax calculation.'
      );
    }

    if (bonusData.amount > 1000000) {
      warnings.push(
        'Large bonus amount detected (> SRD 1,000,000). ' +
        'Verify loontijdvakkenCount is correct for accurate tax calculation.'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculates bonus tax for multiple bonuses in same paycheck
   * 
   * If employee receives multiple bonuses in one paycheck (e.g., performance + year-end),
   * each bonus must be calculated separately per Article 17, then summed.
   * 
   * @param {Array<Object>} bonuses - Array of bonus objects
   * @param {Object} params - Common calculation parameters
   * @param {number} params.regularWage - Regular wage per period
   * @param {string} params.loontijdvak - Pay period type
   * @param {number} params.taxYear - Tax year
   * @param {string} params.organizationId - Organization UUID
   * @param {boolean} params.isResident - Resident status
   * @returns {Promise<Object>} Combined bonus tax result
   * 
   * @example
   * calculateMultipleBonusTax(
   *   [
   *     { amount: 10000, loontijdvakkenCount: 12, type: 'annual_bonus' },
   *     { amount: 5000, loontijdvakkenCount: 3, type: 'performance_bonus' }
   *   ],
   *   {
   *     regularWage: 5000,
   *     loontijdvak: 'monthly',
   *     taxYear: 2025,
   *     organizationId: 'org-uuid',
   *     isResident: true
   *   }
   * )
   */
  async calculateMultipleBonusTax(bonuses, params) {
    if (!Array.isArray(bonuses) || bonuses.length === 0) {
      throw new ValidationError('Bonuses array must contain at least one bonus');
    }

    const results = [];
    let totalBonusTax = 0;
    let totalBonusAmount = 0;

    for (const bonus of bonuses) {
      const result = await this.calculateBonusTax({
        bonusAmount: bonus.amount,
        regularWage: params.regularWage,
        loontijdvakkenCount: bonus.loontijdvakkenCount,
        loontijdvak: params.loontijdvak,
        taxYear: params.taxYear,
        organizationId: params.organizationId,
        isResident: params.isResident
      });

      results.push({
        bonusType: bonus.type,
        ...result
      });

      totalBonusTax += result.totalBonusTax;
      totalBonusAmount += bonus.amount;
    }

    const effectiveCombinedRate = totalBonusAmount > 0 
      ? totalBonusTax / totalBonusAmount 
      : 0;

    return {
      totalBonusTax: Math.round(totalBonusTax * 100) / 100,
      totalBonusAmount,
      effectiveCombinedRate: Math.round(effectiveCombinedRate * 10000) / 10000,
      bonusCount: bonuses.length,
      individualBonuses: results
    };
  }
}

export default BonusTaxService;
