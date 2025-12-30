/**
 * Worker Type Repository (PayLinQ)
 * 
 * ARCHITECTURE NOTE: Worker types are now owned by HRIS (hris.worker_type).
 * This PayLinQ repository handles:
 * 1. Reading worker types from HRIS
 * 2. Managing PayLinQ-specific pay configs (payroll.worker_type_pay_config)
 * 3. Historical tracking of worker type changes (payroll.worker_type_history)
 * 
 * @module products/paylinq/repositories/WorkerTypeRepository
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class WorkerTypeRepository {
  constructor(database = null) {
    this.query = database?.query || query;
  }

  // ==================== WORKER TYPES (Read from HRIS) ====================
  
  /**
   * Find all worker types for organization (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Worker types from HRIS
   */
  async findAll(organizationId, filters = {}) {
    let whereClause = 'WHERE wt.organization_id = $1 AND wt.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND wt.is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    if (filters.code) {
      paramCount++;
      whereClause += ` AND wt.code = $${paramCount}`;
      params.push(filters.code);
    }
    
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (wt.name ILIKE $${paramCount} OR wt.code ILIKE $${paramCount} OR wt.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }
    
    const result = await this.query(
      `SELECT wt.*,
              wtpc.default_pay_frequency,
              wtpc.default_payment_method,
              wtpc.overtime_eligible,
              wtpc.pay_structure_template_code
       FROM hris.worker_type wt
       LEFT JOIN payroll.worker_type_pay_config wtpc 
         ON wtpc.worker_type_id = wt.id 
         AND wtpc.organization_id = wt.organization_id
       ${whereClause}
       ORDER BY wt.name ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return result.rows;
  }

  /**
   * Find worker type by ID (from HRIS)
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type or null
   */
  async findById(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT wt.*,
              wtpc.default_pay_frequency,
              wtpc.default_payment_method,
              wtpc.overtime_eligible,
              wtpc.pay_structure_template_code
       FROM hris.worker_type wt
       LEFT JOIN payroll.worker_type_pay_config wtpc 
         ON wtpc.worker_type_id = wt.id 
         AND wtpc.organization_id = wt.organization_id
       WHERE wt.id = $1 AND wt.organization_id = $2 AND wt.deleted_at IS NULL`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find worker type by code (from HRIS)
   * @param {string} code - Worker type code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type or null
   */
  async findByCode(code, organizationId) {
    const result = await this.query(
      `SELECT wt.*,
              wtpc.default_pay_frequency,
              wtpc.default_payment_method,
              wtpc.overtime_eligible,
              wtpc.pay_structure_template_code
       FROM hris.worker_type wt
       LEFT JOIN payroll.worker_type_pay_config wtpc 
         ON wtpc.worker_type_id = wt.id 
         AND wtpc.organization_id = wt.organization_id
       WHERE wt.code = $1 AND wt.organization_id = $2 AND wt.deleted_at IS NULL`,
      [code, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find all worker types with pagination
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters {isActive, code, search}
   * @param {Object} pagination - Pagination params {page, limit, sortBy, sortOrder}
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async findAllWithPagination(organizationId, filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = pagination;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = 'WHERE wt.organization_id = $1 AND wt.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND wt.is_active = $${paramCount}`;
      params.push(filters.isActive);
    }
    
    if (filters.code) {
      paramCount++;
      whereClause += ` AND wt.code ILIKE $${paramCount}`;
      params.push(`%${filters.code}%`);
    }
    
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (wt.name ILIKE $${paramCount} OR wt.code ILIKE $${paramCount} OR wt.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }
    
    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['name', 'code', 'created_at', 'updated_at', 'benefits_eligible', 'pto_eligible'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    // Get total count
    const countResult = await this.query(
      `SELECT COUNT(*) as total 
       FROM hris.worker_type wt
       ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get paginated results
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);
    
    const result = await this.query(
      `SELECT wt.*,
              wtpc.default_pay_frequency,
              wtpc.default_payment_method,
              wtpc.overtime_eligible,
              wtpc.pay_structure_template_code
       FROM hris.worker_type wt
       LEFT JOIN payroll.worker_type_pay_config wtpc 
         ON wtpc.worker_type_id = wt.id 
         AND wtpc.organization_id = wt.organization_id
       ${whereClause}
       ORDER BY wt.${safeSortBy} ${safeSortOrder}
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return {
      workerTypes: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // ==================== PAY CONFIGURATION (PayLinQ-specific) ====================
  
  /**
   * Create or update pay configuration for worker type
   * @param {string} workerTypeId - Worker type UUID (from HRIS)
   * @param {Object} payConfig - Pay configuration data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating/updating the config
   * @returns {Promise<Object>} Created/updated pay config
   */
  async upsertPayConfig(workerTypeId, payConfig, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.worker_type_pay_config 
      (worker_type_id, organization_id, default_pay_frequency,
       default_payment_method, overtime_eligible, pay_structure_template_code,
       created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (worker_type_id, organization_id)
      DO UPDATE SET
        default_pay_frequency = EXCLUDED.default_pay_frequency,
        default_payment_method = EXCLUDED.default_payment_method,
        overtime_eligible = EXCLUDED.overtime_eligible,
        pay_structure_template_code = EXCLUDED.pay_structure_template_code,
        updated_by = $7,
        updated_at = NOW()
      RETURNING *`,
      [
        workerTypeId,
        organizationId,
        payConfig.defaultPayFrequency,
        payConfig.defaultPaymentMethod,
        payConfig.overtimeEligible !== false,
        payConfig.payStructureTemplateCode || null,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type_pay_config', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get pay configuration for worker type
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Pay config or null
   */
  async getPayConfig(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.worker_type_pay_config
       WHERE worker_type_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_pay_config' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Delete pay configuration
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing deletion
   * @returns {Promise<boolean>} Success status
   */
  async deletePayConfig(workerTypeId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.worker_type_pay_config 
       SET deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE worker_type_id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, workerTypeId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.worker_type_pay_config', userId }
    );
    
    return result.rowCount > 0;
  }

  // ==================== WORKER TYPE HISTORY (Payroll-specific tracking) ====================
  
  /**
   * Record worker type change in history
   * @param {string} employeeId - Employee UUID
   * @param {string} workerTypeId - New worker type UUID (from HRIS)
   * @param {Date} effectiveFrom - Effective date
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User recording the change
   * @param {string} changeReason - Reason for change
   * @returns {Promise<Object>} Created history record
   */
  async recordWorkerTypeChange(employeeId, workerTypeId, effectiveFrom, organizationId, userId, changeReason = null) {
    const result = await this.query(
      `INSERT INTO payroll.worker_type_history 
      (organization_id, employee_id, worker_type_id, effective_from, 
       change_reason, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [organizationId, employeeId, workerTypeId, effectiveFrom, changeReason, userId],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type_history', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get worker type history for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Worker type history
   */
  async getWorkerTypeHistory(employeeId, organizationId) {
    const result = await this.query(
      `SELECT wth.*, 
              wt.name as worker_type_name, 
              wt.code as worker_type_code,
              u.first_name || ' ' || u.last_name as recorded_by_name
       FROM payroll.worker_type_history wth
       INNER JOIN hris.worker_type wt ON wt.id = wth.worker_type_id
       LEFT JOIN hris.user_account u ON u.id = wth.recorded_by
       WHERE wth.employee_id = $1 
         AND wth.organization_id = $2
       ORDER BY wth.effective_from DESC, wth.recorded_at DESC`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_history' }
    );
    
    return result.rows;
  }

  /**
   * Get worker type on specific date
   * Uses employee.worker_type_id first, falls back to history
   * @param {string} employeeId - Employee UUID
   * @param {Date} effectiveDate - Date to check
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type or null
   */
  async getWorkerTypeOnDate(employeeId, effectiveDate, organizationId) {
    // First, get current worker type from employee record
    const employeeResult = await this.query(
      `SELECT e.worker_type_id, wt.name, wt.code, wt.benefits_eligible, wt.pto_eligible
       FROM hris.employee e
       INNER JOIN hris.worker_type wt ON wt.id = e.worker_type_id
       WHERE e.id = $1 
         AND e.organization_id = $2 
         AND e.deleted_at IS NULL`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );
    
    if (employeeResult.rows.length === 0) {
      return null;
    }
    
    // Check if we need historical data
    const today = new Date();
    const checkDate = new Date(effectiveDate);
    
    if (checkDate >= today) {
      // Future or current date - use current worker type
      return employeeResult.rows[0];
    }
    
    // Historical date - check history
    const historyResult = await this.query(
      `SELECT wth.*, wt.name, wt.code, wt.benefits_eligible, wt.pto_eligible
       FROM payroll.worker_type_history wth
       INNER JOIN hris.worker_type wt ON wt.id = wth.worker_type_id
       WHERE wth.employee_id = $1 
         AND wth.organization_id = $2
         AND wth.effective_from <= $3
       ORDER BY wth.effective_from DESC, wth.recorded_at DESC
       LIMIT 1`,
      [employeeId, organizationId, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_history' }
    );
    
    // Return historical worker type if found, otherwise current
    return historyResult.rows[0] || employeeResult.rows[0];
  }

  // ==================== STATISTICS & REPORTING ====================
  
  /**
   * Count employees by worker type
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Worker type counts
   */
  async countEmployeesByWorkerType(organizationId) {
    const result = await this.query(
      `SELECT wt.id, wt.name, wt.code, COUNT(e.id) as employee_count
       FROM hris.worker_type wt
       LEFT JOIN hris.employee e ON e.worker_type_id = wt.id 
                                 AND e.deleted_at IS NULL
       WHERE wt.organization_id = $1 AND wt.deleted_at IS NULL
       GROUP BY wt.id, wt.name, wt.code
       ORDER BY wt.name ASC`,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return result.rows;
  }

  /**
   * Get employees by worker type
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Employees with this worker type
   */
  async getEmployeesByWorkerType(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT e.id, e.employee_number, e.first_name, e.last_name, 
              e.email, e.employment_status, e.hire_date
       FROM hris.employee e
       WHERE e.worker_type_id = $1 
         AND e.organization_id = $2
         AND e.deleted_at IS NULL
       ORDER BY e.last_name, e.first_name`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );
    
    return result.rows;
  }

  /**
   * Get worker type usage statistics
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Usage statistics
   */
  async getWorkerTypeStats(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT 
        COUNT(DISTINCT e.id) as current_employee_count,
        COUNT(DISTINCT wth.employee_id) as historical_employee_count,
        COUNT(DISTINCT CASE WHEN wth.effective_from > NOW() - INTERVAL '90 days' THEN wth.employee_id END) as recent_changes
       FROM hris.employee e
       LEFT JOIN payroll.worker_type_history wth 
         ON wth.worker_type_id = $1 
         AND wth.organization_id = $2
       WHERE e.worker_type_id = $1 
         AND e.organization_id = $2
         AND e.deleted_at IS NULL`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );
    
    return result.rows[0] || { 
      current_employee_count: 0, 
      historical_employee_count: 0, 
      recent_changes: 0 
    };
  }

  // ==================== PAY STRUCTURE TEMPLATE UPGRADE ====================

  /**
   * Get employees that need pay structure template upgrade
   * Compares worker type's target template vs employee's current pay structure template
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Employees needing upgrade
   */
  async getEmployeesNeedingTemplateUpgrade(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT 
        e.id as employee_id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.hire_date,
        wps.id as worker_pay_structure_id,
        wps.template_version_id as current_template_id,
        pst_current.template_code as current_template_code,
        pst_current.template_name as current_template_name,
        pst_current.version_string as current_template_version,
        wtpc.pay_structure_template_code as target_template_code,
        pst_target.template_name as target_template_name,
        pst_target.version_string as target_template_version,
        pst_target.id as target_template_id
       FROM hris.employee e
       LEFT JOIN payroll.worker_pay_structure wps
         ON wps.employee_id = e.id
         AND wps.organization_id = e.organization_id
         AND wps.is_current = true
         AND wps.deleted_at IS NULL
       LEFT JOIN payroll.pay_structure_template pst_current
         ON pst_current.id = wps.template_version_id
         AND pst_current.organization_id = e.organization_id
         AND pst_current.deleted_at IS NULL
       LEFT JOIN payroll.worker_type_pay_config wtpc
         ON wtpc.worker_type_id = e.worker_type_id
         AND wtpc.organization_id = e.organization_id
         AND wtpc.deleted_at IS NULL
       LEFT JOIN payroll.pay_structure_template pst_target
         ON pst_target.template_code = wtpc.pay_structure_template_code
         AND pst_target.organization_id = e.organization_id
         AND pst_target.status = 'active'
         AND pst_target.deleted_at IS NULL
       WHERE e.worker_type_id = $1
         AND e.organization_id = $2
         AND e.deleted_at IS NULL
         AND wtpc.pay_structure_template_code IS NOT NULL
         AND (
           wps.template_version_id IS NULL 
           OR pst_current.template_code != wtpc.pay_structure_template_code
         )
       ORDER BY e.last_name, e.first_name`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );
    
    return result.rows;
  }

  /**
   * Get upgrade status for worker type template
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Upgrade status summary
   */
  async getTemplateUpgradeStatus(workerTypeId, organizationId) {
    const result = await this.query(
      `SELECT 
        wt.id as worker_type_id,
        wt.name as worker_type_name,
        wt.code as worker_type_code,
        wtpc.pay_structure_template_code as target_template_code,
        COUNT(DISTINCT e.id) as total_workers,
        COUNT(DISTINCT CASE 
          WHEN wps.template_version_id IS NOT NULL 
               AND pst_current.template_code = wtpc.pay_structure_template_code 
          THEN e.id 
        END) as up_to_date_count,
        COUNT(DISTINCT CASE 
          WHEN wps.template_version_id IS NULL 
               OR pst_current.template_code != wtpc.pay_structure_template_code 
               OR pst_current.template_code IS NULL
          THEN e.id 
        END) as outdated_count
       FROM hris.worker_type wt
       LEFT JOIN payroll.worker_type_pay_config wtpc
         ON wtpc.worker_type_id = wt.id
         AND wtpc.organization_id = wt.organization_id
         AND wtpc.deleted_at IS NULL
       LEFT JOIN hris.employee e
         ON e.worker_type_id = wt.id
         AND e.organization_id = wt.organization_id
         AND e.deleted_at IS NULL
       LEFT JOIN payroll.worker_pay_structure wps
         ON wps.employee_id = e.id
         AND wps.organization_id = e.organization_id
         AND wps.is_current = true
         AND wps.deleted_at IS NULL
       LEFT JOIN payroll.pay_structure_template pst_current
         ON pst_current.id = wps.template_version_id
         AND pst_current.organization_id = wt.organization_id
         AND pst_current.deleted_at IS NULL
       WHERE wt.id = $1
         AND wt.organization_id = $2
         AND wt.deleted_at IS NULL
       GROUP BY wt.id, wt.name, wt.code, wtpc.pay_structure_template_code`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.worker_type' }
    );
    
    return result.rows[0];
  }

  /**
   * Bulk update employee records with new pay structure template
   * @param {Array<string>} employeeIds - Employee IDs to update
   * @param {string} templateId - Pay structure template ID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing update
   * @param {Date} effectiveDate - Effective date for change
   * @returns {Promise<number>} Count of updated records
   */
  async bulkUpdateWorkerTemplates(employeeIds, templateId, organizationId, userId, effectiveDate = new Date()) {
    if (!employeeIds || employeeIds.length === 0) {
      return 0;
    }

    // First, get the template code from template ID
    const templateResult = await this.query(
      `SELECT template_code FROM payroll.pay_structure_template WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_structure_template' }
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Pay structure template not found');
    }

    const templateCode = templateResult.rows[0].template_code;

    // Update employee payroll configs
    const result = await this.query(
      `UPDATE payroll.employee_payroll_config
       SET 
         pay_structure_template_code = $1,
         updated_by = $2,
         updated_at = $3
       WHERE employee_id = ANY($4::uuid[])
         AND organization_id = $5
         AND deleted_at IS NULL
       RETURNING id`,
      [templateCode, userId, effectiveDate, employeeIds, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.employee_payroll_config' }
    );

    return result.rowCount || 0;
  }

  // ==================== WORKER TYPE CRUD (HRIS Table) ====================

  /**
   * Validates and sanitizes field names to prevent SQL injection
   * @param {string} fieldName - Field name to validate
   * @param {Array<string>} allowedFields - Whitelist of allowed fields
   * @returns {string} Validated field name
   * @throws {Error} If field name is invalid
   * @private
   */
  _validateFieldName(fieldName, allowedFields) {
    if (!allowedFields.includes(fieldName)) {
      throw new Error(`Invalid field name: ${fieldName}`);
    }
    // Additional check: only allow alphanumeric and underscores
    if (!/^[a-z_][a-z0-9_]*$/.test(fieldName)) {
      throw new Error(`Invalid field name format: ${fieldName}`);
    }
    return fieldName;
  }

  /**
   * Update worker type in HRIS
   * Updates both hris.worker_type and payroll.worker_type_pay_config in a transaction
   * @param {string} workerTypeId - Worker type UUID
   * @param {Object} updates - Fields to update (snake_case)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing update
   * @returns {Promise<Object>} Updated worker type with pay config
   * @throws {Error} If no valid fields to update or transaction fails
   */
  async update(workerTypeId, updates, organizationId, userId) {
    // Whitelist of allowed fields (prevents SQL injection)
    const ALLOWED_HRIS_FIELDS = [
      'name', 'description', 'benefits_eligible',
      'pto_eligible', 'sick_leave_eligible', 'vacation_accrual_rate'
    ];
    const ALLOWED_PAY_CONFIG_FIELDS = [
      'default_pay_frequency', 'default_payment_method', 'pay_structure_template_code',
      'overtime_eligible'
    ];

    const hrisUpdates = {};
    const payConfigUpdates = {};

    // Validate and separate fields
    Object.keys(updates).forEach(key => {
      try {
        if (ALLOWED_HRIS_FIELDS.includes(key)) {
          this._validateFieldName(key, ALLOWED_HRIS_FIELDS);
          hrisUpdates[key] = updates[key];
        } else if (ALLOWED_PAY_CONFIG_FIELDS.includes(key)) {
          this._validateFieldName(key, ALLOWED_PAY_CONFIG_FIELDS);
          payConfigUpdates[key] = updates[key];
        }
      } catch (err) {
        logger.warn('Invalid field name attempted', { fieldName: key, error: err.message });
        // Skip invalid fields rather than throwing
      }
    });

    if (Object.keys(hrisUpdates).length === 0 && Object.keys(payConfigUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Use transaction for atomic updates across both tables
    const pool = (await import('../../../config/database')).default;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let updatedWorkerType = null;

      // Update HRIS worker type if there are HRIS fields
      if (Object.keys(hrisUpdates).length > 0) {
        const setClauses = [];
        const values = [];
        let paramCount = 0;

        // Build SET clauses with validated field names
        Object.keys(hrisUpdates).forEach(key => {
          paramCount++;
          setClauses.push(`${key} = $${paramCount}`);
          values.push(hrisUpdates[key]);
        });

        paramCount++;
        values.push(userId);
        paramCount++;
        values.push(workerTypeId);
        paramCount++;
        values.push(organizationId);

        const updateQuery = `
          UPDATE hris.worker_type
          SET ${setClauses.join(', ')},
              updated_by = $${paramCount - 2},
              updated_at = NOW()
          WHERE id = $${paramCount - 1}
            AND organization_id = $${paramCount}
            AND deleted_at IS NULL
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);
        
        if (result.rowCount === 0) {
          throw new Error('Worker type not found or already deleted');
        }
        
        updatedWorkerType = result.rows[0];
      }

      // Update or insert pay config if there are pay config fields
      if (Object.keys(payConfigUpdates).length > 0) {
        // Use the client for pay config update within same transaction
        const setClauses = [];
        const values = [workerTypeId, organizationId];
        let paramCount = 2;

        Object.keys(payConfigUpdates).forEach(key => {
          paramCount++;
          setClauses.push(`${key} = $${paramCount}`);
          values.push(payConfigUpdates[key]);
        });

        paramCount++;
        values.push(userId);

        await client.query(`
          INSERT INTO payroll.worker_type_pay_config (
            worker_type_id,
            organization_id,
            ${Object.keys(payConfigUpdates).join(', ')},
            created_by,
            updated_by
          ) VALUES (
            $1,
            $2,
            ${Object.keys(payConfigUpdates).map((_, i) => `$${i + 3}`).join(', ')},
            $${paramCount},
            $${paramCount}
          )
          ON CONFLICT (worker_type_id, organization_id)
          DO UPDATE SET
            ${setClauses.join(', ')},
            updated_by = $${paramCount},
            updated_at = NOW()
        `, values);
      }

      await client.query('COMMIT');

      // Return updated worker type with pay config
      return await this.findById(workerTypeId, organizationId);

    } catch (error) {
      await client.query('ROLLBACK');
      
      logger.error('Failed to update worker type', {
        error: error.message,
        workerTypeId,
        organizationId,
        updateFields: Object.keys(updates)
      });
      
      // Re-throw with more context
      if (error.code === '23505') { // Unique violation
        throw new Error('Worker type with this code already exists');
      } else if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid reference in update data');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete worker type (soft delete)
   * Checks for dependencies before deleting
   * @param {string} workerTypeId - Worker type UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing delete
   * @returns {Promise<boolean>} Success status
   * @throws {Error} If worker type has active employees or not found
   */
  async delete(workerTypeId, organizationId, userId) {
    // Check if worker type has active employees (prevent orphaning)
    const employeeCheck = await this.query(
      `SELECT COUNT(*) as count
       FROM hris.employee_record
       WHERE worker_type_id = $1
         AND organization_id = $2
         AND deleted_at IS NULL`,
      [workerTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee_record' }
    );

    const activeEmployeeCount = parseInt(employeeCheck.rows[0].count);
    if (activeEmployeeCount > 0) {
      throw new Error(
        `Cannot delete worker type: ${activeEmployeeCount} active employee(s) are assigned to it. ` +
        `Reassign employees to another worker type before deleting.`
      );
    }

    // Soft delete the worker type
    const result = await this.query(
      `UPDATE hris.worker_type
       SET deleted_at = NOW(),
           deleted_by = $1,
           updated_at = NOW(),
           updated_by = $1
       WHERE id = $2
         AND organization_id = $3
         AND deleted_at IS NULL`,
      [userId, workerTypeId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'hris.worker_type' }
    );

    if (result.rowCount === 0) {
      throw new Error('Worker type not found or already deleted');
    }

    logger.info('Worker type soft deleted', {
      workerTypeId,
      organizationId,
      userId
    });

    return true;
  }
}

export default WorkerTypeRepository;
