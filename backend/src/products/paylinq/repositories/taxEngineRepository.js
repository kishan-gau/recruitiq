/**
 * Tax Engine Repository
 * 
 * Data access layer for tax calculations including rule sets, brackets,
 * allowances, and deductible costs. Supports Surinamese tax system with
 * Wage Tax, AOV (Old Age Pension), and AWW (Widow/Orphan Fund).
 * 
 * MVP Version: Bracket-based progressive tax calculation
 * Phase 2: Multi-jurisdictional, withholding certificates, tax treaties
 * 
 * @module products/paylinq/repositories/taxEngineRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class TaxEngineRepository {
  // ==================== TAX RULE SETS ====================
  
  /**
   * Create tax rule set
   * @param {Object} ruleSetData - Tax rule set data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the rule set
   * @returns {Promise<Object>} Created tax rule set
   */
  async createTaxRuleSet(ruleSetData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.tax_rule_set 
      (organization_id, tax_type, tax_name, country, state, locality,
       effective_from, effective_to, is_active, annual_cap, 
       calculation_method, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        organizationId,
        ruleSetData.taxType,
        ruleSetData.taxName,
        ruleSetData.country || 'SR',
        ruleSetData.state,
        ruleSetData.locality,
        ruleSetData.effectiveFrom,
        ruleSetData.effectiveTo,
        ruleSetData.isActive !== false,
        ruleSetData.annualCap,
        ruleSetData.calculationMethod || 'bracket',
        ruleSetData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.tax_rule_set', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find applicable tax rule sets
   * @param {string} country - Country code (e.g., 'SR')
   * @param {string} state - State/region (optional)
   * @param {string} locality - Locality/district (optional)
   * @param {Date} effectiveDate - Date to check applicability
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Applicable tax rule sets
   */
  async findApplicableTaxRuleSets(country, state, locality, effectiveDate, organizationId) {
    const result = await query(
      `SELECT trs.*, 
              COUNT(tb.id) as bracket_count
       FROM payroll.tax_rule_set trs
       LEFT JOIN payroll.tax_bracket tb ON tb.tax_rule_set_id = trs.id
       WHERE trs.organization_id = $1
         AND trs.country = $2
         AND ($3::varchar IS NULL OR trs.state = $3 OR trs.state IS NULL)
         AND ($4::varchar IS NULL OR trs.locality = $4 OR trs.locality IS NULL)
         AND trs.effective_from <= $5
         AND (trs.effective_to IS NULL OR trs.effective_to >= $5)
         AND trs.deleted_at IS NULL
       GROUP BY trs.id
       ORDER BY trs.tax_type, trs.effective_from DESC`,
      [organizationId, country, state, locality, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows;
  }

  /**
   * Find tax rule set by ID
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Tax rule set or null
   */
  async findTaxRuleSetById(ruleSetId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_rule_set
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [ruleSetId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find all tax rule sets for organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Tax rule sets
   */
  async findTaxRuleSets(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.taxType) {
      paramCount++;
      whereClause += ` AND tax_type = $${paramCount}`;
      params.push(filters.taxType);
    }
    
    if (filters.country) {
      paramCount++;
      whereClause += ` AND country = $${paramCount}`;
      params.push(filters.country);
    }
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    const result = await query(
      `SELECT * FROM payroll.tax_rule_set
       ${whereClause}
       ORDER BY tax_type, effective_from DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows;
  }

  /**
   * Update tax rule set
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Updated tax rule set
   */
  async updateTaxRuleSet(ruleSetId, updates, organizationId) {
    const setClauses = [];
    const params = [ruleSetId, organizationId];
    let paramCount = 2;

    const allowedFields = [
      'tax_type', 'tax_name', 'country', 'state', 'locality',
      'effective_from', 'effective_to', 'is_active', 'annual_cap',
      'calculation_method', 'description', 'updated_by'
    ];

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        paramCount++;
        setClauses.push(`${snakeKey} = $${paramCount}`);
        params.push(updates[key]);
      }
    });

    if (setClauses.length === 0) {
      return await this.findTaxRuleSetById(ruleSetId, organizationId);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE payroll.tax_rule_set
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.tax_rule_set', userId: updates.updatedBy }
    );

    return result.rows[0];
  }

  /**
   * Soft delete tax rule set
   * @param {string} ruleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the rule set
   * @returns {Promise<boolean>} Success
   */
  async softDeleteTaxRuleSet(ruleSetId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.tax_rule_set
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = $3
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [ruleSetId, organizationId, userId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.tax_rule_set', userId }
    );

    return result.rowCount > 0;
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
    const result = await query(
      `INSERT INTO payroll.tax_bracket 
      (organization_id, tax_rule_set_id, bracket_order, income_min, income_max,
       rate_percentage, fixed_amount, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        organizationId,
        bracketData.taxRuleSetId,
        bracketData.bracketOrder,
        bracketData.incomeMin,
        bracketData.incomeMax,
        bracketData.ratePercentage,
        bracketData.fixedAmount || 0,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.tax_bracket', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find tax brackets for rule set
   * @param {string} taxRuleSetId - Tax rule set UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Tax brackets ordered by bracket_order
   */
  async findTaxBrackets(taxRuleSetId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_bracket
       WHERE tax_rule_set_id = $1 
         AND organization_id = $2
         AND deleted_at IS NULL
       ORDER BY bracket_order ASC`,
      [taxRuleSetId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_bracket' }
    );
    
    return result.rows;
  }

  /**
   * Find tax bracket by ID
   * @param {string} bracketId - Tax bracket UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Tax bracket or null
   */
  async findTaxBracketById(bracketId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_bracket
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [bracketId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_bracket' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update tax bracket
   * @param {string} bracketId - Tax bracket UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Updated tax bracket
   */
  async updateTaxBracket(bracketId, updates, organizationId) {
    const setClauses = [];
    const params = [bracketId, organizationId];
    let paramCount = 2;

    const allowedFields = [
      'bracket_order', 'income_min', 'income_max',
      'rate_percentage', 'fixed_amount', 'updated_by'
    ];

    Object.keys(updates).forEach((key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        paramCount++;
        setClauses.push(`${snakeKey} = $${paramCount}`);
        params.push(updates[key]);
      }
    });

    if (setClauses.length === 0) {
      return await this.findTaxBracketById(bracketId, organizationId);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await query(
      `UPDATE payroll.tax_bracket
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.tax_bracket', userId: updates.updatedBy }
    );

    return result.rows[0];
  }

  /**
   * Soft delete tax bracket
   * @param {string} bracketId - Tax bracket UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the bracket
   * @returns {Promise<boolean>} Success
   */
  async softDeleteTaxBracket(bracketId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.tax_bracket
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = $3
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [bracketId, organizationId, userId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.tax_bracket', userId }
    );

    return result.rowCount > 0;
  }

  /**
   * Bulk create tax brackets
   * @param {Array} brackets - Array of bracket objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the brackets
   * @returns {Promise<Array>} Created tax brackets
   */
  async bulkCreateTaxBrackets(brackets, organizationId, userId) {
    const results = [];
    
    for (const bracket of brackets) {
      const result = await this.createTaxBracket(bracket, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }

  // ==================== TAX CALCULATIONS ====================
  
  /**
   * Calculate tax using progressive brackets (MVP Version)
   * @param {number} income - Taxable income
   * @param {Array} brackets - Tax brackets
   * @returns {number} Calculated tax amount
   */
  calculateBracketTax(income, brackets) {
    let totalTax = 0;
    let remainingIncome = parseFloat(income);
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const incomeMin = parseFloat(bracket.income_min || 0);
      const incomeMax = bracket.income_max ? parseFloat(bracket.income_max) : null;
      const ratePercentage = parseFloat(bracket.rate_percentage || 0);
      const fixedAmount = parseFloat(bracket.fixed_amount || 0);
      
      // Calculate taxable income in this bracket
      let bracketIncome;
      if (incomeMax) {
        const maxInBracket = incomeMax - incomeMin;
        bracketIncome = Math.min(remainingIncome, maxInBracket);
      } else {
        // Unlimited upper bracket
        bracketIncome = remainingIncome;
      }
      
      // Calculate tax for this bracket
      const bracketTax = (bracketIncome * ratePercentage / 100) + fixedAmount;
      totalTax += bracketTax;
      remainingIncome -= bracketIncome;
      
      logger.debug('Bracket calculation', {
        bracketOrder: bracket.bracket_order,
        bracketIncome,
        rate: ratePercentage,
        bracketTax,
        remainingIncome
      });
    }
    
    return Math.round(totalTax * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate flat rate tax
   * @param {number} income - Taxable income
   * @param {number} ratePercentage - Tax rate percentage
   * @param {number} cap - Optional annual cap
   * @returns {number} Calculated tax amount
   */
  calculateFlatRateTax(income, ratePercentage, cap = null) {
    const taxAmount = (parseFloat(income) * parseFloat(ratePercentage)) / 100;
    
    if (cap && taxAmount > cap) {
      return parseFloat(cap);
    }
    
    return Math.round(taxAmount * 100) / 100;
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
    const result = await query(
      `INSERT INTO payroll.allowance 
      (organization_id, allowance_type, allowance_name, country, state,
       amount, is_percentage, effective_from, effective_to, 
       is_active, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId,
        allowanceData.allowanceType,
        allowanceData.allowanceName,
        allowanceData.country || 'SR',
        allowanceData.state,
        allowanceData.amount,
        allowanceData.isPercentage || false,
        allowanceData.effectiveFrom,
        allowanceData.effectiveTo,
        allowanceData.isActive !== false,
        allowanceData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.allowance', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find applicable allowances
   * @param {string} country - Country code
   * @param {string} state - State/region (optional)
   * @param {Date} effectiveDate - Date to check applicability
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Applicable allowances
   */
  async findApplicableAllowances(country, state, effectiveDate, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.allowance
       WHERE organization_id = $1
         AND country = $2
         AND ($3::varchar IS NULL OR state = $3 OR state IS NULL)
         AND effective_from <= $4
         AND (effective_to IS NULL OR effective_to >= $4)
         AND deleted_at IS NULL
       ORDER BY allowance_type`,
      [organizationId, country, state, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.allowance' }
    );
    
    return result.rows;
  }

  /**
   * Find all allowances for organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Allowances
   */
  async findAllowances(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.allowanceType) {
      paramCount++;
      whereClause += ` AND allowance_type = $${paramCount}`;
      params.push(filters.allowanceType);
    }
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    const result = await query(
      `SELECT * FROM payroll.allowance
       ${whereClause}
       ORDER BY allowance_type, effective_from DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.allowance' }
    );
    
    return result.rows;
  }

  // ==================== DEDUCTIBLE COST RULES ====================
  
  /**
   * Create deductible cost rule
   * @param {Object} ruleData - Deductible cost rule data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the rule
   * @returns {Promise<Object>} Created deductible cost rule
   */
  async createDeductibleCostRule(ruleData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.deductible_cost_rule 
      (organization_id, cost_type, cost_name, country, state,
       amount, is_percentage, max_deduction, effective_from, effective_to,
       is_active, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        organizationId,
        ruleData.costType,
        ruleData.costName,
        ruleData.country || 'SR',
        ruleData.state,
        ruleData.amount,
        ruleData.isPercentage || false,
        ruleData.maxDeduction,
        ruleData.effectiveFrom,
        ruleData.effectiveTo,
        ruleData.isActive !== false,
        ruleData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.deductible_cost_rule', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find applicable deductible cost rules
   * @param {string} country - Country code
   * @param {string} state - State/region (optional)
   * @param {Date} effectiveDate - Date to check applicability
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Applicable deductible cost rules
   */
  async findApplicableDeductibleCostRules(country, state, effectiveDate, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.deductible_cost_rule
       WHERE organization_id = $1
         AND country = $2
         AND ($3::varchar IS NULL OR state = $3 OR state IS NULL)
         AND effective_from <= $4
         AND (effective_to IS NULL OR effective_to >= $4)
         AND deleted_at IS NULL
       ORDER BY cost_type`,
      [organizationId, country, state, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.deductible_cost_rule' }
    );
    
    return result.rows;
  }

  // ==================== SURINAMESE TAX HELPERS ====================
  
  /**
   * Get Surinamese Wage Tax brackets for year
   * @param {number} year - Tax year
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Wage Tax brackets
   */
  async getSurinameseWageTaxBrackets(year, organizationId) {
    const result = await query(
      `SELECT tb.* 
       FROM payroll.tax_bracket tb
       INNER JOIN payroll.tax_rule_set trs ON trs.id = tb.tax_rule_set_id
       WHERE trs.organization_id = $1
         AND trs.country = 'SR'
         AND trs.tax_type = 'wage_tax'
         AND EXTRACT(YEAR FROM trs.effective_from) = $2
         AND trs.deleted_at IS NULL
       ORDER BY tb.bracket_order ASC`,
      [organizationId, year],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_bracket' }
    );
    
    return result.rows;
  }

  /**
   * Get Surinamese AOV rate
   * @param {Date} effectiveDate - Date to check
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} AOV tax rule set or null
   */
  async getSurinameseAOVRate(effectiveDate, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_rule_set
       WHERE organization_id = $1
         AND country = 'SR'
         AND tax_type = 'aov'
         AND effective_from <= $2
         AND (effective_to IS NULL OR effective_to >= $2)
         AND deleted_at IS NULL
       ORDER BY effective_from DESC
       LIMIT 1`,
      [organizationId, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get Surinamese AWW rate
   * @param {Date} effectiveDate - Date to check
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} AWW tax rule set or null
   */
  async getSurinameseAWWRate(effectiveDate, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.tax_rule_set
       WHERE organization_id = $1
         AND country = 'SR'
         AND tax_type = 'aww'
         AND effective_from <= $2
         AND (effective_to IS NULL OR effective_to >= $2)
         AND deleted_at IS NULL
       ORDER BY effective_from DESC
       LIMIT 1`,
      [organizationId, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows[0] || null;
  }
}

export default TaxEngineRepository;
