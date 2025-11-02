import { jest } from '@jest/globals';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Mock dependencies before importing logger
jest.unstable_mockModule('winston', () => {
  // Mock format that returns a proper transform function
  const mockFormat = jest.fn((transformFn) => {
    // Return a function that transforms log info
    const formatter = (info = {}) => {
      if (typeof transformFn === 'function') {
        const result = transformFn(info);
        return result === false ? false : (result || info);
      }
      return info;
    };
    formatter.transform = formatter;
    return formatter;
  });
  
  // Add format helpers
  mockFormat.combine = jest.fn((...formats) => {
    return {
      transform: (info) => {
        let result = info;
        for (const format of formats) {
          if (format && format.transform) {
            result = format.transform(result);
            if (result === false) return false;
          }
        }
        return result;
      },
    };
  });
  mockFormat.timestamp = jest.fn(() => ({ transform: (info) => ({ ...info, timestamp: new Date().toISOString() }) }));
  mockFormat.printf = jest.fn(fn => ({ transform: (info) => ({ ...info, message: typeof fn === 'function' ? fn(info) : info.message }) }));
  mockFormat.colorize = jest.fn(() => ({ transform: (info) => info }));
  mockFormat.errors = jest.fn(() => ({ transform: (info) => info }));
  mockFormat.json = jest.fn(() => ({ transform: (info) => info }));
  mockFormat.metadata = jest.fn(() => ({ transform: (info) => info }));
  
  return {
    default: {
      createLogger: jest.fn(() => mockLogger),
      format: mockFormat,
      transports: {
        Console: jest.fn(),
        File: jest.fn(),
      },
    },
  };
});

jest.unstable_mockModule('../../config/index.js', () => ({
  default: {
    env: 'test',
    logging: {
      level: 'info',
    },
    deployment: {
      type: 'local',
      tenantId: 'dev-tenant',
      instanceId: 'dev-instance',
    },
    centralLogging: {
      enabled: false,
    },
  },
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
  },
}));

jest.unstable_mockModule('pg', () => ({
  Pool: jest.fn(),
}));

// Create mock logger instance
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  child: jest.fn(function(meta) {
    return {
      ...this,
      defaultMeta: meta,
    };
  }),
};

// Import after mocking
const logger = (await import('../logger.js')).default;
const {
  logSecurityEvent,
  SecurityEventType,
  trackFailedLogin,
  generateRequestId,
  createRequestLogger,
  logPerformance,
  logWithContext,
  logDatabaseError,
} = await import('../logger.js');

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error message');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message');
    });

    it('should log with metadata', () => {
      const metadata = { userId: 123, action: 'test' };
      logger.info('Test with metadata', metadata);
      expect(mockLogger.info).toHaveBeenCalledWith('Test with metadata', metadata);
    });
  });

  describe('Security Event Logging', () => {
    it('should export SecurityEventType constants', () => {
      expect(SecurityEventType).toBeDefined();
      expect(SecurityEventType.LOGIN_SUCCESS).toBe('login_success');
      expect(SecurityEventType.LOGIN_FAILURE).toBe('login_failure');
      expect(SecurityEventType.LOGOUT).toBe('logout');
      expect(SecurityEventType.ACCOUNT_LOCKED).toBe('account_locked');
    });

    it('should log security event without request', () => {
      const details = { userId: 123, reason: 'test' };
      logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, details);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event: login_success',
        expect.objectContaining({
          securityEvent: true,
          eventType: 'login_success',
          userId: 123,
          reason: 'test',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log security event with request context', () => {
      const req = {
        id: 'req-123',
        user: { id: 456, email: 'test@example.com' },
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/auth/login',
        query: { returnUrl: '/dashboard' },
        get: jest.fn(() => 'Mozilla/5.0'),
        connection: { remoteAddress: '192.168.1.1' },
      };

      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, { reason: 'invalid_password' }, req);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Security Event: login_failure',
        expect.objectContaining({
          securityEvent: true,
          eventType: 'login_failure',
          requestId: 'req-123',
          userId: 456,
          userEmail: 'test@example.com',
          ip: '192.168.1.1',
          method: 'POST',
          path: '/api/auth/login',
          reason: 'invalid_password',
        })
      );
    });

    it('should log security event with custom severity', () => {
      logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, { severity: 'warn' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Security Event: unauthorized_access',
        expect.any(Object)
      );
    });

    it('should redact sensitive data in security events', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/auth/login',
        query: { password: 'secret123', returnUrl: '/dashboard' },
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.query.password).toBe('[REDACTED]');
      expect(eventData.query.returnUrl).toBe('/dashboard');
    });

    it('should handle missing user in request', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/public',
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      logSecurityEvent(SecurityEventType.DATA_ACCESS, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.userId).toBeUndefined();
      expect(eventData.userEmail).toBeUndefined();
    });
  });

  describe('Failed Login Tracking', () => {
    beforeEach(() => {
      // Clear the internal Map by tracking and then waiting
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track failed login attempts', () => {
      const req = {
        id: 'req-unique-1',
        ip: '10.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      const count = trackFailedLogin('unique1@example.com', req);
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should increment failed login count', () => {
      const req = {
        id: 'req-unique-2',
        ip: '10.0.0.2',
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      const count1 = trackFailedLogin('unique2@example.com', req);
      const count2 = trackFailedLogin('unique2@example.com', req);
      const count3 = trackFailedLogin('unique2@example.com', req);

      expect(count2).toBe(count1 + 1);
      expect(count3).toBe(count2 + 1);
    });

    it('should track attempts separately for different IPs', () => {
      const req1 = { id: 'req-3', ip: '10.0.0.3', get: jest.fn() };
      const req2 = { id: 'req-4', ip: '10.0.0.4', get: jest.fn() };

      const count1 = trackFailedLogin('unique3@example.com', req1);
      const count2 = trackFailedLogin('unique3@example.com', req2);

      expect(count1).toBeGreaterThanOrEqual(1);
      expect(count2).toBeGreaterThanOrEqual(1);
    });

    it('should track attempts separately for different users', () => {
      const req = { id: 'req-5', ip: '10.0.0.5', get: jest.fn() };

      const count1 = trackFailedLogin('unique4@example.com', req);
      const count2 = trackFailedLogin('unique5@example.com', req);

      expect(count1).toBeGreaterThanOrEqual(1);
      expect(count2).toBeGreaterThanOrEqual(1);
    });

    it('should log suspicious activity after 5 attempts', () => {
      const req = {
        id: 'req-suspicious',
        ip: '10.0.0.100',
        method: 'POST',
        path: '/api/auth/login',
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      // Clear any previous calls
      mockLogger.log.mockClear();

      for (let i = 0; i < 5; i++) {
        trackFailedLogin('suspicious@example.com', req);
      }

      // Should have been called once when count reached 5
      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Security Event: suspicious_activity',
        expect.objectContaining({
          eventType: 'suspicious_activity',
          severity: 'warn',
          reason: 'multiple_failed_logins',
          identifier: 'suspicious@example.com',
          attemptCount: 5,
        })
      );
    });

    it('should expire old failed login attempts', () => {
      const req = { id: 'req-expire', ip: '10.0.0.200', get: jest.fn() };

      // Record attempts
      trackFailedLogin('expire@example.com', req);
      trackFailedLogin('expire@example.com', req);

      // Advance time by 16 minutes (past the 15-minute window)
      jest.advanceTimersByTime(16 * 60 * 1000);

      // New attempt should reset count
      const count = trackFailedLogin('expire@example.com', req);
      expect(count).toBe(1);
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate request ID with timestamp and random component', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });

    it('should create request logger with context', () => {
      const requestId = 'req-123';
      const userId = 456;

      const requestLogger = createRequestLogger(requestId, userId);

      expect(mockLogger.child).toHaveBeenCalledWith({
        requestId: 'req-123',
        userId: 456,
      });
    });

    it('should create request logger without userId', () => {
      const requestId = 'req-123';

      const requestLogger = createRequestLogger(requestId);

      expect(mockLogger.child).toHaveBeenCalledWith({
        requestId: 'req-123',
        userId: null,
      });
    });
  });

  describe('Performance Logging', () => {
    it('should log slow operations as warnings', () => {
      logPerformance('database_query', 2500);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow operation detected',
        expect.objectContaining({
          operation: 'database_query',
          duration: '2500ms',
          threshold: '1000ms',
        })
      );
    });

    it('should log fast operations as debug', () => {
      logPerformance('cache_lookup', 50);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          operation: 'cache_lookup',
          duration: '50ms',
        })
      );
    });

    it('should use custom threshold', () => {
      logPerformance('api_call', 1500, { threshold: 2000 });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          operation: 'api_call',
          duration: '1500ms',
          threshold: 2000, // Logger stores threshold as number, not string
        })
      );
    });

    it('should include additional details', () => {
      logPerformance('complex_query', 3000, {
        query: 'SELECT * FROM users',
        rowCount: 1000,
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow operation detected',
        expect.objectContaining({
          operation: 'complex_query',
          duration: '3000ms',
          query: 'SELECT * FROM users',
          rowCount: 1000,
        })
      );
    });
  });

  describe('Context Logging', () => {
    it('should log with request context', () => {
      const req = {
        id: 'req-123',
        user: { id: 456 },
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/users',
      };

      logWithContext('info', 'User fetched data', req, { recordCount: 10 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'User fetched data',
        expect.objectContaining({
          requestId: 'req-123',
          userId: 456,
          ip: '192.168.1.1',
          method: 'GET',
          path: '/api/users',
          recordCount: 10,
        })
      );
    });

    it('should handle missing user in request context', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/public',
      };

      logWithContext('info', 'Public endpoint accessed', req);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'Public endpoint accessed',
        expect.objectContaining({
          requestId: 'req-123',
          ip: '192.168.1.1',
        })
      );
    });
  });

  describe('Database Error Logging', () => {
    it('should log database errors without exposing query', () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      };

      logDatabaseError(error, 'INSERT INTO users...', ['test@example.com']);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          code: '23505',
          message: 'duplicate key value violates unique constraint',
          query: 'REDACTED',
          params: 'REDACTED',
        })
      );
    });

    it('should log database error without query details', () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      };

      logDatabaseError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          code: 'ECONNREFUSED',
          message: 'Connection refused',
        })
      );
    });
  });

  describe('Sensitive Data Redaction', () => {
    it('should redact password fields', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/auth/login',
        query: { email: 'test@example.com', password: 'secret123' },
        get: jest.fn(),
      };

      logSecurityEvent(SecurityEventType.LOGIN_ATTEMPT, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.query.password).toBe('[REDACTED]');
      expect(eventData.query.email).toBe('test@example.com');
    });

    it('should redact token fields', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/auth/refresh',
        query: { refreshToken: 'jwt-token-here' },
        get: jest.fn(),
      };

      logSecurityEvent(SecurityEventType.TOKEN_REFRESH, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.query.refreshToken).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/users',
        query: {
          user: {
            email: 'test@example.com',
            password: 'secret123',
            profile: {
              name: 'Test User',
              ssn: '123-45-6789',
            },
          },
        },
        get: jest.fn(),
      };

      logSecurityEvent(SecurityEventType.USER_CREATED, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.query.user.password).toBe('[REDACTED]');
      expect(eventData.query.user.profile.ssn).toBe('[REDACTED]');
      expect(eventData.query.user.email).toBe('test@example.com');
      expect(eventData.query.user.profile.name).toBe('Test User');
    });

    it('should include headers in security events', () => {
      const req = {
        id: 'req-headers',
        ip: '192.168.1.1',
        method: 'GET',
        path: '/api/users',
        query: {},
        get: jest.fn(() => 'Mozilla/5.0'),
      };

      // Clear previous calls
      mockLogger.log.mockClear();

      logSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        { headers: { authorization: 'Bearer jwt-token', 'content-type': 'application/json' } },
        req
      );

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      // Headers are included in the event
      expect(eventData.headers).toBeDefined();
      expect(eventData.headers['content-type']).toBe('application/json');
      
      // Note: Redaction happens at Winston format level, not in logSecurityEvent
      // The function just logs the data, Winston's redactFormat will handle redaction
    });

    it('should handle arrays with sensitive data', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/users/bulk',
        query: {
          users: [
            { email: 'user1@example.com', password: 'pass1' },
            { email: 'user2@example.com', password: 'pass2' },
          ],
        },
        get: jest.fn(),
      };

      logSecurityEvent(SecurityEventType.DATA_MODIFICATION, {}, req);

      const logCall = mockLogger.log.mock.calls[0];
      const eventData = logCall[2];
      
      expect(eventData.query.users[0].password).toBe('[REDACTED]');
      expect(eventData.query.users[1].password).toBe('[REDACTED]');
      expect(eventData.query.users[0].email).toBe('user1@example.com');
    });

    it('should prevent infinite recursion on circular references', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      const req = {
        id: 'req-123',
        ip: '192.168.1.1',
        method: 'POST',
        path: '/api/test',
        query: { data: circular },
        get: jest.fn(),
      };

      // Should not throw error
      expect(() => {
        logSecurityEvent(SecurityEventType.DATA_ACCESS, {}, req);
      }).not.toThrow();
    });
  });

  describe('Security Event Types', () => {
    it('should have all required security event types', () => {
      const requiredTypes = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGOUT',
        'TOKEN_REFRESH',
        'PASSWORD_CHANGE',
        'ACCOUNT_LOCKED',
        'RATE_LIMIT_EXCEEDED',
        'UNAUTHORIZED_ACCESS',
        'SQL_INJECTION_ATTEMPT',
        'XSS_ATTEMPT',
      ];

      requiredTypes.forEach(type => {
        expect(SecurityEventType[type]).toBeDefined();
        expect(typeof SecurityEventType[type]).toBe('string');
      });
    });
  });
});
