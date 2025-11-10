/**
 * Payroll Event Emitters
 * 
 * Functions to emit payroll-related events for other products to consume.
 * These events notify other systems about payroll activities.
 * 
 * @module products/paylinq/events/emitters/payrollEmitters
 */

import paylinqEvents from '../eventEmitter.js';
import { EMITTED_EVENTS  } from '../eventTypes.js';
import logger from '../../../../utils/logger.js';

/**
 * Emit payroll run created event
 * @param {Object} payrollRun - Payroll run data
 * @param {string} organizationId - Organization ID
 */
function emitPayrollRunCreated(payrollRun, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYROLL_RUN_CREATED, {
      organizationId,
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.run_number,
      payPeriodStart: payrollRun.pay_period_start,
      payPeriodEnd: payrollRun.pay_period_end,
      paymentDate: payrollRun.payment_date,
      status: payrollRun.status
    });
  } catch (error) {
    logger.error('Error emitting payroll.run.created event', {
      error: error.message,
      payrollRunId: payrollRun?.id
    });
  }
}

/**
 * Emit payroll run calculated event
 * @param {Object} payrollRun - Payroll run data
 * @param {Object} calculations - Calculation summary
 * @param {string} organizationId - Organization ID
 */
function emitPayrollRunCalculated(payrollRun, calculations, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYROLL_RUN_CALCULATED, {
      organizationId,
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.run_number,
      calculations: {
        totalEmployees: calculations.totalEmployees || 0,
        totalGrossPay: calculations.totalGrossPay || 0,
        totalNetPay: calculations.totalNetPay || 0,
        totalTaxes: calculations.totalTaxes || 0,
        totalDeductions: calculations.totalDeductions || 0
      },
      status: payrollRun.status
    });
  } catch (error) {
    logger.error('Error emitting payroll.run.calculated event', {
      error: error.message,
      payrollRunId: payrollRun?.id
    });
  }
}

/**
 * Emit payroll run completed event
 * @param {Object} payrollRun - Payroll run data
 * @param {Object} summary - Completion summary
 * @param {string} organizationId - Organization ID
 */
function emitPayrollRunCompleted(payrollRun, summary, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYROLL_RUN_COMPLETED, {
      organizationId,
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.run_number,
      paymentDate: payrollRun.payment_date,
      summary: {
        paychecksGenerated: summary.paychecksGenerated || 0,
        totalAmount: summary.totalAmount || 0,
        currency: summary.currency || 'SRD'
      },
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error emitting payroll.run.completed event', {
      error: error.message,
      payrollRunId: payrollRun?.id
    });
  }
}

/**
 * Emit paycheck generated event
 * @param {Object} paycheck - Paycheck data
 * @param {string} organizationId - Organization ID
 */
function emitPaycheckGenerated(paycheck, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYCHECK_GENERATED, {
      organizationId,
      paycheckId: paycheck.id,
      employeeId: paycheck.employee_id,
      payrollRunId: paycheck.payroll_run_id,
      checkNumber: paycheck.check_number,
      payPeriodStart: paycheck.pay_period_start,
      payPeriodEnd: paycheck.pay_period_end,
      payDate: paycheck.pay_date,
      grossPay: paycheck.gross_pay,
      netPay: paycheck.net_pay,
      status: paycheck.status
    });
  } catch (error) {
    logger.error('Error emitting paycheck.generated event', {
      error: error.message,
      paycheckId: paycheck?.id
    });
  }
}

/**
 * Emit paycheck paid event
 * @param {Object} paycheck - Paycheck data
 * @param {Object} payment - Payment transaction data
 * @param {string} organizationId - Organization ID
 */
function emitPaycheckPaid(paycheck, payment, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYCHECK_PAID, {
      organizationId,
      paycheckId: paycheck.id,
      employeeId: paycheck.employee_id,
      payrollRunId: paycheck.payroll_run_id,
      checkNumber: paycheck.check_number,
      netPay: paycheck.net_pay,
      paymentMethod: payment?.payment_method,
      paymentId: payment?.id,
      paymentDate: payment?.payment_date,
      status: 'paid'
    });
  } catch (error) {
    logger.error('Error emitting paycheck.paid event', {
      error: error.message,
      paycheckId: paycheck?.id
    });
  }
}

/**
 * Emit paycheck voided event
 * @param {Object} paycheck - Paycheck data
 * @param {string} reason - Void reason
 * @param {string} organizationId - Organization ID
 */
function emitPaycheckVoided(paycheck, reason, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYCHECK_VOIDED, {
      organizationId,
      paycheckId: paycheck.id,
      employeeId: paycheck.employee_id,
      checkNumber: paycheck.check_number,
      reason: reason,
      voidedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error emitting paycheck.voided event', {
      error: error.message,
      paycheckId: paycheck?.id
    });
  }
}

/**
 * Emit timesheet submitted event
 * @param {Object} timesheet - Timesheet data
 * @param {string} organizationId - Organization ID
 */
function emitTimesheetSubmitted(timesheet, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.TIMESHEET_SUBMITTED, {
      organizationId,
      timesheetId: timesheet.id,
      employeeId: timesheet.employee_id,
      periodStart: timesheet.period_start,
      periodEnd: timesheet.period_end,
      totalHours: timesheet.total_hours,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error emitting timesheet.submitted event', {
      error: error.message,
      timesheetId: timesheet?.id
    });
  }
}

/**
 * Emit timesheet approved event
 * @param {Object} timesheet - Timesheet data
 * @param {string} approvedBy - User ID who approved
 * @param {string} organizationId - Organization ID
 */
function emitTimesheetApproved(timesheet, approvedBy, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.TIMESHEET_APPROVED, {
      organizationId,
      timesheetId: timesheet.id,
      employeeId: timesheet.employee_id,
      periodStart: timesheet.period_start,
      periodEnd: timesheet.period_end,
      totalHours: timesheet.total_hours,
      approvedBy: approvedBy,
      approvedAt: new Date().toISOString(),
      status: 'approved'
    });
  } catch (error) {
    logger.error('Error emitting timesheet.approved event', {
      error: error.message,
      timesheetId: timesheet?.id
    });
  }
}

/**
 * Emit timesheet rejected event
 * @param {Object} timesheet - Timesheet data
 * @param {string} reason - Rejection reason
 * @param {string} rejectedBy - User ID who rejected
 * @param {string} organizationId - Organization ID
 */
function emitTimesheetRejected(timesheet, reason, rejectedBy, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.TIMESHEET_REJECTED, {
      organizationId,
      timesheetId: timesheet.id,
      employeeId: timesheet.employee_id,
      periodStart: timesheet.period_start,
      periodEnd: timesheet.period_end,
      reason: reason,
      rejectedBy: rejectedBy,
      rejectedAt: new Date().toISOString(),
      status: 'rejected'
    });
  } catch (error) {
    logger.error('Error emitting timesheet.rejected event', {
      error: error.message,
      timesheetId: timesheet?.id
    });
  }
}

/**
 * Emit schedule changed event
 * @param {Object} schedule - Schedule data
 * @param {Object} changes - Changes made
 * @param {string} organizationId - Organization ID
 */
function emitScheduleChanged(schedule, changes, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.SCHEDULE_CHANGED, {
      organizationId,
      scheduleId: schedule.id,
      employeeId: schedule.employee_id,
      shiftDate: schedule.shift_date,
      changes: changes,
      changedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error emitting schedule.changed event', {
      error: error.message,
      scheduleId: schedule?.id
    });
  }
}

/**
 * Emit reconciliation completed event
 * @param {Object} reconciliation - Reconciliation data
 * @param {Object} results - Reconciliation results
 * @param {string} organizationId - Organization ID
 */
function emitReconciliationCompleted(reconciliation, results, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.RECONCILIATION_COMPLETED, {
      organizationId,
      reconciliationId: reconciliation.id,
      reconciliationType: reconciliation.reconciliation_type,
      periodStart: reconciliation.period_start,
      periodEnd: reconciliation.period_end,
      results: {
        itemsReconciled: results.itemsReconciled || 0,
        discrepanciesFound: results.discrepanciesFound || 0,
        totalAmount: results.totalAmount || 0
      },
      completedAt: new Date().toISOString(),
      status: 'completed'
    });
  } catch (error) {
    logger.error('Error emitting reconciliation.completed event', {
      error: error.message,
      reconciliationId: reconciliation?.id
    });
  }
}

/**
 * Emit payment processed event
 * @param {Object} payment - Payment data
 * @param {string} organizationId - Organization ID
 */
function emitPaymentProcessed(payment, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYMENT_PROCESSED, {
      organizationId,
      paymentId: payment.id,
      paymentMethod: payment.payment_method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error emitting payment.processed event', {
      error: error.message,
      paymentId: payment?.id
    });
  }
}

/**
 * Emit payment failed event
 * @param {Object} payment - Payment data
 * @param {string} failureReason - Reason for failure
 * @param {string} organizationId - Organization ID
 */
function emitPaymentFailed(payment, failureReason, organizationId) {
  try {
    paylinqEvents.emitEvent(EMITTED_EVENTS.PAYMENT_FAILED, {
      organizationId,
      paymentId: payment.id,
      paymentMethod: payment.payment_method,
      amount: payment.amount,
      failureReason: failureReason,
      failedAt: new Date().toISOString(),
      status: 'failed'
    });
  } catch (error) {
    logger.error('Error emitting payment.failed event', {
      error: error.message,
      paymentId: payment?.id
    });
  }
}

// Export individual functions as named exports
export {
  emitPayrollRunCreated,
  emitPayrollRunCalculated,
  emitPayrollRunCompleted,
  emitPaycheckGenerated,
  emitPaycheckPaid,
  emitPaycheckVoided,
  emitTimesheetSubmitted,
  emitTimesheetApproved,
  emitTimesheetRejected,
  emitScheduleChanged,
  emitReconciliationCompleted,
  emitPaymentProcessed,
  emitPaymentFailed
};

// Also export as default for convenience
export default {
  emitPayrollRunCreated,
  emitPayrollRunCalculated,
  emitPayrollRunCompleted,
  emitPaycheckGenerated,
  emitPaycheckPaid,
  emitPaycheckVoided,
  emitTimesheetSubmitted,
  emitTimesheetApproved,
  emitTimesheetRejected,
  emitScheduleChanged,
  emitReconciliationCompleted,
  emitPaymentProcessed,
  emitPaymentFailed
};
