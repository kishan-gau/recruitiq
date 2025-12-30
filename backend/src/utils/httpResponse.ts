/**
 * HTTP Response Utilities
 * 
 * Provides standardized HTTP response formatting and utilities
 * Ensures consistent API responses across all endpoints
 * 
 * @module utils/httpResponse
 */

import type { Response } from 'express';

/**
 * Standard API response success structure
 */
export interface SuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
  pagination?: PaginationMetadata;
  [key: string]: any; // Allow resource-specific keys like "job", "jobs", etc.
}

/**
 * Standard API response error structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
  timestamp?: string;
}

/**
 * Pagination metadata included in list responses
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Sends a successful response to the client
 * 
 * @param res - Express response object
 * @param data - Response data (uses resource-specific key)
 * @param statusCode - HTTP status code (default: 200)
 * @param message - Optional success message
 * 
 * @example
 * // Return single resource
 * sendSuccess(res, { job: jobData }, 200);
 * 
 * // Return list with pagination
 * sendSuccess(res, { jobs: jobArray, pagination: {...} }, 200);
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    ...data,
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
}

/**
 * Sends a single resource response
 * 
 * @param res - Express response object
 * @param resourceName - Name of the resource (e.g., "job", "candidate")
 * @param resourceData - The resource data
 * @param statusCode - HTTP status code (default: 200)
 * 
 * @example
 * sendResource(res, 'job', jobData, 200);
 * // Response: { "success": true, "job": {...} }
 */
export function sendResource<T>(
  res: Response,
  resourceName: string,
  resourceData: T,
  statusCode: number = 200
): Response {
  return sendSuccess(res, { [resourceName]: resourceData }, statusCode);
}

/**
 * Sends a list resource response with pagination
 * 
 * @param res - Express response object
 * @param resourceName - Plural name of the resource (e.g., "jobs", "candidates")
 * @param items - Array of items
 * @param pagination - Pagination metadata
 * @param statusCode - HTTP status code (default: 200)
 * 
 * @example
 * sendList(res, 'jobs', jobArray, paginationData, 200);
 * // Response: { "success": true, "jobs": [...], "pagination": {...} }
 */
export function sendList<T>(
  res: Response,
  resourceName: string,
  items: T[],
  pagination: PaginationMetadata,
  statusCode: number = 200
): Response {
  return sendSuccess(
    res,
    {
      [resourceName]: items,
      pagination,
    },
    statusCode
  );
}

/**
 * Sends a created response (201 Created)
 * 
 * @param res - Express response object
 * @param resourceName - Name of the created resource
 * @param resourceData - The created resource data
 * @param message - Optional success message
 * 
 * @example
 * sendCreated(res, 'job', newJobData, 'Job created successfully');
 */
export function sendCreated<T>(
  res: Response,
  resourceName: string,
  resourceData: T,
  message?: string
): Response {
  return sendSuccess(res, { [resourceName]: resourceData }, 201, message);
}

/**
 * Sends a deleted response (200 OK with deletion message)
 * 
 * @param res - Express response object
 * @param message - Deletion confirmation message
 * 
 * @example
 * sendDeleted(res, 'Job deleted successfully');
 */
export function sendDeleted(res: Response, message: string = 'Resource deleted successfully'): Response {
  return sendSuccess(res, {}, 200, message);
}

/**
 * Sends an updated response (200 OK)
 * 
 * @param res - Express response object
 * @param resourceName - Name of the updated resource
 * @param resourceData - The updated resource data
 * @param message - Optional success message
 * 
 * @example
 * sendUpdated(res, 'job', updatedJobData, 'Job updated successfully');
 */
export function sendUpdated<T>(
  res: Response,
  resourceName: string,
  resourceData: T,
  message?: string
): Response {
  return sendSuccess(res, { [resourceName]: resourceData }, 200, message);
}

/**
 * Sends a bulk operation response
 * 
 * @param res - Express response object
 * @param results - Bulk operation results
 * @param statusCode - HTTP status code
 * 
 * @example
 * sendBulkResponse(res, {
 *   created: 5,
 *   updated: 3,
 *   failed: 1,
 *   errors: [...]
 * }, 207); // 207 Multi-Status
 */
export function sendBulkResponse(
  res: Response,
  results: any,
  statusCode: number = 207
): Response {
  return sendSuccess(res, { results }, statusCode);
}

/**
 * Sends an error response to the client
 * 
 * @param res - Express response object
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 500)
 * @param errorCode - Machine-readable error code
 * @param details - Optional error details
 * 
 * @example
 * sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  errorCode: string = 'INTERNAL_SERVER_ERROR',
  details?: any
): Response {
  const response: ErrorResponse = {
    success: false,
    error,
    errorCode,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Sends a validation error response (400 Bad Request)
 * 
 * @param res - Express response object
 * @param errors - Array of validation errors
 * @param message - Optional error message
 * 
 * @example
 * sendValidationError(res, [
 *   { field: 'email', message: 'Invalid email format' },
 *   { field: 'password', message: 'Too short' }
 * ]);
 */
export function sendValidationError(
  res: Response,
  errors: Array<{ field: string; message: string }>,
  message: string = 'Validation failed'
): Response {
  return sendError(res, message, 400, 'VALIDATION_ERROR', { errors });
}

/**
 * Sends an unauthorized response (401 Unauthorized)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export function sendUnauthorized(
  res: Response,
  message: string = 'Authentication required'
): Response {
  return sendError(res, message, 401, 'UNAUTHORIZED');
}

/**
 * Sends a forbidden response (403 Forbidden)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export function sendForbidden(
  res: Response,
  message: string = 'Access denied'
): Response {
  return sendError(res, message, 403, 'FORBIDDEN');
}

/**
 * Sends a not found response (404 Not Found)
 * 
 * @param res - Express response object
 * @param resource - Name of the missing resource
 */
export function sendNotFound(res: Response, resource: string = 'Resource'): Response {
  return sendError(res, `${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Sends a conflict response (409 Conflict)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export function sendConflict(
  res: Response,
  message: string = 'Resource conflict'
): Response {
  return sendError(res, message, 409, 'CONFLICT');
}

/**
 * Sends a rate limit response (429 Too Many Requests)
 * 
 * @param res - Express response object
 * @param retryAfter - Seconds to wait before retrying
 */
export function sendRateLimited(res: Response, retryAfter?: number): Response {
  const response: any = {
    success: false,
    error: 'Too many requests',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
  };

  if (retryAfter) {
    response.retryAfter = retryAfter;
  }

  return res.status(429).json(response);
}

/**
 * Sends a server error response (500 Internal Server Error)
 * 
 * @param res - Express response object
 * @param message - Error message
 * @param hideDetails - Whether to hide error details in production
 */
export function sendServerError(
  res: Response,
  message: string = 'An unexpected error occurred',
  hideDetails: boolean = true
): Response {
  const detailedMessage = hideDetails ? message : message;
  return sendError(res, detailedMessage, 500, 'INTERNAL_SERVER_ERROR');
}

/**
 * Sends a service unavailable response (503 Service Unavailable)
 * 
 * @param res - Express response object
 * @param message - Error message
 */
export function sendServiceUnavailable(
  res: Response,
  message: string = 'Service temporarily unavailable'
): Response {
  return sendError(res, message, 503, 'SERVICE_UNAVAILABLE');
}

/**
 * Creates pagination metadata
 * 
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 * 
 * @example
 * const pagination = createPagination(1, 20, 100);
 * // Result: { page: 1, limit: 20, total: 100, totalPages: 5, hasNext: true, hasPrev: false }
 */
export function createPagination(page: number, limit: number, total: number): PaginationMetadata {
  const pageNum = Math.max(1, Math.floor(page));
  const limitNum = Math.min(100, Math.max(1, Math.floor(limit)));
  const totalPages = Math.ceil(total / limitNum);

  return {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1,
  };
}

/**
 * Validates and normalizes pagination parameters
 * 
 * @param page - Requested page number
 * @param limit - Requested items per page
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Normalized pagination parameters
 * 
 * @example
 * const { page, limit } = normalizePagination(req.query.page, req.query.limit);
 */
export function normalizePagination(
  page?: any,
  limit?: any,
  maxLimit: number = 100
): { page: number; limit: number } {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));

  return { page: pageNum, limit: limitNum };
}

/**
 * Calculates offset for database queries
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for database query
 * 
 * @example
 * const offset = calculateOffset(2, 20); // Returns 20
 */
export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}
