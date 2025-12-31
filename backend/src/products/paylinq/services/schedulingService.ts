/**
 * Scheduling Service
 * 
 * Business logic layer for work schedule management and schedule change requests.
 * Handles shift assignments, conflict detection, and change request approval workflow.
 * 
 * @module products/paylinq/services/schedulingService
 */

import Joi from 'joi';
import SchedulingRepository from '../repositories/schedulingRepository.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';

/**
 * Calculate duration in hours between two times, accounting for breaks
 * @param {string} startTime - Start time (HH:MM format)
 * @param {string} endTime - End time (HH:MM format)
 * @param {number} breakMinutes - Break duration in minutes
 * @returns {number} Duration in hours
 */
function calculateDuration(startTime, endTime, breakMinutes = 0) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const totalMinutes = endMinutes - startMinutes - breakMinutes;
  return totalMinutes / 60;
}

class SchedulingService {
  
  schedulingRepository: any;

constructor() {
    this.schedulingRepository = new SchedulingRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  workScheduleSchema = Joi.object({
    employee_id: Joi.string().uuid().required(),
    shift_type_id: Joi.string().uuid().allow(null),
    schedule_date: Joi.date().iso().raw().required(), // .raw() keeps it as string, no conversion
    start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    duration_hours: Joi.number().min(0).max(24).allow(null),
    break_minutes: Joi.number().min(0).allow(null),
    location: Joi.string().max(255).allow(null, ''),
    status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show').default('scheduled'),
    schedule_type: Joi.string().valid('regular', 'flexible', 'rotating', 'on_call', 'shift').allow(null, ''),
    notes: Joi.string().max(500).allow(null, ''),
    metadata: Joi.object().allow(null)
  });

  scheduleChangeRequestSchema = Joi.object({
    workScheduleId: Joi.string().uuid().required(),
    requestedBy: Joi.string().uuid().required(),
    requestType: Joi.string().valid('swap', 'change', 'cancel').required(),
    originalDate: Joi.date().raw().required(), // .raw() keeps it as string, no conversion
    proposedDate: Joi.date().raw().allow(null),
    originalShiftTypeId: Joi.string().uuid().allow(null),
    proposedShiftTypeId: Joi.string().uuid().allow(null),
    reason: Joi.string().min(5).max(500).required()
  });

  // ==================== WORK SCHEDULES ====================

  /**
   * Create bulk schedules from date range and shifts
   * @param {string} employeeId - Employee UUID  
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @param {Array} shifts - Array of shift definitions (dayOfWeek, startTime, endTime, breakMinutes)
   * @param {string} scheduleType - Schedule type (regular, flexible, etc.)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the schedules
   * @returns {Promise<Array>} Created work schedules
   */
  async createBulkSchedules(employeeId, startDate, endDate, shifts, scheduleType, organizationId, userId) {
    try {
      const createdSchedules = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date range
      if (start > end) {
        throw new ValidationError('Start date must be before end date');
      }
      
      // Create shifts array mapping (0=Sunday, 1=Monday, etc.)
      const shiftsByDay = {};
      if (shifts && shifts.length > 0) {
        shifts.forEach(shift => {
          shiftsByDay[shift.dayOfWeek] = shift;
        });
      }
      
      // Iterate through each date in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        const shift = shiftsByDay[dayOfWeek];
        
        // Skip if no shift defined for this day of week
        if (!shift) continue;
        
        const scheduleData = {
          employee_id: employeeId,
          schedule_date: date.toISOString().split('T')[0],
          start_time: shift.startTime,
          end_time: shift.endTime,
          break_minutes: shift.breakMinutes || 0,
          duration_hours: calculateDuration(shift.startTime, shift.endTime, shift.breakMinutes || 0),
          schedule_type: scheduleType || 'regular',
          status: 'scheduled'
        };
        
        // Check for conflicts
        const conflicts = await this.schedulingRepository.findScheduleConflicts(
          employeeId,
          scheduleData.schedule_date,
          scheduleData.start_time,
          scheduleData.end_time,
          organizationId
        );
        
        if (conflicts.length === 0) {
          const schedule = await this.schedulingRepository.createWorkSchedule(
            scheduleData,
            organizationId,
            userId
          );
          createdSchedules.push(schedule);
        }
      }
      
      logger.info('Bulk schedules created', {
        employeeId,
        count: createdSchedules.length,
        organizationId
      });
      
      return createdSchedules;
    } catch (err) {
      logger.error('Error creating bulk schedules', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Create work schedule
   * @param {Object} scheduleData - Work schedule data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the schedule
   * @returns {Promise<Object>} Created work schedule
   */
  async createWorkSchedule(scheduleData, organizationId, userId) {
    logger.debug('Creating work schedule - received data', { 
      scheduleData,
      schedule_date: scheduleData.schedule_date,
      schedule_date_type: typeof scheduleData.schedule_date 
    });
    
    // Calculate duration_hours if not provided
    if (!scheduleData.duration_hours && scheduleData.start_time && scheduleData.end_time) {
      scheduleData.duration_hours = calculateDuration(
        scheduleData.start_time,
        scheduleData.end_time,
        scheduleData.break_minutes || 0
      );
    }
    
    const { error, value } = this.workScheduleSchema.validate(scheduleData);
    if (error) {
      logger.error('Schedule validation failed', { 
        error: error.details[0].message,
        scheduleData 
      });
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Business rule: Check for schedule conflicts
      const conflicts = await this.schedulingRepository.findScheduleConflicts(
        value.employee_id,
        value.schedule_date,
        value.start_time,
        value.end_time,
        organizationId
      );

      if (conflicts.length > 0) {
        throw new Error('Schedule conflict detected. Employee already has a shift at this time.');
      }

      const schedule = await this.schedulingRepository.createWorkSchedule(
        value,
        organizationId,
        userId
      );

      logger.info('Work schedule created', {
        scheduleId: schedule.id,
        employeeId: schedule.employee_id,
        scheduleDate: schedule.schedule_date,
        organizationId
      });

      return schedule;
    } catch (err) {
      logger.error('Error creating work schedule', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get work schedules
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Work schedules
   */
  async getWorkSchedules(organizationId, filters = {}) {
    try {
      return await this.schedulingRepository.findWorkSchedules(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching work schedules', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get schedules by organization (alias for API compatibility)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (includes pagination)
   * @returns {Promise<Object>} Work schedules with pagination if requested
   */
  async getSchedulesByOrganization(organizationId, filters = {}) {
    try {
      // Check if pagination is requested
      if (filters.page && filters.limit) {
        const page = Math.max(1, parseInt(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
        
        // Get paginated results
        const result = await this.schedulingRepository.findWorkSchedulesPaginated(
          filters,
          organizationId,
          page,
          limit
        );
        
        return result;
      }
      
      // No pagination - return all matching schedules
      const schedules = await this.getWorkSchedules(organizationId, filters);
      return schedules;
    } catch (err) {
      logger.error('Error fetching schedules by organization', { 
        error: err.message, 
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Get schedules by employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Work schedules for employee
   */
  async getSchedulesByEmployee(employeeId, organizationId, filters = {}) {
    try {
      return await this.schedulingRepository.findWorkSchedules(
        { ...filters, employeeId },
        organizationId
      );
    } catch (err) {
      logger.error('Error fetching schedules by employee', { 
        error: err.message, 
        employeeId,
        organizationId 
      });
      throw err;
    }
  }

  /**
   * Get schedule by ID (alias for API compatibility)
   * @param {string} scheduleId - Work schedule UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Work schedule
   */
  async getScheduleById(scheduleId, organizationId) {
    return this.getWorkScheduleById(scheduleId, organizationId);
  }

  /**
   * Get work schedule by ID
   * @param {string} scheduleId - Work schedule UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Work schedule
   */
  async getWorkScheduleById(scheduleId, organizationId) {
    try {
      const schedule = await this.schedulingRepository.findWorkScheduleById(scheduleId, organizationId);
      if (!schedule) {
        throw new NotFoundError('Work schedule not found');
      }
      return schedule;
    } catch (err) {
      logger.error('Error fetching work schedule', { error: err.message, scheduleId });
      throw err;
    }
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
    try {
      // If updating time, check for conflicts
      if (updates.scheduleDate || updates.startTime || updates.endTime) {
        const existing = await this.getWorkScheduleById(scheduleId, organizationId);
        
        const conflicts = await this.schedulingRepository.findScheduleConflicts(
          existing.employee_id,
          updates.scheduleDate || existing.schedule_date,
          updates.startTime || existing.start_time,
          updates.endTime || existing.end_time,
          organizationId,
          scheduleId // Exclude current schedule
        );

        if (conflicts.length > 0) {
          throw new Error('Schedule conflict detected. Employee already has a shift at this time.');
        }
      }

      const schedule = await this.schedulingRepository.updateWorkSchedule(
        scheduleId,
        updates,
        organizationId,
        userId
      );

      logger.info('Work schedule updated', {
        scheduleId,
        updatedFields: Object.keys(updates),
        organizationId
      });

      return schedule;
    } catch (err) {
      logger.error('Error updating work schedule', { error: err.message, scheduleId });
      throw err;
    }
  }

  /**
   * Delete work schedule
   * @param {string} scheduleId - Work schedule UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the schedule
   * @returns {Promise<boolean>} Success status
   */
  async deleteWorkSchedule(scheduleId, organizationId, userId) {
    try {
      const deleted = await this.schedulingRepository.deleteWorkSchedule(
        scheduleId,
        organizationId,
        userId
      );

      if (deleted) {
        logger.info('Work schedule deleted', { scheduleId, organizationId });
      }

      return deleted;
    } catch (err) {
      logger.error('Error deleting work schedule', { error: err.message, scheduleId });
      throw err;
    }
  }

  /**
   * Bulk create work schedules
   * @param {Array} schedules - Array of schedule objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the schedules
   * @returns {Promise<Array>} Creation results
   */
  async bulkCreateWorkSchedules(schedules, organizationId, userId) {
    try {
      const results = [];

      for (const schedule of schedules) {
        try {
          const result = await this.createWorkSchedule(schedule, organizationId, userId);
          results.push({ success: true, data: result });
        } catch (err) {
          results.push({
            success: false,
            error: err.message,
            employeeId: schedule.employeeId,
            scheduleDate: schedule.scheduleDate
          });
        }
      }

      logger.info('Bulk schedule creation completed', {
        total: schedules.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error in bulk schedule creation', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get schedule statistics
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Schedule statistics
   */
  async getScheduleStatistics(startDate, endDate, organizationId) {
    try {
      return await this.schedulingRepository.getScheduleStatistics(
        startDate,
        endDate,
        organizationId
      );
    } catch (err) {
      logger.error('Error fetching schedule statistics', { error: err.message, organizationId });
      throw err;
    }
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
    const { error, value } = this.scheduleChangeRequestSchema.validate(requestData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate request type requirements
    if (value.requestType === 'swap' || value.requestType === 'change') {
      if (!value.proposedDate) {
        throw new Error('Proposed date is required for swap/change requests');
      }
    }

    try {
      // Verify schedule exists
      await this.getWorkScheduleById(value.workScheduleId, organizationId);

      const request = await this.schedulingRepository.createScheduleChangeRequest(
        value,
        organizationId,
        userId
      );

      logger.info('Schedule change request created', {
        requestId: request.id,
        requestType: request.request_type,
        workScheduleId: request.work_schedule_id,
        organizationId
      });

      return request;
    } catch (err) {
      logger.error('Error creating schedule change request', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get schedule change requests
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (includes pagination)
   * @returns {Promise<Object|Array>} Schedule change requests with pagination if requested
   */
  async getScheduleChangeRequests(organizationId, filters = {}) {
    try {
      // Check if pagination is requested
      if (filters.page && filters.limit) {
        const page = Math.max(1, parseInt(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
        
        // Get paginated results
        const result = await this.schedulingRepository.findScheduleChangeRequestsPaginated(
          filters,
          organizationId,
          page,
          limit
        );
        
        return result;
      }
      
      // No pagination - return all matching requests
      const requests = await this.schedulingRepository.findScheduleChangeRequests(filters, organizationId);
      return requests;
    } catch (err) {
      logger.error('Error fetching schedule change requests', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Approve schedule change request
   * @param {string} requestId - Schedule change request UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User approving the request
   * @returns {Promise<Object>} Approved request with updated schedule
   */
  async approveScheduleChangeRequest(requestId, organizationId, userId) {
    try {
      // Get request details
      const request = await this.schedulingRepository.findScheduleChangeRequestById(
        requestId,
        organizationId
      );

      if (!request) {
        throw new NotFoundError('Schedule change request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot approve request with status: ${request.status}`);
      }

      // Update request status
      await this.schedulingRepository.updateScheduleChangeRequestStatus(
        requestId,
        'approved',
        organizationId,
        userId
      );

      // Apply changes to schedule based on request type
      if (request.request_type === 'cancel') {
        await this.schedulingRepository.updateWorkSchedule(
          request.work_schedule_id,
          { status: 'cancelled' },
          organizationId,
          userId
        );
      } else if (request.request_type === 'change') {
        const updates = {};
        if (request.proposed_date) {
          updates.scheduleDate = request.proposed_date;
        }
        if (request.proposed_shift_type_id) {
          updates.shiftTypeId = request.proposed_shift_type_id;
        }
        
        await this.schedulingRepository.updateWorkSchedule(
          request.work_schedule_id,
          updates,
          organizationId,
          userId
        );
      }

      logger.info('Schedule change request approved', {
        requestId,
        requestType: request.request_type,
        approvedBy: userId,
        organizationId
      });

      return request;
    } catch (err) {
      logger.error('Error approving schedule change request', { error: err.message, requestId });
      throw err;
    }
  }

  /**
   * Reject schedule change request
   * @param {string} requestId - Schedule change request UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User rejecting the request
   * @returns {Promise<Object>} Rejected request
   */
  async rejectScheduleChangeRequest(requestId, organizationId, userId) {
    try {
      const request = await this.schedulingRepository.updateScheduleChangeRequestStatus(
        requestId,
        'rejected',
        organizationId,
        userId
      );

      logger.info('Schedule change request rejected', {
        requestId,
        rejectedBy: userId,
        organizationId
      });

      return request;
    } catch (err) {
      logger.error('Error rejecting schedule change request', { error: err.message, requestId });
      throw err;
    }
  }
}

// Export singleton instance
export default new SchedulingService();
