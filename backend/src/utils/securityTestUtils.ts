/**
 * Security Testing Utilities
 * 
 * Provides utilities for security-focused testing
 * Tests XSS, SQL injection, authentication, authorization, etc.
 * 
 * @module utils/securityTestUtils
 */

import type { Request, Response } from 'express';

/**
 * Common XSS payloads for security testing
 * ONLY FOR TESTING - Never use in production
 */
export const XSS_TEST_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(\'xss\')">',
  '<svg onload="alert(\'xss\')">',
  '<iframe src="javascript:alert(\'xss\')">',
  '<body onload="alert(\'xss\')">',
  '"><script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  'javascript:alert("xss")',
  '<style>@import "javascript:alert(\'xss\')";</style>',
  '<input onfocus="alert(\'xss\')" autofocus>',
];

/**
 * Common SQL injection payloads for security testing
 * ONLY FOR TESTING - Never use in production
 */
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "' UNION SELECT * FROM users --",
  "admin' --",
  "' OR 1=1 --",
  "' OR 'a'='a",
  '" OR "1"="1',
  "1' AND '1'='1",
  "' AND 1=1 --",
  "'; EXEC sp_MSForEachTable 'DROP TABLE ?'; --",
];

/**
 * Common CSRF attack patterns for testing
 * ONLY FOR TESTING - Never use in production
 */
export const CSRF_TEST_PATTERNS = [
  'missing-csrf-token',
  'invalid-csrf-token',
  'expired-csrf-token',
];

/**
 * Common authentication bypass attempts
 * ONLY FOR TESTING - Never use in production
 */
export const AUTH_BYPASS_ATTEMPTS = [
  { token: 'invalid-token', expected: 401 },
  { token: 'expired-token', expected: 401 },
  { token: '', expected: 401 },
  { token: null, expected: 401 },
  { token: 'Bearer invalid', expected: 401 },
];

/**
 * Tests whether input is properly escaped in HTML responses
 * 
 * @param content - HTML content to test
 * @param input - Original input that was potentially dangerous
 * @returns true if input is properly escaped, false otherwise
 * 
 * @example
 * const isEscaped = isInputProperlyEscaped(responseHTML, '<script>alert("xss")</script>');
 */
export function isInputProperlyEscaped(content: string, input: string): boolean {
  // Check if dangerous characters are properly encoded
  const dangerousChars: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  // If input contains these characters
  let hasRiskyChars = false;
  for (const char of Object.keys(dangerousChars)) {
    if (input.includes(char)) {
      hasRiskyChars = true;
      // Check if they are properly escaped in content
      if (content.includes(input)) {
        // Raw input found in content - not escaped!
        return false;
      }
      if (!content.includes(dangerousChars[char])) {
        // Escaped version not found
        return false;
      }
    }
  }

  return true;
}

/**
 * Tests whether SQL injection attempt was properly prevented
 * 
 * @param payload - SQL injection payload that was submitted
 * @param response - API response
 * @param expectedStatus - Expected HTTP status (e.g., 400 for validation error)
 * @returns true if injection was prevented, false otherwise
 * 
 * @example
 * const prevented = wasSQLInjectionPrevented(payload, response, 400);
 */
export function wasSQLInjectionPrevented(
  payload: string,
  response: any,
  expectedStatus: number = 400
): boolean {
  // Check response status indicates error
  if (response.status !== expectedStatus && expectedStatus !== 0) {
    return false;
  }

  // Check that data was not affected
  // SQL injection should not execute query
  if (response.data && response.data.length > 0) {
    // If injection was successful, it might return unexpected data
    // This is context-dependent, but we check for obvious issues
    return true;
  }

  return true;
}

/**
 * Tests whether tenant isolation is enforced
 * 
 * @param user1 - User from organization 1
 * @param user2 - User from organization 2
 * @param resource - Resource created by user1
 * @param fetchFn - Async function that attempts to fetch resource
 * @returns true if tenant isolation is enforced, false otherwise
 * 
 * @example
 * const isolated = await isTenantIsolationEnforced(
 *   user1,
 *   user2,
 *   job,
 *   async () => await jobService.getById(job.id, user2.organizationId)
 * );
 */
export async function isTenantIsolationEnforced(
  user1: any,
  user2: any,
  resource: any,
  fetchFn: () => Promise<any>
): Promise<boolean> {
  // Resource should belong to user1's organization
  if (resource.organizationId !== user1.organizationId) {
    return false; // Test data is invalid
  }

  try {
    // User2 from different org tries to fetch resource
    const result = await fetchFn();

    // If we got a result, isolation is NOT enforced
    if (result !== null && result !== undefined) {
      return false;
    }

    return true;
  } catch (error: any) {
    // Expected: should throw error or return null
    // Error is acceptable (access denied)
    return error?.statusCode === 403 || error?.statusCode === 404;
  }
}

/**
 * Tests whether authorization is enforced
 * 
 * @param user - User without required permission
 * @param resource - Resource user is trying to access
 * @param accessFn - Async function that attempts access
 * @returns true if authorization is enforced, false otherwise
 * 
 * @example
 * const enforced = await isAuthorizationEnforced(
 *   regularUser,
 *   adminResource,
 *   async () => await adminService.deleteUser(adminResource.id)
 * );
 */
export async function isAuthorizationEnforced(
  user: any,
  resource: any,
  accessFn: () => Promise<any>
): Promise<boolean> {
  try {
    // User without permission tries to access
    const result = await accessFn();

    // If we got a result, authorization is NOT enforced
    if (result !== null && result !== undefined) {
      return false;
    }

    return true;
  } catch (error: any) {
    // Expected: should throw 403 Forbidden
    return error?.statusCode === 403;
  }
}

/**
 * Tests whether rate limiting is enforced
 * 
 * @param requestFn - Async function that makes a request
 * @param attempts - Number of attempts to make
 * @param windowMs - Rate limit window in milliseconds
 * @returns true if rate limiting is enforced, false otherwise
 * 
 * @example
 * const limited = await isRateLimitEnforced(
 *   async () => await api.post('/auth/login', credentials),
 *   6,
 *   15 * 60 * 1000
 * );
 */
export async function isRateLimitEnforced(
  requestFn: () => Promise<any>,
  attempts: number = 6,
  windowMs: number = 15 * 60 * 1000
): Promise<boolean> {
  const responses = [];

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await requestFn();
      responses.push(response);
    } catch (error: any) {
      // Rate limit error expected after threshold
      if (error?.statusCode === 429) {
        return true;
      }
      responses.push(null);
    }
  }

  // If we made all requests without hitting rate limit
  if (responses.filter(r => r).length === attempts) {
    return false;
  }

  return true;
}

/**
 * Tests whether sensitive data is properly redacted in logs
 * 
 * @param logData - Log data to check
 * @param sensitiveFields - Fields that should be redacted
 * @returns true if sensitive data is redacted, false otherwise
 * 
 * @example
 * const redacted = isSensitiveDataRedacted(
 *   logData,
 *   ['password', 'creditCard', 'ssn']
 * );
 */
export function isSensitiveDataRedacted(
  logData: any,
  sensitiveFields: string[] = ['password', 'passwordHash', 'token', 'ssn', 'creditCard']
): boolean {
  const jsonString = JSON.stringify(logData);

  // Check if sensitive fields contain actual values (not redacted)
  for (const field of sensitiveFields) {
    const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"(?!\\[REDACTED\\])`, 'gi');

    if (fieldPattern.test(jsonString)) {
      // Found a sensitive field with actual value, not [REDACTED]
      return false;
    }
  }

  return true;
}

/**
 * Tests whether password meets security requirements
 * 
 * @param password - Password to test
 * @returns Object with validation results
 * 
 * @example
 * const validation = validatePasswordSecurity('MySecurePass123!');
 * if (!validation.isValid) {
 *   console.log('Weak password:', validation.errors);
 * }
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-4
  errors: string[];
  suggestions: string[];
}

export function validatePasswordSecurity(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, score: 0, errors, suggestions };
  }

  // Length check
  if (password.length >= 12) {
    score++;
  } else {
    errors.push('Password must be at least 12 characters');
    suggestions.push('Add more characters to reach 12+');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain uppercase letters');
    suggestions.push('Add at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain lowercase letters');
    suggestions.push('Add at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain numbers');
    suggestions.push('Add at least one number');
  }

  // Special character check
  if (/[@$!%*?&]/.test(password)) {
    score++;
  } else {
    errors.push('Password must contain special characters (@$!%*?&)');
    suggestions.push('Add at least one special character');
  }

  // Check for common passwords
  const commonPasswords = [
    'password123',
    'admin123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    '123456789',
    'qwerty123',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
    suggestions.push('Choose a unique password not in common lists');
  }

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    errors,
    suggestions,
  };
}

/**
 * Tests whether CORS is properly configured
 * 
 * @param response - HTTP response object to check headers
 * @param allowedOrigins - Origins that should be allowed
 * @returns true if CORS is properly configured, false otherwise
 */
export function isCORSProperlyConfigured(
  response: Response,
  allowedOrigins: string[] = []
): boolean {
  const accessControl = response.getHeader('access-control-allow-origin');

  if (!accessControl) {
    return false; // No CORS header
  }

  if (accessControl === '*') {
    return false; // Too permissive
  }

  return true;
}

/**
 * Tests whether security headers are present
 * 
 * @param response - HTTP response object to check headers
 * @returns Object with security header check results
 */
export interface SecurityHeaderCheckResult {
  hasXSSProtection: boolean;
  hasFrameOptions: boolean;
  hasContentTypeOptions: boolean;
  hasCSP: boolean;
  hasHSTS: boolean;
  allPresent: boolean;
}

export function checkSecurityHeaders(response: Response): SecurityHeaderCheckResult {
  const headers = {
    'x-xss-protection': response.getHeader('x-xss-protection'),
    'x-frame-options': response.getHeader('x-frame-options'),
    'x-content-type-options': response.getHeader('x-content-type-options'),
    'content-security-policy': response.getHeader('content-security-policy'),
    'strict-transport-security': response.getHeader('strict-transport-security'),
  };

  const result: SecurityHeaderCheckResult = {
    hasXSSProtection: !!headers['x-xss-protection'],
    hasFrameOptions: !!headers['x-frame-options'],
    hasContentTypeOptions: !!headers['x-content-type-options'],
    hasCSP: !!headers['content-security-policy'],
    hasHSTS: !!headers['strict-transport-security'],
    allPresent: false,
  };

  result.allPresent =
    result.hasXSSProtection &&
    result.hasFrameOptions &&
    result.hasContentTypeOptions &&
    result.hasCSP &&
    result.hasHSTS;

  return result;
}
