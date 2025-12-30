/**
 * Paylinq Timesheet Controller
 * Handles HTTP requests for timesheet management and rated time lines
 */

import timeAttendanceService from '../services/timeAttendanceService.ts';
import { mapApiToDb } from '../utils/dtoMapper.ts';
import logger from '../../../utils/logger.ts';

/**
 * Create a timesheet
 * POST /api/paylinq/timesheets
 */
async function createTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const timesheetData = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const timesheet = await timeAttendanceService.createTimesheet(timesheetData);

    logger.info('Timesheet created', {
      organizationId,
      timesheetId: timesheet.id,
      employeeId: timesheet.employeeId,
      userId,
    });

    res.status(201).json({
      success: true,
      timesheet: timesheet,
      message: 'Timesheet created successfully',
    });
  } catch (error) {
    logger.error('Error creating timesheet', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get timesheets
 * GET /api/paylinq/timesheets
 */
async function getTimesheets(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, payrollRunId, status, startDate, endDate } = req.query;

    const filters = {
      employeeId,
      payrollRunId,
      status,
      startDate,
      endDate,
    };

    const timesheets = await timeAttendanceService.getTimesheetsByOrganization(
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      timesheets: timesheets,
      count: timesheets.length,
    });
  } catch (error) {
    logger.error('Error fetching timesheets', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch timesheets',
    });
  }
}

/**
 * Get timesheets for an employee
 * GET /api/paylinq/employees/:employeeId/timesheets
 */
async function getEmployeeTimesheets(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const filters = { startDate, endDate };
    const timesheets = await timeAttendanceService.getTimesheetsByEmployee(
      employeeId,
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      timesheets: timesheets,
      count: timesheets.length,
    });
  } catch (error) {
    logger.error('Error fetching employee timesheets', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee timesheets',
    });
  }
}

/**
 * Get timesheets for a payroll run
 * GET /api/paylinq/payroll-runs/:payrollRunId/timesheets
 */
async function getPayrollRunTimesheets(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { payrollRunId } = req.params;

    const timesheets = await timeAttendanceService.getTimesheetsByPayrollRun(
      payrollRunId,
      organizationId
    );

    res.status(200).json({
      success: true,
      timesheets: timesheets,
      count: timesheets.length,
    });
  } catch (error) {
    logger.error('Error fetching payroll run timesheets', {
      error: error.message,
      payrollRunId: req.params.payrollRunId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payroll run timesheets',
    });
  }
}

/**
 * Get a single timesheet by ID
 * GET /api/paylinq/timesheets/:id
 */
async function getTimesheetById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const timesheet = await timeAttendanceService.getTimesheetById(id, organizationId);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Timesheet not found',
      });
    }

    res.status(200).json({
      success: true,
      timesheet: timesheet,
    });
  } catch (error) {
    logger.error('Error fetching timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch timesheet',
    });
  }
}

/**
 * Update a timesheet
 * PUT /api/paylinq/timesheets/:id
 */
async function updateTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const timesheet = await timeAttendanceService.updateTimesheet(id, organizationId, updateData);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Timesheet not found',
      });
    }

    logger.info('Timesheet updated', {
      organizationId,
      timesheetId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      timesheet: timesheet,
      message: 'Timesheet updated successfully',
    });
  } catch (error) {
    logger.error('Error updating timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Submit a timesheet for approval
 * POST /api/paylinq/timesheets/:id/submit
 */
async function submitTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const timesheet = await timeAttendanceService.submitTimesheet(id, organizationId, userId);

    logger.info('Timesheet submitted', {
      organizationId,
      timesheetId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      timesheet: timesheet,
      message: 'Timesheet submitted successfully',
    });
  } catch (error) {
    logger.error('Error submitting timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Approve a timesheet
 * POST /api/paylinq/timesheets/:id/approve
 */
async function approveTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const timesheet = await timeAttendanceService.approveTimesheet(id, organizationId, userId);

    logger.info('Timesheet approved', {
      organizationId,
      timesheetId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      timesheet: timesheet,
      message: 'Timesheet approved successfully',
    });
  } catch (error) {
    logger.error('Error approving timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Reject a timesheet
 * POST /api/paylinq/timesheets/:id/reject
 */
async function rejectTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const timesheet = await timeAttendanceService.rejectTimesheet(
      id,
      organizationId,
      userId,
      rejectionReason
    );

    logger.info('Timesheet rejected', {
      organizationId,
      timesheetId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      timesheet: timesheet,
      message: 'Timesheet rejected successfully',
    });
  } catch (error) {
    logger.error('Error rejecting timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Create rated time lines from timesheet
 * POST /api/paylinq/timesheets/:id/create-rated-lines
 */
async function createRatedTimeLines(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const ratedLines = await timeAttendanceService.createRatedTimeLines(
      id,
      organizationId,
      userId
    );

    logger.info('Rated time lines created', {
      organizationId,
      timesheetId: id,
      linesCreated: ratedLines.length,
      userId,
    });

    res.status(201).json({
      success: true,
      ratedLines: ratedLines,
      count: ratedLines.length,
      message: 'Rated time lines created successfully',
    });
  } catch (error) {
    logger.error('Error creating rated time lines', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not approved')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Delete a timesheet
 * DELETE /api/paylinq/timesheets/:id
 */
async function deleteTimesheet(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await timeAttendanceService.deleteTimesheet(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Timesheet not found',
      });
    }

    logger.info('Timesheet deleted', {
      organizationId,
      timesheetId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Timesheet deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting timesheet', {
      error: error.message,
      timesheetId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete timesheet',
    });
  }
}

export default {
  createTimesheet,
  getTimesheets,
  getEmployeeTimesheets,
  getPayrollRunTimesheets,
  getTimesheetById,
  updateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  createRatedTimeLines,
  deleteTimesheet,
};
