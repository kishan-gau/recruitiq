/**
 * BenefitsService
 * Business logic layer for employee benefits management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class BenefitsService {
  constructor() {
    this.logger = logger;
  }

  // ========== BENEFIT PLANS ==========

  /**
   * Create a new benefit plan
   */
  async createPlan(planData, organizationId, userId) {
    try {
      this.logger.info('Creating benefit plan', { 
        organizationId, 
        userId,
        planType: planData.plan_type 
      });

      if (!planData.plan_name) {
        throw new Error('Plan name is required');
      }
      if (!planData.plan_type) {
        throw new Error('Plan type is required');
      }

      const sql = `
        INSERT INTO hris.benefit_plan (
          organization_id, plan_name, plan_type, description,
          provider_name, provider_contact, policy_number,
          coverage_start_date, coverage_end_date,
          employee_contribution, employer_contribution,
          contribution_frequency, eligibility_criteria,
          is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        planData.plan_name,
        planData.plan_type,
        planData.description || null,
        planData.provider_name || null,
        planData.provider_contact || null,
        planData.policy_number || null,
        planData.coverage_start_date || null,
        planData.coverage_end_date || null,
        planData.employee_contribution || 0,
        planData.employer_contribution || 0,
        planData.contribution_frequency || 'monthly',
        planData.eligibility_criteria || null,
        planData.is_active !== false,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.benefit_plan'
      });

      this.logger.info('Benefit plan created successfully', { 
        planId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating benefit plan', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get benefit plan by ID
   */
  async getPlan(id, organizationId) {
    try {
      this.logger.debug('Getting benefit plan', { id, organizationId });

      const sql = `
        SELECT * FROM hris.benefit_plan
        WHERE id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.benefit_plan'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Benefit plan not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting benefit plan', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List benefit plans with optional filters
   */
  async listPlans(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing benefit plans', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT bp.*,
               COUNT(be.id) as enrollment_count
        FROM hris.benefit_plan bp
        LEFT JOIN hris.benefit_enrollment be ON bp.id = be.plan_id AND be.deleted_at IS NULL
        WHERE bp.organization_id = $1 AND bp.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.planType) {
        sql += ` AND bp.plan_type = $${paramIndex}`;
        params.push(filters.planType);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        sql += ` AND bp.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      sql += ` GROUP BY bp.id ORDER BY bp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.benefit_plan'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.benefit_plan bp
        WHERE bp.organization_id = $1 AND bp.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (filters.planType) {
        countSql += ` AND bp.plan_type = $${countIndex}`;
        countParams.push(filters.planType);
        countIndex++;
      }

      if (filters.isActive !== undefined) {
        countSql += ` AND bp.is_active = $${countIndex}`;
        countParams.push(filters.isActive);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.benefit_plan'
      });

      return {
        plans: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing benefit plans', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update benefit plan
   */
  async updatePlan(id, planData, organizationId, userId) {
    try {
      this.logger.info('Updating benefit plan', { 
        id,
        organizationId,
        userId 
      });

      // Check if plan exists
      const checkSql = `
        SELECT id FROM hris.benefit_plan 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Benefit plan not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'plan_name', 'plan_type', 'description',
        'provider_name', 'provider_contact', 'policy_number',
        'coverage_start_date', 'coverage_end_date',
        'employee_contribution', 'employer_contribution',
        'contribution_frequency', 'eligibility_criteria', 'is_active'
      ];

      updateableFields.forEach(field => {
        if (planData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(planData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return await this.getPlan(id, organizationId);
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.benefit_plan 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.benefit_plan'
      });

      this.logger.info('Benefit plan updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating benefit plan', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  // ========== BENEFIT ENROLLMENTS ==========

  /**
   * Enroll employee in benefit plan
   */
  async enrollEmployee(enrollmentData, organizationId, userId) {
    try {
      this.logger.info('Enrolling employee in benefit plan', { 
        organizationId, 
        userId,
        employeeId: enrollmentData.employee_id,
        planId: enrollmentData.plan_id
      });

      if (!enrollmentData.employee_id) {
        throw new Error('Employee ID is required');
      }
      if (!enrollmentData.plan_id) {
        throw new Error('Plan ID is required');
      }

      // Check if employee is already enrolled in this plan
      const checkSql = `
        SELECT id FROM hris.benefit_enrollment 
        WHERE employee_id = $1 
          AND plan_id = $2 
          AND organization_id = $3
          AND status = 'active'
          AND deleted_at IS NULL
      `;
      const checkResult = await query(
        checkSql, 
        [enrollmentData.employee_id, enrollmentData.plan_id, organizationId],
        organizationId
      );

      if (checkResult.rows.length > 0) {
        throw new Error('Employee is already enrolled in this plan');
      }

      const sql = `
        INSERT INTO hris.benefit_enrollment (
          organization_id, employee_id, plan_id,
          enrollment_date, coverage_start_date, coverage_end_date,
          employee_contribution_amount, employer_contribution_amount,
          beneficiaries, status, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        enrollmentData.employee_id,
        enrollmentData.plan_id,
        enrollmentData.enrollment_date || new Date(),
        enrollmentData.coverage_start_date || new Date(),
        enrollmentData.coverage_end_date || null,
        enrollmentData.employee_contribution_amount || 0,
        enrollmentData.employer_contribution_amount || 0,
        enrollmentData.beneficiaries ? JSON.stringify(enrollmentData.beneficiaries) : null,
        'active',
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.benefit_enrollment'
      });

      this.logger.info('Employee enrolled successfully', { 
        enrollmentId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error enrolling employee', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Update enrollment
   */
  async updateEnrollment(id, enrollmentData, organizationId, userId) {
    try {
      this.logger.info('Updating benefit enrollment', { 
        id,
        organizationId,
        userId 
      });

      // Check if enrollment exists
      const checkSql = `
        SELECT id FROM hris.benefit_enrollment 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Enrollment not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'coverage_start_date', 'coverage_end_date',
        'employee_contribution_amount', 'employer_contribution_amount',
        'beneficiaries', 'status'
      ];

      updateableFields.forEach(field => {
        if (enrollmentData[field] !== undefined) {
          if (field === 'beneficiaries' && typeof enrollmentData[field] === 'object') {
            updates.push(`${field} = $${paramIndex}`);
            params.push(JSON.stringify(enrollmentData[field]));
          } else {
            updates.push(`${field} = $${paramIndex}`);
            params.push(enrollmentData[field]);
          }
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        const getSql = `SELECT * FROM hris.benefit_enrollment WHERE id = $1 AND organization_id = $2`;
        const getResult = await query(getSql, [id, organizationId], organizationId);
        return getResult.rows[0];
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.benefit_enrollment 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.benefit_enrollment'
      });

      this.logger.info('Enrollment updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating enrollment', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Terminate enrollment
   */
  async terminateEnrollment(id, endDate, reason, organizationId, userId) {
    try {
      this.logger.info('Terminating benefit enrollment', { 
        id,
        organizationId,
        userId 
      });

      // Check if enrollment exists and is active
      const checkSql = `
        SELECT id, status FROM hris.benefit_enrollment 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Enrollment not found');
      }

      if (checkResult.rows[0].status === 'terminated') {
        throw new Error('Enrollment is already terminated');
      }

      const sql = `
        UPDATE hris.benefit_enrollment 
        SET status = 'terminated',
            coverage_end_date = $3,
            termination_reason = $4,
            updated_by = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organization_id = $2
        RETURNING *
      `;

      const result = await query(sql, [id, organizationId, endDate, reason, userId], organizationId, {
        operation: 'update',
        table: 'hris.benefit_enrollment'
      });

      this.logger.info('Enrollment terminated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error terminating enrollment', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get employee enrollments
   */
  async getEmployeeEnrollments(employeeId, organizationId) {
    try {
      this.logger.debug('Getting employee benefit enrollments', { 
        employeeId,
        organizationId 
      });

      const sql = `
        SELECT be.*, 
               bp.plan_name,
               bp.plan_type,
               bp.provider_name
        FROM hris.benefit_enrollment be
        JOIN hris.benefit_plan bp ON be.plan_id = bp.id
        WHERE be.employee_id = $1 
          AND be.organization_id = $2
          AND be.deleted_at IS NULL
        ORDER BY be.enrollment_date DESC
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.benefit_enrollment'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting employee enrollments', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get plan enrollments
   */
  async getPlanEnrollments(planId, organizationId) {
    try {
      this.logger.debug('Getting plan enrollments', { 
        planId,
        organizationId 
      });

      const sql = `
        SELECT be.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               e.employee_number
        FROM hris.benefit_enrollment be
        JOIN hris.employee e ON be.employee_id = e.id
        WHERE be.plan_id = $1 
          AND be.organization_id = $2
          AND be.deleted_at IS NULL
        ORDER BY be.enrollment_date DESC
      `;

      const result = await query(sql, [planId, organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.benefit_enrollment'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting plan enrollments', { 
        error: error.message,
        planId,
        organizationId 
      });
      throw error;
    }
  }
}

export default BenefitsService;
