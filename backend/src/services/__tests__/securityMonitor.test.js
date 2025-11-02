/**
 * Unit Tests for Security Monitor Service
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  logSecurityEvent: jest.fn(),
};

const mockConfig = {
  deployment: { type: 'on-premise', tenantId: 'test-tenant', instanceId: 'test-instance' },
  monitoring: { alertChannels: ['log'], webhookUrl: null },
  centralMonitoring: { enabled: false },
};

const mockCloudWatchClient = { isEnabled: jest.fn(() => false), putAlert: jest.fn() };
const mockDatadogClient = { isEnabled: jest.fn(() => false), sendAlert: jest.fn() };

jest.unstable_mockModule('../../utils/logger.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../config/index.js', () => ({ default: mockConfig }));
jest.unstable_mockModule('../../integrations/cloudwatch.js', () => ({ default: mockCloudWatchClient }));
jest.unstable_mockModule('../../integrations/datadog.js', () => ({ default: mockDatadogClient }));

const { default: securityMonitor, SecurityEventType, AlertSeverity, SecurityMonitor } = await import('../securityMonitor.js');

describe('SecurityMonitor', () => {
  beforeEach(() => { jest.clearAllMocks(); securityMonitor.reset(); process.env.SECURITY_MONITORING_ENABLED = 'true'; });

  describe('trackEvent', () => {
    it('should track security event and update metrics', () => {
      const metadata = { ip: '192.168.1.1', username: 'testuser' };
      const event = securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, metadata);
      expect(event).toBeDefined();
      expect(event.type).toBe(SecurityEventType.FAILED_LOGIN);
      expect(event.metadata).toEqual(metadata);
      const metrics = securityMonitor.getMetrics();
      expect(metrics.totalEvents).toBe(1);
    });

    it('should log security event', () => {
      const metadata = { ip: '192.168.1.1' };
      securityMonitor.trackEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, metadata);
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(SecurityEventType.SQL_INJECTION_ATTEMPT, metadata);
    });
  });

  describe('determineSeverity', () => {
    it('should return CRITICAL for attack events', () => {
      expect(securityMonitor.determineSeverity(SecurityEventType.BRUTE_FORCE_DETECTED)).toBe(AlertSeverity.CRITICAL);
      expect(securityMonitor.determineSeverity(SecurityEventType.SQL_INJECTION_ATTEMPT)).toBe(AlertSeverity.CRITICAL);
    });

    it('should return WARNING for suspicious events', () => {
      expect(securityMonitor.determineSeverity(SecurityEventType.FAILED_LOGIN)).toBe(AlertSeverity.WARNING);
      expect(securityMonitor.determineSeverity(SecurityEventType.RATE_LIMIT_EXCEEDED)).toBe(AlertSeverity.WARNING);
    });

    it('should return INFO for other events', () => {
      expect(securityMonitor.determineSeverity(SecurityEventType.PASSWORD_RESET_REQUESTED)).toBe(AlertSeverity.INFO);
    });
  });

  describe('handleFailedLogin', () => {
    it('should track failed login attempts', () => {
      securityMonitor.handleFailedLogin({ ip: '192.168.1.1', username: 'testuser' });
      expect(securityMonitor.failedLogins.has('192.168.1.1')).toBe(true);
    });

    it('should detect brute force when threshold exceeded', () => {
      for (let i = 0; i < 5; i++) {
        securityMonitor.handleFailedLogin({ ip: '192.168.1.1', username: 'user' });
      }
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(SecurityEventType.BRUTE_FORCE_DETECTED, expect.anything());
    });

    it('should reset tracking after window expires', () => {
      securityMonitor.handleFailedLogin({ ip: '192.168.1.1', username: 'user' });
      const tracking = securityMonitor.failedLogins.get('192.168.1.1');
      tracking.firstAttempt = Date.now() - (900000 + 1);
      securityMonitor.handleFailedLogin({ ip: '192.168.1.1', username: 'user' });
      expect(securityMonitor.failedLogins.get('192.168.1.1').count).toBe(1);
    });
  });

  describe('handleRateLimitExceeded', () => {
    it('should track rate limit violations', () => {
      securityMonitor.handleRateLimitExceeded({ ip: '192.168.1.1', endpoint: '/api/users' });
      expect(securityMonitor.requestCounts.has('192.168.1.1:/api/users')).toBe(true);
    });

    it('should send alert when threshold exceeded', () => {
      const alertSpy = jest.spyOn(securityMonitor, 'sendAlert');
      for (let i = 0; i < 100; i++) {
        securityMonitor.handleRateLimitExceeded({ ip: '192.168.1.1', endpoint: '/api/users' });
      }
      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('sendAlert', () => {
    it('should create and emit alert', () => {
      const emitSpy = jest.spyOn(securityMonitor, 'emit');
      const event = { type: SecurityEventType.BRUTE_FORCE_DETECTED, timestamp: new Date(), metadata: { ip: '192.168.1.1' } };
      securityMonitor.sendAlert(event, AlertSeverity.CRITICAL);
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should skip alert within cooldown', () => {
      const event = { type: SecurityEventType.FAILED_LOGIN, timestamp: new Date(), metadata: { ip: '192.168.1.1' } };
      securityMonitor.sendAlert(event, AlertSeverity.WARNING);
      securityMonitor.sendAlert(event, AlertSeverity.WARNING);
      expect(securityMonitor.getMetrics().alertsSent).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', () => {
      securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, { ip: '192.168.1.1' });
      const metrics = securityMonitor.getMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.eventsByType).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', () => {
      const health = securityMonitor.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.enabled).toBe(true);
    });
  });
});
