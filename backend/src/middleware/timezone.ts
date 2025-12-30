/**
 * Timezone Middleware
 * 
 * Extracts and validates timezone information from requests
 * Makes timezone available to all route handlers
 * 
 * Architecture:
 * 1. Check for timezone in request header (X-Timezone)
 * 2. Fall back to user's saved timezone preference
 * 3. Fall back to organization's timezone
 * 4. Fall back to UTC
 */

import { isValidTimezone, DEFAULT_TIMEZONE } from '../utils/timezone.ts';
import logger from '../utils/logger.ts';

/**
 * Timezone middleware
 * Attaches timezone context to request object
 */
export function timezoneMiddleware(req, res, next) {
  try {
    let timezone = DEFAULT_TIMEZONE;
    
    // 1. Check request header
    const headerTimezone = req.headers['x-timezone'] || req.headers['timezone'];
    if (headerTimezone && isValidTimezone(headerTimezone)) {
      timezone = headerTimezone;
      req.timezoneSource = 'header';
    }
    
    // 2. Check authenticated user's timezone preference
    else if (req.user?.timezone && isValidTimezone(req.user.timezone)) {
      timezone = req.user.timezone;
      req.timezoneSource = 'user';
    }
    
    // 3. Check organization's timezone
    else if (req.organization?.timezone && isValidTimezone(req.organization.timezone)) {
      timezone = req.organization.timezone;
      req.timezoneSource = 'organization';
    }
    
    // 4. Fall back to UTC
    else {
      timezone = DEFAULT_TIMEZONE;
      req.timezoneSource = 'default';
    }
    
    // Attach timezone to request
    req.timezone = timezone;
    
    // Log timezone usage for debugging (only in development)
    if (process.env.NODE_ENV === 'development' && req.path !== '/health') {
      logger.debug('Timezone context', {
        path: req.path,
        timezone,
        source: req.timezoneSource,
        userId: req.user?.id,
        organizationId: req.organization?.id
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error in timezone middleware', {
      error: error.message,
      stack: error.stack
    });
    
    // Don't fail the request, just use UTC
    req.timezone = DEFAULT_TIMEZONE;
    req.timezoneSource = 'error-fallback';
    next();
  }
}

/**
 * Get timezone from request
 * Helper function for route handlers
 * 
 * @param {object} req - Express request object
 * @returns {string} IANA timezone identifier
 */
export function getRequestTimezone(req) {
  return req.timezone || DEFAULT_TIMEZONE;
}

/**
 * Add timezone context to response headers
 * Useful for clients to know what timezone was used for processing
 */
export function addTimezoneHeaders(req, res) {
  if (req.timezone) {
    res.setHeader('X-Timezone', req.timezone);
    res.setHeader('X-Timezone-Source', req.timezoneSource || 'unknown');
  }
}

/**
 * Middleware to add timezone headers to all responses
 */
export function timezoneHeaderMiddleware(req, res, next) {
  // Wrap res.json to add timezone headers before sending
  const originalJson = res.json;
  
  res.json = function(data) {
    addTimezoneHeaders(req, res);
    return originalJson.call(this, data);
  };
  
  next();
}

export default timezoneMiddleware;
