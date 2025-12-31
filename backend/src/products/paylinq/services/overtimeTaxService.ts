/**
 * Overtime Tax Service
 * 
 * Implements special overtime tax rates per Wet Loonbelasting Article 17c
 * 
 * CRITICAL COMPLIANCE:
 * Article 17c allows special reduced tax rates on overtime pay:
 * - First bracket: 5% tax rate
 * - Second bracket: 15% tax rate
 * - Third bracket: 25% tax rate
 * 
 * IMPORTANT REQUIREMENTS:
 * 1. Employee must OPT-IN voluntarily (Article 17c.1)
 * 2. Overtime must be legitimate (outside normal hours, authorized)
 * 3. Must validate overtime hours meet legal criteria
 * 4. If not opted in, overtime is taxed at regular wage rates
 * 
 * Article 17c.1: "De werknemer kan verzoeken dat de werkgever de 
 * loonbelasting berekent volgens de bijzondere tarieven..."
 * (The employee may request that the employer calculates wage tax 
 * according to the special rates...)
 * 
 * @module products/paylinq/services/OvertimeTaxService
 */

import Joi from 'joi';
import { ValidationError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * Overtime tax brackets per Article 17c
 * 
 * These are special reduced rates that apply ONLY to overtime
 * when employee has opted in to Article 17c treatment.
 * 
 * Note: Bracket thresholds may change annually per Article 18a
 */
const OVERTIME_TAX_BRACKETS_DEFAULT = [
  {
    name: 'First Bracket',
    threshold: 0,          // From SRD 0
    maxAmount: 5000,       // Up to SRD 5,000 per month
    rate: 0.05,            // 5% tax rate
    article: '17c.2a'
  },
  {
    name: 'Second Bracket',
    threshold: 5000,       // From SRD 5,000
    maxAmount: 10000,      // Up to SRD 10,000 per month
    rate: 0.15,            // 15% tax rate
    article: '17c.2b'
  },
  {
    name: 'Third Bracket',
    threshold: 10000,      // Above SRD 10,000
    maxAmount: Infinity,   // No upper limit
    rate: 0.25,            // 25% tax rate
    article: '17c.2c'
  }
];

/**
 * Overtime Tax Service
 * 
 * Handles Article 17c overtime tax calculations
 */
class OvertimeTaxService {
  /**
   * Creates instance with optional dependency injection
   * 
   * @param {Object} repository - Optional repository for testing
   */
  
  repository: any;

constructor(repository = null) {
    this.repository = repository;
  }

  /**
   * Validation schema for overtime tax calculation
   */
  static get calculateOvertimeTaxSchema() {
    return Joi.object({
      overtimeAmount: Joi.number().min(0).required(),
      organizationId: Joi.string().uuid().required(),
      employeeId: Joi.string().uuid().required(),
      hasOptedIn: Joi.boolean().required(),
      isValidatedOvertime: Joi.boolean().default(false),
      taxYear: Joi.number().integer().min(2020).max(2100).optional()
    });
  }

  /**
   * Calculates tax on overtime using Article 17c special rates
   * 
   * FORMULA (Article 17c.2):
   * Apply progressive brackets to overtime amount:
   * - First SRD 5,000: 5% tax
   * - Next SRD 5,000 (5K-10K): 15% tax
   * - Above SRD 10,000: 25% tax
   * 
   * @param {Object} params - Calculation parameters
   * @param {number} params.overtimeAmount - Total overtime pay amount
   * @param {string} params.organizationId - Organization UUID
   * @param {string} params.employeeId - Employee UUID
   * @param {boolean} params.hasOptedIn - Whether employee opted into Article 17c
   * @param {boolean} params.isValidatedOvertime - Whether overtime has been validated
   * @param {number} params.taxYear - Tax year (optional, for bracket selection)
   * @returns {Promise<Object>} Overtime tax calculation result
   * @returns {number} .totalTax - Total tax on overtime
   * @returns {Array<Object>} .bracketBreakdown - Tax by bracket
   * @returns {number} .effectiveRate - Effective tax rate
   * @returns {string} .method - Tax calculation method used
   * @throws {ValidationError} If parameters are invalid
   * 
   * @example
   * calculateOvertimeTax({
   *   overtimeAmount: 8000,
   *   organizationId: 'org-uuid',
   *   employeeId: 'emp-uuid',
   *   hasOptedIn: true,
   *   isValidatedOvertime: true
   * })
   * // Returns:
   * // {
   * //   totalTax: 700,
   * //   bracketBreakdown: [
   * //     { bracket: 'First', amount: 5000, rate: 0.05, tax: 250 },
   * //     { bracket: 'Second', amount: 3000, rate: 0.15, tax: 450 }
   * //   ],
   * //   effectiveRate: 0.0875,
   * //   method: 'Article 17c - Special Overtime Rates'
   * // }
   */
  async calculateOvertimeTax(params) {
    // Validate input
    const validated = await OvertimeTaxService.calculateOvertimeTaxSchema.validateAsync(params);

    const {
      overtimeAmount,
      organizationId,
      employeeId,
      hasOptedIn,
      isValidatedOvertime,
      taxYear
    } = validated;

    try {
      // Check if employee has opted in to Article 17c
      if (!hasOptedIn) {
        logger.warn('Employee has not opted into Article 17c overtime tax', {
          employeeId,
          organizationId,
          overtimeAmount
        });

        return {
          totalTax: null,
          message: 'Employee has not opted into Article 17c. Overtime will be taxed at regular wage rates.',
          method: 'Regular Wage Tax (No Article 17c Opt-in)',
          requiresRegularTaxCalculation: true
        };
      }

      // Validate overtime legitimacy per Article 17c.4
      if (!isValidatedOvertime) {
        logger.warn('Overtime hours not validated per Article 17c.4', {
          employeeId,
          organizationId,
          overtimeAmount
        });

        throw new ValidationError(
          'Overtime hours must be validated before applying Article 17c rates. ' +
          'Ensure overtime is: (1) Outside normal working hours, (2) Authorized by employer, ' +
          '(3) Properly documented in time records.'
        );
      }

      // Get overtime tax brackets (could be year-specific)
      const brackets = await this.getOvertimeTaxBrackets(organizationId, taxYear);

      // Calculate tax using progressive brackets
      const bracketBreakdown = [];
      let totalTax = 0;
      let remainingAmount = overtimeAmount;

      for (const bracket of brackets) {
        if (remainingAmount <= 0) break;

        // Calculate amount in this bracket
        const bracketSize = bracket.maxAmount === Infinity 
          ? remainingAmount 
          : Math.min(bracket.maxAmount - bracket.threshold, remainingAmount);

        if (bracketSize > 0) {
          const taxInBracket = bracketSize * bracket.rate;
          totalTax += taxInBracket;

          bracketBreakdown.push({
            bracket: bracket.name,
            threshold: bracket.threshold,
            amount: Math.round(bracketSize * 100) / 100,
            rate: bracket.rate,
            tax: Math.round(taxInBracket * 100) / 100,
            article: bracket.article
          });

          remainingAmount -= bracketSize;
        }
      }

      // Calculate effective rate
      const effectiveRate = overtimeAmount > 0 
        ? totalTax / overtimeAmount 
        : 0;

      const result = {
        totalTax: Math.round(totalTax * 100) / 100,
        overtimeAmount,
        bracketBreakdown,
        effectiveRate: Math.round(effectiveRate * 10000) / 10000,
        method: 'Article 17c - Special Overtime Rates',
        hasOptedIn: true,
        isValidatedOvertime: true
      };

      logger.info('Overtime tax calculated per Article 17c', {
        employeeId,
        organizationId,
        overtimeAmount,
        totalTax: result.totalTax,
        effectiveRate: result.effectiveRate
      });

      return result;

    } catch (_error) {
      logger.error('Overtime tax calculation failed', {
        error: error.message,
        params: validated,
        organizationId,
        employeeId
      });
      throw error;
    }
  }

  /**
   * Gets overtime tax brackets for organization and year
   * 
   * Allows organization-specific or year-specific bracket overrides
   * while defaulting to Article 17c standard rates.
   * 
   * @param {string} organizationId - Organization UUID
   * @param {number} taxYear - Tax year (optional)
   * @returns {Promise<Array<Object>>} Overtime tax brackets
   * 
   * @example
   * getOvertimeTaxBrackets('org-uuid', 2025)
   * // Returns default brackets or org-specific overrides
   */
  async getOvertimeTaxBrackets(organizationId, taxYear = null) {
    // TODO: If needed, allow organizations to customize brackets
    // For now, return default Article 17c brackets

    // If repository is injected, could fetch org-specific brackets
    // if (this.repository) {
    //   const customBrackets = await this.repository.getOvertimeBrackets(
    //     organizationId, 
    //     taxYear
    //   );
    //   if (customBrackets) return customBrackets;
    // }

    return OVERTIME_TAX_BRACKETS_DEFAULT;
  }

  /**
   * Validates overtime hours meet Article 17c.4 requirements
   * 
   * Per Article 17c.4, overtime must:
   * 1. Be worked outside normal working hours
   * 2. Be authorized by employer in advance
   * 3. Be properly documented in time records
   * 4. Not exceed legal limits
   * 
   * @param {Object} overtimeData - Overtime details
   * @param {number} overtimeData.hours - Overtime hours
   * @param {Date} overtimeData.workDate - Date work was performed
   * @param {string} overtimeData.approvalStatus - Authorization status
   * @param {boolean} overtimeData.outsideNormalHours - Whether outside normal schedule
   * @returns {Object} Validation result
   * @returns {boolean} .isValid - Whether overtime meets requirements
   * @returns {Array<string>} .errors - Validation errors
   * @returns {Array<string>} .warnings - Validation warnings
   * 
   * @example
   * validateOvertimeRequirements({
   *   hours: 8,
   *   workDate: new Date('2025-11-22'),
   *   approvalStatus: 'approved',
   *   outsideNormalHours: true
   * })
   * // Returns: { isValid: true, errors: [], warnings: [] }
   */
  validateOvertimeRequirements(overtimeData) {
    const errors = [];
    const warnings = [];

    // Validate hours
    if (!overtimeData.hours || overtimeData.hours <= 0) {
      errors.push('Overtime hours must be greater than zero');
    }

    if (overtimeData.hours > 12) {
      warnings.push(
        'Overtime hours exceed 12 hours in one day. Verify this meets labor law limits.'
      );
    }

    // Validate authorization (Article 17c.4 requirement)
    if (overtimeData.approvalStatus !== 'approved') {
      errors.push(
        'Overtime must be pre-approved by employer per Article 17c.4. ' +
        'Current status: ' + (overtimeData.approvalStatus || 'not approved')
      );
    }

    // Validate outside normal hours (Article 17c.4 requirement)
    if (!overtimeData.outsideNormalHours) {
      errors.push(
        'Overtime must be worked outside normal working hours per Article 17c.4. ' +
        'Hours worked during normal schedule do not qualify.'
      );
    }

    // Validate work date
    if (!overtimeData.workDate) {
      errors.push('Work date is required for overtime validation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Processes employee opt-in request for Article 17c
   * 
   * Records employee's voluntary request to use Article 17c overtime tax rates.
   * Per Article 17c.1, this must be a voluntary employee request.
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} requestedBy - User who recorded the request
   * @param {string} notes - Notes about the opt-in request
   * @returns {Promise<Object>} Opt-in record
   * 
   * @example
   * processOvertimeOptIn(
   *   'emp-uuid',
   *   'org-uuid',
   *   'hr-user-uuid',
   *   'Employee requested Article 17c overtime tax treatment via email on 2025-11-22'
   * )
   */
  async processOvertimeOptIn(employeeId, organizationId, requestedBy, notes = '') {
    // Validate inputs
    if (!employeeId || !organizationId || !requestedBy) {
      throw new ValidationError('employeeId, organizationId, and requestedBy are required');
    }

    // This would update worker_metadata.overtime_tax_article_17c_opt_in
    // For now, return the expected structure
    // Actual implementation would call repository

    const optInRecord = {
      employeeId,
      organizationId,
      overtimeTaxArticle17cOptIn: true,
      overtimeOptInDate: new Date(),
      overtimeOptInNotes: notes || 'Employee voluntarily requested Article 17c overtime tax treatment',
      recordedBy: requestedBy,
      recordedAt: new Date()
    };

    logger.info('Employee opted into Article 17c overtime tax', {
      employeeId,
      organizationId,
      requestedBy,
      date: optInRecord.overtimeOptInDate
    });

    return optInRecord;
  }

  /**
   * Estimates tax savings from Article 17c vs regular rates
   * 
   * Compares Article 17c special rates against regular wage tax rates
   * to show potential tax savings for employee.
   * 
   * @param {number} overtimeAmount - Overtime pay amount
   * @param {number} regularTaxRate - Regular wage tax rate (e.g., 0.30 for 30%)
   * @returns {Object} Comparison result
   * @returns {number} .article17cTax - Tax using Article 17c rates
   * @returns {number} .regularTax - Tax using regular rates
   * @returns {number} .savings - Tax savings from Article 17c
   * @returns {number} .savingsPercentage - Savings as percentage of regular tax
   * 
   * @example
   * estimateTaxSavings(10000, 0.30)
   * // Returns:
   * // {
   * //   article17cTax: 1000,     // (5000*0.05 + 5000*0.15)
   * //   regularTax: 3000,        // (10000*0.30)
   * //   savings: 2000,           // (3000 - 1000)
   * //   savingsPercentage: 0.67  // (2000/3000)
   * // }
   */
  async estimateTaxSavings(overtimeAmount, regularTaxRate) {
    if (overtimeAmount <= 0 || regularTaxRate <= 0 || regularTaxRate >= 1) {
      throw new ValidationError('Invalid overtime amount or tax rate');
    }

    // Calculate Article 17c tax
    const brackets = OVERTIME_TAX_BRACKETS_DEFAULT;
    let article17cTax = 0;
    let remainingAmount = overtimeAmount;

    for (const bracket of brackets) {
      if (remainingAmount <= 0) break;

      const bracketSize = bracket.maxAmount === Infinity 
        ? remainingAmount 
        : Math.min(bracket.maxAmount - bracket.threshold, remainingAmount);

      if (bracketSize > 0) {
        article17cTax += bracketSize * bracket.rate;
        remainingAmount -= bracketSize;
      }
    }

    // Calculate regular tax
    const regularTax = overtimeAmount * regularTaxRate;

    // Calculate savings
    const savings = regularTax - article17cTax;
    const savingsPercentage = regularTax > 0 ? savings / regularTax : 0;

    return {
      overtimeAmount,
      article17cTax: Math.round(article17cTax * 100) / 100,
      regularTax: Math.round(regularTax * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 10000) / 10000,
      recommendation: savings > 0 
        ? 'Article 17c provides tax savings - consider opting in'
        : 'Regular tax rates may be more favorable'
    };
  }
}

export default OvertimeTaxService;
export { OVERTIME_TAX_BRACKETS_DEFAULT };
