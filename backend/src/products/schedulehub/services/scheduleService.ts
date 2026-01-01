/**
 * ScheduleHub Schedule Service
 * Business logic for schedule and shift management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { ScheduleData, ShiftData, ScheduleSearchFilters, ShiftConflict } from '../../../types/schedulehub.types.js';
import Joi from 'joi';
import { ConflictError, ValidationError } from '../../../utils/errors.js';
import { dateOnlyRequired } from '../../../validators/dateValidators.js';
import { mapScheduleDbToApi, mapSchedulesDbToApi, mapScheduleApiToDb } from '../dto/scheduleDto.js';
import { mapShiftsDbToApi } from '../dto/shiftDto.js';
import ShiftTemplateService from './shiftTemplateService.js';

class ScheduleService {
  logger: typeof logger;
  shiftTemplateService: ShiftTemplateService;
  sessionShifts: Map<string, Array<{date: string; startTime: string; endTime: string}>>;

  constructor(shiftTemplateService: ShiftTemplateService | null = null) {
    this.logger = logger;
    this.shiftTemplateService = shiftTemplateService || new ShiftTemplateService();
    // Session-aware conflict tracking for overlapping shift prevention
    this.sessionShifts = new Map();
  }

  /**
   * Validates date range according to industry standards
   * @param {string|Date} startDate - Start date in YYYY-MM-DD format or Date object
   * @param {string|Date} endDate - End date in YYYY-MM-DD format or Date object
   * @throws {ValidationError} If dates are invalid
   */
  validateDateRange(startDate, endDate) {
    // Convert Date objects to YYYY-MM-DD strings
    const startStr = startDate instanceof Date 
      ? startDate.toISOString().split('T')[0]
      : startDate;
    const endStr = endDate instanceof Date 
      ? endDate.toISOString().split('T')[0] 
      : endDate;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!datePattern.test(startStr)) {
      throw new ValidationError('Start date must be in YYYY-MM-DD format');
    }
    
    if (!datePattern.test(endStr)) {
      throw new ValidationError('End date must be in YYYY-MM-DD format');
    }
    
    const start = this.parseDateOnly(startStr);
    const end = this.parseDateOnly(endStr);
    
    if (end < start) {
      throw new ValidationError('End date must be on or after start date');
    }
  }

  /**
   * Parses date-only string or Date object using industry standard timezone-safe method
   * Uses explicit Date(year, month-1, day) construction to avoid timezone shifts
   * Validates against business rules (year range, month/day bounds)
   * @param {string|Date} dateInput - Date in YYYY-MM-DD format or Date object
   * @returns {Date} Date object in local timezone
   */
  parseDateOnly(dateInput) {
    if (!dateInput) {
      throw new ValidationError(`Invalid date format: ${dateInput}. Expected YYYY-MM-DD`);
    }

    // Convert Date objects to YYYY-MM-DD strings for consistent processing
    let dateStr;
    if (dateInput instanceof Date) {
      dateStr = dateInput.toISOString().split('T')[0];
    } else if (typeof dateInput === 'string') {
      dateStr = dateInput;
    } else {
      throw new ValidationError(`Invalid date format: ${dateInput}. Expected YYYY-MM-DD`);
    }

    // Strict regex validation for YYYY-MM-DD format
    const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) {
      throw new ValidationError(`Invalid date format: ${dateInput}. Expected YYYY-MM-DD`);
    }

    const [, yearStr, monthStr, dayStr] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Validate ranges (following backend standards for business logic validation)
    if (year < 1900 || year > 2100) {
      throw new ValidationError(`Year ${year} out of valid range (1900-2100)`);
    }
    if (month < 1 || month > 12) {
      throw new ValidationError(`Month ${month} out of valid range (01-12)`);
    }
    if (day < 1 || day > 31) {
      throw new ValidationError(`Day ${day} out of valid range (01-31)`);
    }

    // Create date and validate it's actually valid (catches Feb 30, etc.)
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new ValidationError(`Invalid date: ${dateStr} (e.g., Feb 30 doesn't exist)`);
    }

    return date;
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

  // Validation schema for auto-generation using dedicated templates
  autoGenerateScheduleSchema = Joi.object({
    scheduleName: Joi.string().max(100).required(),
    description: Joi.string().allow(null, ''),
    startDate: dateOnlyRequired,
    endDate: dateOnlyRequired.messages({
      'any.ref': 'End date must be after start date'
    }),
    status: Joi.string().valid('draft', 'published').default('draft'),
    templateIds: Joi.array().items(Joi.string().uuid().required()).min(1).required().messages({
      'array.min': 'At least one template ID is required',
      'any.required': 'Template IDs are required'
    }),
    // Optional mapping of templates to specific days of week (1=Monday, 7=Sunday)
    templateDayMapping: Joi.object().pattern(
      Joi.number().integer().min(1).max(7), // day number (1-7)
      Joi.array().items(Joi.string().uuid()).min(1).max(100) // array of template IDs
    ).optional(),
    // Allow partial time coverage - defaults to false (full coverage required)
    allowPartialTime: Joi.boolean().default(false)
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

  // Validation schema for assigning workers to shifts
  assignWorkerToShiftSchema = Joi.object({
    shiftId: Joi.string().uuid().required().messages({
      'string.guid': 'Shift ID must be a valid UUID'
    }),
    workerId: Joi.string().uuid().required().messages({
      'string.guid': 'Worker ID must be a valid UUID'
    })
  });

  // Validation schema for unassigning workers from shifts
  unassignWorkerFromShiftSchema = Joi.object({
    shiftId: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid UUID format for shift ID'
    })
  });

  // Validation schema for updating/regenerating existing schedules
  updateScheduleGenerationSchema = Joi.object({
    scheduleName: Joi.string().max(100).optional(),
    description: Joi.string().allow(null, '').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    templateIds: Joi.array().items(Joi.string().uuid().required()).min(1).required().messages({
      'array.min': 'At least one template ID is required',
      'any.required': 'Template IDs are required'
    }),
    templateDayMapping: Joi.object().pattern(
      Joi.number().integer().min(1).max(7), // day number (1-7)
      Joi.array().items(Joi.string().uuid()).min(1).max(100) // array of template IDs
    ).optional(),
    allowPartialTime: Joi.boolean().default(false)
  }).custom((value, helpers) => {
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      
      if (end <= start) {
        return helpers.error('date.range', { message: 'End date must be after start date' });
      }
    }
    
    return value;
  });

  /**
   * Helper method to handle database constraint errors for overlapping shifts
   * @param {Error} error - The database error
   * @param {string} organizationId - Organization ID for logging
   * @param {string} userId - User ID for logging
   * @throws {Error} Formatted error for overlapping shifts or original error
   */
  handleConstraintError(error, organizationId, userId) {
    // Handle database constraint violation for overlapping shifts
    if (error.code === '23514' && error.message.includes('already has a shift')) {
      this.logger.warn('Overlapping shift prevented by database constraint', {
        error: error.message,
        organizationId,
        userId
      });
      
      // Extract meaningful information from the error message
      const employeeMatch = error.message.match(/Employee ([a-f0-9-]+)/);
      const timeMatch = error.message.match(/from (\d{2}:\d{2}:\d{2}) to (\d{2}:\d{2}:\d{2}) on (\d{4}-\d{2}-\d{2})/);
      
      if (employeeMatch && timeMatch) {
        const [, employeeId] = employeeMatch;
        const [, startTime, endTime, date] = timeMatch;
        throw new Error(`Cannot create overlapping shift: Employee ${employeeId} already has a shift from ${startTime} to ${endTime} on ${date}`);
      } else {
        throw new Error(`Cannot create overlapping shift: ${error.message.split('Employee ')[1] || 'Schedule conflict detected'}`);
      }
    }
    
    // Re-throw original error if not a constraint violation
    throw error;
  }

  /**
   * Create a new schedule
   */
  async createSchedule(scheduleData, organizationId, userId) {
    // Validate input BEFORE starting transaction
    const { error, value } = this.createScheduleSchema.validate(scheduleData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

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

    } catch (_error) {
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
      const scheduleResult = await query(
        `SELECT s.*,
          u1.email as created_by_email,
          u2.email as updated_by_email,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id) as total_shifts,
          (SELECT COUNT(*) FROM scheduling.shifts WHERE schedule_id = s.id AND employee_id IS NULL) as unassigned_shifts
        FROM scheduling.schedules s
        LEFT JOIN hris.user_account u1 ON s.created_by = u1.id
        LEFT JOIN hris.user_account u2 ON s.updated_by = u2.id
        WHERE s.id = $1 AND s.organization_id = $2`,
        [scheduleId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'schedules' }
      );

      if (scheduleResult.rows.length === 0) {
        return { success: false, error: 'Schedule not found' };
      }

      // Get all shifts for this schedule
      const shiftsResult = await query(
        `SELECT s.*,
          w.first_name || ' ' || w.last_name as worker_name,
          w.employee_number as worker_number,
          r.role_name,
          r.color as role_color,
          st.station_name,
          tmpl.template_name,
          tmpl.start_time as template_start_time,
          tmpl.end_time as template_end_time
        FROM scheduling.shifts s
        LEFT JOIN hris.employee w ON s.employee_id = w.id
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        LEFT JOIN scheduling.shift_templates tmpl ON s.template_id = tmpl.id
        WHERE s.schedule_id = $1
        ORDER BY s.shift_date, s.start_time`,
        [scheduleId],
        organizationId,
        { operation: 'SELECT', table: 'shifts' }
      );

      return {
        success: true,
        data: {
          schedule: mapScheduleDbToApi(scheduleResult.rows[0]),
          shifts: mapShiftsDbToApi(shiftsResult.rows)
        }
      };

    } catch (_error) {
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

      let sqlQuery = `
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
        sqlQuery += ` AND s.status = $${paramCount}`;
        params.push(status);
      }

      if (startDate) {
        paramCount++;
        sqlQuery += ` AND s.end_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        sqlQuery += ` AND s.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      sqlQuery += ` ORDER BY s.start_date DESC`;
      
      const offset = (page - 1) * limit;
      paramCount++;
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await query(sqlQuery, params, organizationId, { operation: 'SELECT', table: 'schedules' });

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM scheduling.schedules WHERE organization_id = $1`;
      const countParams = [organizationId];
      if (status) countQuery += ` AND status = $2`;
      
      const countResult = await query(countQuery, countParams, organizationId, { operation: 'SELECT', table: 'schedules' });
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

    } catch (_error) {
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
        data: mapShiftsDbToApi([result.rows[0]])[0]
      };

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating shift:', error);
      this.handleConstraintError(error, organizationId, userId);
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
        throw new ValidationError(`Validation error: ${error.details[0].message}`);
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

    } catch (_error) {
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
    // Validate input parameters
    const { error, value } = this.assignWorkerToShiftSchema.validate({ shiftId, workerId });
    if (error) {
      throw new ValidationError(`Validation error: ${error.details[0].message}`);
    }

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

    } catch (_error) {
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
    // Validate input parameters
    const { error } = this.unassignWorkerFromShiftSchema.validate({ shiftId });
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

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

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error unassigning worker from shift:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate schedule for publication - check for conflicts with other published schedules
   * Industry standard: Two-phase validation (lenient generation + strict publication)
   */
  async validateScheduleForPublication(scheduleId, organizationId) {
    try {
      // Get all shifts in the schedule to be published
      const scheduleShiftsResult = await query(`
        SELECT 
          s.id as shift_id,
          s.employee_id,
          s.date,
          s.start_time,
          s.end_time,
          s.position,
          e.first_name,
          e.last_name,
          e.employee_number
        FROM scheduling.shifts s
        JOIN hris.employee e ON s.employee_id = e.id
        WHERE s.schedule_id = $1 
          AND s.organization_id = $2 
          AND s.deleted_at IS NULL
          AND s.status != 'cancelled'
        ORDER BY s.date, s.start_time
      `, [scheduleId, organizationId], organizationId, { operation: 'SELECT', table: 'shifts' });

      const scheduleShifts = scheduleShiftsResult.rows;
      
      if (scheduleShifts.length === 0) {
        // No shifts to validate
        return { 
          isValid: true, 
          conflicts: [],
          message: 'No shifts found in schedule to validate'
        };
      }

      // Check for conflicts with published schedules
      const conflicts = [];

      for (const shift of scheduleShifts) {
        // Find overlapping shifts in OTHER published schedules
        const conflictQuery = `
          SELECT 
            s.id as conflicting_shift_id,
            s.schedule_id as conflicting_schedule_id,
            s.date,
            s.start_time,
            s.end_time,
            s.position as conflicting_position,
            sched.schedule_name as conflicting_schedule_name,
            sched.description as conflicting_schedule_description
          FROM scheduling.shifts s
          JOIN scheduling.schedules sched ON s.schedule_id = sched.id
          WHERE s.employee_id = $1
            AND s.organization_id = $2
            AND s.schedule_id != $3
            AND sched.status = 'published'
            AND s.deleted_at IS NULL
            AND s.status != 'cancelled'
            AND s.date = $4
            AND (
              -- Overlapping time conditions
              (s.start_time < $6 AND s.end_time > $5) OR
              (s.start_time >= $5 AND s.start_time < $6)
            )
        `;

        const conflictResult = await query(conflictQuery, [
          shift.employee_id,
          organizationId,
          scheduleId,
          shift.date,
          shift.start_time, // $5
          shift.end_time    // $6
        ], organizationId, { operation: 'SELECT', table: 'shifts' });

        if (conflictResult.rows.length > 0) {
          // Add conflict details for this shift
          conflicts.push({
            shiftId: shift.shift_id,
            employeeId: shift.employee_id,
            employeeName: `${shift.first_name} ${shift.last_name}`,
            employeeNumber: shift.employee_number,
            date: shift.date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            position: shift.position,
            conflictingShifts: conflictResult.rows.map(conflict => ({
              shiftId: conflict.conflicting_shift_id,
              scheduleId: conflict.conflicting_schedule_id,
              scheduleName: conflict.conflicting_schedule_name,
              scheduleDescription: conflict.conflicting_schedule_description,
              date: conflict.date,
              startTime: conflict.start_time,
              endTime: conflict.end_time,
              position: conflict.conflicting_position,
              overlapType: this.getOverlapType(
                shift.start_time, shift.end_time,
                conflict.start_time, conflict.end_time
              )
            }))
          });
        }
      }

      // Return validation result
      return {
        isValid: conflicts.length === 0,
        conflicts,
        totalShifts: scheduleShifts.length,
        conflictingShifts: conflicts.length,
        message: conflicts.length === 0 
          ? 'No conflicts detected. Schedule can be published safely.'
          : `Found ${conflicts.length} shift conflicts with published schedules that must be resolved before publication.`
      };

    } catch (_error) {
      this.logger.error('Error validating schedule for publication', {
        scheduleId,
        organizationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Helper method to determine the type of time overlap
   */
  getOverlapType(start1, end1, start2, end2) {
    if (start1 <= start2 && end1 >= end2) {
      return 'complete_overlap'; // First shift completely contains second
    } else if (start2 <= start1 && end2 >= end1) {
      return 'contained_by'; // First shift is completely contained by second
    } else if (start1 < end2 && end1 > start2) {
      if (start1 < start2) {
        return 'partial_end'; // First shift overlaps end of second
      } else {
        return 'partial_start'; // First shift overlaps start of second
      }
    }
    return 'adjacent'; // Edge case
  }

  /**
   * Publish schedule - with industry standard conflict validation
   */
  async publishSchedule(scheduleId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Phase 1: Validate schedule for publication (strict validation)
      this.logger.info('Validating schedule for publication', { scheduleId, organizationId });
      
      const validation = await this.validateScheduleForPublication(scheduleId, organizationId);
      
      if (!validation.isValid) {
        // Found conflicts - create detailed ConflictError
        const conflictDetails = {
          scheduleId,
          validationSummary: validation,
          conflictCount: validation.conflictingShifts,
          totalShifts: validation.totalShifts,
          conflictingSummary: validation.conflicts.map(conflict => ({
            employee: {
              id: conflict.employeeId,
              name: conflict.employeeName,
              number: conflict.employeeNumber
            },
            shift: {
              date: conflict.date,
              startTime: conflict.startTime,
              endTime: conflict.endTime,
              position: conflict.position
            },
            conflicts: conflict.conflictingShifts.map(cs => ({
              scheduleId: cs.scheduleId,
              scheduleName: cs.scheduleName,
              overlapType: cs.overlapType,
              conflictingTime: {
                startTime: cs.startTime,
                endTime: cs.endTime,
                position: cs.position
              }
            }))
          })),
          resolutionOptions: [
            {
              action: 'modify_shifts',
              description: 'Modify conflicting shifts to different times',
              available: true
            },
            {
              action: 'reassign_workers',
              description: 'Assign different workers to conflicting shifts',
              available: true
            },
            {
              action: 'unpublish_conflicts',
              description: 'Unpublish conflicting schedules (if permitted)',
              available: true,
              warning: 'This will affect already published schedules'
            }
          ]
        };

        throw new ConflictError(
          `Cannot publish schedule: ${validation.conflictingShifts} shift conflicts detected with published schedules. Workers cannot be double-booked.`,
          conflictDetails
        );
      }

      this.logger.info('Schedule validation passed, proceeding with publication', { 
        scheduleId, 
        totalShifts: validation.totalShifts 
      });

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

    } catch (_error) {
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

    } catch (_error) {
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

    } catch (_error) {
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
  async getWorkerShifts(workerId, startDate, endDate, organizationId) {
    try {
      const result = await query(
        `SELECT s.*,
          r.role_name,
          r.color as role_color,
          st.station_name,
          sc.schedule_name,
          tmpl.template_name,
          tmpl.start_time as template_start_time,
          tmpl.end_time as template_end_time
        FROM scheduling.shifts s
        LEFT JOIN scheduling.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations st ON s.station_id = st.id
        LEFT JOIN scheduling.schedules sc ON s.schedule_id = sc.id
        LEFT JOIN scheduling.shift_templates tmpl ON s.template_id = tmpl.id
        WHERE s.employee_id = $1 
        AND s.organization_id = $4
        AND s.shift_date BETWEEN $2 AND $3
        ORDER BY s.shift_date, s.start_time`,
        [workerId, startDate, endDate, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'shifts' }
      );

      return result.rows;

    } catch (_error) {
      this.logger.error('Error fetching worker shifts:', error);
      throw error;
    }
  }

  /**
   * Auto-generate schedule based on shift templates and worker availability
   * @param {Object} scheduleData - Schedule data including templates
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID creating the schedule
   * @param {Object} options - Generation options
   * @param {boolean} options.allowPartialTime - Allow workers with partial time coverage
   */
  async autoGenerateSchedule(scheduleData, organizationId, userId, options = {}) {
    // Validate input BEFORE starting transaction (using auto-generation schema)
    const { error, value } = this.autoGenerateScheduleSchema.validate(scheduleData);
    if (error) {
      throw new ValidationError(`Validation error: ${error.details[0].message}`);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

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
        warnings: [],
        templateProcessing: {
          totalRequested: value.templateIds.length,
          validTemplates: 0,
          missingTemplates: 0,
          processedTemplates: []
        }
      };

      // Fetch dedicated shift templates with comprehensive error tracking
      const templates = [];
      const missingTemplates = [];
      
      
      for (const templateId of value.templateIds) {
        const template = await this.shiftTemplateService.getById(templateId, organizationId);
        
        if (!template) {
          missingTemplates.push(templateId);
          generationSummary.warnings.push(`Template ${templateId} not found or inactive`);
          continue;
        }
        templates.push(template);
      }
      

      // Check if we have any valid templates
      if (templates.length === 0) {
        const errorMessage = missingTemplates.length > 0 
          ? `No valid templates found. Missing or inactive templates: ${missingTemplates.join(', ')}`
          : 'No valid templates found for schedule generation';
        throw new Error(errorMessage);
      }

      // Update template processing summary
      generationSummary.templateProcessing.validTemplates = templates.length;
      generationSummary.templateProcessing.missingTemplates = missingTemplates.length;
      generationSummary.templateProcessing.processedTemplates = templates.map(t => ({
        id: t.id,
        name: t.templateName,
        status: 'found'
      }));

      // Add missing templates to processed templates list
      missingTemplates.forEach(templateId => {
        generationSummary.templateProcessing.processedTemplates.push({
          id: templateId,
          name: 'Unknown',
          status: 'missing'
        });
      });

      // Warn user if some templates are missing
      if (missingTemplates.length > 0) {
        generationSummary.warnings.push(
          `Warning: ${missingTemplates.length} template(s) could not be found and were skipped: ${missingTemplates.join(', ')}`
        );
      }

      // Initialize session-aware conflict tracking
      this.sessionShifts.clear();
      


      // Validate templateDayMapping against available templates
      if (value.templateDayMapping && Object.keys(value.templateDayMapping).length > 0) {
        const availableTemplateIds = templates.map(t => t.id);
        const invalidMappings = [];
        
        // Check for templates referenced in mapping that aren't available
        for (const [dayStr, templateIds] of Object.entries(value.templateDayMapping)) {
          for (const templateId of templateIds) {
            if (!availableTemplateIds.includes(templateId)) {
              invalidMappings.push({ day: dayStr, templateId });
            }
          }
        }
        
        if (invalidMappings.length > 0) {
          generationSummary.warnings.push(
            `Some templates referenced in day mapping are not available: ${invalidMappings.map(m => `Template ${m.templateId} on Day ${m.day}`).join(', ')}`
          );
        }
      }

      // Process templates grouped by day from templateDayMapping
      // templateDayMapping is structured as: { dayNumber: [templateIds] }
      // We need to iterate through each day and process only the templates assigned to that day
      
      if (value.templateDayMapping && Object.keys(value.templateDayMapping).length > 0) {
        // FIXED: Iterate by day number, not by template ID
        for (const dayNumberStr of Object.keys(value.templateDayMapping)) {
          const dayNumber = parseInt(dayNumberStr, 10);
          const templatesForDay = value.templateDayMapping[dayNumber] || [];
          

          
          // For each template assigned to this day, generate shifts
          for (let templateIndex = 0; templateIndex < templatesForDay.length; templateIndex++) {
            const templateId = templatesForDay[templateIndex];
            // Find the template object by ID
            const template = templates.find(t => t.id === templateId);
            
            if (!template) {
              logger.warn(`Template ${templateId} referenced in templateDayMapping for day ${dayNumber} but not found in templates array`);
              
              // Add specific warning for this day
              generationSummary.warnings.push(
                `Day ${dayNumber}: Template ${templateId} was skipped (not found or inactive)`
              );
              
              continue;
            }
            
            // Generate shifts only for this specific day
            const templateShifts = await this.generateShiftsFromDedicatedTemplate(
              client, 
              scheduleId, 
              template, 
              value.startDate, 
              value.endDate, 
              [dayNumber], // FIXED: Only this specific day, not all days
              organizationId, 
              userId,
              options
            );
            
            generationSummary.totalShiftsRequested += templateShifts.requested;
            generationSummary.shiftsGenerated += templateShifts.generated;
            generationSummary.partialCoverage += templateShifts.partial;
            generationSummary.noCoverage += templateShifts.uncovered;
            generationSummary.warnings.push(...templateShifts.warnings);
          }
        }
      } else {
        // FALLBACK: If no templateDayMapping specified, generate all templates for all days (original behavior)
        logger.info('No templateDayMapping specified, generating all templates for all days');
        
        for (const template of templates) {
          const applicableDays = [1, 2, 3, 4, 5, 6, 7]; // All days
          
          
          const templateShifts = await this.generateShiftsFromDedicatedTemplate(
            client, 
            scheduleId, 
            template, 
            value.startDate, 
            value.endDate, 
            applicableDays,
            organizationId, 
            userId,
            options
          );
          
          generationSummary.totalShiftsRequested += templateShifts.requested;
          generationSummary.shiftsGenerated += templateShifts.generated;
          generationSummary.partialCoverage += templateShifts.partial;
          generationSummary.noCoverage += templateShifts.uncovered;
          generationSummary.warnings.push(...templateShifts.warnings);
        }
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

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error auto-generating schedule:', error);
      
      // Clear session tracking in error cases
      this.sessionShifts.clear();
      
      // Re-throw error instead of handling it to ensure tests can catch rejections
      if (error.message.includes('No valid templates found')) {
        throw error;
      }
      
      this.handleConstraintError(error, organizationId, userId);
    } finally {
      client.release();
    }
  }

  /**
   * Generate shifts from a single template across the date range
   * Now supports templates with multiple stations via junction table
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
          // Use getUTCDay() to prevent timezone conversion issues (Monday as day 1, not 0)
          if (current.getUTCDay() === template.dayOfWeek) {
            dates.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }    // Get template stations (supports both legacy single stationId and new stations array)
    const templateStations = this.getTemplateStations(template);
    
    // Handle templates without stations by creating shifts with null station_id
    const stationIds = templateStations.length > 0 ? templateStations : [null];
    
    if (stationIds.length === 1 && stationIds[0] === null) {
      // Note for templates without station assignments
      summary.warnings.push(
        `Template ${template.id} has no stations assigned - creating shifts without station assignment`
      );
    }

    // For each station that the template covers (or null if no stations)
    for (const stationId of stationIds) {
      // For each date, try to assign workers
      for (const shiftDate of dates) {
        summary.requested += template.workersNeeded;
        
        // Find available workers for this role, station, date, and time
        const availableWorkers = await this.findAvailableWorkers(
          client,
          template.roleId,
          stationId,
          shiftDate,
          template.startTime,
          template.endTime,
          organizationId
        );

        if (availableWorkers.length === 0) {
          // No workers available - log warning
          summary.uncovered++;
          summary.warnings.push(
            `No workers available for ${template.roleId} at station ${stationId} on ${shiftDate.toDateString()} ${template.startTime}-${template.endTime}`
          );
          continue;
        }

        // Assign workers (take first available up to workersNeeded)
        const workersToAssign = availableWorkers.slice(0, template.workersNeeded);
        
        for (const worker of workersToAssign) {
          // Create shift with assigned worker and specific station
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
              stationId, // Use specific station ID from template's stations
              0, // default break duration
              true, // default break paid
              'regular', // default shift type
              'scheduled',
              `Auto-generated shift from template ${template.templateName || template.id}${stationId ? ` (Station: ${stationId})` : ''}`,
              userId,
              userId
            ]
          );
          
          // Track shift in session for cross-template conflict detection
          this.addShiftToSession(worker.id, shiftDate, template.startTime, template.endTime);
          
          summary.generated++;
        }

        // Check if we have partial coverage for this station
        if (workersToAssign.length < template.workersNeeded) {
          const shortage = template.workersNeeded - workersToAssign.length;
          summary.partial++;
          summary.warnings.push(
            `Partial coverage on ${shiftDate.toDateString()}${stationId ? ` at station ${stationId}` : ''}: ${workersToAssign.length}/${template.workersNeeded} workers assigned`
          );
        }
      }
    }

    return summary;
  }

  /**
   * Helper method to extract station IDs from template
   * Supports both legacy single stationId and new stations array from junction table
   * @param {Object} template - Shift template object
   * @returns {Array<string>} Array of station IDs
   */
  getTemplateStations(template) {
    // New format: template has stations array from junction table
    if (template.stations && Array.isArray(template.stations)) {
      return template.stations.map(station => {
        // Handle both object format {id: 'uuid', name: 'Station Name'} and direct UUID strings
        return typeof station === 'object' ? station.id : station;
      });
    }
    
    // Legacy format: template has single stationId
    if (template.stationId) {
      return [template.stationId];
    }
    
    // No stations assigned
    return [];
  }

  /**
   * Generate shifts from multiple templates (for regeneration)
   * @param {Object} client - Database client
   * @param {string} scheduleId - Schedule ID
   * @param {Date} startDate - Start date for generation
   * @param {Date} endDate - End date for generation
   * @param {Array<string>} templateIds - Array of template IDs
   * @param {Object} templateDayMapping - Day mapping for templates
   * @param {boolean} allowPartialTime - Allow partial time coverage
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Generation summary
   */
  async generateShiftsFromTemplates(client, scheduleId, startDate, endDate, templateIds, templateDayMapping = {}, allowPartialTime = false, organizationId, userId) {
    const generationSummary = {
      totalShiftsRequested: 0,
      shiftsGenerated: 0,
      partialCoverage: 0,
      noCoverage: 0,
      warnings: []
    };

    // Fetch dedicated shift templates
    const shiftTemplateService = new ShiftTemplateService();
    const templates = [];
    
    for (const templateId of templateIds) {
      const template = await shiftTemplateService.getById(templateId, organizationId);
      if (!template) {
        generationSummary.warnings.push(`Template ${templateId} not found or inactive`);
        continue;
      }
      templates.push(template);
    }

    if (templates.length === 0) {
      throw new Error('No valid templates found for schedule generation');
    }


    // Initialize session-aware conflict tracking
    this.sessionShifts.clear();
    
    // Process each dedicated template
    for (const template of templates) {
      
      // Determine which days this template should apply to
      // templateDayMapping structure: { dayNumber: [templateId1, templateId2, ...] }
      const applicableDays = [];
      if (templateDayMapping && Object.keys(templateDayMapping).length > 0) {
        
        // Find days where this template is assigned
        for (const [dayNumber, templateIds] of Object.entries(templateDayMapping)) {
          if (templateIds.includes(template.id)) {
            applicableDays.push(parseInt(dayNumber));
          } else {
          }
        }
      } else {
        // Fallback: All days if no mapping specified
        applicableDays.push(...[1, 2, 3, 4, 5, 6, 7]);
      }

      
      // Skip if no applicable days found
      if (applicableDays.length === 0) {
        continue;
      }

      
      const templateShifts = await this.generateShiftsFromDedicatedTemplate(
        client, 
        scheduleId, 
        template, 
        startDate, 
        endDate, 
        applicableDays,
        organizationId, 
        userId,
        { allowPartialTime }
      );
      
      generationSummary.totalShiftsRequested += templateShifts.requested;
      generationSummary.shiftsGenerated += templateShifts.generated;
      generationSummary.partialCoverage += templateShifts.partial;
      generationSummary.noCoverage += templateShifts.uncovered;
      generationSummary.warnings.push(...templateShifts.warnings);
    }

    return generationSummary;
  }

  /**
   * Add shift to session tracking for conflict detection
   * @private
   */
  addShiftToSession(employeeId, shiftDate, startTime, endTime) {
    if (!this.sessionShifts.has(employeeId)) {
      this.sessionShifts.set(employeeId, []);
    }
    
    this.sessionShifts.get(employeeId).push({
      date: shiftDate.toISOString().split('T')[0],
      startTime,
      endTime
    });
  }
  
  /**
   * Check if employee has conflicting shifts in current session
   * @private
   */
  hasSessionConflict(employeeId, shiftDate, startTime, endTime) {
    const employeeShifts = this.sessionShifts.get(employeeId);
    if (!employeeShifts) return false;
    
    const dateStr = shiftDate.toISOString().split('T')[0];
    
    return employeeShifts.some(shift => {
      if (shift.date !== dateStr) return false;
      
      // Check for time overlap: (start1 < end2) && (start2 < end1)
      return (startTime < shift.endTime) && (shift.startTime < endTime);
    });
  }

  /**
   * Add shift to session tracking for conflict detection
   * @private
   */
  addShiftToSession(employeeId, shiftDate, startTime, endTime) {
    if (!this.sessionShifts.has(employeeId)) {
      this.sessionShifts.set(employeeId, []);
    }
    
    this.sessionShifts.get(employeeId).push({
      date: shiftDate.toISOString().split('T')[0],
      startTime,
      endTime
    });
  }
  
  /**
   * Find workers available for a specific role, date, and time
   */
  async findAvailableWorkers(client, roleId, stationId, shiftDate, startTime, endTime, organizationId, allowPartialTime = false, skipSessionConflictCheck = false) {
    // 🐛 FIX: Use getUTCDay() to prevent timezone conversion issues
    // When date strings like '2025-01-06' are parsed, they create UTC midnight
    // but getDay() uses local timezone which can shift the day
    const dayOfWeek = shiftDate.getUTCDay();
    const dateString = shiftDate.toISOString().split('T')[0];
    
    // 🐛 FIX: Ensure time parameters have seconds format for PostgreSQL time comparison
    const formattedStartTime = startTime.includes(':') && startTime.split(':').length === 2 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.includes(':') && endTime.split(':').length === 2 ? `${endTime}:00` : endTime;
    
    // Find workers who:
    // 1. Have the required role
    // 2. Are available (recurring or specific date availability)
    // 3. Don't have conflicting shifts
    // 4. Are schedulable
    // 5. If allowPartialTime=true, include workers with partial time coverage
    
    // Determine time overlap condition based on allowPartialTime flag
    const timeCondition = allowPartialTime
      ? 'wa.start_time < $5 AND wa.end_time > $4'  // Any overlap
      : 'wa.start_time <= $4 AND wa.end_time >= $5'; // Full coverage
    
    const selectFields = allowPartialTime
      ? `e.id, e.first_name, e.last_name, e.employee_number, wa.start_time, wa.end_time,
         -- Calculate coverage percentage for prioritization
         CASE 
           WHEN wa.start_time <= $4 AND wa.end_time >= $5 THEN 100.0
           ELSE 
             EXTRACT(EPOCH FROM (
               LEAST(wa.end_time, $5::time) - GREATEST(wa.start_time, $4::time)
             )) / EXTRACT(EPOCH FROM ($5::time - $4::time)) * 100.0
         END as coverage_percentage`
      : 'e.id, e.first_name, e.last_name, e.employee_number';
    
    const orderBy = allowPartialTime
      ? 'coverage_percentage DESC, e.last_name, e.first_name'
      : 'e.last_name, e.first_name';
    
    const query = `
      SELECT DISTINCT ${selectFields}
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id
      LEFT JOIN scheduling.worker_availability wa ON e.id = wa.employee_id AND wa.organization_id = e.organization_id
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND (wsc.is_schedulable IS NULL OR wsc.is_schedulable = true)
        AND (wsc.scheduling_status IS NULL OR wsc.scheduling_status = 'active')
        AND e.employment_status = 'active'
        -- Check availability with dynamic time condition
        AND (
          -- Recurring availability for this day of week
          (wa.availability_type = 'recurring' 
           AND wa.day_of_week = $3
           AND ${timeCondition})
          OR
          -- Specific date availability
          (wa.availability_type = 'one_time'
           AND wa.specific_date = $6
           AND ${timeCondition})
        )
        AND (wa.effective_from IS NULL OR wa.effective_from <= $6)
        AND (wa.effective_to IS NULL OR wa.effective_to >= $6)
        AND wa.priority != 'unavailable'
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
      ORDER BY ${orderBy}
      LIMIT 50
    `;

    // Step 1: Check basic employee filter
    const step1Query = `
      SELECT COUNT(*) as count, array_agg(e.first_name || ' ' || e.last_name) as names
      FROM hris.employee e
      WHERE e.organization_id = $1 
        AND e.employment_status = 'active'
    `;
    const step1Result = await client.query(step1Query, [organizationId]);

    // Step 2: Check role assignment
    const step2Query = `
      SELECT COUNT(*) as count, array_agg(e.first_name || ' ' || e.last_name) as names
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND e.employment_status = 'active'
    `;
    const step2Result = await client.query(step2Query, [organizationId, roleId]);

    // Step 3: Check scheduling configuration
    const step3Query = `
      SELECT COUNT(*) as count, array_agg(e.first_name || ' ' || e.last_name) as names
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND (wsc.is_schedulable IS NULL OR wsc.is_schedulable = true)
        AND (wsc.scheduling_status IS NULL OR wsc.scheduling_status = 'active')
        AND e.employment_status = 'active'
    `;
    const step3Result = await client.query(step3Query, [organizationId, roleId]);

    // Step 4: Check availability records exist
    const step4Query = `
      SELECT COUNT(*) as count, array_agg(e.first_name || ' ' || e.last_name) as names
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id
      LEFT JOIN scheduling.worker_availability wa ON e.id = wa.employee_id AND wa.organization_id = e.organization_id
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND (wsc.is_schedulable IS NULL OR wsc.is_schedulable = true)
        AND (wsc.scheduling_status IS NULL OR wsc.scheduling_status = 'active')
        AND e.employment_status = 'active'
        AND wa.id IS NOT NULL
    `;
    const step4Result = await client.query(step4Query, [organizationId, roleId]);

    // Step 5: Check time and date conditions
    const step5Query = `
      SELECT COUNT(*) as count, array_agg(e.first_name || ' ' || e.last_name || ' - ' || wa.availability_type || ' - ' || COALESCE(wa.day_of_week::text, 'null') || ' - ' || COALESCE(wa.specific_date::text, 'null') || ' - ' || wa.start_time || '-' || wa.end_time) as details
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id
      LEFT JOIN scheduling.worker_availability wa ON e.id = wa.employee_id AND wa.organization_id = e.organization_id
      WHERE e.organization_id = $1 
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
        AND (wsc.is_schedulable IS NULL OR wsc.is_schedulable = true)
        AND (wsc.scheduling_status IS NULL OR wsc.scheduling_status = 'active')
        AND e.employment_status = 'active'
        AND (
          (wa.availability_type = 'recurring' 
           AND wa.day_of_week = $3
           AND ${timeCondition})
          OR
          (wa.availability_type = 'one_time'
           AND wa.specific_date = $6
           AND ${timeCondition})
        )
        AND (wa.effective_from IS NULL OR wa.effective_from <= $6)
        AND (wa.effective_to IS NULL OR wa.effective_to >= $6)
        AND wa.priority != 'unavailable'
    `;
    const step5Result = await client.query(step5Query, [organizationId, roleId, dayOfWeek, formattedStartTime, formattedEndTime, shiftDate.toISOString().split('T')[0]]);

    // DEBUG: Check Vivaan Gauri's actual availability data
    const vivaanDebugQuery = `
      SELECT e.first_name, e.last_name, wa.*
      FROM hris.employee e
      JOIN scheduling.worker_roles wr ON e.id = wr.employee_id 
      LEFT JOIN scheduling.worker_availability wa ON e.id = wa.employee_id AND wa.organization_id = e.organization_id
      WHERE e.organization_id = $1 
        AND e.first_name = 'Vivaan'
        AND e.last_name = 'Gauri'
        AND wr.role_id = $2
        AND wr.removed_date IS NULL
    `;
    const vivaanDebugResult = await client.query(vivaanDebugQuery, [organizationId, roleId]);

    // DEBUG: Check time condition evaluation
    if (vivaanDebugResult.rows.length > 0) {
      const availability = vivaanDebugResult.rows[0];
    }

    const result = await client.query(query, [
      organizationId,
      roleId,
      dayOfWeek,
      formattedStartTime, // Use formatted time with seconds
      formattedEndTime,   // Use formatted time with seconds
      shiftDate.toISOString().split('T')[0] // Date only in YYYY-MM-DD format
    ]);

    // Filter out workers with session conflicts (cross-template overlap prevention)
    // Skip this filtering if we're debugging to see total potential workers
    const availableWorkers = skipSessionConflictCheck ? result.rows : result.rows.filter(worker => {
      const hasConflict = this.hasSessionConflict(worker.id, shiftDate, startTime, endTime);
      if (hasConflict) {
        const workerSessionShifts = this.sessionShifts.get(worker.id) || [];
      }
      return !hasConflict;
    });
    
    if (!skipSessionConflictCheck && result.rows.length !== availableWorkers.length) {
      this.logger.info('Filtered workers due to session conflicts', {
        originalCount: result.rows.length,
        filteredCount: availableWorkers.length,
        date: shiftDate.toISOString().split('T')[0],
        timeSlot: `${startTime}-${endTime}`
      });
    } else if (skipSessionConflictCheck) {
      this.logger.info('Session conflict filtering skipped for debugging', {
        totalWorkers: result.rows.length,
        date: shiftDate.toISOString().split('T')[0],
        timeSlot: `${startTime}-${endTime}`
      });
    }

    return availableWorkers;
  }

  /**
   * Generate shifts from dedicated template
   * @param {Object} options - Generation options including allowPartialTime
   */
  async generateShiftsFromDedicatedTemplate(client, scheduleId, template, startDate, endDate, applicableDays, organizationId, userId, options = {}) {
    const summary = {
      requested: 0,
      generated: 0,
      partial: 0,
      uncovered: 0,
      warnings: []
    };

    // Validate date inputs according to industry standards
    this.validateDateRange(startDate, endDate);

    // Parse dates as YYYY-MM-DD strings to avoid timezone interpretation (industry standard)
    const start = this.parseDateOnly(startDate);
    const end = this.parseDateOnly(endDate);
    
    logger.info('Generating shifts from dedicated template', {
      scheduleId,
      templateName: template.templateName,
      dateRange: { startDate, endDate },
      applicableDays,
      organizationId
    });
    
    // Find all dates that match the applicable days using timezone-safe iteration
    const dates = [];
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endTime = end.getTime();
    
    while (current.getTime() <= endTime) {
      // Convert JavaScript day (0=Sunday) to our system (1=Monday) - Use UTC to prevent timezone issues
      const jsDay = current.getUTCDay();
      const systemDay = jsDay === 0 ? 7 : jsDay;
      
      if (applicableDays.includes(systemDay)) {
        // Create new date instance to avoid reference issues
        dates.push(new Date(current.getFullYear(), current.getMonth(), current.getDate()));
      }
      
      // Use timezone-safe date increment
      current.setDate(current.getDate() + 1);
    }
    
    logger.debug('Date iteration completed', {
      scheduleId,
      totalDatesFound: dates.length,
      dateRange: `${startDate} to ${endDate}`
    });

    // Get station IDs from template (supports both legacy stationId and new stations array)
    const stationIds = this.getTemplateStations(template);
    
    // If no stations assigned, warn and continue with null station
    if (stationIds.length === 0) {
      summary.warnings.push(
        `Template ${template.templateName} has no stations assigned. Shifts will be created without station assignment.`
      );
      stationIds.push(null); // Create shifts without station
    }

    // For each station assigned to the template
    for (const stationId of stationIds) {
      // Get role requirements from template (supports both roleRequirements and roles properties)
      const roleRequirements = template.roleRequirements || template.roles || [];
      
      // For each role requirement in the template
      for (const roleReq of roleRequirements) {
        for (const shiftDate of dates) {
          summary.requested += roleReq.quantity;
          
          // Find available workers for this role, date, time, and station
          const allowPartialTime = options.allowPartialTime || false;
          const availableWorkers = await this.findAvailableWorkers(
            client,
            roleReq.roleId,
            stationId, // Use specific station ID from template's stations
            shiftDate,
            template.startTime,
            template.endTime,
            organizationId,
            allowPartialTime
          );
          

          if (availableWorkers.length === 0) {
            // No workers available - provide detailed debugging info
            summary.uncovered += roleReq.quantity;
            const stationInfo = stationId ? ` at station ${stationId}` : ' (no station)';
            
            // Check if this is due to session conflicts (multiple templates competing)
            const allPotentialWorkers = await this.findAvailableWorkers(
              client,
              roleReq.roleId,
              stationId,
              shiftDate,
              template.startTime,
              template.endTime,
              organizationId,
              allowPartialTime, // Use the same allowPartialTime setting as the original call
              true // Skip session conflict check to see total available
            );
            
            // Enhanced exclusion analysis - provides specific reasons and actions
            // Run this ALWAYS when no workers available, regardless of potential worker count
            try {
              const { enhanceExclusionWarnings } = await import('./enhanceWorkerExclusionAnalysis');
              
              const exclusionAnalysisParams = {
                roleId: roleReq.roleId,
                stationId,
                shiftDate,
                dayOfWeek: shiftDate.getUTCDay() === 0 ? 7 : shiftDate.getUTCDay(), // Use UTC day, convert Sunday=0 to Sunday=7, keep 1-6 as is
                startTime: template.startTime,
                endTime: template.endTime,
                organizationId,
                templateName: template.templateName
              };

              const enhancedWarnings = await enhanceExclusionWarnings(exclusionAnalysisParams, query);
              
              // Add enhanced warnings with specific actions
              if (enhancedWarnings && enhancedWarnings.length > 0) {
                enhancedWarnings.forEach(warning => {
                  // Convert enhanced warning object to string for backward compatibility
                  let detailedMessage = warning.message;
                  if (warning.workers && warning.workers.length > 0) {
                    detailedMessage += ` (Affected workers: ${warning.workers.map(w => w.name).join(', ')})`;
                  }
                  if (warning.action) {
                    detailedMessage += ` → ACTION: ${warning.action}`;
                  }
                  
                  summary.warnings.push(detailedMessage);
                });
                
              } else {
                // Fallback to basic warning if analysis returns empty
                let warningMessage = `No workers available for role ${roleReq.roleId}${stationInfo} on ${shiftDate.toDateString()} ${template.startTime}-${template.endTime} (template: ${template.templateName})`;
                
                if (allPotentialWorkers.length > 0) {
                  // Workers exist but have session conflicts - this indicates multiple templates competing
                  warningMessage += ` - ${allPotentialWorkers.length} workers found but have conflicting shifts from other templates in this generation session`;
                }
                
                summary.warnings.push(warningMessage);
              }
            } catch (_analysisError) {
              
              // Fallback to basic warning
              let warningMessage = `No workers available for role ${roleReq.roleId}${stationInfo} on ${shiftDate.toDateString()} ${template.startTime}-${template.endTime} (template: ${template.templateName})`;
              
              if (allPotentialWorkers.length > 0) {
                warningMessage += ` - ${allPotentialWorkers.length} workers found but have conflicting shifts from other templates in this generation session`;
              }
              
              summary.warnings.push(warningMessage);
            }
            
            continue;
          }

          // Assign workers (take first available up to quantity needed)
          const workersToAssign = availableWorkers.slice(0, roleReq.quantity);
          
          for (const worker of workersToAssign) {
            // Calculate actual shift times for partial coverage
            let actualStartTime = template.startTime;
            let actualEndTime = template.endTime;
            let shiftNotes = `Auto-generated from template: ${template.templateName}`;
            if (stationId) {
              shiftNotes += ` (Station: ${stationId})`;
            }
            
            if (allowPartialTime && worker.coverage_percentage < 100) {
              // Adjust shift times to worker's available time overlap
              const workerStart = worker.start_time;
              const workerEnd = worker.end_time;
              
              // Calculate overlap period
              actualStartTime = workerStart > template.startTime ? workerStart : template.startTime;
              actualEndTime = workerEnd < template.endTime ? workerEnd : template.endTime;
              
              shiftNotes += ` (Partial coverage: ${Math.round(worker.coverage_percentage)}% - ${actualStartTime}-${actualEndTime})`;
            }
            
            // Create shift with assigned worker using actual times
            await client.query(
              `INSERT INTO scheduling.shifts (
                organization_id, schedule_id, shift_date, start_time, end_time,
                employee_id, role_id, station_id, break_duration_minutes, break_paid,
                shift_type, status, notes, template_id, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
              [
                organizationId,
                scheduleId,
                shiftDate,
                actualStartTime,
                actualEndTime,
                worker.id,
                roleReq.roleId,
                stationId, // Use specific station ID from template's stations array
                template.breakDuration || 0,
                template.breakPaid !== false, // Default to true unless explicitly false
                allowPartialTime && worker.coverage_percentage < 100 ? 'partial' : 'regular',
                'scheduled',
                shiftNotes,
                template.id,
                userId,
                userId
              ]
            );
            
            // Track shift in session for cross-template conflict detection
            this.addShiftToSession(worker.id, shiftDate, actualStartTime, actualEndTime);
            
            summary.generated++;
          }

          // Check if we have partial coverage
          if (workersToAssign.length < roleReq.quantity) {
            const shortage = roleReq.quantity - workersToAssign.length;
            summary.partial++;
            const stationInfo = stationId ? ` at station ${stationId}` : ' (no station)';
            summary.warnings.push(
              `Partial coverage on ${shiftDate.toDateString()} for ${template.templateName}${stationInfo}: ${workersToAssign.length}/${roleReq.quantity} workers assigned for role ${roleReq.roleId}`
            );
          }
        }
      }
    }

    return summary;
  }

  /**
   * Get all shifts with optional filtering
   */
  async getAllShifts(organizationId, filters = {}) {
    try {
      const { date, stationId, status } = filters;
      
      let sqlQuery = `
        SELECT 
          s.id,
          s.schedule_id,
          s.employee_id,
          s.role_id,
          s.station_id,
          s.shift_date,
          s.start_time,
          s.end_time,
          s.status,
          s.template_id,
          st.template_name,
          st.start_time as template_start,
          st.end_time as template_end,
          e.first_name || ' ' || e.last_name as employee_name,
          r.role_name,
          station.name as station_name
        FROM scheduling.shifts s
        LEFT JOIN scheduling.shift_templates st ON s.template_id = st.id
        LEFT JOIN hris.employee e ON s.employee_id = e.id
        LEFT JOIN nexus.roles r ON s.role_id = r.id
        LEFT JOIN scheduling.stations station ON s.station_id = station.id
        WHERE s.organization_id = $1
          AND s.deleted_at IS NULL
      `;
      
      const params = [organizationId];
      let paramCount = 1;
      
      if (date) {
        paramCount++;
        sqlQuery += ` AND s.shift_date = $${paramCount}`;
        params.push(date);
      }
      
      if (stationId) {
        paramCount++;
        sqlQuery += ` AND s.station_id = $${paramCount}`;
        params.push(stationId);
      }
      
      if (status) {
        paramCount++;
        sqlQuery += ` AND s.status = $${paramCount}`;
        params.push(status);
      }
      
      sqlQuery += ` ORDER BY s.shift_date DESC, s.start_time`;
      
      const result = await query(sqlQuery, params, organizationId, { operation: 'SELECT', table: 'shifts' });
      
      return {
        success: true,
        shifts: result.rows
      };
    } catch (_error) {
      this.logger.error('Error fetching shifts:', error);
      throw new Error('Failed to fetch shifts');
    }
  }

  /**
   * Get station coverage statistics for timeline visualization
   */
  async getStationCoverageStats(organizationId, date) {
    try {
      // Get station coverage for the specified date
      const sqlQuery = `
        WITH station_requirements AS (
          -- Get required staffing from shift templates
          SELECT 
            station.id as station_id,
            station.name as station_name,
            COALESCE(SUM(str.required_count), 0) as total_required
          FROM scheduling.stations station
          LEFT JOIN scheduling.shifts s ON station.id = s.station_id 
            AND s.shift_date = $2
            AND s.organization_id = $1
          LEFT JOIN scheduling.shift_template_roles str ON s.template_id = str.template_id
          WHERE station.organization_id = $1
            AND station.is_active = true
          GROUP BY station.id, station.name
        ),
        station_coverage AS (
          -- Get actual staffing for the date
          SELECT 
            s.station_id,
            COUNT(*) FILTER (WHERE s.status = 'confirmed') as confirmed_staff,
            COUNT(*) FILTER (WHERE s.status = 'pending') as pending_staff,
            COUNT(*) as total_scheduled
          FROM scheduling.shifts s
          WHERE s.organization_id = $1
            AND s.shift_date = $2
            AND s.deleted_at IS NULL
          GROUP BY s.station_id
        )
        SELECT 
          sr.station_id as "stationId",
          sr.station_name as "stationName",
          sr.total_required as "requiredStaffing",
          COALESCE(sc.confirmed_staff, 0) as "currentStaffing",
          COALESCE(sc.pending_staff, 0) as "pendingStaffing",
          COALESCE(sc.total_scheduled, 0) as "totalScheduled",
          CASE 
            WHEN COALESCE(sc.confirmed_staff, 0) >= sr.total_required THEN 'adequate'
            WHEN COALESCE(sc.confirmed_staff, 0) + COALESCE(sc.pending_staff, 0) >= sr.total_required THEN 'pending'
            ELSE 'understaffed'
          END as status,
          -- Get shift details for timeline
          json_agg(
            json_build_object(
              'shiftId', shifts.id,
              'employeeId', shifts.employee_id,
              'employeeName', e.first_name || ' ' || e.last_name,
              'roleName', r.role_name,
              'startTime', shifts.start_time,
              'endTime', shifts.end_time,
              'status', shifts.status
            )
          ) FILTER (WHERE shifts.id IS NOT NULL) as shifts
        FROM station_requirements sr
        LEFT JOIN station_coverage sc ON sr.station_id = sc.station_id
        LEFT JOIN scheduling.shifts shifts ON sr.station_id = shifts.station_id 
          AND shifts.shift_date = $2
          AND shifts.organization_id = $1
          AND shifts.deleted_at IS NULL
        LEFT JOIN hris.employee e ON shifts.employee_id = e.id
        LEFT JOIN nexus.roles r ON shifts.role_id = r.id
        GROUP BY 
          sr.station_id, sr.station_name, sr.total_required,
          sc.confirmed_staff, sc.pending_staff, sc.total_scheduled
        ORDER BY sr.station_name
      `;
      
      const result = await query(sqlQuery, [organizationId, date], organizationId, { operation: 'SELECT', table: 'stations' });
      
      return {
        success: true,
        coverageStats: result.rows,
        date: date
      };
    } catch (_error) {
      this.logger.error('Error fetching station coverage stats:', error);
      throw new Error('Failed to fetch station coverage statistics');
    }
  }

  /**
   * Update and regenerate an existing schedule with new template configuration
   */
  async updateScheduleGeneration(scheduleId, updateData, organizationId, userId) {
    this.logger.info('Updating and regenerating schedule', {
      scheduleId,
      templateIds: updateData.templateIds,
      templateDayMapping: JSON.stringify(updateData.templateDayMapping, null, 2),
      organizationId,
      userId
    });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.updateScheduleGenerationSchema.validate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }
      
      // Check if schedule exists and is editable
      const scheduleCheck = await client.query(
        `SELECT id, schedule_name, description, start_date, end_date, status, version 
         FROM scheduling.schedules 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [scheduleId, organizationId]
      );

      if (scheduleCheck.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const currentSchedule = scheduleCheck.rows[0];
      
      // Check if schedule is in editable state
      if (currentSchedule.status === 'published') {
        throw new Error('Cannot regenerate a published schedule. Create a new version instead.');
      }

      // Validate template IDs exist
      const templateIds = value.templateIds;
      const templateCheck = await client.query(
        `SELECT id, template_name FROM scheduling.shift_templates 
         WHERE id = ANY($1) AND organization_id = $2 AND is_active = true`,
        [templateIds, organizationId]
      );

      if (templateCheck.rows.length !== templateIds.length) {
        throw new Error('One or more template IDs are invalid or inactive');
      }

      // Preserve existing values if not provided in update
      const scheduleData = {
        scheduleName: value.scheduleName || currentSchedule.schedule_name,
        description: value.description !== undefined ? value.description : currentSchedule.description,
        startDate: value.startDate 
          ? (value.startDate instanceof Date 
              ? value.startDate.toISOString().split('T')[0] 
              : value.startDate) 
          : currentSchedule.start_date,
        endDate: value.endDate 
          ? (value.endDate instanceof Date 
              ? value.endDate.toISOString().split('T')[0] 
              : value.endDate) 
          : currentSchedule.end_date
      };

      // Update schedule basic information
      const updateResult = await client.query(
        `UPDATE scheduling.schedules 
         SET schedule_name = $1, description = $2, start_date = $3, end_date = $4, 
             updated_by = $5, updated_at = CURRENT_TIMESTAMP, version = version + 1
         WHERE id = $6 AND organization_id = $7
         RETURNING *`,
        [
          scheduleData.scheduleName,
          scheduleData.description,
          scheduleData.startDate,
          scheduleData.endDate,
          userId,
          scheduleId,
          organizationId
        ]
      );

      const updatedSchedule = updateResult.rows[0];

      // Delete all existing shifts for this schedule (CASCADE will handle this cleanly)
      const deleteResult = await client.query(
        `DELETE FROM scheduling.shifts 
         WHERE schedule_id = $1 AND organization_id = $2`,
        [scheduleId, organizationId]
      );

      this.logger.info(`Deleted ${deleteResult.rowCount} existing shifts for schedule regeneration`, {
        scheduleId,
        organizationId
      });

      // Generate new shifts using the same logic as auto-generate
      // Convert string dates back to Date objects for generateShiftsFromTemplates
      const startDate = new Date(scheduleData.startDate + 'T00:00:00.000Z');
      const endDate = new Date(scheduleData.endDate + 'T23:59:59.999Z');
      
      const generationSummary = await this.generateShiftsFromTemplates(
        client,
        scheduleId,
        startDate,
        endDate,
        templateIds,
        value.templateDayMapping || {},
        value.allowPartialTime || false,
        organizationId,
        userId
      );

      await client.query('COMMIT');

      this.logger.info('Schedule regenerated successfully', {
        scheduleId,
        organizationId,
        newVersion: updatedSchedule.version,
        summary: generationSummary
      });

      return {
        success: true,
        schedule: updatedSchedule,
        generationSummary
      };

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('Error regenerating schedule:', error);
      
      // Handle specific constraint errors
      if (error.message.includes('overlapping shift')) {
        const sessionId = this.getSessionId(organizationId, userId);
        const conflicts = this.getConflicts(sessionId);
        return {
          success: false,
          error: 'Shift conflicts detected during regeneration',
          conflicts: conflicts,
          code: 'SHIFT_CONFLICT'
        };
      }
      
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ScheduleService;
