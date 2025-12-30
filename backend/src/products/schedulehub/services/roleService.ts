/**
 * ScheduleHub Role Service  
 * Business logic for role and worker role assignment management
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { RoleData } from '../../../types/schedulehub.types.js';
import Joi from 'joi';
import { ConflictError } from '../../../utils/errors.js';
import { 
  mapRoleDbToApi, 
  mapRolesDbToApi, 
  mapRoleApiToDb, 
  mapRoleWorkersDbToApi,
  mapRoleFrontendToApi
} from '../dto/roleDto.js';

class RoleService {
  logger: typeof logger;
  createRoleSchema: Joi.ObjectSchema;

  

  logger: any;

constructor() {
    this.logger = logger;
  }

  createRoleSchema = Joi.object({
    roleCode: Joi.string().max(50).required(),
    roleName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).allow(null),
    requiresCertification: Joi.boolean().default(false),
    certificationTypes: Joi.array().items(Joi.string()).allow(null),
    skillLevel: Joi.string().valid('entry', 'intermediate', 'advanced', 'expert').allow(null),
    hourlyRate: Joi.number().positive().allow(null)
  });

  async createRole(roleData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use DTO to handle frontend format conversion
      const normalizedData = mapRoleFrontendToApi(roleData);
      
      logger.info('Converted frontend format to API format using DTO', {
        original: roleData,
        converted: normalizedData
      });
      
      // Validate API data (expects camelCase)
      const { error, value } = this.createRoleSchema.validate(normalizedData);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);

      // Transform validated API data to database format
      const dbData = mapRoleApiToDb(value);
      dbData.organization_id = organizationId;

      // Check if role with same organization_id and role_code already exists
      const existingRole = await client.query(
        `SELECT id, role_code FROM scheduling.roles 
         WHERE organization_id = $1 AND role_code = $2 AND deleted_at IS NULL`,
        [dbData.organization_id, dbData.role_code]
      );

      if (existingRole.rows.length > 0) {
        throw new ConflictError(
          `Role with code '${dbData.role_code}' already exists for this organization`,
          {
            field: 'roleCode',
            value: dbData.role_code,
            constraint: 'unique_role_code_per_organization'
          }
        );
      }

      const result = await client.query(
        `INSERT INTO scheduling.roles (
          organization_id, role_code, role_name, description, color,
          requires_certification, certification_types, skill_level, hourly_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          dbData.organization_id,
          dbData.role_code,
          dbData.role_name,
          dbData.description,
          dbData.color,
          dbData.requires_certification,
          dbData.certification_types,
          dbData.skill_level,
          dbData.hourly_rate
        ]
      );

      await client.query('COMMIT');
      this.logger.info('Role created', { roleId: result.rows[0].id, organizationId });
      
      // Transform database result back to API format
      return { success: true, data: mapRoleDbToApi(result.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating role:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listRoles(organizationId, includeInactive = false) {
    try {
      let query = `
        SELECT r.*,
          (SELECT COUNT(*) FROM scheduling.worker_roles WHERE role_id = r.id AND removed_date IS NULL) as worker_count,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE role_id = r.id) as shift_count
        FROM scheduling.roles r
        WHERE r.organization_id = $1
      `;
      const params = [organizationId];

      if (!includeInactive) {
        query += ` AND r.is_active = true`;
      }

      query += ` ORDER BY r.role_name`;
      const result = await pool.query(query, params);
      
      // Transform database results to API format
      return { success: true, data: mapRolesDbToApi(result.rows) };
    } catch (error) {
      this.logger.error('Error listing roles:', error);
      throw error;
    }
  }

  async getRoleById(roleId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT r.*,
          (SELECT COUNT(*) FROM scheduling.worker_roles WHERE role_id = r.id AND removed_date IS NULL) as worker_count
        FROM scheduling.roles r
        WHERE r.id = $1 AND r.organization_id = $2`,
        [roleId, organizationId]
      );

      if (result.rows.length === 0) return { success: false, error: 'Role not found' };
      
      // Transform database result to API format
      return { success: true, data: mapRoleDbToApi(result.rows[0]) };
    } catch (error) {
      this.logger.error('Error fetching role:', error);
      throw error;
    }
  }

  async updateRole(roleId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Transform API data to database format for update
      const dbUpdateData = mapRoleApiToDb(updateData);
      
      const allowedFields = ['role_name', 'description', 'color', 'requires_certification', 
                             'certification_types', 'skill_level', 'hourly_rate', 'is_active'];
      const updates = [];
      const params = [];
      let paramCount = 0;

      allowedFields.forEach(field => {
        if (dbUpdateData[field] !== undefined) {
          paramCount++;
          updates.push(`${field} = $${paramCount}`);
          params.push(dbUpdateData[field]);
        }
      });

      if (updates.length === 0) throw new Error('No valid fields to update');

      // Add updated_at and updated_by
      paramCount++;
      updates.push(`updated_at = $${paramCount}`);
      params.push(new Date());
      
      paramCount++;
      updates.push(`updated_by = $${paramCount}`);
      params.push(userId);

      paramCount++;
      params.push(roleId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.roles
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);
      if (result.rows.length === 0) throw new Error('Role not found');

      await client.query('COMMIT');
      
      // Transform database result to API format
      return { success: true, data: mapRoleDbToApi(result.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating role:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async assignWorkerToRole(workerId, roleId, organizationId, proficiencyLevel = 'competent', certifications = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if already assigned
      const existingAssignment = await client.query(
        `SELECT id FROM scheduling.worker_roles
         WHERE employee_id = $1 AND role_id = $2 AND removed_date IS NULL`,
        [workerId, roleId]
      );

      if (existingAssignment.rows.length > 0) {
        throw new Error('Worker already assigned to this role');
      }

      const result = await client.query(
        `INSERT INTO scheduling.worker_roles (
          organization_id, employee_id, role_id, proficiency_level, certifications
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [organizationId, workerId, roleId, proficiencyLevel, certifications]
      );

      await client.query('COMMIT');
      this.logger.info('Worker assigned to role', { workerId, roleId, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error assigning worker to role:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeWorkerFromRole(workerId, roleId, organizationId) {
    try {
      const result = await pool.query(
        `UPDATE scheduling.worker_roles
         SET removed_date = NOW()
         WHERE employee_id = $1 AND role_id = $2 AND organization_id = $3 AND removed_date IS NULL
         RETURNING *`,
        [workerId, roleId, organizationId]
      );

      if (result.rows.length === 0) throw new Error('Assignment not found');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      this.logger.error('Error removing worker from role:', error);
      throw error;
    }
  }

  async getWorkerRoles(workerId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT wr.*, r.role_name, r.role_code, r.color
         FROM scheduling.worker_roles wr
         JOIN scheduling.roles r ON wr.role_id = r.id
         WHERE wr.employee_id = $1 AND wr.organization_id = $2 AND wr.removed_date IS NULL
         ORDER BY r.role_name`,
        [workerId, organizationId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error fetching worker roles:', error);
      throw error;
    }
  }

  async getRoleWorkers(roleId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT wr.*, e.id, e.first_name, e.last_name, e.employee_number as worker_number, e.employment_status as status
         FROM scheduling.worker_roles wr
         JOIN hris.employee e ON wr.employee_id = e.id
         WHERE wr.role_id = $1 AND wr.organization_id = $2 AND wr.removed_date IS NULL
         AND e.employment_status = 'active'
         ORDER BY e.last_name, e.first_name`,
        [roleId, organizationId]
      );
      const workers = mapRoleWorkersDbToApi(result.rows);
      return { success: true, workers };
    } catch (error) {
      this.logger.error('Error fetching role workers:', error);
      throw error;
    }
  }
}

export default RoleService;
