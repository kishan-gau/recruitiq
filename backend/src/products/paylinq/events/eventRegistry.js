/**
 * Event Registry
 * 
 * Central registration system for event handlers.
 * Wires up event consumers (listeners) to the event emitter.
 * 
 * @module products/paylinq/events/eventRegistry
 */

import paylinqEvents from './eventEmitter.js';
import { CONSUMED_EVENTS  } from './eventTypes.js';
import hrisHandlers from './handlers/hrisHandlers.js';
import logger from '../../../utils/logger.js';

/**
 * Register all event handlers
 * Call this function during application startup to wire up event consumers
 */
function registerEventHandlers() {
  logger.info('Registering Paylinq event handlers...');

  try {
    // Register HRIS event handlers
    registerHrisHandlers();

    logger.info('Successfully registered all Paylinq event handlers');
  } catch (error) {
    logger.error('Error registering Paylinq event handlers', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Register HRIS integration event handlers
 */
function registerHrisHandlers() {
  // Employee created in HRIS - create payroll record
  paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_CREATED, async (eventData) => {
    try {
      logger.info('Processing employee.created event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId
      });

      const result = await hrisHandlers.handleEmployeeCreated(eventData);
      
      logger.info('Completed employee.created event processing', {
        employeeId: eventData.employeeId,
        action: result.action,
        success: result.success
      });
    } catch (error) {
      logger.error('Error handling employee.created event', {
        error: error.message,
        eventData,
        stack: error.stack
      });
    }
  });

  // Employee updated in HRIS - update payroll record
  paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_UPDATED, async (eventData) => {
    try {
      logger.info('Processing employee.updated event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId
      });

      const result = await hrisHandlers.handleEmployeeUpdated(eventData);
      
      logger.info('Completed employee.updated event processing', {
        employeeId: eventData.employeeId,
        action: result.action,
        changes: result.changes
      });
    } catch (error) {
      logger.error('Error handling employee.updated event', {
        error: error.message,
        eventData,
        stack: error.stack
      });
    }
  });

  // Employee terminated in HRIS - mark terminated in payroll
  paylinqEvents.on(CONSUMED_EVENTS.EMPLOYEE_TERMINATED, async (eventData) => {
    try {
      logger.info('Processing employee.terminated event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId,
        terminationDate: eventData.terminationDate
      });

      const result = await hrisHandlers.handleEmployeeTerminated(eventData);
      
      logger.info('Completed employee.terminated event processing', {
        employeeId: eventData.employeeId,
        action: result.action
      });
    } catch (error) {
      logger.error('Error handling employee.terminated event', {
        error: error.message,
        eventData,
        stack: error.stack
      });
    }
  });

  // Department changed in HRIS - informational for cost center allocations
  paylinqEvents.on(CONSUMED_EVENTS.DEPARTMENT_CHANGED, async (eventData) => {
    try {
      logger.info('Processing department.changed event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId,
        newDepartment: eventData.newDepartmentName
      });

      const result = await hrisHandlers.handleDepartmentChanged(eventData);
      
      logger.info('Completed department.changed event processing', {
        employeeId: eventData.employeeId,
        action: result.action
      });
    } catch (error) {
      logger.error('Error handling department.changed event', {
        error: error.message,
        eventData,
        stack: error.stack
      });
    }
  });

  // Compensation changed in HRIS - create new compensation record
  paylinqEvents.on(CONSUMED_EVENTS.COMPENSATION_CHANGED, async (eventData) => {
    try {
      logger.info('Processing compensation.changed event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId,
        compensationType: eventData.compensationType
      });

      const result = await hrisHandlers.handleCompensationChanged(eventData);
      
      logger.info('Completed compensation.changed event processing', {
        employeeId: eventData.employeeId,
        action: result.action,
        compensationId: result.compensationId
      });
    } catch (error) {
      logger.error('Error handling compensation.changed event', {
        error: error.message,
        eventData,
        stack: error.stack
      });
    }
  });

  logger.info('Registered HRIS event handlers', {
    handlers: [
      CONSUMED_EVENTS.EMPLOYEE_CREATED,
      CONSUMED_EVENTS.EMPLOYEE_UPDATED,
      CONSUMED_EVENTS.EMPLOYEE_TERMINATED,
      CONSUMED_EVENTS.DEPARTMENT_CHANGED,
      CONSUMED_EVENTS.COMPENSATION_CHANGED
    ]
  });
}

/**
 * Unregister all event handlers
 * Call this during graceful shutdown
 */
function unregisterEventHandlers() {
  logger.info('Unregistering Paylinq event handlers...');
  
  try {
    // Remove all listeners for consumed events
    Object.values(CONSUMED_EVENTS).forEach(eventType => {
      paylinqEvents.removeAllListeners(eventType);
    });

    logger.info('Successfully unregistered all Paylinq event handlers');
  } catch (error) {
    logger.error('Error unregistering Paylinq event handlers', {
      error: error.message
    });
  }
}

/**
 * Get event listener statistics
 * @returns {Object} Statistics about registered listeners
 */
function getEventStats() {
  const stats = {
    emitter: paylinqEvents.getStats(),
    listeners: {}
  };

  // Count listeners for each consumed event type
  Object.values(CONSUMED_EVENTS).forEach(eventType => {
    const listenerCount = paylinqEvents.listenerCount(eventType);
    if (listenerCount > 0) {
      stats.listeners[eventType] = listenerCount;
    }
  });

  return stats;
}

// Named exports for testing
export {
  registerEventHandlers,
  unregisterEventHandlers,
  getEventStats
};

// Default export for convenience
export default {
  registerEventHandlers,
  unregisterEventHandlers,
  getEventStats
};
