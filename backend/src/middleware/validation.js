/**
 * Validation middleware
 * Validates request data against Joi schemas
 */

import logger from '../utils/logger.js';
import { sanitizeObject } from '../utils/sanitization.js';

/**
 * Validate request data against a Joi schema
 * @param {object} schema - Joi schema to validate against
 * @param {string} source - Source of data: 'body', 'query', 'params', 'headers'
 * @returns {Function} Express middleware
 */
export function validate(schema, source = 'body') {
  // Validate source parameter
  const validSources = ['body', 'query', 'params', 'headers'];
  if (!validSources.includes(source)) {
    throw new Error(`Invalid validation source: ${source}. Must be one of: ${validSources.join(', ')}`);
  }

  return async (req, res, next) => {
    try {
      // Get data from the specified source
      const data = req[source];
      
      // Debug logging for payroll-runs endpoint
      if (req.path === '/payroll-runs' || req.path.includes('/payroll-runs')) {
        console.log('=== VALIDATION DEBUG ===');
        console.log('Path:', req.path);
        console.log('Source:', source);
        console.log('Data received:', JSON.stringify(data, null, 2));
        console.log('Schema keys:', Object.keys(schema.describe().keys));
      }

      // Validate and sanitize
      const { error, value } = schema.validate(data, {
        abortEarly: false, // Return all errors, not just the first one
        stripUnknown: true, // Remove unknown fields (prevent mass assignment)
        convert: true, // Convert types (e.g., string to number)
      });

      if (error) {
        // Format validation errors
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        logger.warn('Validation failed', {
          source,
          path: req.path,
          method: req.method,
          errors,
          ip: req.ip,
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'The request contains invalid data',
          details: errors,
        });
      }

      // Additional sanitization for string values
      const sanitized = sanitizeObject(value, {
        trim: true,
        removeNullBytes: true,
        normalizeUnicode: true,
      });

      // Replace the original data with validated and sanitized data
      req[source] = sanitized;

      // Store original data for audit logging if needed
      req.validatedData = {
        source,
        original: data,
        validated: sanitized,
      };

      next();
    } catch (err) {
      logger.error('Validation middleware error', {
        error: err.message,
        stack: err.stack,
        source,
        path: req.path,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while validating the request',
      });
    }
  };
}

/**
 * Validate multiple sources at once
 * @param {object} schemas - Object with sources as keys and schemas as values
 * @returns {Function} Express middleware
 * 
 * @example
 * validateMultiple({
 *   body: loginSchema,
 *   query: paginationSchema
 * })
 */
export function validateMultiple(schemas) {
  const validSources = ['body', 'query', 'params', 'headers'];
  
  // Validate that all keys are valid sources
  const invalidSources = Object.keys(schemas).filter(
    source => !validSources.includes(source)
  );
  
  if (invalidSources.length > 0) {
    throw new Error(
      `Invalid validation sources: ${invalidSources.join(', ')}. Must be one of: ${validSources.join(', ')}`
    );
  }

  return async (req, res, next) => {
    try {
      const allErrors = [];
      const sanitized = {};

      // Validate each source
      for (const [source, schema] of Object.entries(schemas)) {
        const data = req[source];

        const { error, value } = schema.validate(data, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          const errors = error.details.map(detail => ({
            source,
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type,
          }));
          allErrors.push(...errors);
        } else {
          // Sanitize the validated data
          sanitized[source] = sanitizeObject(value, {
            trim: true,
            removeNullBytes: true,
            normalizeUnicode: true,
          });
        }
      }

      // If there are any errors, return them all
      if (allErrors.length > 0) {
        logger.warn('Multi-source validation failed', {
          path: req.path,
          method: req.method,
          errors: allErrors,
          ip: req.ip,
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'The request contains invalid data',
          details: allErrors,
        });
      }

      // Apply sanitized data to request
      for (const [source, value] of Object.entries(sanitized)) {
        req[source] = value;
      }

      next();
    } catch (err) {
      logger.error('Multi-source validation middleware error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while validating the request',
      });
    }
  };
}

/**
 * Validate file uploads
 * @param {object} options - Validation options
 * @returns {Function} Express middleware
 */
export function validateFileUpload(options = {}) {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = [],
    allowedExtensions = [],
    fieldName = 'file',
  } = options;

  return (req, res, next) => {
    try {
      const file = req.file || (req.files && req.files[fieldName]);

      // Check if file is required
      if (required && !file) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `File upload is required for field: ${fieldName}`,
        });
      }

      // If no file and not required, continue
      if (!file) {
        return next();
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
          details: {
            fileSize: file.size,
            maxSize,
          },
        });
      }

      // Check MIME type
      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'File type is not allowed',
          details: {
            fileType: file.mimetype,
            allowedTypes: allowedMimeTypes,
          },
        });
      }

      // Check file extension
      if (allowedExtensions.length > 0) {
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'File extension is not allowed',
            details: {
              fileExtension,
              allowedExtensions,
            },
          });
        }
      }

      // Check for path traversal in filename
      if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid filename',
        });
      }

      logger.info('File upload validated', {
        fieldName,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: req.path,
      });

      next();
    } catch (err) {
      logger.error('File validation error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while validating the file upload',
      });
    }
  };
}

/**
 * Create a custom validator function
 * @param {Function} validatorFn - Custom validation function
 * @returns {Function} Express middleware
 */
export function customValidator(validatorFn) {
  return async (req, res, next) => {
    try {
      const result = await validatorFn(req);

      if (result === true || result === undefined) {
        return next();
      }

      // If result is an object with error information
      if (typeof result === 'object' && result.error) {
        return res.status(result.statusCode || 400).json({
          error: 'Validation Error',
          message: result.message || 'Custom validation failed',
          details: result.details,
        });
      }

      // If result is false or a string
      return res.status(400).json({
        error: 'Validation Error',
        message: typeof result === 'string' ? result : 'Custom validation failed',
      });
    } catch (err) {
      logger.error('Custom validator error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
      });
    }
  };
}

export default {
  validate,
  validateMultiple,
  validateFileUpload,
  customValidator,
};
