/**
 * Event Types Tests
 * 
 * Unit tests for event type definitions and validation.
 */

import { 
  CONSUMED_EVENTS, 
  EMITTED_EVENTS, 
  isValidEventType, 
  isConsumedEvent, 
  isEmittedEvent 
} from '../../../../src/products/paylinq/events/eventTypes.js';

describe('Event Types', () => {
  describe('CONSUMED_EVENTS', () => {
    test('should define employee lifecycle events', () => {
      expect(CONSUMED_EVENTS.EMPLOYEE_CREATED).toBe('employee.created');
      expect(CONSUMED_EVENTS.EMPLOYEE_UPDATED).toBe('employee.updated');
      expect(CONSUMED_EVENTS.EMPLOYEE_TERMINATED).toBe('employee.terminated');
      expect(CONSUMED_EVENTS.EMPLOYEE_REHIRED).toBe('employee.rehired');
    });

    test('should define organizational events', () => {
      expect(CONSUMED_EVENTS.DEPARTMENT_CHANGED).toBe('department.changed');
      expect(CONSUMED_EVENTS.POSITION_CHANGED).toBe('position.changed');
    });

    test('should define compensation events', () => {
      expect(CONSUMED_EVENTS.COMPENSATION_CHANGED).toBe('compensation.changed');
      expect(CONSUMED_EVENTS.SALARY_ADJUSTED).toBe('salary.adjusted');
      expect(CONSUMED_EVENTS.BONUS_AWARDED).toBe('bonus.awarded');
    });

    test('should have exactly 9 consumed events', () => {
      const eventCount = Object.keys(CONSUMED_EVENTS).length;
      expect(eventCount).toBe(9);
    });
  });

  describe('EMITTED_EVENTS', () => {
    test('should define payroll run events', () => {
      expect(EMITTED_EVENTS.PAYROLL_RUN_CREATED).toBe('payroll.run.created');
      expect(EMITTED_EVENTS.PAYROLL_RUN_CALCULATED).toBe('payroll.run.calculated');
      expect(EMITTED_EVENTS.PAYROLL_RUN_APPROVED).toBe('payroll.run.approved');
      expect(EMITTED_EVENTS.PAYROLL_RUN_PROCESSED).toBe('payroll.run.processed');
      expect(EMITTED_EVENTS.PAYROLL_RUN_COMPLETED).toBe('payroll.run.completed');
      expect(EMITTED_EVENTS.PAYROLL_RUN_CANCELLED).toBe('payroll.run.cancelled');
    });

    test('should define paycheck events', () => {
      expect(EMITTED_EVENTS.PAYCHECK_GENERATED).toBe('paycheck.generated');
      expect(EMITTED_EVENTS.PAYCHECK_PAID).toBe('paycheck.paid');
      expect(EMITTED_EVENTS.PAYCHECK_VOIDED).toBe('paycheck.voided');
      expect(EMITTED_EVENTS.PAYCHECK_REISSUED).toBe('paycheck.reissued');
    });

    test('should define timesheet events', () => {
      expect(EMITTED_EVENTS.TIMESHEET_SUBMITTED).toBe('timesheet.submitted');
      expect(EMITTED_EVENTS.TIMESHEET_APPROVED).toBe('timesheet.approved');
      expect(EMITTED_EVENTS.TIMESHEET_REJECTED).toBe('timesheet.rejected');
    });

    test('should define schedule events', () => {
      expect(EMITTED_EVENTS.SCHEDULE_CREATED).toBe('schedule.created');
      expect(EMITTED_EVENTS.SCHEDULE_CHANGED).toBe('schedule.changed');
      expect(EMITTED_EVENTS.SCHEDULE_CANCELLED).toBe('schedule.cancelled');
    });

    test('should define reconciliation events', () => {
      expect(EMITTED_EVENTS.RECONCILIATION_COMPLETED).toBe('reconciliation.completed');
      expect(EMITTED_EVENTS.RECONCILIATION_DISCREPANCY).toBe('reconciliation.discrepancy');
    });

    test('should define payment events', () => {
      expect(EMITTED_EVENTS.PAYMENT_INITIATED).toBe('payment.initiated');
      expect(EMITTED_EVENTS.PAYMENT_PROCESSED).toBe('payment.processed');
      expect(EMITTED_EVENTS.PAYMENT_FAILED).toBe('payment.failed');
    });

    test('should have exactly 21 emitted events', () => {
      const eventCount = Object.keys(EMITTED_EVENTS).length;
      expect(eventCount).toBe(21);
    });
  });

  describe('isValidEventType', () => {
    test('should return true for consumed events', () => {
      expect(isValidEventType(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBe(true);
      expect(isValidEventType(CONSUMED_EVENTS.COMPENSATION_CHANGED)).toBe(true);
    });

    test('should return true for emitted events', () => {
      expect(isValidEventType(EMITTED_EVENTS.PAYROLL_RUN_CREATED)).toBe(true);
      expect(isValidEventType(EMITTED_EVENTS.PAYCHECK_PAID)).toBe(true);
    });

    test('should return false for invalid events', () => {
      expect(isValidEventType('invalid.event')).toBe(false);
      expect(isValidEventType('random.type')).toBe(false);
      expect(isValidEventType('')).toBe(false);
      expect(isValidEventType(null)).toBe(false);
    });
  });

  describe('isConsumedEvent', () => {
    test('should return true for consumed events', () => {
      expect(isConsumedEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBe(true);
      expect(isConsumedEvent(CONSUMED_EVENTS.EMPLOYEE_UPDATED)).toBe(true);
      expect(isConsumedEvent(CONSUMED_EVENTS.DEPARTMENT_CHANGED)).toBe(true);
    });

    test('should return false for emitted events', () => {
      expect(isConsumedEvent(EMITTED_EVENTS.PAYROLL_RUN_CREATED)).toBe(false);
      expect(isConsumedEvent(EMITTED_EVENTS.PAYCHECK_PAID)).toBe(false);
    });

    test('should return false for invalid events', () => {
      expect(isConsumedEvent('invalid.event')).toBe(false);
      expect(isConsumedEvent(null)).toBe(false);
    });
  });

  describe('isEmittedEvent', () => {
    test('should return true for emitted events', () => {
      expect(isEmittedEvent(EMITTED_EVENTS.PAYROLL_RUN_CREATED)).toBe(true);
      expect(isEmittedEvent(EMITTED_EVENTS.PAYCHECK_PAID)).toBe(true);
      expect(isEmittedEvent(EMITTED_EVENTS.TIMESHEET_APPROVED)).toBe(true);
    });

    test('should return false for consumed events', () => {
      expect(isEmittedEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBe(false);
      expect(isEmittedEvent(CONSUMED_EVENTS.COMPENSATION_CHANGED)).toBe(false);
    });

    test('should return false for invalid events', () => {
      expect(isEmittedEvent('invalid.event')).toBe(false);
      expect(isEmittedEvent(null)).toBe(false);
    });
  });

  describe('Event Naming Conventions', () => {
    test('consumed events should follow resource.action pattern', () => {
      Object.values(CONSUMED_EVENTS).forEach(eventType => {
        expect(eventType).toMatch(/^[a-z]+\.[a-z_]+$/);
      });
    });

    test('emitted events should follow resource.action pattern', () => {
      Object.values(EMITTED_EVENTS).forEach(eventType => {
        expect(eventType).toMatch(/^[a-z]+\.[a-z._]+$/);
      });
    });

    test('should not have duplicate event types', () => {
      const allEvents = [
        ...Object.values(CONSUMED_EVENTS),
        ...Object.values(EMITTED_EVENTS)
      ];
      const uniqueEvents = new Set(allEvents);
      expect(uniqueEvents.size).toBe(allEvents.length);
    });
  });

  describe('Event Type Completeness', () => {
    test('should cover all employee lifecycle stages', () => {
      expect(CONSUMED_EVENTS.EMPLOYEE_CREATED).toBeDefined();
      expect(CONSUMED_EVENTS.EMPLOYEE_UPDATED).toBeDefined();
      expect(CONSUMED_EVENTS.EMPLOYEE_TERMINATED).toBeDefined();
      expect(CONSUMED_EVENTS.EMPLOYEE_REHIRED).toBeDefined();
    });

    test('should cover all payroll run stages', () => {
      expect(EMITTED_EVENTS.PAYROLL_RUN_CREATED).toBeDefined();
      expect(EMITTED_EVENTS.PAYROLL_RUN_CALCULATED).toBeDefined();
      expect(EMITTED_EVENTS.PAYROLL_RUN_APPROVED).toBeDefined();
      expect(EMITTED_EVENTS.PAYROLL_RUN_PROCESSED).toBeDefined();
      expect(EMITTED_EVENTS.PAYROLL_RUN_COMPLETED).toBeDefined();
      expect(EMITTED_EVENTS.PAYROLL_RUN_CANCELLED).toBeDefined();
    });

    test('should cover all paycheck states', () => {
      expect(EMITTED_EVENTS.PAYCHECK_GENERATED).toBeDefined();
      expect(EMITTED_EVENTS.PAYCHECK_PAID).toBeDefined();
      expect(EMITTED_EVENTS.PAYCHECK_VOIDED).toBeDefined();
      expect(EMITTED_EVENTS.PAYCHECK_REISSUED).toBeDefined();
    });

    test('should cover timesheet workflow', () => {
      expect(EMITTED_EVENTS.TIMESHEET_SUBMITTED).toBeDefined();
      expect(EMITTED_EVENTS.TIMESHEET_APPROVED).toBeDefined();
      expect(EMITTED_EVENTS.TIMESHEET_REJECTED).toBeDefined();
    });
  });
});
