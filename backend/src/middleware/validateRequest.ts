/**
 * Request Validation Middleware
 * Validates request body and query parameters against Joi schemas
 *
 * Usage:
 * router.post('/jobs', 
 *   validateBody(JobService.createSchema),
 *   jobController.create
 * );
 */

import { ValidationError } from './errorHandler.ts';
import logger from '../utils/logger.ts';

/**
 * Creates middleware that validates request body against a Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware
 *
 * @example
 * const schema = Joi.object({
 *   title: Joi.string().required().min(3).max(200),
 *   email: Joi.string().email().required()
 * });
 *
 * router.post('/jobs', validateBody(schema), jobController.create);
 */
export function validateBody(schema) {
  return async (req, res, next) => {
    try {
      // Validate request body against schema
      const validated = await schema.validateAsync(req.body, {
        abortEarly: false, // Return all errors, not just first
        stripUnknown: true, // Remove unknown fields
        convert: true, // Convert types if possible
      });

      // Attach validated data to request
      req.validatedBody = validated;

      logger.debug('Request body validation passed', {
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      // Extract validation error details
      const details = error.details?.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        constraint: detail.type,
      })) || [];

      logger.warn('Request body validation failed', {
        path: req.path,
        method: req.method,
        errorCount: details.length,
        errors: details,
      });

      next(new ValidationError('Invalid request body', details));
    }
  };
}

/**
 * Creates middleware that validates query parameters against a Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.validateAsync(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      req.validatedQuery = validated;

      logger.debug('Query parameters validation passed', {
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      const details = error.details?.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        constraint: detail.type,
      })) || [];

      logger.warn('Query parameters validation failed', {
        path: req.path,
        method: req.method,
        errors: details,
      });

      next(new ValidationError('Invalid query parameters', details));
    }
  };
}

/**
 * Creates middleware that validates path parameters against a Joi schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.validateAsync(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      req.validatedParams = validated;

      next();
    } catch (error) {
      const details = error.details?.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      })) || [];

      next(new ValidationError('Invalid path parameters', details));
    }
  };
}

/**
 * Sanitizes input to prevent XSS and injection attacks
 * Removes special characters and HTML tags
 */
export function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove HTML tags and trim whitespace
        sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
      } else {
        sanitized[key] = sanitize(value);
      }
    }

    return sanitized;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeInput,
};
