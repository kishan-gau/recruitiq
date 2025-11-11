/**
 * Tax Calculation Service
 * 
 * Business logic layer for tax calculations, tax rule management, and tax reporting.
 * Handles bracket-based progressive tax calculation (MVP), allowances, and deductible costs.
 * 
 * MVP Version: Bracket-based progressive tax calculation for Surinamese payroll
 * Phase 2: Multi-jurisdictional tax, withholding certificates, tax treaties, automated filing
 * 
 * @module products/paylinq/services/taxCalculationService
 */

import Joi from 'joi';
import TaxEngineRepository from '../repositories/taxEngineRepository.js';
import DeductionRepository from '../repositories/deductionRepository.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';

class TaxCalculationService {
  constructor() {
    this.taxEngineRepository = new TaxEngineRepository();
    this.deductionRepository = new DeductionRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  taxRuleSetSchema = Joi.object({
    taxType: Joi.string().valid('income', 'wage', 'social_security', 'medicare', 'state', 'local').required(),
    taxName: Joi.string().min(2).max(100).required(),
    country: Joi.string().length(2).required(),
    state: Joi.string().allow(null, ''),
    locality: Joi.string().allow(null, ''),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    isActive: Joi.boolean().default(true),
    annualCap: Joi.number().min(0).allow(null),
    calculationMethod: Joi.string().valid('bracket', 'flat_rate', 'graduated').default('bracket'),
    description: Joi.string().max(500).allow(null, '')
  });

  taxBracketSchema = Joi.object({
    taxRuleSetId: Joi.string().uuid().required(),
    bracketOrder: Joi.number().integer().min(1).required(),
    incomeMin: Joi.number().min(0).required(),
    incomeMax: Joi.number().min(0).allow(null),
    ratePercentage: Joi.number().min(0).max(100).required(),
    fixedAmount: Joi.number().min(0).default(0)
  });

  allowanceSchema = Joi.object({
    allowanceType: Joi.string().valid('personal', 'dependent', 'standard', 'itemized', 'other').required(),
    allowanceName: Joi.string().min(2).max(100).required(),
    country: Joi.string().length(2).required(),
    state: Joi.string().allow(null, ''),
    amount: Joi.number().min(0).required(),
    isPercentage: Joi.boolean().default(false),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    isActive: Joi.boolean().default(true),
    description: Joi.string().max(500).allow(null, '')
  });

  deductionSchema = Joi.object({
    employeeRecordId: Joi.string().uuid().required(),
    // Updated to match database constraint: benefit, garnishment, loan, union_dues, pension, insurance, other
    deductionType: Joi.string().valid(
      'benefit', 'insurance', 'pension',
      'garnishment', 'loan', 'union_dues', 'other'
    ).required(),
    deductionName: Joi.string().min(2).max(100).optional(), // Auto-generated if missing
    deductionCode: Joi.string().max(20).allow(null, '').optional(), // Auto-generated if missing
    calculationType: Joi.string().valid('fixed_amount', 'percentage', 'tiered').optional().default('fixed_amount'),
    deductionAmount: Joi.number().min(0).allow(null),
    deductionPercentage: Joi.number().min(0).max(100).allow(null),
    maxPerPayroll: Joi.number().min(0).allow(null),
    maxAnnual: Joi.number().min(0).allow(null),
    isPreTax: Joi.boolean().default(false),
    isRecurring: Joi.boolean().default(true),
    frequency: Joi.string().valid('per_payroll', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'annually').default('per_payroll'),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    isActive: Joi.boolean().default(true),
    priority: Joi.number().integer().min(1).default(1),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== DEDUCTIONS ====================

  /**
   * Create deduction
   * @param {Object} deductionData - Deduction data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the deduction
   * @returns {Promise<Object>} Created deduction
   */
  async createDeduction(deductionData, organizationId, userId) {
    const { error, value } = this.deductionSchema.validate(deductionData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate calculation type and amount/percentage
    if (value.calculationType === 'fixed_amount' && !value.deductionAmount) {
      throw new ValidationError('Deduction amount is required for fixed_amount calculation type');
    }
    if (value.calculationType === 'percentage' && !value.deductionPercentage) {
      throw new ValidationError('Deduction percentage is required for percentage calculation type');
    }

    // Business rule: Validate effective dates
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      throw new ValidationError('Effective to date must be after effective from date');
    }

    try {
      const deduction = await this.deductionRepository.createEmployeeDeduction(
        value,
        organizationId,
        userId
      );

      logger.info('Deduction created', {
        deductionId: deduction.id,
        deductionType: deduction.deduction_type,
        employeeId: deduction.employee_id,
        organizationId
      });

      return deduction;
    } catch (err) {
      logger.error('Error creating deduction', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get deductions by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (deductionType, isActive, etc.)
   * @returns {Promise<Array>} Deductions
   */
  async getDeductionsByOrganization(organizationId, filters = {}) {
    try {
      return await this.deductionRepository.findEmployeeDeductions(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching deductions by organization', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get deductions by employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Employee deductions
   */
  async getDeductionsByEmployee(employeeRecordId, organizationId, filters = {}) {
    try {
      return await this.deductionRepository.findEmployeeDeductions(
        { ...filters, employeeRecordId },
        organizationId
      );
    } catch (err) {
      logger.error('Error fetching deductions by employee', { 
        error: err.message, 
        employeeRecordId,
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Get deduction by ID
   * @param {string} deductionId - Deduction UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Deduction or null
   */
  async getDeductionById(deductionId, organizationId) {
    try {
      return await this.deductionRepository.findEmployeeDeductionById(deductionId, organizationId);
    } catch (err) {
      logger.error('Error fetching deduction by ID', { error: err.message, deductionId, organizationId });
      throw err;
    }
  }

  /**
   * Update deduction
   * @param {string} deductionId - Deduction UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated deduction
   */
  async updateDeduction(deductionId, organizationId, updates, userId) {
    try {
      // Validate the deduction exists
      const existing = await this.deductionRepository.findEmployeeDeductionById(deductionId, organizationId);
      if (!existing) {
        throw new NotFoundError('Deduction not found');
      }

      // Business rule: Validate effective dates if updating
      if (updates.effectiveTo && updates.effectiveFrom && updates.effectiveTo <= updates.effectiveFrom) {
        throw new ValidationError('Effective to date must be after effective from date');
      }

      const updated = await this.deductionRepository.updateEmployeeDeduction(
        deductionId,
        updates,
        organizationId,
        userId
      );

      logger.info('Deduction updated', {
        deductionId,
        organizationId
      });

      return updated;
    } catch (err) {
      logger.error('Error updating deduction', { error: err.message, deductionId, organizationId });
      throw err;
    }
  }

  /**
   * Delete deduction (soft delete)
   * @param {string} deductionId - Deduction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the deduction
   * @returns {Promise<boolean>} Success
   */
  async deleteDeduction(deductionId, organizationId, userId) {
    try {
      // Validate the deduction exists
      const existing = await this.deductionRepository.findEmployeeDeductionById(deductionId, organizationId);
      if (!existing) {
        throw new NotFoundError('Deduction not found');
      }

      await this.deductionRepository.softDeleteEmployeeDeduction(deductionId, organizationId, userId);

      logger.info('Deduction deleted', {
        deductionId,
        organizationId
      });

      return true;
    } catch (err) {
      logger.error('Error deleting deduction', { error: err.message, deductionId, organizationId });
      throw err;
    }
  }

  // ==================== TAX RULE SETS ====================

  /**
   * Create tax rule set
   * @param {Object} ruleSetData - Tax rule set data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the rule set
   * @returns {Promise<Object>} Created tax rule set
   */
  async createTaxRuleSet(ruleSetData, organizationId, userId) {
    const { error, value } = this.taxRuleSetSchema.validate(ruleSetData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate effective dates
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }

    try {
      const ruleSet = await this.taxEngineRepository.createTaxRuleSet(
        value,
        organizationId,
        userId
      );

      logger.info('Tax rule set created', {
        ruleSetId: ruleSet.id,
        taxType: ruleSet.tax_type,
        country: ruleSet.country,
        organizationId
      });

      return ruleSet;
    } catch (err) {
      logger.error('Error creating tax rule set', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get tax rule sets
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Tax rule sets
   */
  async getTaxRuleSets(organizationId, filters = {}) {
    try {
      return await this.taxEngineRepository.findTaxRuleSets(organizationId, filters);
    } catch (err) {
      logger.error('Error fetching tax rule sets', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get tax rule set by ID
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Tax rule set or null
   */
  async getTaxRuleSetById(ruleSetId, organizationId) {
    try {
      return await this.taxEngineRepository.findTaxRuleSetById(ruleSetId, organizationId);
    } catch (err) {
      logger.error('Error fetching tax rule set by ID', { error: err.message, ruleSetId, organizationId });
      throw err;
    }
  }

  /**
   * Update tax rule set
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated tax rule set
   */
  async updateTaxRuleSet(ruleSetId, organizationId, updates) {
    try {
      const existing = await this.taxEngineRepository.findTaxRuleSetById(ruleSetId, organizationId);
      if (!existing) {
        throw new NotFoundError('Tax rule set not found');
      }

      // Business rule: Validate effective dates if updating
      if (updates.effectiveTo && updates.effectiveFrom && updates.effectiveTo <= updates.effectiveFrom) {
        throw new ValidationError('Effective to date must be after effective from date');
      }

      const updated = await this.taxEngineRepository.updateTaxRuleSet(
        ruleSetId,
        updates,
        organizationId
      );

      logger.info('Tax rule set updated', {
        ruleSetId,
        organizationId
      });

      return updated;
    } catch (err) {
      logger.error('Error updating tax rule set', { error: err.message, ruleSetId, organizationId });
      throw err;
    }
  }

  /**
   * Delete tax rule set (soft delete)
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the rule set
   * @returns {Promise<boolean>} Success
   */
  async deleteTaxRuleSet(ruleSetId, organizationId, userId) {
    try {
      const existing = await this.taxEngineRepository.findTaxRuleSetById(ruleSetId, organizationId);
      if (!existing) {
        throw new NotFoundError('Tax rule set not found');
      }

      await this.taxEngineRepository.softDeleteTaxRuleSet(ruleSetId, organizationId, userId);

      logger.info('Tax rule set deleted', {
        ruleSetId,
        organizationId
      });

      return true;
    } catch (err) {
      logger.error('Error deleting tax rule set', { error: err.message, ruleSetId, organizationId });
      throw err;
    }
  }

  /**
   * Get applicable tax rule sets for jurisdiction and date
   * @param {string} country - Country code
   * @param {Date} effectiveDate - Effective date
   * @param {string} organizationId - Organization UUID
   * @param {string} state - Optional state code
   * @param {string} locality - Optional locality
   * @returns {Promise<Array>} Applicable tax rule sets
   */
  async getApplicableTaxRuleSets(country, effectiveDate, organizationId, state = null, locality = null) {
    try {
      return await this.taxEngineRepository.findApplicableTaxRuleSets(
        country,
        effectiveDate,
        organizationId,
        state,
        locality
      );
    } catch (err) {
      logger.error('Error fetching applicable tax rule sets', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== TAX BRACKETS ====================

  /**
   * Create tax bracket
   * @param {Object} bracketData - Tax bracket data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the bracket
   * @returns {Promise<Object>} Created tax bracket
   */
  async createTaxBracket(bracketData, organizationId, userId) {
    const { error, value } = this.taxBracketSchema.validate(bracketData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate income range
    if (value.incomeMax && value.incomeMax <= value.incomeMin) {
      throw new Error('Income max must be greater than income min');
    }

    try {
      const bracket = await this.taxEngineRepository.createTaxBracket(
        value,
        organizationId,
        userId
      );

      logger.info('Tax bracket created', {
        bracketId: bracket.id,
        ruleSetId: bracket.tax_rule_set_id,
        organizationId
      });

      return bracket;
    } catch (err) {
      logger.error('Error creating tax bracket', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Bulk create tax brackets
   * @param {Array} brackets - Array of bracket objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the brackets
   * @returns {Promise<Array>} Created tax brackets
   */
  async bulkCreateTaxBrackets(brackets, organizationId, userId) {
    try {
      // Validate all brackets first
      for (const bracket of brackets) {
        const { error } = this.taxBracketSchema.validate(bracket);
        if (error) {
          throw new ValidationError(error.details[0].message);
        }
      }

      const results = await this.taxEngineRepository.bulkCreateTaxBrackets(
        brackets,
        organizationId,
        userId
      );

      logger.info('Tax brackets bulk created', {
        count: results.length,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error bulk creating tax brackets', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get tax brackets for a tax rule set
   * @param {string} taxRuleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Tax brackets
   */
  async getTaxBrackets(taxRuleSetId, organizationId) {
    try {
      return await this.taxEngineRepository.findTaxBrackets(taxRuleSetId, organizationId);
    } catch (err) {
      logger.error('Error fetching tax brackets', { error: err.message, taxRuleSetId, organizationId });
      throw err;
    }
  }

  /**
   * Update tax bracket
   * @param {string} bracketId - Tax bracket UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated tax bracket
   */
  async updateTaxBracket(bracketId, organizationId, updates) {
    try {
      const existing = await this.taxEngineRepository.findTaxBracketById(bracketId, organizationId);
      if (!existing) {
        throw new NotFoundError('Tax bracket not found');
      }

      // Business rule: Validate income range if updating
      if (updates.incomeMax && updates.incomeMin && updates.incomeMax <= updates.incomeMin) {
        throw new ValidationError('Income max must be greater than income min');
      }

      const updated = await this.taxEngineRepository.updateTaxBracket(
        bracketId,
        updates,
        organizationId
      );

      logger.info('Tax bracket updated', {
        bracketId,
        organizationId
      });

      return updated;
    } catch (err) {
      logger.error('Error updating tax bracket', { error: err.message, bracketId, organizationId });
      throw err;
    }
  }

  /**
   * Delete tax bracket (soft delete)
   * @param {string} bracketId - Tax bracket UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the bracket
   * @returns {Promise<boolean>} Success
   */
  async deleteTaxBracket(bracketId, organizationId, userId) {
    try {
      const existing = await this.taxEngineRepository.findTaxBracketById(bracketId, organizationId);
      if (!existing) {
        throw new NotFoundError('Tax bracket not found');
      }

      await this.taxEngineRepository.softDeleteTaxBracket(bracketId, organizationId, userId);

      logger.info('Tax bracket deleted', {
        bracketId,
        organizationId
      });

      return true;
    } catch (err) {
      logger.error('Error deleting tax bracket', { error: err.message, bracketId, organizationId });
      throw err;
    }
  }

  // ==================== ALLOWANCES ====================

  /**
   * Create allowance
   * @param {Object} allowanceData - Allowance data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the allowance
   * @returns {Promise<Object>} Created allowance
   */
  async createAllowance(allowanceData, organizationId, userId) {
    const { error, value } = this.allowanceSchema.validate(allowanceData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate percentage
    if (value.isPercentage && value.amount > 100) {
      throw new Error('Percentage allowance cannot exceed 100%');
    }

    try {
      const allowance = await this.taxEngineRepository.createAllowance(
        value,
        organizationId,
        userId
      );

      logger.info('Allowance created', {
        allowanceId: allowance.id,
        allowanceType: allowance.allowance_type,
        organizationId
      });

      return allowance;
    } catch (err) {
      logger.error('Error creating allowance', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== TAX CALCULATIONS (MVP) ====================

  /**
   * Calculate employee taxes for pay period (MVP version)
   * @param {string} employeeRecordId - Employee record UUID
   * @param {number} grossPay - Gross pay amount
   * @param {Date} payDate - Pay date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Tax calculation results
   */
  async calculateEmployeeTaxes(employeeRecordId, grossPay, payDate, organizationId) {
    try {
      logger.info('Starting tax calculation', {
        employeeRecordId,
        grossPay,
        payDate,
        organizationId
      });

      // MVP: Simplified Surinamese tax calculation
      const country = 'SR';
      
      // Get applicable tax rule sets
      const taxRuleSets = await this.taxEngineRepository.findApplicableTaxRuleSets(
        country,
        payDate,
        organizationId
      );

      let federalTax = 0; // Surinamese Wage Tax
      let stateTax = 0; // Not applicable for Suriname
      let socialSecurity = 0; // AOV (Old Age Provision)
      let medicare = 0; // AWW (General Widow and Orphan Provision)

      // Calculate Surinamese Wage Tax (progressive brackets)
      const wageTaxRuleSet = taxRuleSets.find(rs => rs.tax_type === 'wage' || rs.tax_type === 'income');
      
      if (wageTaxRuleSet) {
        const brackets = await this.taxEngineRepository.findTaxBrackets(
          wageTaxRuleSet.id,
          organizationId
        );

        if (brackets.length > 0) {
          federalTax = await this.taxEngineRepository.calculateBracketTax(
            grossPay,
            brackets,
            organizationId
          );
        }
      } else {
        // Fallback to default Surinamese wage tax brackets
        const defaultBrackets = await this.taxEngineRepository.getSurinameseWageTaxBrackets(
          new Date().getFullYear(),
          organizationId
        );

        if (defaultBrackets.length > 0) {
          federalTax = await this.taxEngineRepository.calculateBracketTax(
            grossPay,
            defaultBrackets,
            organizationId
          );
        }
      }

      // Calculate AOV (social security) - typically 4% employee + 2% employer
      const aovRuleSet = await this.taxEngineRepository.getSurinameseAOVRate(
        payDate,
        organizationId
      );

      if (aovRuleSet) {
        const aovBrackets = await this.taxEngineRepository.findTaxBrackets(
          aovRuleSet.id,
          organizationId
        );

        if (aovBrackets.length > 0) {
          socialSecurity = await this.taxEngineRepository.calculateFlatRateTax(
            grossPay,
            aovBrackets[0].rate_percentage,
            aovRuleSet.annual_cap,
            organizationId
          );
        }
      }

      // Calculate AWW (medicare equivalent) - typically 1.5% employee
      const awwRuleSet = await this.taxEngineRepository.getSurinameseAWWRate(
        payDate,
        organizationId
      );

      if (awwRuleSet) {
        const awwBrackets = await this.taxEngineRepository.findTaxBrackets(
          awwRuleSet.id,
          organizationId
        );

        if (awwBrackets.length > 0) {
          medicare = await this.taxEngineRepository.calculateFlatRateTax(
            grossPay,
            awwBrackets[0].rate_percentage,
            awwRuleSet.annual_cap,
            organizationId
          );
        }
      }

      // Get applicable allowances
      const allowances = await this.taxEngineRepository.findApplicableAllowances(
        country,
        null, // state - not used for Suriname
        payDate,
        organizationId
      );

      let totalAllowances = 0;
      for (const allowance of allowances) {
        if (allowance.is_percentage) {
          totalAllowances += grossPay * (parseFloat(allowance.amount) / 100);
        } else {
          totalAllowances += parseFloat(allowance.amount);
        }
      }

      // Get pre-tax deductions
      const preTaxDeductions = await this.deductionRepository.findActiveDeductionsForPayroll(
        employeeRecordId,
        payDate,
        organizationId
      );

      let preTaxDeductionAmount = 0;
      for (const deduction of preTaxDeductions.filter(d => d.is_pre_tax)) {
        if (deduction.calculation_type === 'fixed_amount') {
          preTaxDeductionAmount += parseFloat(deduction.deduction_amount || 0);
        } else if (deduction.calculation_type === 'percentage') {
          preTaxDeductionAmount += grossPay * (parseFloat(deduction.deduction_percentage || 0) / 100);
        }
      }

      const totalTaxes = federalTax + stateTax + socialSecurity + medicare;
      const taxableIncome = grossPay - totalAllowances - preTaxDeductionAmount;

      const result = {
        employeeRecordId,
        grossPay,
        taxableIncome,
        federalTax,
        stateTax,
        socialSecurity,
        medicare,
        totalTaxes,
        totalAllowances,
        preTaxDeductions: preTaxDeductionAmount,
        effectiveRate: grossPay > 0 ? (totalTaxes / grossPay) * 100 : 0
      };

      logger.info('Tax calculation completed', {
        employeeRecordId,
        totalTaxes,
        effectiveRate: result.effectiveRate.toFixed(2) + '%',
        organizationId
      });

      return result;

    } catch (err) {
      logger.error('Error calculating employee taxes', { 
        error: err.message, 
        employeeRecordId,
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Calculate year-to-date tax summary for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {number} year - Tax year
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} YTD tax summary
   */
  async getYearToDateTaxSummary(employeeRecordId, year, organizationId) {
    try {
      // This would query paycheck history for the year
      // MVP: Return simple structure, to be implemented with actual paycheck data
      
      logger.info('Fetching YTD tax summary', {
        employeeRecordId,
        year,
        organizationId
      });

      return {
        employeeRecordId,
        year,
        ytdGrossPay: 0,
        ytdFederalTax: 0,
        ytdStateTax: 0,
        ytdSocialSecurity: 0,
        ytdMedicare: 0,
        ytdTotalTaxes: 0,
        message: 'MVP: YTD calculation requires paycheck history integration'
      };

    } catch (err) {
      logger.error('Error fetching YTD tax summary', { 
        error: err.message, 
        employeeRecordId,
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Setup default Surinamese tax rules for organization
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User setting up the rules
   * @returns {Promise<Object>} Setup results
   */
  async setupSurinameseTaxRules(organizationId, userId) {
    try {
      logger.info('Setting up default Surinamese tax rules', { organizationId });

      const results = {
        wageTaxRuleSet: null,
        aovRuleSet: null,
        awwRuleSet: null,
        brackets: []
      };

      // Create Wage Tax rule set
      const wageTaxRuleSet = await this.createTaxRuleSet(
        {
          taxType: 'wage',
          taxName: 'Surinamese Wage Tax',
          country: 'SR',
          effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
          isActive: true,
          calculationMethod: 'bracket',
          description: 'Progressive wage tax for Suriname'
        },
        organizationId,
        userId
      );
      results.wageTaxRuleSet = wageTaxRuleSet;

      // Create wage tax brackets (2024 rates - example)
      const wageTaxBrackets = [
        { bracketOrder: 1, incomeMin: 0, incomeMax: 10000, ratePercentage: 8, fixedAmount: 0 },
        { bracketOrder: 2, incomeMin: 10000, incomeMax: 25000, ratePercentage: 15, fixedAmount: 800 },
        { bracketOrder: 3, incomeMin: 25000, incomeMax: 50000, ratePercentage: 25, fixedAmount: 3050 },
        { bracketOrder: 4, incomeMin: 50000, incomeMax: null, ratePercentage: 36, fixedAmount: 9300 }
      ];

      for (const bracket of wageTaxBrackets) {
        const created = await this.createTaxBracket(
          { ...bracket, taxRuleSetId: wageTaxRuleSet.id },
          organizationId,
          userId
        );
        results.brackets.push(created);
      }

      // Create AOV rule set (4% employee)
      const aovRuleSet = await this.createTaxRuleSet(
        {
          taxType: 'social_security',
          taxName: 'AOV (Old Age Provision)',
          country: 'SR',
          effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
          isActive: true,
          calculationMethod: 'flat_rate',
          description: 'Social security contribution - employee portion'
        },
        organizationId,
        userId
      );
      results.aovRuleSet = aovRuleSet;

      await this.createTaxBracket(
        {
          taxRuleSetId: aovRuleSet.id,
          bracketOrder: 1,
          incomeMin: 0,
          incomeMax: null,
          ratePercentage: 4,
          fixedAmount: 0
        },
        organizationId,
        userId
      );

      // Create AWW rule set (1.5% employee)
      const awwRuleSet = await this.createTaxRuleSet(
        {
          taxType: 'medicare',
          taxName: 'AWW (General Widow and Orphan Provision)',
          country: 'SR',
          effectiveFrom: new Date(new Date().getFullYear(), 0, 1),
          isActive: true,
          calculationMethod: 'flat_rate',
          description: 'Widow and orphan provision - employee portion'
        },
        organizationId,
        userId
      );
      results.awwRuleSet = awwRuleSet;

      await this.createTaxBracket(
        {
          taxRuleSetId: awwRuleSet.id,
          bracketOrder: 1,
          incomeMin: 0,
          incomeMax: null,
          ratePercentage: 1.5,
          fixedAmount: 0
        },
        organizationId,
        userId
      );

      logger.info('Surinamese tax rules setup completed', {
        organizationId,
        ruleSetCount: 3,
        bracketCount: results.brackets.length + 2
      });

      return results;

    } catch (err) {
      logger.error('Error setting up Surinamese tax rules', { error: err.message, organizationId });
      throw err;
    }
  }
}

// Export singleton instance
export default new TaxCalculationService();
