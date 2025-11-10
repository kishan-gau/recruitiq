/**
 * Paylinq Events Module
 * 
 * Entry point for Paylinq event system.
 * Exports event emitter, types, handlers, and registry.
 * 
 * @module products/paylinq/events
 */

import paylinqEvents from './eventEmitter.js';
import { CONSUMED_EVENTS, EMITTED_EVENTS, isValidEventType, isConsumedEvent, isEmittedEvent  } from './eventTypes.js';
import { registerEventHandlers, unregisterEventHandlers, getEventStats  } from './eventRegistry.js';
import payrollEmitters from './emitters/payrollEmitters.js';
import hrisHandlers from './handlers/hrisHandlers.js';

export default {
  // Event emitter instance
  paylinqEvents,
  
  // Event types
  CONSUMED_EVENTS,
  EMITTED_EVENTS,
  isValidEventType,
  isConsumedEvent,
  isEmittedEvent,
  
  // Event registry
  registerEventHandlers,
  unregisterEventHandlers,
  getEventStats,
  
  // Emitters
  payrollEmitters,
  
  // Handlers
  hrisHandlers
};
