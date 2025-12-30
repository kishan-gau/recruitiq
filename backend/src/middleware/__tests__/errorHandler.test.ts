import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing module under test
jest.unstable_mockModule('../../utils/logger.ts', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  logSecurityEvent: jest.fn(),
  SecurityEventType: {
    TOKEN_INVALID: 'token_invalid',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    FORBIDDEN_ACCESS: 'forbidden_access',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  },
}));

jest.unstable_mockModule('../../config/index.ts', () => ({
  default: {
    env: 'test',
  },
}));

// Import AFTER mocking
const {
  APIError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  errorHandler,
  asyncHandler,
  asyncMiddleware,
  notFoundHandler,
  isCriticalError,
  sendError,
} = await import('../errorHandler');

const logger = (await import('../../utils/logger')).default;
const { logSecurityEvent } = await import('../../utils/logger');
const config = (await import('../../config/index')).default;

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      path: '/test',
      method: 'GET',
      id: 'req-123',
      ip: '192.168.1.100',
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        return null;
      }),
      user: { id: 'user-123', email: 'test@example.com' },
      query: {},
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  // ============================================================================
  // CUSTOM ERROR CLASSES
  // ============================================================================

  describe('APIError', () => {
    it('should create error with default values', () => {
      const error = new APIError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeNull();
      expect(error.details).toBeNull();
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('APIError');
    });

    it('should create error with custom values', () => {
      const error = new APIError('Custom error', 400, 'CUSTOM_CODE', { field: 'value' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ field: 'value' });
    });

    it('should serialize to JSON without details in non-development', () => {
      config.env = 'production';
      const error = new APIError('Test', 400, 'TEST_CODE', { sensitive: 'data' });
      const json = error.toJSON();
      
      expect(json.error.message).toBe('Test');
      expect(json.error.statusCode).toBe(400);
      expect(json.error.code).toBe('TEST_CODE');
      expect(json.error.details).toBeUndefined();
      
      config.env = 'test';
    });

    it('should serialize to JSON with details in development', () => {
      config.env = 'development';
      const error = new APIError('Test', 400, 'TEST_CODE', { field: 'value' });
      const json = error.toJSON();
      
      expect(json.error.details).toEqual({ field: 'value' });
      
      config.env = 'test';
    });
  });

  describe('ValidationError', () => {
    it('should create 400 error with default message', () => {
      const error = new ValidationError();
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
    });

    it('should create error with custom message and details', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Authentication required');
    });

    it('should create error with custom message', () => {
      const error = new UnauthorizedError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error', () => {
      const error = new ForbiddenError();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error', () => {
      const error = new NotFoundError();
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
    });

    it('should include resource type in details', () => {
      const error = new NotFoundError('User not found', 'User');
      
      expect(error.details).toEqual({ resourceType: 'User' });
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError();
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe('Resource conflict');
    });
  });

  describe('BusinessLogicError', () => {
    it('should create 422 error', () => {
      const error = new BusinessLogicError('Business rule violated');
      
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
      expect(error.message).toBe('Business rule violated');
    });
  });

  describe('RateLimitError', () => {
    it('should create 429 error', () => {
      const error = new RateLimitError();
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include retryAfter', () => {
      const error = new RateLimitError('Rate limited', 60);
      
      expect(error.retryAfter).toBe(60);
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error', () => {
      const error = new InternalServerError();
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create 503 error', () => {
      const error = new ServiceUnavailableError();
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  // ============================================================================
  // ERROR HANDLER MIDDLEWARE
  // ============================================================================

  describe('errorHandler', () => {
    it('should handle APIError instances', () => {
      const error = new ValidationError('Invalid data');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('Invalid data');
      expect(response.errorCode).toBe('VALIDATION_ERROR');
      expect(response.errorId).toBeDefined();
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Unexpected error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should log security event for 401 errors', () => {
      const error = new UnauthorizedError();
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'unauthorized_access',
        expect.objectContaining({ severity: 'warn' }),
        mockReq
      );
    });

    it('should log security event for 403 errors', () => {
      const error = new ForbiddenError();
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'forbidden_access',
        expect.objectContaining({
          severity: 'warn',
          attemptedResource: '/test',
        }),
        mockReq
      );
    });

    it('should handle PostgreSQL unique violation (23505)', () => {
      const error = new Error('Unique constraint violation');
      error.code = '23505';
      error.constraint = 'users_email_unique';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('DUPLICATE_RESOURCE');
    });

    it('should handle PostgreSQL foreign key violation (23503)', () => {
      const error = new Error('Foreign key violation');
      error.code = '23503';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('INVALID_REFERENCE');
    });

    it('should handle PostgreSQL not null violation (23502)', () => {
      const error = new Error('Not null violation');
      error.code = '23502';
      error.column = 'email';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'token_invalid',
        expect.objectContaining({ severity: 'warn' }),
        mockReq
      );
    });

    it('should handle expired JWT', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      error.expiredAt = new Date();
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should handle Joi validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.isJoi = true;
      error.details = [
        {
          path: ['email'],
          message: '"email" must be a valid email',
          type: 'string.email',
        },
      ];
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle Multer file size error', () => {
      const error = new Error('File too large');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';
      error.limit = 5242880;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.errorCode).toBe('FILE_UPLOAD_ERROR');
    });

    it('should handle rate limit errors', () => {
      const error = new RateLimitError('Too many requests', 60);
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', 60);
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        expect.objectContaining({ severity: 'warn' }),
        mockReq
      );
    });

    it('should sanitize error message in production for non-operational errors', () => {
      config.env = 'production';
      const error = new Error('Sensitive internal error');
      error.statusCode = 500;
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toBe('An unexpected error occurred');
      
      config.env = 'test';
    });

    it('should include stack trace in development', () => {
      config.env = 'development';
      const error = new Error('Test error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.stack).toBeDefined();
      expect(response.debug).toBeDefined();
      
      config.env = 'test';
    });

    it('should redact query and body in logs', () => {
      mockReq.query = { sensitive: 'data' };
      mockReq.body = { password: 'secret' };
      const error = new Error('Test');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.error).toHaveBeenCalledWith(
        'Server error',
        expect.objectContaining({
          query: '[REDACTED]',
          body: '[REDACTED]',
        })
      );
    });

    it('should log client errors as warnings', () => {
      const error = new ValidationError('Bad input');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Client error',
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // ASYNC HANDLERS
  // ============================================================================

  describe('asyncHandler', () => {
    it('should handle successful async operations', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });
      
      await handler(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors from async operations', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });
      
      await handler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle database query errors', async () => {
      const dbError = new Error('Database connection failed');
      dbError.code = '08006';
      
      const handler = asyncHandler(async () => {
        throw dbError;
      });
      
      await handler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe('asyncMiddleware', () => {
    it('should handle successful async middleware', async () => {
      const middleware = asyncMiddleware(async (req, res, next) => {
        req.processed = true;
        next();
      });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.processed).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should catch errors from async middleware', async () => {
      const error = new Error('Middleware error');
      const middleware = asyncMiddleware(async () => {
        throw error;
      });
      
      await middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ============================================================================
  // NOT FOUND HANDLER
  // ============================================================================

  describe('notFoundHandler', () => {
    it('should create 404 error for undefined routes', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Cannot GET /test');
    });

    it('should log route not found', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Route not found',
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          ip: '192.168.1.100',
        })
      );
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  describe('isCriticalError', () => {
    it('should return true for non-operational 500 errors', () => {
      const error = new Error('Critical error');
      error.statusCode = 500;
      error.isOperational = false;
      
      expect(isCriticalError(error)).toBe(true);
    });

    it('should return false for operational errors', () => {
      const error = new InternalServerError();
      
      expect(isCriticalError(error)).toBe(false);
    });

    it('should return false for 4xx errors', () => {
      const error = new ValidationError();
      error.statusCode = 400;
      
      expect(isCriticalError(error)).toBe(false);
    });
  });

  describe('sendError', () => {
    it('should send APIError response', () => {
      const error = new ValidationError('Invalid input');
      
      sendError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid input',
            code: 'VALIDATION_ERROR',
          }),
        })
      );
    });

    it('should send generic error response in production', () => {
      config.env = 'production';
      const error = new Error('Internal error');
      
      sendError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.message).toBe('An unexpected error occurred');
      
      config.env = 'test';
    });

    it('should send error message in development', () => {
      config.env = 'development';
      const error = new Error('Debug error');
      
      sendError(mockRes, error);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.message).toBe('Debug error');
      
      config.env = 'test';
    });
  });
});
