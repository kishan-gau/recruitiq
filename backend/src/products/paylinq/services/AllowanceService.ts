/**
 * Allowance Service
 * 
 * Business logic layer for tax-free allowance management and calculations.
 * Handles allowance cap enforcement, yearly usage tracking, and multi-tenant security.
 * 
 * CRITICAL: MULTI-TENANT SECURITY
 * - All operations MUST include organization_id
 * - Each tenant has completely isolated allowance data
 * - Prevents data leakage between organizations
 * 
 * @module products/paylinq/services/AllowanceService
 */

import Joi from 'joi';
import AllowanceRepository from '../repositories/AllowanceRepository.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../../middleware/errorHandler.js';

class AllowanceService {
  /**
   * @param {AllowanceRepository} repository - Optional repository instance for testing
   */
  constructor(repository = null) {
    this.repository = repository || new AllowanceRepository();
  }

  /**
   * Calculate applicable tax-free allowance for payroll period
   * 
   * PER WET LOONBELASTING ARTICLE 13.1a:
   * Tax-free allowance (belastingvrije som) is ONLY available to Suriname residents.
   * Non-residents do NOT receive tax-free allowance.
   * 
   * @param {number} grossPay - Gross pay amount
   * @param {Date} payDate - Payment date
   * @param {string} payPeriod - 'monthly', 'annual', etc.
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @param {boolean} isResident - Whether employee is Suriname resident (REQUIRED per Article 13.1a)
   * @returns {Promise<number>} Tax-free allowance amount (0 for non-residents)
   */
  async calculateTaxFreeAllowance(grossPay, payDate, payPeriod, organizationId, isResident = true) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Article 13.1a: Non-residents do NOT receive tax-free allowance
    if (isResident === false) {
      logger.debug('Tax-free allowance not applicable - non-resident', {
        grossPay,
        payDate,
        payPeriod,
        organizationId,
        isResident
      });
      return 0;
    }

    const allowanceType = payPeriod === 'monthly' 
      ? 'tax_free_sum_monthly' 
      : 'tax_free_sum_annual';
    
    const allowance = await this.repository.findActiveAllowanceByType(
      allowanceType,
      payDate,
      organizationId
    );

    if (!allowance) {
      logger.warn('No tax-free allowance found', { 
        payDate, 
        payPeriod, 
        organizationId 
      });
      return 0;
    }

    // Return the lesser of: allowance amount or gross pay
    const taxFreeAmount = Math.min(allowance.amount, grossPay);
    
    logger.debug('Tax-free allowance calculated', {
      grossPay,
      allowanceAmount: allowance.amount,
      taxFreeAmount,
      isResident,
      organizationId
    });

    return taxFreeAmount;
  }

  /**
   * Get available holiday allowance for employee this year
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<number>} Available amount remaining
   */
  async getAvailableHolidayAllowance(employeeId, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Get holiday allowance cap for this year
    const allowance = await this.repository.findActiveAllowanceByType(
      'holiday_allowance',
      new Date(year, 0, 1), // January 1st of the year
      organizationId
    );

    if (!allowance) {
      logger.warn('No holiday allowance cap found', { 
        year, 
        organizationId 
      });
      return 0;
    }

    // Check usage this year
    const usage = await this.repository.getEmployeeAllowanceUsage(
      employeeId,
      'holiday_allowance',
      year,
      organizationId
    );

    const used = usage ? parseFloat(usage.amount_used) : 0;
    const available = Math.max(0, parseFloat(allowance.amount) - used);

    logger.debug('Holiday allowance availability checked', {
      employeeId,
      year,
      cap: allowance.amount,
      used,
      available,
      organizationId
    });

    return available;
  }

  /**
   * Apply holiday allowance to payment and track usage
   * @param {string} employeeId - Employee UUID
   * @param {number} paymentAmount - Payment amount
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<Object>} { appliedAmount, remainingForYear, taxableAmount }
   */
  async applyHolidayAllowance(employeeId, paymentAmount, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Get available allowance
    const available = await this.getAvailableHolidayAllowance(
      employeeId,
      year,
      organizationId
    );

    // Calculate how much can be applied (lesser of payment or available)
    const appliedAmount = Math.min(paymentAmount, available);

    if (appliedAmount > 0) {
      // Record usage
      await this.repository.recordAllowanceUsage(
        employeeId,
        'holiday_allowance',
        appliedAmount,
        year,
        organizationId
      );

      logger.info('Holiday allowance applied', {
        employeeId,
        paymentAmount,
        appliedAmount,
        year,
        organizationId
      });
    }

    const remainingForYear = available - appliedAmount;
    const taxableAmount = paymentAmount - appliedAmount;

    return {
      appliedAmount,
      remainingForYear,
      taxableAmount
    };
  }

  /**
   * Get available bonus allowance for employee this year
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<number>} Available amount remaining
   */
  async getAvailableBonusAllowance(employeeId, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Get bonus allowance cap for this year
    const allowance = await this.repository.findActiveAllowanceByType(
      'bonus_gratuity',
      new Date(year, 0, 1), // January 1st of the year
      organizationId
    );

    if (!allowance) {
      logger.warn('No bonus allowance cap found', { 
        year, 
        organizationId 
      });
      return 0;
    }

    // Check usage this year
    const usage = await this.repository.getEmployeeAllowanceUsage(
      employeeId,
      'bonus_gratuity',
      year,
      organizationId
    );

    const used = usage ? parseFloat(usage.amount_used) : 0;
    const available = Math.max(0, parseFloat(allowance.amount) - used);

    logger.debug('Bonus allowance availability checked', {
      employeeId,
      year,
      cap: allowance.amount,
      used,
      available,
      organizationId
    });

    return available;
  }

  /**
   * Apply bonus allowance to payment and track usage
   * @param {string} employeeId - Employee UUID
   * @param {number} paymentAmount - Payment amount
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<Object>} { appliedAmount, remainingForYear, taxableAmount }
   */
  async applyBonusAllowance(employeeId, paymentAmount, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    // Get available allowance
    const available = await this.getAvailableBonusAllowance(
      employeeId,
      year,
      organizationId
    );

    // Calculate how much can be applied (lesser of payment or available)
    const appliedAmount = Math.min(paymentAmount, available);

    if (appliedAmount > 0) {
      // Record usage
      await this.repository.recordAllowanceUsage(
        employeeId,
        'bonus_gratuity',
        appliedAmount,
        year,
        organizationId
      );

      logger.info('Bonus allowance applied', {
        employeeId,
        paymentAmount,
        appliedAmount,
        year,
        organizationId
      });
    }

    const remainingForYear = available - appliedAmount;
    const taxableAmount = paymentAmount - appliedAmount;

    return {
      appliedAmount,
      remainingForYear,
      taxableAmount
    };
  }

  /**
   * Get all allowances for an organization
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<Array>} Array of allowances
   */
  async getAllAllowances(organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    return await this.repository.getAllAllowances(organizationId);
  }

  /**
   * Get employee allowance usage summary for a year
   * @param {string} employeeId - Employee UUID
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   * @returns {Promise<Object>} Usage summary with caps and remaining amounts
   */
  async getEmployeeAllowanceSummary(employeeId, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    const [holidayAvailable, bonusAvailable, holidayAllowance, bonusAllowance] = await Promise.all([
      this.getAvailableHolidayAllowance(employeeId, year, organizationId),
      this.getAvailableBonusAllowance(employeeId, year, organizationId),
      this.repository.findActiveAllowanceByType('holiday_allowance', new Date(year, 0, 1), organizationId),
      this.repository.findActiveAllowanceByType('bonus_gratuity', new Date(year, 0, 1), organizationId)
    ]);

    const holidayCap = holidayAllowance ? parseFloat(holidayAllowance.amount) : 0;
    const bonusCap = bonusAllowance ? parseFloat(bonusAllowance.amount) : 0;

    return {
      year,
      employeeId,
      organizationId,
      holidayAllowance: {
        cap: holidayCap,
        used: holidayCap - holidayAvailable,
        remaining: holidayAvailable,
        percentUsed: holidayCap > 0 ? ((holidayCap - holidayAvailable) / holidayCap * 100).toFixed(2) : 0
      },
      bonusAllowance: {
        cap: bonusCap,
        used: bonusCap - bonusAvailable,
        remaining: bonusAvailable,
        percentUsed: bonusCap > 0 ? ((bonusCap - bonusAvailable) / bonusCap * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * Reset allowance usage for new year (admin operation)
   * @param {string} employeeId - Employee UUID
   * @param {string} allowanceType - Allowance type to reset
   * @param {number} year - Calendar year
   * @param {string} organizationId - Organization UUID (REQUIRED)
   */
  async resetAllowanceUsage(employeeId, allowanceType, year, organizationId) {
    if (!organizationId) {
      throw new ValidationError('organizationId is required for tenant isolation');
    }

    await this.repository.resetAllowanceUsage(
      employeeId,
      allowanceType,
      year,
      organizationId
    );

    logger.info('Allowance usage reset', {
      employeeId,
      allowanceType,
      year,
      organizationId
    });
  }
}

export default AllowanceService;
