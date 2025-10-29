/**
 * Security Monitoring Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import securityMonitor, { SecurityEventType, AlertSeverity } from '../../services/securityMonitor.js';

describe('Security Monitor', () => {
  beforeEach(() => {
    // Reset monitor before each test
    securityMonitor.reset();
  });
  
  afterEach(() => {
    // Clean up
    securityMonitor.removeAllListeners();
  });
  
  describe('trackEvent', () => {
    it('should track security event', () => {
      const event = securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
        ip: '192.168.1.1',
        username: 'test@example.com',
      });
      
      expect(event).toBeTruthy();
      expect(event.type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(event.metadata.ip).toBe('192.168.1.1');
    });
    
    it('should update metrics on event', () => {
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {});
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {});
      
      const metrics = securityMonitor.getMetrics();
      
      expect(metrics.totalEvents).toBe(2);
      expect(metrics.eventsByType[SecurityEventType.FAILED_LOGIN]).toBe(2);
    });
  });
  
  describe('failed login tracking', () => {
    it('should detect brute force after threshold', (done) => {
      const ip = '192.168.1.1';
      
      // Listen for brute force detection
      securityMonitor.once('alert', (alert) => {
        expect(alert.type).toBe(SecurityEventType.BRUTE_FORCE_DETECTED);
        expect(alert.severity).toBe(AlertSeverity.CRITICAL);
        expect(alert.metadata.ip).toBe(ip);
        done();
      });
      
      // Simulate 5 failed logins
      for (let i = 0; i < 5; i++) {
        securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
          ip,
          username: 'test@example.com',
        });
      }
    });
    
    it('should reset tracking after window expires', () => {
      const ip = '192.168.1.1';
      
      // Track 3 failed logins
      for (let i = 0; i < 3; i++) {
        securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
          ip,
          username: 'test@example.com',
        });
      }
      
      // Manually expire the window
      const tracking = securityMonitor.failedLogins.get(ip);
      tracking.firstAttempt = Date.now() - 16 * 60 * 1000; // 16 minutes ago
      
      // Track one more login (should reset)
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
        ip,
        username: 'test@example.com',
      });
      
      const updatedTracking = securityMonitor.failedLogins.get(ip);
      expect(updatedTracking.count).toBe(1);
    });
  });
  
  describe('rate limit tracking', () => {
    it('should detect excessive rate limit violations', (done) => {
      const ip = '192.168.1.1';
      const endpoint = '/api/users';
      
      // Listen for unusual activity alert
      securityMonitor.once('alert', (alert) => {
        expect(alert.type).toBe(SecurityEventType.UNUSUAL_ACTIVITY);
        done();
      });
      
      // Simulate 100 rate limit violations
      for (let i = 0; i < 100; i++) {
        securityMonitor.trackEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
          ip,
          endpoint,
        });
      }
    });
  });
  
  describe('attack detection', () => {
    it('should immediately alert on SQL injection attempt', (done) => {
      securityMonitor.once('alert', (alert) => {
        expect(alert.type).toBe(SecurityEventType.SQL_INJECTION_ATTEMPT);
        expect(alert.severity).toBe(AlertSeverity.CRITICAL);
        done();
      });
      
      securityMonitor.trackEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
        ip: '192.168.1.1',
        endpoint: '/api/users',
        suspiciousInput: "' OR '1'='1",
      });
    });
    
    it('should immediately alert on XSS attempt', (done) => {
      securityMonitor.once('alert', (alert) => {
        expect(alert.type).toBe(SecurityEventType.XSS_ATTEMPT);
        expect(alert.severity).toBe(AlertSeverity.CRITICAL);
        done();
      });
      
      securityMonitor.trackEvent(SecurityEventType.XSS_ATTEMPT, {
        ip: '192.168.1.1',
        suspiciousInput: '<script>alert(1)</script>',
      });
    });
  });
  
  describe('alert cooldown', () => {
    it('should not send duplicate alerts within cooldown period', () => {
      const ip = '192.168.1.1';
      let alertCount = 0;
      
      securityMonitor.on('alert', () => {
        alertCount++;
      });
      
      // Trigger brute force twice
      for (let i = 0; i < 5; i++) {
        securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
          ip,
          username: 'test@example.com',
        });
      }
      
      // Try to trigger again immediately
      for (let i = 0; i < 5; i++) {
        securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
          ip,
          username: 'test@example.com',
        });
      }
      
      // Should only have one alert due to cooldown
      expect(alertCount).toBe(1);
    });
  });
  
  describe('metrics', () => {
    it('should track event metrics', () => {
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {});
      securityMonitor.trackEvent(SecurityEventType.UNAUTHORIZED_ACCESS, {});
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {});
      
      const metrics = securityMonitor.getMetrics();
      
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.eventsByType[SecurityEventType.FAILED_LOGIN]).toBe(2);
      expect(metrics.eventsByType[SecurityEventType.UNAUTHORIZED_ACCESS]).toBe(1);
    });
    
    it('should track alert metrics', (done) => {
      securityMonitor.once('alert', () => {
        const metrics = securityMonitor.getMetrics();
        expect(metrics.alertsSent).toBe(1);
        expect(metrics.lastAlert).toBeTruthy();
        done();
      });
      
      securityMonitor.trackEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
        ip: '192.168.1.1',
      });
    });
  });
  
  describe('severity determination', () => {
    it('should assign critical severity to brute force', () => {
      const severity = securityMonitor.determineSeverity(
        SecurityEventType.BRUTE_FORCE_DETECTED
      );
      expect(severity).toBe(AlertSeverity.CRITICAL);
    });
    
    it('should assign warning severity to failed login', () => {
      const severity = securityMonitor.determineSeverity(
        SecurityEventType.FAILED_LOGIN
      );
      expect(severity).toBe(AlertSeverity.WARNING);
    });
    
    it('should assign info severity to unknown events', () => {
      const severity = securityMonitor.determineSeverity('unknown_event');
      expect(severity).toBe(AlertSeverity.INFO);
    });
  });
  
  describe('alert descriptions', () => {
    it('should generate description for brute force', () => {
      const event = {
        type: SecurityEventType.BRUTE_FORCE_DETECTED,
        metadata: {
          ip: '192.168.1.1',
          attemptCount: 5,
        },
      };
      
      const description = securityMonitor.getAlertDescription(event);
      
      expect(description).toContain('192.168.1.1');
      expect(description).toContain('5');
    });
    
    it('should generate description for SQL injection', () => {
      const event = {
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        metadata: {
          ip: '192.168.1.1',
          endpoint: '/api/users',
        },
      };
      
      const description = securityMonitor.getAlertDescription(event);
      
      expect(description).toContain('192.168.1.1');
      expect(description).toContain('/api/users');
    });
  });
  
  describe('health check', () => {
    it('should return health status', () => {
      const health = securityMonitor.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('enabled');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('config');
    });
    
    it('should include configuration', () => {
      const health = securityMonitor.healthCheck();
      
      expect(health.config.failedLoginThreshold).toBeTruthy();
      expect(health.config.failedLoginWindowMs).toBeTruthy();
    });
  });
  
  describe('reset', () => {
    it('should clear all tracking data', () => {
      // Add some events
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
        ip: '192.168.1.1',
      });
      
      // Reset
      securityMonitor.reset();
      
      const metrics = securityMonitor.getMetrics();
      
      expect(metrics.totalEvents).toBe(0);
      expect(metrics.alertsSent).toBe(0);
      expect(metrics.activeThreats.failedLogins).toBe(0);
    });
  });
});
