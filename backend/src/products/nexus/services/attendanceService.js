/**
 * AttendanceService
 * Business logic layer for employee attendance tracking
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class AttendanceService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Clock in employee
   */
  async clockIn(clockInData, organizationId, userId) {
    try {
      this.logger.info('Clocking in employee', { 
        organizationId, 
        userId,
        employeeId: clockInData.employee_id 
      });

      if (!clockInData.employee_id) {
        throw new Error('Employee ID is required');
      }

      // Check if employee has an open attendance record
      const checkSql = `
        SELECT id FROM hris.attendance 
        WHERE employee_id = $1 
          AND organization_id = $2
          AND clock_out_time IS NULL
          AND DATE(clock_in_time) = CURRENT_DATE
          AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [clockInData.employee_id, organizationId], organizationId);

      if (checkResult.rows.length > 0) {
        throw new Error('Employee already has an active clock-in for today');
      }

      const sql = `
        INSERT INTO hris.attendance (
          organization_id, employee_id,
          clock_in_time, clock_in_location, clock_in_notes,
          work_type, created_by, updated_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        RETURNING *
      `;

      const params = [
        organizationId,
        clockInData.employee_id,
        clockInData.clock_in_time || new Date(),
        clockInData.clock_in_location || null,
        clockInData.clock_in_notes || null,
        clockInData.work_type || 'regular',
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'create',
        table: 'hris.attendance'
      });

      this.logger.info('Employee clocked in successfully', { 
        attendanceId: result.rows[0].id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error clocking in employee', { 
        error: error.message,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Clock out employee
   */
  async clockOut(employeeId, clockOutData, organizationId, userId) {
    try {
      this.logger.info('Clocking out employee', { 
        employeeId,
        organizationId,
        userId 
      });

      // Find the active attendance record
      const findSql = `
        SELECT * FROM hris.attendance 
        WHERE employee_id = $1 
          AND organization_id = $2
          AND clock_out_time IS NULL
          AND DATE(clock_in_time) = CURRENT_DATE
          AND deleted_at IS NULL
        ORDER BY clock_in_time DESC
        LIMIT 1
      `;
      const findResult = await query(findSql, [employeeId, organizationId], organizationId);

      if (findResult.rows.length === 0) {
        throw new Error('No active clock-in found for today');
      }

      const attendance = findResult.rows[0];
      const clockOutTime = clockOutData.clock_out_time || new Date();
      const clockInTime = new Date(attendance.clock_in_time);
      
      // Calculate total hours
      const totalMinutes = Math.floor((clockOutTime - clockInTime) / 1000 / 60);
      const totalHours = (totalMinutes / 60).toFixed(2);

      const sql = `
        UPDATE hris.attendance 
        SET clock_out_time = $1,
            clock_out_location = $2,
            clock_out_notes = $3,
            total_hours = $4,
            updated_by = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND organization_id = $7
        RETURNING *
      `;

      const params = [
        clockOutTime,
        clockOutData.clock_out_location || null,
        clockOutData.clock_out_notes || null,
        totalHours,
        userId,
        attendance.id,
        organizationId
      ];

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.attendance'
      });

      this.logger.info('Employee clocked out successfully', { 
        attendanceId: result.rows[0].id,
        totalHours,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error clocking out employee', { 
        error: error.message,
        employeeId,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceRecord(id, organizationId) {
    try {
      this.logger.debug('Getting attendance record', { id, organizationId });

      const sql = `
        SELECT a.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               e.employee_number
        FROM hris.attendance a
        LEFT JOIN hris.employee e ON a.employee_id = e.id
        WHERE a.id = $1 
          AND a.organization_id = $2
          AND a.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId, {
        operation: 'findById',
        table: 'hris.attendance'
      });
      
      if (result.rows.length === 0) {
        throw new Error('Attendance record not found');
      }

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting attendance record', { 
        error: error.message,
        id,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get employee attendance records
   */
  async getEmployeeAttendance(employeeId, filters = {}, organizationId, options = {}) {
    try {
      this.logger.debug('Getting employee attendance', { 
        employeeId,
        filters,
        organizationId 
      });

      const { limit = 50, offset = 0 } = options;

      let sql = `
        SELECT a.*, 
               e.first_name || ' ' || e.last_name as employee_name
        FROM hris.attendance a
        LEFT JOIN hris.employee e ON a.employee_id = e.id
        WHERE a.employee_id = $1 
          AND a.organization_id = $2
          AND a.deleted_at IS NULL
      `;

      const params = [employeeId, organizationId];
      let paramIndex = 3;

      if (filters.startDate) {
        sql += ` AND DATE(a.clock_in_time) >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        sql += ` AND DATE(a.clock_in_time) <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.workType) {
        sql += ` AND a.work_type = $${paramIndex}`;
        params.push(filters.workType);
        paramIndex++;
      }

      sql += ` ORDER BY a.clock_in_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId, {
        operation: 'findAll',
        table: 'hris.attendance'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting employee attendance', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get attendance summary for date range
   */
  async getAttendanceSummary(employeeId, startDate, endDate, organizationId) {
    try {
      this.logger.debug('Getting attendance summary', { 
        employeeId,
        startDate,
        endDate,
        organizationId 
      });

      const sql = `
        SELECT 
          COUNT(*) as total_days,
          SUM(total_hours) as total_hours,
          AVG(total_hours) as average_hours,
          COUNT(CASE WHEN clock_out_time IS NULL THEN 1 END) as incomplete_records
        FROM hris.attendance
        WHERE employee_id = $1 
          AND organization_id = $2
          AND DATE(clock_in_time) >= $3
          AND DATE(clock_in_time) <= $4
          AND deleted_at IS NULL
      `;

      const result = await query(sql, [employeeId, organizationId, startDate, endDate], organizationId, {
        operation: 'summary',
        table: 'hris.attendance'
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting attendance summary', { 
        error: error.message,
        employeeId,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Get daily attendance for organization
   */
  async getDailyAttendance(date, organizationId, options = {}) {
    try {
      this.logger.debug('Getting daily attendance', { 
        date,
        organizationId 
      });

      const { limit = 100, offset = 0 } = options;

      const sql = `
        SELECT a.*, 
               e.first_name || ' ' || e.last_name as employee_name,
               e.employee_number,
               d.department_name,
               l.location_name
        FROM hris.attendance a
        LEFT JOIN hris.employee e ON a.employee_id = e.id
        LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN hris.location l ON e.location_id = l.id AND l.deleted_at IS NULL
        WHERE a.organization_id = $1
          AND DATE(a.clock_in_time) = $2
          AND a.deleted_at IS NULL
        ORDER BY a.clock_in_time DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await query(sql, [organizationId, date, limit, offset], organizationId, {
        operation: 'findAll',
        table: 'hris.attendance'
      });

      return result.rows;
    } catch (error) {
      this.logger.error('Error getting daily attendance', { 
        error: error.message,
        date,
        organizationId 
      });
      throw error;
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendance(id, attendanceData, organizationId, userId) {
    try {
      this.logger.info('Updating attendance record', { 
        id,
        organizationId,
        userId 
      });

      // Check if record exists
      const checkSql = `
        SELECT * FROM hris.attendance 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Attendance record not found');
      }

      // Build update query dynamically
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = [
        'clock_in_time', 'clock_out_time',
        'clock_in_location', 'clock_out_location',
        'clock_in_notes', 'clock_out_notes',
        'work_type', 'total_hours'
      ];

      updateableFields.forEach(field => {
        if (attendanceData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          params.push(attendanceData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return checkResult.rows[0];
      }

      // Recalculate total hours if times are updated
      if (attendanceData.clock_in_time || attendanceData.clock_out_time) {
        const record = checkResult.rows[0];
        const clockIn = new Date(attendanceData.clock_in_time || record.clock_in_time);
        const clockOut = new Date(attendanceData.clock_out_time || record.clock_out_time);
        
        if (clockOut && clockIn) {
          const totalMinutes = Math.floor((clockOut - clockIn) / 1000 / 60);
          const totalHours = (totalMinutes / 60).toFixed(2);
          updates.push(`total_hours = $${paramIndex}`);
          params.push(totalHours);
          paramIndex++;
        }
      }

      updates.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id, organizationId);

      const sql = `
        UPDATE hris.attendance 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, params, organizationId, {
        operation: 'update',
        table: 'hris.attendance'
      });

      this.logger.info('Attendance record updated successfully', { 
        id,
        organizationId 
      });

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error updating attendance record', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete attendance record (soft delete)
   */
  async deleteAttendance(id, organizationId, userId) {
    try {
      this.logger.info('Deleting attendance record', { 
        id,
        organizationId,
        userId 
      });

      // Check if record exists
      const checkSql = `
        SELECT id FROM hris.attendance 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await query(checkSql, [id, organizationId], organizationId);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Attendance record not found');
      }

      const sql = `
        UPDATE hris.attendance 
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $3
        WHERE id = $1 AND organization_id = $2
      `;

      await query(sql, [id, organizationId, userId], organizationId, {
        operation: 'softDelete',
        table: 'hris.attendance'
      });

      this.logger.info('Attendance record deleted successfully', { 
        id,
        organizationId 
      });

      return { success: true, message: 'Attendance record deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting attendance record', { 
        error: error.message,
        id,
        organizationId,
        userId 
      });
      throw error;
    }
  }
}

export default AttendanceService;
