/**
 * Event Registry Tests
 * 
 * Unit tests for event handler registration system.
 */

import { jest } from '@jest/globals';
import { registerEventHandlers, 
  unregisterEventHandlers, 
  getEventStats 
} from '../../../../src/products/paylinq/events/eventRegistry.js';
import paylinqEvents from '../../../../src/products/paylinq/events/eventEmitter.js';
import { CONSUMED_EVENTS } from '../../../../src/products/paylinq/events/eventTypes.js';

// Mock handlers
jest.mock('../../../../src/products/paylinq/events/handlers/hrisHandlers.js');
jest.mock('../../../../src/utils/logger.js');

describe('Event Registry', () => {
  beforeEach(() => {
    // Clear all event listeners before each test
    unregisterEventHandlers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    unregisterEventHandlers();
  });

  describe('registerEventHandlers', () => {
    test('should register all HRIS event handlers', () => {
      registerEventHandlers();

      // Check that listeners are registered for consumed events
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBeGreaterThan(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_UPDATED)).toBeGreaterThan(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_TERMINATED)).toBeGreaterThan(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.DEPARTMENT_CHANGED)).toBeGreaterThan(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.COMPENSATION_CHANGED)).toBeGreaterThan(0);
    });

    test('should not throw errors during registration', () => {
      expect(() => {
        registerEventHandlers();
      }).not.toThrow();
    });

    test('should handle multiple registrations gracefully', () => {
      registerEventHandlers();
      const firstCount = paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_CREATED);

      registerEventHandlers();
      const secondCount = paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_CREATED);

      // Multiple registrations add multiple listeners
      expect(secondCount).toBeGreaterThan(firstCount);
    });
  });

  describe('unregisterEventHandlers', () => {
    test('should remove all event listeners', () => {
      // Register handlers first
      registerEventHandlers();

      // Verify listeners exist
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBeGreaterThan(0);

      // Unregister
      unregisterEventHandlers();

      // Verify listeners removed
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_CREATED)).toBe(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_UPDATED)).toBe(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.EMPLOYEE_TERMINATED)).toBe(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.DEPARTMENT_CHANGED)).toBe(0);
      expect(paylinqEvents.listenerCount(CONSUMED_EVENTS.COMPENSATION_CHANGED)).toBe(0);
    });

    test('should not throw if called when no handlers registered', () => {
      expect(() => {
        unregisterEventHandlers();
      }).not.toThrow();
    });

    test('should handle multiple unregister calls', () => {
      registerEventHandlers();

      expect(() => {
        unregisterEventHandlers();
        unregisterEventHandlers();
        unregisterEventHandlers();
      }).not.toThrow();
    });
  });

  describe('getEventStats', () => {
    test('should return emitter stats', () => {
      const stats = getEventStats();

      expect(stats).toHaveProperty('emitter');
      expect(stats.emitter).toHaveProperty('totalEvents');
      expect(stats.emitter).toHaveProperty('eventTypes');
      expect(stats.emitter).toHaveProperty('recentEvents');
    });

    test('should return listener counts', () => {
      registerEventHandlers();

      const stats = getEventStats();

      expect(stats).toHaveProperty('listeners');
      expect(typeof stats.listeners).toBe('object');
    });

    test('should show zero listeners when none registered', () => {
      unregisterEventHandlers();

      const stats = getEventStats();

      expect(Object.keys(stats.listeners).length).toBe(0);
    });

    test('should reflect registered handlers', () => {
      registerEventHandlers();

      const stats = getEventStats();

      // Should have listeners for consumed events
      const consumedEventTypes = Object.values(CONSUMED_EVENTS);
      const registeredEvents = Object.keys(stats.listeners);

      // At least some consumed events should have listeners
      const hasListeners = consumedEventTypes.some(eventType => 
        registeredEvents.includes(eventType)
      );

      expect(hasListeners).toBe(true);
    });
  });

  describe('Handler Registration Lifecycle', () => {
    test('should register and unregister cleanly', () => {
      // Start clean
      unregisterEventHandlers();
      let stats = getEventStats();
      expect(Object.keys(stats.listeners).length).toBe(0);

      // Register
      registerEventHandlers();
      stats = getEventStats();
      expect(Object.keys(stats.listeners).length).toBeGreaterThan(0);

      // Unregister
      unregisterEventHandlers();
      stats = getEventStats();
      expect(Object.keys(stats.listeners).length).toBe(0);
    });

    test('should handle rapid register/unregister cycles', () => {
      expect(() => {
        for (let i = 0; i < 5; i++) {
          registerEventHandlers();
          unregisterEventHandlers();
        }
      }).not.toThrow();
    });
  });

  describe('Event Processing', () => {
    test('should process events after registration', (done) => {
      // Note: Handler calls are tested through event emission
      // The handlers are already registered through registerEventHandlers()
      
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        action: 'created'
      });

      registerEventHandlers();
      
      // Add test handler to verify events are processed
      paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_CREATED, mockHandler);

      // Emit event
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456'
      });

      // Give async processing time
      setTimeout(() => {
        expect(mockHandler).toHaveBeenCalled();
        done();
      }, 100);
    });

    test('should not process events after unregistration', (done) => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true
      });

      registerEventHandlers();
      paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_CREATED, mockHandler);
      unregisterEventHandlers();

      // Emit event
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456'
      });

      // Give time for potential processing
      setTimeout(() => {
        // Handler should not be called after unregistration
        expect(mockHandler).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Error Resilience', () => {
    test('should continue processing after handler error', (done) => {
      let secondHandlerCalled = false;

      // First handler throws error
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      registerEventHandlers();

      // Add handlers that will be tested
      paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_CREATED, errorHandler);
      paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_CREATED, () => {
        secondHandlerCalled = true;
      });

      // Emit event
      paylinqEvents.emitEvent(CONSUMED_EVENTS.EMPLOYEE_CREATED, {
        organizationId: 'org-123',
        employeeId: 'emp-456'
      });

      // Verify both handlers were attempted
      setTimeout(() => {
        expect(errorHandler).toHaveBeenCalled();
        expect(secondHandlerCalled).toBe(true);
        done();
      }, 100);
    });
  });
});
