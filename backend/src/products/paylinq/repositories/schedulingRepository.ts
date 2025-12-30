/**
 * Scheduling Repository
 * 
 * Data access layer for work schedule management and schedule change requests.
 * Supports shift assignments, schedule templates, and employee schedule changes.
 * 
 * MVP Version: Basic schedule creation and change requests
 * Phase 2: Automated scheduling, shift optimization, availability matching
 * 
 * @module products/paylinq/repositories/schedulingRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class SchedulingRepository {
  constructor(database = null) {
    this.query = database?.query || query;
  }

  // ==================== WORK SCHEDULES ====================
  
  /**
   * Create work schedule
   * @param {Object} scheduleData - Work schedule data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the schedule
   * @returns {Promise<Object>} Created work schedule
   */
  async createWorkSchedule(scheduleData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.work_schedule 
      (organization_id, employee_id, shift_type_id, schedule_date,
       start_time, end_time, duration_hours, status, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId,
        scheduleData.employee_id,
        scheduleData.shift_type_id,
        scheduleData.schedule_date,
        scheduleData.start_time,
        scheduleData.end_time,
        scheduleData.duration_hours,
        scheduleData.status || 'scheduled',
        scheduleData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.work_schedule', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find work schedules by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Work schedules
   */
  async findWorkSchedules(criteria, organizationId) {
    let whereClause = 'WHERE ws.organization_id = $1 AND ws.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND ws.employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.fromDate) {
      paramCount++;
      whereClause += ` AND ws.schedule_date >= $${paramCount}`;
      params.push(criteria.fromDate);
    }
    
    if (criteria.toDate) {
      paramCount++;
      whereClause += ` AND ws.schedule_date <= $${paramCount}`;
      params.push(criteria.toDate);
    }
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND ws.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.shiftTypeId) {
      paramCount++;
      whereClause += ` AND ws.shift_type_id = $${paramCount}`;
      params.push(criteria.shiftTypeId);
    }
    
    const result = await this.query(
      `SELECT ws.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name,
              st.shift_name,
              st.shift_code
       FROM payroll.work_schedule ws
       INNER JOIN hris.employee e ON e.id = ws.employee_id
       LEFT JOIN payroll.shift_type st ON st.id = ws.shift_type_id
       ${whereClause}
       ORDER BY ws.schedule_date ASC, ws.start_time ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    return result.rows;
  }

  /**
   * Find work schedules with pagination
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated schedules with metadata
   */
  async findWorkSchedulesPaginated(criteria, organizationId, page, limit) {
    let whereClause = 'WHERE ws.organization_id = $1 AND ws.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    // Build filter conditions
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND ws.employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.startDate) {
      paramCount++;
      whereClause += ` AND ws.schedule_date >= $${paramCount}`;
      params.push(criteria.startDate);
    }
    
    if (criteria.endDate) {
      paramCount++;
      whereClause += ` AND ws.schedule_date <= $${paramCount}`;
      params.push(criteria.endDate);
    }
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND ws.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.shiftTypeId) {
      paramCount++;
      whereClause += ` AND ws.shift_type_id = $${paramCount}`;
      params.push(criteria.shiftTypeId);
    }
    
    // Build sort clause
    const allowedSortFields = {
      scheduleDate: 'ws.schedule_date',
      startTime: 'ws.start_time',
      endTime: 'ws.end_time',
      status: 'ws.status',
      employeeName: 'e.last_name',
      createdAt: 'ws.created_at'
    };
    
    const sortField = allowedSortFields[criteria.sortBy] || 'ws.schedule_date';
    const sortOrder = criteria.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderClause = `ORDER BY ${sortField} ${sortOrder}, ws.start_time ASC`;
    
    // Get total count
    const countResult = await this.query(
      `SELECT COUNT(*) as total
       FROM payroll.work_schedule ws
       INNER JOIN hris.employee e ON e.id = ws.employee_id
       ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    const total = parseInt(countResult.rows[0].total);
    const offset = (page - 1) * limit;
    
    // Get paginated results
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    
    const result = await this.query(
      `SELECT ws.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name,
              st.shift_name,
              st.shift_code
       FROM payroll.work_schedule ws
       INNER JOIN hris.employee e ON e.id = ws.employee_id
       LEFT JOIN payroll.shift_type st ON st.id = ws.shift_type_id
       ${whereClause}
       ${orderClause}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    return {
      schedules: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Find work schedule by ID
   * @param {string} scheduleId - Work schedule UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Work schedule or null
   */
  async findWorkScheduleById(scheduleId, organizationId) {
    const result = await this.query(
      `SELECT ws.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              st.shift_name
       FROM payroll.work_schedule ws
       INNER JOIN hris.employee e ON e.id = ws.employee_id
       LEFT JOIN payroll.shift_type st ON st.id = ws.shift_type_id
       WHERE ws.id = $1 AND ws.organization_id = $2 AND ws.deleted_at IS NULL`,
      [scheduleId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update work schedule
   * @param {string} scheduleId - Work schedule UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated work schedule
   */
  async updateWorkSchedule(scheduleId, updates, organizationId, userId) {
    const allowedFields = [
      'shift_type_id', 'schedule_date', 'start_time', 'end_time',
      'duration_hours', 'status', 'notes'
    ];
    
    const setClause = [];
    const params = [];
    let paramCount = 0;
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
      }
    });
    
    // If no valid fields to update, fetch and return the unchanged record
    // This allows API to gracefully accept fields that database doesn't store yet
    if (setClause.length === 0) {
      const existingResult = await this.query(
        `SELECT * FROM payroll.work_schedule 
         WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [scheduleId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'payroll.work_schedule' }
      );
      return existingResult.rows[0];
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(scheduleId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.work_schedule 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.work_schedule', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Bulk create work schedules
   * @param {Array} schedules - Array of schedule objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the schedules
   * @returns {Promise<Array>} Created work schedules
   */
  async bulkCreateWorkSchedules(schedules, organizationId, userId) {
    const results = [];
    
    for (const schedule of schedules) {
      const result = await this.createWorkSchedule(schedule, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Delete work schedule (soft delete)
   * @param {string} scheduleId - Work schedule UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkSchedule(scheduleId, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.work_schedule 
       SET deleted_at = NOW(), 
           deleted_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, scheduleId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'payroll.work_schedule', userId }
    );
    
    return result.rowCount > 0;
  }

  // ==================== SCHEDULE CHANGE REQUESTS ====================
  
  /**
   * Create schedule change request
   * @param {Object} requestData - Change request data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the request
   * @returns {Promise<Object>} Created schedule change request
   */
  async createScheduleChangeRequest(requestData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.schedule_change_request 
      (organization_id, work_schedule_id, requested_by, request_type,
       original_date, proposed_date, original_shift_type_id, 
       proposed_shift_type_id, reason, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        organizationId,
        requestData.workScheduleId,
        requestData.requestedBy,
        requestData.requestType, // 'swap', 'change', 'cancel'
        requestData.originalDate,
        requestData.proposedDate,
        requestData.originalShiftTypeId,
        requestData.proposedShiftTypeId,
        requestData.reason,
        'pending',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.schedule_change_request', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find schedule change requests by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Schedule change requests
   */
  async findScheduleChangeRequests(criteria, organizationId) {
    let whereClause = 'WHERE scr.organization_id = $1 AND scr.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND scr.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.requestedBy) {
      paramCount++;
      whereClause += ` AND scr.requested_by = $${paramCount}`;
      params.push(criteria.requestedBy);
    }
    
    if (criteria.requestType) {
      paramCount++;
      whereClause += ` AND scr.request_type = $${paramCount}`;
      params.push(criteria.requestType);
    }
    
    const result = await this.query(
      `SELECT scr.*,
              ws.schedule_date as original_schedule_date,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name
       FROM payroll.schedule_change_request scr
       LEFT JOIN payroll.work_schedule ws ON ws.id = scr.work_schedule_id
       LEFT JOIN hris.employee e ON e.id = scr.requested_by
       ${whereClause}
       ORDER BY scr.created_at DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.schedule_change_request' }
    );
    
    return result.rows;
  }

  /**
   * Find schedule change requests with pagination
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated change requests with metadata
   */
  async findScheduleChangeRequestsPaginated(criteria, organizationId, page, limit) {
    let whereClause = 'WHERE scr.organization_id = $1 AND scr.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    // Build filter conditions
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND scr.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.employeeId || criteria.requestedBy) {
      paramCount++;
      whereClause += ` AND scr.requested_by = $${paramCount}`;
      params.push(criteria.employeeId || criteria.requestedBy);
    }
    
    if (criteria.requestType) {
      paramCount++;
      whereClause += ` AND scr.request_type = $${paramCount}`;
      params.push(criteria.requestType);
    }
    
    // Build sort clause
    const allowedSortFields = {
      createdAt: 'scr.created_at',
      status: 'scr.status',
      requestType: 'scr.request_type',
      employeeName: 'e.last_name'
    };
    
    const sortField = allowedSortFields[criteria.sortBy] || 'scr.created_at';
    const sortOrder = criteria.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderClause = `ORDER BY ${sortField} ${sortOrder}`;
    
    // Get total count
    const countResult = await this.query(
      `SELECT COUNT(*) as total
       FROM payroll.schedule_change_request scr
       LEFT JOIN hris.employee e ON e.id = scr.requested_by
       ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.schedule_change_request' }
    );
    
    const total = parseInt(countResult.rows[0].total);
    const offset = (page - 1) * limit;
    
    // Get paginated results
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    
    const result = await this.query(
      `SELECT scr.*,
              ws.schedule_date as original_schedule_date,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name
       FROM payroll.schedule_change_request scr
       LEFT JOIN payroll.work_schedule ws ON ws.id = scr.work_schedule_id
       LEFT JOIN hris.employee e ON e.id = scr.requested_by
       ${whereClause}
       ${orderClause}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      organizationId,
      { operation: 'SELECT', table: 'payroll.schedule_change_request' }
    );
    
    return {
      requests: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Find schedule change request by ID
   * @param {string} requestId - Schedule change request UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Schedule change request or null
   */
  async findScheduleChangeRequestById(requestId, organizationId) {
    const result = await this.query(
      `SELECT scr.*,
              ws.schedule_date,
              ws.employee_id,
              e.employee_number,
              e.first_name,
              e.last_name
       FROM payroll.schedule_change_request scr
       LEFT JOIN payroll.work_schedule ws ON ws.id = scr.work_schedule_id
       LEFT JOIN hris.employee e ON e.id = scr.requested_by
       WHERE scr.id = $1 AND scr.organization_id = $2 AND scr.deleted_at IS NULL`,
      [requestId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.schedule_change_request' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update schedule change request status
   * @param {string} requestId - Schedule change request UUID
   * @param {string} status - New status
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated schedule change request
   */
  async updateScheduleChangeRequestStatus(requestId, status, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.schedule_change_request 
       SET status = $1::VARCHAR,
           reviewed_by = CASE WHEN $1::VARCHAR IN ('approved', 'rejected') THEN $2 ELSE reviewed_by END,
           reviewed_at = CASE WHEN $1::VARCHAR IN ('approved', 'rejected') THEN NOW() ELSE reviewed_at END,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [status, userId, requestId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.schedule_change_request', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get schedule statistics
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Schedule statistics
   */
  async getScheduleStatistics(startDate, endDate, organizationId) {
    const result = await this.query(
      `SELECT 
        COUNT(DISTINCT ws.employee_id) as total_employees_scheduled,
        COUNT(ws.id) as total_shifts,
        COALESCE(SUM(ws.duration_hours), 0) as total_hours_scheduled,
        COUNT(CASE WHEN ws.status = 'scheduled' THEN 1 END) as scheduled_shifts,
        COUNT(CASE WHEN ws.status = 'completed' THEN 1 END) as completed_shifts,
        COUNT(CASE WHEN ws.status = 'cancelled' THEN 1 END) as cancelled_shifts
       FROM payroll.work_schedule ws
       WHERE ws.organization_id = $1
         AND ws.schedule_date >= $2
         AND ws.schedule_date <= $3
         AND ws.deleted_at IS NULL`,
      [organizationId, startDate, endDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    return result.rows[0];
  }

  /**
   * Find schedule conflicts
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {Date} scheduleDate - Schedule date
   * @param {string} startTime - Start time
   * @param {string} endTime - End time
   * @param {string} organizationId - Organization UUID
   * @param {string} excludeScheduleId - Schedule ID to exclude (for updates)
   * @returns {Promise<Array>} Conflicting schedules
   */
  async findScheduleConflicts(employeeId, scheduleDate, startTime, endTime, organizationId, excludeScheduleId = null) {
    let whereClause = `WHERE employee_id = $1 
                       AND organization_id = $2
                       AND schedule_date = $3
                       AND status != 'cancelled'
                       AND deleted_at IS NULL
                       AND (
                         (start_time <= $4 AND end_time > $4) OR
                         (start_time < $5 AND end_time >= $5) OR
                         (start_time >= $4 AND end_time <= $5)
                       )`;
    
    const params = [employeeId, organizationId, scheduleDate, startTime, endTime];
    let paramCount = 5;
    
    if (excludeScheduleId) {
      paramCount++;
      whereClause += ` AND id != $${paramCount}`;
      params.push(excludeScheduleId);
    }
    
    const result = await this.query(
      `SELECT * FROM payroll.work_schedule
       ${whereClause}`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.work_schedule' }
    );
    
    return result.rows;
  }
}

export default SchedulingRepository;
