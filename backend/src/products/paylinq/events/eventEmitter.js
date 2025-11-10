/**
 * Paylinq Event Emitter
 * 
 * Event-driven communication layer for Paylinq product.
 * Handles incoming HRIS events and emits payroll events.
 * 
 * @module products/paylinq/events/eventEmitter
 */

import { EventEmitter } from 'events';
import logger from '../../../utils/logger.js';

/**
 * Paylinq Event Emitter
 * Extends Node.js EventEmitter for product-specific events
 */
class PaylinqEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Emit event with logging and history tracking
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {boolean} True if event had listeners
   */
  emitEvent(eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      eventId: `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Log event emission
    logger.info('Paylinq event emitted', {
      eventType,
      eventId: event.eventId,
      organizationId: eventData.organizationId
    });

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit the event with error handling for listeners
    const listeners = this.listeners(eventType);
    let hadListeners = listeners.length > 0;
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error('Error in event listener', {
          eventType,
          eventId: event.eventId,
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    return hadListeners;
  }

  /**
   * Get recent event history
   * @param {number} limit - Number of events to return
   * @returns {Array} Recent events
   */
  getEventHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Get event statistics
   * @returns {Object} Event stats
   */
  getStats() {
    const stats = {
      totalEvents: this.eventHistory.length,
      eventTypes: {},
      recentEvents: this.getEventHistory(5)
    };

    this.eventHistory.forEach(event => {
      stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
    });

    return stats;
  }
}

// Create singleton instance
const paylinqEvents = new PaylinqEventEmitter();

// Set max listeners to avoid warnings
paylinqEvents.setMaxListeners(50);

// Named export for tests that expect it
export const eventEmitter = paylinqEvents;

export default paylinqEvents;
