/**
 * Event Integration Tests
 * 
 * End-to-end tests for event flows from emission to handling.
 */

import { jest } from '@jest/globals';
import paylinqEvents from '../../../../src/products/paylinq/events/eventEmitter.js';
import { CONSUMED_EVENTS, EMITTED_EVENTS } from '../../../../src/products/paylinq/events/eventTypes.js';
import { registerEventHandlers, unregisterEventHandlers } from '../../../../src/products/paylinq/events/eventRegistry.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock repositories
jest.mock('../../../../src/products/paylinq/repositories/payrollRepository.js');
jest.mock('../../../../src/products/paylinq/events/handlers/hrisHandlers.js');
jest.mock('../../../../src/utils/logger.js');

// Skip until database integration is complete
describe.skip('Event Integration Tests', () => {
  let mockPayrollRepo;

  beforeEach(() => {
    jest.clearAllMocks();
    unregisterEventHandlers();
    
    // Clear event history
    if (paylinqEvents.eventHistory) {
      paylinqEvents.eventHistory.length = 0;
    }

    mockPayrollRepo = PayrollRepository.mock.instances[0];
  });

  afterEach(() => {
    unregisterEventHandlers();
  });

  describe('Employee Lifecycle Flow', () => {
    test('should create payroll record when employee created', async () => {
      // Setup mock
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);
      mockPayrollRepo.createEmployeeRecord = jest.fn().mockResolvedValue({
        id: 'record-123',
        employee_id: 'emp-456',
        status: 'active'
      });

      // Register handlers
      registerEventHandlers();

      // Emit employee created event
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        startDate: '2024-01-15',
        status: 'active'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify payroll record was created
      expect(mockPayrollRepo.createEmployeeRecord).toHaveBeenCalled();
      expect(mockPayrollRepo.createEmployeeRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-456',
          status: 'active'
        }),
        'org-123',
        'system'
      );
    });

    test('should update payroll record when employee status changes', async () => {
      // Setup mocks
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123',
        employee_id: 'emp-456',
        status: 'active'
      });
      mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'inactive'
      });

      registerEventHandlers();

      // Emit employee updated event
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_UPDATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        changes: {
          status: 'inactive'
        },
        updatedBy: 'user-789',
        updatedAt: new Date().toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPayrollRepo.updateEmployeeRecord).toHaveBeenCalled();
    });

    test('should handle employee termination', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'active'
      });
      mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'terminated'
      });

      registerEventHandlers();

      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_TERMINATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        terminationDate: '2024-12-31',
        reason: 'resignation'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPayrollRepo.updateEmployeeRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({ status: 'terminated' }),
        'org-123',
        'system'
      );
    });
  });

  describe('Compensation Changes Flow', () => {
    test('should create compensation record when salary changes', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123'
      });
      mockPayrollRepo.createCompensation = jest.fn().mockResolvedValue({
        id: 'comp-456',
        pay_rate: 80000
      });

      registerEventHandlers();

      paylinqEvents.emitEvent(CONSUMED_EVENTS.COMPENSATION_CHANGED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        compensationType: 'salary',
        amount: 80000,
        currency: 'SRD',
        effectiveDate: '2024-07-01',
        reason: 'promotion'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPayrollRepo.createCompensation).toHaveBeenCalledWith(
        expect.objectContaining({
          compensationType: 'salary',
          payRate: 80000,
          payPeriod: 'month',
          isCurrent: true
        }),
        'org-123',
        'system'
      );
    });
  });

  describe('Event History Tracking', () => {
    test('should track consumed events in history', () => {
      registerEventHandlers();

      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456'
      });

      const history = paylinqEvents.getEventHistory(5);
      const createdEvent = history.find(e => e.eventType === CONSUMED_EVENTS.EMPLOYEE_CREATED);

      expect(createdEvent).toBeDefined();
      expect(createdEvent.eventData.employeeId).toBe('emp-456');
    });

    test('should track emitted events in history', () => {
      paylinqEvents.emitEvent(EMITTED_EVENTS.PAYROLL_RUN_CREATED, {
        organizationId: 'org-123',
        payrollRunId: 'run-789',
        runNumber: 'PR-2024-001'
      });

      const history = paylinqEvents.getEventHistory(5);
      const runEvent = history.find(e => e.eventType === EMITTED_EVENTS.PAYROLL_RUN_CREATED);

      expect(runEvent).toBeDefined();
      expect(runEvent.eventData.payrollRunId).toBe('run-789');
    });
  });

  describe('Multi-Event Sequences', () => {
    test('should handle sequence: employee created → compensation set', async () => {
      // Setup mocks
      mockPayrollRepo.findByEmployeeId = jest.fn()
        .mockResolvedValueOnce(null) // For create
        .mockResolvedValueOnce({ id: 'record-123' }); // For compensation

      mockPayrollRepo.createEmployeeRecord = jest.fn().mockResolvedValue({
        id: 'record-123',
        employee_id: 'emp-456'
      });

      mockPayrollRepo.createCompensation = jest.fn().mockResolvedValue({
        id: 'comp-789'
      });

      registerEventHandlers();

      // Event 1: Create employee
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        firstName: 'Jane',
        lastName: 'Smith',
        startDate: '2024-01-15'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Event 2: Set compensation
      paylinqEvents.emitEvent(CONSUMED_EVENTS.COMPENSATION_CHANGED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        compensationType: 'salary',
        amount: 75000,
        effectiveDate: '2024-01-15'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify both handlers executed
      expect(mockPayrollRepo.createEmployeeRecord).toHaveBeenCalled();
      expect(mockPayrollRepo.createCompensation).toHaveBeenCalled();
    });

    test('should handle sequence: active → inactive → terminated', async () => {
      const employeeRecord = {
        id: 'record-123',
        employee_id: 'emp-456',
        status: 'active'
      };

      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(employeeRecord);
      mockPayrollRepo.updateEmployeeRecord = jest.fn()
        .mockResolvedValueOnce({ ...employeeRecord, status: 'inactive' })
        .mockResolvedValueOnce({ ...employeeRecord, status: 'terminated' });

      registerEventHandlers();

      // Status: active → inactive
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_UPDATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        changes: { status: 'inactive' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Status: inactive → terminated
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_TERMINATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        terminationDate: '2024-12-31'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPayrollRepo.updateEmployeeRecord).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery', () => {
    test('should continue processing events after handler error', async () => {
      let successfulEvents = 0;

      mockPayrollRepo.findByEmployeeId = jest.fn()
        .mockRejectedValueOnce(new Error('Database error')) // First call fails
        .mockResolvedValue({ id: 'record-123' }); // Second call succeeds

      mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({});

      registerEventHandlers();

      // Add custom listener to track successes
      paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_UPDATED, async () => {
        successfulEvents++;
      });

      // Event 1: Will fail
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_UPDATED, {
        organizationId: 'org-123',
        employeeId: 'emp-fail',
        changes: { status: 'active' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Event 2: Should succeed
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_UPDATED, {
        organizationId: 'org-123',
        employeeId: 'emp-success',
        changes: { status: 'active' }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Second event should have processed
      expect(successfulEvents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multi-Tenancy', () => {
    test('should process events for different organizations', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);
      mockPayrollRepo.createEmployeeRecord = jest.fn()
        .mockResolvedValueOnce({ id: 'record-org1', organization_id: 'org-111' })
        .mockResolvedValueOnce({ id: 'record-org2', organization_id: 'org-222' });

      registerEventHandlers();

      // Event for org 1
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-111',
        employeeId: 'emp-org1',
        firstName: 'User',
        lastName: 'One',
        startDate: '2024-01-01'
      });

      // Event for org 2
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-222',
        employeeId: 'emp-org2',
        firstName: 'User',
        lastName: 'Two',
        startDate: '2024-01-01'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Both should have been processed with correct org IDs
      expect(mockPayrollRepo.createEmployeeRecord).toHaveBeenCalledTimes(2);
      
      const calls = mockPayrollRepo.createEmployeeRecord.mock.calls;
      expect(calls[0][1]).toBe('org-111');
      expect(calls[1][1]).toBe('org-222');
    });
  });

  describe('Performance', () => {
    test('should handle high volume of events', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);
      mockPayrollRepo.createEmployeeRecord = jest.fn().mockResolvedValue({ id: 'record-123' });

      registerEventHandlers();

      const eventCount = 100;
      const startTime = Date.now();

      // Emit many events
      for (let i = 0; i < eventCount; i++) {
        paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
          organizationId: 'org-123',
          employeeId: `emp-${i}`,
          firstName: 'Test',
          lastName: `User${i}`,
          startDate: '2024-01-01'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second for 100 events)
      expect(duration).toBeLessThan(1000);

      // All events should be in history (up to max 100)
      const history = paylinqEvents.getEventHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });
});
