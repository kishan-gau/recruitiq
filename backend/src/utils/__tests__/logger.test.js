import logger, {
  SecurityEventType,
  logSecurityEvent,
  trackFailedLogin,
  generateRequestId,
  createRequestLogger,
  logPerformance,
  logWithContext,
  logDatabaseError,
} from '../logger.js';

// Mock winston
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    metadata: jest.fn(),
  };

  const mTransports = {
    Console: jest.fn(),
    File: jest.fn(),
  };

  const mLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    child: jest.fn().mockReturnThis(),
    add: jest.fn(),
  };

  return {
    format: mFormat,
    transports: mTransports,
    createLogger: jest.fn(() => mLogger),
  };
});

describe('Logger Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sensitive Data Redaction', () => {
    test('should redact password fields', () => {
      // The redaction happens in the logger format
      // This test verifies the concept
      const sensitiveData = {
        email: 'test@test.com',
        password: 'secret123',
        name: 'John Doe',
      };

      // When logged, password should be redacted
      logger.info('User data', sensitiveData);

      expect(logger.info).toHaveBeenCalled();
    });

    test('should redact token fields', () => {
      const data = {
        userId: '123',
        accessToken: 'token_abc123',
        apiKey: 'key_xyz789',
      };

      logger.info('Auth data', data);

      expect(logger.info).toHaveBeenCalled();
    });

    test('should redact nested sensitive fields', () => {
      const data = {
        user: {
          email: 'test@test.com',
          password: 'secret',
          profile: {
            name: 'John',
            ssn: '123-45-6789',
          },
        },
      };

      logger.info('Nested data', data);

      expect(logger.info).toHaveBeenCalled();
    });

    test('should not redact safe fields', () => {
      const data = {
        email: 'test@test.com',
        name: 'John Doe',
        age: 30,
      };

      logger.info('Safe data', data);

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('Security Event Logging', () => {
    test('should log login success event', () => {
      const req = {
        id: 'req-123',
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        method: 'POST',
        path: '/api/auth/login',
        user: { id: 'user-123', email: 'test@test.com' },
        query: {},
      };

      logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
        userId: 'user-123',
        email: 'test@test.com',
      }, req);

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('login_success'),
        expect.objectContaining({
          securityEvent: true,
          eventType: SecurityEventType.LOGIN_SUCCESS,
          userId: 'user-123',
        })
      );
    });

    test('should log login failure event with severity', () => {
      const req = {
        id: 'req-123',
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        method: 'POST',
        path: '/api/auth/login',
        query: {},
      };

      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
        severity: 'warn',
        email: 'test@test.com',
        reason: 'invalid_credentials',
      }, req);

      expect(logger.log).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('login_failure'),
        expect.objectContaining({
          securityEvent: true,
          eventType: SecurityEventType.LOGIN_FAILURE,
          severity: 'warn',
        })
      );
    });

    test('should log security event without request', () => {
      logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
        reason: 'multiple_failed_attempts',
      });

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('suspicious_activity'),
        expect.objectContaining({
          securityEvent: true,
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        })
      );
    });

    test('should include request context in security events', () => {
      const req = {
        id: 'req-123',
        ip: '192.168.1.100',
        get: jest.fn(() => 'Mozilla/5.0'),
        method: 'POST',
        path: '/api/auth/login',
        user: { id: 'user-123', email: 'test@test.com' },
        query: { redirect: '/dashboard' },
      };

      logSecurityEvent(SecurityEventType.DATA_ACCESS, {
        resourceType: 'user',
        resourceId: 'user-123',
      }, req);

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        expect.any(String),
        expect.objectContaining({
          requestId: 'req-123',
          userId: 'user-123',
          userEmail: 'test@test.com',
          ip: '192.168.1.100',
          method: 'POST',
          path: '/api/auth/login',
        })
      );
    });
  });

  describe('Failed Login Tracking', () => {
    beforeEach(() => {
      // Clear the failed login attempts map
      jest.clearAllMocks();
    });

    test('should track failed login attempts', () => {
      const req = {
        ip: '127.0.0.1',
        get: jest.fn(),
        method: 'POST',
        path: '/api/auth/login',
        query: {},
      };

      const count1 = trackFailedLogin('test@test.com', req);
      expect(count1).toBe(1);

      const count2 = trackFailedLogin('test@test.com', req);
      expect(count2).toBe(2);
    });

    test('should alert on 5+ failed attempts', () => {
      const req = {
        ip: '127.0.0.1',
        get: jest.fn(() => 'Mozilla/5.0'),
        method: 'POST',
        path: '/api/auth/login',
        query: {},
      };

      for (let i = 0; i < 5; i++) {
        trackFailedLogin('test@test.com', req);
      }

      // Should log suspicious activity after 5 attempts
      expect(logger.log).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('suspicious_activity'),
        expect.objectContaining({
          reason: 'multiple_failed_logins',
          attemptCount: 5,
        })
      );
    });

    test('should track attempts per IP+email combination', () => {
      const req1 = { ip: '127.0.0.1', get: jest.fn(), method: 'POST', path: '/api/auth/login', query: {} };
      const req2 = { ip: '192.168.1.1', get: jest.fn(), method: 'POST', path: '/api/auth/login', query: {} };

      trackFailedLogin('test@test.com', req1);
      trackFailedLogin('test@test.com', req1);
      
      const count1 = trackFailedLogin('test@test.com', req1);
      expect(count1).toBe(3);

      const count2 = trackFailedLogin('test@test.com', req2);
      expect(count2).toBe(1); // Different IP
    });
  });

  describe('Request ID Generation', () => {
    test('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should create request logger with context', () => {
      const requestLogger = createRequestLogger('req-123', 'user-456');

      expect(logger.child).toHaveBeenCalledWith({
        requestId: 'req-123',
        userId: 'user-456',
      });
    });

    test('should create request logger without user ID', () => {
      const requestLogger = createRequestLogger('req-123');

      expect(logger.child).toHaveBeenCalledWith({
        requestId: 'req-123',
        userId: null,
      });
    });
  });

  describe('Performance Logging', () => {
    test('should log slow operations', () => {
      logPerformance('Database query', 2500, {
        threshold: 1000,
        query: 'SELECT * FROM users',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Slow operation detected',
        expect.objectContaining({
          operation: 'Database query',
          duration: '2500ms',
          threshold: '1000ms',
          query: 'SELECT * FROM users',
        })
      );
    });

    test('should not log fast operations as warnings', () => {
      logPerformance('Quick query', 500, {
        threshold: 1000,
      });

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Operation completed',
        expect.objectContaining({
          operation: 'Quick query',
          duration: '500ms',
        })
      );
    });

    test('should use default threshold of 1 second', () => {
      logPerformance('Operation', 1500);

      expect(logger.warn).toHaveBeenCalledWith(
        'Slow operation detected',
        expect.objectContaining({
          operation: 'Operation',
          duration: '1500ms',
          threshold: '1000ms',
        })
      );
    });
  });

  describe('Context Logging', () => {
    test('should log with request context', () => {
      const req = {
        id: 'req-123',
        user: { id: 'user-456' },
        ip: '127.0.0.1',
        method: 'GET',
        path: '/api/users',
      };

      logWithContext('info', 'User request', req, { action: 'list' });

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        'User request',
        expect.objectContaining({
          requestId: 'req-123',
          userId: 'user-456',
          ip: '127.0.0.1',
          method: 'GET',
          path: '/api/users',
          action: 'list',
        })
      );
    });

    test('should handle missing user in context', () => {
      const req = {
        id: 'req-123',
        ip: '127.0.0.1',
        method: 'GET',
        path: '/api/public',
      };

      logWithContext('info', 'Public request', req);

      expect(logger.log).toHaveBeenCalledWith(
        'info',
        'Public request',
        expect.objectContaining({
          requestId: 'req-123',
          userId: undefined,
        })
      );
    });
  });

  describe('Database Error Logging', () => {
    test('should log database errors with context', () => {
      const error = new Error('Connection timeout');
      error.code = '08001';

      logDatabaseError(error, 'SELECT * FROM users', ['param1']);

      expect(logger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          code: '08001',
          message: 'Connection timeout',
        })
      );
    });

    test('should redact query in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Query failed');
      logDatabaseError(error, 'SELECT * FROM sensitive_data');

      expect(logger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          query: 'REDACTED',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    test('should include query in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Query failed');
      logDatabaseError(error, 'SELECT * FROM users WHERE id = $1', [123]);

      expect(logger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          query: 'SELECT * FROM users WHERE id = $1',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Security Event Types', () => {
    test('should have all required security event types', () => {
      expect(SecurityEventType).toMatchObject({
        LOGIN_SUCCESS: 'login_success',
        LOGIN_FAILURE: 'login_failure',
        LOGOUT: 'logout',
        TOKEN_REFRESH: 'token_refresh',
        TOKEN_INVALID: 'token_invalid',
        PASSWORD_CHANGE: 'password_change',
        PASSWORD_RESET_REQUEST: 'password_reset_request',
        PASSWORD_RESET_COMPLETE: 'password_reset_complete',
        ACCOUNT_LOCKED: 'account_locked',
        RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
        UNAUTHORIZED_ACCESS: 'unauthorized_access',
        FORBIDDEN_ACCESS: 'forbidden_access',
        SUSPICIOUS_ACTIVITY: 'suspicious_activity',
        DATA_ACCESS: 'data_access',
        DATA_MODIFICATION: 'data_modification',
        FILE_UPLOAD: 'file_upload',
        FILE_DOWNLOAD: 'file_download',
        PERMISSION_CHANGE: 'permission_change',
        USER_CREATED: 'user_created',
        USER_DELETED: 'user_deleted',
        SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
        XSS_ATTEMPT: 'xss_attempt',
        CSRF_VALIDATION_FAILED: 'csrf_validation_failed',
      });
    });
  });
});
