/**
 * ContractService
 * Business logic layer for employment contract management
 */

import { query } from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';

class ContractService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a new contract
   */
  async createContract(contractData, organizationId, userId) {
    try {
      this.logger.info('Creating contract', { 
        organizationId, 
        userId,
        employeeId: contractData.employee_id 
      });

      // Validate required fields
      if (!contractData.employee_id) {
        throw new Error('Employee ID is required');
      }
      if (!contractData.contract_type) {
        throw new Error('Contract type is required');
      }
      if (!contractData.start_date) {
        throw new Error('Start date is required');
      }

      const sql = `
        INSERT INTO hris.contract (
          organization_id, employee_id, contract_type,
          start_date, end_date, status,
          job_title, department_id, location_id,
          salary_amount, salary_currency, salary_frequency,
          work_hours_per_week, probation_period_months,
          notice_period_days, terms_and_conditions,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        contractData.employee_id,
        contractData.contract_type,
        contractData.start_date,
        contractData.end_date || null,
        contractData.status || 'draft',
        contractData.job_title || null,
        contractData.department_id || null,
        contractData.location_id || null,
        contractData.salary_amount || null,
        contractData.salary_currency || 'EUR',
        contractData.salary_frequency || 'monthly',
        contractData.work_hours_per_week || 40,
        contractData.probation_period_months || null,
        contractData.notice_period_days || null,
        contractData.terms_and_conditions || null,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.contract'
      });

      this.logger.info('Contract created successfully', { 
        contractId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating contract', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get contract by ID
   */
  async getContract(id, organizationId) {
    try {
      this.logger.debug('Getting contract', { id, organizationId });

      const sql = `
        SELECT c.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               d.department_name,
               l.location_name
        FROM hris.contract c
        LEFT JOIN hris.employee e ON c.employee_id = e.id
        LEFT JOIN hris.department d ON c.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON c.location_id = l.id AND l.deleted_at IS NULL
        WHERE c.id = $1 
          AND c.organization_id = $2
          AND c.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.contract'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Contract not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting contract', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List contracts with optional filters
   */
  async listContracts(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing contracts', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT c.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               d.department_name,
               l.location_name
        FROM hris.contract c
        LEFT JOIN hris.employee e ON c.employee_id = e.id
        LEFT JOIN hris.department d ON c.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON c.location_id = l.id AND l.deleted_at IS NULL
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

      sql += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.contract'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.contract c
        WHERE c.organization_id = $1 AND c.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (filters.employeeId) {
        countSql += ` AND c.employee_id = $${countIndex}`;
        countParams.push(filters.employeeId);
        countIndex++;
      }

      if (filters.status) {
        countSql += ` AND c.status = $${countIndex}`;
        countParams.push(filters.status);
        countIndex++;
      }

      if (filters.contractType) {
        countSql += ` AND c.contract_type = $${countIndex}`;
        countParams.push(filters.contractType);
        countIndex++;
      }

      if (filters.departmentId) {
        countSql += ` AND c.department_id = $${countIndex}`;
        countParams.push(filters.departmentId);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.contract'
      });

      return {
        contracts: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing contracts', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update contract
   */
  async updateContract(id, contractData, organizationId, userId) {
    try {
      this.logger.info('Updating contract', { 
        id,
        organizationId,
        userId 
      });

      // Check if contract exists
      const checkSql = `
        SELECT id FROM hris.contract 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Contract not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'contract_type', 'start_date', 'end_date', 'status',
        'job_title', 'department_id', 'location_id',
        'salary_amount', 'salary_currency', 'salary_frequency',
        'work_hours_per_week', 'probation_period_months',
        'notice_period_days', 'terms_and_conditions'
      ];

      updateableFields.forEach(field => {
        if (contractData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(contractData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return await this.getContract(id, organizationId);
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.contract 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.contract'
      });

      this.logger.info('Contract updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating contract', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete contract (soft delete)
   */
  async deleteContract(id, organizationId, userId) {
    try {
      this.logger.info('Deleting contract', { 
        id,
        organizationId,
        userId 
      });

      // Check if contract exists
      const checkSql = `
        SELECT id FROM hris.contract 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Contract not found');
      }

      // Soft delete contract
      const sql = `
        UPDATE hris.contract 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.contract'
      });

      this.logger.info('Contract deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Contract deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting contract', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get active contract for an employee
   */
  async getActiveContract(employeeId, organizationId) {
    try {
      this.logger.debug('Getting active contract for employee', { 
        employeeId,
        organizationId 
      });

      const sql = `
        SELECT c.*, 
               d.department_name,
               l.location_name
        FROM hris.contract c
        LEFT JOIN hris.department d ON c.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON c.location_id = l.id AND l.deleted_at IS NULL
        WHERE c.employee_id = $1 
          AND c.organization_id = $2
          AND c.status = 'active'
          AND c.start_date <= CURRENT_DATE
          AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
          AND c.deleted_at IS NULL
        ORDER BY c.start_date DESC
        LIMIT 1
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'findActive',
        table: 'hris.contract'
      });

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error getting active contract', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }
}

export default ContractService;
