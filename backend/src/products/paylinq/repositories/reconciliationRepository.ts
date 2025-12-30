/**
 * Reconciliation Repository
 * 
 * Data access layer for payroll reconciliation, variance tracking, and adjustments.
 * Supports bank reconciliation, GL account reconciliation, and payroll adjustments.
 * 
 * MVP Version: Manual reconciliation with variance tracking
 * Phase 2: Automated bank reconciliation, GL integration, ML-based discrepancy detection
 * 
 * @module products/paylinq/repositories/reconciliationRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ReconciliationRepository {
  
  query: any;

constructor(database = null) {
    this.query = database?.query || query;
  }

  // ==================== RECONCILIATION ====================
  
  /**
   * Create reconciliation record
   * @param {Object} reconciliationData - Reconciliation data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the reconciliation
   * @returns {Promise<Object>} Created reconciliation
   */
  async createReconciliation(reconciliationData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.reconciliation 
      (organization_id, payroll_run_id, reconciliation_type, 
       reconciliation_date, status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        organizationId,
        reconciliationData.payrollRunId,
        reconciliationData.reconciliationType, // 'bank', 'gl', 'tax', 'benefit'
        reconciliationData.reconciliationDate || new Date(),
        'pending',
        reconciliationData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.reconciliation', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find reconciliations by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Reconciliations
   */
  async findReconciliations(criteria, organizationId) {
    let whereClause = 'WHERE r.organization_id = $1 AND r.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.payrollRunId) {
      paramCount++;
      whereClause += ` AND r.payroll_run_id = $${paramCount}`;
      params.push(criteria.payrollRunId);
    }
    
    if (criteria.reconciliationType) {
      paramCount++;
      whereClause += ` AND r.reconciliation_type = $${paramCount}`;
      params.push(criteria.reconciliationType);
    }
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND r.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.fromDate) {
      paramCount++;
      whereClause += ` AND r.reconciliation_date >= $${paramCount}`;
      params.push(criteria.fromDate);
    }
    
    if (criteria.toDate) {
      paramCount++;
      whereClause += ` AND r.reconciliation_date <= $${paramCount}`;
      params.push(criteria.toDate);
    }
    
    const result = await this.query(
      `SELECT r.*,
              pr.run_number,
              pr.run_name,
              pr.pay_period_start,
              pr.pay_period_end
       FROM payroll.reconciliation r
       LEFT JOIN payroll.payroll_run pr ON pr.id = r.payroll_run_id
       ${whereClause}
       ORDER BY r.reconciliation_date DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.reconciliation' }
    );
    
    return result.rows;
  }

  /**
   * Find reconciliation by ID
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Reconciliation or null
   */
  async findReconciliationById(reconciliationId, organizationId) {
    const result = await this.query(
      `SELECT r.*,
              pr.run_number,
              pr.total_net_pay as payroll_run_total
       FROM payroll.reconciliation r
       LEFT JOIN payroll.payroll_run pr ON pr.id = r.payroll_run_id
       WHERE r.id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL`,
      [reconciliationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.reconciliation' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated reconciliation
   */
  async updateReconciliation(reconciliationId, organizationId, updates) {
    const allowedFields = [
      'status', 'expected_total', 'actual_total', 'variance_amount',
      'reconciled_by', 'reconciled_at', 'notes'
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
      return null; // No valid updates
    }
    
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(reconciliationId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.reconciliation 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.reconciliation' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Complete reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {number} actualTotal - Actual reconciled amount
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User completing the reconciliation
   * @returns {Promise<Object>} Updated reconciliation
   */
  async completeReconciliation(reconciliationId, actualTotal, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.reconciliation 
       SET status = 'completed',
           actual_total = $1,
           variance_amount = expected_total - $1,
           reconciled_by = $2,
           reconciled_at = NOW(),
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [actualTotal, userId, reconciliationId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.reconciliation', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Delete (soft-delete) reconciliation
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the reconciliation
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteReconciliation(reconciliationId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.reconciliation 
       SET deleted_at = NOW(),
           deleted_by = $1
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [userId, reconciliationId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.reconciliation', userId }
    );
    
    return result.rows.length > 0;
  }

  // ==================== RECONCILIATION ITEMS ====================
  
  /**
   * Create reconciliation item
   * @param {Object} itemData - Reconciliation item data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the item
   * @returns {Promise<Object>} Created reconciliation item
   */
  async createReconciliationItem(itemData, organizationId, userId) {
    // Determine if item is reconciled (no variance = auto-reconciled)
    const isReconciled = itemData.varianceAmount === 0;
    
    const result = await this.query(
      `INSERT INTO payroll.reconciliation_item 
      (organization_id, reconciliation_id, item_type, item_reference,
       expected_amount, actual_amount, variance_amount, is_reconciled,
       reconciliation_notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId,
        itemData.reconciliationId,
        itemData.itemType, // 'paycheck', 'deduction', 'tax', 'benefit'
        itemData.referenceId,
        itemData.expectedAmount,
        itemData.actualAmount,
        itemData.varianceAmount,
        isReconciled,
        itemData.notes || itemData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.reconciliation_item', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find reconciliation items
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Reconciliation items
   */
  async findReconciliationItems(reconciliationId, organizationId, filters = {}) {
    let whereClause = 'WHERE ri.reconciliation_id = $1 AND ri.organization_id = $2 AND ri.deleted_at IS NULL';
    const params = [reconciliationId, organizationId];
    let paramCount = 2;
    
    if (filters.itemType) {
      paramCount++;
      whereClause += ` AND ri.item_type = $${paramCount}`;
      params.push(filters.itemType);
    }
    
    // Map isReconciled filter to database boolean field
    if (filters.isReconciled !== undefined) {
      paramCount++;
      whereClause += ` AND ri.is_reconciled = $${paramCount}`;
      params.push(filters.isReconciled);
    }
    
    if (filters.hasVariance) {
      whereClause += ` AND ri.variance_amount != 0`;
    }
    
    const result = await this.query(
      `SELECT ri.* 
       FROM payroll.reconciliation_item ri
       ${whereClause}
       ORDER BY ABS(ri.variance_amount) DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.reconciliation_item' }
    );
    
    return result.rows;
  }

  /**
   * Update reconciliation item
   * @param {string} itemId - Reconciliation item UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated reconciliation item
   */
  async updateReconciliationItem(itemId, organizationId, updates) {
    const allowedFields = {
      'actual_amount': 'actual_amount',
      'variance_amount': 'variance_amount', 
      'notes': 'reconciliation_notes',
      'description': 'reconciliation_notes',
      'is_reconciled': 'is_reconciled',
      'reconciled_at': 'reconciled_at'
    };
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields[key]) {
        paramCount++;
        setClause.push(`${allowedFields[key]} = $${paramCount}`);
        params.push(updates[key]);
      }
    });
    
    if (setClause.length === 0) {
      return null; // No valid updates
    }
    
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(itemId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.reconciliation_item 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.reconciliation_item' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Resolve reconciliation item
   * @param {string} itemId - Reconciliation item UUID
   * @param {string} resolution - Resolution notes/action taken
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User resolving the item
   * @returns {Promise<Object>} Updated reconciliation item
   */
  async resolveReconciliationItem(itemId, resolution, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.reconciliation_item 
       SET is_reconciled = true,
           reconciliation_notes = $1,
           reconciled_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [resolution, itemId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.reconciliation_item', userId }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get reconciliation summary
   * @param {string} reconciliationId - Reconciliation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Reconciliation summary
   */
  async getReconciliationSummary(reconciliationId, organizationId) {
    const result = await this.query(
      `SELECT 
        COUNT(ri.id) as total_items,
        COUNT(CASE WHEN ri.is_reconciled = false THEN 1 END) as pending_items,
        COUNT(CASE WHEN ri.is_reconciled = true THEN 1 END) as resolved_items,
        COUNT(CASE WHEN ri.variance_amount != 0 THEN 1 END) as items_with_variance,
        COALESCE(SUM(ri.expected_amount), 0) as total_expected,
        COALESCE(SUM(ri.actual_amount), 0) as total_actual,
        COALESCE(SUM(ri.variance_amount), 0) as total_variance,
        COALESCE(SUM(ABS(ri.variance_amount)), 0) as total_absolute_variance
       FROM payroll.reconciliation_item ri
       WHERE ri.reconciliation_id = $1
         AND ri.organization_id = $2
         AND ri.deleted_at IS NULL`,
      [reconciliationId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.reconciliation_item' }
    );
    
    return result.rows[0];
  }

  // ==================== PAYROLL ADJUSTMENTS ====================
  
  /**
   * Create payroll adjustment
   * @param {Object} adjustmentData - Payroll adjustment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the adjustment
   * @returns {Promise<Object>} Created payroll adjustment
   */
  async createPayrollAdjustment(adjustmentData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.payroll_adjustment 
      (organization_id, payroll_run_id, paycheck_id, adjustment_type,
       adjustment_reason, adjustment_amount, effective_date, status,
       notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId,
        adjustmentData.payrollRunId,
        adjustmentData.paycheckId,
        adjustmentData.adjustmentType, // 'correction', 'bonus', 'deduction', 'reimbursement'
        adjustmentData.adjustmentReason,
        adjustmentData.adjustmentAmount,
        adjustmentData.effectiveDate || new Date(),
        'pending',
        adjustmentData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.payroll_adjustment', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find payroll adjustments by run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Payroll adjustments
   */
  async findAdjustmentsByRun(payrollRunId, organizationId) {
    const result = await this.query(
      `SELECT pa.*,
              pc.employee_id,
              e.employee_number,
              e.first_name,
              e.last_name
       FROM payroll.payroll_adjustment pa
       LEFT JOIN payroll.paycheck pc ON pc.id = pa.paycheck_id
       LEFT JOIN hris.employee e ON e.id = pc.employee_id
       WHERE pa.payroll_run_id = $1 
         AND pa.organization_id = $2
         AND pa.deleted_at IS NULL
       ORDER BY pa.created_at DESC`,
      [payrollRunId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payroll_adjustment' }
    );
    
    return result.rows;
  }

  /**
   * Find payroll adjustments by employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payroll adjustments
   */
  async findAdjustmentsByEmployee(employeeId, organizationId, filters = {}) {
    let whereClause = `WHERE pc.employee_id = $1 
                       AND pa.organization_id = $2
                       AND pa.deleted_at IS NULL`;
    const params = [employeeId, organizationId];
    let paramCount = 2;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND pa.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.adjustmentType) {
      paramCount++;
      whereClause += ` AND pa.adjustment_type = $${paramCount}`;
      params.push(filters.adjustmentType);
    }
    
    const result = await this.query(
      `SELECT pa.*,
              pr.run_number,
              pr.pay_period_start,
              pr.pay_period_end
       FROM payroll.payroll_adjustment pa
       INNER JOIN payroll.paycheck pc ON pc.id = pa.paycheck_id
       LEFT JOIN payroll.payroll_run pr ON pr.id = pa.payroll_run_id
       ${whereClause}
       ORDER BY pa.effective_date DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.payroll_adjustment' }
    );
    
    return result.rows;
  }

  /**
   * Apply payroll adjustment
   * @param {string} adjustmentId - Payroll adjustment UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User applying the adjustment
   * @returns {Promise<Object>} Updated payroll adjustment
   */
  async applyAdjustment(adjustmentId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.payroll_adjustment 
       SET status = 'applied',
           applied_by = $1,
           applied_at = NOW(),
           updated_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [userId, adjustmentId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.payroll_adjustment', userId }
    );
    
    return result.rows[0];
  }
}

export default ReconciliationRepository;
