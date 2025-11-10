/**
 * Request Security Middleware
 * 
 * Comprehensive request validation and sanitization to prevent:
 * - NoSQL injection
 * - SQL injection (parameterized queries are primary defense)
 * - XSS attacks
 * - Command injection
 * - Path traversal
 * - Malformed data
 * 
 * Based on OWASP Input Validation Cheat Sheet
 */

import validator from 'validator';
import { ValidationError } from './errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Dangerous patterns based on OWASP recommendations
 * 
 * OWASP Principle: Defense in depth - these patterns catch obvious attacks
 * but parameterized queries and output encoding are primary defenses.
 * 
 * Note: These patterns should not block legitimate structured data (JSON, etc.)
 * Context-aware validation happens at the controller/service layer.
 */
const DANGEROUS_PATTERNS = [
  // SQL injection - only catch obvious attacks with URL encoding
  /(\%27)(\%6F|\%4F)(\%72|\%52)/i, // Encoded 'or'
  /(\%27)(\%20)*(union|select|insert|update|delete|drop)/gi, // Encoded SQL keywords
  
  // Command injection - only in obviously dangerous contexts
  /;\s*(rm|cat|ls|wget|curl|bash|sh)\s+-/gi, // Shell commands with flags
  /\|\s*(nc|telnet|ncat)\s+/gi, // Network commands
  /`[^`]*\$\([^)]*\)[^`]*`/g, // Command substitution in backticks
  
  // Path traversal - but allow legitimate relative paths
  /\.\.[\/\\]\.\.[\/\\]/g, // Multiple directory traversals
  /(\/|\\)(etc|windows|system32|boot)[\/\\](passwd|shadow|sam)/gi, // System file access
  
  // NoSQL injection - only dangerous operators that execute code
  /\{\s*['"]\$where['"]\s*:\s*["']?\s*(function|=>)/gi, // $where with functions
];

/**
 * XSS dangerous patterns
 */
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

/**
 * Check if string contains dangerous patterns
 * 
 * @param {string} value - Value to check
 * @returns {boolean} True if dangerous pattern detected
 */
function containsDangerousPattern(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return DANGEROUS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if string contains XSS patterns
 * 
 * @param {string} value - Value to check
 * @returns {boolean} True if XSS pattern detected
 */
function containsXSSPattern(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitize string for safe output
 * Escapes HTML entities to prevent XSS
 * 
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
export function sanitizeHTML(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return validator.escape(value);
}

/**
 * Validate and sanitize query parameters
 * 
 * @param {Object} params - Query parameters object
 * @param {Object} options - Validation options
 * @returns {Object} Sanitized parameters
 */
export function sanitizeQueryParams(params, options = {}) {
  const { allowArrays = true } = options;

  if (!params || typeof params !== 'object') {
    return params;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(params)) {
    // Check for dangerous key names
    if (containsDangerousPattern(key)) {
      logger.warn('Dangerous pattern in query param key', { key });
      continue; // Skip this parameter
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (!allowArrays) {
        logger.warn('Array in query params not allowed', { key });
        continue;
      }
      sanitized[key] = value.map(v => 
        typeof v === 'string' ? validator.stripLow(v) : v
      );
      continue;
    }

    // Handle strings
    if (typeof value === 'string') {
      // Check for dangerous patterns
      if (containsDangerousPattern(value)) {
        throw new ValidationError(
          `Invalid value in parameter '${key}': contains disallowed characters`
        );
      }

      // Strip control characters
      sanitized[key] = validator.stripLow(value);
      continue;
    }

    // Handle other types (numbers, booleans)
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Fields that contain structured data (JSON, configuration, etc.)
 * These fields are validated at the application layer, not by pattern matching
 */
const STRUCTURED_DATA_FIELDS = [
  'config',
  'configuration',
  'settings',
  'metadata',
  'data',
  'definition',
  'steps',
  'nodes',
  'edges',
  'schema',
  'payload',
  'content',
];

/**
 * Recursively sanitize object
 * 
 * @param {any} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @param {string} fieldName - Current field name for context-aware validation
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj, depth = 0, maxDepth = 5, fieldName = '') {
  if (depth > maxDepth) {
    throw new ValidationError('Object nesting too deep');
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Skip pattern checking for structured data fields
    const isStructuredData = STRUCTURED_DATA_FIELDS.includes(fieldName.toLowerCase());
    
    if (!isStructuredData) {
      // Check for dangerous patterns
      if (containsDangerousPattern(obj)) {
        throw new ValidationError(
          'Input contains disallowed characters or patterns'
        );
      }

      // Check for XSS patterns
      if (containsXSSPattern(obj)) {
        throw new ValidationError(
          'Input contains potentially malicious HTML/JavaScript'
        );
      }
    }

    // Strip control characters (safe for all data types)
    return validator.stripLow(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth, fieldName));
  }

  if (typeof obj === 'object') {
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check for dangerous key names
      if (containsDangerousPattern(key)) {
        throw new ValidationError(
          `Invalid property name: '${key}' contains disallowed characters`
        );
      }

      // Check for prototype pollution
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        throw new ValidationError(
          `Disallowed property name: '${key}'`
        );
      }

      // Pass the key name for context-aware validation
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth, key);
    }

    return sanitized;
  }

  return obj;
}

/**
 * Middleware: Validate and sanitize request body
 * 
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export function validateRequestBody(options = {}) {
  const { 
    maxDepth = 5,
    stripXSS = true,
    blockDangerousPatterns = true 
  } = options;

  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, 0, maxDepth);
      }
      next();
    } catch (error) {
      logger.warn('Request body validation failed', {
        error: error.message,
        userId: req.user?.id,
        ipAddress: req.ip,
        route: req.route?.path,
      });
      next(error);
    }
  };
}

/**
 * Middleware: Validate and sanitize query parameters
 * 
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export function validateQueryParams(options = {}) {
  const { allowArrays = true } = options;

  return (req, res, next) => {
    try {
      if (req.query) {
        // Just validate without reassigning (req.query is read-only after body-parser)
        // sanitizeQueryParams will throw if validation fails
        sanitizeQueryParams(req.query, { allowArrays });
      }
      next();
    } catch (error) {
      logger.warn('Query params validation failed', {
        error: error.message,
        userId: req.user?.id,
        ipAddress: req.ip,
        route: req.route?.path,
      });
      next(error);
    }
  };
}

/**
 * Middleware: Validate URL parameters (route params)
 * 
 * @returns {Function} Express middleware
 */
export function validateUrlParams() {
  return (req, res, next) => {
    try {
      if (req.params) {
        for (const [key, value] of Object.entries(req.params)) {
          if (typeof value === 'string') {
            // Check for dangerous patterns
            if (containsDangerousPattern(value)) {
              throw new ValidationError(
                `Invalid URL parameter '${key}': contains disallowed characters`
              );
            }

            // Check for path traversal
            if (value.includes('..')) {
              throw new ValidationError(
                `Invalid URL parameter '${key}': path traversal attempt`
              );
            }
          }
        }
      }
      next();
    } catch (error) {
      logger.warn('URL params validation failed', {
        error: error.message,
        userId: req.user?.id,
        ipAddress: req.ip,
        route: req.route?.path,
        params: req.params,
      });
      next(error);
    }
  };
}

/**
 * Combined security validation middleware
 * Applies all security checks in sequence
 * 
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export function secureRequest(options = {}) {
  const bodyValidator = validateRequestBody(options);
  const queryValidator = validateQueryParams(options);
  const urlValidator = validateUrlParams();

  return (req, res, next) => {
    urlValidator(req, res, (urlErr) => {
      if (urlErr) return next(urlErr);

      queryValidator(req, res, (queryErr) => {
        if (queryErr) return next(queryErr);

        bodyValidator(req, res, (bodyErr) => {
          if (bodyErr) return next(bodyErr);
          next();
        });
      });
    });
  };
}

/**
 * Middleware: Block file upload paths in JSON
 * Prevents malicious file path injections
 * 
 * @returns {Function} Express middleware
 */
export function blockFilePathInjection() {
  const dangerousPaths = [
    '/etc/passwd',
    '/etc/shadow',
    'C:\\Windows\\System32',
    '../',
    '..\\',
    '/proc/',
    '/sys/',
  ];

  return (req, res, next) => {
    const checkValue = (value) => {
      if (typeof value === 'string') {
        for (const dangerous of dangerousPaths) {
          if (value.includes(dangerous)) {
            throw new ValidationError(
              'Input contains potentially dangerous file path'
            );
          }
        }
      }
    };

    const checkObject = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
          checkValue(value);
        } else if (typeof value === 'object') {
          checkObject(value);
        }
      }
    };

    try {
      if (req.body) checkObject(req.body);
      if (req.query) checkObject(req.query);
      next();
    } catch (error) {
      logger.warn('File path injection attempt detected', {
        userId: req.user?.id,
        ipAddress: req.ip,
        route: req.route?.path,
      });
      next(error);
    }
  };
}

export default {
  sanitizeHTML,
  sanitizeQueryParams,
  validateRequestBody,
  validateQueryParams,
  validateUrlParams,
  secureRequest,
  blockFilePathInjection,
};
