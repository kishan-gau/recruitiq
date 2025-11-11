/**
 * Paylinq Payroll Run Controller
 * Handles HTTP requests for payroll run management
 */

import payrollService from '../services/payrollService.js';
import { mapPayrollRunApiToDb, mapPayrollRunUpdateApiToDb, mapPayrollRunDbToApi } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';
import emailService from '../../../services/emailService.js';
import { initializeEmailService } from '../../../controllers/emailSettingsController.js';
import db from '../../../config/database.js';

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

    const apiData = mapPayrollRunDbToApi(payrollRun);
    
    // Debug log the data being returned
    logger.debug('Payroll run data before sending to UI', {
      payrollRunId: id,
      dbData: {
        employee_count: payrollRun.employee_count,
        total_amount: payrollRun.total_amount,
        total_gross_pay: payrollRun.total_gross_pay,
        total_net_pay: payrollRun.total_net_pay
      },
      apiData: {
        employeeCount: apiData.employeeCount,
        totalAmount: apiData.totalAmount,
        totalGrossPay: apiData.totalGrossPay,
        totalNetPay: apiData.totalNetPay
      }
    });

    res.status(200).json({
      success: true,
      data: {
        payroll_run: apiData,
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

/**
 * Send payslips to employees
 * POST /api/paylinq/payroll-runs/:id/send-payslips
 */
async function sendPayslips(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id: payrollRunId } = req.params;

    // Verify payroll run exists and is in correct status
    const payrollRun = await payrollService.getPayrollRunById(payrollRunId, organizationId);

    if (!payrollRun) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payroll run not found',
      });
    }

    if (payrollRun.status !== 'calculated' && payrollRun.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Cannot send payslips for payroll run with status: ${payrollRun.status}. Payroll must be calculated or approved.`,
      });
    }

    // Get all paychecks for this payroll run
    const paychecks = await payrollService.getPaychecksByRun(payrollRunId, organizationId);

    if (!paychecks || paychecks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'No paychecks found for this payroll run',
      });
    }

    logger.info('Sending payslips', {
      payrollRunId,
      organizationId,
      paycheckCount: paychecks.length,
      userId,
    });

    // Initialize email service with organization's settings
    try {
      await initializeEmailService(organizationId);
    } catch (emailError) {
      return res.status(400).json({
        success: false,
        error: 'Email Not Configured',
        message: 'Email settings have not been configured. Please configure email settings in System Preferences before sending payslips.',
      });
    }

    // Send emails to each employee
    const results = {
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const paycheck of paychecks) {
      try {
        // Get employee email from hris.employee table
        const employeeResult = await db.query(
          `SELECT e.email, e.first_name, e.last_name, e.employee_number
           FROM hris.employee e
           WHERE e.id = $1 AND e.organization_id = $2`,
          [paycheck.employee_id, organizationId]
        );

        if (employeeResult.rows.length === 0 || !employeeResult.rows[0].email) {
          results.failed++;
          results.errors.push({
            employeeId: paycheck.employee_id,
            error: 'No email address found',
          });
          
          // Update paycheck status
          await db.query(
            `UPDATE payroll.paycheck 
             SET payslip_send_status = 'failed',
                 payslip_send_error = 'No email address found',
                 updated_at = NOW()
             WHERE id = $1`,
            [paycheck.id]
          );
          continue;
        }

        const employee = employeeResult.rows[0];
        const employeeName = `${employee.first_name} ${employee.last_name}`;

        // Generate payslip email content
        const emailContent = generatePayslipEmail(paycheck, employee, payrollRun);

        // Send email
        await emailService.sendEmail({
          to: employee.email,
          subject: `Payslip for ${payrollRun.run_number || 'Pay Period'} - ${new Date(paycheck.payment_date).toLocaleDateString()}`,
          html: emailContent.html,
          text: emailContent.text,
        });

        // Update paycheck with email tracking info
        await db.query(
          `UPDATE payroll.paycheck 
           SET payslip_sent_at = NOW(),
               payslip_sent_to = $1,
               payslip_send_status = 'sent',
               payslip_send_error = NULL,
               updated_at = NOW()
           WHERE id = $2`,
          [employee.email, paycheck.id]
        );

        results.sent++;
        
        logger.info('Payslip sent successfully', {
          paycheckId: paycheck.id,
          employeeId: paycheck.employee_id,
          email: employee.email,
        });

      } catch (emailError) {
        results.failed++;
        results.errors.push({
          employeeId: paycheck.employee_id,
          error: emailError.message,
        });

        // Update paycheck status with error
        await db.query(
          `UPDATE payroll.paycheck 
           SET payslip_send_status = 'failed',
               payslip_send_error = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [emailError.message, paycheck.id]
        );

        logger.error('Failed to send payslip', {
          paycheckId: paycheck.id,
          employeeId: paycheck.employee_id,
          error: emailError.message,
        });
      }
    }

    // Return results
    const message = results.failed === 0
      ? `Payslips sent successfully to ${results.sent} employee(s)`
      : `Sent ${results.sent} payslip(s), ${results.failed} failed`;

    res.status(200).json({
      success: true,
      message,
      data: {
        payrollRunId,
        total: paychecks.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    });

  } catch (error) {
    logger.error('Error sending payslips', {
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

/**
 * Helper function to generate payslip email content
 */
function generatePayslipEmail(paycheck, employee, payrollRun) {
  const employeeName = `${employee.first_name} ${employee.last_name}`;
  const paymentDate = new Date(paycheck.payment_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const payPeriod = `${new Date(paycheck.pay_period_start).toLocaleDateString()} - ${new Date(paycheck.pay_period_end).toLocaleDateString()}`;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SRD',
    }).format(amount || 0);
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payslip</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #10b981;
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 20px;
          border: 1px solid #e5e7eb;
        }
        .section {
          background-color: white;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .row:last-child {
          border-bottom: none;
        }
        .label {
          color: #6b7280;
        }
        .value {
          font-weight: 500;
          color: #111827;
        }
        .total-row {
          font-size: 18px;
          font-weight: 600;
          padding-top: 15px;
          margin-top: 15px;
          border-top: 2px solid #10b981;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">Payslip</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${payrollRun.run_number || 'Pay Period'}</p>
      </div>
      
      <div class="content">
        <div class="section">
          <div class="section-title">Employee Information</div>
          <div class="row">
            <span class="label">Name:</span>
            <span class="value">${employeeName}</span>
          </div>
          <div class="row">
            <span class="label">Employee Number:</span>
            <span class="value">${employee.employee_number || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Payment Date:</span>
            <span class="value">${paymentDate}</span>
          </div>
          <div class="row">
            <span class="label">Pay Period:</span>
            <span class="value">${payPeriod}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Earnings</div>
          <div class="row">
            <span class="label">Regular Pay:</span>
            <span class="value">${formatCurrency(paycheck.regular_pay)}</span>
          </div>
          ${paycheck.overtime_pay > 0 ? `
          <div class="row">
            <span class="label">Overtime Pay:</span>
            <span class="value">${formatCurrency(paycheck.overtime_pay)}</span>
          </div>
          ` : ''}
          ${paycheck.bonus_pay > 0 ? `
          <div class="row">
            <span class="label">Bonus:</span>
            <span class="value">${formatCurrency(paycheck.bonus_pay)}</span>
          </div>
          ` : ''}
          ${paycheck.commission_pay > 0 ? `
          <div class="row">
            <span class="label">Commission:</span>
            <span class="value">${formatCurrency(paycheck.commission_pay)}</span>
          </div>
          ` : ''}
          <div class="row total-row">
            <span class="label">Gross Pay:</span>
            <span class="value">${formatCurrency(paycheck.gross_pay)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Deductions</div>
          ${paycheck.wage_tax > 0 ? `
          <div class="row">
            <span class="label">Wage Tax:</span>
            <span class="value">${formatCurrency(paycheck.wage_tax)}</span>
          </div>
          ` : ''}
          ${paycheck.aov_tax > 0 ? `
          <div class="row">
            <span class="label">AOV:</span>
            <span class="value">${formatCurrency(paycheck.aov_tax)}</span>
          </div>
          ` : ''}
          ${paycheck.aww_tax > 0 ? `
          <div class="row">
            <span class="label">AWW:</span>
            <span class="value">${formatCurrency(paycheck.aww_tax)}</span>
          </div>
          ` : ''}
          ${paycheck.federal_tax > 0 ? `
          <div class="row">
            <span class="label">Federal Tax:</span>
            <span class="value">${formatCurrency(paycheck.federal_tax)}</span>
          </div>
          ` : ''}
          ${paycheck.state_tax > 0 ? `
          <div class="row">
            <span class="label">State Tax:</span>
            <span class="value">${formatCurrency(paycheck.state_tax)}</span>
          </div>
          ` : ''}
          ${paycheck.pre_tax_deductions > 0 ? `
          <div class="row">
            <span class="label">Pre-Tax Deductions:</span>
            <span class="value">${formatCurrency(paycheck.pre_tax_deductions)}</span>
          </div>
          ` : ''}
          ${paycheck.post_tax_deductions > 0 ? `
          <div class="row">
            <span class="label">Post-Tax Deductions:</span>
            <span class="value">${formatCurrency(paycheck.post_tax_deductions)}</span>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="row total-row" style="border-top: 3px solid #10b981;">
            <span class="label">NET PAY:</span>
            <span class="value" style="color: #10b981;">${formatCurrency(paycheck.net_pay)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>This is an automatically generated payslip. Please do not reply to this email.</p>
        <p>If you have any questions, please contact your payroll administrator.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
PAYSLIP - ${payrollRun.run_number || 'Pay Period'}

Employee Information:
- Name: ${employeeName}
- Employee Number: ${employee.employee_number || 'N/A'}
- Payment Date: ${paymentDate}
- Pay Period: ${payPeriod}

Earnings:
- Regular Pay: ${formatCurrency(paycheck.regular_pay)}
${paycheck.overtime_pay > 0 ? `- Overtime Pay: ${formatCurrency(paycheck.overtime_pay)}\n` : ''}${paycheck.bonus_pay > 0 ? `- Bonus: ${formatCurrency(paycheck.bonus_pay)}\n` : ''}${paycheck.commission_pay > 0 ? `- Commission: ${formatCurrency(paycheck.commission_pay)}\n` : ''}- Gross Pay: ${formatCurrency(paycheck.gross_pay)}

Deductions:
${paycheck.wage_tax > 0 ? `- Wage Tax: ${formatCurrency(paycheck.wage_tax)}\n` : ''}${paycheck.aov_tax > 0 ? `- AOV: ${formatCurrency(paycheck.aov_tax)}\n` : ''}${paycheck.aww_tax > 0 ? `- AWW: ${formatCurrency(paycheck.aww_tax)}\n` : ''}${paycheck.federal_tax > 0 ? `- Federal Tax: ${formatCurrency(paycheck.federal_tax)}\n` : ''}${paycheck.state_tax > 0 ? `- State Tax: ${formatCurrency(paycheck.state_tax)}\n` : ''}${paycheck.pre_tax_deductions > 0 ? `- Pre-Tax Deductions: ${formatCurrency(paycheck.pre_tax_deductions)}\n` : ''}${paycheck.post_tax_deductions > 0 ? `- Post-Tax Deductions: ${formatCurrency(paycheck.post_tax_deductions)}\n` : ''}
NET PAY: ${formatCurrency(paycheck.net_pay)}

---
This is an automatically generated payslip. Please do not reply to this email.
If you have any questions, please contact your payroll administrator.
  `;

  return { html, text };
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
  sendPayslips,
};
