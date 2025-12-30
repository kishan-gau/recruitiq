/**
 * EmploymentHistoryService
 * Business logic for employee lifecycle management (hire, terminate, rehire)
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { EmploymentHistoryData } from '../../../types/nexus.types.js';

class EmploymentHistoryService {
  logger: typeof logger;

constructor() {
    this.logger = logger;
  }

  /**
   * Create initial employment history record when hiring new employee
   * Should be called after creating employee record
   */
  async createInitialEmployment(employeeData, organizationId, userId) {
    try {
      const sql = `
        INSERT INTO hris.employment_history (
          organization_id,
          employee_id,
          start_date,
          end_date,
          is_current,
          is_rehire,
          employment_status,
          employment_type,
          department_id,
          department_name,
          location_id,
          location_name,
          manager_id,
          manager_name,
          job_title,
          created_by,
          updated_by
        )
        SELECT 
          $1 as organization_id,
          $2 as employee_id,
          $3 as start_date,
          NULL as end_date,
          true as is_current,
          false as is_rehire,
          $4 as employment_status,
          $5 as employment_type,
          $6 as department_id,
          d.department_name,
          $7 as location_id,
          l.location_name,
          $8 as manager_id,
          m.first_name || ' ' || m.last_name as manager_name,
          $9 as job_title,
          $10 as created_by,
          $10 as updated_by
        FROM (SELECT 1) as dummy
        LEFT JOIN hris.department d ON d.id = $6 AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON l.id = $7 AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON m.id = $8 AND m.deleted_at IS NULL
        RETURNING *
      `;

      const params = [
        organizationId,
        employeeData.employeeId,
        employeeData.hireDate,
        employeeData.employmentStatus || 'active',
        employeeData.employmentType,
        employeeData.departmentId || null,
        employeeData.locationId || null,
        employeeData.managerId || null,
        employeeData.jobTitle,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'createInitialEmployment',
        table: 'hris.employment_history'
      });

      this.logger.info('Initial employment history created', {
        employeeId: employeeData.employeeId,
        organizationId
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating initial employment', {
        employeeId: employeeData.employeeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Terminate employee - close current employment period and update employee record
   */
  async terminateEmployee(employeeId, terminationData, organizationId, userId) {
    const client = await query.getClient();

    try {
      await client.query('BEGIN');

      // 1. Get current employment history record
      const getCurrentSql = `
        SELECT * FROM hris.employment_history
        WHERE employee_id = $1 
          AND organization_id = $2
          AND is_current = true
        FOR UPDATE
      `;
      const currentRecord = await client.query(getCurrentSql, [employeeId, organizationId]);

      if (currentRecord.rows.length === 0) {
        throw new Error('No active employment record found');
      }

      // 2. Update current employment history with termination details
      const updateHistorySql = `
        UPDATE hris.employment_history
        SET 
          end_date = $1,
          termination_date = $1,
          is_current = false,
          termination_reason = $2,
          termination_notes = $3,
          is_rehire_eligible = $4,
          updated_at = NOW(),
          updated_by = $5
        WHERE employee_id = $6 
          AND organization_id = $7
          AND is_current = true
        RETURNING *
      `;

      const historyParams = [
        terminationData.terminationDate,
        terminationData.terminationReason,
        terminationData.terminationNotes || null,
        terminationData.isRehireEligible !== false, // Default to true
        userId,
        employeeId,
        organizationId
      ];

      const historyResult = await client.query(updateHistorySql, historyParams);

      // 3. Update employee record
      const updateEmployeeSql = `
        UPDATE hris.employee
        SET 
          employment_status = 'terminated',
          termination_date = $1,
          updated_at = NOW(),
          updated_by = $2
        WHERE id = $3 
          AND organization_id = $4
        RETURNING *
      `;

      const employeeResult = await client.query(updateEmployeeSql, [
        terminationData.terminationDate,
        userId,
        employeeId,
        organizationId
      ]);

      await client.query('COMMIT');

      this.logger.info('Employee terminated', {
        employeeId,
        terminationDate: terminationData.terminationDate,
        reason: terminationData.terminationReason,
        organizationId
      });

      return {
        employee: employeeResult.rows[0],
        employmentHistory: historyResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error terminating employee', {
        employeeId,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rehire employee - reactivate employee and create new employment period
   */
  async rehireEmployee(employeeId, rehireData, organizationId, userId) {
    const client = await query.getClient();

    try {
      await client.query('BEGIN');

      // 1. Verify employee is terminated and eligible for rehire
      const checkSql = `
        SELECT e.*, eh.is_rehire_eligible
        FROM hris.employee e
        LEFT JOIN hris.employment_history eh ON eh.employee_id = e.id 
          AND eh.is_current = false
          AND eh.end_date = (
            SELECT MAX(end_date) FROM hris.employment_history 
            WHERE employee_id = e.id
          )
        WHERE e.id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
        FOR UPDATE OF e
      `;

      const checkResult = await client.query(checkSql, [employeeId, organizationId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Employee not found');
      }

      const employee = checkResult.rows[0];

      if (employee.employment_status !== 'terminated') {
        throw new Error('Employee is not terminated');
      }

      if (employee.is_rehire_eligible === false) {
        throw new Error('Employee is not eligible for rehire');
      }

      // 2. Update employee record
      const updateEmployeeSql = `
        UPDATE hris.employee
        SET 
          employment_status = $1,
          hire_date = $2,
          termination_date = NULL,
          employment_type = $3,
          department_id = $4,
          location_id = $5,
          manager_id = $6,
          job_title = $7,
          updated_at = NOW(),
          updated_by = $8
        WHERE id = $9 
          AND organization_id = $10
        RETURNING *
      `;

      const employeeParams = [
        rehireData.employmentStatus || 'active',
        rehireData.rehireDate,
        rehireData.employmentType || employee.employment_type,
        rehireData.departmentId || employee.department_id,
        rehireData.locationId || employee.location_id,
        rehireData.managerId || employee.manager_id,
        rehireData.jobTitle || employee.job_title,
        userId,
        employeeId,
        organizationId
      ];

      const employeeResult = await client.query(updateEmployeeSql, employeeParams);

      // 3. Create new employment history record
      const createHistorySql = `
        INSERT INTO hris.employment_history (
          organization_id,
          employee_id,
          start_date,
          end_date,
          is_current,
          is_rehire,
          rehire_notes,
          employment_status,
          employment_type,
          department_id,
          department_name,
          location_id,
          location_name,
          manager_id,
          manager_name,
          job_title,
          created_by,
          updated_by
        )
        SELECT 
          $1 as organization_id,
          $2 as employee_id,
          $3 as start_date,
          NULL as end_date,
          true as is_current,
          true as is_rehire,
          $4 as rehire_notes,
          $5 as employment_status,
          $6 as employment_type,
          $7 as department_id,
          d.department_name,
          $8 as location_id,
          l.location_name,
          $9 as manager_id,
          m.first_name || ' ' || m.last_name as manager_name,
          $10 as job_title,
          $11 as created_by,
          $11 as updated_by
        FROM (SELECT 1) as dummy
        LEFT JOIN hris.department d ON d.id = $7 AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON l.id = $8 AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON m.id = $9 AND m.deleted_at IS NULL
        RETURNING *
      `;

      const historyParams = [
        organizationId,
        employeeId,
        rehireData.rehireDate,
        rehireData.rehireNotes || null,
        rehireData.employmentStatus || 'active',
        rehireData.employmentType || employee.employment_type,
        rehireData.departmentId || employee.department_id,
        rehireData.locationId || employee.location_id,
        rehireData.managerId || employee.manager_id,
        rehireData.jobTitle || employee.job_title,
        userId
      ];

      const historyResult = await client.query(createHistorySql, historyParams);

      await client.query('COMMIT');

      this.logger.info('Employee rehired', {
        employeeId,
        rehireDate: rehireData.rehireDate,
        organizationId
      });

      return {
        employee: employeeResult.rows[0],
        employmentHistory: historyResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error rehiring employee', {
        employeeId,
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employment history for an employee
   */
  async getEmploymentHistory(employeeId, organizationId) {
    try {
      const sql = `
        SELECT 
          eh.*,
          d.department_name as current_department_name,
          l.location_name as current_location_name,
          m.first_name || ' ' || m.last_name as current_manager_name
        FROM hris.employment_history eh
        LEFT JOIN hris.department d ON eh.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON eh.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON eh.manager_id = m.id AND m.deleted_at IS NULL
        WHERE eh.employee_id = $1 
          AND eh.organization_id = $2
        ORDER BY eh.start_date DESC, eh.created_at DESC
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'getEmploymentHistory',
        table: 'hris.employment_history'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting employment history', {
        employeeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current employment record
   */
  async getCurrentEmployment(employeeId, organizationId) {
    try {
      const sql = `
        SELECT eh.*
        FROM hris.employment_history eh
        WHERE eh.employee_id = $1 
          AND eh.organization_id = $2
          AND eh.is_current = true
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'getCurrentEmployment',
        table: 'hris.employment_history'
      });

      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Error getting current employment', {
        employeeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if employee can be rehired
   */
  async checkRehireEligibility(employeeId, organizationId) {
    try {
      const sql = `
        SELECT 
          e.employment_status,
          eh.is_rehire_eligible,
          eh.termination_reason,
          eh.termination_date
        FROM hris.employee e
        LEFT JOIN hris.employment_history eh ON eh.employee_id = e.id 
          AND eh.is_current = false
          AND eh.end_date = (
            SELECT MAX(end_date) FROM hris.employment_history 
            WHERE employee_id = e.id
          )
        WHERE e.id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId, {
        operation: 'checkRehireEligibility',
        table: 'hris.employee'
      });

      if (result.rows.length === 0) {
        return { eligible: false, reason: 'Employee not found' };
      }

      const record = result.rows[0];

      if (record.employment_status !== 'terminated') {
        return { eligible: false, reason: 'Employee is not terminated' };
      }

      if (record.is_rehire_eligible === false) {
        return { 
          eligible: false, 
          reason: 'Not eligible for rehire',
          terminationReason: record.termination_reason,
          terminationDate: record.termination_date
        };
      }

      return { 
        eligible: true,
        terminationReason: record.termination_reason,
        terminationDate: record.termination_date
      };
    } catch (error) {
      this.logger.error('Error checking rehire eligibility', {
        employeeId,
        error: error.message
      });
      throw error;
    }
  }
}

export default EmploymentHistoryService;
