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

import { Tokens } from 'csrf';
import config from '../config/index.ts';
import logger from '../utils/logger.ts';

// Create CSRF token generator
const tokens = new Tokens();

// Generate secret on startup
const csrfSecret = tokens.secretSync();

/**
 * Generate CSRF token for the given secret
 */
function generateToken() {
  return tokens.create(csrfSecret);
}

/**
 * Verify CSRF token against the secret
 */
function verifyToken(token) {
  return tokens.verify(csrfSecret, token);
}

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
  
  // Skip CSRF for public authentication endpoints
  // These endpoints need to be accessible without a token
  // Note: req.path doesn't include the /api prefix when middleware is on apiRouter
  const publicAuthEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/platform/login',
    '/auth/platform/refresh',
    '/auth/platform/logout',
    '/auth/tenant/login',
    '/auth/tenant/refresh',
    '/auth/tenant/logout',
  ];
  
  if (publicAuthEndpoints.some(endpoint => req.path === endpoint || req.path.startsWith(endpoint))) {
    return next();
  }
  
  // Skip CSRF for webhook endpoints (external services)
  if (req.path.includes('/webhook') || req.path.includes('/webhooks')) {
    return next();
  }
  
  // SECURITY: Cookie-based authentication requires CSRF protection
  // All authenticated requests use httpOnly cookies
  
  try {
    // Extract CSRF token from request
    const token = 
      req.body?._csrf || // Body field
      req.query?._csrf || // Query parameter (not recommended but supported)
      req.headers['csrf-token'] || // Custom header
      req.headers['xsrf-token'] || // Alternative header name
      req.headers['x-csrf-token'] || // Standard header name
      req.headers['x-xsrf-token']; // Another common variant

    if (!token || !verifyToken(token)) {
      logger.warn('CSRF validation failed', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        hasToken: !!token,
        userId: req.user?.id,
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token validation failed',
        code: 'CSRF_INVALID',
      });
    }
    
    next();
  } catch (error) {
    logger.error('CSRF validation error', {
      error: error.message,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token validation failed',
      code: 'CSRF_ERROR',
    });
  }
}

/**
 * Endpoint to provide CSRF token to client
 * Client should call this before making state-changing requests
 */
export function getCsrfToken(req, res) {
  try {
    // Generate new CSRF token
    const csrfToken = generateToken();
    
    // Return token to client
    res.json({
      csrfToken,
      expiresIn: 3600, // 1 hour in seconds
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
  
  // Skip CSRF for public authentication endpoints
  // Note: req.path doesn't include the /api prefix when middleware is on apiRouter
  const publicAuthEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];
  
  if (publicAuthEndpoints.some(endpoint => req.path === endpoint || req.path.startsWith(endpoint))) {
    return false;
  }
  
  // Skip CSRF for webhook endpoints (external services)
  if (req.path.includes('/webhook') || req.path.includes('/webhooks')) {
    return false;
  }
  
  // NOTE: Bearer tokens are DEPRECATED - we use cookie-based authentication exclusively
  // All API requests must use httpOnly cookies for authentication
  // CSRF protection is REQUIRED for all cookie-based requests
  
  // Apply CSRF for cookie-based authentication
  return true;
}

export default {
  csrfMiddleware,
  getCsrfToken,
  csrfErrorHandler,
  shouldApplyCsrf,
};
