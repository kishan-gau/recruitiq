/**
 * Event Bus
 * Central event management system for cross-product communication
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    
    const callbacks = this.listeners.get(eventName);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event
   */
  async emit(eventName, data) {
    if (!this.listeners.has(eventName)) return;
    
    const callbacks = this.listeners.get(eventName);
    const promises = callbacks.map(callback => {
      try {
        return Promise.resolve(callback(data));
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
        return Promise.resolve();
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Emit event synchronously
   */
  emitSync(eventName, data) {
    if (!this.listeners.has(eventName)) return;
    
    const callbacks = this.listeners.get(eventName);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  /**
   * Subscribe to event once
   */
  once(eventName, callback) {
    const onceCallback = (data) => {
      this.off(eventName, onceCallback);
      callback(data);
    };
    this.on(eventName, onceCallback);
  }

  /**
   * Clear all listeners for an event
   */
  clearEvent(eventName) {
    this.listeners.delete(eventName);
  }

  /**
   * Clear all listeners
   */
  clearAll() {
    this.listeners.clear();
  }

  /**
   * Get listener count for event
   */
  listenerCount(eventName) {
    return this.listeners.has(eventName) ? this.listeners.get(eventName).length : 0;
  }
}

// Singleton instance
const eventBus = new EventBus();

export default eventBus;
export { EventBus };
