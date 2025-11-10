/**
 * Time Attendance Repository
 * 
 * Data access layer for time and attendance tracking including shift types,
 * clock events, time entries, rated time lines, and timesheet management.
 * Supports clock in/out, break tracking, and time entry approval workflows.
 * 
 * MVP Version: Basic clock in/out and manual time entry
 * Phase 2: Biometric integration, GPS verification, automated calculations
 * 
 * @module products/paylinq/repositories/timeAttendanceRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class TimeAttendanceRepository {
  // ==================== SHIFT TYPES ====================
  
  /**
   * Create shift type
   * @param {Object} shiftData - Shift type data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the shift type
   * @returns {Promise<Object>} Created shift type
   */
  async createShiftType(shiftData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.shift_type 
      (organization_id, shift_name, shift_code, start_time, end_time,
       duration_hours, is_overnight, break_duration_minutes, 
       is_paid_break, shift_differential_rate, description, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId,
        shiftData.shiftName,
        shiftData.shiftCode,
        shiftData.startTime,
        shiftData.endTime,
        shiftData.durationHours,
        shiftData.isOvernight || false,
        shiftData.breakDurationMinutes || 0,
        shiftData.isPaidBreak || false,
        shiftData.shiftDifferentialRate || 0,
        shiftData.description,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.shift_type', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find shift types by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Shift types
   */
  async findShiftTypes(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    const result = await query(
      `SELECT * FROM payroll.shift_type
       ${whereClause}
       ORDER BY shift_name ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.shift_type' }
    );
    
    return result.rows;
  }

  /**
   * Find shift type by ID
   * @param {string} shiftTypeId - Shift type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Shift type or null
   */
  async findShiftTypeById(shiftTypeId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.shift_type
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [shiftTypeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.shift_type' }
    );
    
    return result.rows[0] || null;
  }

  // ==================== TIME ATTENDANCE EVENTS ====================
  
  /**
   * Create time attendance event (clock in/out)
   * @param {Object} eventData - Event data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the event
   * @returns {Promise<Object>} Created time event
   */
  async createTimeEvent(eventData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.time_attendance_event 
      (organization_id, employee_id, event_type, event_timestamp,
       location_id, gps_latitude, gps_longitude, device_id, ip_address,
       notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        organizationId,
        eventData.employeeId,
        eventData.eventType, // 'clock_in', 'clock_out', 'break_start', 'break_end'
        eventData.eventTimestamp || new Date(),
        eventData.locationId,
        eventData.gpsLatitude,
        eventData.gpsLongitude,
        eventData.deviceId,
        eventData.ipAddress,
        eventData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.time_attendance_event', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find open clock event (no matching clock out)
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Open clock in event or null
   */
  async findOpenClockEvent(employeeId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.time_attendance_event
       WHERE employee_id = $1
         AND organization_id = $2
         AND event_type = 'clock_in'
         AND id NOT IN (
           SELECT te.clock_in_event_id 
           FROM payroll.time_entry te 
           WHERE te.clock_in_event_id IS NOT NULL
             AND te.deleted_at IS NULL
         )
         AND deleted_at IS NULL
       ORDER BY event_timestamp DESC
       LIMIT 1`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.time_attendance_event' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find time events for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Time events
   */
  async findTimeEvents(employeeId, organizationId, filters = {}) {
    let whereClause = 'WHERE employee_id = $1 AND organization_id = $2 AND deleted_at IS NULL';
    const params = [employeeId, organizationId];
    let paramCount = 2;
    
    if (filters.fromDate) {
      paramCount++;
      whereClause += ` AND event_timestamp >= $${paramCount}`;
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      paramCount++;
      whereClause += ` AND event_timestamp <= $${paramCount}`;
      params.push(filters.toDate);
    }
    
    if (filters.eventType) {
      paramCount++;
      whereClause += ` AND event_type = $${paramCount}`;
      params.push(filters.eventType);
    }
    
    const result = await query(
      `SELECT * FROM payroll.time_attendance_event
       ${whereClause}
       ORDER BY event_timestamp DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.time_attendance_event' }
    );
    
    return result.rows;
  }

  // ==================== TIME ENTRIES ====================
  
  /**
   * Create time entry
   * @param {Object} entryData - Time entry data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the entry
   * @returns {Promise<Object>} Created time entry
   */
  async createTimeEntry(entryData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.time_entry 
      (organization_id, employee_id, entry_date, clock_in, clock_out,
       worked_hours, regular_hours, overtime_hours, break_hours, 
       shift_type_id, entry_type, status, notes, 
       clock_in_event_id, clock_out_event_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId,
        entryData.employeeId,
        entryData.entryDate,
        entryData.clockIn,
        entryData.clockOut,
        entryData.workedHours !== undefined ? entryData.workedHours : (entryData.totalHours || 0),
        entryData.regularHours !== undefined ? entryData.regularHours : 0,
        entryData.overtimeHours !== undefined ? entryData.overtimeHours : 0,
        entryData.breakHours !== undefined ? entryData.breakHours : 0,
        entryData.shiftTypeId,
        entryData.entryType || 'regular',
        entryData.status || 'draft',
        entryData.notes,
        entryData.clockInEventId,
        entryData.clockOutEventId,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.time_entry', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find time entry by ID
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Time entry or null
   */
  async findTimeEntryById(timeEntryId, organizationId) {
    const result = await query(
      `SELECT te.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              st.shift_name,
              st.shift_differential_rate
       FROM payroll.time_entry te
       INNER JOIN hris.employee e ON e.id = te.employee_id
       LEFT JOIN payroll.shift_type st ON st.id = te.shift_type_id
       WHERE te.id = $1 AND te.organization_id = $2 AND te.deleted_at IS NULL`,
      [timeEntryId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.time_entry' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Find time entries by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Time entries
   */
  async findTimeEntries(criteria, organizationId) {
    let whereClause = 'WHERE te.organization_id = $1 AND te.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND te.employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.fromDate) {
      paramCount++;
      whereClause += ` AND te.entry_date >= $${paramCount}`;
      params.push(criteria.fromDate);
    }
    
    if (criteria.toDate) {
      paramCount++;
      whereClause += ` AND te.entry_date <= $${paramCount}`;
      params.push(criteria.toDate);
    }
    
    if (criteria.status) {
      paramCount++;
      whereClause += ` AND te.status = $${paramCount}`;
      params.push(criteria.status);
    }
    
    if (criteria.entryType) {
      paramCount++;
      whereClause += ` AND te.entry_type = $${paramCount}`;
      params.push(criteria.entryType);
    }
    
    const result = await query(
      `SELECT te.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name,
              st.shift_name
       FROM payroll.time_entry te
       INNER JOIN hris.employee e ON e.id = te.employee_id
       LEFT JOIN payroll.shift_type st ON st.id = te.shift_type_id
       ${whereClause}
       ORDER BY te.entry_date DESC, te.clock_in DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.time_entry' }
    );
    
    return result.rows;
  }

  /**
   * Update time entry status
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} status - New status
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated time entry
   */
  async updateTimeEntryStatus(timeEntryId, status, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.time_entry 
       SET status = $1::text,
           approved_by = CASE WHEN $1::text = 'approved' THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $1::text = 'approved' THEN NOW() ELSE approved_at END,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [status, userId, timeEntryId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.time_entry', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Update time entry
   * @param {string} timeEntryId - Time entry UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated time entry
   */
  async updateTimeEntry(timeEntryId, updates, organizationId, userId) {
    const allowedFields = [
      'entry_date', 'clock_in', 'clock_out', 'worked_hours',
      'regular_hours', 'overtime_hours', 'break_hours',
      'shift_type_id', 'entry_type', 'notes'
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
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push(`updated_at = NOW()`);
    
    paramCount++;
    params.push(timeEntryId);
    paramCount++;
    params.push(organizationId);
    
    const result = await query(
      `UPDATE payroll.time_entry 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.time_entry', userId }
    );
    
    return result.rows[0];
  }

  // ==================== RATED TIME LINES ====================
  
  /**
   * Create rated time line
   * @param {Object} lineData - Rated time line data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the line
   * @returns {Promise<Object>} Created rated time line
   */
  async createRatedTimeLine(lineData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.rated_time_line 
      (organization_id, time_entry_id, pay_component_id, hours, rate, amount, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        organizationId,
        lineData.timeEntryId,
        lineData.payComponentId,
        lineData.hours,
        lineData.rate,
        lineData.amount,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.rated_time_line', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find rated time lines for time entry
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Rated time lines
   */
  async findRatedTimeLinesByEntry(timeEntryId, organizationId) {
    const result = await query(
      `SELECT rtl.*,
              pc.component_code,
              pc.component_name,
              pc.component_type
       FROM payroll.rated_time_line rtl
       INNER JOIN payroll.pay_component pc ON pc.id = rtl.pay_component_id
       WHERE rtl.time_entry_id = $1 
         AND rtl.organization_id = $2
         AND rtl.deleted_at IS NULL
       ORDER BY pc.component_type, pc.component_name`,
      [timeEntryId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.rated_time_line' }
    );
    
    return result.rows;
  }

  /**
   * Find employee pay components for time entry rating
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Pay components with custom rates
   */
  async findEmployeePayComponents(employeeId, organizationId) {
    const result = await query(
      `SELECT pc.*,
              cpc.custom_rate,
              cpc.custom_amount
       FROM payroll.pay_component pc
       LEFT JOIN payroll.custom_pay_component cpc 
         ON cpc.pay_component_id = pc.id 
         AND cpc.employee_id = $1
         AND cpc.is_active = true
         AND cpc.deleted_at IS NULL
       WHERE pc.organization_id = $2
         AND pc.status = 'active'
         AND pc.component_type = 'earning'
         AND pc.calculation_type IN ('hourly_rate', 'percentage')
         AND pc.deleted_at IS NULL
       ORDER BY pc.component_name`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.pay_component' }
    );
    
    return result.rows;
  }

  /**
   * Get total hours summary for employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Hours summary
   */
  async getHoursSummary(employeeId, startDate, endDate, organizationId) {
    const result = await query(
      `SELECT 
        COALESCE(SUM(worked_hours), 0) as total_hours,
        COALESCE(SUM(regular_hours), 0) as regular_hours,
        COALESCE(SUM(overtime_hours), 0) as overtime_hours,
        COALESCE(SUM(break_hours), 0) as break_hours,
        COUNT(*) as entry_count
       FROM payroll.time_entry
       WHERE employee_id = $1
         AND organization_id = $2
         AND entry_date >= $3
         AND entry_date <= $4
         AND status = 'approved'
         AND deleted_at IS NULL`,
      [employeeId, organizationId, startDate, endDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.time_entry' }
    );
    
    return result.rows[0];
  }

  /**
   * Bulk create rated time lines
   * @param {Array} lines - Array of rated time line objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the lines
   * @returns {Promise<Array>} Created rated time lines
   */
  async bulkCreateRatedTimeLines(lines, organizationId, userId) {
    const results = [];
    
    for (const line of lines) {
      const result = await this.createRatedTimeLine(line, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Delete time entry (soft delete)
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the entry
   * @returns {Promise<boolean>} Success status
   */
  async deleteTimeEntry(timeEntryId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.time_entry
       SET deleted_at = NOW(),
           deleted_by = $1
       WHERE id = $2
         AND organization_id = $3
         AND deleted_at IS NULL
       RETURNING id`,
      [userId, timeEntryId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.time_entry', userId }
    );
    
    return result.rowCount > 0;
  }
}

export default TimeAttendanceRepository;
