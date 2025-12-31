/**
 * Paylinq Paycheck Controller
 * Handles HTTP requests for paycheck/pay stub management
 */

import PayrollService from '../services/payrollService.js';

const payrollService = new PayrollService();
import payslipPdfService from '../services/payslipPdfService.js';
import emailService from '../../../services/emailService.js';
import { query as db } from '../../../config/database.js';
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
  } catch (_error) {
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
  } catch (_error) {
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
 * Get component breakdown for a paycheck (PHASE 2)
 * GET /api/paylinq/paychecks/:id/components
 */
async function getPaycheckComponents(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    // Verify paycheck exists and belongs to organization
    const paycheck = await payrollService.getPaycheckById(id, organizationId);

    if (!paycheck) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Paycheck not found',
      });
    }

    // Get payroll run components for this paycheck
    const query = `
      SELECT 
        id,
        payroll_run_id,
        paycheck_id,
        component_type,
        component_code,
        component_name,
        amount,
        worker_structure_id,
        structure_template_version,
        component_config_snapshot,
        calculation_metadata,
        created_at,
        updated_at
      FROM payroll.payroll_run_component
      WHERE paycheck_id = $1
        AND organization_id = $2
      ORDER BY 
        CASE component_type
          WHEN 'earning' THEN 1
          WHEN 'deduction' THEN 2
          WHEN 'tax' THEN 3
          WHEN 'benefit' THEN 4
          ELSE 5
        END,
        component_code ASC
    `;

    const result = await db(query, [id, organizationId]);

    // Import runComponentDto to map components
    const { mapRunComponentsToBreakdown } = await import('../dto/runComponentDto');
    const components = mapRunComponentsToBreakdown(result.rows);

    res.status(200).json({
      success: true,
      components,
    });
  } catch (_error) {
    logger.error('Error fetching paycheck components', {
      error: error.message,
      stack: error.stack,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch paycheck components',
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
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
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
  } catch (_error) {
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

/**
 * Download payslip PDF
 * GET /api/paylinq/paychecks/:id/pdf
 */
async function downloadPayslipPdf(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    logger.info('Generating payslip PDF', {
      paycheckId: id,
      organizationId,
      userId: req.user.id,
    });

    // Verify paycheck exists
    const paycheck = await payrollService.getPaycheckById(id, organizationId);
    if (!paycheck) {
      return res.status(404).json({
        success: false,
        error: 'Paycheck not found',
        errorCode: 'PAYCHECK_NOT_FOUND',
      });
    }

    // Generate PDF
    const pdfBuffer = await payslipPdfService.generatePayslipPdf(id, organizationId);

    // Set response headers
    const filename = `payslip_${paycheck.employee_number || 'employee'}_${paycheck.pay_period_start}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    // Send PDF
    res.send(pdfBuffer);

  } catch (_error) {
    logger.error('Error generating payslip PDF', {
      error: error.message,
      stack: error.stack,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate payslip PDF',
      errorCode: 'PAYSLIP_GENERATION_FAILED',
    });
  }
}

/**
 * Send individual payslip via email
 * POST /api/paylinq/paychecks/:id/send
 */
async function sendPayslip(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id: paycheckId } = req.params;

    logger.info('Sending individual payslip', {
      paycheckId,
      organizationId,
      userId,
    });

    // Verify paycheck exists
    const paycheck = await payrollService.getPaycheckById(paycheckId, organizationId);
    if (!paycheck) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Paycheck not found',
      });
    }

    // Get employee email
    const employeeResult = await db(
      `SELECT e.email, e.first_name, e.last_name, e.employee_number
       FROM hris.employee e
       WHERE e.id = $1 AND e.organization_id = $2`,
      [paycheck.employee_id, organizationId]
    );

    if (employeeResult.rows.length === 0 || !employeeResult.rows[0].email) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Employee email not found',
      });
    }

    const employee = employeeResult.rows[0];

    // Generate PDF
    const pdfBuffer = await payslipPdfService.generatePayslipPdf(paycheckId, organizationId);

    // Generate email content
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    const paymentDate = new Date(paycheck.payment_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Your Payslip is Ready</h2>
          <p>Dear ${employeeName},</p>
          <p>Your payslip for the pay period ending <strong>${paymentDate}</strong> is attached to this email.</p>
          <p>If you have any questions about your payslip, please contact HR or your payroll administrator.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automatically generated email. Please do not reply to this message.
            <br>This payslip is confidential and intended only for the recipient.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Dear ${employeeName},

Your payslip for the pay period ending ${paymentDate} is attached to this email.

If you have any questions about your payslip, please contact HR or your payroll administrator.

---
This is an automatically generated email. Please do not reply to this message.
This payslip is confidential and intended only for the recipient.
    `;

    // Send email with attachment
    await emailService.sendEmail({
      to: employee.email,
      subject: `Payslip - ${paymentDate}`,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: `payslip_${employee.employee_number}_${paycheck.pay_period_start}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Update paycheck with send status
    await db(
      `UPDATE payroll.paycheck 
       SET payslip_sent_at = NOW(),
           payslip_sent_to = $1,
           payslip_send_status = 'sent',
           payslip_send_error = NULL,
           updated_at = NOW()
       WHERE id = $2 AND organization_id = $3`,
      [employee.email, paycheckId, organizationId]
    );

    logger.info('Payslip sent successfully', {
      paycheckId,
      employeeId: paycheck.employee_id,
      email: employee.email,
    });

    res.status(200).json({
      success: true,
      message: 'Payslip sent successfully',
      data: {
        paycheckId,
        sentTo: employee.email,
        sentAt: new Date().toISOString(),
      },
    });

  } catch (_error) {
    logger.error('Error sending payslip', {
      error: error.message,
      stack: error.stack,
      paycheckId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    // Update paycheck with error status
    try {
      await db(
        `UPDATE payroll.paycheck 
         SET payslip_send_status = 'failed',
             payslip_send_error = $1,
             updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [error.message, req.params.id, req.user.organization_id]
      );
    } catch (updateError) {
      logger.error('Failed to update paycheck error status', { updateError: updateError.message });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to send payslip',
    });
  }
}

export default {
  getPaychecks,
  getPaycheckById,
  getPaycheckComponents, // PHASE 2: Component breakdown endpoint
  getEmployeePaychecks,
  updatePaycheck,
  voidPaycheck,
  reissuePaycheck,
  deletePaycheck,
  downloadPayslipPdf,
  sendPayslip,
};
