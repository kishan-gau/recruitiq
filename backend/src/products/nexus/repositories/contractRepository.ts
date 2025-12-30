/**
 * ContractRepository
 * Data access layer for employment contracts
 */

import { query } from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.ts';

class ContractRepository {
  constructor(database = null) {
    this.query = database?.query || query;
    this.tableName = 'hris.contract';
    this.logger = logger;
  }

  /**
   * Find contract by ID
   */
  async findById(id, organizationId) {
    try {
      const sql = `
        SELECT c.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.employee_number,
               d.department_name,
               l.location_name,
               p.policy_name as sequence_policy_name,
               s.step_name as current_step_name
        FROM ${this.tableName} c
        LEFT JOIN hris.employee e ON c.employee_id = e.id AND e.deleted_at IS NULL
        LEFT JOIN hris.department d ON c.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON c.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.contract_sequence_policy p ON c.contract_sequence_policy_id = p.id AND p.deleted_at IS NULL
        LEFT JOIN hris.contract_sequence_step s ON c.current_step_id = s.id AND s.deleted_at IS NULL
        WHERE c.id = $1 
          AND c.organization_id = $2
          AND c.deleted_at IS NULL
      `;

      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding contract by ID', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all contracts
   */
  async findAll(filters = {}, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'c.start_date DESC' } = options;

      let sql = `
        SELECT c.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.employee_number,
               d.department_name
        FROM ${this.tableName} c
        LEFT JOIN hris.employee e ON c.employee_id = e.id AND e.deleted_at IS NULL
        LEFT JOIN hris.department d ON c.department_id = d.id AND d.deleted_at IS NULL
        WHERE c.organization_id = $1 AND c.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.employeeId) {
        sql += ` AND c.employee_id = $${paramIndex}`;
        params.push(filters.employeeId);
        paramIndex++;
      }

      if (filters.status) {
        sql += ` AND c.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.contractType) {
        sql += ` AND c.contract_type = $${paramIndex}`;
        params.push(filters.contractType);
        paramIndex++;
      }

      if (filters.departmentId) {
        sql += ` AND c.department_id = $${paramIndex}`;
        params.push(filters.departmentId);
        paramIndex++;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding all contracts', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find contracts by employee
   */
  async findByEmployee(employeeId, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE employee_id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
        ORDER BY start_date DESC
      `;

      const result = await this.query(sql, [employeeId, organizationId], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding contracts by employee', { employeeId, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find active contract for employee
   */
  async findActiveByEmployee(employeeId, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE employee_id = $1 
          AND organization_id = $2
          AND status = 'active'
          AND deleted_at IS NULL
        ORDER BY start_date DESC
        LIMIT 1
      `;

      const result = await this.query(sql, [employeeId, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding active contract by employee', { employeeId, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find expiring contracts
   */
  async findExpiring(daysAhead, organizationId) {
    try {
      const sql = `
        SELECT c.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.email,
               (c.end_date - CURRENT_DATE) as days_until_expiry
        FROM ${this.tableName} c
        LEFT JOIN hris.employee e ON c.employee_id = e.id AND e.deleted_at IS NULL
        WHERE c.organization_id = $1
          AND c.status = 'active'
          AND c.end_date IS NOT NULL
          AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::integer
          AND c.deleted_at IS NULL
        ORDER BY c.end_date ASC
      `;

      const result = await this.query(sql, [organizationId, daysAhead], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding expiring contracts', { daysAhead, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create contract
   */
  async create(contractData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(contractData);

      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, employee_id, contract_number, contract_type,
          contract_sequence_policy_id, current_step_id, sequence_number,
          start_date, end_date, notice_period_days,
          job_title, department_id, location_id,
          salary_amount, salary_currency, salary_frequency,
          status, contract_document_url, signed_date,
          signed_by_employee, signed_by_employer,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.employee_id,
        dbData.contract_number,
        dbData.contract_type,
        dbData.contract_sequence_policy_id || null,
        dbData.current_step_id || null,
        dbData.sequence_number || 1,
        dbData.start_date,
        dbData.end_date || null,
        dbData.notice_period_days || null,
        dbData.job_title || null,
        dbData.department_id || null,
        dbData.location_id || null,
        dbData.salary_amount || null,
        dbData.salary_currency || 'USD',
        dbData.salary_frequency || null,
        dbData.status || 'draft',
        dbData.contract_document_url || null,
        dbData.signed_date || null,
        dbData.signed_by_employee || false,
        dbData.signed_by_employer || false,
        userId,
        userId
      ];

      const result = await this.query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating contract', { contractData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update contract
   */
  async update(id, contractData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(contractData);

      const sql = `
        UPDATE ${this.tableName}
        SET
          contract_type = COALESCE($1, contract_type),
          start_date = COALESCE($2, start_date),
          end_date = $3,
          notice_period_days = $4,
          job_title = $5,
          department_id = $6,
          location_id = $7,
          salary_amount = $8,
          salary_currency = $9,
          salary_frequency = $10,
          status = COALESCE($11, status),
          contract_document_url = $12,
          signed_date = $13,
          signed_by_employee = COALESCE($14, signed_by_employee),
          signed_by_employer = COALESCE($15, signed_by_employer),
          updated_by = $16,
          updated_at = NOW()
        WHERE id = $17
          AND organization_id = $18
          AND deleted_at IS NULL
        RETURNING *
      `;

      const params = [
        dbData.contract_type,
        dbData.start_date,
        dbData.end_date,
        dbData.notice_period_days,
        dbData.job_title,
        dbData.department_id,
        dbData.location_id,
        dbData.salary_amount,
        dbData.salary_currency,
        dbData.salary_frequency,
        dbData.status,
        dbData.contract_document_url,
        dbData.signed_date,
        dbData.signed_by_employee,
        dbData.signed_by_employer,
        userId,
        id,
        organizationId
      ];

      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating contract', { id, contractData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update contract status
   */
  async updateStatus(id, status, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET
          status = $1,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $3
          AND organization_id = $4
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.query(sql, [status, userId, id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating contract status', { id, status, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update contract step (for sequence progression)
   */
  async updateStep(id, stepId, sequenceNumber, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET
          current_step_id = $1,
          sequence_number = $2,
          updated_by = $3,
          updated_at = NOW()
        WHERE id = $4
          AND organization_id = $5
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.query(sql, [stepId, sequenceNumber, userId, id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating contract step', { id, stepId, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete contract (soft delete)
   */
  async delete(id, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await this.query(sql, [userId, id, organizationId], organizationId);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting contract', { id, organizationId, error: error.message });
      throw error;
    }
  }
}

export default ContractRepository;
