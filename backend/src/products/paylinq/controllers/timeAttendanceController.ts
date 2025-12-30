/**
 * Paylinq Time and Attendance Controller
 * Handles HTTP requests for time tracking and attendance management
 */

import TimeAttendanceService from '../services/timeAttendanceService.js';
import { mapApiToDb } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

// Instantiate service
const timeAttendanceService = new TimeAttendanceService();

/**
 * Clock in an employee
 * POST /api/paylinq/time-attendance/clock-in
 */
async function clockIn(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const clockData = {
      ...req.body,
      organizationId,
      userId,
    };

    const clockEntry = await timeAttendanceService.clockIn(clockData);

    logger.info('Employee clocked in', {
      organizationId,
      employeeId: clockEntry.employeeId,
      clockEntryId: clockEntry.id,
    });

    res.status(201).json({
      success: true,
      clockEntry: clockEntry,
      message: 'Clocked in successfully',
    });
  } catch (error) {
    logger.error('Error clocking in', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('already clocked in')) {
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
 * Clock out an employee
 * POST /api/paylinq/time-attendance/clock-out
 */
async function clockOut(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const clockData = {
      ...req.body,
      organizationId,
      userId,
    };

    const result = await timeAttendanceService.clockOut(clockData);

    logger.info('Employee clocked out', {
      organizationId,
      employeeId: result.clockEntry.employeeId,
      clockEntryId: result.clockEntry.id,
      hoursWorked: result.timeEntry.hoursWorked,
    });

    res.status(200).json({
      success: true,
      result: result,
      message: 'Clocked out successfully',
    });
  } catch (error) {
    logger.error('Error clocking out', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('No active clock-in')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
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
 * Get active clock entries
 * GET /api/paylinq/time-attendance/active-clocks
 */
async function getActiveClockEntries(req, res) {
  try {
    const organizationId = req.user.organization_id;

    const activeClocks = await timeAttendanceService.getActiveClockEntries(organizationId);

    res.status(200).json({
      success: true,
      activeClocks: activeClocks,
      count: activeClocks.length,
    });
  } catch (error) {
    logger.error('Error fetching active clock entries', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch active clock entries',
    });
  }
}

/**
 * Get clock history for an employee
 * GET /api/paylinq/employees/:employeeId/clock-history
 */
async function getEmployeeClockHistory(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    const filters = { startDate, endDate };
    const history = await timeAttendanceService.getClockHistoryByEmployee(
      employeeId,
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      history: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Error fetching clock history', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch clock history',
    });
  }
}

/**
 * Create a time entry manually
 * POST /api/paylinq/time-entries
 */
async function createTimeEntry(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const entryData = mapApiToDb(req.body);

    const timeEntry = await timeAttendanceService.createTimeEntry(entryData, organizationId, userId);

    logger.info('Time entry created', {
      organizationId,
      timeEntryId: timeEntry.id,
      employeeId: timeEntry.employeeId,
      userId,
    });

    res.status(201).json({
      success: true,
      timeEntry: timeEntry,
      message: 'Time entry created successfully',
    });
  } catch (error) {
    logger.error('Error creating time entry', {
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
 * Get time entries
 * GET /api/paylinq/time-entries
 */
async function getTimeEntries(req, res) {
  try {
    const organization_id = req.user.organization_id;
    const { employeeId, startDate, endDate, status } = req.query;

    const filters = {
      employeeId,
      startDate,
      endDate,
      status,
    };

    const entries = await timeAttendanceService.getTimeEntriesByOrganization(
      organization_id,
      filters
    );

    res.status(200).json({
      success: true,
      entries: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Error fetching time entries', {
      error: error.message,
      organization_id: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch time entries',
    });
  }
}

/**
 * Get a single time entry by ID
 * GET /api/paylinq/time-entries/:id
 */
async function getTimeEntryById(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    const timeEntry = await timeAttendanceService.getTimeEntryById(id, organizationId);

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    res.status(200).json({
      success: true,
      timeEntry: timeEntry,
    });
  } catch (error) {
    logger.error('Error fetching time entry', {
      error: error.message,
      timeEntryId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch time entry',
    });
  }
}

/**
 * Update a time entry
 * PUT /api/paylinq/time-entries/:id
 */
async function updateTimeEntry(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = mapApiToDb(req.body);

    const timeEntry = await timeAttendanceService.updateTimeEntry(id, updateData, organizationId, userId);

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    logger.info('Time entry updated', {
      organization_id,
      timeEntryId: id,
      id,
    });

    res.status(200).json({
      success: true,
      timeEntry: timeEntry,
      message: 'Time entry updated successfully',
    });
  } catch (error) {
    logger.error('Error updating time entry', {
      error: error.message,
      timeEntryId: req.params.id,
      organization_id: req.user?.organization_id,
      id: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Approve or reject time entries
 * POST /api/paylinq/time-entries/bulk-approve
 */
async function bulkApproveTimeEntries(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { timeEntryIds, action, rejectionReason } = req.body;

    if (!Array.isArray(timeEntryIds) || timeEntryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'timeEntryIds must be a non-empty array',
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'action must be either "approve" or "reject"',
      });
    }

    const result = await timeAttendanceService.bulkApproveTimeEntries(
      timeEntryIds,
      organizationId,
      userId,
      action === 'approve',
      rejectionReason
    );

    logger.info('Time entries bulk processed', {
      organizationId,
      action,
      count: timeEntryIds.length,
      userId,
    });

    res.status(200).json({
      success: true,
      result: result,
      message: `Time entries ${action}d successfully`,
    });
  } catch (error) {
    logger.error('Error bulk processing time entries', {
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
 * Delete a time entry
 * DELETE /api/paylinq/time-entries/:id
 */
async function deleteTimeEntry(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await timeAttendanceService.deleteTimeEntry(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Time entry not found',
      });
    }

    logger.info('Time entry deleted', {
      organization_id,
      timeEntryId: id,
      id,
    });

    res.status(200).json({
      success: true,
      message: 'Time entry deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting time entry', {
      error: error.message,
      timeEntryId: req.params.id,
      organization_id: req.user?.organization_id,
      id: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete time entry',
    });
  }
}

/**
 * Create shift type
 * POST /api/paylinq/time-attendance/shift-types
 */
async function createShiftType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    
    const shiftType = await timeAttendanceService.createShiftType(
      req.body,
      organizationId,
      userId
    );

    logger.info('Shift type created', {
      shiftTypeId: shiftType.id,
      organizationId
    });

    res.status(201).json({
      success: true,
      shiftType,
      message: 'Shift type created successfully',
    });
  } catch (error) {
    logger.error('Error creating shift type', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(error.message.includes('validation') ? 400 : 500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get all shift types
 * GET /api/paylinq/time-attendance/shift-types
 */
async function getShiftTypes(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const filters = req.query;

    const shiftTypes = await timeAttendanceService.getShiftTypes(organizationId, filters);

    res.status(200).json({
      success: true,
      shiftTypes,
    });
  } catch (error) {
    logger.error('Error fetching shift types', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get shift type by ID
 * GET /api/paylinq/time-attendance/shift-types/:id
 */
async function getShiftTypeById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const shiftType = await timeAttendanceService.getShiftTypeById(id, organizationId);

    res.status(200).json({
      success: true,
      shiftType,
    });
  } catch (error) {
    logger.error('Error fetching shift type', {
      error: error.message,
      shiftTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Update shift type
 * PUT /api/paylinq/time-attendance/shift-types/:id
 */
async function updateShiftType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const shiftType = await timeAttendanceService.updateShiftType(
      id,
      req.body,
      organizationId,
      userId
    );

    logger.info('Shift type updated', {
      shiftTypeId: id,
      organizationId
    });

    res.status(200).json({
      success: true,
      shiftType,
      message: 'Shift type updated successfully',
    });
  } catch (error) {
    logger.error('Error updating shift type', {
      error: error.message,
      shiftTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('validation') ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Delete shift type
 * DELETE /api/paylinq/time-attendance/shift-types/:id
 */
async function deleteShiftType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    await timeAttendanceService.deleteShiftType(id, organizationId, userId);

    logger.info('Shift type deleted', {
      shiftTypeId: id,
      organizationId
    });

    res.status(200).json({
      success: true,
      message: 'Shift type deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting shift type', {
      error: error.message,
      shiftTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    const statusCode = error.message.includes('not found') ? 404 :
                       error.message.includes('Cannot delete') ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
}

export default {
  clockIn,
  clockOut,
  getActiveClockEntries,
  getEmployeeClockHistory,
  createShiftType,
  getShiftTypes,
  getShiftTypeById,
  updateShiftType,
  deleteShiftType,
  createTimeEntry,
  getTimeEntries,
  getTimeEntryById,
  updateTimeEntry,
  bulkApproveTimeEntries,
  deleteTimeEntry,
};
