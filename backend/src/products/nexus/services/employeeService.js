/**
 * EmployeeService
 * Business logic layer for employee management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import compensationService from '../../../shared/services/compensationService.js';
import { mapEmployeeDbToApi, mapEmployeesDbToApi, mapEmployeeApiToDb } from '../dto/employeeDto.js';

class EmployeeService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a new employee
   */
  async createEmployee(employeeData, organizationId, userId) {
    try {
      this.logger.info('Creating employee', { 
        organizationId, 
        userId,
        email: employeeData.email 
      });

      // Transform API data (camelCase) to DB format (snake_case)
      const dbData = mapEmployeeApiToDb(employeeData);

      // Validate required fields
      this.validateEmployeeData(dbData);

      // Check if email already exists
      if (dbData.email) {
        const checkEmailSql = `
          SELECT id FROM hris.employee 
          WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL
        `;
        const emailCheck = await query(checkEmailSql, [dbData.email, organizationId], organizationId);
        if (emailCheck.rows.length > 0) {
          throw new Error(`Employee with email ${dbData.email} already exists`);
        }
      }

      // Check if employee number already exists
      if (dbData.employee_number) {
        const checkNumberSql = `
          SELECT id FROM hris.employee 
          WHERE employee_number = $1 AND organization_id = $2 AND deleted_at IS NULL
        `;
        const numberCheck = await query(checkNumberSql, [dbData.employee_number, organizationId], organizationId);
        if (numberCheck.rows.length > 0) {
          throw new Error(`Employee with number ${dbData.employee_number} already exists`);
        }
      }

      // Create employee
      const sql = `
        INSERT INTO hris.employee (
          organization_id, employee_number,
          first_name, middle_name, last_name, preferred_name,
          email, phone, mobile_phone,
          hire_date, employment_status, employment_type,
          department_id, location_id, manager_id, job_title,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.employee_number || null,
        dbData.first_name,
        dbData.middle_name || null,
        dbData.last_name,
        dbData.preferred_name || null,
        dbData.email,
        dbData.phone || null,
        dbData.mobile_phone || null,
        dbData.hire_date || new Date(),
        dbData.employment_status || 'active',
        dbData.employment_type || 'full_time',
        dbData.department_id || null,
        dbData.location_id || null,
        dbData.manager_id || null,
        dbData.job_title || null,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.employee'
      });

      const employee = result.rows[0];

      this.logger.info('Employee created successfully', { 
        employeeId: employee.id,
        organizationId 
      });

      // Auto-create payroll configuration for new employee
      // This ensures the employee appears in PayLinQ immediately
      try {
        const payrollConfigSql = `
          INSERT INTO payroll.employee_payroll_config (
            organization_id, employee_id, pay_frequency, payment_method, currency,
            payroll_status, payroll_start_date, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          )
          ON CONFLICT (organization_id, employee_id) DO NOTHING
        `;

        await query(payrollConfigSql, [
          organizationId,
          employee.id,
          dbData.pay_frequency || 'monthly', // Default to monthly
          'direct_deposit', // Default payment method
          dbData.currency || 'SRD', // Default currency
          'active',
          dbData.hire_date || new Date(),
          userId
        ], organizationId, {
          operation: 'create',
          table: 'payroll.employee_payroll_config'
        });

        this.logger.info('Created payroll config for employee', {
          employeeId: employee.id,
          organizationId
        });
      } catch (payrollErr) {
        // Log error but don't fail employee creation
        this.logger.error('Failed to create payroll config', {
          error: payrollErr.message,
          employeeId: employee.id,
          organizationId
        });
      }

      // Create initial compensation record if compensation data is provided
      if (dbData.compensation || dbData.salary) {
        try {
          const compensationAmount = dbData.compensation || dbData.salary;
          const compensationData = {
            amount: compensationAmount,
            type: dbData.compensation_type || dbData.salary_type || 'salary',
            currency: dbData.currency || 'SRD',
            effectiveFrom: dbData.hire_date || new Date().toISOString().split('T')[0],
            payFrequency: dbData.pay_frequency || 'monthly',
            overtimeRate: dbData.overtime_rate || null
          };

          await compensationService.createInitialCompensation(
            employee.id,
            compensationData,
            organizationId,
            userId
          );

          this.logger.info('Created initial compensation for employee via shared service', {
            employeeId: employee.id,
            amount: compensationData.amount,
            type: compensationData.type
          });
        } catch (compErr) {
          // Log error but don't fail employee creation
          this.logger.error('Failed to create initial compensation record', {
            error: compErr.message,
            employeeId: employee.id,
            organizationId
          });
        }
      }

      // Transform DB employee (snake_case) to API format (camelCase)
      return mapEmployeeDbToApi(employee);
    } catch (error) {
      this.logger.error('Error creating employee', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id, organizationId) {
    try {
      this.logger.debug('Getting employee', { id, organizationId });

      const sql = `
        SELECT e.*, 
               d.department_name,
               l.location_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM hris.employee e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON e.manager_id = m.id AND m.deleted_at IS NULL
        WHERE e.id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.employee'
      });
      
      if (result.rows.length === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // Transform DB employee to API format
      return mapEmployeeDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting employee', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List employees with optional filters
   */
  async listEmployees(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing employees', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0, includeTerminated = false } = options;

      let sql = `
        SELECT e.*,
               d.department_name,
               l.location_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM hris.employee e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON e.manager_id = m.id AND m.deleted_at IS NULL
        WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (!includeTerminated) {
        sql += ` AND e.employment_status != 'terminated'`;
      }

      if (filters.departmentId) {
        sql += ` AND e.department_id = $${paramIndex}`;
        params.push(filters.departmentId);
        paramIndex++;
      }

      if (filters.locationId) {
        sql += ` AND e.location_id = $${paramIndex}`;
        params.push(filters.locationId);
        paramIndex++;
      }

      if (filters.employmentStatus) {
        sql += ` AND e.employment_status = $${paramIndex}`;
        params.push(filters.employmentStatus);
        paramIndex++;
      }

      sql += ` ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.employee'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.employee e
        WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (!includeTerminated) {
        countSql += ` AND e.employment_status != 'terminated'`;
      }

      if (filters.departmentId) {
        countSql += ` AND e.department_id = $${countIndex}`;
        countParams.push(filters.departmentId);
        countIndex++;
      }

      if (filters.locationId) {
        countSql += ` AND e.location_id = $${countIndex}`;
        countParams.push(filters.locationId);
        countIndex++;
      }

      if (filters.employmentStatus) {
        countSql += ` AND e.employment_status = $${countIndex}`;
        countParams.push(filters.employmentStatus);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.employee'
      });

      // Transform DB employees to API format
      return {
        employees: mapEmployeesDbToApi(result.rows),
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing employees', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(id, employeeData, organizationId, userId) {
    try {
      this.logger.info('Updating employee', { 
        id,
        organizationId,
        userId 
      });

      // Transform API data (camelCase) to DB format (snake_case)
      const dbData = mapEmployeeApiToDb(employeeData);

      // Check if employee exists
      const checkSql = `
        SELECT * FROM hris.employee 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      const existingEmployee = checkResult.rows[0];

      // Validate email uniqueness if changed
      if (dbData.email && dbData.email !== existingEmployee.email) {
        const emailCheckSql = `
          SELECT id FROM hris.employee 
          WHERE email = $1 AND organization_id = $2 AND id != $3 AND deleted_at IS NULL
        `;
        const emailCheck = await query(emailCheckSql, [dbData.email, organizationId, id], organizationId);
        if (emailCheck.rows.length > 0) {
          throw new Error(`Employee with email ${dbData.email} already exists`);
        }
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'first_name', 'middle_name', 'last_name', 'preferred_name',
        'email', 'phone', 'mobile_phone',
        'employment_status', 'employment_type',
        'department_id', 'location_id', 'manager_id', 'job_title'
      ];

      updateableFields.forEach(field => {
        if (dbData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(dbData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        // No changes, return existing employee transformed to API format
        return mapEmployeeDbToApi(existingEmployee);
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.employee 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.employee'
      });

      this.logger.info('Employee updated successfully', { 
        id,
        organizationId 
      });

      // Transform DB employee to API format
      return mapEmployeeDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error updating employee', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(id, organizationId, userId) {
    try {
      this.logger.info('Deleting employee', { 
        id,
        organizationId,
        userId 
      });

      // Check if employee exists
      const checkSql = `
        SELECT id FROM hris.employee 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // Soft delete employee (note: hris.employee table doesn't have deleted_by column)
      const sql = `
        UPDATE hris.employee 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId], organizationId, {
        operation: 'softDelete',
        table: 'hris.employee'
      });

      this.logger.info('Employee deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Employee deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting employee', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Search employees by name or email
   */
  async searchEmployees(searchTerm, organizationId, options = {}) {
    try {
      this.logger.debug('Searching employees', { 
        searchTerm,
        organizationId 
      });

      const { limit = 50, offset = 0 } = options;

      const sql = `
        SELECT e.*,
               d.department_name,
               l.location_name
        FROM hris.employee e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        WHERE e.organization_id = $1 
          AND e.deleted_at IS NULL
          AND (
            e.first_name ILIKE $2 OR 
            e.last_name ILIKE $2 OR 
            e.email ILIKE $2 OR
            CONCAT(e.first_name, ' ', e.last_name) ILIKE $2
          )
        ORDER BY e.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const searchPattern = `%${searchTerm}%`;
      const result = await query(sql, [organizationId, searchPattern, limit, offset], organizationId, {
        operation: 'search',
        table: 'hris.employee'
      });

      // Transform DB employees to API format
      return mapEmployeesDbToApi(result.rows);
    } catch (error) {
      this.logger.error('Error searching employees', { 
        error: error.message,
        searchTerm,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get employee by email
   */
  async getEmployeeByEmail(email, organizationId) {
    try {
      this.logger.debug('Getting employee by email', { 
        email,
        organizationId 
      });

      const sql = `
        SELECT * FROM hris.employee
        WHERE email = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [email, organizationId], organizationId, {
        operation: 'findByEmail',
        table: 'hris.employee'
      });
      
      if (result.rows.length === 0) {
        throw new Error(`Employee with email ${email} not found`);
      }

      // Transform DB employee to API format
      return mapEmployeeDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting employee by email', { 
        error: error.message,
        email,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get employee by employee number
   */
  async getEmployeeByNumber(employeeNumber, organizationId) {
    try {
      this.logger.debug('Getting employee by number', { 
        employeeNumber,
        organizationId 
      });

      const sql = `
        SELECT * FROM hris.employee
        WHERE employee_number = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [employeeNumber, organizationId], organizationId, {
        operation: 'findByEmployeeNumber',
        table: 'hris.employee'
      });
      
      if (result.rows.length === 0) {
        throw new Error(`Employee with number ${employeeNumber} not found`);
      }

      // Transform DB employee to API format
      return mapEmployeeDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting employee by number', { 
        error: error.message,
        employeeNumber,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Validate employee data
   */
  validateEmployeeData(data) {
    const required = ['first_name', 'last_name', 'email'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate email format
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return true;
  }

  /**
   * Check if email is valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default EmployeeService;
