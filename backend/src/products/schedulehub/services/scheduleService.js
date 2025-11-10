/**
 * ScheduleHub Schedule Service
 * Business logic for schedule and shift management
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';

class ScheduleService {
  constructor() {
    this.logger = logger;
  }

  // Validation schemas
  createScheduleSchema = Joi.object({
    scheduleName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    startDate: Joi.date().required(),
    endDate: Joi.date().required().greater(Joi.ref('startDate'))
  });

  createShiftSchema = Joi.object({
    scheduleId: Joi.string().uuid().required(),
    shiftDate: Joi.date().required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(), // HH:MM format
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    workerId: Joi.string().uuid().allow(null),
    roleId: Joi.string().uuid().required(),
    stationId: Joi.string().uuid().allow(null),
    breakDurationMinutes: Joi.number().min(0).default(0),
    breakPaid: Joi.boolean().default(true),
    shiftType: Joi.string().valid('regular', 'overtime', 'on_call', 'training').default('regular'),
    notes: Joi.string().allow(null, '')
  });

  updateShiftSchema = Joi.object({
    shiftDate: Joi.date(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
    workerId: Joi.string().uuid().allow(null),
    roleId: Joi.string().uuid(),
    stationId: Joi.string().uuid().allow(null),
    breakDurationMinutes: Joi.number().min(0),
    breakPaid: Joi.boolean(),
    shiftType: Joi.string().valid('regular', 'overtime', 'on_call', 'training'),
    status: Joi.string().valid('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
    notes: Joi.string().allow(null, '')
  }).min(1);

  /**
   * Create a new schedule
   */
  async createSchedule(scheduleData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.createScheduleSchema.validate(scheduleData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Insert schedule
      const result = await client.query(
        `INSERT INTO scheduling.schedules (
          organization_id, schedule_name, description, 
          start_date, end_date, status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          organizationId,
          value.scheduleName,
          value.description || null,
          value.startDate,
          value.endDate,
          'draft',
          userId,
          userId
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Schedule created successfully', {
        scheduleId: result.rows[0].id,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get schedule by ID with all shifts
   */
  async getScheduleById(scheduleId, organizationId) {
    try {
      // Get schedule details
      const scheduleResult = await pool.query(
        `SELECT s.*,
          u1.email as created_by_email,
          u2.email as updated_by_email,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id) as total_shifts,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id AND worker_id IS NULL) as unassigned_shifts
        FROM scheduling.schedules s
        LEFT JOIN users u1 ON s.created_by = u1.id
        LEFT JOIN users u2 ON s.updated_by = u2.id
        WHERE s.id = $1 AND s.organization_id = $2`,
        [scheduleId, organizationId]
      );

      if (scheduleResult.rows.length === 0) {
        return { success: false, error: 'Schedule not found' };
      }

      // Get all shifts for this schedule
      const shiftsResult = await pool.query(
        `SELECT s.*,
          w.first_name || ' ' || w.last_name as worker_name,
          w.worker_number,
          r.role_name,
          r.color as role_color,
          st.station_name
        FROM scheduling.shifts s
        LEFT JOIN scheduling.workers w ON s.worker_id = w.id
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        WHERE s.schedule_id = $1
        ORDER BY s.shift_date, s.start_time`,
        [scheduleId]
      );

      return {
        success: true,
        data: {
          schedule: scheduleResult.rows[0],
          shifts: shiftsResult.rows
        }
      };

    } catch (error) {
      this.logger.error('Error fetching schedule:', error);
      throw error;
    }
  }

  /**
   * List schedules with filters
   */
  async listSchedules(organizationId, filters = {}) {
    try {
      const { status, startDate, endDate, page = 1, limit = 20 } = filters;

      let query = `
        SELECT s.*,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id) as total_shifts,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id AND worker_id IS NULL) as unassigned_shifts
        FROM scheduling.schedules s
        WHERE s.organization_id = $1
      `;
      const params = [organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND s.status = $${paramCount}`;
        params.push(status);
      }

      if (startDate) {
        paramCount++;
        query += ` AND s.end_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND s.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += ` ORDER BY s.start_date DESC`;
      
      const offset = (page - 1) * limit;
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM scheduling.schedules WHERE organization_id = $1`;
      const countParams = [organizationId];
      if (status) countQuery += ` AND status = $2`;
      
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
      this.logger.error('Error listing schedules:', error);
      throw error;
    }
  }

  /**
   * Create a shift within a schedule
   */
  async createShift(shiftData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.createShiftSchema.validate(shiftData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Verify schedule exists and is in draft/published state
      const scheduleCheck = await client.query(
        `SELECT id, status FROM scheduling.schedules 
         WHERE id = $1 AND organization_id = $2`,
        [value.scheduleId, organizationId]
      );

      if (scheduleCheck.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      if (scheduleCheck.rows[0].status === 'finalized' || scheduleCheck.rows[0].status === 'archived') {
        throw new Error('Cannot add shifts to finalized or archived schedule');
      }

      // Verify worker exists if assigned
      if (value.workerId) {
        const workerCheck = await client.query(
          `SELECT id, status FROM scheduling.workers 
           WHERE id = $1 AND organization_id = $2`,
          [value.workerId, organizationId]
        );

        if (workerCheck.rows.length === 0) {
          throw new Error('Worker not found');
        }

        if (workerCheck.rows[0].status !== 'active') {
          throw new Error('Worker is not active');
        }
      }

      // Verify role exists
      const roleCheck = await client.query(
        `SELECT id FROM scheduling.roles WHERE id = $1 AND organization_id = $2`,
        [value.roleId, organizationId]
      );

      if (roleCheck.rows.length === 0) {
        throw new Error('Role not found');
      }

      // Insert shift
      const result = await client.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, shift_date, start_time, end_time,
          worker_id, role_id, station_id, break_duration_minutes, break_paid,
          shift_type, status, notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          organizationId,
          value.scheduleId,
          value.shiftDate,
          value.startTime,
          value.endTime,
          value.workerId || null,
          value.roleId,
          value.stationId || null,
          value.breakDurationMinutes,
          value.breakPaid,
          value.shiftType,
          'scheduled',
          value.notes || null,
          userId,
          userId
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Shift created successfully', {
        shiftId: result.rows[0].id,
        scheduleId: value.scheduleId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a shift
   */
  async updateShift(shiftId, updateData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.updateShiftSchema.validate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Check shift exists
      const shiftCheck = await client.query(
        `SELECT id, status FROM scheduling.shifts WHERE id = $1 AND organization_id = $2`,
        [shiftId, organizationId]
      );

      if (shiftCheck.rows.length === 0) {
        throw new Error('Shift not found');
      }

      // Cannot modify completed shifts
      if (shiftCheck.rows[0].status === 'completed') {
        throw new Error('Cannot modify completed shifts');
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
      params.push(shiftId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.shifts 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);

      await client.query('COMMIT');

      this.logger.info('Shift updated successfully', {
        shiftId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Assign worker to shift
   */
  async assignWorkerToShift(shiftId, workerId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify shift exists and is unassigned
      const shiftCheck = await client.query(
        `SELECT id, worker_id, role_id, shift_date, start_time, end_time 
         FROM scheduling.shifts 
         WHERE id = $1 AND organization_id = $2`,
        [shiftId, organizationId]
      );

      if (shiftCheck.rows.length === 0) {
        throw new Error('Shift not found');
      }

      // Verify worker exists and is active
      const workerCheck = await client.query(
        `SELECT id, status FROM scheduling.workers 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      if (workerCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      if (workerCheck.rows[0].status !== 'active') {
        throw new Error('Worker is not active');
      }

      // Assign worker to shift
      const result = await client.query(
        `UPDATE scheduling.shifts
         SET worker_id = $1, status = 'confirmed', updated_by = $2
         WHERE id = $3 AND organization_id = $4
         RETURNING *`,
        [workerId, userId, shiftId, organizationId]
      );

      await client.query('COMMIT');

      this.logger.info('Worker assigned to shift successfully', {
        shiftId,
        workerId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error assigning worker to shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unassign worker from shift
   */
  async unassignWorkerFromShift(shiftId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE scheduling.shifts
         SET worker_id = NULL, status = 'scheduled', updated_by = $1
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [userId, shiftId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Shift not found');
      }

      await client.query('COMMIT');

      this.logger.info('Worker unassigned from shift successfully', {
        shiftId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error unassigning worker from shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Publish schedule
   */
  async publishSchedule(scheduleId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE scheduling.schedules
         SET status = 'published', 
             published_at = NOW(),
             published_by = $1,
             updated_by = $1
         WHERE id = $2 AND organization_id = $3
         RETURNING *`,
        [userId, scheduleId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      await client.query('COMMIT');

      this.logger.info('Schedule published successfully', {
        scheduleId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error publishing schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel shift
   */
  async cancelShift(shiftId, organizationId, cancellationReason, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE scheduling.shifts
         SET status = 'cancelled',
             cancellation_reason = $1,
             updated_by = $2
         WHERE id = $3 AND organization_id = $4
         RETURNING *`,
        [cancellationReason, userId, shiftId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Shift not found');
      }

      await client.query('COMMIT');

      this.logger.info('Shift cancelled successfully', {
        shiftId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error cancelling shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clock in worker
   */
  async clockIn(shiftId, clockInTime, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE scheduling.shifts
         SET actual_clock_in = $1,
             status = 'in_progress',
             updated_by = $2
         WHERE id = $3 AND organization_id = $4 AND status = 'confirmed'
         RETURNING *`,
        [clockInTime, userId, shiftId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Shift not found or not in confirmed status');
      }

      await client.query('COMMIT');

      this.logger.info('Worker clocked in successfully', {
        shiftId,
        organizationId
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error clocking in:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get shifts by worker and date range
   */
  async getWorkerShifts(workerId, organizationId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT s.*,
          r.role_name,
          r.color as role_color,
          st.station_name,
          sc.schedule_name
        FROM scheduling.shifts s
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        LEFT JOIN scheduling.schedules sc ON s.schedule_id = sc.id
        WHERE s.worker_id = $1 
        AND s.organization_id = $2
        AND s.shift_date BETWEEN $3 AND $4
        ORDER BY s.shift_date, s.start_time`,
        [workerId, organizationId, startDate, endDate]
      );

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('Error fetching worker shifts:', error);
      throw error;
    }
  }
}

export default ScheduleService;
