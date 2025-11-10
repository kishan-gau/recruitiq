/**
 * Employee Deduction Repository
 * 
 * Data access layer for employee deduction management.
 * Supports pre-tax, post-tax, and benefit deductions with effective date ranges.
 * 
 * @module products/paylinq/repositories/deductionRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class DeductionRepository {
  /**
   * Create employee deduction
   * @param {Object} deductionData - Employee deduction data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the deduction
   * @returns {Promise<Object>} Created employee deduction
   */
  async createEmployeeDeduction(deductionData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.employee_deduction 
      (organization_id, employee_id, deduction_type, deduction_name,
       deduction_code, calculation_type, deduction_amount, deduction_percentage,
       max_per_payroll, max_annual, is_pre_tax, is_recurring, frequency,
       effective_from, effective_to, is_active, priority, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        organizationId,
        deductionData.employeeId,
        deductionData.deductionType, // 'benefit', 'garnishment', 'loan', 'union_dues', 'other'
        deductionData.deductionName,
        deductionData.deductionCode,
        deductionData.calculationType, // 'fixed_amount', 'percentage', 'graduated'
        deductionData.deductionAmount,
        deductionData.deductionPercentage,
        deductionData.maxPerPayroll,
        deductionData.maxAnnual,
        deductionData.isPreTax !== undefined ? deductionData.isPreTax : false,
        deductionData.isRecurring !== undefined ? deductionData.isRecurring : true,
        deductionData.frequency || 'per_payroll',
        deductionData.effectiveFrom,
        deductionData.effectiveTo,
        deductionData.isActive !== undefined ? deductionData.isActive : true,
        deductionData.priority || 1,
        deductionData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.employee_deduction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find employee deductions by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Employee deductions
   */
  async findEmployeeDeductions(criteria, organizationId) {
    let whereClause = 'WHERE ed.organization_id = $1 AND ed.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND ed.employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.deductionType) {
      paramCount++;
      whereClause += ` AND ed.deduction_type = $${paramCount}`;
      params.push(criteria.deductionType);
    }
    
    if (criteria.deductionCode) {
      paramCount++;
      whereClause += ` AND ed.deduction_code = $${paramCount}`;
      params.push(criteria.deductionCode);
    }
    
    if (criteria.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND ed.is_active = $${paramCount}`;
      params.push(criteria.isActive);
    }
    
    if (criteria.isPreTax !== undefined) {
      paramCount++;
      whereClause += ` AND ed.is_pre_tax = $${paramCount}`;
      params.push(criteria.isPreTax);
    }
    
    if (criteria.effectiveDate) {
      paramCount++;
      whereClause += ` AND ed.effective_from <= $${paramCount}`;
      params.push(criteria.effectiveDate);
      paramCount++;
      whereClause += ` AND (ed.effective_to IS NULL OR ed.effective_to >= $${paramCount})`;
      params.push(criteria.effectiveDate);
    }
    
    const result = await query(
      `SELECT ed.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name
       FROM payroll.employee_deduction ed
       INNER JOIN hris.employee e ON e.id = ed.employee_id
       ${whereClause}
       ORDER BY ed.priority ASC, ed.deduction_name ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    return result.rows;
  }

  /**
   * Find employee deduction by ID
   * @param {string} deductionId - Employee deduction UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Employee deduction or null
   */
  async findEmployeeDeductionById(deductionId, organizationId) {
    const result = await query(
      `SELECT ed.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name
       FROM payroll.employee_deduction ed
       INNER JOIN hris.employee e ON e.id = ed.employee_id
       WHERE ed.id = $1 AND ed.organization_id = $2 AND ed.deleted_at IS NULL`,
      [deductionId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update employee deduction
   * @param {string} deductionId - Employee deduction UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated employee deduction
   */
  async updateEmployeeDeduction(deductionId, updates, organizationId, userId) {
    const allowedFields = [
      'deduction_name', 'calculation_type', 'deduction_amount', 
      'deduction_percentage', 'max_per_payroll', 'max_annual',
      'is_pre_tax', 'is_recurring', 'frequency', 'effective_from',
      'effective_to', 'is_active', 'priority', 'notes'
    ];
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(deductionId);
    paramCount++;
    params.push(organizationId);
    
    const result = await query(
      `UPDATE payroll.employee_deduction 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.employee_deduction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Deactivate employee deduction
   * @param {string} deductionId - Employee deduction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deactivating the deduction
   * @returns {Promise<Object>} Updated employee deduction
   */
  async deactivateEmployeeDeduction(deductionId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.employee_deduction 
       SET is_active = false,
           effective_to = CURRENT_DATE,
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, deductionId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.employee_deduction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find active deductions for payroll processing
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {Date} payrollDate - Payroll processing date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Active employee deductions
   */
  async findActiveDeductionsForPayroll(employeeId, payrollDate, organizationId) {
    const result = await query(
      `SELECT * 
       FROM payroll.employee_deduction
       WHERE employee_id = $1
         AND organization_id = $2
         AND is_active = true
         AND effective_from <= $3
         AND (effective_to IS NULL OR effective_to >= $3)
         AND deleted_at IS NULL
       ORDER BY priority ASC`,
      [employeeId, organizationId, payrollDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    return result.rows;
  }

  /**
   * Calculate total deductions for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {number} grossPay - Gross pay amount
   * @param {Date} payrollDate - Payroll date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Deduction totals
   */
  async calculateTotalDeductions(employeeId, grossPay, payrollDate, organizationId) {
    const deductions = await this.findActiveDeductionsForPayroll(
      employeeId,
      payrollDate,
      organizationId
    );
    
    let preTaxTotal = 0;
    let postTaxTotal = 0;
    const deductionDetails = [];
    
    for (const deduction of deductions) {
      let amount = 0;
      
      if (deduction.calculation_type === 'fixed_amount') {
        amount = parseFloat(deduction.deduction_amount || 0);
      } else if (deduction.calculation_type === 'percentage') {
        amount = grossPay * (parseFloat(deduction.deduction_percentage || 0) / 100);
      }
      
      // Apply per-payroll maximum
      if (deduction.max_per_payroll && amount > parseFloat(deduction.max_per_payroll)) {
        amount = parseFloat(deduction.max_per_payroll);
      }
      
      if (deduction.is_pre_tax) {
        preTaxTotal += amount;
      } else {
        postTaxTotal += amount;
      }
      
      deductionDetails.push({
        deductionId: deduction.id,
        deductionCode: deduction.deduction_code,
        deductionName: deduction.deduction_name,
        amount: amount,
        isPreTax: deduction.is_pre_tax
      });
    }
    
    return {
      preTaxTotal,
      postTaxTotal,
      totalDeductions: preTaxTotal + postTaxTotal,
      deductionDetails
    };
  }

  /**
   * Find deduction history for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Deduction history
   */
  async findDeductionHistory(employeeId, fromDate, toDate, organizationId) {
    const result = await query(
      `SELECT ed.*,
              COUNT(pc.id) as times_applied,
              COALESCE(SUM(prc.amount), 0) as total_amount_deducted
       FROM payroll.employee_deduction ed
       LEFT JOIN payroll.paycheck pc ON pc.employee_id = ed.employee_id
       LEFT JOIN payroll.payroll_run_component prc ON prc.paycheck_id = pc.id 
         AND prc.component_type = 'deduction'
         AND prc.component_code = ed.deduction_code
       WHERE ed.employee_id = $1
         AND ed.organization_id = $2
         AND ed.effective_from >= $3
         AND ed.effective_from <= $4
         AND ed.deleted_at IS NULL
       GROUP BY ed.id
       ORDER BY ed.effective_from DESC`,
      [employeeId, organizationId, fromDate, toDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    return result.rows;
  }

  /**
   * Get year-to-date deduction totals for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {number} year - Tax year
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} YTD deduction totals by type
   */
  async getYTDDeductionTotals(employeeId, year, organizationId) {
    const result = await query(
      `SELECT 
         ed.deduction_type,
         ed.deduction_code,
         ed.deduction_name,
         ed.is_pre_tax,
         COUNT(prc.id) as deduction_count,
         COALESCE(SUM(prc.amount), 0) as ytd_total
       FROM payroll.employee_deduction ed
       LEFT JOIN payroll.paycheck pc ON pc.employee_id = ed.employee_id
       LEFT JOIN payroll.payroll_run_component prc ON prc.paycheck_id = pc.id 
         AND prc.component_type = 'deduction'
         AND prc.component_code = ed.deduction_code
       LEFT JOIN payroll.payroll_run pr ON pr.id = pc.payroll_run_id
       WHERE ed.employee_id = $1
         AND ed.organization_id = $2
         AND EXTRACT(YEAR FROM pr.pay_period_end) = $3
         AND ed.deleted_at IS NULL
       GROUP BY ed.id, ed.deduction_type, ed.deduction_code, ed.deduction_name, ed.is_pre_tax
       ORDER BY ed.deduction_type, ed.deduction_name`,
      [employeeId, organizationId, year],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    return result.rows;
  }

  /**
   * Check if annual maximum reached
   * @param {string} deductionId - Employee deduction UUID
   * @param {number} year - Tax year
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Annual maximum status
   */
  async checkAnnualMaximum(deductionId, year, organizationId) {
    const result = await query(
      `SELECT 
         ed.max_annual,
         COALESCE(SUM(prc.amount), 0) as ytd_total,
         CASE 
           WHEN ed.max_annual IS NOT NULL THEN ed.max_annual - COALESCE(SUM(prc.amount), 0)
           ELSE NULL
         END as remaining_amount
       FROM payroll.employee_deduction ed
       LEFT JOIN payroll.paycheck pc ON pc.employee_id = ed.employee_id
       LEFT JOIN payroll.payroll_run_component prc ON prc.paycheck_id = pc.id 
         AND prc.component_type = 'deduction'
         AND prc.component_code = ed.deduction_code
       LEFT JOIN payroll.payroll_run pr ON pr.id = pc.payroll_run_id
       WHERE ed.id = $1
         AND ed.organization_id = $2
         AND EXTRACT(YEAR FROM pr.pay_period_end) = $3
         AND ed.deleted_at IS NULL
       GROUP BY ed.id, ed.max_annual`,
      [deductionId, organizationId, year],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_deduction' }
    );
    
    const data = result.rows[0];
    
    return {
      maxAnnual: data?.max_annual,
      ytdTotal: parseFloat(data?.ytd_total || 0),
      remainingAmount: data?.remaining_amount ? parseFloat(data.remaining_amount) : null,
      isMaxReached: data?.max_annual ? parseFloat(data.ytd_total || 0) >= parseFloat(data.max_annual) : false
    };
  }

  /**
   * Soft delete employee deduction
   * @param {string} deductionId - Employee deduction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the deduction
   * @returns {Promise<Object>} Deleted employee deduction
   */
  async softDeleteEmployeeDeduction(deductionId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.employee_deduction 
       SET deleted_at = NOW(),
           deleted_by = $1,
           is_active = false,
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, deductionId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.employee_deduction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Bulk create employee deductions
   * @param {Array} deductions - Array of deduction objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the deductions
   * @returns {Promise<Array>} Created employee deductions
   */
  async bulkCreateEmployeeDeductions(deductions, organizationId, userId) {
    const results = [];
    
    for (const deduction of deductions) {
      const result = await this.createEmployeeDeduction(deduction, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }
}

export default DeductionRepository;
