import logger, { logSecurityEvent, SecurityEventType } from '../utils/logger.js';
import config from '../config/index.js';

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base API Error class with standard structure
 */
export class APIError extends Error {
  statusCode: number;
  code: string | null;
  details: any;
  isOperational: boolean;
  
  constructor(message: string, statusCode = 500, code: string | null = null, details: any = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Indicates this is an expected error
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        type: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        ...(this.details && config.env === 'development' && { details: this.details }),
      },
    };
  }
}

/**
 * 400 Bad Request - Invalid input
 */
export class ValidationError extends APIError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends APIError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends APIError {
  constructor(message = 'Resource not found', resourceType = null) {
    super(message, 404, 'NOT_FOUND', resourceType ? { resourceType } : null);
  }
}

/**
 * 409 Conflict - Resource already exists
 */
export class ConflictError extends APIError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 422 Unprocessable Entity - Business logic error
 */
export class BusinessLogicError extends APIError {
  constructor(message, details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

/**
 * Alias for BusinessLogicError - business rule violation
 */
export class BusinessRuleError extends BusinessLogicError {}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends APIError {
  constructor(message = 'Too many requests', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', retryAfter ? { retryAfter } : null);
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends APIError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends APIError {
  constructor(message = 'Service temporarily unavailable', retryAfter = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE', retryAfter ? { retryAfter } : null);
  }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

/**
 * Enhanced global error handler with security features:
 * - Sanitizes error messages to prevent information leakage
 * - Logs errors with context for debugging
 * - Returns standardized error responses
 * - Tracks security events
 */
export const errorHandler = (err, req, res, next) => {
  // Generate error ID for tracking
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine if this is an operational error
  const isOperational = err.isOperational || err instanceof APIError;
  
  // Default status and message
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.code || 'UNKNOWN_ERROR';
  let details = err.details || null;
  
  // ============================================================================
  // DATABASE ERRORS
  // ============================================================================
  
  if (err.code && typeof err.code === 'string') {
    // PostgreSQL error codes
    if (err.code === '23505') { // Unique violation
      statusCode = 409;
      message = 'A resource with this value already exists';
      errorCode = 'DUPLICATE_RESOURCE';
      
      // Extract constraint name for more specific message
      if (err.constraint) {
        details = { constraint: err.constraint };
      }
    } else if (err.code === '23503') { // Foreign key violation
      statusCode = 400;
      message = 'Referenced resource does not exist';
      errorCode = 'INVALID_REFERENCE';
    } else if (err.code === '23502') { // Not null violation
      statusCode = 400;
      message = 'Required field is missing';
      errorCode = 'MISSING_REQUIRED_FIELD';
      
      if (err.column) {
        details = { column: err.column };
      }
    } else if (err.code === '22P02') { // Invalid text representation
      statusCode = 400;
      message = 'Invalid data format';
      errorCode = 'INVALID_FORMAT';
    } else if (err.code === '42P01') { // Undefined table
      statusCode = 500;
      message = 'Database configuration error';
      errorCode = 'DATABASE_ERROR';
      
      // Security: Don't expose table names in production
      if (config.env !== 'production') {
        details = { table: err.table };
      }
    } else if (err.code.startsWith('23')) { // Other constraint violations
      statusCode = 400;
      message = 'Data constraint violation';
      errorCode = 'CONSTRAINT_VIOLATION';
    } else if (err.code.startsWith('08')) { // Connection errors
      statusCode = 503;
      message = 'Database connection error';
      errorCode = 'DATABASE_UNAVAILABLE';
    }
  }
  
  // ============================================================================
  // JWT/AUTH ERRORS
  // ============================================================================
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
    
    logSecurityEvent(SecurityEventType.TOKEN_INVALID, {
      severity: 'warn',
      reason: err.message,
    }, req);
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errorCode = 'TOKEN_EXPIRED';
    
    logSecurityEvent(SecurityEventType.TOKEN_INVALID, {
      severity: 'info',
      reason: 'expired',
      expiredAt: err.expiredAt,
    }, req);
  } else if (err.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not yet valid';
    errorCode = 'TOKEN_NOT_ACTIVE';
  }
  
  // ============================================================================
  // VALIDATION ERRORS
  // ============================================================================
  
  if (err.name === 'ValidationError' || err.isJoi) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    
    // Extract Joi validation details
    if (err.details && Array.isArray(err.details)) {
      const validationErrors = err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));
      
      message = 'Validation failed';
      details = { errors: validationErrors };
    }
  }
  
  // ============================================================================
  // JSON PARSING ERRORS
  // ============================================================================
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON format in request body';
    errorCode = 'INVALID_JSON';
    details = {
      originalError: err.message,
      hint: 'Common issues: trailing commas, unquoted keys, single quotes instead of double quotes, or sending literal "null" as a string.',
    };
  }
  
  // ============================================================================
  // MULTER FILE UPLOAD ERRORS
  // ============================================================================
  
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed';
      details = { maxSize: err.limit };
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
      details = { maxFiles: err.limit };
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
      details = { field: err.field };
    } else {
      message = 'File upload failed';
    }
  }
  
  // ============================================================================
  // RATE LIMITING ERRORS
  // ============================================================================
  
  if (err.name === 'TooManyRequestsError' || statusCode === 429) {
    message = 'Too many requests, please try again later';
    errorCode = 'RATE_LIMIT_EXCEEDED';
    
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      severity: 'warn',
    }, req);
  }
  
  // ============================================================================
  // SECURITY EVENT LOGGING
  // ============================================================================
  
  // Log security-related errors
  if (statusCode === 401) {
    logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, {
      severity: 'warn',
      errorCode,
    }, req);
  } else if (statusCode === 403) {
    logSecurityEvent(SecurityEventType.FORBIDDEN_ACCESS, {
      severity: 'warn',
      errorCode,
      attemptedResource: req.path,
    }, req);
  }
  
  // ============================================================================
  // ERROR LOGGING
  // ============================================================================
  
  const logContext = {
    errorId,
    statusCode,
    errorCode,
    message: err.message,
    path: req.path,
    method: req.method,
    requestId: req.id,
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    // Don't log sensitive data
    query: Object.keys(req.query || {}).length > 0 ? '[REDACTED]' : {},
    body: Object.keys(req.body || {}).length > 0 ? '[REDACTED]' : {},
  };
  
  // Log at appropriate level
  if (statusCode >= 500) {
    // Server errors - include stack trace
    logger.error('Server error', {
      ...logContext,
      stack: err.stack,
      isOperational,
    });
  } else if (statusCode >= 400) {
    // Client errors - less verbose
    logger.warn('Client error', logContext);
  } else {
    logger.info('Request error', logContext);
  }
  
  // ============================================================================
  // ERROR RESPONSE
  // ============================================================================
  
  // Security: Sanitize message in production
  if (config.env === 'production' && statusCode >= 500 && !isOperational) {
    message = 'An unexpected error occurred';
    details = null;
  }
  
  // Build response following API Standards
  const response = {
    success: false,  // API Standard: success at root level
    error: message,  // API Standard: error message at root level
    errorCode,       // API Standard: errorCode at root level
    errorId,
    timestamp: new Date().toISOString(),
  };
  
  // Add details in development or for operational errors
  if (details && (config.env === 'development' || isOperational)) {
    response.details = details;
  }
  
  // Add stack trace in development
  if (config.env === 'development') {
    response.stack = err.stack;
    response.debug = {
      type: err.name || 'Error',
      message: err.message,
      code: err.code,
      name: err.name,
    };
  }
  
  // Add retry-after header for rate limiting
  if (err.retryAfter) {
    res.set('Retry-After', err.retryAfter);
  }
  
  // Send response
  res.status(statusCode).json(response);
};

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Wrapper for async middleware
 */
export function asyncMiddleware(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// 404 NOT FOUND HANDLER
// ============================================================================

/**
 * Handle 404 errors for undefined routes
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Cannot ${req.method} ${req.path}`);
  
  logger.warn('Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.id,
  });
  
  next(error);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if error should crash the server
 */
export function isCriticalError(err) {
  return !err.isOperational && err.statusCode >= 500;
}

/**
 * Send error response (for use in routes)
 */
export function sendError(res, error) {
  if (error instanceof APIError) {
    return res.status(error.statusCode).json(error.toJSON());
  }
  
  return res.status(500).json({
    error: {
      type: 'Error',
      message: config.env === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      code: 'INTERNAL_ERROR',
    },
  });
}
