/**
 * EmployeeRepository
 * Data access layer for employee records
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class EmployeeRepository {
  constructor() {
    this.tableName = 'hris.employee';
    this.logger = logger;
  }

  /**
   * Find employee by ID
   */
  async findById(id, organizationId) {
    try {
      const sql = `
        SELECT e.*, 
               d.department_name,
               l.location_name,
               m.first_name || ' ' || m.last_name as manager_name,
               u.email as user_email
        FROM ${this.tableName} e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON e.manager_id = m.id AND m.deleted_at IS NULL
        LEFT JOIN hris.user_account u ON e.user_account_id = u.id AND u.deleted_at IS NULL
        WHERE e.id = $1 
          AND e.organization_id = $2
          AND e.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding employee by ID', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all employees with filters
   */
  async findAll(filters = {}, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'e.created_at DESC', includeTerminated = false } = options;

      let sql = `
        SELECT e.*,
               d.department_name,
               l.location_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM ${this.tableName} e
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        LEFT JOIN hris.employee m ON e.manager_id = m.id AND m.deleted_at IS NULL
        WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      // Filter by employment status
      if (!includeTerminated) {
        sql += ` AND e.employment_status != 'terminated'`;
      }

      // Dynamic filters
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

      if (filters.employmentType) {
        sql += ` AND e.employment_type = $${paramIndex}`;
        params.push(filters.employmentType);
        paramIndex++;
      }

      if (filters.managerId) {
        sql += ` AND e.manager_id = $${paramIndex}`;
        params.push(filters.managerId);
        paramIndex++;
      }

      if (filters.search) {
        sql += ` AND (
          e.first_name ILIKE $${paramIndex} OR 
          e.last_name ILIKE $${paramIndex} OR 
          e.email ILIKE $${paramIndex} OR
          e.employee_number ILIKE $${paramIndex}
        )`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding all employees', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Count employees
   */
  async count(filters = {}, organizationId) {
    try {
      let sql = `
        SELECT COUNT(*) as count
        FROM ${this.tableName} e
        WHERE e.organization_id = $1 AND e.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.departmentId) {
        sql += ` AND e.department_id = $${paramIndex}`;
        params.push(filters.departmentId);
        paramIndex++;
      }

      if (filters.employmentStatus) {
        sql += ` AND e.employment_status = $${paramIndex}`;
        params.push(filters.employmentStatus);
        paramIndex++;
      }

      const result = await query(sql, params, organizationId, {
        operation: 'count',
        table: this.tableName
      });

      return parseInt(result.rows[0].count);
    } catch (error) {
      this.logger.error('Error counting employees', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find employee by email
   */
  async findByEmail(email, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE email = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [email, organizationId], organizationId, {
        operation: 'findByEmail',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding employee by email', { email, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find employee by employee number
   */
  async findByEmployeeNumber(employeeNumber, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE employee_number = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [employeeNumber, organizationId], organizationId, {
        operation: 'findByEmployeeNumber',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding employee by number', { employeeNumber, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create employee
   */
  async create(employeeData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(employeeData);
      
      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, user_account_id, employee_number,
          first_name, middle_name, last_name, preferred_name,
          date_of_birth, gender, nationality,
          email, phone, mobile_phone,
          address_line1, address_line2, city, state_province, postal_code, country,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
          hire_date, employment_status, employment_type,
          department_id, location_id, manager_id, job_title,
          work_schedule, fte_percentage,
          profile_photo_url, bio, skills,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33, $34, $35, $36
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.user_account_id || null,
        dbData.employee_number,
        dbData.first_name,
        dbData.middle_name || null,
        dbData.last_name,
        dbData.preferred_name || null,
        dbData.date_of_birth || null,
        dbData.gender || null,
        dbData.nationality || null,
        dbData.email,
        dbData.phone || null,
        dbData.mobile_phone || null,
        dbData.address_line1 || null,
        dbData.address_line2 || null,
        dbData.city || null,
        dbData.state_province || null,
        dbData.postal_code || null,
        dbData.country || null,
        dbData.emergency_contact_name || null,
        dbData.emergency_contact_relationship || null,
        dbData.emergency_contact_phone || null,
        dbData.hire_date,
        dbData.employment_status || 'active',
        dbData.employment_type || null,
        dbData.department_id || null,
        dbData.location_id || null,
        dbData.manager_id || null,
        dbData.job_title || null,
        dbData.work_schedule || 'standard',
        dbData.fte_percentage || 100.00,
        dbData.profile_photo_url || null,
        dbData.bio || null,
        dbData.skills ? JSON.stringify(dbData.skills) : '[]',
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: this.tableName
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating employee', { employeeData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update employee
   */
  async update(id, employeeData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(employeeData);
      
      const sql = `
        UPDATE ${this.tableName}
        SET
          first_name = COALESCE($1, first_name),
          middle_name = $2,
          last_name = COALESCE($3, last_name),
          preferred_name = $4,
          date_of_birth = $5,
          gender = $6,
          nationality = $7,
          email = COALESCE($8, email),
          phone = $9,
          mobile_phone = $10,
          address_line1 = $11,
          address_line2 = $12,
          city = $13,
          state_province = $14,
          postal_code = $15,
          country = $16,
          emergency_contact_name = $17,
          emergency_contact_relationship = $18,
          emergency_contact_phone = $19,
          employment_status = COALESCE($20, employment_status),
          employment_type = $21,
          department_id = $22,
          location_id = $23,
          manager_id = $24,
          job_title = $25,
          work_schedule = $26,
          fte_percentage = $27,
          profile_photo_url = $28,
          bio = $29,
          skills = $30,
          updated_by = $31,
          updated_at = NOW()
        WHERE id = $32 
          AND organization_id = $33
          AND deleted_at IS NULL
        RETURNING *
      `;

      const params = [
        dbData.first_name,
        dbData.middle_name,
        dbData.last_name,
        dbData.preferred_name,
        dbData.date_of_birth,
        dbData.gender,
        dbData.nationality,
        dbData.email,
        dbData.phone,
        dbData.mobile_phone,
        dbData.address_line1,
        dbData.address_line2,
        dbData.city,
        dbData.state_province,
        dbData.postal_code,
        dbData.country,
        dbData.emergency_contact_name,
        dbData.emergency_contact_relationship,
        dbData.emergency_contact_phone,
        dbData.employment_status,
        dbData.employment_type,
        dbData.department_id,
        dbData.location_id,
        dbData.manager_id,
        dbData.job_title,
        dbData.work_schedule,
        dbData.fte_percentage,
        dbData.profile_photo_url,
        dbData.bio,
        dbData.skills ? JSON.stringify(dbData.skills) : null,
        userId,
        id,
        organizationId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating employee', { id, employeeData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Terminate employee
   */
  async terminate(id, terminationDate, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET
          employment_status = 'terminated',
          termination_date = $1,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $3
          AND organization_id = $4
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await query(sql, [terminationDate, userId, id, organizationId], organizationId, {
        operation: 'terminate',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error terminating employee', { id, terminationDate, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete employee
   */
  async delete(id, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET
          deleted_at = NOW(),
          updated_by = $1,
          updated_at = NOW()
        WHERE id = $2
          AND organization_id = $3
          AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await query(sql, [userId, id, organizationId], organizationId, {
        operation: 'delete',
        table: this.tableName
      });

      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting employee', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Get employees by manager
   */
  async findByManager(managerId, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE manager_id = $1 
          AND organization_id = $2
          AND employment_status = 'active'
          AND deleted_at IS NULL
        ORDER BY first_name, last_name
      `;

      const result = await query(sql, [managerId, organizationId], organizationId, {
        operation: 'findByManager',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding employees by manager', { managerId, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Get organizational chart data
   */
  async getOrgChartData(organizationId) {
    try {
      const sql = `
        WITH RECURSIVE org_tree AS (
          -- Root level (no manager)
          SELECT 
            id, first_name, last_name, job_title, 
            department_id, manager_id, profile_photo_url,
            1 as level
          FROM ${this.tableName}
          WHERE organization_id = $1 
            AND manager_id IS NULL
            AND employment_status = 'active'
            AND deleted_at IS NULL
          
          UNION ALL
          
          -- Recursive: get reports
          SELECT 
            e.id, e.first_name, e.last_name, e.job_title,
            e.department_id, e.manager_id, e.profile_photo_url,
            ot.level + 1
          FROM ${this.tableName} e
          INNER JOIN org_tree ot ON e.manager_id = ot.id
          WHERE e.organization_id = $1
            AND e.employment_status = 'active'
            AND e.deleted_at IS NULL
        )
        SELECT * FROM org_tree
        ORDER BY level, last_name, first_name
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'getOrgChartData',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error getting org chart data', { organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Get employees hired in date range
   */
  async findByHireDateRange(startDate, endDate, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE hire_date BETWEEN $1 AND $2
          AND organization_id = $3
          AND deleted_at IS NULL
        ORDER BY hire_date DESC
      `;

      const result = await query(sql, [startDate, endDate, organizationId], organizationId, {
        operation: 'findByHireDateRange',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding employees by hire date range', { startDate, endDate, organizationId, error: error.message });
      throw error;
    }
  }
}

export default EmployeeRepository;
