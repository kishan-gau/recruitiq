/**
 * Paylinq Scheduling Controller
 * Handles HTTP requests for work schedule management
 */

import schedulingService from '../services/schedulingService.js';
import logger from '../../../utils/logger.js';
import { 
  mapScheduleApiToDb, 
  mapScheduleDbToApi, 
  mapSchedulesDbToApi,
  mapScheduleChangeRequestApiToDb,
  mapScheduleChangeRequestDbToApi,
  mapScheduleChangeRequestsDbToApi 
} from '../dto/schedulingDto.js';

/**
 * Create a work schedule
 * POST /api/paylinq/schedules
 * Supports both single schedule and bulk schedule creation
 */
async function createSchedule(req, res) {
  try {
    // RAW BODY LOGGING - before any processing
    console.log('=== RAW REQ.BODY ===');
    console.log('scheduleDate value:', req.body.scheduleDate);
    console.log('scheduleDate type:', typeof req.body.scheduleDate);
    console.log('scheduleDate constructor:', req.body.scheduleDate?.constructor?.name);
    console.log('Is Date object?:', req.body.scheduleDate instanceof Date);
    console.log('Full body:', JSON.stringify(req.body, null, 2));
    console.log('===================');
    
    const { organization_id: organizationId, id: userId } = req.user;
    
    // Validate required employeeId field
    if (!req.body.employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        errorCode: 'VALIDATION_ERROR',
        message: '"employeeId" is required',
      });
    }
    
    // Check if this is bulk schedule format (startDate/endDate/shifts) or single format (scheduleDate)
    const isBulkFormat = req.body.startDate && req.body.endDate;
    
    if (isBulkFormat) {
      // Bulk format: Create multiple schedule records from date range and shifts array
      const { employeeId, startDate, endDate, scheduleType, shifts } = req.body;
      
      // Map API field names to database schema names
      const mappedData = mapScheduleApiToDb({ employeeId, scheduleType });
      
      const schedules = await schedulingService.createBulkSchedules(
        mappedData.employee_id,
        startDate,
        endDate,
        shifts || [],
        mappedData.schedule_type,
        organizationId,
        userId
      );

      logger.info('Bulk schedules created', {
        organizationId,
        employeeId: mappedData.employee_id,
        count: schedules.length,
        userId,
      });

      return res.status(201).json({
        success: true,
        schedules: mapSchedulesDbToApi(schedules),
        count: schedules.length,
        message: 'Schedules created successfully',
      });
    }
    
    // Single format: Create one schedule record
    // Validate single format required fields
    if (!req.body.scheduleDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        errorCode: 'VALIDATION_ERROR',
        message: '"scheduleDate" is required for single schedule creation',
      });
    }
    
    logger.debug('Request body before mapping', { 
      body: req.body,
      scheduleDate: req.body.scheduleDate,
      scheduleDate_type: typeof req.body.scheduleDate 
    });
    
    const scheduleData = mapScheduleApiToDb(req.body);
    
    logger.debug('Schedule data after mapping', { 
      scheduleData,
      schedule_date: scheduleData.schedule_date,
      schedule_date_type: typeof scheduleData.schedule_date 
    });

    const schedule = await schedulingService.createWorkSchedule(
      scheduleData,
      organizationId,
      userId
    );

    logger.info('Work schedule created', {
      organizationId,
      scheduleId: schedule.id,
      employeeId: schedule.employee_id,
      userId,
    });

    res.status(201).json({
      success: true,
      schedule: mapScheduleDbToApi(schedule),
      message: 'Schedule created successfully',
    });
  } catch (_error) {
    logger.error('Error creating schedule', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        errorCode: 'SCHEDULE_CONFLICT',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      errorCode: 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

/**
 * Get schedules
 * GET /api/paylinq/schedules
 */
async function getSchedules(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { 
      employeeId, 
      startDate, 
      endDate, 
      status,
      page = 1,
      limit = 20,
      sortBy = 'scheduleDate',
      sortOrder = 'desc'
    } = req.query;

    const filters = {
      employeeId,
      startDate,
      endDate,
      status,
      page: parseInt(page, 10),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10))),
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
    };

    const result = await schedulingService.getSchedulesByOrganization(organizationId, filters);

    res.status(200).json({
      success: true,
      schedules: mapSchedulesDbToApi(result.schedules || result),
      pagination: result.pagination,
      count: result.schedules ? result.schedules.length : result.length,
    });
  } catch (_error) {
    logger.error('Error fetching schedules', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch schedules',
    });
  }
}

/**
 * Get schedules for an employee
 * @deprecated Use GET /api/paylinq/schedules?employeeId=xxx instead
 * 
 * This method is kept for backward compatibility but the route is removed.
 * The recommended approach is to use the main schedules endpoint with employeeId query parameter.
 */
async function getEmployeeSchedules(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const filters = { employeeId, startDate, endDate };
    const schedules = await schedulingService.getSchedulesByEmployee(
      employeeId,
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      schedules: mapSchedulesDbToApi(schedules),
      count: schedules.length,
    });
  } catch (_error) {
    logger.error('Error fetching employee schedules', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch employee schedules',
    });
  }
}

/**
 * Get a single schedule by ID
 * GET /api/paylinq/schedules/:id
 */
async function getScheduleById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const schedule = await schedulingService.getScheduleById(id, organizationId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        errorCode: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    res.status(200).json({
      success: true,
      schedule: mapScheduleDbToApi(schedule),
    });
  } catch (_error) {
    // Handle NotFoundError with 404 status
    if (error.name === 'NotFoundError' || error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        errorCode: 'SCHEDULE_NOT_FOUND',
        message: error.message || 'Schedule not found',
      });
    }

    logger.error('Error fetching schedule', {
      error: error.message,
      scheduleId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch schedule',
    });
  }
}

/**
 * Update a schedule
 * PUT /api/paylinq/schedules/:id
 */
async function updateSchedule(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    // Map API field names to database column names
    const mappedData = mapScheduleApiToDb(req.body);
    
    const updateData = {
      ...mappedData,
      updatedBy: userId,
    };

    const schedule = await schedulingService.updateWorkSchedule(id, updateData, organizationId, userId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        errorCode: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    logger.info('Schedule updated', {
      organizationId,
      scheduleId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      schedule: mapScheduleDbToApi(schedule),
      message: 'Schedule updated successfully',
    });
  } catch (_error) {
    logger.error('Error updating schedule', {
      error: error.message,
      scheduleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        errorCode: 'SCHEDULE_CONFLICT',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      errorCode: 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

/**
 * Delete a schedule
 * DELETE /api/paylinq/schedules/:id
 */
async function deleteSchedule(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await schedulingService.deleteWorkSchedule(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        errorCode: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    logger.info('Schedule deleted', {
      organizationId,
      scheduleId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (_error) {
    logger.error('Error deleting schedule', {
      error: error.message,
      scheduleId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete schedule',
    });
  }
}

/**
 * Create a schedule change request
 * POST /api/paylinq/schedule-change-requests
 */
async function createChangeRequest(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    
    // Map API field names to database column names
    const mappedData = mapScheduleChangeRequestApiToDb(req.body);
    
    // Get the work schedule to find the employee_id
    const schedule = await schedulingService.getScheduleById(mappedData.workScheduleId, organizationId);
    
    if (!schedule) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        errorCode: 'SCHEDULE_NOT_FOUND',
        message: 'Work schedule not found',
      });
    }
    
    const requestData = {
      ...mappedData,
      requestedBy: schedule.employee_id, // Use employee_id from schedule
    };

    const request = await schedulingService.createScheduleChangeRequest(requestData, organizationId, userId);

    logger.info('Schedule change request created', {
      organizationId,
      requestId: request.id,
      workScheduleId: request.work_schedule_id,
      userId,
    });

    res.status(201).json({
      success: true,
      request: request,
      message: 'Change request created successfully',
    });
  } catch (_error) {
    logger.error('Error creating schedule change request', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      errorCode: 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

/**
 * Get schedule change requests
 * GET /api/paylinq/schedule-change-requests
 */
async function getChangeRequests(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { 
      status, 
      employeeId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filters = { 
      status, 
      employeeId,
      page: parseInt(page, 10),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10))),
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
    };
    
    const result = await schedulingService.getScheduleChangeRequests(organizationId, filters);

    res.status(200).json({
      success: true,
      requests: result.requests || result,
      pagination: result.pagination,
      count: result.requests ? result.requests.length : result.length,
    });
  } catch (_error) {
    logger.error('Error fetching schedule change requests', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch change requests',
    });
  }
}

/**
 * Approve or reject a schedule change request
 * POST /api/paylinq/schedule-change-requests/:id/review
 */
async function reviewChangeRequest(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { action, reviewNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        errorCode: 'VALIDATION_ERROR',
        message: 'action must be either "approve" or "reject"',
      });
    }

    const result =
      action === 'approve'
        ? await schedulingService.approveScheduleChangeRequest(id, organizationId, userId, reviewNotes)
        : await schedulingService.rejectScheduleChangeRequest(id, organizationId, userId, reviewNotes);

    logger.info('Schedule change request reviewed', {
      organizationId,
      requestId: id,
      action,
      userId,
    });

    res.status(200).json({
      success: true,
      result: result,
      message: `Change request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (_error) {
    logger.error('Error reviewing schedule change request', {
      error: error.message,
      requestId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        errorCode: 'INVALID_STATE',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      errorCode: 'VALIDATION_ERROR',
      message: error.message,
    });
  }
}

export default {
  createSchedule,
  getSchedules,
  getEmployeeSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  createChangeRequest,
  getChangeRequests,
  reviewChangeRequest,
};
