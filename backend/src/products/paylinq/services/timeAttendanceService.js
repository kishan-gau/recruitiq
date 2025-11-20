/**
 * Time Attendance Service
 * 
 * Business logic layer for time and attendance tracking, clock events, and time entry management.
 * Handles clock in/out operations, time entry approval, and rated time line calculations.
 * 
 * MVP Version: Basic clock in/out, manual time entry, approval workflow
 * Phase 2: Biometric integration, GPS verification, automated overtime calculation, mobile app support
 * 
 * @module products/paylinq/services/timeAttendanceService
 */

import Joi from 'joi';
import TimeAttendanceRepository from '../repositories/timeAttendanceRepository.js';
import PayComponentRepository from '../repositories/payComponentRepository.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import { nowUTC, toUTCDateString, calculateHours, formatForDatabase } from '../../../utils/timezone.js';

class TimeAttendanceService {
  constructor(timeAttendanceRepository = null, payComponentRepository = null) {
    this.timeAttendanceRepository = timeAttendanceRepository || new TimeAttendanceRepository();
    this.payComponentRepository = payComponentRepository || new PayComponentRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  shiftTypeSchema = Joi.object({
    shiftName: Joi.string().min(2).max(100).required(),
    shiftCode: Joi.string().min(2).max(50).required(),
    startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(), // HH:MM format
    endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    durationHours: Joi.number().min(0).max(24).required(),
    isOvernight: Joi.boolean().default(false),
    breakDurationMinutes: Joi.number().min(0).default(0),
    isPaidBreak: Joi.boolean().default(false),
    shiftDifferentialRate: Joi.number().min(0).allow(null),
    description: Joi.string().max(500).allow(null, '')
  });

  clockEventSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    eventType: Joi.string().valid('clock_in', 'clock_out', 'break_start', 'break_end').required(),
    eventTimestamp: Joi.date().default(() => nowUTC()),
    locationId: Joi.string().uuid().allow(null),
    gpsLatitude: Joi.number().min(-90).max(90).allow(null),
    gpsLongitude: Joi.number().min(-180).max(180).allow(null),
    deviceId: Joi.string().max(100).allow(null, ''),
    ipAddress: Joi.string().ip().allow(null, ''),
    notes: Joi.string().max(500).allow(null, '')
  });

  timeEntrySchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    entryDate: Joi.date().required(),
    clockIn: Joi.date().allow(null),
    clockOut: Joi.date().allow(null),
    workedHours: Joi.number().min(0).default(0),
    regularHours: Joi.number().min(0).default(0),
    overtimeHours: Joi.number().min(0).default(0),
    breakHours: Joi.number().min(0).default(0),
    shiftTypeId: Joi.string().uuid().allow(null),
    entryType: Joi.string().valid('regular', 'pto', 'sick', 'holiday', 'unpaid').default('regular'),
    status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected', 'processed').default('draft'),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== SHIFT TYPES ====================

  /**
   * Create shift type
   * @param {Object} shiftData - Shift type data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the shift type
   * @returns {Promise<Object>} Created shift type
   */
  async createShiftType(shiftData, organizationId, userId) {
    const { error, value } = this.shiftTypeSchema.validate(shiftData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const shiftType = await this.timeAttendanceRepository.createShiftType(
        value,
        organizationId,
        userId
      );

      logger.info('Shift type created', {
        shiftTypeId: shiftType.id,
        shiftCode: shiftType.shift_code,
        organizationId
      });

      return shiftType;
    } catch (err) {
      logger.error('Error creating shift type', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get shift types
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Shift types
   */
  async getShiftTypes(organizationId, filters = {}) {
    try {
      return await this.timeAttendanceRepository.findShiftTypes(organizationId, filters);
    } catch (err) {
      logger.error('Error fetching shift types', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get shift type by ID
   * @param {string} shiftTypeId - Shift type UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Shift type
   */
  async getShiftTypeById(shiftTypeId, organizationId) {
    try {
      const shiftType = await this.timeAttendanceRepository.findShiftTypeById(shiftTypeId, organizationId);
      
      if (!shiftType) {
        throw new NotFoundError('Shift type not found');
      }

      return shiftType;
    } catch (err) {
      logger.error('Error fetching shift type', { error: err.message, shiftTypeId, organizationId });
      throw err;
    }
  }

  /**
   * Get shift type by code
   * @param {string} shiftCode - Shift code
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Shift type
   */
  async getShiftTypeByCode(shiftCode, organizationId) {
    try {
      const shiftType = await this.timeAttendanceRepository.findShiftTypeByCode(shiftCode, organizationId);
      
      if (!shiftType) {
        throw new NotFoundError('Shift type not found');
      }

      return shiftType;
    } catch (err) {
      logger.error('Error fetching shift type by code', { error: err.message, shiftCode, organizationId });
      throw err;
    }
  }

  /**
   * Get all shift types
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Shift types
   */
  async getAllShiftTypes(organizationId, filters = {}) {
    return this.getShiftTypes(organizationId, filters);
  }

  /**
   * Update shift type
   * @param {string} shiftTypeId - Shift type UUID
   * @param {Object} updateData - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing update
   * @returns {Promise<Object>} Updated shift type
   */
  async updateShiftType(shiftTypeId, updateData, organizationId, userId) {
    // Create partial schema for updates (all fields optional)
    const updateSchema = this.shiftTypeSchema.fork(
      ['shiftCode', 'shiftName', 'startTime', 'endTime', 'durationHours'],
      (schema) => schema.optional()
    );

    // Validate update data (partial validation)
    const { error, value } = updateSchema.validate(updateData, { 
      allowUnknown: false,
      stripUnknown: true 
    });
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Verify shift type exists
      await this.getShiftTypeById(shiftTypeId, organizationId);

      const updatedShiftType = await this.timeAttendanceRepository.updateShiftType(
        shiftTypeId,
        value,
        organizationId,
        userId
      );

      logger.info('Shift type updated', {
        shiftTypeId,
        organizationId
      });

      return updatedShiftType;
    } catch (err) {
      logger.error('Error updating shift type', { error: err.message, shiftTypeId, organizationId });
      throw err;
    }
  }

  /**
   * Delete shift type
   * @param {string} shiftTypeId - Shift type UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing delete
   * @returns {Promise<void>}
   */
  async deleteShiftType(shiftTypeId, organizationId, userId) {
    try {
      // Verify shift type exists
      await this.getShiftTypeById(shiftTypeId, organizationId);

      // Check if shift type is in use
      const { query } = await import('../../../config/database.js');
      const usageCheck = await query(
        `SELECT COUNT(*) as count FROM payroll.time_entry
         WHERE shift_type_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
        [shiftTypeId, organizationId],
        organizationId
      );

      const usageCount = parseInt(usageCheck.rows[0].count);
      if (usageCount > 0) {
        throw new Error(`Cannot delete shift type that is used in ${usageCount} time entries. Consider marking it as inactive instead.`);
      }

      await this.timeAttendanceRepository.deleteShiftType(shiftTypeId, organizationId, userId);

      logger.info('Shift type deleted', {
        shiftTypeId,
        organizationId
      });
    } catch (err) {
      logger.error('Error deleting shift type', { error: err.message, shiftTypeId, organizationId });
      throw err;
    }
  }

  // ==================== CLOCK EVENTS ====================

  /**
   * Clock in employee
   * @param {Object} clockData - Clock in data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User initiating clock in
   * @returns {Promise<Object>} Created clock event
   */
  async clockIn(clockData, organizationId, userId) {
    try {
      // Business rule: Check if already clocked in
      const openEvent = await this.timeAttendanceRepository.findOpenClockEvent(
        clockData.employeeId,
        organizationId
      );

      if (openEvent) {
        throw new Error('Employee is already clocked in. Please clock out first.');
      }

      const clockEvent = await this.createClockEvent(
        { ...clockData, eventType: 'clock_in' },
        organizationId,
        userId
      );

      logger.info('Employee clocked in', {
        employeeId: clockData.employeeId,
        eventId: clockEvent.id,
        timestamp: clockEvent.event_timestamp,
        organizationId
      });

      return clockEvent;
    } catch (err) {
      logger.error('Error clocking in employee', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Clock out employee
   * @param {Object} clockData - Clock out data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User initiating clock out
   * @returns {Promise<Object>} Clock out result with time entry
   */
  async clockOut(clockData, organizationId, userId) {
    try {
      // Business rule: Must have open clock event
      const clockInEvent = await this.timeAttendanceRepository.findOpenClockEvent(
        clockData.employeeId,
        organizationId
      );

      if (!clockInEvent) {
        throw new Error('No open clock in event found. Please clock in first.');
      }

      // Create clock out event
      const clockOutEvent = await this.createClockEvent(
        { ...clockData, eventType: 'clock_out' },
        organizationId,
        userId
      );

      // Calculate worked hours
      const clockInTime = new Date(clockInEvent.event_timestamp);
      const clockOutTime = new Date(clockOutEvent.event_timestamp);
      const workedMilliseconds = clockOutTime - clockInTime;
      const workedHours = workedMilliseconds / (1000 * 60 * 60);

      // MVP: Simple overtime calculation (>8 hours = overtime)
      const regularHours = Math.min(workedHours, 8);
      const overtimeHours = Math.max(workedHours - 8, 0);

      // Create time entry (entryDate as date-only in UTC)
      const timeEntry = await this.timeAttendanceRepository.createTimeEntry(
        {
          employeeId: clockData.employeeId,
          entryDate: toUTCDateString(clockInTime),
          clockIn: clockInTime,
          clockOut: clockOutTime,
          workedHours,
          regularHours,
          overtimeHours,
          breakHours: 0,
          shiftTypeId: clockInEvent.shift_type_id,
          entryType: 'regular',
          status: 'draft',
          clockInEventId: clockInEvent.id,
          clockOutEventId: clockOutEvent.id
        },
        organizationId,
        userId
      );

      logger.info('Employee clocked out', {
        employeeId: clockData.employeeId,
        clockInTime,
        clockOutTime,
        workedHours,
        timeEntryId: timeEntry.id,
        organizationId
      });

      return {
        clockOutEvent,
        timeEntry,
        summary: {
          clockInTime,
          clockOutTime,
          workedHours,
          regularHours,
          overtimeHours
        }
      };
    } catch (err) {
      logger.error('Error clocking out employee', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Create clock event
   * @param {Object} eventData - Clock event data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the event
   * @returns {Promise<Object>} Created clock event
   */
  async createClockEvent(eventData, organizationId, userId) {
    const { error, value } = this.clockEventSchema.validate(eventData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      return await this.timeAttendanceRepository.createTimeEvent(
        value,
        organizationId,
        userId
      );
    } catch (err) {
      logger.error('Error creating clock event', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== TIME ENTRIES ====================

  /**
   * Create time entry (manual entry)
   * @param {Object} entryData - Time entry data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the entry
   * @returns {Promise<Object>} Created time entry
   */
  async createTimeEntry(entryData, organizationId, userId) {
    const { error, value } = this.timeEntrySchema.validate(entryData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate hours calculation
    const totalCalculated = value.regularHours + value.overtimeHours + value.breakHours;
    if (Math.abs(totalCalculated - value.workedHours) > 0.01) {
      throw new Error('Worked hours must equal sum of regular, overtime, and break hours');
    }

    try {
      const timeEntry = await this.timeAttendanceRepository.createTimeEntry(
        value,
        organizationId,
        userId
      );

      logger.info('Time entry created', {
        timeEntryId: timeEntry.id,
        employeeId: timeEntry.employee_id,
        workedHours: timeEntry.worked_hours,
        organizationId
      });

      return timeEntry;
    } catch (err) {
      logger.error('Error creating time entry', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get time entries
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Time entries
   */
  async getTimeEntries(organizationId, filters = {}) {
    try {
      return await this.timeAttendanceRepository.findTimeEntries(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching time entries', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get time entry by ID
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Time entry or null if not found
   */
  async getTimeEntryById(timeEntryId, organizationId) {
    try {
      const timeEntry = await this.timeAttendanceRepository.findTimeEntryById(
        timeEntryId,
        organizationId
      );

      return timeEntry; // Return null if not found, let controller handle 404
    } catch (err) {
      logger.error('Error fetching time entry', { error: err.message, timeEntryId });
      throw err;
    }
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
    try {
      // Business rule: Can only update draft entries
      const existing = await this.getTimeEntryById(timeEntryId, organizationId);
      if (existing.status !== 'draft') {
        throw new Error(`Cannot update time entry with status: ${existing.status}`);
      }

      const timeEntry = await this.timeAttendanceRepository.updateTimeEntry(
        timeEntryId,
        updates,
        organizationId,
        userId
      );

      logger.info('Time entry updated', {
        timeEntryId,
        updatedFields: Object.keys(updates),
        organizationId
      });

      return timeEntry;
    } catch (err) {
      logger.error('Error updating time entry', { error: err.message, timeEntryId });
      throw err;
    }
  }

  /**
   * Approve time entry
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User approving the entry
   * @returns {Promise<Object>} Approved time entry with rated time lines
   */
  async approveTimeEntry(timeEntryId, organizationId, userId) {
    try {
      // Update status to approved
      const timeEntry = await this.timeAttendanceRepository.updateTimeEntryStatus(
        timeEntryId,
        'approved',
        organizationId,
        userId
      );

      // Create rated time lines (convert hours to pay amounts)
      await this.createRatedTimeLines(timeEntry, organizationId, userId);

      logger.info('Time entry approved', {
        timeEntryId,
        approvedBy: userId,
        organizationId
      });

      return timeEntry;
    } catch (err) {
      logger.error('Error approving time entry', { error: err.message, timeEntryId });
      throw err;
    }
  }

  /**
   * Reject time entry
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User rejecting the entry
   * @returns {Promise<Object>} Rejected time entry
   */
  async rejectTimeEntry(timeEntryId, organizationId, userId) {
    try {
      const timeEntry = await this.timeAttendanceRepository.updateTimeEntryStatus(
        timeEntryId,
        'rejected',
        organizationId,
        userId
      );

      logger.info('Time entry rejected', {
        timeEntryId,
        rejectedBy: userId,
        organizationId
      });

      return timeEntry;
    } catch (err) {
      logger.error('Error rejecting time entry', { error: err.message, timeEntryId });
      throw err;
    }
  }

  /**
   * Create rated time lines for approved time entry
   * @param {Object} timeEntry - Time entry object
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the rated time lines
   * @returns {Promise<Array>} Created rated time lines
   */
  async createRatedTimeLines(timeEntry, organizationId, userId) {
    try {
      // Get employee's pay components with custom rates
      const payComponents = await this.timeAttendanceRepository.findEmployeePayComponents(
        timeEntry.employee_id,
        organizationId
      );

      const ratedTimeLines = [];

      // Rate regular hours
      if (timeEntry.regular_hours > 0) {
        const regularComponent = payComponents.find(
          pc => pc.component_code === 'REGULAR_PAY' || pc.category === 'regular_pay'
        );

        if (regularComponent) {
          const rate = parseFloat(regularComponent.custom_rate || regularComponent.default_rate || 0);
          const amount = timeEntry.regular_hours * rate;

          const rateLine = await this.timeAttendanceRepository.createRatedTimeLine(
            {
              timeEntryId: timeEntry.id,
              payComponentId: regularComponent.id,
              hours: timeEntry.regular_hours,
              rate,
              amount
            },
            organizationId,
            userId
          );

          ratedTimeLines.push(rateLine);
        }
      }

      // Rate overtime hours
      if (timeEntry.overtime_hours > 0) {
        const overtimeComponent = payComponents.find(
          pc => pc.component_code === 'OVERTIME_PAY' || pc.category === 'overtime'
        );

        if (overtimeComponent) {
          const rate = parseFloat(overtimeComponent.custom_rate || overtimeComponent.default_rate || 0);
          const amount = timeEntry.overtime_hours * rate;

          const rateLine = await this.timeAttendanceRepository.createRatedTimeLine(
            {
              timeEntryId: timeEntry.id,
              payComponentId: overtimeComponent.id,
              hours: timeEntry.overtime_hours,
              rate,
              amount
            },
            organizationId,
            userId
          );

          ratedTimeLines.push(rateLine);
        }
      }

      logger.info('Rated time lines created', {
        timeEntryId: timeEntry.id,
        lineCount: ratedTimeLines.length,
        organizationId
      });

      return ratedTimeLines;
    } catch (err) {
      logger.error('Error creating rated time lines', { error: err.message, timeEntryId: timeEntry.id });
      throw err;
    }
  }

  /**
   * Get hours summary for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Hours summary
   */
  async getHoursSummary(employeeRecordId, fromDate, toDate, organizationId) {
    try {
      return await this.timeAttendanceRepository.getHoursSummary(
        employeeRecordId,
        fromDate,
        toDate,
        organizationId
      );
    } catch (err) {
      logger.error('Error fetching hours summary', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  // ==================== ALIAS METHODS FOR API COMPATIBILITY ====================

  /**
   * Alias: Get active clock entries
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Active clock entries
   */
  async getActiveClockEntries(organizationId) {
    try {
      return await this.timeAttendanceRepository.findActiveClockEntries(organizationId);
    } catch (err) {
      logger.error('Error fetching active clock entries', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Get clock history by employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (fromDate, toDate)
   * @returns {Promise<Array>} Clock history
   */
  async getClockHistoryByEmployee(employeeRecordId, organizationId, filters = {}) {
    try {
      return await this.timeAttendanceRepository.findClockEventsByEmployee(
        employeeRecordId,
        organizationId,
        filters
      );
    } catch (err) {
      logger.error('Error fetching clock history', { error: err.message, employeeRecordId, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Get time entries by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Time entries
   */
  async getTimeEntriesByOrganization(organizationId, filters = {}) {
    return this.getTimeEntries(organizationId, filters);
  }

  /**
   * Alias: Bulk approve time entries
   * @param {Array} timeEntryIds - Array of time entry UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User approving the entries
   * @returns {Promise<Object>} Bulk approval results
   */
  async bulkApproveTimeEntries(timeEntryIds, organizationId, userId) {
    try {
      const results = [];
      
      for (const timeEntryId of timeEntryIds) {
        try {
          const approved = await this.approveTimeEntry(timeEntryId, organizationId, userId);
          results.push({ timeEntryId, success: true, data: approved });
        } catch (err) {
          results.push({ timeEntryId, success: false, error: err.message });
        }
      }

      logger.info('Bulk time entry approval completed', {
        total: timeEntryIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        organizationId,
        userId
      });

      return {
        total: timeEntryIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (err) {
      logger.error('Error bulk approving time entries', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Delete time entry
   * @param {string} timeEntryId - Time entry UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the entry
   * @returns {Promise<boolean>} Success status
   */
  async deleteTimeEntry(timeEntryId, organizationId, userId) {
    try {
      // Soft delete by setting deleted_at
      const deleted = await this.timeAttendanceRepository.deleteTimeEntry(
        timeEntryId,
        organizationId,
        userId
      );

      if (deleted) {
        logger.info('Time entry deleted', { timeEntryId, organizationId, userId });
      }

      return deleted;
    } catch (err) {
      logger.error('Error deleting time entry', { error: err.message, timeEntryId, organizationId });
      throw err;
    }
  }

  // ==================== TIMESHEET WRAPPER METHODS ====================
  // These methods provide timesheet-terminology API wrappers around time_entry operations
  // for better alignment with business domain language

  /**
   * Create timesheet (wrapper for createTimeEntry)
   * @param {Object} timesheetData - Timesheet data
   * @returns {Promise<Object>} Created timesheet
   */
  async createTimesheet(timesheetData) {
    const organizationId = timesheetData.organizationId;
    const userId = timesheetData.createdBy;

    // Map timesheet fields to time entry fields
    const entryData = {
      employeeId: timesheetData.employeeId,  // Keep as employeeId for validation
      entryDate: timesheetData.periodStart || toUTCDateString(nowUTC()),
      workedHours: timesheetData.workedHours || 0,
      regularHours: timesheetData.regularHours || 0,
      overtimeHours: timesheetData.overtimeHours || 0,
      breakHours: timesheetData.breakHours || 0,
      shiftTypeId: timesheetData.shiftTypeId,
      entryType: timesheetData.entryType || 'regular',
      status: timesheetData.status || 'draft',
      notes: timesheetData.notes
    };

    return await this.createTimeEntry(entryData, organizationId, userId);
  }

  /**
   * Get timesheets by organization (wrapper for getTimeEntriesByOrganization)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Timesheets
   */
  async getTimesheetsByOrganization(organizationId, filters = {}) {
    return await this.getTimeEntriesByOrganization(organizationId, filters);
  }

  /**
   * Get timesheets by employee (wrapper for getTimeEntries with employee filter)
   * @param {string} employeeId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Timesheets
   */
  async getTimesheetsByEmployee(employeeId, organizationId, filters = {}) {
    const combinedFilters = {
      ...filters,
      employeeRecordId: employeeId
    };
    return await this.getTimeEntries(organizationId, combinedFilters);
  }

  /**
   * Get timesheets by payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Timesheets
   */
  async getTimesheetsByPayrollRun(payrollRunId, organizationId) {
    const filters = { payrollRunId };
    return await this.getTimeEntries(organizationId, filters);
  }

  /**
   * Get timesheet by ID (wrapper for getTimeEntryById)
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Timesheet or null
   */
  async getTimesheetById(timesheetId, organizationId) {
    return await this.getTimeEntryById(timesheetId, organizationId);
  }

  /**
   * Update timesheet (wrapper for updateTimeEntry)
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated timesheet
   */
  async updateTimesheet(timesheetId, organizationId, updateData) {
    const userId = updateData.updatedBy;
    return await this.updateTimeEntry(timesheetId, updateData, organizationId, userId);
  }

  /**
   * Submit timesheet for approval
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User submitting
   * @returns {Promise<Object>} Updated timesheet
   */
  async submitTimesheet(timesheetId, organizationId, userId) {
    const timesheet = await this.getTimeEntryById(timesheetId, organizationId);
    
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'draft') {
      throw new ConflictError('Only draft timesheets can be submitted');
    }

    const updates = { status: 'submitted' };
    return await this.updateTimeEntry(timesheetId, updates, organizationId, userId);
  }

  /**
   * Approve timesheet (wrapper for approveTimeEntry)
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User approving
   * @returns {Promise<Object>} Approved timesheet
   */
  async approveTimesheet(timesheetId, organizationId, userId) {
    return await this.approveTimeEntry(timesheetId, organizationId, userId);
  }

  /**
   * Reject timesheet (wrapper for rejectTimeEntry)
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User rejecting
   * @param {string} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} Rejected timesheet
   */
  async rejectTimesheet(timesheetId, organizationId, userId, rejectionReason) {
    const timesheet = await this.getTimeEntryById(timesheetId, organizationId);
    
    if (!timesheet) {
      throw new NotFoundError('Timesheet not found');
    }

    if (timesheet.status !== 'submitted') {
      throw new ConflictError('Only submitted timesheets can be rejected');
    }

    if (!rejectionReason) {
      throw new ValidationError('Rejection reason is required');
    }

    const updates = { 
      status: 'rejected',
      notes: rejectionReason 
    };
    
    // Call repository directly to bypass the draft-only business rule in updateTimeEntry
    return await this.timeAttendanceRepository.updateTimeEntry(
      timesheetId,
      updates,
      organizationId,
      userId
    );
  }

  /**
   * Delete timesheet (wrapper for deleteTimeEntry)
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting
   * @returns {Promise<boolean>} Success status
   */
  async deleteTimesheet(timesheetId, organizationId, userId) {
    return await this.deleteTimeEntry(timesheetId, organizationId, userId);
  }
}

export default TimeAttendanceService;
