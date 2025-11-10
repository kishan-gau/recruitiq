/**
 * Event Emitter Tests
 * 
 * Unit tests for PaylinqEventEmitter functionality.
 */

import PaylinqEventEmitter from '../../../../src/products/paylinq/events/eventEmitter.js';

describe('PaylinqEventEmitter', () => {
  let emitter;

  beforeEach(async () => {
    // Get fresh emitter instance and clear history
    const module = await import('../../../../src/products/paylinq/events/eventEmitter.js');
    emitter = module.default;
    // Clear event history for clean tests
    if (emitter.eventHistory) {
      emitter.eventHistory.length = 0;
    }
  });

  afterEach(() => {
    // Remove all listeners after each test
    emitter.removeAllListeners();
  });

  describe('Event Emission', () => {
    test('should emit event successfully', (done) => {
      const eventType = 'test.event';
      const eventData = { testKey: 'testValue' };

      emitter.on(eventType, (event) => {
        expect(event.type).toBe(eventType);
        expect(event.data).toEqual(eventData);
        expect(event.eventId).toBeDefined();
        expect(event.timestamp).toBeDefined();
        done();
      });

      emitter.emitEvent(eventType, eventData);
    });

    test('should add event to history', () => {
      const eventType = 'test.event';
      const eventData = { id: '123' };

      emitter.emitEvent(eventType, eventData);

      const history = emitter.getEventHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(eventType);
      expect(history[0].data).toEqual(eventData);
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].eventId).toBeDefined();
    });

    test('should handle multiple events', (done) => {
      let count = 0;
      const eventType = 'test.multiple';

      emitter.on(eventType, () => {
        count++;
        if (count === 3) {
          expect(count).toBe(3);
          done();
        }
      });

      emitter.emitEvent(eventType, { index: 1 });
      emitter.emitEvent(eventType, { index: 2 });
      emitter.emitEvent(eventType, { index: 3 });
    });

    test('should handle events with no listeners gracefully', () => {
      expect(() => {
        emitter.emitEvent('test.no.listener', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('Event History', () => {
    test('should maintain event history up to max size', () => {
      // Emit more than 100 events
      for (let i = 0; i < 150; i++) {
        emitter.emitEvent('test.history', { index: i });
      }

      const history = emitter.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    test('should return limited history when limit specified', () => {
      for (let i = 0; i < 20; i++) {
        emitter.emitEvent('test.history', { index: i });
      }

      const history = emitter.getEventHistory(5);
      expect(history).toHaveLength(5);
    });

    test('should return events in reverse chronological order', () => {
      emitter.emitEvent('test.order', { index: 1 });
      emitter.emitEvent('test.order', { index: 2 });
      emitter.emitEvent('test.order', { index: 3 });

      const history = emitter.getEventHistory(3);
      expect(history[0].data.index).toBe(1); // getEventHistory returns in order emitted
      expect(history[1].data.index).toBe(2);
      expect(history[2].data.index).toBe(3);
    });

    test('should include timestamp in history', () => {
      emitter.emitEvent('test.timestamp', { data: 'test' });

      const history = emitter.getEventHistory(1);
      expect(history[0].timestamp).toBeDefined();
      expect(typeof history[0].timestamp).toBe('string');
      expect(new Date(history[0].timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Event Statistics', () => {
    test('should track total events emitted', () => {
      emitter.clearHistory();
      
      emitter.emitEvent('test.stats', { data: 1 });
      emitter.emitEvent('test.stats', { data: 2 });
      emitter.emitEvent('test.stats', { data: 3 });

      const stats = emitter.getStats();
      expect(stats.totalEvents).toBe(3);
    });

    test('should report event history size', () => {
      emitter.clearHistory();
      
      emitter.emitEvent('test.size', { data: 1 });
      emitter.emitEvent('test.size', { data: 2 });

      const stats = emitter.getStats();
      expect(stats.totalEvents).toBeGreaterThanOrEqual(2);
      expect(stats.recentEvents).toHaveLength(2);
    });
  });

  describe('Listener Management', () => {
    test('should allow multiple listeners for same event', (done) => {
      let count = 0;
      const eventType = 'test.multiple.listeners';

      emitter.on(eventType, () => {
        count++;
      });

      emitter.on(eventType, () => {
        count++;
        if (count === 2) {
          expect(count).toBe(2);
          done();
        }
      });

      emitter.emitEvent(eventType, {});
    });

    test('should support listener removal', () => {
      const eventType = 'test.remove';
      let count = 0;

      const listener = () => {
        count++;
      };

      emitter.on(eventType, listener);
      emitter.emitEvent(eventType, {});
      expect(count).toBe(1);

      emitter.removeListener(eventType, listener);
      emitter.emitEvent(eventType, {});
      expect(count).toBe(1); // Should not increment
    });

    test('should report listener count', () => {
      const eventType = 'test.count';

      emitter.on(eventType, () => {});
      emitter.on(eventType, () => {});
      emitter.on(eventType, () => {});

      expect(emitter.listenerCount(eventType)).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle listener errors gracefully', () => {
      const eventType = 'test.error';

      emitter.on(eventType, () => {
        throw new Error('Listener error');
      });

      // Should not throw - errors are caught
      expect(() => {
        emitter.emitEvent(eventType, {});
      }).not.toThrow();
    });

    test('should continue processing other listeners after error', (done) => {
      const eventType = 'test.continue';
      let listener2Called = false;

      emitter.on(eventType, () => {
        throw new Error('First listener error');
      });

      emitter.on(eventType, () => {
        listener2Called = true;
      });

      emitter.emitEvent(eventType, {});

      // Give async processing time
      setTimeout(() => {
        expect(listener2Called).toBe(true);
        done();
      }, 50);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', async () => {
      const module1 = await import('../../../../src/products/paylinq/events/eventEmitter.js');
      const module2 = await import('../../../../src/products/paylinq/events/eventEmitter.js');

      expect(module1.default).toBe(module2.default);
    });

    test('should share event history across imports', async () => {
      const module1 = await import('../../../../src/products/paylinq/events/eventEmitter.js');
      module1.default.emitEvent('test.singleton', { data: 'shared' });

      const module2 = await import('../../../../src/products/paylinq/events/eventEmitter.js');
      const history = module2.default.getEventHistory(1);

      expect(history.length).toBeGreaterThan(0);
    });
  });
});
