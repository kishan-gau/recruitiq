/**
 * Loontijdvak Service
 * 
 * Handles Surinamese wage period (loontijdvak) calculations per Wet Loonbelasting Article 13.3
 * 
 * Key Concepts:
 * - Loontijdvak = Wage period (daily, weekly, monthly, yearly)
 * - Used for tax calculation and proration of tax-free allowances
 * - Based on 364-day year (52 weeks × 7 days) per Article 13.3a
 * - Critical for accurate tax calculations and compliance
 * 
 * Article 13.3a: "De loontijdvakken zijn van gelijke lengte, tenzij artikel 13.3c anders bepaalt"
 * (Wage periods are of equal length, unless Article 13.3c determines otherwise)
 * 
 * @module products/paylinq/services/LoontijdvakService
 */

import Joi from 'joi';
import { ValidationError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * Loontijdvak type definitions per Wet Loonbelasting
 */
const LOONTIJDVAK_TYPES = {
  DAILY: 'daily',     // Dag loontijdvak
  WEEKLY: 'weekly',   // Week loontijdvak
  MONTHLY: 'monthly', // Maand loontijdvak
  YEARLY: 'yearly'    // Jaar loontijdvak
};

/**
 * Number of periods per year for each loontijdvak type
 * Based on 364-day year (52 weeks × 7 days) per Article 13.3a
 */
const LOONTIJDVAK_PERIODS_PER_YEAR = {
  [LOONTIJDVAK_TYPES.DAILY]: 364,   // Article 13.3a: 364 days = 52 weeks × 7
  [LOONTIJDVAK_TYPES.WEEKLY]: 52,   // Article 13.3a: 52 weeks
  [LOONTIJDVAK_TYPES.MONTHLY]: 12,  // Article 13.3b: 12 months
  [LOONTIJDVAK_TYPES.YEARLY]: 1     // Article 13.3c: 1 year
};

/**
 * Loontijdvak Service
 * 
 * Implements wage period calculations per Wet Loonbelasting
 */
class LoontijdvakService {
  /**
   * Creates instance with optional repository injection
   * @param {Object} repository - Optional repository for testing
   */
  
  repository: any;

constructor(repository = null) {
    this.repository = repository;
  }

  /**
   * Gets the number of periods per year for a loontijdvak type
   * 
   * @param {string} loontijdvak - Loontijdvak type (daily, weekly, monthly, yearly)
   * @returns {number} Number of periods per year
   * @throws {ValidationError} If loontijdvak type is invalid
   * 
   * @example
   * getPeriodsPerYear('monthly') // Returns 12
   * getPeriodsPerYear('weekly')  // Returns 52
   * getPeriodsPerYear('daily')   // Returns 364
   */
  getPeriodsPerYear(loontijdvak) {
    if (!Object.values(LOONTIJDVAK_TYPES).includes(loontijdvak)) {
      throw new ValidationError(
        `Invalid loontijdvak type: ${loontijdvak}. Must be one of: ${Object.values(LOONTIJDVAK_TYPES).join(', ')}`
      );
    }

    return LOONTIJDVAK_PERIODS_PER_YEAR[loontijdvak];
  }

  /**
   * Calculates the fraction of year for a loontijdvak
   * Used for proration calculations per Article 13.3
   * 
   * @param {string} loontijdvak - Loontijdvak type
   * @returns {number} Fraction of year (e.g., 1/12 for monthly = 0.083333...)
   * @throws {ValidationError} If loontijdvak type is invalid
   * 
   * Formula (Article 13.3a):
   * - Daily: 1/364
   * - Weekly: 1/52
   * - Monthly: 1/12
   * - Yearly: 1/1
   * 
   * @example
   * getLoontijdvakFraction('monthly') // Returns 0.083333... (1/12)
   * getLoontijdvakFraction('weekly')  // Returns 0.019230... (1/52)
   */
  getLoontijdvakFraction(loontijdvak) {
    const periodsPerYear = this.getPeriodsPerYear(loontijdvak);
    return 1.0 / periodsPerYear;
  }

  /**
   * Prorates an annual amount to a loontijdvak period
   * 
   * Per Article 13.3: Tax calculations and allowances must be prorated
   * based on the loontijdvak fraction.
   * 
   * @param {number} annualAmount - Annual amount to prorate
   * @param {string} loontijdvak - Target loontijdvak type
   * @returns {number} Prorated amount for the period (rounded to 2 decimals)
   * @throws {ValidationError} If inputs are invalid
   * 
   * Formula:
   * Prorated Amount = Annual Amount × (1 / Periods per Year)
   * 
   * @example
   * prorateAnnualAmount(108000, 'monthly') // Returns 9000 (108000 / 12)
   * prorateAnnualAmount(108000, 'weekly')  // Returns 2076.92 (108000 / 52)
   * prorateAnnualAmount(108000, 'daily')   // Returns 296.70 (108000 / 364)
   */
  prorateAnnualAmount(annualAmount, loontijdvak) {
    // Validate inputs
    if (typeof annualAmount !== 'number' || annualAmount < 0) {
      throw new ValidationError('Annual amount must be a non-negative number');
    }

    const fraction = this.getLoontijdvakFraction(loontijdvak);
    const proratedAmount = annualAmount * fraction;

    // Round to 2 decimal places for currency
    return Math.round(proratedAmount * 100) / 100;
  }

  /**
   * Converts amount from one loontijdvak to another
   * 
   * Useful for comparing wages across different pay frequencies
   * or converting bonus amounts to different periods.
   * 
   * @param {number} amount - Amount in source loontijdvak
   * @param {string} fromLoontijdvak - Source loontijdvak type
   * @param {string} toLoontijdvak - Target loontijdvak type
   * @returns {number} Converted amount (rounded to 2 decimals)
   * @throws {ValidationError} If inputs are invalid
   * 
   * Formula:
   * 1. Convert to annual: amount × periods_per_year(from)
   * 2. Convert to target: annual / periods_per_year(to)
   * 
   * @example
   * convertLoontijdvak(5000, 'monthly', 'yearly')  // Returns 60000
   * convertLoontijdvak(5000, 'monthly', 'weekly')  // Returns 1153.85
   * convertLoontijdvak(100, 'daily', 'monthly')    // Returns 3296.70
   */
  convertLoontijdvak(amount, fromLoontijdvak, toLoontijdvak) {
    // Validate inputs
    if (typeof amount !== 'number' || amount < 0) {
      throw new ValidationError('Amount must be a non-negative number');
    }

    // If same loontijdvak, return original amount
    if (fromLoontijdvak === toLoontijdvak) {
      return amount;
    }

    // Convert to annual first
    const fromPeriodsPerYear = this.getPeriodsPerYear(fromLoontijdvak);
    const annualAmount = amount * fromPeriodsPerYear;

    // Convert to target loontijdvak
    const toPeriodsPerYear = this.getPeriodsPerYear(toLoontijdvak);
    const convertedAmount = annualAmount / toPeriodsPerYear;

    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Calculates loontijdvak metadata for a paycheck
   * 
   * Determines the appropriate loontijdvak type and fraction
   * based on the pay period dates.
   * 
   * @param {Date} payPeriodStart - Start date of pay period
   * @param {Date} payPeriodEnd - End date of pay period
   * @param {string} configuredFrequency - Configured pay frequency from worker_metadata
   * @returns {Object} Loontijdvak metadata
   * @returns {string} .loontijdvak - Loontijdvak type
   * @returns {number} .fraction - Fraction of year
   * @returns {number} .periodsPerYear - Number of periods per year
   * @returns {number} .daysInPeriod - Actual days in this specific period
   * @throws {ValidationError} If dates are invalid
   * 
   * @example
   * calculateLoontijdvakMetadata(
   *   new Date('2025-11-01'),
   *   new Date('2025-11-30'),
   *   'monthly'
   * )
   * // Returns:
   * // {
   * //   loontijdvak: 'monthly',
   * //   fraction: 0.083333,
   * //   periodsPerYear: 12,
   * //   daysInPeriod: 30
   * // }
   */
  calculateLoontijdvakMetadata(payPeriodStart, payPeriodEnd, configuredFrequency) {
    // Validate inputs
    if (!(payPeriodStart instanceof Date) || !(payPeriodEnd instanceof Date)) {
      throw new ValidationError('Pay period dates must be valid Date objects');
    }

    if (payPeriodEnd <= payPeriodStart) {
      throw new ValidationError('Pay period end must be after start');
    }

    if (!Object.values(LOONTIJDVAK_TYPES).includes(configuredFrequency)) {
      throw new ValidationError(
        `Invalid configured frequency: ${configuredFrequency}`
      );
    }

    // Calculate days in period
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysInPeriod = Math.round(
      (payPeriodEnd.getTime() - payPeriodStart.getTime()) / millisecondsPerDay
    ) + 1; // Include end date

    // Use configured frequency as loontijdvak type
    const loontijdvak = configuredFrequency;

    return {
      loontijdvak,
      fraction: this.getLoontijdvakFraction(loontijdvak),
      periodsPerYear: this.getPeriodsPerYear(loontijdvak),
      daysInPeriod
    };
  }

  /**
   * Validates that a loontijdvak period length is correct per Article 13.3a
   * 
   * Article 13.3a states periods should be of equal length within a year.
   * This validates actual period length matches expected length.
   * 
   * @param {number} actualDays - Actual number of days in period
   * @param {string} loontijdvak - Loontijdvak type
   * @returns {Object} Validation result
   * @returns {boolean} .isValid - Whether period length is valid
   * @returns {number} .expectedDays - Expected days per Article 13.3a
   * @returns {number} .actualDays - Actual days in period
   * @returns {string} .warning - Warning message if not valid
   * 
   * Expected days (364-day year):
   * - Daily: 1 day
   * - Weekly: 7 days (364/52)
   * - Monthly: ~30.33 days (364/12)
   * - Yearly: 364 days
   * 
   * @example
   * validateLoontijdvakPeriodLength(30, 'monthly')
   * // Returns: { isValid: true, expectedDays: 30.33, actualDays: 30 }
   * 
   * validateLoontijdvakPeriodLength(14, 'weekly')
   * // Returns: { isValid: false, expectedDays: 7, actualDays: 14, warning: '...' }
   */
  validateLoontijdvakPeriodLength(actualDays, loontijdvak) {
    const periodsPerYear = this.getPeriodsPerYear(loontijdvak);
    const expectedDays = 364 / periodsPerYear;

    // Allow 1-day tolerance for monthly periods (28-31 days acceptable)
    // Allow exact match for daily, weekly, yearly
    let isValid = false;
    let toleranceDays = 0;

    switch (loontijdvak) {
      case LOONTIJDVAK_TYPES.MONTHLY:
        toleranceDays = 3; // 28-31 days acceptable for months
        isValid = Math.abs(actualDays - expectedDays) <= toleranceDays;
        break;
      case LOONTIJDVAK_TYPES.DAILY:
      case LOONTIJDVAK_TYPES.WEEKLY:
      case LOONTIJDVAK_TYPES.YEARLY:
        toleranceDays = 1;
        isValid = Math.abs(actualDays - expectedDays) <= toleranceDays;
        break;
      default:
        isValid = false;
    }

    const result = {
      isValid,
      expectedDays: Math.round(expectedDays * 100) / 100,
      actualDays,
      loontijdvak
    };

    if (!isValid) {
      result.warning = 
        `Period length mismatch: Expected ~${result.expectedDays} days for ${loontijdvak} loontijdvak, ` +
        `but got ${actualDays} days. This may violate Article 13.3a (equal period lengths).`;
      
      logger.warn('Loontijdvak period length validation failed', result);
    }

    return result;
  }

  /**
   * Gets all available loontijdvak types
   * 
   * @returns {Object} Object with loontijdvak types as keys and metadata as values
   * 
   * @example
   * getAvailableLoontijdvakTypes()
   * // Returns:
   * // {
   * //   daily: { periodsPerYear: 364, fraction: 0.00275, daysPerPeriod: 1 },
   * //   weekly: { periodsPerYear: 52, fraction: 0.01923, daysPerPeriod: 7 },
   * //   monthly: { periodsPerYear: 12, fraction: 0.08333, daysPerPeriod: 30.33 },
   * //   yearly: { periodsPerYear: 1, fraction: 1.0, daysPerPeriod: 364 }
   * // }
   */
  getAvailableLoontijdvakTypes() {
    const types = {};

    for (const [key, value] of Object.entries(LOONTIJDVAK_TYPES)) {
      const periodsPerYear = this.getPeriodsPerYear(value);
      types[value] = {
        name: key.toLowerCase(),
        code: value,
        periodsPerYear,
        fraction: this.getLoontijdvakFraction(value),
        daysPerPeriod: Math.round((364 / periodsPerYear) * 100) / 100
      };
    }

    return types;
  }
}

// Export service class and constants
export default LoontijdvakService;
export { LOONTIJDVAK_TYPES, LOONTIJDVAK_PERIODS_PER_YEAR };
