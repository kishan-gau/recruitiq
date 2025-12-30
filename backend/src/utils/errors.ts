/**
 * Custom Error Classes
 * Provides standardized error types for the application
 */

/**
 * Base Application Error
 */
class ApplicationError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }
}

/**
 * 400 Bad Request - Validation Error
 */
class ValidationError extends ApplicationError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * 401 Unauthorized - Authentication Error
 */
class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 403 Forbidden - Authorization Error
 */
class ForbiddenError extends ApplicationError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

/**
 * 404 Not Found Error
 */
class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found', resource = null) {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.resource = resource;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.resource && { resource: this.resource })
    };
  }
}

/**
 * 409 Conflict Error
 */
class ConflictError extends ApplicationError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * 422 Unprocessable Entity - Business Logic Error
 */
class BusinessLogicError extends ApplicationError {
  constructor(message = 'Business logic validation failed', details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR');
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      details: this.details
    };
  }
}

/**
 * 500 Internal Server Error - Database Error
 */
class DatabaseError extends ApplicationError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(process.env.NODE_ENV === 'development' && this.originalError && {
        originalError: this.originalError.message
      })
    };
  }
}

/**
 * 503 Service Unavailable - External Service Error
 */
class ExternalServiceError extends ApplicationError {
  constructor(message = 'External service unavailable', service = null) {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.service && { service: this.service })
    };
  }
}

/**
 * 429 Too Many Requests - Rate Limit Error
 */
class RateLimitError extends ApplicationError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.retryAfter && { retryAfter: this.retryAfter })
    };
  }
}

/**
 * Check if an error is an operational error (expected/handled)
 */
export function isOperationalError(error) {
  if (error instanceof ApplicationError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error) {
  if (error instanceof ApplicationError) {
    return error.toJSON();
  }

  // Unknown error - don't leak details in production
  return {
    name: 'Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}

// Export all error classes
export {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError
};

// Default export for convenience
export default {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  isOperationalError,
  formatErrorResponse
};
