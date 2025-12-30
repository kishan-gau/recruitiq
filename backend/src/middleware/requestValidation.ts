/**
 * Request Validation Middleware
 * 
 * Validates incoming requests against defined schemas
 * Sanitizes inputs and prevents common attacks
 * 
 * @module middleware/requestValidation
 */

import type { Request, Response, NextFunction } from 'express';
import type { ObjectSchema } from 'joi';
import Joi from 'joi';
import validator from 'validator';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Validation options
 */
export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  convert?: boolean;
  customMessages?: Record<string, string>;
}

/**
 * Validates request body against a Joi schema
 * 
 * @param schema - Joi validation schema
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * const createJobSchema = Joi.object({
 *   title: Joi.string().required().min(3),
 *   description: Joi.string().required(),
 * });
 * 
 * router.post('/jobs', validateRequest(createJobSchema), createJob);
 */
export function validateRequest(
  schema: ObjectSchema,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { abortEarly = false, stripUnknown = true, convert = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const { error, value } = schema.validate(req.body, {
        abortEarly,
        stripUnknown,
        convert,
      });

      if (error) {
        // Extract error details
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        // Log validation error
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: details,
          body: sanitizeForLogging(req.body),
        });

        throw new ValidationError('Request validation failed', details);
      }

      // Replace body with validated and sanitized data
      req.body = value;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates query parameters
 * 
 * @param schema - Joi validation schema for query params
 * @returns Express middleware function
 * 
 * @example
 * const listJobsQuerySchema = Joi.object({
 *   page: Joi.number().min(1).default(1),
 *   limit: Joi.number().min(1).max(100).default(20),
 *   status: Joi.string().valid('open', 'closed'),
 * });
 * 
 * router.get('/jobs', validateQuery(listJobsQuerySchema), listJobs);
 */
export function validateQuery(schema: ObjectSchema): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        throw new ValidationError('Query validation failed', details);
      }

      // Replace query with validated data
      req.query = value;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates URL parameters
 * 
 * @param schema - Joi validation schema for params
 * @returns Express middleware function
 * 
 * @example
 * const resourceIdSchema = Joi.object({
 *   id: Joi.string().uuid().required(),
 * });
 * 
 * router.get('/jobs/:id', validateParams(resourceIdSchema), getJob);
 */
export function validateParams(schema: ObjectSchema): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        throw new ValidationError('URL parameter validation failed', details);
      }

      // Replace params with validated data
      req.params = value;

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Sanitizes a string input to prevent XSS
 * 
 * @param input - Input string to sanitize
 * @returns Sanitized string
 * 
 * @example
 * const safe = sanitizeString('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Escape HTML entities to prevent XSS
  return validator.escape(input);
}

/**
 * Sanitizes all string fields in an object
 * 
 * @param obj - Object to sanitize
 * @returns Object with sanitized strings
 * 
 * @example
 * const sanitized = sanitizeObject(jobData);
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitizes data for safe logging (removes sensitive fields)
 * 
 * @param data - Data to sanitize
 * @returns Data safe to log
 * 
 * @example
 * logger.info('User data', sanitizeForLogging(userData));
 */
export function sanitizeForLogging(data: any): any {
  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'ssn',
    'creditCard',
    'bankAccount',
  ];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: any) =>
        typeof item === 'object' && item !== null ? sanitizeForLogging(item) : item
      );
    }
  }

  return sanitized;
}

/**
 * Validates and normalizes an email address
 * 
 * @param email - Email to validate
 * @returns Normalized email address
 * @throws ValidationError if invalid
 * 
 * @example
 * const normalized = validateAndNormalizeEmail('USER@EXAMPLE.COM');
 * // Returns: 'user@example.com'
 */
export function validateAndNormalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }

  const trimmed = email.trim();

  if (!validator.isEmail(trimmed)) {
    throw new ValidationError('Invalid email format');
  }

  // Normalize email (lowercase, remove extra spaces)
  const normalized = validator.normalizeEmail(trimmed);

  if (!normalized) {
    throw new ValidationError('Invalid email format');
  }

  // Check for disposable email providers
  if (isDisposableEmail(normalized)) {
    throw new ValidationError('Disposable email addresses are not allowed');
  }

  return normalized;
}

/**
 * Checks if email is from a disposable email provider
 * 
 * @param email - Email to check
 * @returns true if disposable, false otherwise
 * 
 * @example
 * const isDisposable = isDisposableEmail('user@tempmail.com');
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'mailinator.com',
    'throwaway.email',
    'guerrillamail.com',
    'temp-mail.org',
  ];

  const domain = email.split('@')[1]?.toLowerCase();

  return disposableDomains.includes(domain || '');
}

/**
 * Validates a UUID
 * 
 * @param id - ID to validate
 * @param fieldName - Name of the field for error messages
 * @returns true if valid UUID
 * @throws ValidationError if invalid
 * 
 * @example
 * validateUUID('123e4567-e89b-12d3-a456-426614174000', 'User ID');
 */
export function validateUUID(id: string, fieldName: string = 'ID'): string {
  if (!id) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (!validator.isUUID(id, '4')) {
    throw new ValidationError(`${fieldName} must be a valid UUID v4`);
  }

  return id;
}

/**
 * Validates a file upload
 * 
 * @param file - File from Express multer
 * @param options - Validation options
 * @throws ValidationError if invalid
 * 
 * @example
 * validateFileUpload(req.file, {
 *   maxSize: 10 * 1024 * 1024,
 *   allowedTypes: ['image/jpeg', 'image/png']
 * });
 */
export interface FileValidationOptions {
  maxSize?: number; // In bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export function validateFileUpload(file: any, options: FileValidationOptions = {}): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
  } = options;

  if (!file) {
    throw new ValidationError('File is required');
  }

  // Check file size
  if (file.size > maxSize) {
    throw new ValidationError(`File size must not exceed ${maxSize / (1024 * 1024)}MB`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError(`File type must be one of: ${allowedTypes.join(', ')}`);
  }

  // Check file extension
  const extension = file.originalname.split('.').pop()?.toLowerCase();

  if (!extension || !allowedExtensions.includes(extension)) {
    throw new ValidationError(`File extension must be one of: ${allowedExtensions.join(', ')}`);
  }

  // Verify extension matches MIME type
  const mimeToExtensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf'],
  };

  const expectedExtensions = mimeToExtensions[file.mimetype] || [];

  if (!expectedExtensions.includes(extension)) {
    throw new ValidationError('File extension does not match file content type');
  }
}

/**
 * Creates a request-scoped validation context
 * Useful for adding custom validation logic
 * 
 * @param req - Express request object
 * @returns Validation context object
 * 
 * @example
 * const context = createValidationContext(req);
 * context.validateOwnership(resource.createdBy, req.user.id);
 */
export interface ValidationContext {
  validateOwnership: (resourceOwnerId: string, userId: string) => void;
  validateOrganization: (resourceOrgId: string, userOrgId: string) => void;
  validatePermission: (userRole: string, requiredRole: string[]) => void;
}

export function createValidationContext(req: Request): ValidationContext {
  return {
    validateOwnership: (resourceOwnerId: string, userId: string) => {
      if (resourceOwnerId !== userId) {
        throw new ValidationError('You do not own this resource');
      }
    },

    validateOrganization: (resourceOrgId: string, userOrgId: string) => {
      if (resourceOrgId !== userOrgId) {
        throw new ValidationError('Resource does not belong to your organization');
      }
    },

    validatePermission: (userRole: string, requiredRoles: string[]) => {
      if (!requiredRoles.includes(userRole)) {
        throw new ValidationError('You do not have permission to perform this action');
      }
    },
  };
}
