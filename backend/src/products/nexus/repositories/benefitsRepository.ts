/**
 * BenefitsRepository
 * Data access layer for benefits management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class BenefitsRepository {
  constructor(database = null) {
    this.query = database?.query || query;
    this.planTable = 'hris.benefit_plan';
    this.enrollmentTable = 'hris.benefit_enrollment';
    this.logger = logger;
  }

  // ========== PLANS ==========

  async findPlanById(id, organizationId) {
    try {
      const sql = `SELECT * FROM ${this.planTable} WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`;
      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding benefit plan', { id, error: error.message });
      throw error;
    }
  }

  async findAllPlans(filters, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      let sql = `
        SELECT p.*, 
               COUNT(e.id) as enrollment_count
        FROM ${this.planTable} p
        LEFT JOIN ${this.enrollmentTable} e ON p.id = e.benefit_plan_id AND e.deleted_at IS NULL
        WHERE p.organization_id = $1 AND p.deleted_at IS NULL
      `;
      const params = [organizationId];
      let paramIndex = 2;

      if (filters.planType) {
        sql += ` AND p.plan_type = $${paramIndex}`;
        params.push(filters.planType);
        paramIndex++;
      }
      if (filters.isActive !== undefined) {
        sql += ` AND p.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      sql += ` GROUP BY p.id ORDER BY p.plan_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding benefit plans', { error: error.message });
      throw error;
    }
  }

  async createPlan(planData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(planData);
      const sql = `
        INSERT INTO ${this.planTable} (
          organization_id, plan_name, plan_type, provider_name,
          coverage_details, employee_cost, employer_cost,
          enrollment_rules, is_active,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.plan_name, dbData.plan_type, dbData.provider_name || null,
        dbData.coverage_details ? JSON.stringify(dbData.coverage_details) : '{}',
        dbData.employee_cost || 0, dbData.employer_cost || 0,
        dbData.enrollment_rules ? JSON.stringify(dbData.enrollment_rules) : '{}',
        dbData.is_active !== undefined ? dbData.is_active : true,
        userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating benefit plan', { error: error.message });
      throw error;
    }
  }

  async updatePlan(id, planData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(planData);
      const sql = `
        UPDATE ${this.planTable}
        SET
          plan_name = COALESCE($1, plan_name),
          provider_name = COALESCE($2, provider_name),
          coverage_details = COALESCE($3, coverage_details),
          employee_cost = COALESCE($4, employee_cost),
          employer_cost = COALESCE($5, employer_cost),
          enrollment_rules = COALESCE($6, enrollment_rules),
          is_active = COALESCE($7, is_active),
          updated_by = $8,
          updated_at = NOW()
        WHERE id = $9 AND organization_id = $10 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [
        dbData.plan_name, dbData.provider_name,
        dbData.coverage_details ? JSON.stringify(dbData.coverage_details) : null,
        dbData.employee_cost, dbData.employer_cost,
        dbData.enrollment_rules ? JSON.stringify(dbData.enrollment_rules) : null,
        dbData.is_active, userId, id, organizationId
      ];
      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating benefit plan', { error: error.message });
      throw error;
    }
  }

  // ========== ENROLLMENTS ==========

  async findEnrollmentById(id, organizationId) {
    try {
      const sql = `
        SELECT e.*, 
               p.plan_name, p.plan_type,
               emp.first_name || ' ' || emp.last_name as employee_name
        FROM ${this.enrollmentTable} e
        LEFT JOIN ${this.planTable} p ON e.benefit_plan_id = p.id
        LEFT JOIN hris.employee emp ON e.employee_id = emp.id
        WHERE e.id = $1 AND e.organization_id = $2 AND e.deleted_at IS NULL
      `;
      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding enrollment', { error: error.message });
      throw error;
    }
  }

  async findEnrollmentsByEmployee(employeeId, organizationId) {
    try {
      const sql = `
        SELECT e.*,
               p.plan_name, p.plan_type, p.provider_name,
               p.employee_cost, p.employer_cost
        FROM ${this.enrollmentTable} e
        LEFT JOIN ${this.planTable} p ON e.benefit_plan_id = p.id
        WHERE e.employee_id = $1 AND e.organization_id = $2 AND e.deleted_at IS NULL
        ORDER BY e.enrollment_date DESC
      `;
      const result = await this.query(sql, [employeeId, organizationId], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding enrollments by employee', { error: error.message });
      throw error;
    }
  }

  async findActiveEnrollments(organizationId, planId = null) {
    try {
      let sql = `
        SELECT e.*,
               p.plan_name, p.plan_type,
               emp.first_name || ' ' || emp.last_name as employee_name
        FROM ${this.enrollmentTable} e
        LEFT JOIN ${this.planTable} p ON e.benefit_plan_id = p.id
        LEFT JOIN hris.employee emp ON e.employee_id = emp.id
        WHERE e.organization_id = $1 
          AND e.deleted_at IS NULL
          AND e.status = 'active'
          AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
      `;
      const params = [organizationId];

      if (planId) {
        sql += ` AND e.benefit_plan_id = $2`;
        params.push(planId);
      }

      sql += ` ORDER BY e.enrollment_date DESC`;

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding active enrollments', { error: error.message });
      throw error;
    }
  }

  async createEnrollment(enrollmentData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(enrollmentData);
      const sql = `
        INSERT INTO ${this.enrollmentTable} (
          organization_id, employee_id, benefit_plan_id,
          enrollment_date, coverage_level, dependents,
          employee_contribution, employer_contribution,
          status, start_date, end_date,
          created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.benefit_plan_id,
        dbData.enrollment_date || new Date(), dbData.coverage_level || null,
        dbData.dependents ? JSON.stringify(dbData.dependents) : '[]',
        dbData.employee_contribution || 0, dbData.employer_contribution || 0,
        dbData.status || 'pending', dbData.start_date, dbData.end_date || null,
        userId, userId
      ];
      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating enrollment', { error: error.message });
      throw error;
    }
  }

  async updateEnrollment(id, enrollmentData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(enrollmentData);
      const sql = `
        UPDATE ${this.enrollmentTable}
        SET
          coverage_level = COALESCE($1, coverage_level),
          dependents = COALESCE($2, dependents),
          employee_contribution = COALESCE($3, employee_contribution),
          employer_contribution = COALESCE($4, employer_contribution),
          status = COALESCE($5, status),
          end_date = COALESCE($6, end_date),
          updated_by = $7,
          updated_at = NOW()
        WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
        RETURNING *
      `;
      const params = [
        dbData.coverage_level,
        dbData.dependents ? JSON.stringify(dbData.dependents) : null,
        dbData.employee_contribution, dbData.employer_contribution,
        dbData.status, dbData.end_date, userId, id, organizationId
      ];
      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating enrollment', { error: error.message });
      throw error;
    }
  }

  async terminateEnrollment(id, endDate, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.enrollmentTable}
        SET
          status = 'terminated',
          end_date = $1,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
        RETURNING *
      `;
      const result = await this.query(sql, [endDate, userId, id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error terminating enrollment', { error: error.message });
      throw error;
    }
  }
}

export default BenefitsRepository;
