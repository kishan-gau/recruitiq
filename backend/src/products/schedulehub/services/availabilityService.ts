/**
 * ScheduleHub Availability Service
 * Business logic for worker availability management
 */

import pool from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';
import { 
  mapAvailabilityDbToApi, 
  mapAvailabilitiesDbToApi 
} from '../dto/availabilityDto.js';

class AvailabilityService {
  constructor(poolInstance = null) {
    this.pool = poolInstance || pool;
    this.logger = logger;
  }

  // Validation schemas
  createAvailabilitySchema = Joi.object({
    workerId: Joi.string().uuid().required(),
    availabilityType: Joi.string().valid('recurring', 'one_time', 'unavailable').required(),
    dayOfWeek: Joi.number().integer().min(0).max(6).when('availabilityType', {
      is: 'recurring',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    specificDate: Joi.date().when('availabilityType', {
      is: Joi.valid('one_time', 'unavailable'),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    effectiveFrom: Joi.date(),
    effectiveTo: Joi.date(),
    priority: Joi.string().valid('required', 'preferred', 'available', 'unavailable').default('preferred'),
    reason: Joi.string().allow(null, '')
  });

  // Update validation schema
  updateAvailabilitySchema = Joi.object({
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    effectiveTo: Joi.date().optional(),
    priority: Joi.string().valid('required', 'preferred', 'available', 'unavailable').optional(),
    reason: Joi.string().allow(null, '').optional()
  }).min(1); // At least one field must be provided

  /**
   * Create worker availability
   */
  async createAvailability(availabilityData, organizationId, userId) {
    // Validate input FIRST (fail fast principle)
    const { error, value } = this.createAvailabilitySchema.validate(availabilityData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify worker exists in hris.employee
      const workerCheck = await client.query(
        `SELECT id FROM hris.employee WHERE id = $1 AND organization_id = $2`,
        [value.workerId, organizationId]
      );

      if (workerCheck.rows.length === 0) {
        throw new Error('Worker not found');
      }

      // Insert availability
      const result = await client.query(
        `INSERT INTO scheduling.worker_availability (
          organization_id, employee_id, availability_type,
          day_of_week, specific_date, start_time, end_time,
          effective_from, effective_to, priority, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          organizationId,
          value.workerId,
          value.availabilityType,
          value.dayOfWeek || null,
          value.specificDate || null,
          value.startTime,
          value.endTime,
          value.effectiveFrom || new Date(),
          value.effectiveTo || null,
          value.priority,
          value.reason || null
        ]
      );

      await client.query('COMMIT');

      this.logger.info('Availability created successfully', {
        availabilityId: result.rows[0].id,
        workerId: value.workerId,
        organizationId
      });

      // Transform DB format to API format
      const availability = mapAvailabilityDbToApi(result.rows[0]);
      return { success: true, availability };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating availability:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List all availability records with employee details and pagination
   */
  async listAvailability(organizationId, filters = {}) {
    try {
      const { workerId, availabilityType, startDate, endDate, dayOfWeek, page = 1, limit = 20 } = filters;

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Build base query for counting total records
      let countQuery = `
        SELECT COUNT(*) as total_count
        FROM scheduling.worker_availability wa
        INNER JOIN hris.employee e ON wa.employee_id = e.id
        WHERE wa.organization_id = $1
      `;
      const countParams = [organizationId];
      let paramCount = 1;

      // Add filters to count query
      if (workerId) {
        paramCount++;
        countQuery += ` AND wa.employee_id = $${paramCount}`;
        countParams.push(workerId);
      }

      if (availabilityType) {
        paramCount++;
        countQuery += ` AND wa.availability_type = $${paramCount}`;
        countParams.push(availabilityType);
      }

      if (dayOfWeek !== undefined) {
        paramCount++;
        countQuery += ` AND wa.day_of_week = $${paramCount}`;
        countParams.push(dayOfWeek);
      }

      if (startDate && endDate) {
        paramCount++;
        countQuery += ` AND (
          (wa.availability_type = 'recurring' AND (wa.effective_to IS NULL OR wa.effective_to >= $${paramCount}))
          OR
          (wa.availability_type IN ('one_time', 'unavailable') AND wa.specific_date BETWEEN $${paramCount} AND $${paramCount + 1})
        )`;
        countParams.push(startDate, endDate);
      }

      // Get total count
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total_count);

      // Build main query with same filters
      let query = `
        SELECT 
          wa.*,
          e.first_name,
          e.last_name,
          e.email
        FROM scheduling.worker_availability wa
        INNER JOIN hris.employee e ON wa.employee_id = e.id
        WHERE wa.organization_id = $1
      `;
      const params = [organizationId];
      paramCount = 1;

      // Add filters to main query (same as count query)
      if (workerId) {
        paramCount++;
        query += ` AND wa.employee_id = $${paramCount}`;
        params.push(workerId);
      }

      if (availabilityType) {
        paramCount++;
        query += ` AND wa.availability_type = $${paramCount}`;
        params.push(availabilityType);
      }

      if (dayOfWeek !== undefined) {
        paramCount++;
        query += ` AND wa.day_of_week = $${paramCount}`;
        params.push(dayOfWeek);
      }

      if (startDate && endDate) {
        paramCount++;
        query += ` AND (
          (wa.availability_type = 'recurring' AND (wa.effective_to IS NULL OR wa.effective_to >= $${paramCount}))
          OR
          (wa.availability_type IN ('one_time', 'unavailable') AND wa.specific_date BETWEEN $${paramCount} AND $${paramCount + 1})
        )`;
        params.push(startDate, endDate);
      }

      query += ` ORDER BY 
        e.first_name,
        e.last_name,
        CASE wa.availability_type 
          WHEN 'recurring' THEN wa.day_of_week
          ELSE NULL 
        END,
        wa.specific_date,
        wa.start_time`;

      // Add pagination
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      // Transform DB format to API format and return with pagination
      return {
        success: true,
        availabilities: mapAvailabilitiesDbToApi(result.rows),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      this.logger.error('Error listing availability:', error);
      throw error;
    }
  }

  /**
   * Get worker availability
   */
  async getWorkerAvailability(workerId, organizationId, filters = {}) {
    try {
      const { availabilityType, startDate, endDate, dayOfWeek } = filters;

      let query = `
        SELECT * FROM scheduling.worker_availability
        WHERE employee_id = $1 AND organization_id = $2
      `;
      const params = [workerId, organizationId];
      let paramCount = 2;

      if (availabilityType) {
        paramCount++;
        query += ` AND availability_type = $${paramCount}`;
        params.push(availabilityType);
      }

      if (dayOfWeek !== undefined) {
        paramCount++;
        query += ` AND day_of_week = $${paramCount}`;
        params.push(dayOfWeek);
      }

      if (startDate && endDate) {
        paramCount++;
        query += ` AND (
          (availability_type = 'recurring' AND (effective_to IS NULL OR effective_to >= $${paramCount}))
          OR
          (availability_type IN ('one_time', 'unavailable') AND specific_date BETWEEN $${paramCount} AND $${paramCount + 1})
        )`;
        params.push(startDate, endDate);
      }

      query += ` ORDER BY 
        CASE availability_type 
          WHEN 'recurring' THEN day_of_week
          ELSE NULL 
        END,
        specific_date,
        start_time`;

      const result = await pool.query(query, params);

      // Transform DB format to API format and return consistent format
      return {
        success: true,
        availability: mapAvailabilitiesDbToApi(result.rows)
      };

    } catch (error) {
      this.logger.error('Error fetching worker availability:', error);
      throw error;
    }
  }

  /**
   * Update availability
   */
  async updateAvailability(availabilityId, updateData, organizationId, userId) {
    // Validate input
    const { error, value } = this.updateAvailabilitySchema.validate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details[0].message}`);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check availability exists
      const availabilityCheck = await client.query(
        `SELECT id FROM scheduling.worker_availability WHERE id = $1 AND organization_id = $2`,
        [availabilityId, organizationId]
      );

      if (availabilityCheck.rows.length === 0) {
        throw new Error('Availability record not found');
      }

      // Build update query
      const updates = [];
      const params = [];
      let paramCount = 0;

      const allowedFields = ['startTime', 'endTime', 'effectiveTo', 'priority', 'reason'];
      
      allowedFields.forEach(field => {
        if (value[field] !== undefined) {
          paramCount++;
          const snakeKey = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          updates.push(`${snakeKey} = $${paramCount}`);
          params.push(value[field]);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      paramCount++;
      params.push(availabilityId);
      paramCount++;
      params.push(organizationId);

      const query = `
        UPDATE scheduling.worker_availability
        SET ${updates.join(', ')}
        WHERE id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, params);

      await client.query('COMMIT');

      this.logger.info('Availability updated successfully', {
        availabilityId,
        organizationId
      });

      // Transform DB format to API format
      const availability = mapAvailabilityDbToApi(result.rows[0]);
      return { success: true, availability };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating availability:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete availability
   */
  async deleteAvailability(availabilityId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `DELETE FROM scheduling.worker_availability
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [availabilityId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Availability record not found');
      }

      await client.query('COMMIT');

      this.logger.info('Availability deleted successfully', {
        availabilityId,
        organizationId
      });

      // Transform DB format to API format
      const availability = mapAvailabilityDbToApi(result.rows[0]);
      return { success: true, availability };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting availability:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create default availability (Mon-Fri 9-5)
   */
  async createDefaultAvailability(workerId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create Monday through Friday 9am-5pm availability
      const defaultHours = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // Monday
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // Tuesday
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // Wednesday
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // Thursday
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // Friday
      ];

      const results = [];

      for (const hours of defaultHours) {
        const result = await client.query(
          `INSERT INTO scheduling.worker_availability (
            organization_id, employee_id, availability_type,
            day_of_week, start_time, end_time, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            organizationId,
            workerId,
            'recurring',
            hours.dayOfWeek,
            hours.startTime,
            hours.endTime,
            'available'
          ]
        );
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');

      this.logger.info('Default availability created successfully', {
        workerId,
        organizationId,
        count: results.length
      });

      // Transform DB format to API format
      return {
        success: true,
        data: mapAvailabilitiesDbToApi(results)
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating default availability:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if worker is available for a specific time slot
   */
  async checkWorkerAvailable(workerId, organizationId, date, startTime, endTime) {
    try {
      // Use getUTCDay() to prevent timezone conversion issues
      const dayOfWeek = new Date(date).getUTCDay();

      // Check for specific unavailability on this date
      const unavailableCheck = await pool.query(
        `SELECT id FROM scheduling.worker_availability
         WHERE employee_id = $1 
         AND organization_id = $2
         AND availability_type = 'unavailable'
         AND specific_date = $3
         AND (
           (start_time <= $4 AND end_time > $4) OR
           (start_time < $5 AND end_time >= $5) OR
           (start_time >= $4 AND end_time <= $5)
         )`,
        [workerId, organizationId, date, startTime, endTime]
      );

      if (unavailableCheck.rows.length > 0) {
        return {
          success: true,
          available: false,
          reason: 'Worker marked as unavailable for this time'
        };
      }

      // Check for one-time availability
      const oneTimeCheck = await pool.query(
        `SELECT id, priority FROM scheduling.worker_availability
         WHERE employee_id = $1 
         AND organization_id = $2
         AND availability_type = 'one_time'
         AND specific_date = $3
         AND start_time <= $4 
         AND end_time >= $5`,
        [workerId, organizationId, date, startTime, endTime]
      );

      if (oneTimeCheck.rows.length > 0) {
        return {
          success: true,
          available: true,
          priority: oneTimeCheck.rows[0].priority,
          type: 'one_time'
        };
      }

      // Check for recurring availability
      const recurringCheck = await pool.query(
        `SELECT id, priority FROM scheduling.worker_availability
         WHERE employee_id = $1 
         AND organization_id = $2
         AND availability_type = 'recurring'
         AND day_of_week = $3
         AND start_time <= $4 
         AND end_time >= $5
         AND (effective_to IS NULL OR effective_to >= $6)`,
        [workerId, organizationId, dayOfWeek, startTime, endTime, date]
      );

      if (recurringCheck.rows.length > 0) {
        return {
          success: true,
          available: true,
          priority: recurringCheck.rows[0].priority,
          type: 'recurring'
        };
      }

      // No availability found
      return {
        success: true,
        available: false,
        reason: 'No availability defined for this time'
      };

    } catch (error) {
      this.logger.error('Error checking worker availability:', error);
      throw error;
    }
  }

  /**
   * Get available workers for a specific time slot
   */
  async getAvailableWorkers(organizationId, date, startTime, endTime, roleId = null) {
    try {
      // Use getUTCDay() to prevent timezone conversion issues
      const dayOfWeek = new Date(date).getUTCDay();

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
          MIN(CASE wa.priority
            WHEN 'required' THEN 1
            WHEN 'preferred' THEN 2
            WHEN 'available' THEN 3
            ELSE 4
          END) as priority_order,
          STRING_AGG(DISTINCT wa.availability_type, ', ') as availability_types
        FROM hris.employee e
        INNER JOIN scheduling.worker_availability wa ON e.id = wa.employee_id
        WHERE e.organization_id = $1
        AND e.employment_status = 'active'
        AND (
          (wa.availability_type = 'one_time' 
           AND wa.specific_date = $2 
           AND wa.start_time <= $3 
           AND wa.end_time >= $4)
          OR
          (wa.availability_type = 'recurring' 
           AND wa.day_of_week = $5
           AND wa.start_time <= $3 
           AND wa.end_time >= $4
           AND (wa.effective_to IS NULL OR wa.effective_to >= $2))
        )
        AND NOT EXISTS (
          SELECT 1 FROM scheduling.worker_availability ua
          WHERE ua.employee_id = e.id
          AND ua.availability_type = 'unavailable'
          AND ua.specific_date = $2
          AND ua.start_time < $4
          AND ua.end_time > $3
        )`;

      const params = [organizationId, date, startTime, endTime, dayOfWeek];
      let paramCount = 5;

      // Filter by role if specified
      if (roleId) {
        paramCount++;
        query += ` AND EXISTS (
          SELECT 1 FROM scheduling.worker_roles wr
          WHERE wr.employee_id = e.id 
          AND wr.role_id = $${paramCount}
          AND wr.removed_date IS NULL
        )`;
        params.push(roleId);
      }

      query += `
        GROUP BY e.id, e.employee_number, e.first_name, e.last_name, e.email, e.phone, e.employment_type, e.employment_status`;

      query += ` ORDER BY 
        priority_order,
        e.last_name, e.first_name`;

      const result = await pool.query(query, params);

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      this.logger.error('Error fetching available workers:', error);
      throw error;
    }
  }
}

export default AvailabilityService;
