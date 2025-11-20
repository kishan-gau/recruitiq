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
        INSERT INTO hris.benefits_plan (
          organization_id, plan_name, plan_type, description,
          provider_name, coverage_level,
          effective_date, termination_date,
          employee_cost, employer_contribution,
          contribution_frequency, eligibility_rules,
          waiting_period_days, is_active, created_by, updated_by
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
        planData.coverage_level || 'employee',
        planData.effective_date || null,
        planData.termination_date || null,
        planData.employee_cost || 0,
        planData.employer_contribution || 0,
        planData.contribution_frequency || 'monthly',
        planData.eligibility_rules || '{}',
        planData.waiting_period_days || 0,
        planData.is_active !== false,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.benefits_plan'
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
        SELECT * FROM hris.benefits_plan
        WHERE id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.benefits_plan'
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
        FROM hris.benefits_plan bp
        LEFT JOIN hris.employee_benefit_enrollment be ON bp.id = be.benefits_plan_id AND be.deleted_at IS NULL
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
        table: 'hris.benefits_plan'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.benefits_plan bp
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
        table: 'hris.benefits_plan'
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
   * Get enrollment summary for a benefit plan
   */
  async getEnrollmentSummary(planId, organizationId) {
    try {
      this.logger.debug('Getting enrollment summary', { planId, organizationId });

      const sql = `
        SELECT 
          COUNT(be.id) as enrollment_count,
          COUNT(DISTINCT be.employee_id) as unique_employees,
          COALESCE(AVG(bp.employee_cost + bp.employer_contribution), 0) as average_cost_per_enrollment,
          COALESCE(SUM(bp.employee_cost), 0) as total_employee_cost,
          COALESCE(SUM(bp.employer_contribution), 0) as total_employer_cost,
          COUNT(CASE WHEN be.status = 'active' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN be.status = 'pending' THEN 1 END) as pending_enrollments,
          COUNT(CASE WHEN be.status = 'cancelled' THEN 1 END) as terminated_enrollments
        FROM hris.benefits_plan bp
        LEFT JOIN hris.employee_benefit_enrollment be 
          ON bp.id = be.benefits_plan_id 
          AND be.deleted_at IS NULL
        WHERE bp.id = $1 
          AND bp.organization_id = $2
          AND bp.deleted_at IS NULL
        GROUP BY bp.id
      `;

      const result = await query(sql, [planId, organizationId], organizationId, {
        operation: 'select',
        table: 'hris.benefits_plan'
      });

      if (result.rows.length === 0) {
        // Plan exists but has no enrollments
        return {
          enrollmentCount: 0,
          uniqueEmployees: 0,
          averageCostPerEnrollment: 0,
          totalEmployeeCost: 0,
          totalEmployerCost: 0,
          activeEnrollments: 0,
          pendingEnrollments: 0,
          terminatedEnrollments: 0
        };
      }

      const summary = result.rows[0];

      return {
        enrollmentCount: parseInt(summary.enrollment_count) || 0,
        uniqueEmployees: parseInt(summary.unique_employees) || 0,
        averageCostPerEnrollment: parseFloat(summary.average_cost_per_enrollment) || 0,
        totalEmployeeCost: parseFloat(summary.total_employee_cost) || 0,
        totalEmployerCost: parseFloat(summary.total_employer_cost) || 0,
        activeEnrollments: parseInt(summary.active_enrollments) || 0,
        pendingEnrollments: parseInt(summary.pending_enrollments) || 0,
        terminatedEnrollments: parseInt(summary.terminated_enrollments) || 0
      };
    } catch (error) {
      this.logger.error('Error getting enrollment summary', { 
        error: error.message,
        planId,
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
        SELECT id FROM hris.benefits_plan 
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
        UPDATE hris.benefits_plan 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.benefits_plan'
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
   * Automatically creates payroll deduction in PayLinQ
   */
  async enrollEmployee(enrollmentData, organizationId, userId) {
    const IntegrationService = (await import('../../paylinq/services/integrationService.js')).default;
    const integrationService = new IntegrationService();

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
        SELECT id FROM hris.employee_benefit_enrollment 
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
        INSERT INTO hris.employee_benefit_enrollment (
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
        table: 'hris.employee_benefit_enrollment'
      });

      const enrollment = result.rows[0];

      this.logger.info('Employee enrolled successfully', { 
        enrollmentId: enrollment.id,
        organizationId 
      });

      // Get plan details for integration
      const planSql = `SELECT plan_name FROM hris.benefit_plan WHERE id = $1 AND organization_id = $2`;
      const planResult = await query(planSql, [enrollmentData.plan_id, organizationId], organizationId);
      const planName = planResult.rows[0]?.plan_name || 'Benefit Plan';

      // Create payroll deduction in PayLinQ (non-blocking)
      try {
        this.logger.info('Creating payroll deduction for benefits enrollment', {
          enrollmentId: enrollment.id,
          employeeId: enrollmentData.employee_id,
          contribution: enrollmentData.employee_contribution_amount
        });

        const deductionResult = await integrationService.addBenefitsDeductionFromNexus(
          {
            employeeId: enrollmentData.employee_id,
            enrollmentId: enrollment.id,
            organizationId,
            planName,
            employeeContribution: enrollmentData.employee_contribution_amount || 0,
            startDate: enrollmentData.coverage_start_date || new Date()
          },
          userId
        );

        if (deductionResult.success) {
          this.logger.info('Payroll deduction created successfully', {
            enrollmentId: enrollment.id,
            deductionId: deductionResult.data?.deductionId
          });
        } else {
          this.logger.warn('Payroll deduction creation failed but enrollment succeeded', {
            enrollmentId: enrollment.id,
            error: deductionResult.error
          });
        }
      } catch (integrationError) {
        // Log error but don't fail the enrollment
        this.logger.error('Failed to create payroll deduction (enrollment still successful)', {
          enrollmentId: enrollment.id,
          error: integrationError.message
        });
      }

      return enrollment;
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
        SELECT id FROM hris.employee_benefit_enrollment 
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
        const getSql = `SELECT * FROM hris.employee_benefit_enrollment WHERE id = $1 AND organization_id = $2`;
        const getResult = await query(getSql, [id, organizationId], organizationId);
        return getResult.rows[0];
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.employee_benefit_enrollment 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.employee_benefit_enrollment'
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
        SELECT id, status FROM hris.employee_benefit_enrollment 
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
        UPDATE hris.employee_benefit_enrollment 
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
        table: 'hris.employee_benefit_enrollment'
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
   * List enrollments with filters
   */
  async listEnrollments(organizationId, filters = {}) {
    try {
      this.logger.debug('Listing benefit enrollments', { 
        organizationId,
        filters 
      });

      const conditions = ['be.organization_id = $1', 'be.deleted_at IS NULL'];
      const values = [organizationId];
      let paramCount = 1;

      // Add status filter
      if (filters.status) {
        paramCount++;
        conditions.push(`be.enrollment_status = $${paramCount}`);
        values.push(filters.status);
      }

      // Add plan filter
      if (filters.planId) {
        paramCount++;
        conditions.push(`be.plan_id = $${paramCount}`);
        values.push(filters.planId);
      }

      const sql = `
        SELECT be.*, 
               bp.plan_name,
               bp.plan_type,
               bp.provider_name,
               e.first_name,
               e.last_name,
               e.email
        FROM hris.employee_benefit_enrollment be
        JOIN hris.benefits_plan bp ON be.plan_id = bp.id
        JOIN hris.employee e ON be.employee_id = e.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY be.enrollment_date DESC
      `;

      const result = await query(sql, values, organizationId, {
        operation: 'findAll',
        table: 'hris.employee_benefit_enrollment'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error listing enrollments', { 
        error: error.message,
        organizationId,
        filters 
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
        FROM hris.employee_benefit_enrollment be
        JOIN hris.benefits_plan bp ON be.benefits_plan_id = bp.id
        WHERE be.employee_id = $1 
          AND be.organization_id = $2
          AND be.deleted_at IS NULL
        ORDER BY be.enrollment_date DESC
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.employee_benefit_enrollment'
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
        FROM hris.employee_benefit_enrollment be
        JOIN hris.employee e ON be.employee_id = e.id
        WHERE be.benefits_plan_id = $1 
          AND be.organization_id = $2
          AND be.deleted_at IS NULL
        ORDER BY be.enrollment_date DESC
      `;

      const result = await query(sql, [planId, organizationId], organizationId, {
        operation: 'findAll',
        table: 'hris.employee_benefit_enrollment'
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

