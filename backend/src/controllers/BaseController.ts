/**
 * BaseController - Abstract base class for all HTTP controllers
 * Provides standardized request/response handling, error handling, and security utilities
 *
 * Architecture Pattern:
 *   HTTP Request → BaseController (this file) → Service → Repository → Database
 *
 * Responsibilities:
 * - Parse and extract HTTP request data (params, query, body)
 * - Delegate business logic to service layer
 * - Format and return standardized HTTP responses
 * - Handle and map errors to appropriate HTTP status codes
 * - Apply security headers and validation
 */

import logger from '../utils/logger.js';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  APIError,
} from '../middleware/errorHandler.js';

/**
 * Base Controller Class
 * All controllers should extend this class
 *
 * @example
 * class JobController extends BaseController {
 *   constructor(jobService) {
 *     super(jobService);
 *   }
 *
 *   async create(req, res, next) {
 *     try {
 *       const data = this.getBody(req);
 *       const result = await this.service.create(data, this.getServiceOptions(req));
 *       this.created(res, result);
 *     } catch (_error) {
 *       this.handleError(error, res, next);
 *     }
 *   }
 * }
 */
export class BaseController {
  protected service: unknown;

  constructor(service: unknown = null) {
    this.service = service;
  }

  // =========================================================================
  // REQUEST EXTRACTION HELPERS
  // =========================================================================

  /**
   * Extract organization ID from authenticated user
   * @param {Object} req - Express request object
   * @returns {string} Organization UUID
   * @throws {UnauthorizedError} If user not authenticated
   */
  getOrgId(req) {
    if (!req.user?.organizationId) {
      throw new UnauthorizedError('Organization ID not found in request');
    }
    return req.user.organizationId;
  }

  /**
   * Extract user ID from authenticated user
   * @param {Object} req - Express request object
   * @returns {string} User UUID
   * @throws {UnauthorizedError} If user not authenticated
   */
  getUserId(req) {
    if (!req.user?.id) {
      throw new UnauthorizedError('User ID not found in request');
    }
    return req.user.id;
  }

  /**
   * Get authenticated user object
   * @param {Object} req - Express request object
   * @returns {Object} User object
   * @throws {UnauthorizedError} If user not authenticated
   */
  getUser(req) {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    return req.user;
  }

  /**
   * Extract path parameters
   * @param {Object} req - Express request object
   * @returns {Object} Path parameters (e.g., { id: '123' })
   */
  getParams(req) {
    return req.params || {};
  }

  /**
   * Extract query parameters
   * @param {Object} req - Express request object
   * @returns {Object} Query parameters (e.g., { page: '1', limit: '20' })
   */
  getQuery(req) {
    return req.query || {};
  }

  /**
   * Extract request body
   * @param {Object} req - Express request object
   * @returns {Object} Request body (already parsed by express.json())
   */
  getBody(req) {
    return req.body || {};
  }

  /**
   * Get a single parameter by name
   * @param {Object} req - Express request object
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parameter value or default
   */
  getParam(req, name, defaultValue = undefined) {
    return this.getParams(req)[name] ?? defaultValue;
  }

  /**
   * Get a single query parameter by name
   * @param {Object} req - Express request object
   * @param {string} name - Parameter name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Query parameter value or default
   */
  getQueryParam(req, name, defaultValue = undefined) {
    return this.getQuery(req)[name] ?? defaultValue;
  }

  /**
   * Get pagination parameters from query
   * @param {Object} req - Express request object
   * @returns {Object} { page, limit }
   */
  getPagination(req) {
    const page = Math.max(1, parseInt(this.getQueryParam(req, 'page', '1')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(this.getQueryParam(req, 'limit', '20')) || 20));

    return { page, limit };
  }

  /**
   * Build service options with authentication context
   * @param {Object} req - Express request object
   * @returns {Object} Service options with organizationId and userId
   */
  getServiceOptions(req) {
    return {
      organizationId: this.getOrgId(req),
      userId: this.getUserId(req),
      user: this.getUser(req),
    };
  }

  // =========================================================================
  // RESPONSE BUILDERS
  // =========================================================================

  /**
   * Send successful response (200 OK)
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {Object} options - Optional { message, statusCode, pagination }
   */
  success(res, data, options = {}) {
    const { message, statusCode = 200, pagination } = options;

    const response = {
      success: true,
      ...data,
    };

    if (pagination) {
      response.pagination = pagination;
    }

    if (message) {
      response.message = message;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201 Created)
   * @param {Object} res - Express response object
   * @param {Object} data - Created resource(s)
   * @param {string} message - Optional success message
   */
  created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, { statusCode: 201, message });
  }

  /**
   * Send no content response (204 No Content)
   * Used typically for DELETE requests
   * @param {Object} res - Express response object
   */
  deleted(res) {
    return res.status(204).send();
  }

  /**
   * Send updated response (200 OK)
   * @param {Object} res - Express response object
   * @param {Object} data - Updated resource(s)
   * @param {string} message - Optional success message
   */
  updated(res, data, message = 'Resource updated successfully') {
    return this.success(res, data, { message });
  }

  /**
   * Send error response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object or message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Machine-readable error code
   */
  error(res, error, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
    const message = typeof error === 'string' ? error : error.message || 'Internal server error';

    return res.status(statusCode).json({
      success: false,
      error: message,
      errorCode,
    });
  }

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  /**
   * Centralized error handling
   * Maps error types to HTTP status codes and standardized response format
   *
   * Error Type Mapping:
   * - ValidationError → 400 Bad Request
   * - UnauthorizedError → 401 Unauthorized
   * - ForbiddenError → 403 Forbidden
   * - NotFoundError → 404 Not Found
   * - ConflictError → 409 Conflict
   * - APIError → Custom status code
   * - Other errors → 500 Internal Server Error
   *
   * @param {Error} error - Error object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  handleError(error, res, next) {
    // Log the error with full context
    logger.error('Controller error', {
      errorName: error.constructor.name,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      isOperational: error.isOperational,
      stack: error.stack,
    });

    // Handle known error types
    if (error instanceof ValidationError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'VALIDATION_ERROR',
        details: error.details,
      });
    }

    if (error instanceof UnauthorizedError) {
      return res.status(error.statusCode || 401).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'UNAUTHORIZED',
      });
    }

    if (error instanceof ForbiddenError) {
      return res.status(error.statusCode || 403).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'FORBIDDEN',
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(error.statusCode || 404).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'NOT_FOUND',
      });
    }

    if (error instanceof ConflictError) {
      return res.status(error.statusCode || 409).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'CONFLICT',
      });
    }

    if (error instanceof APIError) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message,
        errorCode: error.code || 'API_ERROR',
        details: error.details,
      });
    }

    // Handle unknown errors
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      errorCode: 'INTERNAL_SERVER_ERROR',
      // Only include details in development
      ...(process.env.NODE_ENV === 'development' && { message: error.message }),
    });
  }

  /**
   * Async wrapper for route handlers
   * Catches any errors and passes them to next middleware
   *
   * @param {Function} handler - Async route handler
   * @returns {Function} Express middleware function
   *
   * @example
   * router.post('/jobs', this.asyncHandler(async (req, res) => {
   *   const job = await this.service.create(req.body);
   *   this.created(res, { job });
   * }));
   */
  asyncHandler(handler) {
    return (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  }

  // =========================================================================
  // VALIDATION & SECURITY
  // =========================================================================

  /**
   * Validate required fields in request body
   * @param {Object} req - Express request object
   * @param {string[]} requiredFields - List of required field names
   * @throws {ValidationError} If any required field is missing
   */
  validateRequired(req, requiredFields = []) {
    const body = this.getBody(req);
    const missing = requiredFields.filter((field) => !(field in body));

    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Check user authorization
   * Throws ForbiddenError if user is not authorized
   *
   * @param {Object} req - Express request object
   * @param {string|string[]} requiredRoles - Role(s) required for access
   * @throws {ForbiddenError} If user lacks required role
   */
  checkAuthorization(req, requiredRoles = []) {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `This action requires one of these roles: ${roles.join(', ')}`
      );
    }
  }

  /**
   * Check resource ownership
   * Useful for ensuring users can only modify their own resources
   *
   * @param {Object} req - Express request object
   * @param {string} resourceOwnerId - ID of the resource owner
   * @throws {ForbiddenError} If user is not the resource owner
   */
  checkResourceOwnership(req, resourceOwnerId) {
    const userId = this.getUserId(req);

    if (userId !== resourceOwnerId && req.user?.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to modify this resource');
    }
  }

  // =========================================================================
  // FILTERING & SORTING
  // =========================================================================

  /**
   * Extract and validate filter parameters
   * @param {Object} req - Express request object
   * @param {string[]} allowedFields - List of fields that can be filtered
   * @returns {Object} Validated filter object
   */
  getFilters(req, allowedFields = []) {
    const query = this.getQuery(req);
    const filters = {};

    Object.keys(query).forEach((key) => {
      // Skip pagination and special parameters
      if (['page', 'limit', 'sort', 'order'].includes(key)) {
        return;
      }

      // Only include allowed fields
      if (allowedFields.length === 0 || allowedFields.includes(key)) {
        filters[key] = query[key];
      }
    });

    return filters;
  }

  /**
   * Extract and validate sorting parameters
   * @param {Object} req - Express request object
   * @param {string[]} allowedFields - List of fields that can be sorted
   * @returns {Object} { sortBy, sortOrder }
   */
  getSort(req, allowedFields = []) {
    const sortBy = this.getQueryParam(req, 'sort', 'createdAt');
    const sortOrder = this.getQueryParam(req, 'order', 'DESC').toUpperCase();

    // Validate sort field
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      throw new ValidationError(
        `Invalid sort field: ${sortBy}. Allowed: ${allowedFields.join(', ')}`
      );
    }

    // Validate sort order
    if (!['ASC', 'DESC'].includes(sortOrder)) {
      throw new ValidationError('Sort order must be ASC or DESC');
    }

    return { sortBy, sortOrder };
  }
}

export default BaseController;
