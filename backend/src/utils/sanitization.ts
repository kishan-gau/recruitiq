/**
 * Sanitization utilities for preventing injection attacks
 * Provides functions to clean and validate user input
 */

/**
 * SQL Injection Prevention
 */

// Dangerous SQL keywords and patterns
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|CONVERT)\b)/gi,
  /(--|\*\/|\/\*|;|'|"|`)/g,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /\bOR\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/gi,
];

/**
 * Check if string contains SQL injection patterns
 * @param {string} value - Value to check
 * @returns {boolean} True if SQL injection detected
 */
export function containsSQLInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitize SQL identifier (table/column names)
 * Only allows alphanumeric, underscore, and dash
 * @param {string} identifier - SQL identifier to sanitize
 * @returns {string} Sanitized identifier
 */
export function sanitizeSQLIdentifier(identifier) {
  if (typeof identifier !== 'string') return '';
  return identifier.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * XSS Prevention
 */

// HTML entities mapping
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char]);
}

/**
 * Remove all HTML tags from string
 * @param {string} str - String to strip
 * @returns {string} String without HTML tags
 */
export function stripHtmlTags(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Detect potential XSS patterns
 * @param {string} value - Value to check
 * @returns {boolean} True if XSS pattern detected
 */
export function containsXSS(value) {
  if (typeof value !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize text content (remove XSS but preserve safe formatting)
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  // Remove script tags and event handlers
  const sanitized = text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/eval\(/gi, '');
  
  return sanitized.trim();
}

/**
 * NoSQL Injection Prevention
 */

// MongoDB operators that should not appear in user input
const NOSQL_OPERATORS = [
  '$where',
  '$regex',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$ne',
  '$in',
  '$nin',
  '$exists',
  '$type',
  '$expr',
  '$jsonSchema',
  '$mod',
  '$text',
  '$search',
];

/**
 * Check if object contains NoSQL injection operators
 * @param {any} value - Value to check
 * @returns {boolean} True if NoSQL injection detected
 */
export function containsNoSQLInjection(value) {
  if (typeof value === 'string') {
    return NOSQL_OPERATORS.some(op => value.includes(op));
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).some(key => 
      key.startsWith('$') || containsNoSQLInjection(value[key])
    );
  }
  
  return false;
}

/**
 * Remove NoSQL operators from object
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
export function sanitizeNoSQLObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys starting with $
    if (key.startsWith('$')) continue;
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeNoSQLObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Path Traversal Prevention
 */

/**
 * Check if path contains traversal patterns
 * @param {string} path - Path to check
 * @returns {boolean} True if path traversal detected
 */
export function containsPathTraversal(path) {
  if (typeof path !== 'string') return false;
  
  const traversalPatterns = [
    /\.\./g,
    /\.\.\/|\.\.\\/, 
    /%2e%2e/gi,
    /%252e/gi,
    /\.\.%2f/gi,
  ];
  
  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * Sanitize file path
 * @param {string} path - Path to sanitize
 * @returns {string} Sanitized path
 */
export function sanitizeFilePath(path) {
  if (typeof path !== 'string') return '';
  
  // Remove path traversal sequences
  let sanitized = path
    .replace(/\.\./g, '')
    .replace(/[\/\\]+/g, '/')
    .replace(/^\/+/, '');
  
  // Only allow safe characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._\-\/]/g, '');
  
  return sanitized;
}

/**
 * General Sanitization
 */

/**
 * Remove null bytes from string
 * @param {string} str - String to sanitize
 * @returns {string} String without null bytes
 */
export function removeNullBytes(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\0/g, '');
}

/**
 * Normalize unicode characters to prevent homograph attacks
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalizeUnicode(str) {
  if (typeof str !== 'string') return '';
  return str.normalize('NFKC');
}

/**
 * Sanitize string input (comprehensive)
 * @param {string} str - String to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeString(str, options = {}) {
  const {
    trim = true,
    removeNullBytes: nullBytes = true,
    normalizeUnicode: normalize = true,
    maxLength = null,
  } = options;
  
  if (typeof str !== 'string') return '';
  
  let sanitized = str;
  
  if (nullBytes) {
    sanitized = removeNullBytes(sanitized);
  }
  
  if (normalize) {
    sanitized = normalizeUnicode(sanitized);
  }
  
  if (trim) {
    sanitized = sanitized.trim();
  }
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitize all string values in an object recursively
 * @param {object} obj - Object to sanitize
 * @param {object} options - Sanitization options
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj, options = {}) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validation helpers
 */

/**
 * Check if value is safe for database operations
 * @param {any} value - Value to check
 * @returns {object} { safe: boolean, reason: string }
 */
export function isSafeInput(value) {
  if (typeof value === 'string') {
    if (containsSQLInjection(value)) {
      return { safe: false, reason: 'Potential SQL injection detected' };
    }
    if (containsXSS(value)) {
      return { safe: false, reason: 'Potential XSS attack detected' };
    }
    if (containsPathTraversal(value)) {
      return { safe: false, reason: 'Path traversal detected' };
    }
  }
  
  if (typeof value === 'object' && value !== null) {
    if (containsNoSQLInjection(value)) {
      return { safe: false, reason: 'NoSQL injection operators detected' };
    }
  }
  
  return { safe: true };
}

export default {
  // SQL
  containsSQLInjection,
  sanitizeSQLIdentifier,
  
  // XSS
  escapeHtml,
  stripHtmlTags,
  containsXSS,
  sanitizeText,
  
  // NoSQL
  containsNoSQLInjection,
  sanitizeNoSQLObject,
  
  // Path Traversal
  containsPathTraversal,
  sanitizeFilePath,
  
  // General
  removeNullBytes,
  normalizeUnicode,
  sanitizeString,
  sanitizeObject,
  
  // Validation
  isSafeInput,
};
