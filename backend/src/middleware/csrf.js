/**
 * CSRF Protection Middleware
 * 
 * Implements Cross-Site Request Forgery protection using industry-standard tokens.
 * 
 * Features:
 * - Double-submit cookie pattern
 * - Secure token generation
 * - Token validation on state-changing operations
 * - Works with SPA and traditional web apps
 * 
 * Security:
 * - Tokens are cryptographically random
 * - Tokens stored in HTTP-only cookies (defense in depth)
 * - SameSite cookie attribute as primary defense
 * - CSRF tokens as secondary defense layer
 */

import csrf from 'csurf';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Create CSRF protection middleware
 * Industry standard: Use double-submit cookie pattern with secure tokens
 */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true, // Cannot be accessed via JavaScript (XSS protection)
    secure: config.env === 'production', // HTTPS only in production
    sameSite: config.env === 'production' ? 'strict' : 'lax', // Primary CSRF defense
    signed: true, // Sign the cookie to prevent tampering
    key: '_csrf', // Cookie name
    path: '/', // Cookie path
    maxAge: 3600000, // 1 hour
  },
  // Ignore GET, HEAD, OPTIONS (safe methods per OWASP)
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Value function to extract token from request
  value: (req) => {
    // Check multiple sources for CSRF token (in order of preference)
    return (
      req.body?._csrf || // Body field
      req.query?._csrf || // Query parameter (not recommended but supported)
      req.headers['csrf-token'] || // Custom header
      req.headers['xsrf-token'] || // Alternative header name
      req.headers['x-csrf-token'] || // Standard header name
      req.headers['x-xsrf-token'] // Another common variant
    );
  },
});

/**
 * Middleware to apply CSRF protection to state-changing operations
 * GET, HEAD, OPTIONS are safe methods and don't require CSRF protection
 */
export function csrfMiddleware(req, res, next) {
  // Skip CSRF for safe HTTP methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints using Bearer token authentication
  // CSRF is primarily a concern for cookie-based authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Using JWT Bearer tokens - CSRF not applicable
    return next();
  }
  
  // Apply CSRF protection
  csrfProtection(req, res, (err) => {
    if (err) {
      logger.warn('CSRF validation failed', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        error: err.code,
        hasToken: !!(req.body?._csrf || req.headers['csrf-token']),
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token validation failed',
        code: 'CSRF_INVALID',
      });
    }
    
    next();
  });
}

/**
 * Endpoint to provide CSRF token to client
 * Client should call this before making state-changing requests
 */
export function getCsrfToken(req, res) {
  try {
    // Generate CSRF token
    csrfProtection(req, res, (err) => {
      if (err) {
        logger.error('Failed to generate CSRF token', { error: err.message });
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to generate CSRF token',
        });
      }
      
      // Return token to client
      res.json({
        csrfToken: req.csrfToken(),
        expiresIn: 3600, // seconds
      });
    });
  } catch (error) {
    logger.error('CSRF token generation error', {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate CSRF token',
    });
  }
}

/**
 * CSRF error handler
 * Provides detailed error messages in development, generic in production
 */
export function csrfErrorHandler(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  
  logger.warn('CSRF token validation failed', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });
  
  // Track security event
  if (req.user) {
    logger.logSecurityEvent('CSRF_VIOLATION', {
      userId: req.user.id,
      email: req.user.email,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
  }
  
  res.status(403).json({
    error: 'Forbidden',
    message: 'CSRF token validation failed. Please refresh the page and try again.',
    code: 'EBADCSRFTOKEN',
  });
}

/**
 * Helper to check if CSRF protection should be applied
 * Used for conditional CSRF protection based on route patterns
 */
export function shouldApplyCsrf(req) {
  // Apply CSRF to state-changing operations
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!stateChangingMethods.includes(req.method)) {
    return false;
  }
  
  // Skip CSRF for API endpoints using Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  // Skip CSRF for webhook endpoints
  if (req.path.includes('/webhook')) {
    return false;
  }
  
  // Apply CSRF for cookie-based authentication
  return true;
}

export default {
  csrfProtection,
  csrfMiddleware,
  getCsrfToken,
  csrfErrorHandler,
  shouldApplyCsrf,
};
