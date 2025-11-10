/**
 * Paylinq Payroll Run Controller
 * Handles HTTP requests for payroll run management
 */

import payrollService from '../services/payrollService.js';
import { mapPayrollRunApiToDb, mapPayrollRunUpdateApiToDb, mapPayrollRunDbToApi } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new payroll run
 * POST /api/paylinq/payroll-runs
 */
async function createPayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const runData = mapPayrollRunApiToDb(req.body);

    const payrollRun = await payrollService.createPayrollRun(runData, organizationId, userId);

    logger.info('Payroll run created', {
      organizationId,
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.runNumber,
      userId,
    });

    res.status(201).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(payrollRun),
      message: 'Payroll run created successfully',
    });
  } catch (error) {
    logger.error('Error creating payroll run', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('overlapping')) {
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
 * Get all payroll runs
 * GET /api/paylinq/payroll-runs
 */
async function getPayrollRuns(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { status, startDate, endDate, limit, page, sortBy, sortOrder } = req.query;

    // DEBUG: Log what we're querying
    logger.info('GET /paylinq/payroll-runs', {
      organizationId,
      userId: req.user.id,
      filters: req.query
    });

    const filters = {
      status,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
      page: page ? parseInt(page) : undefined,
      sortBy,
      sortOrder,
    };

    const result = await payrollService.getPayrollRunsByOrganization(organizationId, filters);
    
    // DEBUG: Log what we found
    logger.info('Found payroll runs', {
      count: result.rows ? result.rows.length : result.length,
      total: result.total || (result.rows ? result.rows.length : result.length),
      organizationId
    });
    
    // Handle both paginated and non-paginated responses
    const payrollRuns = result.rows || result;
    const total = result.total || payrollRuns.length;

    res.status(200).json({
      success: true,
      data: {
        payroll_runs: payrollRuns.map(mapPayrollRunDbToApi),
        total: total,
      },
      count: total,
      total: total,
      page: filters.page || 1,
      limit: filters.limit || payrollRuns.length,
    });
  } catch (error) {
    logger.error('Error fetching payroll runs', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payroll runs',
    });
  }
}

/**
 * Get a single payroll run by ID
 * GET /api/paylinq/payroll-runs/:id
 */
async function getPayrollRunById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const payrollRun = await payrollService.getPayrollRunById(id, organizationId);

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payroll_run: mapPayrollRunDbToApi(payrollRun),
      },
    });
  } catch (error) {
    logger.error('Error fetching payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payroll run',
    });
  }
}

/**
 * Calculate payroll for a run
 * POST /api/paylinq/payroll-runs/:id/calculate
 */
async function calculatePayroll(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { includeEmployees, excludeEmployees } = req.body;

    const filters = {
      includeEmployees,
      excludeEmployees,
    };

    const result = await payrollService.calculatePayroll(id, organizationId, userId, filters);

    logger.info('Payroll calculated', {
      organizationId,
      payrollRunId: id,
      employeesProcessed: result.totalEmployees,
      totalGross: result.totalGrossPay,
      userId,
    });

    // Add summary to result object for API response
    const resultWithSummary = {
      ...result,
      summary: {
        employeeCount: result.totalEmployees,
        totalGross: result.totalGrossPay,
        totalNet: result.totalNetPay,
        totalTaxes: result.totalTaxes
      }
    };

    res.status(200).json({
      success: true,
      result: resultWithSummary,
      message: 'Payroll calculated successfully',
    });
  } catch (error) {
    logger.error('Error calculating payroll', {
      error: error.message,
      payrollRunId: req.params.id,
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
 * Update payroll run
 * PUT /api/paylinq/payroll-runs/:id
 */
async function updatePayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const updateData = mapPayrollRunUpdateApiToDb(req.body);

    const payrollRun = await payrollService.updatePayrollRun(id, updateData, organizationId, userId);

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    logger.info('Payroll run updated', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(payrollRun),
      message: 'Payroll run updated successfully',
    });
  } catch (error) {
    logger.error('Error updating payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
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

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Finalize a payroll run
 * POST /api/paylinq/payroll-runs/:id/finalize
 */
async function finalizePayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const payrollRun = await payrollService.finalizePayrollRun(id, organizationId, userId);

    logger.info('Payroll run finalized', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(payrollRun),
      message: 'Payroll run finalized successfully',
    });
  } catch (error) {
    logger.error('Error finalizing payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status') || error.message.includes('cannot be finalized')) {
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
 * Delete a payroll run
 * DELETE /api/paylinq/payroll-runs/:id
 */
async function deletePayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await payrollService.deletePayrollRun(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    logger.info('Payroll run deleted', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Payroll run deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
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
      message: 'Failed to delete payroll run',
    });
  }
}

/**
 * Get paychecks for a payroll run
 * GET /api/paylinq/payroll-runs/:id/paychecks
 */
async function getPayrollRunPaychecks(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const paychecks = await payrollService.getPaychecksByPayrollRun(id, organizationId);

    // Add calculated fields to each paycheck
    const enrichedPaychecks = paychecks.map(paycheck => {
      // Calculate total_deductions as sum of all deduction fields
      const totalDeductions = (
        parseFloat(paycheck.wage_tax || 0) +
        parseFloat(paycheck.aov_tax || 0) +
        parseFloat(paycheck.aww_tax || 0) +
        parseFloat(paycheck.federal_tax || 0) +
        parseFloat(paycheck.state_tax || 0) +
        parseFloat(paycheck.local_tax || 0) +
        parseFloat(paycheck.social_security || 0) +
        parseFloat(paycheck.medicare || 0) +
        parseFloat(paycheck.pre_tax_deductions || 0) +
        parseFloat(paycheck.post_tax_deductions || 0) +
        parseFloat(paycheck.other_deductions || 0)
      ).toFixed(2);

      // Add aliases for Suriname tax fields (for backward compatibility with tests)
      return {
        ...paycheck,
        total_deductions: totalDeductions,
        aov_contribution: paycheck.aov_tax,
        aww_contribution: paycheck.aww_tax,
      };
    });

    res.status(200).json({
      success: true,
      paychecks: enrichedPaychecks,
      count: enrichedPaychecks.length,
    });
  } catch (error) {
    logger.error('Error fetching payroll run paychecks', {
      error: error.message,
      payrollRunId: req.params.id,
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
 * Process a payroll run
 * POST /api/paylinq/payroll-runs/:id/process
 */
async function processPayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    // First calculate if not already calculated
    const payrollRun = await payrollService.getPayrollRunById(id, organizationId);
    
    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    // If status is draft, calculate first
    if (payrollRun.status === 'draft') {
      await payrollService.calculatePayroll(id, organizationId, userId, {});
    }

    // Then finalize (approve)
    const finalizedRun = await payrollService.finalizePayrollRun(id, organizationId, userId);

    logger.info('Payroll run processed', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(finalizedRun),
      message: 'Payroll run processed successfully',
    });
  } catch (error) {
    logger.error('Error processing payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status') || error.message.includes('not found')) {
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
 * Approve a payroll run
 * POST /api/paylinq/payroll-runs/:id/approve
 */
async function approvePayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const payrollRun = await payrollService.finalizePayrollRun(id, organizationId, userId);

    logger.info('Payroll run approved', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(payrollRun),
      message: 'Payroll run approved successfully',
    });
  } catch (error) {
    logger.error('Error approving payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status') || error.message.includes('cannot be finalized')) {
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
 * Cancel a payroll run
 * POST /api/paylinq/payroll-runs/:id/cancel
 */
async function cancelPayrollRun(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const payrollRun = await payrollService.getPayrollRunById(id, organizationId);
    
    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    if (payrollRun.status === 'processed') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Cannot cancel a processed payroll run',
      });
    }

    const cancelledRun = await payrollService.updatePayrollRun(
      id,
      { status: 'cancelled' },
      organizationId
    );

    logger.info('Payroll run cancelled', {
      organizationId,
      payrollRunId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payrollRun: mapPayrollRunDbToApi(cancelledRun),
      message: 'Payroll run cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling payroll run', {
      error: error.message,
      payrollRunId: req.params.id,
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

export default {
  createPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  calculatePayroll,
  updatePayrollRun,
  finalizePayrollRun,
  processPayrollRun,
  approvePayrollRun,
  cancelPayrollRun,
  deletePayrollRun,
  getPayrollRunPaychecks,
};
