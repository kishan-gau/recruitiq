/**
 * DepartmentService
 * Business logic layer for department management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class DepartmentService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Create a new department
   */
  async createDepartment(departmentData, organizationId, userId) {
    try {
      this.logger.info('Creating department', { 
        organizationId, 
        userId,
        departmentName: departmentData.department_name 
      });

      if (!departmentData.department_name) {
        throw new Error('Department name is required');
      }

      // Check if department name already exists
      const checkSql = `
        SELECT id FROM hris.department 
        WHERE department_name = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [departmentData.department_name, organizationId], organizationId);

      if (checkResult.rows.length > 0) {
        throw new Error(`Department with name '${departmentData.department_name}' already exists`);
      }

      const sql = `
        INSERT INTO hris.department (
          organization_id, department_name, department_code,
          description, parent_department_id,
          cost_center, is_active, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        departmentData.department_name,
        departmentData.department_code || null,
        departmentData.description || null,
        departmentData.parent_department_id || null,
        departmentData.cost_center || null,
        departmentData.is_active !== false,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.department'
      });

      this.logger.info('Department created successfully', { 
        departmentId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error creating department', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartment(id, organizationId) {
    try {
      this.logger.debug('Getting department', { id, organizationId });

      const sql = `
        SELECT d.*, 
               pd.department_name as parent_department_name,
               COUNT(e.id) as employee_count
        FROM hris.department d
        LEFT JOIN hris.department pd ON d.parent_department_id = pd.id AND pd.deleted_at IS NULL
        LEFT JOIN hris.employee e ON d.id = e.department_id AND e.deleted_at IS NULL
        WHERE d.id = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
        GROUP BY d.id, pd.department_name
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.department'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Department not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting department', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * List departments with optional filters
   */
  async listDepartments(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Listing departments', { 
        filters,
        organizationId,
        options 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT d.*,
               pd.department_name as parent_department_name,
               COUNT(e.id) as employee_count
        FROM hris.department d
        LEFT JOIN hris.department pd ON d.parent_department_id = pd.id AND pd.deleted_at IS NULL
        LEFT JOIN hris.employee e ON d.id = e.department_id AND e.deleted_at IS NULL
        WHERE d.organization_id = $1 AND d.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.isActive !== undefined) {
        sql += ` AND d.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.parentDepartmentId !== undefined) {
        if (filters.parentDepartmentId === null) {
          sql += ` AND d.parent_department_id IS NULL`;
        } else {
          sql += ` AND d.parent_department_id = $${paramIndex}`;
          params.push(filters.parentDepartmentId);
          paramIndex++;
        }
      }

      if (filters.managerId) {
        sql += ` `;
        params.push(filters.managerId);
        paramIndex++;
      }

      sql += ` GROUP BY d.id, pd.department_name`;
      sql += ` ORDER BY d.department_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.department'
      });

      // Get total count
      let countSql = `
        SELECT COUNT(*) as count 
        FROM hris.department d
        WHERE d.organization_id = $1 AND d.deleted_at IS NULL
      `;

      const countParams = [organizationId];
      let countIndex = 2;

      if (filters.isActive !== undefined) {
        countSql += ` AND d.is_active = $${countIndex}`;
        countParams.push(filters.isActive);
        countIndex++;
      }

      if (filters.parentDepartmentId !== undefined) {
        if (filters.parentDepartmentId === null) {
          countSql += ` AND d.parent_department_id IS NULL`;
        } else {
          countSql += ` AND d.parent_department_id = $${countIndex}`;
          countParams.push(filters.parentDepartmentId);
          countIndex++;
        }
      }

      if (filters.managerId) {
        countSql += ` `;
        countParams.push(filters.managerId);
        countIndex++;
      }

      const countResult = await query(countSql, countParams, organizationId, {
        operation: 'count',
        table: 'hris.department'
      });

      return {
        departments: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      this.logger.error('Error listing departments', { 
        error: error.message,
        filters,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(id, departmentData, organizationId, userId) {
    try {
      this.logger.info('Updating department', { 
        id,
        organizationId,
        userId 
      });

      // Check if department exists
      const checkSql = `
        SELECT * FROM hris.department 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Department not found');
      }

      const existingDepartment = checkResult.rows[0];

      // Check for duplicate name if name is being changed
      if (departmentData.department_name && 
          departmentData.department_name !== existingDepartment.department_name) {
        const dupCheckSql = `
          SELECT id FROM hris.department 
          WHERE department_name = $1 
            AND organization_id = $2 
            AND id != $3
            AND deleted_at IS NULL
        `;
        const dupCheck = await query(dupCheckSql, [departmentData.department_name, organizationId, id], organizationId);
        
        if (dupCheck.rows.length > 0) {
          throw new Error(`Department with name '${departmentData.department_name}' already exists`);
        }
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'department_name', 'department_code', 'description',
        'parent_department_id', 'cost_center', 'is_active'
      ];

      updateableFields.forEach(field => {
        if (departmentData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(departmentData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return existingDepartment;
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.department 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.department'
      });

      this.logger.info('Department updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating department', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(id, organizationId, userId) {
    try {
      this.logger.info('Deleting department', { 
        id,
        organizationId,
        userId 
      });

      // Check if department exists
      const checkSql = `
        SELECT id FROM hris.department 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Department not found');
      }

      // Check if department has employees
      const employeeCheckSql = `
        SELECT COUNT(*) as count FROM hris.employee 
        WHERE department_id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const employeeCheck = await query(employeeCheckSql, [id, organizationId], organizationId);
      
      if (parseInt(employeeCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete department with active employees. Please reassign employees first.');
      }

      // Check if department has child departments
      const childCheckSql = `
        SELECT COUNT(*) as count FROM hris.department 
        WHERE parent_department_id = $1 
          AND organization_id = $2 
          AND deleted_at IS NULL
      `;
      const childCheck = await query(childCheckSql, [id, organizationId], organizationId);
      
      if (parseInt(childCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete department with sub-departments. Please delete or reassign sub-departments first.');
      }

      // Soft delete department
      const sql = `
        UPDATE hris.department 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.department'
      });

      this.logger.info('Department deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Department deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting department', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get department hierarchy (tree structure)
   */
  async getDepartmentHierarchy(organizationId) {
    try {
      this.logger.debug('Getting department hierarchy', { organizationId });

      const sql = `
        WITH RECURSIVE dept_tree AS (
          -- Base case: root departments (no parent)
          SELECT 
            d.id, d.department_name, d.department_code, 
            d.parent_department_id,
            0 as level,
            ARRAY[d.id] as path
          FROM hris.department d
          WHERE d.organization_id = $1 
            AND d.parent_department_id IS NULL
            AND d.deleted_at IS NULL
          
          UNION ALL
          
          -- Recursive case: child departments
          SELECT 
            d.id, d.department_name, d.department_code,
            d.parent_department_id,
            dt.level + 1,
            dt.path || d.id
          FROM hris.department d
          INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
          WHERE d.organization_id = $1 
            AND d.deleted_at IS NULL
        )
        SELECT * FROM dept_tree
        ORDER BY path
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'hierarchy',
        table: 'hris.department'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting department hierarchy', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }
}

export default DepartmentService;

