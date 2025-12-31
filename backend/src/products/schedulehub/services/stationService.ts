/**
 * ScheduleHub Station Service
 * Business logic for station and coverage requirement management
 */

import pool, { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { StationData } from '../../../types/schedulehub.types.js';
import Joi from 'joi';
import { mapStationDbToApi, mapStationsDbToApi } from '../dto/stationDto.js';

class StationService {
  logger: typeof logger;
  createStationSchema: Joi.ObjectSchema;
  addRoleRequirementSchema: Joi.ObjectSchema;

  

  logger: any;

constructor() {
    this.logger = logger;
  }

  createStationSchema = Joi.object({
    stationCode: Joi.string().max(50).required(),
    stationName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    locationId: Joi.string().uuid().required(),
    floorLevel: Joi.string().max(20).allow(null),
    zone: Joi.string().max(50).allow(null),
    capacity: Joi.number().integer().positive().allow(null),
    requiresSupervision: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
  });

  addRoleRequirementSchema = Joi.object({
    stationId: Joi.string().uuid().required(),
    roleId: Joi.string().uuid().required(),
    minWorkers: Joi.number().integer().min(0).required(),
    maxWorkers: Joi.number().integer().min(Joi.ref('minWorkers')).required(),
    priority: Joi.number().integer().min(1).max(10).default(5)
  });

  async createStation(stationData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const { error, value } = this.createStationSchema.validate(stationData);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);

      const result = await client.query(
        `INSERT INTO scheduling.stations (
          organization_id, station_code, station_name, description, location_id,
          floor_level, zone, capacity, requires_supervision, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [organizationId, value.stationCode, value.stationName, value.description || null,
         value.locationId || null, value.floorLevel || null, value.zone || null,
         value.capacity || null, value.requiresSupervision, value.isActive]
      );

      await client.query('COMMIT');
      this.logger.info('Station created', { stationId: result.rows[0].id, organizationId });
      
      // Transform database record to API format
      return mapStationDbToApi(result.rows[0]);
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listStations(organizationId, includeInactive = false) {
    try {
      let sql = `
        SELECT s.*,
          l.location_name,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE station_id = s.id) as shift_count
        FROM scheduling.stations s
        LEFT JOIN hris.location l ON s.location_id = l.id
        WHERE s.organization_id = $1
      `;
      const params = [organizationId];

      if (!includeInactive) sql += ` AND s.deleted_at IS NULL`;
      sql += ` ORDER BY s.station_name`;

      const result = await query(sql, params, organizationId, {
        operation: 'SELECT',
        table: 'stations'
      });
      
      // Transform database records to API format
      return mapStationsDbToApi(result.rows);
    } catch (_error) {
      this.logger.error('Error listing stations:', error);
      throw error;
    }
  }

  async getStationById(stationId, organizationId) {
    try {
      const result = await query(
        `SELECT s.*,
          l.location_name,
          (SELECT COUNT(*) FROM scheduling.station_role_requirements WHERE station_id = s.id) as role_requirement_count
        FROM scheduling.stations s
        LEFT JOIN hris.location l ON s.location_id = l.id
        WHERE s.id = $1 AND s.organization_id = $2`,
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'stations'
        }
      );

      if (result.rows.length === 0) return null;
      
      // Transform database record to API format
      return mapStationDbToApi(result.rows[0]);
    } catch (_error) {
      this.logger.error('Error fetching station:', error);
      throw error;
    }
  }

  async updateStation(stationId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const allowedFields = ['stationName', 'description', 'locationId', 'floorLevel', 
                             'zone', 'capacity', 'requiresSupervision', 'isActive'];
      const updates = [];
      const params = [];
      let paramCount = 0;

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          paramCount++;
          const snakeKey = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          updates.push(`${snakeKey} = $${paramCount}`);
          params.push(updateData[field]);
        }
      });

      if (updates.length === 0) throw new Error('No valid fields to update');

      paramCount++;
      params.push(stationId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.stations
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);
      if (result.rows.length === 0) throw new Error('Station not found');

      await client.query('COMMIT');
      
      // Transform database record to API format
      return mapStationDbToApi(result.rows[0]);
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async addRoleRequirement(stationId, roleId, organizationId, requirements) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO scheduling.station_role_requirements (
          organization_id, station_id, role_id, min_workers, max_workers,
          required_proficiency, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (station_id, role_id)
        DO UPDATE SET min_workers = $4, max_workers = $5, required_proficiency = $6, priority = $7
        RETURNING *`,
        [organizationId, stationId, roleId, requirements.minWorkers || 1,
         requirements.maxWorkers || null, requirements.requiredProficiency || null,
         requirements.priority || 50]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error adding role requirement:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeRoleRequirement(stationId, roleId, organizationId) {
    try {
      const result = await query(
        `DELETE FROM scheduling.station_role_requirements
         WHERE station_id = $1 AND role_id = $2 AND organization_id = $3
         RETURNING *`,
        [stationId, roleId, organizationId],
        organizationId,
        {
          operation: 'DELETE',
          table: 'station_role_requirements'
        }
      );

      if (result.rows.length === 0) throw new Error('Requirement not found');
      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error removing role requirement:', error);
      throw error;
    }
  }

  // Assignment management methods
  async getStationAssignments(stationId, organizationId) {
    try {
      this.logger.info(`Fetching assignments for station ${stationId}`);

      const result = await query(
        `SELECT 
           sa.*,
           e.first_name,
           e.last_name,
           e.email,
           COALESCE(assigned_emp.first_name || ' ' || assigned_emp.last_name, u.email) as assigned_by_name
         FROM scheduling.station_assignments sa
         LEFT JOIN hris.employee e ON sa.employee_id = e.id AND e.organization_id = sa.organization_id
         LEFT JOIN hris.user_account u ON sa.assigned_by = u.id AND u.organization_id = sa.organization_id
         LEFT JOIN hris.employee assigned_emp ON u.employee_id = assigned_emp.id AND assigned_emp.organization_id = sa.organization_id
         WHERE sa.station_id = $1 
           AND sa.organization_id = $2 
           AND sa.deleted_at IS NULL
         ORDER BY sa.assigned_at DESC`,
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'station_assignments'
        }
      );

      return result.rows.map(assignment => ({
        id: assignment.id,
        stationId: assignment.station_id,
        employeeId: assignment.employee_id,
        employeeName: assignment.first_name && assignment.last_name 
          ? `${assignment.first_name} ${assignment.last_name}`
          : 'Unknown Employee',
        employeeEmail: assignment.email,
        notes: assignment.notes,
        assignedAt: assignment.assigned_at,
        assignedBy: assignment.assigned_by,
        assignedByName: assignment.assigned_by_name || 'System'
      }));
    } catch (_error) {
      this.logger.error('Error fetching station assignments:', error);
      throw error;
    }
  }

  async assignEmployeeToStation(stationId, employeeId, organizationId, userId, notes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify station exists and belongs to organization
      const stationResult = await client.query(
        'SELECT id FROM scheduling.stations WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [stationId, organizationId]
      );

      if (stationResult.rows.length === 0) {
        throw new Error('Station not found');
      }

      // Verify employee exists and belongs to organization  
      const employeeResult = await client.query(
        'SELECT id, first_name, last_name, email FROM hris.employee WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
        [employeeId, organizationId]
      );

      if (employeeResult.rows.length === 0) {
        throw new Error('Employee not found');
      }

      const employee = employeeResult.rows[0];

      // Check if employee is already assigned to this station
      const existingAssignment = await client.query(
        'SELECT id FROM scheduling.station_assignments WHERE station_id = $1 AND employee_id = $2 AND organization_id = $3 AND deleted_at IS NULL',
        [stationId, employeeId, organizationId]
      );

      if (existingAssignment.rows.length > 0) {
        throw new Error('Employee is already assigned to this station');
      }

      // Create new assignment
      const assignmentResult = await client.query(
        `INSERT INTO scheduling.station_assignments 
         (id, station_id, employee_id, organization_id, notes, assigned_by, assigned_at, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW(), NOW(), NOW())
         RETURNING *`,
        [stationId, employeeId, organizationId, notes, userId]
      );

      await client.query('COMMIT');

      const assignment = assignmentResult.rows[0];
      
      this.logger.info(`Employee ${employeeId} assigned to station ${stationId}`);

      return {
        id: assignment.id,
        stationId: assignment.station_id,
        employeeId: assignment.employee_id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeeEmail: employee.email,
        notes: assignment.notes,
        assignedAt: assignment.assigned_at,
        assignedBy: assignment.assigned_by
      };
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error assigning employee to station:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeEmployeeAssignment(stationId, assignmentId, organizationId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify assignment exists and belongs to organization
      const assignmentResult = await client.query(
        'SELECT * FROM scheduling.station_assignments WHERE id = $1 AND station_id = $2 AND organization_id = $3 AND deleted_at IS NULL',
        [assignmentId, stationId, organizationId]
      );

      if (assignmentResult.rows.length === 0) {
        throw new Error('Assignment not found');
      }

      // Soft delete the assignment
      await client.query(
        `UPDATE scheduling.station_assignments 
         SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [userId, assignmentId, organizationId]
      );

      await client.query('COMMIT');
      
      this.logger.info(`Assignment ${assignmentId} removed from station ${stationId}`);
      
      return true;
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error removing employee assignment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // STATION ROLE REQUIREMENTS METHODS
  // ============================================================================

  /**
   * Get all role requirements for a station
   * @param {string} stationId - Station UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Station requirements
   */
  async getStationRequirements(stationId, organizationId) {
    try {
      const result = await query(
        `SELECT 
          srr.station_id,
          srr.role_id,
          srr.min_workers,
          srr.max_workers,
          srr.priority,
          srr.created_at,
          srr.updated_at,
          r.role_name,
          r.role_code,
          r.hourly_rate
         FROM scheduling.station_role_requirements srr
         JOIN scheduling.roles r ON srr.role_id = r.id
         WHERE srr.station_id = $1 
           AND srr.organization_id = $2
           AND srr.deleted_at IS NULL
         ORDER BY srr.priority ASC, r.role_name ASC`,
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'station_role_requirements'
        }
      );

      const requirements = result.rows.map(row => ({
        stationId: row.station_id,
        roleId: row.role_id,
        roleName: row.role_name,
        roleCode: row.role_code,
        hourlyRate: row.hourly_rate,
        minWorkers: row.min_workers,
        maxWorkers: row.max_workers,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      this.logger.info('Station requirements retrieved', { 
        stationId, 
        organizationId, 
        count: requirements.length 
      });

      return requirements;
    } catch (_error) {
      this.logger.error('Error getting station requirements:', error);
      throw error;
    }
  }

  /**
   * Add role requirement to station
   * @param {string} stationId - Station UUID
   * @param {string} roleId - Role UUID
   * @param {string} organizationId - Organization UUID
   * @param {number} minWorkers - Minimum workers required
   * @param {number} maxWorkers - Maximum workers allowed
   * @param {number} priority - Priority level (1 = highest)
   * @param {string} userId - User UUID
   * @returns {Promise<Object>} Created requirement
   */
  async addRoleRequirement(stationId, roleId, organizationId, minWorkers, maxWorkers, priority, userId) {
    // Validate input data
    const data = { stationId, roleId, minWorkers, maxWorkers, priority };
    const validated = await this.addRoleRequirementSchema.validateAsync(data);
    const { stationId: validatedStationId, roleId: validatedRoleId, minWorkers: validatedMinWorkers, maxWorkers: validatedMaxWorkers, priority: validatedPriority } = validated;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify station exists and belongs to organization
      const stationCheck = await client.query(
        `SELECT id FROM scheduling.stations 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [validatedStationId, organizationId]
      );

      if (stationCheck.rows.length === 0) {
        throw new Error('Station not found or access denied');
      }

      // Verify role exists and belongs to organization
      const roleCheck = await client.query(
        `SELECT id FROM scheduling.roles 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [validatedRoleId, organizationId]
      );

      if (roleCheck.rows.length === 0) {
        throw new Error('Role not found or access denied');
      }

      // Check if requirement already exists
      const existingCheck = await client.query(
        `SELECT id FROM scheduling.station_role_requirements 
         WHERE station_id = $1 AND role_id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
        [validatedStationId, validatedRoleId, organizationId]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error('Role requirement already exists for this station');
      }

      // Insert new requirement
      const result = await client.query(
        `INSERT INTO scheduling.station_role_requirements (
          station_id, role_id, organization_id, min_workers, max_workers, 
          priority, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *`,
        [validatedStationId, validatedRoleId, organizationId, validatedMinWorkers, validatedMaxWorkers, validatedPriority, userId]
      );

      await client.query('COMMIT');
      
      this.logger.info('Role requirement added to station', { 
        stationId: validatedStationId, 
        roleId: validatedRoleId, 
        organizationId 
      });

      // Return the created requirement with role details
      const requirementWithRole = await client.query(
        `SELECT 
          srr.station_id,
          srr.role_id,
          srr.min_workers,
          srr.max_workers,
          srr.priority,
          srr.created_at,
          srr.updated_at,
          r.role_name,
          r.role_code,
          r.hourly_rate
         FROM scheduling.station_role_requirements srr
         JOIN scheduling.roles r ON srr.role_id = r.id
         WHERE srr.id = $1`,
        [result.rows[0].id]
      );

      const requirement = requirementWithRole.rows[0];
      return {
        stationId: requirement.station_id,
        roleId: requirement.role_id,
        roleName: requirement.role_name,
        roleCode: requirement.role_code,
        hourlyRate: requirement.hourly_rate,
        minWorkers: requirement.min_workers,
        maxWorkers: requirement.max_workers,
        priority: requirement.priority,
        createdAt: requirement.created_at,
        updatedAt: requirement.updated_at
      };
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error adding role requirement:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove role requirement from station
   * @param {string} stationId - Station UUID
   * @param {string} roleId - Role UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Success response
   */
  async removeRoleRequirement(stationId, roleId, organizationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Soft delete the requirement
      const result = await client.query(
        `UPDATE scheduling.station_role_requirements 
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE station_id = $1 AND role_id = $2 AND organization_id = $3 AND deleted_at IS NULL
         RETURNING id`,
        [stationId, roleId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Role requirement not found');
      }

      await client.query('COMMIT');
      
      this.logger.info('Role requirement removed from station', { 
        stationId, 
        roleId, 
        organizationId 
      });

      return true;
    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error removing role requirement:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get station coverage statistics for a specific date
   * @param {string} organizationId - Organization ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Coverage analysis with station-level statistics
   */
  async getStationCoverageStats(organizationId, date) {
    try {
      // Parse date parameter
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      // Get comprehensive station coverage with shift details
      const queryText = `
        WITH station_requirements AS (
          -- Get stations with their requirements
          SELECT 
            s.id as station_id,
            s.station_name as station_name,
            s.is_active,
            -- Get role requirements for each station
            COALESCE(SUM(sr.min_workers), 0) as min_staffing,
            COALESCE(SUM(GREATEST(sr.min_workers, COALESCE(sr.max_workers, sr.min_workers))), 0) as required_staffing
          FROM scheduling.stations s
          LEFT JOIN scheduling.station_role_requirements sr 
            ON s.id = sr.station_id 
            AND sr.organization_id = $1
            AND sr.deleted_at IS NULL
          WHERE s.organization_id = $1
            AND s.deleted_at IS NULL
          GROUP BY s.id, s.station_name, s.is_active
        ),
        shift_coverage AS (
          -- Get actual shift assignments for the date
          SELECT 
            sh.station_id,
            COUNT(*)  FILTER (WHERE sh.status IN ('confirmed', 'scheduled')) as current_staffing,
            json_agg(
              json_build_object(
                'id', sh.id,
                'employeeId', sh.employee_id,
                'employeeName', COALESCE(CONCAT(e.first_name, ' ', e.last_name), e.preferred_name, 'Unassigned'),
                'roleId', sh.role_id,
                'roleName', r.role_name,
                'startTime', TO_CHAR(sh.start_time, 'HH24:MI'),
                'endTime', TO_CHAR(sh.end_time, 'HH24:MI'),
                'status', sh.status,
                'shiftDate', sh.shift_date
              )
            ) as shifts
          FROM scheduling.shifts sh
          LEFT JOIN hris.employee e ON sh.employee_id = e.id AND e.organization_id = $1
          LEFT JOIN scheduling.roles r ON sh.role_id = r.id AND r.organization_id = $1
          WHERE sh.organization_id = $1
            AND sh.shift_date = $2
          GROUP BY sh.station_id
        )
        SELECT 
          sr.station_id as "stationId",
          sr.station_name as "stationName",
          sr.required_staffing as "requiredStaffing",
          sr.min_staffing as "minimumStaffing",
          COALESCE(sc.current_staffing, 0) as "currentStaffing",
          CASE 
            WHEN sr.required_staffing = 0 THEN 0
            ELSE ROUND((COALESCE(sc.current_staffing, 0)::numeric / sr.required_staffing) * 100)
          END as "coveragePercentage",
          CASE 
            WHEN COALESCE(sc.current_staffing, 0) = 0 THEN 'critical'
            WHEN COALESCE(sc.current_staffing, 0) < sr.min_staffing THEN 'critical'
            WHEN COALESCE(sc.current_staffing, 0) < sr.required_staffing THEN 'warning'
            ELSE 'optimal'
          END as status,
          GREATEST(0, sr.required_staffing - COALESCE(sc.current_staffing, 0)) as "unfilledSlots",
          sr.is_active as "isActive",
          COALESCE(sc.shifts, '[]'::json) as shifts
        FROM station_requirements sr
        LEFT JOIN shift_coverage sc ON sr.station_id = sc.station_id
        ORDER BY 
          CASE 
            WHEN COALESCE(sc.current_staffing, 0) = 0 THEN 1
            WHEN COALESCE(sc.current_staffing, 0) < sr.min_staffing THEN 2
            WHEN COALESCE(sc.current_staffing, 0) < sr.required_staffing THEN 3
            ELSE 4
          END,
          sr.station_name
      `;

      const result = await query(queryText, [organizationId, dateStr], organizationId, {
        operation: 'SELECT',
        table: 'scheduling.stations',
        userId: null
      });
      const stationCoverage = result.rows;

      // Calculate overall statistics
      const totalStations = stationCoverage.length;
      const optimalStations = stationCoverage.filter(s => s.status === 'optimal').length;
      const warningStations = stationCoverage.filter(s => s.status === 'warning').length;
      const criticalStations = stationCoverage.filter(s => s.status === 'critical').length;
      
      const overallCoveragePercentage = totalStations > 0
        ? Math.round(stationCoverage.reduce((sum, s) => sum + s.coveragePercentage, 0) / totalStations)
        : 0;

      // Identify critical periods (simplified - can be enhanced)
      const criticalPeriods = this._identifyCriticalPeriods(stationCoverage, dateStr);

      return {
        totalStations,
        optimalStations,
        warningStations,
        criticalStations,
        overallCoveragePercentage,
        stationCoverage,
        criticalPeriods
      };
    } catch (_error) {
      this.logger.error('Error fetching station coverage stats:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        organizationId,
        date
      });
      throw error; // Throw original error to get more details in response
    }
  }

  /**
   * Identify critical time periods with coverage issues
   * @private
   */
  _identifyCriticalPeriods(stationCoverage, date) {
    const criticalPeriods = [];
    
    // Define standard shift periods
    const periods = [
      { start: 6, end: 14, name: 'Morning' },
      { start: 14, end: 22, name: 'Afternoon' },
      { start: 22, end: 6, name: 'Night' }
    ];

    periods.forEach(period => {
      const affectedStations = stationCoverage
        .filter(sc => sc.status !== 'optimal')
        .map(sc => sc.stationName);

      if (affectedStations.length >= 2) {
        const criticalCount = stationCoverage.filter(sc => 
          affectedStations.includes(sc.stationName) && sc.status === 'critical'
        ).length;

        const startTime = new Date(date);
        startTime.setHours(period.start, 0, 0, 0);
        
        const endTime = new Date(date);
        if (period.end < period.start) {
          endTime.setDate(endTime.getDate() + 1);
        }
        endTime.setHours(period.end, 0, 0, 0);

        criticalPeriods.push({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          affectedStations,
          severity: criticalCount >= 2 ? 'critical' : 'warning'
        });
      }
    });

    return criticalPeriods;
  }
}

export default StationService;
