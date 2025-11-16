/**
 * EmployeeService
 * Business logic layer for employee management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

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

      // Validate required fields
      this.validateEmployeeData(employeeData);

      // Check if email already exists
      if (employeeData.email) {
        const checkEmailSql = `
          SELECT id FROM hris.employee 
          WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL
        `;
        const emailCheck = await query(checkEmailSql, [employeeData.email, organizationId], organizationId);
        if (emailCheck.rows.length > 0) {
          throw new Error(`Employee with email ${employeeData.email} already exists`);
        }
      }

      // Check if employee number already exists
      if (employeeData.employee_number) {
        const checkNumberSql = `
          SELECT id FROM hris.employee 
          WHERE employee_number = $1 AND organization_id = $2 AND deleted_at IS NULL
        `;
        const numberCheck = await query(checkNumberSql, [employeeData.employee_number, organizationId], organizationId);
        if (numberCheck.rows.length > 0) {
          throw new Error(`Employee with number ${employeeData.employee_number} already exists`);
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
        employeeData.employee_number || null,
        employeeData.first_name,
        employeeData.middle_name || null,
        employeeData.last_name,
        employeeData.preferred_name || null,
        employeeData.email,
        employeeData.phone || null,
        employeeData.mobile_phone || null,
        employeeData.hire_date || new Date(),
        employeeData.employment_status || 'active',
        employeeData.employment_type || 'full_time',
        employeeData.department_id || null,
        employeeData.location_id || null,
        employeeData.manager_id || null,
        employeeData.job_title || null,
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

      return employee;
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

      return result.rows[0];
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

      return {
        employees: result.rows,
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
      if (employeeData.email && employeeData.email !== existingEmployee.email) {
        const emailCheckSql = `
          SELECT id FROM hris.employee 
          WHERE email = $1 AND organization_id = $2 AND id != $3 AND deleted_at IS NULL
        `;
        const emailCheck = await query(emailCheckSql, [employeeData.email, organizationId, id], organizationId);
        if (emailCheck.rows.length > 0) {
          throw new Error(`Employee with email ${employeeData.email} already exists`);
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
        if (employeeData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(employeeData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return existingEmployee;
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

      return result.rows[0];
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

      // Soft delete employee
      const sql = `
        UPDATE hris.employee 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
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

      return result.rows;
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

      return result.rows[0];
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

      return result.rows[0];
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
