/**
 * Custom Joi extensions for common validation patterns
 */

import Joi from 'joi';
import { containsSQLInjection, containsXSS, containsPathTraversal } from './sanitization.js';

/**
 * Phone Number Extension
 * Validates international phone numbers
 */
const phoneNumberExtension = {
  type: 'phoneNumber',
  base: Joi.string(),
  messages: {
    'phoneNumber.invalid': '{{#label}} must be a valid phone number',
  },
  validate(value, helpers) {
    // Remove common formatting characters
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    
    // Check if it's a valid international format
    // Supports: +1234567890 or just digits (10-15 digits)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    
    if (!phoneRegex.test(cleaned)) {
      return { value, errors: helpers.error('phoneNumber.invalid') };
    }
    
    return { value: cleaned };
  },
};

/**
 * Safe String Extension
 * Prevents SQL injection, XSS, and path traversal
 */
const safeStringExtension = {
  type: 'safeString',
  base: Joi.string(),
  messages: {
    'safeString.sqlInjection': '{{#label}} contains potentially dangerous SQL patterns',
    'safeString.xss': '{{#label}} contains potentially dangerous scripts',
    'safeString.pathTraversal': '{{#label}} contains path traversal patterns',
  },
  validate(value, helpers) {
    if (containsSQLInjection(value)) {
      return { value, errors: helpers.error('safeString.sqlInjection') };
    }
    
    if (containsXSS(value)) {
      return { value, errors: helpers.error('safeString.xss') };
    }
    
    if (containsPathTraversal(value)) {
      return { value, errors: helpers.error('safeString.pathTraversal') };
    }
    
    return { value };
  },
};

/**
 * Username Extension
 * Alphanumeric with underscore and dash only
 */
const usernameExtension = {
  type: 'username',
  base: Joi.string(),
  messages: {
    'username.invalid': '{{#label}} must contain only letters, numbers, underscores, and dashes',
    'username.length': '{{#label}} must be between 3 and 30 characters',
  },
  validate(value, helpers) {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    
    if (!usernameRegex.test(value)) {
      if (value.length < 3 || value.length > 30) {
        return { value, errors: helpers.error('username.length') };
      }
      return { value, errors: helpers.error('username.invalid') };
    }
    
    return { value };
  },
};

/**
 * Slug Extension
 * URL-safe slugs (lowercase, alphanumeric, dashes)
 */
const slugExtension = {
  type: 'slug',
  base: Joi.string(),
  messages: {
    'slug.invalid': '{{#label}} must be a valid URL slug (lowercase letters, numbers, and dashes only)',
  },
  validate(value, helpers) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    
    if (!slugRegex.test(value)) {
      return { value, errors: helpers.error('slug.invalid') };
    }
    
    return { value };
  },
};

/**
 * SQL Safe Extension
 * For user-provided identifiers (table names, column names)
 */
const sqlSafeExtension = {
  type: 'sqlSafe',
  base: Joi.string(),
  messages: {
    'sqlSafe.invalid': '{{#label}} contains invalid characters for SQL identifiers',
  },
  validate(value, helpers) {
    // Only alphanumeric, underscore, and dash
    const sqlSafeRegex = /^[a-zA-Z0-9_-]+$/;
    
    if (!sqlSafeRegex.test(value)) {
      return { value, errors: helpers.error('sqlSafe.invalid') };
    }
    
    return { value };
  },
};

/**
 * Hex Color Extension
 */
const hexColorExtension = {
  type: 'hexColor',
  base: Joi.string(),
  messages: {
    'hexColor.invalid': '{{#label}} must be a valid hex color (e.g., #FFFFFF or #FFF)',
  },
  validate(value, helpers) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (!hexColorRegex.test(value)) {
      return { value, errors: helpers.error('hexColor.invalid') };
    }
    
    return { value: value.toUpperCase() };
  },
};

/**
 * Create extended Joi with custom validators
 */
const extendedJoi = Joi.extend(
  phoneNumberExtension,
  safeStringExtension,
  usernameExtension,
  slugExtension,
  sqlSafeExtension,
  hexColorExtension
);

export default extendedJoi;
