/**
 * Payroll Repository
 * 
 * Data access layer for core payroll operations including employee records,
 * payroll runs, paychecks, timesheets, and compensation management.
 * 
 * @module products/paylinq/repositories/payrollRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class PayrollRepository {
  // ==================== EMPLOYEE RECORDS ====================
  
  /**
   * Create employee payroll configuration
   * @param {Object} employeeData - Employee payroll data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the record
   * @returns {Promise<Object>} Created employee payroll config
   */
  async createEmployeeRecord(employeeData, organizationId, userId) {
    const metadataParam = employeeData.metadata ? JSON.stringify(employeeData.metadata) : null;
    
    const result = await query(
      `INSERT INTO payroll.employee_payroll_config 
      (organization_id, employee_id,
       pay_frequency, payment_method, currency,
       bank_name, account_number, routing_number, account_type,
       tax_id, tax_filing_status, tax_allowances, additional_withholding,
       payroll_start_date, metadata, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        employeeData.employeeId,
        employeeData.payFrequency,
        employeeData.paymentMethod,
        employeeData.currency || 'SRD',
        employeeData.bankName,
        employeeData.accountNumber,
        employeeData.routingNumber,
        employeeData.accountType,
        employeeData.taxId,
        employeeData.taxFilingStatus,
        employeeData.taxAllowances || 0,
        employeeData.additionalWithholding || 0,
        employeeData.payrollStartDate || new Date().toISOString().split('T')[0],
        metadataParam,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.employee_payroll_config', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find employee payroll records by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (including pagination)
   * @returns {Promise<Array|Object>} Employee records or paginated result
   */
  async findByOrganization(organizationId, filters = {}) {
    let whereClause = 'WHERE epc.organization_id = $1 AND epc.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND e.employment_status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.employeeId) {
      paramCount++;
      whereClause += ` AND epc.employee_id = $${paramCount}`;
      params.push(filters.employeeId);
    }
    
    if (filters.payFrequency) {
      paramCount++;
      whereClause += ` AND epc.pay_frequency = $${paramCount}`;
      params.push(filters.payFrequency);
    }

    // Handle pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;
    
    // Map sortField to database column
    const sortFieldMap = {
      'fullName': 'e.first_name',
      'name': 'e.first_name',
      'email': 'e.email',
      'status': 'e.employment_status',
      'created_at': 'epc.created_at',
      'createdAt': 'epc.created_at',
    };
    
    const sortField = sortFieldMap[filters.sortField] || 'epc.created_at';
    const sortDirection = (filters.sortDirection === 'asc') ? 'ASC' : 'DESC';
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM payroll.employee_payroll_config epc
       JOIN hris.employee e ON e.id = epc.employee_id
       ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_payroll_config' }
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get paginated data with employee details from hris.employee
    const result = await query(
      `SELECT 
        epc.*,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.hire_date,
        e.employment_status,
        e.employment_type,
        e.department_id,
        e.location_id,
        e.manager_id,
        e.job_title,
        c.compensation_type,
        c.amount as current_compensation,
        c.effective_from as compensation_effective_from,
        wtt.id as worker_type_template_id,
        wtt.name as worker_type_name
      FROM payroll.employee_payroll_config epc
      JOIN hris.employee e ON e.id = epc.employee_id
      LEFT JOIN payroll.compensation c ON c.employee_id = epc.employee_id AND c.is_current = true
      LEFT JOIN payroll.worker_type wt ON wt.employee_id = epc.employee_id AND wt.is_current = true
      LEFT JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, limit, offset],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_payroll_config' }
    );
    
    // Return paginated result if pagination params provided
    if (filters.page !== undefined || filters.limit !== undefined) {
      return {
        employees: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
    
    // Legacy: return array directly for backward compatibility
    return result.rows;
  }

  /**
   * Find employee record by ID
   * @param {string} employeeRecordId - Employee payroll config UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Employee record or null
   */
  async findEmployeeRecordById(employeeRecordId, organizationId) {
    const result = await query(
      `SELECT epc.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              e.email,
              e.phone,
              e.hire_date,
              e.employment_status,
              e.employment_type,
              e.department_id,
              e.location_id,
              e.manager_id,
              e.job_title,
              c.compensation_type,
              c.amount as current_compensation
       FROM payroll.employee_payroll_config epc
       JOIN hris.employee e ON e.id = epc.employee_id
       LEFT JOIN payroll.compensation c ON c.employee_id = epc.employee_id AND c.is_current = true
       WHERE epc.id = $1 AND epc.organization_id = $2 AND epc.deleted_at IS NULL`,
      [employeeRecordId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_payroll_config' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update employee payroll config
   * @param {string} employeeRecordId - Employee payroll config UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated employee payroll config
   */
  async updateEmployeeRecord(employeeRecordId, updates, organizationId, userId) {
    const allowedFields = [
      'pay_frequency', 'payment_method',
      'bank_name', 'account_number', 'routing_number', 'account_type',
      'tax_filing_status', 'tax_allowances', 'additional_withholding', 'metadata'
    ];
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        // Handle metadata as JSONB
        if (key === 'metadata' && updates[key]) {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
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
    params.push(employeeRecordId);
    paramCount++;
    params.push(organizationId);
    
    const result = await query(
      `UPDATE payroll.employee_payroll_config 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.employee_payroll_config', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete employee payroll config (soft delete)
   * @param {string} employeeRecordId - Employee payroll config UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<Object>} Deleted employee payroll config
   */
  async deleteEmployeeRecord(employeeRecordId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.employee_payroll_config 
       SET deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, employeeRecordId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.employee_payroll_config', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get employee payroll history
   * @param {string} employeeRecordId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (startDate, endDate, limit)
   * @returns {Promise<Array>} Payroll history records
   */
  async getEmployeePayrollHistory(employeeRecordId, organizationId, filters = {}) {
    const { startDate, endDate, limit = 12 } = filters;
    
    let queryText = `
      SELECT pc.*, 
        pr.pay_period_start as period_start, 
        pr.pay_period_end as period_end, 
        pr.payment_date as pay_date, 
        pr.status as run_status
      FROM payroll.paycheck pc
      INNER JOIN payroll.payroll_run pr ON pc.payroll_run_id = pr.id
      WHERE pc.employee_id = $1 
        AND pc.organization_id = $2 
        AND pc.deleted_at IS NULL
        AND pr.deleted_at IS NULL
    `;
    
    const params = [employeeRecordId, organizationId];
    let paramCount = 2;
    
    if (startDate) {
      paramCount++;
      queryText += ` AND pr.payment_date >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      queryText += ` AND pr.payment_date <= $${paramCount}`;
      params.push(endDate);
    }
    
    queryText += ` ORDER BY pr.payment_date DESC`;
    
    if (limit) {
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      params.push(limit);
    }
    
    const result = await query(
      queryText,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck' }
    );
    
    return result.rows;
  }

  // ==================== COMPENSATION ====================
  
  /**
   * Create compensation record
   * @param {Object} compensationData - Compensation data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the record
   * @returns {Promise<Object>} Created compensation record
   */
  async createCompensation(compensationData, organizationId, userId) {
    // Set previous compensation to non-current
    if (compensationData.isCurrent) {
      await query(
        `UPDATE payroll.compensation 
         SET is_current = false, effective_to = $1, updated_at = NOW()
         WHERE employee_id = $2 AND organization_id = $3 AND is_current = true`,
        [compensationData.effectiveFrom, compensationData.employeeId, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'payroll.compensation', userId }
      );
    }
    
    const result = await query(
      `INSERT INTO payroll.compensation 
      (organization_id, employee_id, compensation_type, amount,
       hourly_rate, overtime_rate, pay_period_amount, annual_amount,
       effective_from, is_current, currency, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId,
        compensationData.employeeId,
        compensationData.compensationType,
        compensationData.amount,
        compensationData.hourlyRate,
        compensationData.overtimeRate,
        compensationData.payPeriodAmount,
        compensationData.annualAmount,
        compensationData.effectiveFrom,
        compensationData.isCurrent !== false,
        compensationData.currency || 'SRD',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.compensation', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get current compensation for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Current compensation or null
   */
  async findCurrentCompensation(employeeId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.compensation
       WHERE employee_id = $1 
         AND organization_id = $2
         AND is_current = true
         AND deleted_at IS NULL`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.compensation' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find compensation by ID
   * @param {string} compensationId - Compensation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Compensation record or null
   */
  async findCompensationById(compensationId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.compensation
       WHERE id = $1 
         AND organization_id = $2
         AND deleted_at IS NULL`,
      [compensationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.compensation' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get compensation history for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of compensation records
   */
  async findCompensationHistory(employeeId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.compensation
       WHERE employee_id = $1 
         AND organization_id = $2
         AND deleted_at IS NULL
       ORDER BY effective_from DESC`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.compensation' }
    );
    
    return result.rows;
  }

  /**
   * Update compensation record
   * @param {string} compensationId - Compensation UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object|null>} Updated compensation or null
   */
  async updateCompensation(compensationId, updates, organizationId, userId) {
    // Check if compensation exists first
    const existing = await this.findCompensationById(compensationId, organizationId);
    if (!existing) {
      return null;
    }

    // Build dynamic update query
    const setClauses = [];
    const params = [compensationId, organizationId];
    let paramCount = 2;

    const fieldMap = {
      amount: 'amount',
      compensationType: 'compensation_type',
      hourlyRate: 'hourly_rate',
      overtimeRate: 'overtime_rate',
      payPeriodAmount: 'pay_period_amount',
      annualAmount: 'annual_amount',
      effectiveFrom: 'effective_from',
      effectiveTo: 'effective_to',
      isCurrent: 'is_current',
      currency: 'currency'
    };

    for (const [apiField, dbField] of Object.entries(fieldMap)) {
      if (updates[apiField] !== undefined) {
        paramCount++;
        setClauses.push(`${dbField} = $${paramCount}`);
        params.push(updates[apiField]);
      }
    }

    if (setClauses.length === 0) {
      return existing; // No valid fields to update
    }

    setClauses.push(`updated_by = $${paramCount + 1}`);
    setClauses.push(`updated_at = NOW()`);
    params.push(userId);

    const result = await query(
      `UPDATE payroll.compensation 
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.compensation', userId }
    );

    return result.rows[0];
  }

  /**
   * Delete compensation record (soft delete)
   * @param {string} compensationId - Compensation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the record
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteCompensation(compensationId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.compensation 
       SET deleted_at = NOW(), updated_by = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [compensationId, organizationId, userId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.compensation', userId }
    );

    return result.rowCount > 0;
  }

  // ==================== PAYROLL RUNS ====================
  
  /**
   * Create payroll run
   * @param {Object} runData - Payroll run data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the run
   * @returns {Promise<Object>} Created payroll run
   */
  async createPayrollRun(runData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.payroll_run 
      (organization_id, run_number, run_name, pay_period_start, 
       pay_period_end, payment_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        organizationId,
        runData.runNumber,
        runData.runName,
        runData.payPeriodStart,
        runData.payPeriodEnd,
        runData.paymentDate,
        'draft',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.payroll_run', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find payroll run by ID
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Payroll run or null
   */
  async findPayrollRunById(payrollRunId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.payroll_run
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [payrollRunId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payroll_run' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find payroll runs by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payroll runs
   */
  async findPayrollRuns(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.fromDate) {
      paramCount++;
      whereClause += ` AND pay_period_start >= $${paramCount}`;
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      paramCount++;
      whereClause += ` AND pay_period_end <= $${paramCount}`;
      params.push(filters.toDate);
    }
    
    // Get total count before applying pagination
    let totalCount = 0;
    if (filters.page || filters.limit) {
      const countResult = await query(
        `SELECT COUNT(*) as count FROM payroll.payroll_run ${whereClause}`,
        params,
        organizationId,
        { operation: 'SELECT', table: 'payroll.payroll_run' }
      );
      totalCount = parseInt(countResult.rows[0].count);
    }
    
    // Apply pagination
    let limitClause = '';
    let offsetClause = '';
    
    if (filters.limit) {
      paramCount++;
      limitClause = ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      paramCount++;
      offsetClause = ` OFFSET $${paramCount}`;
      params.push(offset);
    }
    
    // Apply sorting
    let orderByClause = 'ORDER BY pay_period_start DESC';
    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
      orderByClause = `ORDER BY ${filters.sortBy} ${sortOrder}`;
    }
    
    const result = await query(
      `SELECT * FROM payroll.payroll_run
       ${whereClause}
       ${orderByClause}${limitClause}${offsetClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.payroll_run' }
    );
    
    // Return both rows and total count for pagination
    if (filters.page || filters.limit) {
      return {
        rows: result.rows,
        total: totalCount
      };
    }
    
    return result.rows;
  }

  /**
   * Update payroll run summary
   * @param {string} payrollRunId - Payroll run UUID
   * @param {Object} summary - Summary data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated payroll run
   */
  async updatePayrollRunSummary(payrollRunId, summary, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.payroll_run 
       SET total_employees = $1,
           total_gross_pay = $2,
           total_net_pay = $3,
           total_taxes = $4,
           status = $5,
           calculated_at = $6,
           updated_by = $7,
           updated_at = NOW()
       WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
       RETURNING *`,
      [
        summary.totalEmployees,
        summary.totalGrossPay,
        summary.totalNetPay,
        summary.totalTaxes,
        summary.status,
        summary.calculatedAt,
        userId,
        payrollRunId,
        organizationId
      ],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.payroll_run', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Update payroll run details
   * @param {string} payrollRunId - Payroll run UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated payroll run
   */
  async updatePayrollRun(payrollRunId, updates, organizationId, userId) {
    // First check if payroll run exists
    const existing = await this.findPayrollRunById(payrollRunId, organizationId);
    if (!existing) {
      return null; // Let service handle 404
    }

    const allowedFields = ['run_name', 'pay_period_start', 'pay_period_end', 'payment_date', 'status'];
    const setClauses = [];
    const params = [];
    let paramCount = 0;

    // Build SET clause dynamically for allowed fields
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClauses.push(`${key} = $${paramCount}`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      // No valid fields to update, return existing record unchanged
      return existing;
    }

    // Add updated_by and updated_at
    paramCount++;
    setClauses.push(`updated_by = $${paramCount}`);
    params.push(userId);
    
    setClauses.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    paramCount++;
    params.push(payrollRunId);
    paramCount++;
    params.push(organizationId);

    const result = await query(
      `UPDATE payroll.payroll_run 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.payroll_run', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete payroll run (soft delete)
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<Object>} Deleted payroll run
   */
  async deletePayrollRun(payrollRunId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.payroll_run 
       SET deleted_at = NOW(),
           deleted_by = $1
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, payrollRunId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.payroll_run', userId }
    );
    
    return result.rows[0];
  }

  // ==================== PAYCHECKS ====================
  
  /**
   * Create paycheck
   * @param {Object} paycheckData - Paycheck data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the paycheck
   * @returns {Promise<Object>} Created paycheck
   */
  async createPaycheck(paycheckData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.paycheck 
      (organization_id, payroll_run_id, employee_id, payment_date,
       pay_period_start, pay_period_end, gross_pay, regular_pay, overtime_pay,
       federal_tax, state_tax, social_security, medicare, other_deductions,
       net_pay, payment_method, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        organizationId,
        paycheckData.payrollRunId,
        paycheckData.employeeId,
        paycheckData.paymentDate,
        paycheckData.payPeriodStart,
        paycheckData.payPeriodEnd,
        paycheckData.grossPay,
        paycheckData.regularPay || 0,
        paycheckData.overtimePay || 0,
        paycheckData.federalTax || 0,
        paycheckData.stateTax || 0,
        paycheckData.socialSecurity || 0,
        paycheckData.medicare || 0,
        paycheckData.otherDeductions || 0,
        paycheckData.netPay,
        paycheckData.paymentMethod,
        'pending',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.paycheck', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find paychecks for payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Paychecks
   */
  async findPaychecksByRun(payrollRunId, organizationId) {
    const result = await query(
      `SELECT p.*, 
              e.employee_number, 
              e.id as employee_id,
              e.first_name,
              e.last_name,
              e.email
       FROM payroll.paycheck p
       INNER JOIN hris.employee e ON e.id = p.employee_id
       WHERE p.payroll_run_id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL
       ORDER BY e.employee_number`,
      [payrollRunId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck' }
    );
    
    return result.rows;
  }

  /**
   * Find paychecks by organization with filters
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Paychecks
   */
  async findPaychecksByOrganization(organizationId, filters = {}) {
    let queryText = `
      SELECT p.*, 
             e.employee_number, 
             e.id as employee_id,
             e.first_name,
             e.last_name,
             e.email,
             pr.run_number, 
             pr.run_name
      FROM payroll.paycheck p
      INNER JOIN hris.employee e ON e.id = p.employee_id
      LEFT JOIN payroll.payroll_run pr ON pr.id = p.payroll_run_id
      WHERE p.organization_id = $1 AND p.deleted_at IS NULL
    `;
    
    const params = [organizationId];
    let paramCounter = 2;

    if (filters.employeeId) {
      queryText += ` AND p.employee_id = $${paramCounter++}`;
      params.push(filters.employeeId);
    }

    if (filters.payrollRunId) {
      queryText += ` AND p.payroll_run_id = $${paramCounter++}`;
      params.push(filters.payrollRunId);
    }

    if (filters.status) {
      queryText += ` AND p.status = $${paramCounter++}`;
      params.push(filters.status);
    }

    if (filters.startDate) {
      queryText += ` AND p.payment_date >= $${paramCounter++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      queryText += ` AND p.payment_date <= $${paramCounter++}`;
      params.push(filters.endDate);
    }

    queryText += ` ORDER BY p.payment_date DESC, e.employee_number`;

    if (filters.limit) {
      queryText += ` LIMIT $${paramCounter++}`;
      params.push(filters.limit);
    }

    const result = await query(
      queryText,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck' }
    );
    
    return result.rows;
  }

  /**
   * Find paycheck by ID
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Paycheck or null
   */
  async findPaycheckById(paycheckId, organizationId) {
    const result = await query(
      `SELECT p.*, 
              e.employee_number, 
              e.id as employee_id,
              e.first_name,
              e.last_name,
              e.email,
              pr.run_number, 
              pr.run_name
       FROM payroll.paycheck p
       INNER JOIN hris.employee e ON e.id = p.employee_id
       LEFT JOIN payroll.payroll_run pr ON pr.id = p.payroll_run_id
       WHERE p.id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL`,
      [paycheckId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find paychecks by employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Paychecks
   */
  async findPaychecksByEmployee(employeeId, organizationId, filters = {}) {
    let queryText = `
      SELECT p.*, pr.run_number, pr.run_name
      FROM payroll.paycheck p
      LEFT JOIN payroll.payroll_run pr ON pr.id = p.payroll_run_id
      WHERE p.employee_id = $1 AND p.organization_id = $2 AND p.deleted_at IS NULL
    `;
    
    const params = [employeeId, organizationId];
    let paramCounter = 3;

    if (filters.startDate) {
      queryText += ` AND p.payment_date >= $${paramCounter++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      queryText += ` AND p.payment_date <= $${paramCounter++}`;
      params.push(filters.endDate);
    }

    queryText += ` ORDER BY p.payment_date DESC`;

    if (filters.limit) {
      queryText += ` LIMIT $${paramCounter++}`;
      params.push(filters.limit);
    }

    const result = await query(
      queryText,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.paycheck' }
    );
    
    return result.rows;
  }

  /**
   * Update paycheck
   * @param {string} paycheckId - Paycheck UUID
   * @param {Object} updates - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User updating the paycheck
   * @returns {Promise<Object|null>} Updated paycheck or null
   */
  async updatePaycheck(paycheckId, updates, organizationId, userId) {
    const allowedFields = ['payment_method', 'status', 'payment_date'];
    const setClause = [];
    const params = [paycheckId, organizationId, userId];
    let paramCounter = 4;

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        setClause.push(`${dbField} = $${paramCounter++}`);
        params.push(value);
      }
    });

    if (setClause.length === 0) {
      // No valid fields to update, just return the existing paycheck
      return this.findPaycheckById(paycheckId, organizationId);
    }

    setClause.push(`updated_by = $3`);
    setClause.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE payroll.paycheck 
       SET ${setClause.join(', ')}
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.paycheck', userId }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Delete paycheck (soft delete)
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the paycheck
   * @returns {Promise<boolean>} True if deleted
   */
  async deletePaycheck(paycheckId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.paycheck 
       SET deleted_at = NOW(),
           deleted_by = $3
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [paycheckId, organizationId, userId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.paycheck', userId }
    );
    
    return result.rowCount > 0;
  }

  // ==================== TIMESHEETS ====================
  
  /**
   * Create timesheet
   * @param {Object} timesheetData - Timesheet data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the timesheet
   * @returns {Promise<Object>} Created timesheet
   */
  async createTimesheet(timesheetData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.timesheet 
      (organization_id, employee_id, period_start, period_end,
       regular_hours, overtime_hours, pto_hours, sick_hours, 
       status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        organizationId,
        timesheetData.employeeId,
        timesheetData.periodStart,
        timesheetData.periodEnd,
        timesheetData.regularHours || 0,
        timesheetData.overtimeHours || 0,
        timesheetData.ptoHours || 0,
        timesheetData.sickHours || 0,
        'draft',
        timesheetData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.timesheet', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find timesheets for approval
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Timesheets
   */
  async findTimesheetsForApproval(organizationId, filters = {}) {
    let whereClause = 'WHERE t.organization_id = $1 AND t.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND t.status = $${paramCount}`;
      params.push(filters.status);
    } else {
      whereClause += ` AND t.status = 'submitted'`;
    }
    
    if (filters.employeeId) {
      paramCount++;
      whereClause += ` AND t.employee_id = $${paramCount}`;
      params.push(filters.employeeId);
    }
    
    const result = await query(
      `SELECT 
        t.*,
        e.employee_number,
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.email
      FROM payroll.timesheet t
      INNER JOIN hris.employee e ON e.id = t.employee_id
      ${whereClause}
      ORDER BY t.period_start DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.timesheet' }
    );
    
    return result.rows;
  }

  /**
   * Find timesheets by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Timesheets
   */
  async findTimesheets(criteria, organizationId) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.periodStart) {
      paramCount++;
      whereClause += ` AND period_start >= $${paramCount}`;
      params.push(criteria.periodStart);
    }
    
    if (criteria.periodEnd) {
      paramCount++;
      whereClause += ` AND period_end <= $${paramCount}`;
      params.push(criteria.periodEnd);
    }
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    const result = await query(
      `SELECT * FROM payroll.timesheet
       ${whereClause}
       ORDER BY period_start DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.timesheet' }
    );
    
    return result.rows;
  }

  /**
   * Update timesheet status
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} status - New status
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated timesheet
   */
  async updateTimesheetStatus(timesheetId, status, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.timesheet 
       SET status = $1, 
           approved_by = CASE WHEN $1 = 'approved' THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END,
           rejected_by = CASE WHEN $1 = 'rejected' THEN $2 ELSE rejected_by END,
           rejected_at = CASE WHEN $1 = 'rejected' THEN NOW() ELSE rejected_at END,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [status, userId, timesheetId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.timesheet', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Create payroll run component
   * @param {Object} componentData - Component data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the component
   * @returns {Promise<Object>} Created component
   */
  async createPayrollRunComponent(componentData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.payroll_run_component
       (organization_id, payroll_run_id, paycheck_id, component_type, component_code, component_name,
        units, rate, amount, is_taxable, tax_category,
        worker_structure_id, structure_template_version, component_config_snapshot, calculation_metadata,
        created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        organizationId,
        componentData.payrollRunId,
        componentData.paycheckId,
        componentData.componentType,
        componentData.componentCode,
        componentData.componentName,
        componentData.units || null,
        componentData.rate || null,
        componentData.amount,
        componentData.isTaxable !== undefined ? componentData.isTaxable : true,
        componentData.taxCategory || null,
        componentData.workerStructureId || null,
        componentData.structureTemplateVersion || null,
        componentData.componentConfigSnapshot ? JSON.stringify(componentData.componentConfigSnapshot) : null,
        componentData.calculationMetadata ? JSON.stringify(componentData.calculationMetadata) : null,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.payroll_run_component', userId }
    );
    
    return result.rows[0];
  }
}

export default PayrollRepository;
