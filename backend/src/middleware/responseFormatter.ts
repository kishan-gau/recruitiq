/**
 * Response Formatting Middleware
 * Provides consistent response formatting across all API endpoints
 * Enforces resource-specific keys (never generic "data")
 *
 * Usage:
 * app.use(responseFormatter);
 *
 * Then in controllers:
 * res.sendSuccess({ resource, data }, statusCode);
 * res.sendError(error);
 */

import logger from '../utils/logger.js';

/**
 * Middleware that adds response helper methods to res object
 * Ensures consistent response format across all endpoints
 */
export function responseFormatter(req, res, next) {
  /**
   * Send successful response
   * @param {Object} options - Response options
   * @param {string} options.resource - Resource name for the key (e.g., 'job', 'jobs')
   * @param {any} options.data - The data to include in response
   * @param {string} options.message - Optional success message
   * @param {Object} options.pagination - Optional pagination info
   * @param {Object} options.meta - Optional additional metadata
   * @param {number} statusCode - HTTP status code (default: 200)
   *
   * @example
   * // Single resource
   * res.sendSuccess({ resource: 'job', data: jobData }, 200);
   *
   * // List with pagination
   * res.sendSuccess({
   *   resource: 'jobs',
   *   data: jobsList,
   *   pagination: { page: 1, limit: 20, total: 100 }
   * }, 200);
   *
   * // With message
   * res.sendSuccess({
   *   resource: 'job',
   *   data: createdJob,
   *   message: 'Job created successfully'
   * }, 201);
   */
  res.sendSuccess = function (options, statusCode = 200) {
    const {
      resource,
      data,
      message,
      pagination,
      meta,
    } = options;

    if (!resource) {
      logger.warn('Response missing resource name', {
        path: req.path,
        statusCode,
      });
    }

    const response = {
      success: true,
      [resource]: data,
    };

    if (message) {
      response.message = message;
    }

    if (pagination) {
      response.pagination = pagination;
    }

    if (meta) {
      response.meta = meta;
    }

    // Log response
    logger.info('API Response', {
      path: req.path,
      method: req.method,
      statusCode,
      resource,
      userId: req.user?.id,
    });

    return this.status(statusCode).json(response);
  };

  /**
   * Send error response
   * Handles both custom error objects and standard errors
   */
  res.sendError = function (error, statusCode) {
    // Determine status code
    const code = statusCode || error.statusCode || error.status || 500;

    // Build error response
    const response = {
      success: false,
      error: error.message || 'An unexpected error occurred',
      errorCode: error.errorCode || 'INTERNAL_ERROR',
    };

    // Include details for validation errors
    if (error.details) {
      response.details = error.details;
    }

    // Log error
    logger.error('API Error Response', {
      path: req.path,
      method: req.method,
      statusCode: code,
      errorCode: response.errorCode,
      error: error.message,
      userId: req.user?.id,
    });

    return this.status(code).json(response);
  };

  /**
   * Send paginated response
   * Convenience method for list endpoints
   */
  res.sendPaginated = function (
    resource,
    data,
    pagination,
    statusCode = 200
  ) {
    return this.sendSuccess(
      {
        resource,
        data,
        pagination,
      },
      statusCode
    );
  };

  /**
   * Send deleted/removed response
   * Standard response for DELETE endpoints
   */
  res.sendDeleted = function (message = 'Resource deleted successfully') {
    logger.info('Resource deleted', {
      path: req.path,
      userId: req.user?.id,
    });

    return this.status(200).json({
      success: true,
      message,
    });
  };

  /**
   * Send created response
   * Standard response for POST endpoints
   */
  res.sendCreated = function (resource, data, message) {
    return this.sendSuccess(
      {
        resource,
        data,
        message: message || `${resource} created successfully`,
      },
      201
    );
  };

  next();
}

/**
 * Middleware that adds request/response timing information
 * Useful for performance monitoring
 */
export function requestTiming(req, res, next) {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to capture timing
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    // Log timing
    if (duration > 1000) {
      logger.warn('Slow API response', {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
      });
    }

    // Add timing header
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Middleware that adds request ID to all responses
 * Useful for request tracing in logs
 */
export function requestIdMiddleware(req, res, next) {
  const { v4: uuidv4 } = require('uuid');

  const requestId = uuidv4();
  req.id = requestId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);

  // Add to logs
  if (req.user) {
    logger.info('Request started', {
      requestId,
      path: req.path,
      method: req.method,
      userId: req.user.id,
      organizationId: req.user.organizationId,
    });
  }

  next();
}

/**
 * Middleware that disables caching for API responses
 * Important: API responses should not be cached by browsers
 */
export function disableApiCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  next();
}

export default {
  responseFormatter,
  requestTiming,
  requestIdMiddleware,
  disableApiCache,
};
