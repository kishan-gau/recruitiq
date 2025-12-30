/**
 * ScheduleHub Time Off Service
 * Business logic for time off request management
 */

import pool from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';
import Joi from 'joi';
import { dateOnlyRequired } from '../../../validators/dateValidators.ts';

class TimeOffService {
  constructor() {
    this.logger = logger;
  }

  createRequestSchema = Joi.object({
    workerId: Joi.string().uuid().required(),
    requestType: Joi.string().valid('vacation', 'sick', 'personal', 'unpaid', 'other').required(),
    startDate: dateOnlyRequired,
    endDate: dateOnlyRequired,
    isFullDay: Joi.boolean().default(true),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).when('isFullDay', { is: false, then: Joi.required() }),
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).when('isFullDay', { is: false, then: Joi.required() }),
    totalDays: Joi.number().positive().required(),
    reason: Joi.string().allow(null, ''),
    notes: Joi.string().allow(null, '')
  }).custom((value, helpers) => {
    // Validate endDate >= startDate
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    
    if (end < start) {
      return helpers.error('dateRange.order');
    }
    
    return value;
  }).messages({
    'dateRange.order': 'End date must be on or after start date'
  });

  async createRequest(requestData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const { error, value } = this.createRequestSchema.validate(requestData);
      if (error) throw new Error(`Validation error: ${error.details[0].message}`);

      const result = await client.query(
        `INSERT INTO scheduling.time_off_requests (
          organization_id, employee_id, request_type, start_date, end_date,
          is_full_day, start_time, end_time, total_days, reason, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [organizationId, value.workerId, value.requestType, value.startDate, value.endDate,
         value.isFullDay, value.startTime || null, value.endTime || null, 
         value.totalDays, value.reason || null, value.notes || null, 'pending']
      );

      await client.query('COMMIT');
      this.logger.info('Time off request created', { requestId: result.rows[0].id, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating time off request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async reviewRequest(requestId, organizationId, approved, reviewerId, denialReason = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const status = approved ? 'approved' : 'denied';
      
      const result = await client.query(
        `UPDATE scheduling.time_off_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), denial_reason = $3
         WHERE id = $4 AND organization_id = $5 AND status = 'pending'
         RETURNING *`,
        [status, reviewerId, denialReason, requestId, organizationId]
      );

      if (result.rows.length === 0) throw new Error('Request not found or already reviewed');

      // If approved, create unavailability entries
      if (approved) {
        const request = result.rows[0];
        await client.query(
          `INSERT INTO scheduling.worker_availability (
            organization_id, employee_id, availability_type, specific_date,
            start_time, end_time, priority, reason
          )
          SELECT $1, $2, 'unavailable', generate_series($3::date, $4::date, '1 day'::interval)::date,
                 $5, $6, 'unavailable', $7`,
          [organizationId, request.employee_id, request.start_date, request.end_date,
           request.start_time || '00:00', request.end_time || '23:59',
           `Approved time off: ${request.request_type}`]
        );
      }

      await client.query('COMMIT');
      this.logger.info('Time off request reviewed', { requestId, approved, organizationId });
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error reviewing time off request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getWorkerRequests(workerId, organizationId, filters = {}) {
    try {
      const { status, startDate, endDate } = filters;
      let query = `SELECT * FROM scheduling.time_off_requests WHERE employee_id = $1 AND organization_id = $2`;
      const params = [workerId, organizationId];
      let paramCount = 2;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }
      if (startDate) {
        paramCount++;
        query += ` AND end_date >= $${paramCount}`;
        params.push(startDate);
      }
      if (endDate) {
        paramCount++;
        query += ` AND start_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += ` ORDER BY start_date DESC`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error fetching worker requests:', error);
      throw error;
    }
  }

  async listRequests(organizationId, status = null, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT r.*, e.first_name || ' ' || e.last_name as worker_name
        FROM scheduling.time_off_requests r
        JOIN hris.employee e ON r.employee_id = e.id
        WHERE r.organization_id = $1
      `;
      const params = [organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND r.status = $${paramCount}`;
        params.push(status);
      }
      if (startDate) {
        paramCount++;
        query += ` AND r.end_date >= $${paramCount}`;
        params.push(startDate);
      }
      if (endDate) {
        paramCount++;
        query += ` AND r.start_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += ` ORDER BY r.created_at DESC`;
      const result = await pool.query(query, params);
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error listing requests:', error);
      throw error;
    }
  }

  async getRequestById(requestId, organizationId) {
    try {
      const result = await pool.query(
        `SELECT r.*, e.first_name || ' ' || e.last_name as worker_name
         FROM scheduling.time_off_requests r
         JOIN hris.employee e ON r.employee_id = e.id
         WHERE r.id = $1 AND r.organization_id = $2`,
        [requestId, organizationId]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Request not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      this.logger.error('Error fetching request by ID:', error);
      throw error;
    }
  }

  async getPendingRequests(organizationId) {
    try {
      const result = await pool.query(
        `SELECT r.*, e.first_name || ' ' || e.last_name as worker_name
         FROM scheduling.time_off_requests r
         JOIN hris.employee e ON r.employee_id = e.id
         WHERE r.organization_id = $1 AND r.status = 'pending'
         ORDER BY r.created_at`,
        [organizationId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      this.logger.error('Error fetching pending requests:', error);
      throw error;
    }
  }

  async cancelRequest(requestId, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE scheduling.time_off_requests
         SET status = 'cancelled'
         WHERE id = $1 AND organization_id = $2 AND status IN ('pending', 'approved')
         RETURNING *`,
        [requestId, organizationId]
      );

      if (result.rows.length === 0) throw new Error('Request not found or cannot be cancelled');
      await client.query('COMMIT');
      return { success: true, data: result.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error cancelling request:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default TimeOffService;
