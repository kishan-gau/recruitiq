import {
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
  asyncHandler,
  asyncMiddleware,
  notFoundHandler,
  isCriticalError,
  sendError,
} from '../errorHandler.js';

describe('Error Handler Middleware', () => {
  describe('Custom Error Classes', () => {
    test('APIError should have correct properties', () => {
      const error = new APIError('Test error', 400, 'TEST_CODE', { detail: 'test' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('APIError');
    });

    test('APIError.toJSON should return correct structure', () => {
      const error = new APIError('Test error', 400, 'TEST_CODE');
      const json = error.toJSON();
      
      expect(json).toHaveProperty('error');
      expect(json.error).toMatchObject({
        type: 'APIError',
        message: 'Test error',
        code: 'TEST_CODE',
        statusCode: 400,
      });
    });

    test('ValidationError should have 400 status', () => {
      const error = new ValidationError('Validation failed', { fields: ['email'] });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ fields: ['email'] });
    });

    test('UnauthorizedError should have 401 status', () => {
      const error = new UnauthorizedError('Not authenticated');
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    test('ForbiddenError should have 403 status', () => {
      const error = new ForbiddenError('Access denied');
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    test('NotFoundError should have 404 status', () => {
      const error = new NotFoundError('User not found', 'User');
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ resourceType: 'User' });
    });

    test('ConflictError should have 409 status', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    test('BusinessLogicError should have 422 status', () => {
      const error = new BusinessLogicError('Cannot process', { reason: 'test' });
      
      expect(error.statusCode).toBe(422);
      expect(error.code).toBe('BUSINESS_LOGIC_ERROR');
    });

    test('RateLimitError should have 429 status and retryAfter', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(60);
    });

    test('InternalServerError should have 500 status', () => {
      const error = new InternalServerError('Server error');
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    test('ServiceUnavailableError should have 503 status', () => {
      const error = new ServiceUnavailableError('Service down', 120);
      
      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Error Handler Middleware', () => {
    let req, res, next, errorHandler;

    beforeEach(() => {
      req = {
        id: 'test-123',
        path: '/test',
        method: 'GET',
        ip: '127.0.0.1',
        get: jest.fn(() => 'test-agent'),
        user: { id: 'user-123', email: 'test@test.com' },
        query: {},
        body: {},
      };

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn(),
      };

      next = jest.fn();

      // Import errorHandler dynamically
      errorHandler = require('../errorHandler.js').errorHandler;
    });

    test('should handle APIError correctly', () => {
      const error = new ValidationError('Invalid input');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.type).toBe('ValidationError');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.errorId).toMatch(/^ERR-/);
    });

    test('should handle database unique violation', () => {
      const error = new Error('Duplicate key');
      error.code = '23505';
      error.constraint = 'users_email_key';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.message).toContain('already exists');
      expect(response.error.code).toBe('DUPLICATE_RESOURCE');
    });

    test('should handle database foreign key violation', () => {
      const error = new Error('Foreign key violation');
      error.code = '23503';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_REFERENCE');
    });

    test('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_TOKEN');
    });

    test('should handle expired JWT', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      error.expiredAt = new Date();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('TOKEN_EXPIRED');
    });

    test('should handle Joi validation errors', () => {
      const error = new Error('Validation failed');
      error.isJoi = true;
      error.details = [
        {
          path: ['email'],
          message: 'Invalid email',
          type: 'string.email',
        },
      ];

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.details.errors).toHaveLength(1);
      expect(response.error.details.errors[0].field).toBe('email');
    });

    test('should handle Multer file upload errors', () => {
      const error = new Error('File too large');
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';
      error.limit = 5242880;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      
      const response = res.json.mock.calls[0][0];
      expect(response.error.code).toBe('FILE_UPLOAD_ERROR');
      expect(response.error.details).toHaveProperty('maxSize');
    });

    test('should add Retry-After header for rate limit errors', () => {
      const error = new RateLimitError('Too many requests', 60);
      errorHandler(error, req, res, next);

      expect(res.set).toHaveBeenCalledWith('Retry-After', 60);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    test('should include error ID for tracking', () => {
      const error = new Error('Test error');
      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.error.errorId).toMatch(/^ERR-\d+-[a-z0-9]+$/);
    });

    test('should include timestamp in response', () => {
      const error = new ValidationError('Test');
      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('should default to 500 for unknown errors', () => {
      const error = new Error('Unknown error');
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should sanitize error message in production for non-operational errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database details');
      error.statusCode = 500;

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should not sanitize operational errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ValidationError('Email is required');

      errorHandler(error, req, res, next);

      const response = res.json.mock.calls[0][0];
      expect(response.error.message).toBe('Email is required');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    test('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw error;
      });

      const next = jest.fn();
      await handler({}, {}, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('should not call next if no error', async () => {
      const handler = asyncHandler(async (req, res) => {
        res.json({ success: true });
      });

      const res = { json: jest.fn() };
      const next = jest.fn();
      
      await handler({}, res, next);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('asyncMiddleware', () => {
    test('should catch async middleware errors', async () => {
      const error = new Error('Middleware error');
      const middleware = asyncMiddleware(async () => {
        throw error;
      });

      const next = jest.fn();
      await middleware({}, {}, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    test('should create NotFoundError with correct message', () => {
      const req = { method: 'GET', path: '/api/nonexistent' };
      const next = jest.fn();

      notFoundHandler(req, {}, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('GET');
      expect(error.message).toContain('/api/nonexistent');
    });
  });

  describe('Helper Functions', () => {
    test('isCriticalError should identify non-operational 500 errors', () => {
      const criticalError = new Error('Critical');
      criticalError.statusCode = 500;
      criticalError.isOperational = false;

      expect(isCriticalError(criticalError)).toBe(true);
    });

    test('isCriticalError should not flag operational errors', () => {
      const operationalError = new InternalServerError('Handled error');
      
      expect(isCriticalError(operationalError)).toBe(false);
    });

    test('sendError should send APIError correctly', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const error = new ValidationError('Test error');
      sendError(res, error);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    test('sendError should handle generic errors', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const error = new Error('Generic error');
      sendError(res, error);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
    });
  });
});
