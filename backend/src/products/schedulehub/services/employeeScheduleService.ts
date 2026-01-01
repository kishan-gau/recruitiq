/**
 * Employee Schedule Service
 * Business logic for employee self-service scheduling operations
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import * as Joi from 'joi';
import GeofencingService from '../../../services/geofencingService.js';

class EmployeeScheduleService {
  private logger: typeof logger;
  private geofencingService: GeofencingService;

  constructor() {
    this.logger = logger;
    this.geofencingService = new GeofencingService();
  }

  /**
   * Clock in employee - creates time attendance event
   */
  async clockIn(employeeId: string, location: any, organizationId: string, userId: string) {
    try {
      // Check if employee already has an active clock-in today
      const checkSql = `
        SELECT id, event_timestamp 
        FROM payroll.time_attendance_event
        WHERE employee_id = $1 
          AND organization_id = $2
          AND event_type = 'clock_in'
          AND DATE(event_timestamp) = CURRENT_DATE
          AND deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll.time_attendance_event AS te_out
            WHERE te_out.employee_id = time_attendance_event.employee_id
              AND te_out.organization_id = time_attendance_event.organization_id
              AND te_out.event_type = 'clock_out'
              AND te_out.event_timestamp > time_attendance_event.event_timestamp
              AND DATE(te_out.event_timestamp) = CURRENT_DATE
              AND te_out.deleted_at IS NULL
          )
        ORDER BY event_timestamp DESC
        LIMIT 1
      `;

      const checkResult = await query(
        checkSql,
        [employeeId, organizationId],
        organizationId
      );

      if (checkResult.rows.length > 0) {
        throw new Error('Employee already has an active clock-in for today. Please clock out first.');
      }
      
      // Validate geofencing if location provided
      const geofenceValidation = await this.geofencingService.validateClockInLocation(
        employeeId,
        organizationId,
        location ? {
          latitude: location.latitude,
          longitude: location.longitude,
        } : undefined
      );
      
      // If strict geofencing is enabled and validation failed, reject clock-in
      if (!geofenceValidation.allowed) {
        this.logger.warn('Clock-in rejected due to geofencing', {
          employeeId,
          organizationId,
          distance: geofenceValidation.distance,
          errorMessage: geofenceValidation.errorMessage,
        });
        throw new Error(geofenceValidation.errorMessage || 'Clock-in not allowed at this location');
      }

      // Create clock-in event
      const insertSql = `
        INSERT INTO payroll.time_attendance_event (
          organization_id,
          employee_id,
          event_type,
          event_timestamp,
          location_latitude,
          location_longitude,
          created_by
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6)
        RETURNING *
      `;

      const params = [
        organizationId,
        employeeId,
        'clock_in',
        location?.latitude || null,
        location?.longitude || null,
        userId
      ];

      const result = await query(insertSql, params, organizationId, {
        operation: 'INSERT',
        table: 'payroll.time_attendance_event'
      });

      this.logger.info('Employee clocked in successfully', {
        employeeId,
        organizationId,
        eventId: result.rows[0].id,
        geofenceValidation: {
          withinGeofence: geofenceValidation.withinGeofence,
          distance: geofenceValidation.distance,
          warning: geofenceValidation.warningMessage,
        },
      });

      // Return result with geofencing info
      return {
        ...result.rows[0],
        geofenceValidation: {
          withinGeofence: geofenceValidation.withinGeofence,
          distance: geofenceValidation.distance,
          warning: geofenceValidation.warningMessage,
        },
      };
    } catch (error: any) {
      this.logger.error('Error in clockIn service:', error);
      throw error;
    }
  }

  /**
   * Clock out employee - creates time attendance event and calculates hours
   */
  async clockOut(employeeId: string, location: any, organizationId: string, userId: string) {
    try {
      // Find the most recent clock-in event without a corresponding clock-out
      const clockInSql = `
        SELECT id, event_timestamp
        FROM payroll.time_attendance_event
        WHERE employee_id = $1 
          AND organization_id = $2
          AND event_type = 'clock_in'
          AND DATE(event_timestamp) = CURRENT_DATE
          AND deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll.time_attendance_event AS te_out
            WHERE te_out.employee_id = time_attendance_event.employee_id
              AND te_out.organization_id = time_attendance_event.organization_id
              AND te_out.event_type = 'clock_out'
              AND te_out.event_timestamp > time_attendance_event.event_timestamp
              AND DATE(te_out.event_timestamp) = CURRENT_DATE
              AND te_out.deleted_at IS NULL
          )
        ORDER BY event_timestamp DESC
        LIMIT 1
      `;

      const clockInResult = await query(
        clockInSql,
        [employeeId, organizationId],
        organizationId
      );

      if (clockInResult.rows.length === 0) {
        throw new Error('No active clock-in found. Please clock in first.');
      }

      const clockInEvent = clockInResult.rows[0];

      // Create clock-out event
      const insertSql = `
        INSERT INTO payroll.time_attendance_event (
          organization_id,
          employee_id,
          event_type,
          event_timestamp,
          location_latitude,
          location_longitude,
          created_by
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6)
        RETURNING *
      `;

      const params = [
        organizationId,
        employeeId,
        'clock_out',
        location?.latitude || null,
        location?.longitude || null,
        userId
      ];

      const clockOutResult = await query(insertSql, params, organizationId, {
        operation: 'INSERT',
        table: 'payroll.time_attendance_event'
      });

      const clockOutEvent = clockOutResult.rows[0];

      // Calculate worked hours
      const clockInTime = new Date(clockInEvent.event_timestamp);
      const clockOutTime = new Date(clockOutEvent.event_timestamp);
      const workedMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60));
      const workedHours = (workedMinutes / 60).toFixed(2);

      // Create or update time entry
      const timeEntrySql = `
        INSERT INTO payroll.time_entry (
          organization_id,
          employee_id,
          entry_date,
          clock_in,
          clock_out,
          worked_hours,
          regular_hours,
          clock_in_event_id,
          clock_out_event_id,
          status,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (organization_id, employee_id, entry_date, clock_in_event_id)
        DO UPDATE SET
          clock_out = EXCLUDED.clock_out,
          clock_out_event_id = EXCLUDED.clock_out_event_id,
          worked_hours = EXCLUDED.worked_hours,
          regular_hours = EXCLUDED.regular_hours,
          updated_by = EXCLUDED.created_by,
          updated_at = NOW()
        RETURNING *
      `;

      const timeEntryParams = [
        organizationId,
        employeeId,
        new Date().toISOString().split('T')[0],
        clockInTime,
        clockOutTime,
        parseFloat(workedHours),
        parseFloat(workedHours), // Assuming all hours are regular for now
        clockInEvent.id,
        clockOutEvent.id,
        'pending',
        userId
      ];

      const timeEntryResult = await query(timeEntrySql, timeEntryParams, organizationId, {
        operation: 'INSERT',
        table: 'payroll.time_entry'
      });

      this.logger.info('Employee clocked out successfully', {
        employeeId,
        organizationId,
        workedHours,
        clockInId: clockInEvent.id,
        clockOutId: clockOutEvent.id
      });

      return {
        clockOut: clockOutEvent,
        timeEntry: timeEntryResult.rows[0],
        workedHours: parseFloat(workedHours)
      };
    } catch (error: any) {
      this.logger.error('Error in clockOut service:', error);
      throw error;
    }
  }

  /**
   * Get employee's shifts with optional date filtering
   */
  async getEmployeeShifts(employeeId: string, filters: any, organizationId: string) {
    try {
      let sql = `
        SELECT 
          s.id,
          s.schedule_id,
          s.worker_id,
          s.station_id,
          s.role_id,
          s.start_time,
          s.end_time,
          s.break_duration,
          s.status,
          s.notes,
          s.clock_in_time,
          s.clock_out_time,
          st.name AS station_name,
          st.location AS station_location,
          r.name AS role_name,
          sch.title AS schedule_title
        FROM scheduling.shift s
        LEFT JOIN scheduling.station st ON s.station_id = st.id
        LEFT JOIN scheduling.role r ON s.role_id = r.id
        LEFT JOIN scheduling.schedule sch ON s.schedule_id = sch.id
        WHERE s.worker_id = (
          SELECT id FROM scheduling.worker 
          WHERE employee_id = $1 AND organization_id = $2
          LIMIT 1
        )
        AND s.organization_id = $2
        AND s.deleted_at IS NULL
      `;

      const params: any[] = [employeeId, organizationId];
      let paramIndex = 3;

      // Add date filtering
      if (filters.date) {
        sql += ` AND DATE(s.start_time) = $${paramIndex}`;
        params.push(filters.date);
        paramIndex++;
      } else if (filters.startDate && filters.endDate) {
        sql += ` AND DATE(s.start_time) >= $${paramIndex} AND DATE(s.start_time) <= $${paramIndex + 1}`;
        params.push(filters.startDate, filters.endDate);
        paramIndex += 2;
      } else if (filters.startDate) {
        sql += ` AND DATE(s.start_time) >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      sql += ` ORDER BY s.start_time DESC LIMIT 100`;

      const result = await query(sql, params, organizationId);

      return result.rows;
    } catch (error: any) {
      this.logger.error('Error in getEmployeeShifts service:', error);
      throw error;
    }
  }

  /**
   * Get employee's current clock-in status
   */
  async getClockStatus(employeeId: string, organizationId: string) {
    try {
      const sql = `
        SELECT 
          id,
          event_type,
          event_timestamp,
          location_latitude,
          location_longitude
        FROM payroll.time_attendance_event
        WHERE employee_id = $1 
          AND organization_id = $2
          AND DATE(event_timestamp) = CURRENT_DATE
          AND deleted_at IS NULL
        ORDER BY event_timestamp DESC
        LIMIT 2
      `;

      const result = await query(sql, [employeeId, organizationId], organizationId);

      // Determine if currently clocked in
      const events = result.rows;
      let isClockedIn = false;
      let lastClockIn = null;
      let lastClockOut = null;

      if (events.length > 0) {
        // Check most recent event
        const mostRecent = events[0];
        if (mostRecent.event_type === 'clock_in') {
          isClockedIn = true;
          lastClockIn = mostRecent;
        } else if (mostRecent.event_type === 'clock_out') {
          lastClockOut = mostRecent;
          // Check if there's a clock-in before this clock-out
          if (events.length > 1 && events[1].event_type === 'clock_in') {
            lastClockIn = events[1];
          }
        }
      }

      return {
        isClockedIn,
        lastClockIn,
        lastClockOut
      };
    } catch (error: any) {
      this.logger.error('Error in getClockStatus service:', error);
      throw error;
    }
  }
}

export default EmployeeScheduleService;
