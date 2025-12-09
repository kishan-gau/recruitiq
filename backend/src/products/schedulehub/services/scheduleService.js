/**
 * ScheduleHub Schedule Service
 * Business logic for schedule and shift management
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';
import { dateOnlyRequired } from '../../../validators/dateValidators.js';
import { mapScheduleDbToApi, mapSchedulesDbToApi, mapScheduleApiToDb } from '../dto/scheduleDto.js';
import { mapShiftsDbToApi } from '../dto/shiftDto.js';

class ScheduleService {
  constructor() {
    this.logger = logger;
  }

  // Validation schemas
  createScheduleSchema = Joi.object({
    scheduleName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    startDate: dateOnlyRequired,
    endDate: dateOnlyRequired.messages({
      'any.ref': 'End date must be after start date'
    }),
    status: Joi.string().valid('draft', 'published').default('draft'),
    shifts: Joi.array().items(Joi.object({
      dayOfWeek: Joi.number().integer().min(0).max(6).required(),
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      roleId: Joi.string().uuid().required(),
      stationId: Joi.string().uuid().allow(null),
      workersNeeded: Joi.number().integer().min(1).required()
    })).default([])
  }).custom((value, helpers) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    
    if (end <= start) {
      return helpers.error('date.range', { message: 'End date must be after start date' });
    }
    
    return value;
  });

  // Validation schema for auto-generation
  autoGenerateScheduleSchema = Joi.object({
    scheduleName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    startDate: dateOnlyRequired,
    endDate: dateOnlyRequired.messages({
      'any.ref': 'End date must be after start date'
    }),
    status: Joi.string().valid('draft', 'published').default('draft'),
    shiftTemplates: Joi.array().items(Joi.object({
      dayOfWeek: Joi.number().integer().min(0).max(6).required(),
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      roleId: Joi.string().uuid().required(),
      stationId: Joi.string().uuid().allow(null),
      workersNeeded: Joi.number().integer().min(1).required()
    })).min(1).required().messages({
      'array.min': 'At least one shift template is required',
      'any.required': 'Shift templates are required'
    })
  }).custom((value, helpers) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    
    if (end <= start) {
      return helpers.error('date.range', { message: 'End date must be after start date' });
    }
    
    return value;
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
          value.status,
          userId,
          userId
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Schedule created successfully', {
        scheduleId: result.rows[0].id,
        organizationId
      });

      return mapScheduleDbToApi(result.rows[0]);

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
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id AND employee_id IS NULL) as unassigned_shifts
        FROM scheduling.schedules s
        LEFT JOIN hris.user_account u1 ON s.created_by = u1.id
        LEFT JOIN hris.user_account u2 ON s.updated_by = u2.id
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
          w.employee_number as worker_number,
          r.role_name,
          r.color as role_color,
          st.station_name
        FROM scheduling.shifts s
        LEFT JOIN hris.employee w ON s.employee_id = w.id
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        WHERE s.schedule_id = $1
        ORDER BY s.shift_date, s.start_time`,
        [scheduleId]
      );

      return {
        success: true,
        data: {
          schedule: mapScheduleDbToApi(scheduleResult.rows[0]),
          shifts: mapShiftsDbToApi(shiftsResult.rows)
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
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id AND employee_id IS NULL) as unassigned_shifts
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
        data: mapSchedulesDbToApi(result.rows),
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
          `SELECT id, employment_status FROM hris.employee 
           WHERE id = $1 AND organization_id = $2`,
          [value.workerId, organizationId]
        );

        if (workerCheck.rows.length === 0) {
          throw new Error('Worker not found');
        }

        if (workerCheck.rows[0].employment_status !== 'active') {
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
          employee_id, role_id, station_id, break_duration_minutes, break_paid,
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
        `SELECT id, employee_id, role_id, shift_date, start_time, end_time 
         FROM scheduling.shifts 
         WHERE id = $1 AND organization_id = $2`,
        [shiftId, organizationId]
      );

      if (shiftCheck.rows.length === 0) {
        throw new Error('Shift not found');
      }

      // Verify worker exists and is active
      const workerCheck = await client.query(
        `SELECT id, employment_status FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [workerId, organizationId]
      );

      if (workerCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      if (workerCheck.rows[0].employment_status !== 'active') {
        throw new Error('Worker is not active');
      }

      // Assign worker to shift
      const result = await client.query(
        `UPDATE scheduling.shifts
         SET employee_id = $1, status = 'confirmed', updated_by = $2
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
         SET employee_id = NULL, status = 'scheduled', updated_by = $1
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
        WHERE s.employee_id = $1 
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

  /**
   * Auto-generate schedule based on shift templates and worker availability
   */
  async autoGenerateSchedule(scheduleData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input (using auto-generation schema)
      const { error, value } = this.autoGenerateScheduleSchema.validate(scheduleData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      // Create the schedule first
      const scheduleResult = await client.query(
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
          value.status,
          userId,
          userId
        ]
      );

      const schedule = scheduleResult.rows[0];
      const scheduleId = schedule.id;

      // Generate shifts from templates
      const generationSummary = {
        totalShiftsRequested: 0,
        shiftsGenerated: 0,
        partialCoverage: 0,
        noCoverage: 0,
        warnings: []
      };

      // Process each shift template
      for (const template of value.shiftTemplates) {
        const templateShifts = await this.generateShiftsFromTemplate(
          client, 
          scheduleId, 
          template, 
          value.startDate, 
          value.endDate, 
          organizationId, 
          userId
        );
        
        generationSummary.totalShiftsRequested += templateShifts.requested;
        generationSummary.shiftsGenerated += templateShifts.generated;
        generationSummary.partialCoverage += templateShifts.partial;
        generationSummary.noCoverage += templateShifts.uncovered;
        generationSummary.warnings.push(...templateShifts.warnings);
      }

      await client.query('COMMIT');

      this.logger.info('Schedule auto-generated successfully', {
        scheduleId: schedule.id,
        organizationId,
        summary: generationSummary
      });

      return {
        schedule: mapScheduleDbToApi(schedule),
        generationSummary
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error auto-generating schedule:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate shifts from a single template across the date range
   */
  async generateShiftsFromTemplate(client, scheduleId, template, startDate, endDate, organizationId, userId) {
    const summary = {
      requested: 0,
      generated: 0,
      partial: 0,
      uncovered: 0,
      warnings: []
    };

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Find all dates that match the day of week
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      if (current.getDay() === template.dayOfWeek) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    // For each date, try to assign workers
    for (const shiftDate of dates) {
      summary.requested += template.workersNeeded;
      
      // Find available workers for this role, date, and time
      const availableWorkers = await this.findAvailableWorkers(
        client,
        template.roleId,
        template.stationId,
        shiftDate,
        template.startTime,
        template.endTime,
        organizationId
      );

      if (availableWorkers.length === 0) {
        // No workers available - log warning
        summary.uncovered++;
        summary.warnings.push(
          `No workers available for ${template.roleId} on ${shiftDate.toDateString()} ${template.startTime}-${template.endTime}`
        );
        continue;
      }

      // Assign workers (take first available up to workersNeeded)
      const workersToAssign = availableWorkers.slice(0, template.workersNeeded);
      
      for (const worker of workersToAssign) {
        // Create shift with assigned worker
        await client.query(
          `INSERT INTO scheduling.shifts (
            organization_id, schedule_id, shift_date, start_time, end_time,
            employee_id, role_id, station_id, break_duration_minutes, break_paid,
            shift_type, status, notes, created_by, updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            organizationId,
            scheduleId,
            shiftDate,
            template.startTime,
            template.endTime,
            worker.id,
            template.roleId,
            template.stationId || null,
            0, // default break duration
            true, // default break paid
            'regular', // default shift type
            'scheduled',
            'Auto-generated shift',
            userId,
            userId
          ]
        );
        
        summary.generated++;
      }

      // Check if we have partial coverage
      if (workersToAssign.length < template.workersNeeded) {
        const shortage = template.workersNeeded - workersToAssign.length;
        summary.partial++;
        summary.warnings.push(
          `Partial coverage on ${shiftDate.toDateString()}: ${workersToAssign.length}/${template.workersNeeded} workers assigned`
        );
      }
    }

    return summary;
  }

  /**
   * Find workers available for a specific role, date, and time
   */
  async findAvailableWorkers(client, roleId, stationId, shiftDate, startTime, endTime, organizationId) {
    const dayOfWeek = shiftDate.getDay();
    
    // Find workers who:
    // 1. Have the required role
    // 2. Are available (recurring or specific date availability)
    // 3. Don't have conflicting shifts
    // 4. Are schedulable
    
    const query = `
      SELECT DISTINCT e.id, e.first_name, e.last_name, e.employee_number
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND (wsc.is_schedulable IS NULL OR wsc.is_schedulable = true)
        AND (wsc.scheduling_status IS NULL OR wsc.scheduling_status = 'active')
        AND e.employment_status = 'active'
        -- Check availability
        AND EXISTS (
          SELECT 1 FROM scheduling.worker_availability wa
          WHERE wa.employee_id = e.id
            AND wa.organization_id = e.organization_id
            AND (
              -- Recurring availability for this day of week
              (wa.availability_type = 'recurring' 
               AND wa.day_of_week = $3
               AND wa.start_time <= $4
               AND wa.end_time >= $5)
              OR
              -- Specific date availability
              (wa.availability_type = 'one_time'
               AND wa.specific_date = $6
               AND wa.start_time <= $4
               AND wa.end_time >= $5)
            )
            AND (wa.effective_from IS NULL OR wa.effective_from <= $6)
            AND (wa.effective_to IS NULL OR wa.effective_to >= $6)
            AND wa.priority != 'unavailable'
        )
        -- Check no conflicting shifts
        AND NOT EXISTS (
          SELECT 1 FROM scheduling.shifts s
          WHERE s.employee_id = e.id
            AND s.shift_date = $6
            AND s.status != 'cancelled'
            AND (
              (s.start_time <= $4 AND s.end_time > $4) OR
              (s.start_time < $5 AND s.end_time >= $5) OR
              (s.start_time >= $4 AND s.end_time <= $5)
            )
        )
      ORDER BY e.last_name, e.first_name
      LIMIT 50
    `;

    const result = await client.query(query, [
      organizationId,
      roleId,
      dayOfWeek,
      startTime,
      endTime,
      shiftDate.toISOString().split('T')[0] // Date only in YYYY-MM-DD format
    ]);

    return result.rows;
  }
}

export default ScheduleService;
