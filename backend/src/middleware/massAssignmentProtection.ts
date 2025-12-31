/**
 * Mass Assignment Protection Middleware
 * 
 * Prevents mass assignment vulnerabilities by:
 * - Stripping unknown/dangerous fields from request bodies
 * - Protecting sensitive fields like role, permissions, organization_id
 * - Enforcing field whitelists per route
 * 
 * Based on OWASP recommendations for secure parameter handling
 */

import logger from '../utils/logger.js';
import { ValidationError } from './errorHandler.js';

/**
 * Protected fields that should never be mass-assigned
 * These fields require explicit authorization checks
 */
const GLOBALLY_PROTECTED_FIELDS = new Set([
  'id',
  'uuid',
  'created_at',
  'updated_at',
  'deleted_at',
  'created_by',
  'updated_by',
  'organization_id',
  'tenant_id',
  'workspace_id', // Should only be set during creation, not updates
  'role', // Requires separate authorization
  'role_id',
  'permissions',
  'is_admin',
  'is_owner',
  'is_superuser',
  'is_verified',
  'email_verified_at',
  'password_hash',
  'password',
  'salt',
  'refresh_token',
  'access_token',
  'api_key',
  'api_secret',
  'mfa_secret',
  'backup_codes',
  'reset_token',
  'reset_token_expires',
  'verification_token',
  'verification_token_expires',
]);

/**
 * Dangerous field patterns (regex)
 * Fields matching these patterns are automatically blocked
 */
const DANGEROUS_PATTERNS = [
  /.*_token$/i,
  /.*_secret$/i,
  /.*_key$/i,
  /.*_password$/i,
  /.*_hash$/i,
  /^__.*__$/,  // Double underscores (internal fields)
  /_id$/,      // Foreign key fields
];

/**
 * Check if a field name matches any dangerous pattern
 * 
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field is dangerous
 */
function isDangerousField(fieldName) {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Strip protected and dangerous fields from request body
 * 
 * @param {Object} body - Request body object
 * @param {Set} additionalProtected - Additional fields to protect
 * @returns {Object} Sanitized body object
 */
function stripProtectedFields(body, additionalProtected = new Set()) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = {};
  const strippedFields = [];

  for (const [key, value] of Object.entries(body)) {
    // Check if field is globally protected
    if (GLOBALLY_PROTECTED_FIELDS.has(key)) {
      strippedFields.push(key);
      continue;
    }

    // Check if field is additionally protected
    if (additionalProtected.has(key)) {
      strippedFields.push(key);
      continue;
    }

    // Check if field matches dangerous pattern
    if (isDangerousField(key)) {
      strippedFields.push(key);
      continue;
    }

    // Field is safe, include it
    sanitized[key] = value;
  }

  if (strippedFields.length > 0) {
    logger.warn('Stripped protected fields from request', {
      fields: strippedFields,
      ipAddress: 'middleware-context', // Will be set by middleware
    });
  }

  return sanitized;
}

/**
 * Enforce field whitelist on request body
 * Only allows explicitly whitelisted fields
 * 
 * @param {Object} body - Request body object
 * @param {Array<string>} allowedFields - Array of allowed field names
 * @param {boolean} strict - Throw error if unknown fields present
 * @returns {Object} Filtered body object
 */
function enforceWhitelist(body, allowedFields, strict = false) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const allowed = new Set(allowedFields);
  const filtered = {};
  const rejectedFields = [];

  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    } else {
      rejectedFields.push(key);
    }
  }

  if (rejectedFields.length > 0) {
    logger.warn('Rejected non-whitelisted fields', {
      fields: rejectedFields,
      ipAddress: 'middleware-context',
    });

    if (strict) {
      throw new ValidationError(
        `Invalid fields: ${rejectedFields.join(', ')}. ` +
        `Allowed fields: ${allowedFields.join(', ')}`
      );
    }
  }

  return filtered;
}

/**
 * Middleware factory: Strip protected fields from request body
 * 
 * Usage:
 *   router.post('/api/users', stripProtectedFields(), createUser);
 * 
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.additionalProtected - Additional fields to protect
 * @returns {Function} Express middleware
 */
export function createProtectionMiddleware(options = {}) {
  const { additionalProtected = [] } = options;
  const additionalSet = new Set(additionalProtected);

  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = stripProtectedFields(req.body, additionalSet);
    }
    next();
  };
}

/**
 * Middleware factory: Enforce field whitelist
 * 
 * Usage:
 *   router.patch('/api/users/:id', 
 *     enforceFieldWhitelist(['name', 'email', 'phone']),
 *     updateUser
 *   );
 * 
 * @param {Array<string>} allowedFields - Array of allowed field names
 * @param {Object} options - Configuration options
 * @param {boolean} options.strict - Throw error if unknown fields present
 * @returns {Function} Express middleware
 */
export function createWhitelistMiddleware(allowedFields, options = {}) {
  const { strict = false } = options;

  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = enforceWhitelist(req.body, allowedFields, strict);
      }
      next();
    } catch (_error) {
      next(error);
    }
  };
}

/**
 * Prevent modification of protected fields in updates
 * Checks if any protected fields are present and returns error
 * 
 * @param {Array<string>} protectedFields - Fields that cannot be modified
 * @returns {Function} Express middleware
 */
export function preventFieldModification(protectedFields) {
  const protectedSet = new Set(protectedFields);

  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const attemptedFields = Object.keys(req.body).filter(key => 
        protectedSet.has(key)
      );

      if (attemptedFields.length > 0) {
        logger.security('Attempted modification of protected fields', {
          fields: attemptedFields,
          userId: req.user?.id,
          ipAddress: req.ip,
          route: req.route?.path,
        });

        return next(new ValidationError(
          `Cannot modify protected fields: ${attemptedFields.join(', ')}`
        ));
      }
    }
    next();
  };
}

/**
 * Validate nested object structure
 * Prevents prototype pollution and deep object injection
 * 
 * @param {number} maxDepth - Maximum allowed nesting depth
 * @returns {Function} Express middleware
 */
export function validateObjectStructure(maxDepth = 3) {
  function checkDepth(obj, currentDepth = 0) {
    if (currentDepth > maxDepth) {
      throw new ValidationError(
        `Object nesting exceeds maximum depth of ${maxDepth}`
      );
    }

    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Check for prototype pollution attempts
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        throw new ValidationError(
          `Dangerous property name detected: ${key}`
        );
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkDepth(obj[key], currentDepth + 1);
      }
    }
  }

  return (req, res, next) => {
    try {
      if (req.body) {
        checkDepth(req.body);
      }
      if (req.query) {
        checkDepth(req.query);
      }
      next();
    } catch (_error) {
      next(error);
    }
  };
}

/**
 * Combined protection middleware
 * Applies multiple protection layers in sequence
 * 
 * Usage:
 *   router.patch('/api/users/:id', 
 *     protectMassAssignment({
 *       allowedFields: ['name', 'email', 'phone'],
 *       additionalProtected: ['status'],
 *       strict: true
 *     }),
 *     updateUser
 *   );
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
export function protectMassAssignment(options = {}) {
  const {
    allowedFields = null,
    additionalProtected = [],
    strict = false,
    maxDepth = 3,
  } = options;

  return (req, res, next) => {
    try {
      // Step 1: Validate object structure (prevent prototype pollution)
      if (req.body) {
        const structureValidator = validateObjectStructure(maxDepth);
        structureValidator(req, res, () => {});
      }

      // Step 2: Strip globally protected fields
      if (req.body && typeof req.body === 'object') {
        const additionalSet = new Set(additionalProtected);
        req.body = stripProtectedFields(req.body, additionalSet);
      }

      // Step 3: Enforce whitelist if provided
      if (allowedFields && req.body && typeof req.body === 'object') {
        req.body = enforceWhitelist(req.body, allowedFields, strict);
      }

      next();
    } catch (_error) {
      next(error);
    }
  };
}

export default {
  createProtectionMiddleware,
  createWhitelistMiddleware,
  preventFieldModification,
  validateObjectStructure,
  protectMassAssignment,
};
