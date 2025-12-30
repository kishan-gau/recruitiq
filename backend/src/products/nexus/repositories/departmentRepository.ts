/**
 * DepartmentRepository
 * Data access layer for department records
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDepartmentDbToApi, mapDepartmentApiToDb } from '../dto/departmentDto.js';

class DepartmentRepository {
  constructor(database = null) {
    this.query = database?.query || query;
    this.tableName = 'hris.department';
    this.logger = logger;
  }

  /**
   * Find department by ID
   */
  async findById(id, organizationId) {
    try {
      const sql = `
        SELECT d.*,
               p.department_name as parent_department_name,
               (SELECT COUNT(*) FROM hris.employee WHERE department_id = d.id AND deleted_at IS NULL) as employee_count
        FROM ${this.tableName} d
        LEFT JOIN ${this.tableName} p ON d.parent_department_id = p.id AND p.deleted_at IS NULL
        WHERE d.id = $1 
          AND d.organization_id = $2
          AND d.deleted_at IS NULL
      `;

      const result = await this.query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDepartmentDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding department by ID', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all departments
   */
  async findAll(filters = {}, organizationId, options = {}) {
    try {
      const { limit = 100, offset = 0, orderBy = 'd.department_name ASC' } = options;

      let sql = `
        SELECT d.*,
               p.department_name as parent_department_name,
               (SELECT COUNT(*) FROM hris.employee WHERE department_id = d.id AND deleted_at IS NULL) as employee_count
        FROM ${this.tableName} d
        LEFT JOIN ${this.tableName} p ON d.parent_department_id = p.id AND p.deleted_at IS NULL
        WHERE d.organization_id = $1 AND d.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.isActive !== undefined) {
        sql += ` AND d.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.parentDepartmentId) {
        sql += ` AND d.parent_department_id = $${paramIndex}`;
        params.push(filters.parentDepartmentId);
        paramIndex++;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.query(sql, params, organizationId);
      return result.rows.map(row => mapDepartmentDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding all departments', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find by department code
   */
  async findByCode(departmentCode, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.tableName}
        WHERE department_code = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;

      const result = await this.query(sql, [departmentCode, organizationId], organizationId);
      return result.rows[0] ? mapDepartmentDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding department by code', { departmentCode, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create department
   */
  async create(departmentData, organizationId, userId) {
    try {
      const dbData = mapDepartmentApiToDb(departmentData);

      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, department_code, department_name, description,
          parent_department_id, is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.department_code,
        dbData.department_name,
        dbData.description || null,
        dbData.parent_department_id || null,
        dbData.is_active !== undefined ? dbData.is_active : true,
        userId,
        userId
      ];

      const result = await this.query(sql, params, organizationId);
      return mapDepartmentDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating department', { departmentData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update department
   */
  async update(id, departmentData, organizationId, userId) {
    try {
      const dbData = mapDepartmentApiToDb(departmentData);

      const sql = `
        UPDATE ${this.tableName}
        SET
          department_name = COALESCE($1, department_name),
          description = $2,
          parent_department_id = $3,
          is_active = COALESCE($4, is_active),
          updated_by = $5,
          updated_at = NOW()
        WHERE id = $6
          AND organization_id = $7
          AND deleted_at IS NULL
        RETURNING *
      `;

      const params = [
        dbData.department_name,
        dbData.description,
        dbData.parent_department_id,
        dbData.is_active,
        userId,
        id,
        organizationId
      ];

      const result = await this.query(sql, params, organizationId);
      return result.rows[0] ? mapDepartmentDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating department', { id, departmentData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete department (soft delete)
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
      this.logger.error('Error deleting department', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Get department hierarchy
   */
  async getHierarchy(organizationId) {
    try {
      const sql = `
        WITH RECURSIVE dept_tree AS (
          -- Root departments (no parent)
          SELECT 
            id, department_code, department_name, description,
            parent_department_id, is_active,
            1 as level,
            ARRAY[id] as path
          FROM ${this.tableName}
          WHERE organization_id = $1 
            AND parent_department_id IS NULL
            AND deleted_at IS NULL
          
          UNION ALL
          
          -- Child departments
          SELECT 
            d.id, d.department_code, d.department_name, d.description,
            d.parent_department_id, d.is_active,
            dt.level + 1,
            dt.path || d.id
          FROM ${this.tableName} d
          INNER JOIN dept_tree dt ON d.parent_department_id = dt.id
          WHERE d.organization_id = $1
            AND d.deleted_at IS NULL
        )
        SELECT * FROM dept_tree
        ORDER BY path
      `;

      const result = await this.query(sql, [organizationId], organizationId);
      return result.rows.map(row => mapDepartmentDbToApi(row));
    } catch (error) {
      this.logger.error('Error getting department hierarchy', { organizationId, error: error.message });
      throw error;
    }
  }
}

export default DepartmentRepository;
