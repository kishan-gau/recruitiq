/**
 * Worker Type Repository
 * 
 * Data access layer for worker type template management and employee
 * worker type assignments. Supports multiple worker types per organization
 * and historical tracking of worker type changes.
 * 
 * @module products/paylinq/repositories/workerTypeRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class WorkerTypeRepository {
  constructor(database = null) {
    this.query = database?.query || query;
  }

  // ==================== WORKER TYPE TEMPLATES ====================
  
  /**
   * Create worker type template
   * @param {Object} templateData - Worker type template data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the template
   * @returns {Promise<Object>} Created worker type template
   */
  async createTemplate(templateData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.worker_type_template 
      (organization_id, name, code, description, default_pay_frequency,
       default_payment_method, benefits_eligible, overtime_eligible, 
       pto_eligible, sick_leave_eligible, vacation_accrual_rate,
       created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId,
        templateData.name,
        templateData.code,
        templateData.description,
        templateData.defaultPayFrequency,
        templateData.defaultPaymentMethod,
        templateData.benefitsEligible !== false,
        templateData.overtimeEligible !== false,
        templateData.ptoEligible !== false,
        templateData.sickLeaveEligible !== false,
        templateData.vacationAccrualRate || 0,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type_template', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find all worker type templates for organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Worker type templates
   */
  async findTemplatesByOrganization(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.code) {
      paramCount++;
      whereClause += ` AND code = $${paramCount}`;
      params.push(filters.code);
    }
    
    const result = await this.query(
      `SELECT * FROM payroll.worker_type_template
       ${whereClause}
       ORDER BY name ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_template' }
    );
    
    return result.rows;
  }

  /**
   * Find worker type template by ID
   * @param {string} templateId - Worker type template UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type template or null
   */
  async findTemplateById(templateId, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.worker_type_template
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_template' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find worker type template by code
   * @param {string} code - Worker type code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type template or null
   */
  async findTemplateByCode(code, organizationId) {
    const result = await this.query(
      `SELECT * FROM payroll.worker_type_template
       WHERE code = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [code, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_template' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update worker type template
   * @param {string} templateId - Worker type template UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated worker type template
   */
  async updateTemplate(templateId, updates, organizationId, userId) {
    const allowedFields = [
      'name', 'description', 'default_pay_frequency',
      'default_payment_method', 'benefits_eligible', 'overtime_eligible',
      'pto_eligible', 'sick_leave_eligible', 'vacation_accrual_rate', 'status'
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
    params.push(templateId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.worker_type_template 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_type_template', userId }
    );
    
    return result.rows[0];
  }

  // ==================== WORKER TYPE ASSIGNMENTS ====================
  
  /**
   * Assign worker type to employee
   * @param {Object} assignmentData - Worker type assignment data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignment
   * @returns {Promise<Object>} Created worker type assignment
   */
  async assignWorkerType(assignmentData, organizationId, userId) {
    // Set previous assignment to non-current
    await this.query(
      `UPDATE payroll.worker_type 
       SET is_current = false, 
           effective_to = $1, 
           updated_by = $2,
           updated_at = NOW()
       WHERE employee_id = $3 AND organization_id = $4 AND is_current = true`,
      [assignmentData.effectiveFrom, userId, assignmentData.employeeId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_type', userId }
    );
    
    // Create new assignment
    const result = await this.query(
      `INSERT INTO payroll.worker_type 
      (organization_id, employee_id, worker_type_template_id, effective_from, 
       pay_frequency, payment_method, is_current, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING *`,
      [
        organizationId,
        assignmentData.employeeId,
        assignmentData.workerTypeTemplateId,
        assignmentData.effectiveFrom,
        assignmentData.payFrequency, // Optional override from template
        assignmentData.paymentMethod, // Optional override from template
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get current worker type for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Current worker type or null
   */
  async findCurrentWorkerType(employeeId, organizationId) {
    const result = await this.query(
      `SELECT wt.*, 
              wtt.name as template_name, 
              wtt.code as template_code,
              wtt.benefits_eligible, 
              wtt.overtime_eligible,
              wtt.pto_eligible,
              wtt.sick_leave_eligible,
              wtt.vacation_accrual_rate
       FROM payroll.worker_type wt
       INNER JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
       WHERE wt.employee_id = $1 
         AND wt.organization_id = $2
         AND wt.is_current = true
         AND wt.deleted_at IS NULL`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Get worker type history for employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Worker type history
   */
  async findWorkerTypeHistory(employeeId, organizationId) {
    const result = await this.query(
      `SELECT wt.*, 
              wtt.name as template_name, 
              wtt.code as template_code
       FROM payroll.worker_type wt
       INNER JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
       WHERE wt.employee_id = $1 
         AND wt.organization_id = $2
         AND wt.deleted_at IS NULL
       ORDER BY wt.effective_from DESC`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type' }
    );
    
    return result.rows;
  }

  /**
   * Get worker type assignments by template
   * @param {string} templateId - Worker type template UUID
   * @param {string} organizationId - Organization UUID
   * @param {boolean} currentOnly - Only return current assignments
   * @returns {Promise<Array>} Worker type assignments
   */
  async findAssignmentsByTemplate(templateId, organizationId, currentOnly = false) {
    let whereClause = `WHERE wt.worker_type_template_id = $1 
                       AND wt.organization_id = $2 
                       AND wt.deleted_at IS NULL`;
    
    if (currentOnly) {
      whereClause += ' AND wt.is_current = true';
    }
    
    const result = await this.query(
      `SELECT wt.*, 
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name
       FROM payroll.worker_type wt
       INNER JOIN hris.employee e ON e.id = wt.employee_id
       ${whereClause}
       ORDER BY wt.effective_from DESC`,
      [templateId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type' }
    );
    
    return result.rows;
  }

  /**
   * Count employees by worker type template
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Worker type counts
   */
  async countEmployeesByWorkerType(organizationId) {
    const result = await this.query(
      `SELECT wtt.id, wtt.name, wtt.code, COUNT(wt.employee_id) as employee_count
       FROM payroll.worker_type_template wtt
       LEFT JOIN payroll.worker_type wt ON wt.worker_type_template_id = wtt.id 
                                         AND wt.is_current = true 
                                         AND wt.deleted_at IS NULL
       WHERE wtt.organization_id = $1 AND wtt.deleted_at IS NULL
       GROUP BY wtt.id, wtt.name, wtt.code
       ORDER BY wtt.name ASC`,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type_template' }
    );
    
    return result.rows;
  }

  /**
   * Get worker type effective on specific date
   * @param {string} employeeId - Employee UUID
   * @param {Date} effectiveDate - Date to check
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Worker type or null
   */
  async findWorkerTypeOnDate(employeeId, effectiveDate, organizationId) {
    const result = await this.query(
      `SELECT wt.*, 
              wtt.name as template_name, 
              wtt.code as template_code,
              wtt.benefits_eligible, 
              wtt.overtime_eligible
       FROM payroll.worker_type wt
       INNER JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
       WHERE wt.employee_id = $1 
         AND wt.organization_id = $2
         AND wt.effective_from <= $3
         AND (wt.effective_to IS NULL OR wt.effective_to >= $3)
         AND wt.deleted_at IS NULL
       ORDER BY wt.effective_from DESC
       LIMIT 1`,
      [employeeId, organizationId, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Bulk assign worker type to multiple employees
   * @param {Array} assignments - Array of assignment objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the assignments
   * @returns {Promise<Array>} Created worker type assignments
   */
  async bulkAssignWorkerType(assignments, organizationId, userId) {
    const results = [];
    
    for (const assignment of assignments) {
      const result = await this.assignWorkerType(assignment, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Delete worker type template (soft delete)
   * @param {string} templateId - Worker type template UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteTemplate(templateId, organizationId, userId) {
    // Check if template is in use
    const assignments = await this.findAssignmentsByTemplate(templateId, organizationId, true);
    
    if (assignments.length > 0) {
      throw new Error(`Cannot delete worker type template. It is currently assigned to ${assignments.length} employee(s).`);
    }
    
    const result = await this.query(
      `UPDATE payroll.worker_type_template 
       SET deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, templateId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.worker_type_template', userId }
    );
    
    return result.rowCount > 0;
  }
}

export default WorkerTypeRepository;
