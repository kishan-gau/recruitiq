/**
 * ScheduleHub Worker Service
 * Business logic for worker management (synced from Nexus HRIS)
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { WorkerData, WorkerSearchFilters, WorkerAvailabilityData } from '../../../types/schedulehub.types.js';
import { ValidationError } from '../../../utils/errors.js';
import Joi from 'joi';
import { mapWorkerDbToApi, mapWorkersDbToApi, mapWorkerApiToDb } from '../dto/workerDto.js';

class WorkerService {
  logger: typeof logger;
  createWorkerSchema: Joi.ObjectSchema;
  updateWorkerSchema: Joi.ObjectSchema;

  

  logger: any;

constructor() {
    this.logger = logger;
  }

  // Validation schemas
  createWorkerSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    workerNumber: Joi.string().max(50).required(),
    firstName: Joi.string().max(100).required(),
    lastName: Joi.string().max(100).required(),
    email: Joi.string().email().max(255).allow(null, ''),
    phone: Joi.string().max(50).allow(null, ''),
    employmentType: Joi.string().valid('full_time', 'part_time', 'casual', 'contractor').required(),
    departmentId: Joi.string().uuid().allow(null),
    departmentName: Joi.string().max(100).allow(null),
    locationId: Joi.string().uuid().allow(null),
    locationName: Joi.string().max(100).allow(null),
    maxHoursPerWeek: Joi.number().positive().default(40),
    minHoursPerWeek: Joi.number().min(0).default(0),
    maxConsecutiveDays: Joi.number().integer().min(1).max(7).default(6),
    minRestHoursBetweenShifts: Joi.number().integer().min(0).default(11),
    hireDate: Joi.string().isoDate().allow(null, '')
  });

  updateWorkerSchema = Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    email: Joi.string().email().max(255).allow(null, ''),
    phone: Joi.string().max(50).allow(null, ''),
    employmentType: Joi.string().valid('full_time', 'part_time', 'casual', 'contractor'),
    departmentId: Joi.string().uuid().allow(null),
    departmentName: Joi.string().max(100).allow(null),
    locationId: Joi.string().uuid().allow(null),
    locationName: Joi.string().max(100).allow(null),
    maxHoursPerWeek: Joi.number().positive(),
    minHoursPerWeek: Joi.number().min(0),
    maxConsecutiveDays: Joi.number().integer().min(1).max(7),
    minRestHoursBetweenShifts: Joi.number().integer().min(0),
    isSchedulable: Joi.boolean().optional(),
    schedulingStatus: Joi.string().valid('active', 'temporary_unavailable', 'restricted').optional(),
    schedulingNotes: Joi.string().max(1000).allow(null, '').optional(),
    notes: Joi.string().max(1000).allow(null, '').optional(),
    preferredShiftTypes: Joi.array().items(Joi.string()).optional(),
    unavailableDays: Joi.array().items(
      Joi.alternatives().try(
        Joi.number().integer().min(0).max(6),
        Joi.string().valid('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')
      )
    ).optional().custom((value, helpers) => {
      // Convert day names to numbers
      const dayNameToNumber = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      return value.map(day => typeof day === 'string' ? dayNameToNumber[day.toLowerCase()] : day);
    }),
    status: Joi.string().valid('active', 'inactive', 'on_leave', 'terminated')
  }).min(1);

  /**
   * Create worker scheduling config (employee must exist in hris.employee)
   */
  async createWorker(workerData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.createWorkerSchema.validate(workerData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Verify employee exists in hris.employee
      const employeeCheck = await client.query(
        `SELECT id, employment_status FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [value.employeeId, organizationId]
      );

      if (employeeCheck.rows.length === 0) {
        throw new Error('Employee not found in HRIS');
      }

      // Check if worker scheduling config already exists
      const existingConfig = await client.query(
        `SELECT id FROM scheduling.worker_scheduling_config 
         WHERE organization_id = $1 AND employee_id = $2`,
        [organizationId, value.employeeId]
      );

      if (existingConfig.rows.length > 0) {
        throw new ValidationError('Scheduling configuration already exists for this employee');
      }

      // Insert worker scheduling config (scheduling-specific data only)
      const result = await client.query(
        `INSERT INTO scheduling.worker_scheduling_config (
          organization_id, employee_id, max_hours_per_week, min_hours_per_week,
          max_consecutive_days, min_rest_hours_between_shifts, 
          is_schedulable, scheduling_status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          organizationId,
          value.employeeId,
          value.maxHoursPerWeek || 40,
          value.minHoursPerWeek || 0,
          value.maxConsecutiveDays || 6,
          value.minRestHoursBetweenShifts || 11,
          true, // is_schedulable
          'active', // scheduling_status
          userId,
          userId
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Worker scheduling config created successfully', {
        configId: result.rows[0].id,
        employeeId: value.employeeId,
        organizationId
      });

      // Return worker data by fetching combined employee + config info
      const worker = await this.getWorkerByEmployeeId(value.employeeId, organizationId);

      return {
        success: true,
        data: worker
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating worker:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get worker by ID (queries employee from hris.employee with scheduling config)
   */
  async getWorkerById(workerId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT 
          e.id,
          e.employee_number as employee_id,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.employment_type,
          e.employment_status as status,
          e.department_id,
          d.department_name as department_name,
          e.location_id,
          e.hire_date,
          e.termination_date,
          wsc.max_hours_per_week,
          wsc.min_hours_per_week,
          wsc.max_consecutive_days,
          wsc.min_rest_hours_between_shifts,
          wsc.is_schedulable,
          wsc.scheduling_status,
          wsc.preferred_shift_types,
          wsc.blocked_days,
          wsc.scheduling_notes,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE employee_id = e.id AND status != 'cancelled') as total_shifts,
          (SELECT COUNT(*) FROM scheduling.worker_roles WHERE employee_id = e.id AND removed_date IS NULL) as role_count
        FROM hris.employee e
        LEFT JOIN scheduling.worker_scheduling_config wsc 
          ON e.id = wsc.employee_id AND e.organization_id = wsc.organization_id
        LEFT JOIN hris.department d 
          ON e.department_id = d.id AND e.organization_id = d.organization_id
        WHERE e.id = $1 AND e.organization_id = $2`,
        [workerId, organizationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Error fetching worker:', error);
      throw error;
    }
  }

  /**
   * Get worker by employee ID (queries employee from hris.employee with scheduling config)
   */
  async getWorkerByEmployeeId(employeeId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT 
          e.id,
          e.id as employee_id,
          e.employee_number as worker_number,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.employment_type,
          e.employment_status as status,
          e.department_id,
          e.location_id,
          e.hire_date,
          e.termination_date,
          wsc.max_hours_per_week,
          wsc.min_hours_per_week,
          wsc.max_consecutive_days,
          wsc.min_rest_hours_between_shifts,
          wsc.is_schedulable,
          wsc.scheduling_status,
          wsc.preferred_shift_types,
          wsc.blocked_days,
          wsc.scheduling_notes
        FROM hris.employee e
        LEFT JOIN scheduling.worker_scheduling_config wsc 
          ON e.id = wsc.employee_id AND e.organization_id = wsc.organization_id
        WHERE e.id = $1 AND e.organization_id = $2`,
        [employeeId, organizationId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return mapWorkerDbToApi(result.rows[0]);

    } catch (error) {
      this.logger.error('Error fetching worker by employee ID:', error);
      throw error;
    }
  }

  /**
   * List all workers with filters (queries hris.employee with scheduling config)
   */
  async listWorkers(organizationId, filters = {}) {
    try {
      const { 
        status, 
        departmentId, 
        locationId, 
        employmentType,
        search,
        page = 1, 
        limit = 50 
      } = filters;

      let query = `
        SELECT 
          e.id,
          e.employee_number as worker_number,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.employment_type,
          e.employment_status as status,
          e.department_id as primary_department_id,
          e.location_id,
          e.hire_date,
          e.termination_date,
          wsc.max_hours_per_week,
          wsc.min_hours_per_week,
          wsc.is_schedulable,
          wsc.scheduling_status,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE employee_id = e.id AND status != 'cancelled') as total_shifts
        FROM hris.employee e
        LEFT JOIN scheduling.worker_scheduling_config wsc 
          ON e.id = wsc.employee_id AND e.organization_id = wsc.organization_id
        WHERE e.organization_id = $1
          AND e.employment_status = 'active'
      `;
      const params = [organizationId];
      let paramCount = 1;

      // Apply filters
      if (status) {
        paramCount++;
        query += ` AND e.employment_status = $${paramCount}`;
        params.push(status);
      }

      if (departmentId) {
        paramCount++;
        query += ` AND e.department_id = $${paramCount}`;
        params.push(departmentId);
      }

      if (locationId) {
        paramCount++;
        query += ` AND e.location_id = $${paramCount}`;
        params.push(locationId);
      }

      if (employmentType) {
        paramCount++;
        query += ` AND e.employment_type = $${paramCount}`;
        params.push(employmentType);
      }

      if (search) {
        paramCount++;
        query += ` AND (
          e.first_name ILIKE $${paramCount} OR 
          e.last_name ILIKE $${paramCount} OR 
          e.employee_number ILIKE $${paramCount} OR
          e.email ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Pagination
      query += ` ORDER BY e.last_name, e.first_name`;
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM hris.employee e WHERE e.organization_id = $1 AND e.employment_status = 'active'`;
      const countParams = [organizationId];
      let countParamCount = 1;
      
      if (status) {
        countParamCount++;
        countQuery += ` AND e.employment_status = $${countParamCount}`;
        countParams.push(status);
      }
      if (departmentId) {
        countParamCount++;
        countQuery += ` AND e.department_id = $${countParamCount}`;
        countParams.push(departmentId);
      }
      if (locationId) {
        countParamCount++;
        countQuery += ` AND e.location_id = $${countParamCount}`;
        countParams.push(locationId);
      }
      if (employmentType) {
        countParamCount++;
        countQuery += ` AND e.employment_type = $${countParamCount}`;
        countParams.push(employmentType);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        success: true,
        data: mapWorkersDbToApi(result.rows),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };

    } catch (error) {
      this.logger.error('Error listing workers:', error);
      throw error;
    }
  }

  /**
   * Update worker scheduling config (updates scheduling.worker_scheduling_config only)
   */
  async updateWorker(workerId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.updateWorkerSchema.validate(updateData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check employee exists and not terminated (workerId is employee_id)
      const employeeCheck = await client.query(
        `SELECT id, employment_status FROM hris.employee WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      if (employeeCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      if (employeeCheck.rows[0].employment_status === 'terminated') {
        throw new ValidationError('Cannot update terminated worker');
      }

      const employeeId = workerId; // workerId is actually the employee_id

      // Separate employee fields from scheduling fields
      const schedulingFields = ['maxHoursPerWeek', 'minHoursPerWeek', 'maxConsecutiveDays', 'minRestHoursBetweenShifts', 'isSchedulable', 'schedulingStatus', 'schedulingNotes', 'notes', 'preferredShiftTypes', 'unavailableDays'];
      const employeeFields = ['firstName', 'lastName', 'email', 'phone', 'employmentType', 'departmentId', 'locationId', 'status'];
      
      const schedulingUpdates = [];
      const schedulingParams = [];
      const employeeUpdates = [];
      const employeeParams = [];
      
      // Categorize fields
      Object.keys(value).forEach(key => {
        if (schedulingFields.includes(key)) {
          // Special field mappings for scheduling fields
          let snakeKey;
          if (key === 'unavailableDays') {
            snakeKey = 'blocked_days';
          } else if (key === 'notes') {
            snakeKey = 'scheduling_notes';
          } else {
            snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          }
          
          schedulingUpdates.push(snakeKey);
          
          // Special handling for array fields for PostgreSQL
          if ((key === 'preferredShiftTypes' || key === 'unavailableDays') && Array.isArray(value[key])) {
            // Pass array directly to PostgreSQL - it will handle the conversion
            schedulingParams.push(value[key]);
          } else {
            schedulingParams.push(value[key]);
          }
        } else if (employeeFields.includes(key)) {
          // Special field mapping: status -> employment_status
          const snakeKey = key === 'status' 
            ? 'employment_status' 
            : key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          employeeUpdates.push(snakeKey);
          employeeParams.push(value[key]);
        }
      });

      // Must have at least one field to update
      if (schedulingUpdates.length === 0 && employeeUpdates.length === 0) {
        throw new Error('No fields to update');
      }

      let result;

      // Update or insert scheduling config if there are scheduling fields
      if (schedulingUpdates.length > 0) {
        // Build column names and values for UPSERT
        const columnNames = ['employee_id', 'organization_id', 'created_by', ...schedulingUpdates];
        const columnValues = [workerId, organizationId, userId, ...schedulingParams];
        
        // Build placeholders for VALUES clause
        let paramCount = 0;
        const valuePlaceholders = columnValues.map(() => {
          paramCount++;
          return `$${paramCount}`;
        });
        
        // Build SET clause for ON CONFLICT UPDATE
        const updateSetClause = schedulingUpdates.map((field, index) => {
          return `${field} = EXCLUDED.${field}`;
        }).join(', ');

        const schedulingQuery = `
          INSERT INTO scheduling.worker_scheduling_config 
            (${columnNames.join(', ')}, updated_by)
          VALUES 
            (${valuePlaceholders.join(', ')}, $${paramCount + 1})
          ON CONFLICT (employee_id, organization_id) 
          DO UPDATE SET 
            ${updateSetClause},
            updated_by = $${paramCount + 1},
            updated_at = NOW()
          RETURNING 
            id,
            employee_id,
            organization_id,
            CAST(max_hours_per_week AS INTEGER) as max_hours_per_week,
            CAST(min_hours_per_week AS INTEGER) as min_hours_per_week,
            max_consecutive_days,
            CAST(min_rest_hours_between_shifts AS INTEGER) as min_rest_hours_between_shifts,
            is_schedulable,
            scheduling_status,
            preferred_shift_types,
            blocked_days as unavailable_days,
            scheduling_notes,
            created_at,
            updated_at,
            created_by,
            updated_by
        `;

        const allParams = [...columnValues, userId];
        result = await client.query(schedulingQuery, allParams);
      }

      // Update employee if there are employee fields
      if (employeeUpdates.length > 0) {
        let paramCount = 0;
        const setClause = employeeUpdates.map(field => {
          paramCount++;
          return `${field} = $${paramCount}`;
        }).join(', ');

        paramCount++;
        const updatedByParam = paramCount;
        paramCount++;
        const employeeIdParam = paramCount;
        paramCount++;
        const orgIdParam = paramCount;

        const employeeQuery = `
          UPDATE hris.employee 
          SET ${setClause}, updated_by = $${updatedByParam}, updated_at = NOW()
          WHERE id = $${employeeIdParam} AND organization_id = $${orgIdParam}
          RETURNING *
        `;

        const allParams = [...employeeParams, userId, employeeId, organizationId];
        await client.query(employeeQuery, allParams);
      }

      // If no result from scheduling update, fetch complete worker data
      // Use LEFT JOIN so it works even when no scheduling config exists
      if (!result) {
        result = await client.query(
          `SELECT 
            wsc.id,
            e.id as employee_id,
            e.organization_id,
            CAST(wsc.max_hours_per_week AS INTEGER) as max_hours_per_week,
            CAST(wsc.min_hours_per_week AS INTEGER) as min_hours_per_week,
            wsc.max_consecutive_days,
            CAST(wsc.min_rest_hours_between_shifts AS INTEGER) as min_rest_hours_between_shifts,
            wsc.is_schedulable,
            wsc.scheduling_status,
            wsc.preferred_shift_types,
            wsc.blocked_days as unavailable_days,
            wsc.scheduling_notes,
            wsc.created_at,
            wsc.updated_at,
            wsc.created_by,
            wsc.updated_by,
            e.first_name,
            e.last_name,
            e.email,
            e.employment_type,
            e.employment_status as status,
            e.department_id,
            e.location_id
          FROM hris.employee e
          LEFT JOIN scheduling.worker_scheduling_config wsc ON wsc.employee_id = e.id AND wsc.organization_id = e.organization_id
          WHERE e.id = $1 AND e.organization_id = $2`,
          [workerId, organizationId]
        );
      }

      await client.query('COMMIT');

      this.logger.info('Worker scheduling config updated successfully', {
        employeeId: workerId,
        organizationId
      });

      return {
        success: true,
        data: mapWorkerDbToApi(result.rows[0])
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating worker:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Terminate worker (updates hris.employee and disables scheduling)
   */
  async terminateWorker(workerId, organizationId, terminationDate, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get employee_id from worker config first
      const workerCheck = await client.query(
        `SELECT employee_id FROM scheduling.worker_scheduling_config 
         WHERE employee_id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      if (workerCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      const employeeId = workerCheck.rows[0].employee_id;

      // Update employee status in hris.employee
      const employeeResult = await client.query(
        `UPDATE hris.employee 
        SET employment_status = 'terminated', 
            termination_date = $1,
            updated_by = $2
        WHERE id = $3 AND organization_id = $4
        RETURNING *`,
        [terminationDate || new Date(), userId, employeeId, organizationId]
      );

      if (employeeResult.rows.length === 0) {
        throw new Error('Employee not found');
      }

      // Update scheduling config to mark as not schedulable
      await client.query(
        `UPDATE scheduling.worker_scheduling_config
        SET is_schedulable = false,
            scheduling_status = 'restricted',
            updated_by = $1
        WHERE employee_id = $2 AND organization_id = $3`,
        [userId, employeeId, organizationId]
      );

      // Cancel all future shifts
      await client.query(
        `UPDATE scheduling.shifts
        SET status = 'cancelled',
            cancellation_reason = 'Worker terminated',
            updated_by = $1
        WHERE employee_id = $2 
        AND shift_date >= CURRENT_DATE
        AND status IN ('scheduled', 'confirmed')`,
        [userId, workerId]
      );

      await client.query('COMMIT');

      this.logger.info('Worker terminated successfully', {
        employeeId: workerId,
        organizationId
      });

      // Fetch complete worker data with employment_status mapped to status
      const workerResult = await client.query(
        `SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.employment_status as status,
          e.termination_date,
          e.organization_id,
          e.department_id,
          e.location_id,
          wsc.max_hours_per_week,
          wsc.min_hours_per_week,
          wsc.is_schedulable,
          wsc.scheduling_status
        FROM hris.employee e
        LEFT JOIN scheduling.worker_scheduling_config wsc 
          ON e.id = wsc.employee_id AND e.organization_id = wsc.organization_id
        WHERE e.id = $1 AND e.organization_id = $2`,
        [workerId, organizationId]
      );

      return {
        success: true,
        data: mapWorkerDbToApi(workerResult.rows[0])
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error terminating worker:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get worker availability summary
   */
  async getWorkerAvailabilitySummary(workerId, organizationId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT 
          day_of_week,
          start_time,
          end_time,
          availability_type,
          priority
        FROM scheduling.worker_availability
        WHERE employee_id = $1 
        AND organization_id = $2
        AND (
          (availability_type = 'recurring' AND (effective_to IS NULL OR effective_to >= $3))
          OR
          (availability_type IN ('one_time', 'unavailable') AND specific_date BETWEEN $3 AND $4)
        )
        ORDER BY day_of_week, start_time`,
        [workerId, organizationId, startDate, endDate]
      );

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('Error fetching worker availability:', error);
      throw error;
    }
  }

  /**
   * Get worker shift history
   */
  async getWorkerShiftHistory(workerId, organizationId, filters = {}) {
    try {
      const { startDate, endDate, status, limit = 50 } = filters;

      let query = `
        SELECT s.*, r.role_name, st.station_name
        FROM scheduling.shifts s
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        WHERE s.employee_id = $1 AND s.organization_id = $2
      `;
      const params = [workerId, organizationId];
      let paramCount = 2;

      if (startDate) {
        paramCount++;
        query += ` AND s.shift_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND s.shift_date <= $${paramCount}`;
        params.push(endDate);
      }

      if (status) {
        paramCount++;
        query += ` AND s.status = $${paramCount}`;
        params.push(status);
      }

      query += ` ORDER BY s.shift_date DESC, s.start_time DESC`;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);

      const result = await pool.query(query, params);

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('Error fetching worker shift history:', error);
      throw error;
    }
  }
}

export default WorkerService;
