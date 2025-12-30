/**
 * Paylinq Compensation Controller
 * Handles HTTP requests for employee compensation management
 */

import PayrollService from '../services/payrollService.js';
import compensationService from '../../../shared/services/compensationService.js';

const payrollService = new PayrollService();
import { 
  mapCompensationApiToDb, 
  mapCompensationDbToApi, 
  mapCompensationDbArrayToApi 
} from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Create compensation record for an employee
 * POST /api/paylinq/compensation
 */
async function createCompensation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    
    // Transform API format to service format (light transformation)
    const compensationData = {
      employeeId: req.body.employeeId,  // Keep as-is
      compensationType: req.body.compensationType,  // Keep as-is
      amount: req.body.amount,  // Keep as-is
      currency: req.body.currency,  // Keep as-is
      // Transform effectiveDate (string) to effectiveFrom (Date)
      effectiveFrom: new Date(req.body.effectiveDate),
      effectiveTo: req.body.endDate ? new Date(req.body.endDate) : null,
      // Transform payFrequency to payPeriod
      payPeriod: transformPayFrequencyToPeriod(req.body.payFrequency)
      // Don't include hoursPerWeek - not in service schema
    };

    const compensation = await payrollService.createCompensation(compensationData, organizationId, userId);

    logger.info('Compensation record created', {
      organizationId,
      compensationId: compensation.id,
      employeeId: compensation.employeeId || compensation.employee_id,
      userId,
    });

    res.status(201).json({
      success: true,
      compensation: mapCompensationDbToApi(compensation),
      message: 'Compensation record created successfully',
    });
  } catch (error) {
    logger.error('Error creating compensation', {
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
 * Transform payFrequency (API) to payPeriod (service)
 */
function transformPayFrequencyToPeriod(payFrequency) {
  const periodMapping = {
    'weekly': 'week',
    'bi_weekly': 'week',
    'semi_monthly': 'month',
    'monthly': 'month',
    'annual': 'year'
  };
  return periodMapping[payFrequency] || 'month';
}

/**
 * Get compensation by employee ID
 * GET /api/paylinq/employees/:employeeId/compensation
 */
async function getEmployeeCompensation(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { includeHistory } = req.query;

    if (includeHistory === 'true') {
      const history = await payrollService.getCompensationHistory(employeeId, organizationId);
      return res.status(200).json({
        success: true,
        history: mapCompensationDbArrayToApi(history),
        count: history.length,
      });
    }

    const compensation = await payrollService.getCurrentCompensation(employeeId, organizationId);

    if (!compensation) {
      // Check if there are any compensation records at all for this employee
      const history = await payrollService.getCompensationHistory(employeeId, organizationId);
      
      if (history && history.length > 0) {
        // There are compensation records, but none are current
        return res.status(200).json({
          success: true,
          compensation: null,
          hasHistory: true,
          message: 'No current compensation record found. Please set one of the existing compensation records as current or create a new one.',
          availableRecords: history.length
        });
      } else {
        // No compensation records at all
        return res.status(200).json({
          success: true,
          compensation: null,
          hasHistory: false,
          message: 'No compensation records found for this employee. Please create a compensation record.',
          availableRecords: 0
        });
      }
    }

    res.status(200).json({
      success: true,
      compensation: mapCompensationDbToApi(compensation),
    });
  } catch (error) {
    logger.error('Error fetching employee compensation', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch compensation',
    });
  }
}

/**
 * Get compensation by ID
 * GET /api/paylinq/compensation/:id
 */
async function getCompensationById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const compensation = await payrollService.getCompensationById(id, organizationId);

    if (!compensation) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Compensation record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: mapCompensationDbToApi(compensation),
    });
  } catch (error) {
    logger.error('Error fetching compensation', {
      error: error.message,
      compensationId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch compensation',
    });
  }
}

/**
 * Update compensation record
 * PUT /api/paylinq/compensation/:id
 */
async function updateCompensation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const updateData = mapCompensationApiToDb(req.body);

    const compensation = await payrollService.updateCompensation(id, updateData, organizationId, userId);

    if (!compensation) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Compensation record not found',
      });
    }

    logger.info('Compensation record updated', {
      organizationId,
      compensationId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      compensation: mapCompensationDbToApi(compensation),
      message: 'Compensation updated successfully',
    });
  } catch (error) {
    logger.error('Error updating compensation', {
      error: error.message,
      compensationId: req.params.id,
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
 * Delete compensation record
 * DELETE /api/paylinq/compensation/:id
 */
async function deleteCompensation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await payrollService.deleteCompensation(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Compensation record not found',
      });
    }

    logger.info('Compensation record deleted', {
      organizationId,
      compensationId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Compensation deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting compensation', {
      error: error.message,
      compensationId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete compensation',
    });
  }
}

/**
 * Get compensation history for an employee
 * GET /api/paylinq/employees/:employeeId/compensation/history
 */
async function getCompensationHistory(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;

    const history = await compensationService.getCompensationHistory(employeeId, organizationId);

    res.status(200).json({
      success: true,
      compensationHistory: mapCompensationDbArrayToApi(history),
      count: history.length,
    });
  } catch (error) {
    logger.error('Error fetching compensation history', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch compensation history',
    });
  }
}

/**
 * Get compensation summary for an employee
 * GET /api/paylinq/compensation/employee/:employeeId/summary
 */
async function getCompensationSummary(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;

    const summary = await payrollService.getCompensationSummary(employeeId, organizationId);

    res.status(200).json({
      success: true,
      summary: {
        ...summary,
        compensationType: summary.compensationType || summary.compensation_type,
        lastChangeDate: summary.lastChangeDate,
        firstHireDate: summary.firstHireDate
      },
    });
  } catch (error) {
    logger.error('Error fetching compensation summary', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch compensation summary',
    });
  }
}

export default {
  createCompensation,
  getEmployeeCompensation,
  getCompensationById,
  updateCompensation,
  deleteCompensation,
  getCompensationHistory,
  getCompensationSummary,
};
