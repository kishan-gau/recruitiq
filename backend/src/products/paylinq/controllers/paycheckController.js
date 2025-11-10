/**
 * Paylinq Paycheck Controller
 * Handles HTTP requests for paycheck/pay stub management
 */

import payrollService from '../services/payrollService.js';
import { mapApiToDb, mapPaycheckDbToApi, mapPaycheckDbArrayToApi } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Get all paychecks
 * GET /api/paylinq/paychecks
 */
async function getPaychecks(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, payrollRunId, status, startDate, endDate, limit } = req.query;

    const filters = {
      employeeId,
      payrollRunId,
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 100,
    };

    const paychecks = await payrollService.getPaychecksByOrganization(organizationId, filters);

    res.status(200).json({
      success: true,
      paychecks: mapPaycheckDbArrayToApi(paychecks),
      count: paychecks.length,
    });
  } catch (error) {
    logger.error('Error fetching paychecks', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch paychecks',
    });
  }
}

/**
 * Get a single paycheck by ID
 * GET /api/paylinq/paychecks/:id
 */
async function getPaycheckById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const paycheck = await payrollService.getPaycheckById(id, organizationId);

    if (!paycheck) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Paycheck not found',
      });
    }

    res.status(200).json({
      success: true,
      paycheck: mapPaycheckDbToApi(paycheck),
    });
  } catch (error) {
    logger.error('Error fetching paycheck', {
      error: error.message,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch paycheck',
    });
  }
}

/**
 * Get paychecks for an employee
 * GET /api/paylinq/employees/:employeeId/paychecks
 */
async function getEmployeePaychecks(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const filters = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 12,
    };

    const paychecks = await payrollService.getPaychecksByEmployee(
      employeeId,
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      paychecks: mapPaycheckDbArrayToApi(paychecks),
      count: paychecks.length,
    });
  } catch (error) {
    logger.error('Error fetching employee paychecks', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee paychecks',
    });
  }
}

/**
 * Update paycheck
 * PUT /api/paylinq/paychecks/:id
 */
async function updatePaycheck(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    // Validate: prevent updating critical financial fields
    const criticalFields = ['grossPay', 'netPay', 'federalTax', 'stateTax', 'regularPay', 'overtimePay'];
    const attemptedCriticalUpdates = criticalFields.filter(field => req.body[field] !== undefined);
    
    if (attemptedCriticalUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Cannot update critical fields: ${attemptedCriticalUpdates.join(', ')}. Use reissue endpoint instead.`,
      });
    }

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const paycheck = await payrollService.updatePaycheck(id, organizationId, updateData);

    if (!paycheck) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Paycheck not found',
      });
    }

    logger.info('Paycheck updated', {
      organizationId,
      paycheckId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      paycheck: mapPaycheckDbToApi(paycheck),
      message: 'Paycheck updated successfully',
    });
  } catch (error) {
    logger.error('Error updating paycheck', {
      error: error.message,
      paycheckId: req.params.id,
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
 * Void a paycheck
 * POST /api/paylinq/paychecks/:id/void
 */
async function voidPaycheck(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Void reason is required',
      });
    }

    const paycheck = await payrollService.voidPaycheck(id, organizationId, userId, reason);

    logger.info('Paycheck voided', {
      organizationId,
      paycheckId: id,
      reason,
      userId,
    });

    res.status(200).json({
      success: true,
      paycheck: mapPaycheckDbToApi(paycheck),
      message: 'Paycheck voided successfully',
    });
  } catch (error) {
    logger.error('Error voiding paycheck', {
      error: error.message,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('cannot be voided')) {
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
 * Reissue a paycheck
 * POST /api/paylinq/paychecks/:id/reissue
 */
async function reissuePaycheck(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { adjustments } = req.body;

    const newPaycheck = await payrollService.reissuePaycheck(
      id,
      organizationId,
      userId,
      adjustments
    );

    logger.info('Paycheck reissued', {
      organizationId,
      originalPaycheckId: id,
      newPaycheckId: newPaycheck.id,
      userId,
    });

    res.status(201).json({
      success: true,
      paycheck: mapPaycheckDbToApi(newPaycheck),
      message: 'Paycheck reissued successfully',
    });
  } catch (error) {
    logger.error('Error reissuing paycheck', {
      error: error.message,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.message.includes('cannot be reissued') || error.message.includes('Cannot reissue')) {
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
 * Delete a paycheck
 * DELETE /api/paylinq/paychecks/:id
 */
async function deletePaycheck(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await payrollService.deletePaycheck(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Paycheck not found',
      });
    }

    logger.info('Paycheck deleted', {
      organizationId,
      paycheckId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Paycheck deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting paycheck', {
      error: error.message,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('cannot be deleted')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete paycheck',
    });
  }
}

export default {
  getPaychecks,
  getPaycheckById,
  getEmployeePaychecks,
  updatePaycheck,
  voidPaycheck,
  reissuePaycheck,
  deletePaycheck,
};
