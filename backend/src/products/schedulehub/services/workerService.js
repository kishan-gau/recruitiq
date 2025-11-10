/**
 * ScheduleHub Worker Service
 * Business logic for worker management (synced from Nexus HRIS)
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';

class WorkerService {
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
    status: Joi.string().valid('active', 'inactive', 'on_leave', 'terminated')
  }).min(1);

  /**
   * Create a new worker (synced from Nexus)
   */
  async createWorker(workerData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.createWorkerSchema.validate(workerData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Check if worker already exists for this employee
      const existingWorker = await client.query(
        `SELECT id FROM scheduling.workers 
         WHERE organization_id = $1 AND employee_id = $2`,
        [organizationId, value.employeeId]
      );

      if (existingWorker.rows.length > 0) {
        throw new Error('Worker already exists for this employee');
      }

      // Insert worker
      const result = await client.query(
        `INSERT INTO scheduling.workers (
          organization_id, employee_id, worker_number, first_name, last_name,
          email, phone, employment_type, department_id, department_name,
          location_id, location_name, max_hours_per_week, min_hours_per_week,
          max_consecutive_days, min_rest_hours_between_shifts, hire_date,
          status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          organizationId,
          value.employeeId,
          value.workerNumber,
          value.firstName,
          value.lastName,
          value.email || null,
          value.phone || null,
          value.employmentType,
          value.departmentId || null,
          value.departmentName || null,
          value.locationId || null,
          value.locationName || null,
          value.maxHoursPerWeek,
          value.minHoursPerWeek,
          value.maxConsecutiveDays,
          value.minRestHoursBetweenShifts,
          value.hireDate || null,
          'active',
          userId,
          userId
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Worker created successfully', {
        workerId: result.rows[0].id,
        employeeId: value.employeeId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
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
   * Get worker by ID
   */
  async getWorkerById(workerId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT w.*, 
          (SELECT COUNT(*) FROM scheduling.shifts WHERE worker_id = w.id AND status != 'cancelled') as total_shifts,
          (SELECT COUNT(*) FROM scheduling.worker_roles WHERE worker_id = w.id AND removed_date IS NULL) as role_count
        FROM scheduling.workers w
        WHERE w.id = $1 AND w.organization_id = $2`,
        [workerId, organizationId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Worker not found' };
      }

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      this.logger.error('Error fetching worker:', error);
      throw error;
    }
  }

  /**
   * Get worker by employee ID
   */
  async getWorkerByEmployeeId(employeeId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT * FROM scheduling.workers
        WHERE employee_id = $1 AND organization_id = $2`,
        [employeeId, organizationId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Worker not found' };
      }

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      this.logger.error('Error fetching worker by employee ID:', error);
      throw error;
    }
  }

  /**
   * List all workers with filters
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
        SELECT w.*,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE worker_id = w.id AND status != 'cancelled') as total_shifts
        FROM scheduling.workers w
        WHERE w.organization_id = $1
      `;
      const params = [organizationId];
      let paramCount = 1;

      // Apply filters
      if (status) {
        paramCount++;
        query += ` AND w.status = $${paramCount}`;
        params.push(status);
      }

      if (departmentId) {
        paramCount++;
        query += ` AND w.department_id = $${paramCount}`;
        params.push(departmentId);
      }

      if (locationId) {
        paramCount++;
        query += ` AND w.location_id = $${paramCount}`;
        params.push(locationId);
      }

      if (employmentType) {
        paramCount++;
        query += ` AND w.employment_type = $${paramCount}`;
        params.push(employmentType);
      }

      if (search) {
        paramCount++;
        query += ` AND (
          w.first_name ILIKE $${paramCount} OR 
          w.last_name ILIKE $${paramCount} OR 
          w.worker_number ILIKE $${paramCount} OR
          w.email ILIKE $${paramCount}
        )`;
        params.push(`%${search}%`);
      }

      // Pagination
      query += ` ORDER BY w.last_name, w.first_name`;
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM scheduling.workers w WHERE w.organization_id = $1`;
      const countParams = [organizationId];
      
      if (status) countQuery += ` AND w.status = $2`;
      if (departmentId) countQuery += ` AND w.department_id = $${countParams.length + 1}`;
      if (locationId) countQuery += ` AND w.location_id = $${countParams.length + 1}`;
      if (employmentType) countQuery += ` AND w.employment_type = $${countParams.length + 1}`;
      
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        success: true,
        data: result.rows,
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
   * Update worker
   */
  async updateWorker(workerId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.updateWorkerSchema.validate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Check worker exists
      const workerCheck = await client.query(
        `SELECT id FROM scheduling.workers WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      if (workerCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramCount = 0;

      Object.keys(value).forEach(key => {
        paramCount++;
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updates.push(`${snakeKey} = $${paramCount}`);
        params.push(value[key]);
      });

      paramCount++;
      updates.push(`updated_by = $${paramCount}`);
      params.push(userId);

      paramCount++;
      params.push(workerId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.workers 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);

      await client.query('COMMIT');

      this.logger.info('Worker updated successfully', {
        workerId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
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
   * Terminate worker (soft delete)
   */
  async terminateWorker(workerId, organizationId, terminationDate, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE scheduling.workers 
        SET status = 'terminated', 
            termination_date = $1,
            updated_by = $2
        WHERE id = $3 AND organization_id = $4
        RETURNING *`,
        [terminationDate || new Date(), userId, workerId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Worker not found');
      }

      // Cancel all future shifts
      await client.query(
        `UPDATE scheduling.shifts
        SET status = 'cancelled',
            cancellation_reason = 'Worker terminated',
            updated_by = $1
        WHERE worker_id = $2 
        AND shift_date >= CURRENT_DATE
        AND status IN ('scheduled', 'confirmed')`,
        [userId, workerId]
      );

      await client.query('COMMIT');

      this.logger.info('Worker terminated successfully', {
        workerId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
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
        WHERE worker_id = $1 
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
        WHERE s.worker_id = $1 AND s.organization_id = $2
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
