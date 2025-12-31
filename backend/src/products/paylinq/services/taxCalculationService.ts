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
import type { TaxRuleSetData, TaxBracketData, AllowanceData, DeductionData, TaxCalculationParams, TaxBreakdown } from '../../../types/paylinq.types.js';
import TaxEngineRepository from '../repositories/taxEngineRepository.js';
import DeductionRepository from '../repositories/deductionRepository.js';
import AllowanceService from './AllowanceService.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import { query } from '../../../config/database.js';

class TaxCalculationService {
  taxEngineRepository: TaxEngineRepository;
  deductionRepository: DeductionRepository;
  allowanceService: AllowanceService;
  taxRuleSetSchema: Joi.ObjectSchema;
  taxBracketSchema: Joi.ObjectSchema;
  allowanceSchema: Joi.ObjectSchema;
  deductionSchema: Joi.ObjectSchema;
  calculationSchema: Joi.ObjectSchema;

  /**
   * @param taxEngineRepository - Optional for testing
   * @param deductionRepository - Optional for testing
   * @param allowanceService - Optional for testing
   */
  constructor(
    taxEngineRepository: TaxEngineRepository | null = null,
    deductionRepository: DeductionRepository | null = null,
    allowanceService: AllowanceService | null = null
  ) {
    this.taxEngineRepository = taxEngineRepository || new TaxEngineRepository();
    this.deductionRepository = deductionRepository || new DeductionRepository();
    this.allowanceService = allowanceService || new AllowanceService();
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
   * Fetch employee residence status from HRIS
   * Per Wet Loonbelasting Article 13.1a: Residence status affects tax-free allowance eligibility
   * 
   * @param {string} employeeRecordId - Worker metadata ID (payroll.worker_metadata.id)
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<boolean>} True if employee is Suriname resident, false otherwise
   * @private
   */
  async _getEmployeeResidenceStatus(employeeRecordId, organizationId) {
    try {
      const result = await query(
        `SELECT e.is_suriname_resident, e.national_id
         FROM hris.employee e
         INNER JOIN payroll.worker_metadata wm ON e.id = wm.employee_id
         WHERE wm.id = $1
           AND wm.organization_id = $2
           AND wm.deleted_at IS NULL
           AND e.deleted_at IS NULL`,
        [employeeRecordId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'employee',
          userId: null
        }
      );

      if (result.rows.length === 0) {
        logger.warn('Employee not found for residence status check', {
          employeeRecordId,
          organizationId
        });
        // Default to resident if employee not found (safer default for tax calculation)
        return { isSurinameResident: true, nationalId: null };
      }

      return {
        isSurinameResident: result.rows[0].is_suriname_resident,
        nationalId: result.rows[0].national_id
      };
    } catch (_error) {
      logger.error('Error fetching employee residence status', {
        error: error.message,
        employeeRecordId,
        organizationId
      });
      // Default to resident on error (safer default)
      return true;
    }
  }

  /**
   * Calculate employee taxes for pay period (MVP version)
   * @param {string} employeeRecordId - Employee record UUID
   * @param {number} grossPay - Gross pay amount
   * @param {Date} payDate - Pay date
   * @param {string} payPeriod - Pay period (monthly, biweekly, etc.)
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Tax calculation results including taxFreeAllowance and taxableIncome
   */
  async calculateEmployeeTaxes(employeeRecordId, grossPay, payDate, payPeriod, organizationId) {
    try {
      logger.info('Starting tax calculation', {
        employeeRecordId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      });

      // PHASE 1: Fetch employee residence status (Article 13.1a requirement)
      const isResident = await this._getEmployeeResidenceStatus(employeeRecordId, organizationId);
      
      logger.info('Employee residence status determined', {
        employeeRecordId,
        isResident,
        organizationId
      });

      // PHASE 2: Calculate tax-free allowance using AllowanceService
      // Pass residence status - non-residents do NOT receive tax-free allowance
      const taxFreeAllowance = await this.allowanceService.calculateTaxFreeAllowance(
        grossPay,
        payDate,
        payPeriod,
        organizationId,
        isResident  // Critical: Per Article 13.1a
      );

      // Calculate taxable income (gross pay minus tax-free allowance)
      const taxableIncome = Math.max(0, grossPay - taxFreeAllowance);

      logger.info('Tax-free allowance calculated', {
        grossPay,
        taxFreeAllowance,
        taxableIncome,
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
      const stateTax = 0; // Not applicable for Suriname
      let socialSecurity = 0; // AOV (Old Age Provision)
      let medicare = 0; // AWW (General Widow and Orphan Provision)

      // Calculate Surinamese Wage Tax (progressive brackets) on TAXABLE INCOME
      const wageTaxRuleSet = taxRuleSets.find(rs => rs.tax_type === 'wage' || rs.tax_type === 'income');
      
      if (wageTaxRuleSet) {
        const brackets = await this.taxEngineRepository.findTaxBrackets(
          wageTaxRuleSet.id,
          organizationId
        );

        if (brackets.length > 0) {
          federalTax = await this.taxEngineRepository.calculateBracketTax(
            taxableIncome, // Use taxableIncome instead of grossPay
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
            taxableIncome, // Use taxableIncome instead of grossPay
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
            taxableIncome, // Use taxableIncome instead of grossPay
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
            taxableIncome, // Use taxableIncome instead of grossPay
            awwBrackets[0].rate_percentage,
            awwRuleSet.annual_cap,
            organizationId
          );
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

      const result = {
        employeeRecordId,
        grossPay,
        taxFreeAllowance, // PHASE 1: Return tax-free allowance
        taxableIncome,    // PHASE 1: Return taxable income
        federalTax,
        stateTax,
        socialSecurity,
        medicare,
        totalTaxes,
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
   * Resolve tax calculation mode for a tax rule set
   * 
   * Determines which calculation mode to use based on explicit configuration
   * or smart defaults based on calculation method.
   * 
   * @param {Object|null} taxRuleSet - Tax rule set with calculation_mode
   * @returns {string} Calculation mode: 'aggregated', 'component_based', or 'proportional_distribution'
   * @private
   */
  _resolveTaxCalculationMode(taxRuleSet) {
    if (!taxRuleSet) {
      return 'proportional_distribution'; // System default
    }

    // Use explicit mode if set
    if (taxRuleSet.calculation_mode) {
      return taxRuleSet.calculation_mode;
    }

    // Smart defaults based on calculation method
    if (taxRuleSet.calculation_method === 'bracket') {
      // Progressive taxes should use proportional distribution
      return 'proportional_distribution';
    } else if (taxRuleSet.calculation_method === 'flat_rate') {
      // Flat-rate taxes can use component-based
      return 'component_based';
    }

    // Fallback
    return 'proportional_distribution';
  }

  /**
   * Calculate taxes for employee with component-based approach (PHASE 2/2B)
   * 
   * Phase 2: Each earning component is taxed separately with component-specific allowances.
   * Phase 2B: Tax calculation mode configurable per tax type (proportional_distribution, component_based, aggregated).
   * 
   * Example: Regular salary uses monthly tax-free sum, Holiday allowance uses holiday cap.
   * 
   * @param {string} employeeRecordId - Employee record UUID
   * @param {Array<Object>} components - Earning components with metadata
   *   @param {string} components[].componentCode - e.g., 'REGULAR_SALARY', 'VAKANTIEGELD'
   *   @param {string} components[].componentName - Display name
   *   @param {number} components[].amount - Component amount
   *   @param {boolean} components[].isTaxable - Whether this component is taxable
   *   @param {string} components[].allowanceType - 'tax_free_sum_monthly', 'holiday_allowance', 'bonus_gratuity', null
   * @param {Date} payDate - Pay date
   * @param {string} payPeriod - 'monthly', 'biweekly', etc.
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Component-based tax calculation result
   *   @returns {Object} result.summary - Aggregate totals with calculation modes
   *   @returns {Array<Object>} result.componentTaxes - Tax breakdown per component
   */
  async calculateEmployeeTaxesWithComponents(employeeRecordId, components, payDate, payPeriod, organizationId) {
    try {
      console.log('=== TAX CALCULATION DEBUG ===');
      console.log('Employee Record ID:', employeeRecordId);
      console.log('Components:', JSON.stringify(components, null, 2));
      console.log('Pay Date:', payDate);
      console.log('Pay Period:', payPeriod);
      console.log('Organization ID:', organizationId);
      
      logger.info('Starting component-based tax calculation', {
        employeeRecordId,
        componentCount: components.length,
        payDate,
        payPeriod,
        organizationId
      });

      // Validate inputs
      if (!components || components.length === 0) {
        throw new ValidationError('At least one component required for tax calculation');
      }

      if (!organizationId) {
        throw new ValidationError('organizationId is required for tax calculation');
      }

      const componentTaxes = [];
      let totalGrossPay = 0;
      let totalTaxFreeAllowance = 0;
      let totalTaxableIncome = 0;

      // Get tax rule sets once (reused for all components)
      const country = 'SR';
      const taxRuleSets = await this.taxEngineRepository.findApplicableTaxRuleSets(
        country,
        payDate,
        organizationId
      );

      console.log('Tax Rule Sets Found:', taxRuleSets?.length || 0);
      console.log('Tax Rule Sets:', JSON.stringify(taxRuleSets, null, 2));

      const wageTaxRuleSet = taxRuleSets.find(rs => rs.tax_type === 'wage' || rs.tax_type === 'income');
      const aovRuleSet = await this.taxEngineRepository.getSurinameseAOVRate(payDate, organizationId);
      const awwRuleSet = await this.taxEngineRepository.getSurinameseAWWRate(payDate, organizationId);

      console.log('Wage Tax Rule Set:', wageTaxRuleSet ? 'FOUND' : 'NOT FOUND');
      console.log('AOV Rule Set:', aovRuleSet ? 'FOUND' : 'NOT FOUND');
      console.log('AWW Rule Set:', awwRuleSet ? 'FOUND' : 'NOT FOUND');

      // Determine calculation modes for each tax type
      const wageTaxMode = this._resolveTaxCalculationMode(wageTaxRuleSet);
      const aovMode = this._resolveTaxCalculationMode(aovRuleSet);
      const awwMode = this._resolveTaxCalculationMode(awwRuleSet);

      // Get tax brackets once
      let wageTaxBrackets = [];
      if (wageTaxRuleSet) {
        wageTaxBrackets = await this.taxEngineRepository.findTaxBrackets(wageTaxRuleSet.id, organizationId);
      } else {
        wageTaxBrackets = await this.taxEngineRepository.getSurinameseWageTaxBrackets(
          new Date().getFullYear(),
          organizationId
        );
      }

      console.log('Wage Tax Brackets Found:', wageTaxBrackets?.length || 0);
      console.log('Wage Tax Brackets:', JSON.stringify(wageTaxBrackets, null, 2));

      const aovBrackets = aovRuleSet ? await this.taxEngineRepository.findTaxBrackets(aovRuleSet.id, organizationId) : [];
      const awwBrackets = awwRuleSet ? await this.taxEngineRepository.findTaxBrackets(awwRuleSet.id, organizationId) : [];

      console.log('AOV Brackets Found:', aovBrackets?.length || 0);
      console.log('AWW Brackets Found:', awwBrackets?.length || 0);

      // STEP 1: Calculate allowances and taxable income per component
      for (const component of components) {
        const componentAmount = parseFloat(component.amount) || 0;
        totalGrossPay += componentAmount;

        // Skip non-taxable components
        if (!component.isTaxable) {
          componentTaxes.push({
            componentCode: component.componentCode,
            componentName: component.componentName,
            amount: componentAmount,
            isTaxable: false,
            taxFreeAllowance: 0,
            taxableIncome: 0,
            wageTax: 0,
            aovTax: 0,
            awwTax: 0,
            totalTax: 0,
            calculationMetadata: {
              note: 'Component marked as non-taxable'
            }
          });
          continue;
        }

        // Apply component-specific tax-free allowance
        let taxFreeAllowance = 0;

        if (component.allowanceType) {
          // Use AllowanceService for allowance lookup and application
          if (component.allowanceType === 'tax_free_sum_monthly' || component.allowanceType === 'tax_free_sum_annual') {
            taxFreeAllowance = await this.allowanceService.calculateTaxFreeAllowance(
              componentAmount,
              payDate,
              payPeriod,
              organizationId
            );
          } else if (component.allowanceType === 'holiday_allowance') {
            // Holiday allowance: Apply yearly cap via AllowanceService
            const year = new Date(payDate).getFullYear();
            const holidayResult = await this.allowanceService.applyHolidayAllowance(
              employeeRecordId,
              componentAmount,
              year,
              organizationId
            );
            taxFreeAllowance = holidayResult.appliedAmount;
          } else if (component.allowanceType === 'bonus_gratuity') {
            // Bonus allowance: Apply yearly cap via AllowanceService
            const year = new Date(payDate).getFullYear();
            const bonusResult = await this.allowanceService.applyBonusAllowance(
              employeeRecordId,
              componentAmount,
              year,
              organizationId
            );
            taxFreeAllowance = bonusResult.appliedAmount;
          }
        }

        const taxableIncome = Math.max(0, componentAmount - taxFreeAllowance);

        totalTaxFreeAllowance += taxFreeAllowance;
        totalTaxableIncome += taxableIncome;

        // Store component with allowance info (taxes calculated in next step)
        componentTaxes.push({
          componentCode: component.componentCode,
          componentName: component.componentName,
          amount: componentAmount,
          isTaxable: true,
          taxFreeAllowance,
          taxableIncome,
          wageTax: 0, // Calculated in step 2
          aovTax: 0,  // Calculated in step 2
          awwTax: 0,  // Calculated in step 2
          totalTax: 0,
          calculationMetadata: {
            allowanceType: component.allowanceType || null
          }
        });
      }

      // STEP 2: Calculate taxes based on mode
      let totalWageTax = 0;
      let totalAovTax = 0;
      let totalAwwTax = 0;

      // 2A: Wage Tax Calculation
      if (wageTaxMode === 'proportional_distribution' || wageTaxMode === 'aggregated') {
        // Calculate wage tax on TOTAL taxable income (correct for progressive)
        if (totalTaxableIncome > 0 && wageTaxBrackets.length > 0) {
          totalWageTax = await this.taxEngineRepository.calculateBracketTax(
            totalTaxableIncome,
            wageTaxBrackets,
            organizationId
          );

          // Distribute proportionally to components
          if (wageTaxMode === 'proportional_distribution') {
            for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
              const proportion = componentTax.taxableIncome / totalTaxableIncome;
              componentTax.wageTax = Math.round(totalWageTax * proportion * 100) / 100;
              componentTax.calculationMetadata.wageTaxProportion = proportion;
              componentTax.calculationMetadata.wageTaxCalculationMode = 'proportional_distribution';
            }
          }
        }
      } else if (wageTaxMode === 'component_based') {
        // Calculate wage tax per component (ONLY valid for flat-rate!)
        logger.warn('Component-based wage tax calculation used for progressive tax', {
          taxRuleSetId: wageTaxRuleSet?.id,
          organizationId
        });

        for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
          if (wageTaxBrackets.length > 0) {
            componentTax.wageTax = await this.taxEngineRepository.calculateBracketTax(
              componentTax.taxableIncome,
              wageTaxBrackets,
              organizationId
            );
            componentTax.calculationMetadata.wageTaxCalculationMode = 'component_based';
            totalWageTax += componentTax.wageTax;
          }
        }
      }

      // 2B: AOV Tax Calculation
      if (aovMode === 'component_based') {
        // Calculate per component (mathematically valid for flat-rate)
        if (aovBrackets.length > 0 && aovBrackets[0].rate_percentage) {
          for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
            componentTax.aovTax = await this.taxEngineRepository.calculateFlatRateTax(
              componentTax.taxableIncome,
              aovBrackets[0].rate_percentage,
              aovRuleSet?.annual_cap || null,
              organizationId
            );
            componentTax.calculationMetadata.aovCalculationMode = 'component_based';
            totalAovTax += componentTax.aovTax;
          }
        }
      } else if (aovMode === 'proportional_distribution' || aovMode === 'aggregated') {
        // Calculate on total, distribute proportionally
        if (totalTaxableIncome > 0 && aovBrackets.length > 0 && aovBrackets[0].rate_percentage) {
          totalAovTax = await this.taxEngineRepository.calculateFlatRateTax(
            totalTaxableIncome,
            aovBrackets[0].rate_percentage,
            aovRuleSet?.annual_cap || null,
            organizationId
          );

          if (aovMode === 'proportional_distribution') {
            for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
              const proportion = componentTax.taxableIncome / totalTaxableIncome;
              componentTax.aovTax = Math.round(totalAovTax * proportion * 100) / 100;
              componentTax.calculationMetadata.aovCalculationMode = 'proportional_distribution';
            }
          }
        }
      }

      // 2C: AWW Tax Calculation (same logic as AOV)
      if (awwMode === 'component_based') {
        if (awwBrackets.length > 0 && awwBrackets[0].rate_percentage) {
          for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
            componentTax.awwTax = await this.taxEngineRepository.calculateFlatRateTax(
              componentTax.taxableIncome,
              awwBrackets[0].rate_percentage,
              awwRuleSet?.annual_cap || null,
              organizationId
            );
            componentTax.calculationMetadata.awwCalculationMode = 'component_based';
            totalAwwTax += componentTax.awwTax;
          }
        }
      } else if (awwMode === 'proportional_distribution' || awwMode === 'aggregated') {
        if (totalTaxableIncome > 0 && awwBrackets.length > 0 && awwBrackets[0].rate_percentage) {
          totalAwwTax = await this.taxEngineRepository.calculateFlatRateTax(
            totalTaxableIncome,
            awwBrackets[0].rate_percentage,
            awwRuleSet?.annual_cap || null,
            organizationId
          );

          if (awwMode === 'proportional_distribution') {
            for (const componentTax of componentTaxes.filter(c => c.isTaxable && c.taxableIncome > 0)) {
              const proportion = componentTax.taxableIncome / totalTaxableIncome;
              componentTax.awwTax = Math.round(totalAwwTax * proportion * 100) / 100;
              componentTax.calculationMetadata.awwCalculationMode = 'proportional_distribution';
            }
          }
        }
      }

      // STEP 3: Calculate component totals and enrich metadata
      for (const componentTax of componentTaxes.filter(c => c.isTaxable)) {
        componentTax.totalTax = componentTax.wageTax + componentTax.aovTax + componentTax.awwTax;
        componentTax.calculationMetadata.payDate = payDate.toISOString();
        componentTax.calculationMetadata.taxRulesApplied = {
          wageTaxRuleSet: wageTaxRuleSet?.tax_name || 'Default Surinamese Wage Tax',
          wageTaxMode,
          aovRate: aovBrackets[0]?.rate_percentage || null,
          aovMode,
          awwRate: awwBrackets[0]?.rate_percentage || null,
          awwMode
        };

        logger.debug('Component tax calculated', {
          componentCode: componentTax.componentCode,
          amount: componentTax.amount,
          taxFreeAllowance: componentTax.taxFreeAllowance,
          taxableIncome: componentTax.taxableIncome,
          totalTax: componentTax.totalTax,
          organizationId
        });
      }

      // STEP 4: Build result with calculation modes
      const totalTaxes = totalWageTax + totalAovTax + totalAwwTax;
      const effectiveRate = totalGrossPay > 0 ? (totalTaxes / totalGrossPay) * 100 : 0;

      const result = {
        employeeRecordId,
        payDate,
        payPeriod,
        summary: {
          totalGrossPay,
          totalTaxFreeAllowance,
          totalTaxableIncome,
          totalWageTax,
          totalAovTax,
          totalAwwTax,
          totalTaxes,
          effectiveRate,
          componentCount: components.length,
          calculationModes: {
            wageTax: wageTaxMode,
            aov: aovMode,
            aww: awwMode
          }
        },
        componentTaxes,
        calculatedAt: new Date().toISOString()
      };

      logger.info('Component-based tax calculation completed', {
        employeeRecordId,
        totalGrossPay,
        totalTaxes,
        effectiveRate: effectiveRate.toFixed(2) + '%',
        componentCount: components.length,
        calculationModes: result.summary.calculationModes,
        organizationId
      });

      return result;

    } catch (err) {
      logger.error('Error in component-based tax calculation', {
        error: err.message,
        stack: err.stack,
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
   * Setup monthly tax-free allowance (€9,000 until Dec 31, 2025)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User setting up the allowance
   * @returns {Promise<Object>} Created allowance
   */
  async setupMonthlyTaxFreeAllowance(organizationId, userId) {
    try {
      logger.info('Setting up monthly tax-free allowance (€9,000 until Dec 31, 2025)', { organizationId });

      const allowance = await this.createAllowance(
        {
          allowanceType: 'standard',
          allowanceName: 'Monthly Tax-Free Allowance',
          country: 'SR',
          amount: 9000,
          isPercentage: false,
          effectiveFrom: new Date('2025-01-01'),
          effectiveTo: new Date('2025-12-31'),
          isActive: true,
          description: 'Monthly tax-free allowance of €9,000 valid until December 31, 2025'
        },
        organizationId,
        userId
      );

      logger.info('Monthly tax-free allowance created', {
        allowanceId: allowance.id,
        amount: 9000,
        validUntil: '2025-12-31',
        organizationId
      });

      return allowance;
    } catch (err) {
      logger.error('Error setting up monthly tax-free allowance', { error: err.message, organizationId });
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
        brackets: [],
        monthlyTaxFreeAllowance: null
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

  // ==================== TAX RULE VERSIONING ====================

  /**
   * Joi validation schema for creating new tax rule version
   */
  static get createVersionSchema() {
    return Joi.object({
      versionType: Joi.string()
        .valid('major', 'minor', 'patch')
        .required()
        .messages({
          'any.only': 'Version type must be major, minor, or patch'
        }),
      changeSummary: Joi.string()
        .required()
        .trim()
        .min(10)
        .max(500)
        .messages({
          'string.min': 'Change summary must be at least 10 characters',
          'string.max': 'Change summary cannot exceed 500 characters'
        }),
      effectiveFrom: Joi.date()
        .min('now')
        .required()
        .messages({
          'date.min': 'Effective date must be in the future'
        }),
      breakingChanges: Joi.boolean().default(false),
      migrationNotes: Joi.string().allow('', null).max(1000)
    });
  }

  /**
   * Create new version of tax rule set
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {Object} versionData - Version creation data
   * @param {string} versionData.versionType - Type: 'major', 'minor', 'patch'
   * @param {string} versionData.changeSummary - Summary of changes
   * @param {Date} versionData.effectiveFrom - When version becomes effective
   * @param {boolean} versionData.breakingChanges - Whether contains breaking changes
   * @param {string} versionData.migrationNotes - Optional migration notes
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} New versioned tax rule set
   */
  async createNewTaxRuleVersion(ruleSetId, versionData, organizationId, userId) {
    try {
      // Validate input
      const { error, value } = TaxCalculationService.createVersionSchema.validate(versionData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Get source rule set with all rules and brackets
      const sourceRuleSet = await this.taxEngineRepository.findTaxRuleSetByIdWithDetails(ruleSetId, organizationId);
      if (!sourceRuleSet) {
        throw new NotFoundError('Source tax rule set not found');
      }

      // Only published rule sets can be versioned
      if (!sourceRuleSet.is_published) {
        throw new ValidationError('Only published tax rule sets can be versioned');
      }

      // Calculate new version numbers
      const { versionType } = value;
      let newMajor = sourceRuleSet.version_major;
      let newMinor = sourceRuleSet.version_minor;
      let newPatch = sourceRuleSet.version_patch;

      if (versionType === 'major') {
        newMajor += 1;
        newMinor = 0;
        newPatch = 0;
      } else if (versionType === 'minor') {
        newMinor += 1;
        newPatch = 0;
      } else {
        newPatch += 1;
      }

      // Create new rule set version
      const newRuleSetData = {
        ruleSetCode: sourceRuleSet.rule_set_code,
        ruleSetName: sourceRuleSet.rule_set_name,
        description: sourceRuleSet.description,
        taxType: sourceRuleSet.tax_type,
        jurisdiction: sourceRuleSet.jurisdiction,
        versionMajor: newMajor,
        versionMinor: newMinor,
        versionPatch: newPatch,
        isDraft: true,  // New version starts as draft
        isPublished: false,
        isArchived: false,
        effectiveFrom: value.effectiveFrom,
        effectiveTo: null,
        priority: sourceRuleSet.priority,
        metadata: {
          ...sourceRuleSet.metadata,
          versionNotes: value.changeSummary,
          migrationNotes: value.migrationNotes,
          breakingChanges: value.breakingChanges,
          sourceVersion: `${sourceRuleSet.version_major}.${sourceRuleSet.version_minor}.${sourceRuleSet.version_patch}`,
          createdFromRuleSetId: sourceRuleSet.id
        }
      };

      const newRuleSet = await this.taxEngineRepository.createTaxRuleSet(newRuleSetData, organizationId, userId);

      // Copy all tax rules from source
      if (sourceRuleSet.taxRules) {
        for (const rule of sourceRuleSet.taxRules) {
          const ruleData = {
            ruleSetId: newRuleSet.id,
            ruleCode: rule.rule_code,
            ruleName: rule.rule_name,
            description: rule.description,
            ruleType: rule.rule_type,
            conditions: rule.conditions,
            priority: rule.priority,
            isActive: rule.is_active
          };

          const newRule = await this.taxEngineRepository.createTaxRule(ruleData, organizationId, userId);

          // Copy tax brackets for this rule
          if (rule.taxBrackets) {
            for (const bracket of rule.taxBrackets) {
              const bracketData = {
                taxRuleId: newRule.id,
                bracketOrder: bracket.bracket_order,
                incomeMin: bracket.income_min,
                incomeMax: bracket.income_max,
                taxRate: bracket.tax_rate,
                flatAmount: bracket.flat_amount,
                calculationMethod: bracket.calculation_method,
                isActive: bracket.is_active
              };

              await this.taxEngineRepository.createTaxBracket(bracketData, organizationId, userId);
            }
          }
        }
      }

      // Add version history entry
      await this.taxEngineRepository.addVersionHistoryEntry({
        ruleSetId: newRuleSet.id,
        fromVersion: `${sourceRuleSet.version_major}.${sourceRuleSet.version_minor}.${sourceRuleSet.version_patch}`,
        toVersion: `${newMajor}.${newMinor}.${newPatch}`,
        changeType: `${versionType}_update`,
        changeSummary: value.changeSummary,
        breakingChanges: value.breakingChanges,
        migrationNotes: value.migrationNotes,
        sourceRuleSetId: sourceRuleSet.id
      }, organizationId, userId);

      logger.info('New tax rule set version created', {
        sourceRuleSetId: ruleSetId,
        newRuleSetId: newRuleSet.id,
        fromVersion: `${sourceRuleSet.version_major}.${sourceRuleSet.version_minor}.${sourceRuleSet.version_patch}`,
        toVersion: `${newMajor}.${newMinor}.${newPatch}`,
        versionType,
        organizationId,
        userId
      });

      return newRuleSet;

    } catch (err) {
      logger.error('Error creating new tax rule version', {
        error: err.message,
        ruleSetId,
        organizationId,
        versionData
      });
      throw err;
    }
  }

  /**
   * Get version history for tax rule set
   * @param {string} ruleSetCode - Tax rule set code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Version history with details
   */
  async getTaxRuleVersionHistory(ruleSetCode, organizationId) {
    try {
      const versions = await this.taxEngineRepository.findTaxRuleVersionHistory(ruleSetCode, organizationId);

      return versions.map(version => ({
        id: version.id,
        version: `${version.version_major}.${version.version_minor}.${version.version_patch}`,
        versionMajor: version.version_major,
        versionMinor: version.version_minor,
        versionPatch: version.version_patch,
        status: version.is_published ? 'published' : version.is_archived ? 'archived' : 'draft',
        effectiveFrom: version.effective_from,
        effectiveTo: version.effective_to,
        createdAt: version.created_at,
        createdBy: version.created_by,
        createdByName: version.created_by_name,
        changeSummary: version.metadata?.versionNotes || null,
        breakingChanges: version.metadata?.breakingChanges || false,
        migrationNotes: version.metadata?.migrationNotes || null,
        ruleCount: version.rule_count || 0,
        bracketCount: version.bracket_count || 0
      }));

    } catch (err) {
      logger.error('Error getting tax rule version history', {
        error: err.message,
        ruleSetCode,
        organizationId
      });
      throw err;
    }
  }

  /**
   * Publish draft tax rule set version
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Published tax rule set
   */
  async publishTaxRuleVersion(ruleSetId, organizationId, userId) {
    try {
      const ruleSet = await this.taxEngineRepository.findTaxRuleSetById(ruleSetId, organizationId);
      if (!ruleSet) {
        throw new NotFoundError('Tax rule set not found');
      }

      if (!ruleSet.is_draft) {
        throw new ValidationError('Only draft rule sets can be published');
      }

      if (ruleSet.is_published || ruleSet.is_archived) {
        throw new ValidationError('Rule set is already published or archived');
      }

      // Validate rule set has at least one active tax rule
      const ruleCount = await this.taxEngineRepository.getActiveRuleCountForRuleSet(ruleSetId, organizationId);
      if (ruleCount === 0) {
        throw new ValidationError('Cannot publish rule set without active tax rules');
      }

      // Archive any other published version of the same rule set code for the same effective period
      await this.taxEngineRepository.archiveOverlappingRuleSets(
        ruleSet.rule_set_code,
        ruleSet.effective_from,
        ruleSet.effective_to,
        organizationId,
        userId
      );

      // Publish the rule set
      const publishedRuleSet = await this.taxEngineRepository.publishTaxRuleSet(ruleSetId, organizationId, userId);

      logger.info('Tax rule set version published', {
        ruleSetId,
        version: `${ruleSet.version_major}.${ruleSet.version_minor}.${ruleSet.version_patch}`,
        ruleSetCode: ruleSet.rule_set_code,
        effectiveFrom: ruleSet.effective_from,
        organizationId,
        userId
      });

      return publishedRuleSet;

    } catch (err) {
      logger.error('Error publishing tax rule version', {
        error: err.message,
        ruleSetId,
        organizationId
      });
      throw err;
    }
  }

  /**
   * Archive tax rule set version
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} archiveReason - Reason for archiving
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Archived tax rule set
   */
  async archiveTaxRuleVersion(ruleSetId, archiveReason, organizationId, userId) {
    try {
      const ruleSet = await this.taxEngineRepository.findTaxRuleSetById(ruleSetId, organizationId);
      if (!ruleSet) {
        throw new NotFoundError('Tax rule set not found');
      }

      if (ruleSet.is_archived) {
        throw new ValidationError('Tax rule set is already archived');
      }

      // Archive the rule set
      const archivedRuleSet = await this.taxEngineRepository.archiveTaxRuleSet(
        ruleSetId,
        archiveReason,
        organizationId,
        userId
      );

      logger.info('Tax rule set version archived', {
        ruleSetId,
        version: `${ruleSet.version_major}.${ruleSet.version_minor}.${ruleSet.version_patch}`,
        ruleSetCode: ruleSet.rule_set_code,
        reason: archiveReason,
        organizationId,
        userId
      });

      return archivedRuleSet;

    } catch (err) {
      logger.error('Error archiving tax rule version', {
        error: err.message,
        ruleSetId,
        organizationId
      });
      throw err;
    }
  }

  /**
   * Compare two tax rule set versions
   * @param {string} fromRuleSetId - Source rule set UUID
   * @param {string} toRuleSetId - Target rule set UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Comparison result
   */
  async compareTaxRuleVersions(fromRuleSetId, toRuleSetId, organizationId) {
    try {
      const [fromRuleSet, toRuleSet] = await Promise.all([
        this.taxEngineRepository.findTaxRuleSetByIdWithDetails(fromRuleSetId, organizationId),
        this.taxEngineRepository.findTaxRuleSetByIdWithDetails(toRuleSetId, organizationId)
      ]);

      if (!fromRuleSet || !toRuleSet) {
        throw new NotFoundError('One or both tax rule sets not found');
      }

      // Compare basic properties
      const propertyChanges = [];
      const checkFields = [
        'rule_set_name', 'description', 'tax_type', 'jurisdiction',
        'effective_from', 'effective_to', 'priority'
      ];

      for (const field of checkFields) {
        if (fromRuleSet[field] !== toRuleSet[field]) {
          propertyChanges.push({
            field,
            from: fromRuleSet[field],
            to: toRuleSet[field]
          });
        }
      }

      // Compare tax rules
      const fromRules = fromRuleSet.taxRules || [];
      const toRules = toRuleSet.taxRules || [];
      
      const ruleChanges = {
        added: [],
        removed: [],
        modified: []
      };

      // Find added and modified rules
      for (const toRule of toRules) {
        const fromRule = fromRules.find(r => r.rule_code === toRule.rule_code);
        if (!fromRule) {
          ruleChanges.added.push(toRule);
        } else {
          // Check for modifications
          const modifications = [];
          const ruleFields = ['rule_name', 'description', 'rule_type', 'conditions', 'priority', 'is_active'];
          
          for (const field of ruleFields) {
            if (JSON.stringify(fromRule[field]) !== JSON.stringify(toRule[field])) {
              modifications.push({
                field,
                from: fromRule[field],
                to: toRule[field]
              });
            }
          }

          if (modifications.length > 0) {
            ruleChanges.modified.push({
              ruleCode: toRule.rule_code,
              ruleName: toRule.rule_name,
              changes: modifications
            });
          }
        }
      }

      // Find removed rules
      for (const fromRule of fromRules) {
        const toRule = toRules.find(r => r.rule_code === fromRule.rule_code);
        if (!toRule) {
          ruleChanges.removed.push(fromRule);
        }
      }

      return {
        fromVersion: `${fromRuleSet.version_major}.${fromRuleSet.version_minor}.${fromRuleSet.version_patch}`,
        toVersion: `${toRuleSet.version_major}.${toRuleSet.version_minor}.${toRuleSet.version_patch}`,
        ruleSetCode: fromRuleSet.rule_set_code,
        propertyChanges,
        ruleChanges,
        summary: {
          propertiesChanged: propertyChanges.length,
          rulesAdded: ruleChanges.added.length,
          rulesRemoved: ruleChanges.removed.length,
          rulesModified: ruleChanges.modified.length,
          hasBreakingChanges: ruleChanges.removed.length > 0 || 
                              ruleChanges.modified.some(r => 
                                r.changes.some(c => ['rule_type', 'conditions'].includes(c.field))
                              )
        }
      };

    } catch (err) {
      logger.error('Error comparing tax rule versions', {
        error: err.message,
        fromRuleSetId,
        toRuleSetId,
        organizationId
      });
      throw err;
    }
  }
}

// Export both class and singleton instance
export { TaxCalculationService };
export default new TaxCalculationService();
