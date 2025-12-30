/**
 * ScheduleHub Shift Service
 * Business logic for shift management and time tracking
 * Integrates with Paylinq for time entry recording
 */

import pool from '../../../config/database.ts';
import PaylinqIntegrationService from '../../paylinq/services/integrationService.ts';
import logger from '../../../utils/logger.ts';
import Joi from 'joi';

class ShiftService {
  constructor() {
    this.paylinqIntegration = new PaylinqIntegrationService();
    this.logger = logger;
  }

  // Validation schemas
  clockOutSchema = Joi.object({
    shiftId: Joi.string().uuid().required(),
    clockOutTime: Joi.date().required(),
    actualBreakMinutes: Joi.number().min(0).allow(null)
  });

  /**
   * Clock out employee and record time entry in Paylinq
   * 
   * @param {Object} clockOutData - Clock out data
   * @param {string} clockOutData.shiftId - Shift UUID
   * @param {Date} clockOutData.clockOutTime - Clock out timestamp
   * @param {number} clockOutData.actualBreakMinutes - Actual break minutes taken
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<Object>} Updated shift with payroll integration result
   */
  async clockOut(clockOutData, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate input
      const { error, value } = this.clockOutSchema.validate(clockOutData);
      if (error) {
        throw new Error(`Validation error: ${error.details[0].message}`);
      }

      const { shiftId, clockOutTime, actualBreakMinutes } = value;

      // Get shift details
      const shiftResult = await client.query(
        `SELECT 
          s.*,
          w.employee_id,
          w.first_name,
          w.last_name,
          w.employment_type
        FROM scheduling.shift s
        JOIN hris.employee w ON s.employee_id = w.id
        WHERE s.id = $1 
        AND s.organization_id = $2 
        AND s.deleted_at IS NULL`,
        [shiftId, organizationId]
      );

      if (shiftResult.rows.length === 0) {
        throw new Error('Shift not found');
      }

      const shift = shiftResult.rows[0];

      // Validate shift can be clocked out
      if (shift.status === 'completed') {
        throw new Error('Shift already completed');
      }

      if (shift.status === 'cancelled') {
        throw new Error('Cannot clock out cancelled shift');
      }

      if (!shift.clock_in_time) {
        throw new Error('Cannot clock out before clocking in');
      }

      if (shift.clock_out_time) {
        throw new Error('Shift already clocked out');
      }

      // Calculate hours worked
      const clockInTime = new Date(shift.clock_in_time);
      const clockOutTimeDate = new Date(clockOutTime);
      const totalMinutes = Math.floor((clockOutTimeDate - clockInTime) / 1000 / 60);
      const breakMinutes = actualBreakMinutes || shift.break_minutes || 0;
      const workedMinutes = totalMinutes - breakMinutes;
      const workedHours = workedMinutes / 60;

      // Calculate regular and overtime hours
      const standardDailyHours = 8;
      let regularHours = Math.min(workedHours, standardDailyHours);
      let overtimeHours = Math.max(0, workedHours - standardDailyHours);

      // For part-time workers, use their scheduled hours as standard
      if (shift.employment_type === 'part_time') {
        const scheduledHours = (shift.end_time - shift.start_time) / (1000 * 60 * 60);
        regularHours = Math.min(workedHours, scheduledHours);
        overtimeHours = Math.max(0, workedHours - scheduledHours);
      }

      // Update shift
      const updateResult = await client.query(
        `UPDATE scheduling.shift 
        SET clock_out_time = $1,
            actual_break_minutes = $2,
            actual_hours = $3,
            status = 'completed',
            updated_at = NOW(),
            updated_by = $4
        WHERE id = $5
        RETURNING *`,
        [clockOutTime, breakMinutes, workedHours, userId, shiftId]
      );

      const updatedShift = updateResult.rows[0];

      this.logger.info('Shift clocked out', {
        shiftId,
        workerId: shift.employee_id,
        workedHours,
        regularHours,
        overtimeHours,
        organizationId
      });

      // CROSS-PRODUCT INTEGRATION: ScheduleHub → Paylinq
      // Record time entry in Paylinq for payroll processing
      let payrollResult = null;
      try {
        payrollResult = await this.paylinqIntegration.recordTimeEntryFromScheduleHub({
          employeeId: shift.employee_id,
          shiftId: shift.id,
          organizationId,
          workDate: shift.shift_date,
          regularHours: parseFloat(regularHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          clockIn: shift.clock_in_time,
          clockOut: clockOutTime
        }, userId);

        this.logger.info('Time entry recorded in Paylinq', {
          shiftId,
          employeeId: shift.employee_id,
          timeEntryId: payrollResult.timeEntryId,
          organizationId
        });
      } catch (payrollError) {
        this.logger.error('Error recording time entry in Paylinq', {
          shiftId,
          employeeId: shift.employee_id,
          error: payrollError.message,
          stack: payrollError.stack
        });
        // Note: We don't throw - shift is still clocked out even if Paylinq fails
      }

      await client.query('COMMIT');

      return {
        shift: updatedShift,
        timeTracking: {
          workedHours: parseFloat(workedHours.toFixed(2)),
          regularHours: parseFloat(regularHours.toFixed(2)),
          overtimeHours: parseFloat(overtimeHours.toFixed(2)),
          breakMinutes
        },
        payrollIntegration: payrollResult,
        message: 'Shift completed and time entry recorded'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error clocking out shift', {
        shiftId: clockOutData.shiftId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Clock in employee to start shift
   * 
   * @param {string} shiftId - Shift UUID
   * @param {Date} clockInTime - Clock in timestamp
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the action
   * @returns {Promise<Object>} Updated shift
   */
  async clockIn(shiftId, clockInTime, organizationId, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get shift
      const shiftResult = await client.query(
        `SELECT * FROM scheduling.shift 
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [shiftId, organizationId]
      );

      if (shiftResult.rows.length === 0) {
        throw new Error('Shift not found');
      }

      const shift = shiftResult.rows[0];

      // Validate shift can be clocked in
      if (shift.status === 'completed') {
        throw new Error('Shift already completed');
      }

      if (shift.status === 'cancelled') {
        throw new Error('Cannot clock in to cancelled shift');
      }

      if (shift.clock_in_time) {
        throw new Error('Shift already clocked in');
      }

      // Update shift
      const updateResult = await client.query(
        `UPDATE scheduling.shift 
        SET clock_in_time = $1,
            status = 'in_progress',
            updated_at = NOW(),
            updated_by = $2
        WHERE id = $3
        RETURNING *`,
        [clockInTime, userId, shiftId]
      );

      await client.query('COMMIT');

      this.logger.info('Shift clocked in', {
        shiftId,
        workerId: shift.employee_id,
        organizationId
      });

      return {
        shift: updateResult.rows[0],
        message: 'Shift started successfully'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error clocking in shift', {
        shiftId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ShiftService;
