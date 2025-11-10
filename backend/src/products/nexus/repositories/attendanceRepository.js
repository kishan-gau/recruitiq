/**
 * AttendanceRepository
 * Data access layer for attendance records
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class AttendanceRepository {
  constructor() {
    this.tableName = 'hris.attendance_record';
    this.logger = logger;
  }

  async findById(id, organizationId) {
    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE id = $1 AND organization_id = $2`;
      const result = await query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding attendance', { id, organizationId, error: error.message });
      throw error;
    }
  }

  async findByEmployee(employeeId, organizationId, filters = {}) {
    try {
      const { startDate, endDate, limit = 50, offset = 0 } = filters;
      
      let sql = `
        SELECT a.*, e.first_name || ' ' || e.last_name as employee_name
        FROM ${this.tableName} a
        LEFT JOIN hris.employee e ON a.employee_id = e.id
        WHERE a.employee_id = $1 
          AND a.organization_id = $2
      `;
      const params = [employeeId, organizationId];
      let paramCount = 2;

      if (startDate) {
        paramCount++;
        sql += ` AND a.attendance_date >= $${paramCount}`;
        params.push(startDate);
      }
      if (endDate) {
        paramCount++;
        sql += ` AND a.attendance_date <= $${paramCount}`;
        params.push(endDate);
      }

      sql += ` ORDER BY a.attendance_date DESC`;
      
      if (limit) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        params.push(limit);
      }
      if (offset) {
        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        params.push(offset);
      }

      const result = await query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding attendance by employee', { employeeId, organizationId, error: error.message });
      throw error;
    }
  }

  async clockIn(employeeId, clockInTime, clockInLocation, clockInIp, notes, organizationId, userId) {
    try {
      const attendanceDate = new Date(clockInTime).toISOString().split('T')[0];
      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, employee_id, attendance_date,
          clock_in_time, clock_in_location, clock_in_ip, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (organization_id, employee_id, attendance_date)
        DO UPDATE SET
          clock_in_time = EXCLUDED.clock_in_time,
          clock_in_location = EXCLUDED.clock_in_location,
          clock_in_ip = EXCLUDED.clock_in_ip,
          status = 'present',
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `;
      const params = [
        organizationId, employeeId, attendanceDate, clockInTime,
        clockInLocation, clockInIp, 'present', notes
      ];
      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error clock in', { employeeId, organizationId, error: error.message });
      throw error;
    }
  }

  async clockOut(recordId, clockOutTime, clockOutLocation, clockOutIp, notes, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET
          clock_out_time = $1,
          clock_out_location = $2,
          clock_out_ip = $3,
          total_hours = EXTRACT(EPOCH FROM ($1 - clock_in_time))/3600,
          notes = COALESCE($4, notes),
          updated_at = NOW()
        WHERE id = $5
          AND organization_id = $6
        RETURNING *
      `;
      const params = [
        clockOutTime, clockOutLocation, clockOutIp, notes,
        recordId, organizationId
      ];
      const result = await query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error clock out', { recordId, organizationId, error: error.message });
      throw error;
    }
  }

  async create(attendanceData, organizationId) {
    try {
      const dbData = mapApiToDb(attendanceData);
      const sql = `
        INSERT INTO ${this.tableName} (
          organization_id, employee_id, attendance_date, clock_in_time, clock_out_time,
          status, time_off_request_id, total_hours, overtime_hours, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const params = [
        organizationId, dbData.employee_id, dbData.attendance_date,
        dbData.clock_in_time || null, dbData.clock_out_time || null,
        dbData.status, dbData.time_off_request_id || null,
        dbData.total_hours || null, dbData.overtime_hours || null, dbData.notes || null
      ];
      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating attendance', { attendanceData, organizationId, error: error.message });
      throw error;
    }
  }

  async findTodayAttendance(organizationId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sql = `
        SELECT a.*, e.first_name || ' ' || e.last_name as employee_name, 
               d.department_name
        FROM ${this.tableName} a
        LEFT JOIN hris.employee e ON a.employee_id = e.id
        LEFT JOIN hris.department d ON e.department_id = d.id
        WHERE a.attendance_date = $1
          AND a.organization_id = $2
        ORDER BY a.clock_in_time DESC
      `;
      const result = await query(sql, [today, organizationId], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding today attendance', { organizationId, error: error.message });
      throw error;
    }
  }

  async getAttendanceStatistics(organizationId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sql = `
        WITH employee_count AS (
          SELECT COUNT(*) as total
          FROM hris.employee
          WHERE organization_id = $1
            AND employment_status = 'active'
            AND deleted_at IS NULL
        ),
        today_attendance AS (
          SELECT 
            COUNT(*) as present,
            COUNT(CASE WHEN clock_in_time IS NOT NULL AND clock_out_time IS NULL THEN 1 END) as clocked_in,
            COUNT(CASE WHEN clock_out_time IS NOT NULL THEN 1 END) as clocked_out,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
            COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) as on_break,
            AVG(CASE WHEN total_hours IS NOT NULL THEN total_hours ELSE 0 END) as avg_hours
          FROM ${this.tableName}
          WHERE attendance_date = $2
            AND organization_id = $1
            AND status NOT IN ('absent', 'on_leave')
        ),
        leave_count AS (
          SELECT COUNT(*) as on_leave
          FROM hris.time_off_request tor
          WHERE tor.organization_id = $1
            AND tor.status = 'approved'
            AND $2 BETWEEN tor.start_date AND tor.end_date
        )
        SELECT 
          ec.total as total_employees,
          COALESCE(ta.present, 0) as present_today,
          COALESCE(ec.total - ta.present - lc.on_leave, 0) as absent_today,
          COALESCE(ta.late, 0) as late_today,
          COALESCE(lc.on_leave, 0) as on_leave_today,
          COALESCE(ta.clocked_in, 0) as clocked_in,
          COALESCE(ta.clocked_out, 0) as clocked_out,
          COALESCE(ta.on_break, 0) as on_break,
          CASE 
            WHEN ec.total > 0 THEN ROUND((COALESCE(ta.present, 0)::numeric / ec.total::numeric) * 100, 2)
            ELSE 0 
          END as attendance_rate,
          CASE 
            WHEN ta.present > 0 THEN ROUND(((ta.present - COALESCE(ta.late, 0))::numeric / ta.present::numeric) * 100, 2)
            ELSE 100 
          END as punctuality_rate,
          ROUND(COALESCE(ta.avg_hours, 0)::numeric, 2) as average_hours_worked
        FROM employee_count ec
        CROSS JOIN today_attendance ta
        CROSS JOIN leave_count lc
      `;
      const result = await query(sql, [organizationId, today], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error getting attendance statistics', { organizationId, error: error.message });
      throw error;
    }
  }
}

export default AttendanceRepository;
