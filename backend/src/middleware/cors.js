/**
 * Enhanced CORS Middleware
 * Implements strict CORS policies with whitelist validation
 */

import cors from 'cors';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Validate origin against whitelist
 * @param {string} origin - Origin to validate
 * @param {Function} callback - Callback function
 */
function validateOrigin(origin, callback) {
  const allowedOrigins = config.frontend.allowedOrigins;
  
  // Allow requests with no origin (like mobile apps, Postman, curl)
  if (!origin) {
    return callback(null, true);
  }
  
  // Check if origin is in whitelist
  if (allowedOrigins.includes(origin)) {
    logger.debug('CORS: Origin allowed', { origin });
    return callback(null, true);
  }
  
  // Check for wildcard patterns (e.g., *.example.com)
  const wildcardMatch = allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
  
  if (wildcardMatch) {
    logger.debug('CORS: Origin allowed (wildcard match)', { origin });
    return callback(null, true);
  }
  
  // Localhost patterns in development
  if (config.env === 'development') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      logger.debug('CORS: Origin allowed (localhost in dev)', { origin });
      return callback(null, true);
    }
  }
  
  // Origin not allowed
  logger.warn('CORS: Origin blocked', { 
    origin,
    allowedOrigins,
    env: config.env,
  });
  
  callback(new Error('Not allowed by CORS'));
}

/**
 * Get enhanced CORS configuration
 * @returns {object} CORS configuration
 */
export function getCorsConfig() {
  return {
    origin: validateOrigin,
    credentials: true, // Allow cookies and auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'Accept',
      'Accept-Language',
      'Content-Language',
      'X-CSRF-Token',
      'CSRF-Token',
      'XSRF-Token',
      'X-XSRF-Token',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Content-Range',
      'X-Total-Count',
    ],
    maxAge: 86400, // 24 hours - how long to cache preflight results
    preflightContinue: false,
    optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on 204
  };
}

/**
 * Enhanced CORS middleware with logging
 */
export function enhancedCorsMiddleware() {
  const corsConfig = getCorsConfig();
  
  logger.info('CORS initialized', {
    env: config.env,
    allowedOrigins: config.frontend.allowedOrigins,
    credentials: corsConfig.credentials,
  });
  
  return cors(corsConfig);
}

/**
 * Validate WebSocket origin
 * @param {string} origin - Origin to validate
 * @returns {boolean} True if origin is allowed
 */
export function validateWebSocketOrigin(origin) {
  if (!origin) {
    return config.env === 'development'; // Allow in dev only
  }
  
  const allowedOrigins = config.frontend.allowedOrigins;
  
  // Direct match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Wildcard match
  const wildcardMatch = allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
  
  if (wildcardMatch) {
    return true;
  }
  
  // Localhost in development
  if (config.env === 'development') {
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
    if (localhostPattern.test(origin)) {
      return true;
    }
  }
  
  logger.warn('WebSocket: Origin blocked', { origin });
  return false;
}

/**
 * CORS error handler
 */
export function corsErrorHandler(err, req, res, next) {
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS error', {
      origin: req.get('origin'),
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CORS policy violation: Origin not allowed',
    });
  }
  
  next(err);
}

/**
 * Preflight request handler (OPTIONS)
 * Ensures proper handling of CORS preflight
 */
export function handlePreflight() {
  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      logger.debug('Handling preflight request', {
        origin: req.get('origin'),
        path: req.path,
      });
      
      // CORS headers are already set by cors middleware
      return res.status(204).end();
    }
    next();
  };
}

/**
 * Middleware to log CORS requests
 */
export function logCorsRequests() {
  return (req, res, next) => {
    const origin = req.get('origin');
    
    if (origin && config.env === 'development') {
      logger.debug('CORS request', {
        method: req.method,
        path: req.path,
        origin,
        referer: req.get('referer'),
      });
    }
    
    next();
  };
}

export default {
  getCorsConfig,
  enhancedCorsMiddleware,
  validateWebSocketOrigin,
  corsErrorHandler,
  handlePreflight,
  logCorsRequests,
};
