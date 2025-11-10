/**
 * Paylinq Event Types
 * 
 * Defines all event types that Paylinq consumes and emits.
 * 
 * @module products/paylinq/events/eventTypes
 */

/**
 * Events that Paylinq CONSUMES (from other products like Nexus HRIS)
 */
const CONSUMED_EVENTS = {
  // Employee lifecycle events from HRIS
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_TERMINATED: 'employee.terminated',
  EMPLOYEE_REHIRED: 'employee.rehired',
  
  // Organizational changes from HRIS
  DEPARTMENT_CHANGED: 'department.changed',
  POSITION_CHANGED: 'position.changed',
  
  // Compensation changes from HRIS
  COMPENSATION_CHANGED: 'compensation.changed',
  SALARY_ADJUSTED: 'salary.adjusted',
  BONUS_AWARDED: 'bonus.awarded'
};

/**
 * Events that Paylinq EMITS (for other products to consume)
 */
const EMITTED_EVENTS = {
  // Payroll run lifecycle
  PAYROLL_RUN_CREATED: 'payroll.run.created',
  PAYROLL_RUN_CALCULATED: 'payroll.run.calculated',
  PAYROLL_RUN_APPROVED: 'payroll.run.approved',
  PAYROLL_RUN_PROCESSED: 'payroll.run.processed',
  PAYROLL_RUN_COMPLETED: 'payroll.run.completed',
  PAYROLL_RUN_CANCELLED: 'payroll.run.cancelled',
  
  // Paycheck events
  PAYCHECK_GENERATED: 'paycheck.generated',
  PAYCHECK_PAID: 'paycheck.paid',
  PAYCHECK_VOIDED: 'paycheck.voided',
  PAYCHECK_REISSUED: 'paycheck.reissued',
  
  // Timesheet events
  TIMESHEET_SUBMITTED: 'timesheet.submitted',
  TIMESHEET_APPROVED: 'timesheet.approved',
  TIMESHEET_REJECTED: 'timesheet.rejected',
  
  // Schedule events
  SCHEDULE_CREATED: 'schedule.created',
  SCHEDULE_CHANGED: 'schedule.changed',
  SCHEDULE_CANCELLED: 'schedule.cancelled',
  
  // Reconciliation events
  RECONCILIATION_COMPLETED: 'reconciliation.completed',
  RECONCILIATION_DISCREPANCY: 'reconciliation.discrepancy',
  
  // Payment events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed'
};

/**
 * All event types (for validation)
 */
const ALL_EVENTS = {
  ...CONSUMED_EVENTS,
  ...EMITTED_EVENTS
};

/**
 * Validate if event type is recognized
 * @param {string} eventType - Event type to validate
 * @returns {boolean} True if valid event type
 */
function isValidEventType(eventType) {
  return Object.values(ALL_EVENTS).includes(eventType);
}

/**
 * Check if event is consumed by Paylinq
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if Paylinq consumes this event
 */
function isConsumedEvent(eventType) {
  return Object.values(CONSUMED_EVENTS).includes(eventType);
}

/**
 * Check if event is emitted by Paylinq
 * @param {string} eventType - Event type to check
 * @returns {boolean} True if Paylinq emits this event
 */
function isEmittedEvent(eventType) {
  return Object.values(EMITTED_EVENTS).includes(eventType);
}

export {
  CONSUMED_EVENTS,
  EMITTED_EVENTS,
  ALL_EVENTS,
  isValidEventType,
  isConsumedEvent,
  isEmittedEvent
};
