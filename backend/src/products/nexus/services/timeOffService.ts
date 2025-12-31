/**
 * TimeOffService
 * Business logic layer for time-off request management
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import type { TimeOffRequestData, TimeOffBalance, TimeOffSearchFilters } from '../../../types/nexus.types.js';

class TimeOffService {
  logger: typeof logger;
  
  
  
  logger: any;

constructor() {
    this.logger = logger;
  }

  /**
   * Create a new time-off request
   */
  async createRequest(requestData, organizationId, userId) {
    try {
      this.logger.info('Creating time-off request', { 
        organizationId, 
        userId,
        employeeId: requestData.employee_id 
      });

      const sql = `
        INSERT INTO hris.time_off_request (
          organization_id, employee_id, time_off_type,
          start_date, end_date, total_days,
          reason, status,
          created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        requestData.employee_id,
        requestData.time_off_type || 'vacation',
        requestData.start_date,
        requestData.end_date,
        requestData.total_days || 1,
        requestData.reason || null,
        'pending',
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.time_off_request'
      });

      this.logger.info('Time-off request created successfully', { 
        requestId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error creating time-off request', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Review a time-off request (approve/reject)
   */
  async reviewRequest(id, status, reviewerId, organizationId, comments = null) {
    try {
      this.logger.info('Reviewing time-off request', { 
        id,
        status,
        reviewerId,
        organizationId 
      });

      const sql = `
        UPDATE hris.time_off_request 
        SET status = $1,
            approver_id = $2,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = $3,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND organization_id = $5
        RETURNING *
      `;

      const result = await query(sql, [status, reviewerId, comments, id, organizationId], organizationId, {
        operation: 'update',
        table: 'hris.time_off_request'
      });

      if (result.rows.length === 0) {
        throw new Error(`Time-off request with ID ${id} not found`);
      }

      this.logger.info('Time-off request reviewed successfully', { 
        id,
        status,
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error reviewing time-off request', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get all time-off requests for a worker
   */
  async getWorkerRequests(employeeId, organizationId, filters = {}) {
    try {
      this.logger.debug('Getting worker time-off requests', { 
        employeeId,
        organizationId 
      });

      let sql = `
        SELECT tr.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               r.first_name || ' ' || r.last_name as approver_name
        FROM hris.time_off_request tr
        LEFT JOIN hris.employee e ON tr.employee_id = e.id
        LEFT JOIN hris.employee r ON tr.approver_id = r.id
        WHERE tr.employee_id = $1 
          AND tr.organization_id = $2
          AND tr.deleted_at IS NULL
      `;

      const params = [employeeId, organizationId];
      let paramIndex = 3;

      if (filters.status) {
        sql += ` AND tr.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.startDate) {
        sql += ` AND tr.start_date >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        sql += ` AND tr.end_date <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      sql += ` ORDER BY tr.created_at DESC`;

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.time_off_request'
      });

      return result.rows;
    } catch (_error) {
      this.logger.error('Error getting worker time-off requests', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get all pending time-off requests
   */
  async getPendingRequests(organizationId) {
    try {
      this.logger.debug('Getting pending time-off requests', { organizationId });

      const sql = `
        SELECT tr.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               d.department_name
        FROM hris.time_off_request tr
        LEFT JOIN hris.employee e ON tr.employee_id = e.id
        LEFT JOIN hris.department d ON e.department_id = d.id
        WHERE tr.organization_id = $1 
          AND tr.status = 'pending'
          AND tr.deleted_at IS NULL
        ORDER BY tr.created_at ASC
      `;

      const result = await query(sql, [organizationId], organizationId, {
        operation: 'findPending',
        table: 'hris.time_off_request'
      });

      return result.rows;
    } catch (_error) {
      this.logger.error('Error getting pending time-off requests', { 
        error: error.message,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Cancel a time-off request
   */
  async cancelRequest(id, organizationId, userId = null) {
    try {
      this.logger.info('Canceling time-off request', { 
        id,
        organizationId,
        userId 
      });

      const sql = `
        UPDATE hris.time_off_request 
        SET status = 'cancelled',
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
          AND organization_id = $2
          AND status = 'pending'
        RETURNING *
      `;

      const result = await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'update',
        table: 'hris.time_off_request'
      });

      if (result.rows.length === 0) {
        throw new Error(`Time-off request with ID ${id} not found or cannot be cancelled`);
      }

      this.logger.info('Time-off request cancelled successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error cancelling time-off request', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get time-off request by ID
   */
  async getRequestById(id, organizationId) {
    try {
      this.logger.debug('Getting time-off request by ID', { 
        id,
        organizationId 
      });

      const sql = `
        SELECT tr.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               d.department_name,
               r.first_name || ' ' || r.last_name as reviewer_name
        FROM hris.time_off_request tr
        LEFT JOIN hris.employee e ON tr.employee_id = e.id
        LEFT JOIN hris.department d ON e.department_id = d.id
        LEFT JOIN hris.employee r ON tr.approver_id = r.id
        WHERE tr.id = $1 
          AND tr.organization_id = $2
          AND tr.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.time_off_request'
      });

      if (result.rows.length === 0) {
        throw new Error(`Time-off request with ID ${id} not found`);
      }

      return result.rows[0];
    } catch (_error) {
      this.logger.error('Error getting time-off request by ID', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get time-off requests with filters and pagination
   */
  async getTimeOffRequests(filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Getting time-off requests', { organizationId, filters });

      const { limit = 20, offset = 0 } = options;
      const conditions = ['tr.organization_id = $1', 'tr.deleted_at IS NULL'];
      const params = [organizationId];
      let paramIndex = 1;

      // Add filters
      if (filters.status) {
        paramIndex++;
        conditions.push(`tr.status = $${paramIndex}`);
        params.push(filters.status);
      }

      if (filters.employeeId) {
        paramIndex++;
        conditions.push(`tr.employee_id = $${paramIndex}`);
        params.push(filters.employeeId);
      }

      if (filters.startDate) {
        paramIndex++;
        conditions.push(`tr.start_date >= $${paramIndex}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramIndex++;
        conditions.push(`tr.end_date <= $${paramIndex}`);
        params.push(filters.endDate);
      }

      const sql = `
        SELECT tr.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               d.department_name,
               r.first_name || ' ' || r.last_name as approver_name
        FROM hris.time_off_request tr
        LEFT JOIN hris.employee e ON tr.employee_id = e.id
        LEFT JOIN hris.department d ON e.department_id = d.id
        LEFT JOIN hris.employee r ON tr.approver_id = r.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY tr.created_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.time_off_request'
      });

      // Get total count
      const countSql = `
        SELECT COUNT(*) as total
        FROM hris.time_off_request tr
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await query(countSql, params.slice(0, paramIndex), organizationId, {
        operation: 'count',
        table: 'hris.time_off_request'
      });

      return {
        requests: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (_error) {
      this.logger.error('Error getting time-off requests', { 
        error: error.message,
        organizationId,
        filters 
      });
      throw error;
    }
  }
}

export default TimeOffService;
