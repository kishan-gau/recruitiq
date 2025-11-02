/**
 * Enhanced Security Headers Middleware
 * Implements comprehensive security headers beyond Helmet defaults
 */

import helmet from 'helmet';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Get comprehensive Helmet configuration
 * @returns {object} Helmet configuration object
 */
export function getHelmetConfig() {
  const isProd = config.env === 'production';
  
  return {
    // Content Security Policy
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        blockAllMixedContent: [],
        fontSrc: ["'self'", 'https:', 'data:'],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"], // unsafe-inline for legacy support
        upgradeInsecureRequests: [],
        workerSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", ...config.frontend.allowedOrigins],
        manifestSrc: ["'self'"],
        mediaSrc: ["'self'", 'https:'],
        formAction: ["'self'"],
      },
      reportOnly: false, // Set to true during testing
    } : false, // Disable in development for easier debugging
    
    // Cross-Origin Policies
    crossOriginEmbedderPolicy: isProd ? { policy: 'require-corp' } : false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    
    // Expect-CT (deprecated but still useful)
    expectCt: isProd ? {
      maxAge: 86400,
      enforce: true,
    } : false,
    
    // Frame Options
    frameguard: { action: 'deny' }, // Prevent clickjacking
    
    // Hide Powered By
    hidePoweredBy: true,
    
    // HSTS (HTTP Strict Transport Security)
    hsts: isProd ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    
    // IE No Open
    ieNoOpen: true,
    
    // No Sniff
    noSniff: true, // Prevent MIME type sniffing
    
    // Origin Agent Cluster
    originAgentCluster: true,
    
    // Permitted Cross-Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    
    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    
    // XSS Filter (legacy but still useful)
    xssFilter: true,
  };
}

/**
 * Additional custom security headers
 */
export function additionalSecurityHeaders() {
  return (req, res, next) => {
    // X-Content-Type-Options (already set by Helmet but ensuring it)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options (already set by Helmet but ensuring it)
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection (legacy but still useful for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // X-Download-Options (IE specific)
    res.setHeader('X-Download-Options', 'noopen');
    
    // Permissions-Policy (formerly Feature-Policy)
    const permissionsPolicy = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'encrypted-media=()',
      'picture-in-picture=()',
    ].join(', ');
    res.setHeader('Permissions-Policy', permissionsPolicy);
    
    // Clear-Site-Data header for logout (will be set in specific routes)
    // res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    
    // X-Request-ID (for tracking requests)
    if (!req.headers['x-request-id']) {
      req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.setHeader('X-Request-ID', req.id);
    } else {
      req.id = req.headers['x-request-id'];
      res.setHeader('X-Request-ID', req.id);
    }
    
    // Server header (hide server information)
    res.removeHeader('X-Powered-By');
    
    next();
  };
}

/**
 * Enhanced Helmet middleware with logging
 */
export function enhancedHelmetMiddleware() {
  const helmetConfig = getHelmetConfig();
  
  logger.info('Security headers initialized', {
    env: config.env,
    csp: !!helmetConfig.contentSecurityPolicy,
    hsts: !!helmetConfig.hsts,
  });
  
  return helmet(helmetConfig);
}

export default {
  getHelmetConfig,
  additionalSecurityHeaders,
  enhancedHelmetMiddleware,
};
