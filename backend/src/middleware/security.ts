/**
 * Security Headers Middleware
 * 
 * Implements security headers and protections for all API responses:
 * - X-Frame-Options: Prevents clickjacking attacks
 * - Content-Security-Policy: Restricts content sources
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-XSS-Protection: Browser XSS filtering
 * - Referrer-Policy: Controls referrer information
 * 
 * @module middleware/security
 */

import type { Request, Response, NextFunction } from 'express';
import config from '../config/index.ts';
import logger from '../utils/logger.ts';

/**
 * Adds security headers to all responses
 * 
 * Usage in Express app:
 * ```typescript
 * app.use(securityHeaders);
 * ```
 * 
 * Should be registered early in middleware stack (after morgan/logging)
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns void
 */
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent clickjacking attacks
  // DENY: Page cannot be displayed in a frame
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  // Browsers should respect the Content-Type header
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter in older browsers
  // mode=block: Stop page if XSS attack detected
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  // Restricts what content can be loaded and from where
  // This is a strict policy suitable for an API
  const csp = [
    "default-src 'none'", // Deny all by default
    "script-src 'self'", // Only self-hosted scripts
    "style-src 'self'", // Only self-hosted styles
    "img-src 'self' data: https:", // Images from self, data URIs, and HTTPS
    "font-src 'self' data:", // Fonts from self and data URIs
    "connect-src 'self'", // API calls only to same origin
    "frame-ancestors 'none'", // Cannot be framed
    "base-uri 'self'", // Base tag can only be self
    "form-action 'self'" // Forms can only POST to self
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Strict Transport Security
  // Force HTTPS for specified time period
  // maxAge: 2 years (63072000 seconds)
  if (config.env === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  // Referrer Policy
  // Controls what referrer information is shared when navigating away
  // no-referrer: Never share referrer information
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Permission Policy (formerly Feature Policy)
  // Disables potentially dangerous APIs
  const permissionPolicy = [
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', ');

  res.setHeader('Permissions-Policy', permissionPolicy);

  // Remove X-Powered-By header to avoid revealing technology stack
  res.removeHeader('X-Powered-By');

  // Remove Server header in production
  if (config.env === 'production') {
    res.removeHeader('Server');
  }

  logger.debug('Security headers applied', {
    path: req.path,
    method: req.method
  });

  next();
}

/**
 * Middleware factory for CORS configuration
 * 
 * Usage:
 * ```typescript
 * app.use(corsMiddleware());
 * ```
 * 
 * Allows requests from specified origins
 * 
 * @returns Express middleware function
 */
export function corsMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In production, configure specific allowed origins
    const allowedOrigins = config.env === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') ?? ['https://recruitiq.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

    const origin = req.headers.origin as string;

    // Only set CORS headers if origin is allowed
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }

    next();
  };
}

/**
 * Middleware to prevent parameter pollution attacks
 * 
 * Checks for duplicate parameters that could bypass validation
 * 
 * Usage:
 * ```typescript
 * app.use(preventParameterPollution);
 * ```
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns void
 */
export function preventParameterPollution(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for duplicate query parameters
  const queryParams = Object.keys(req.query);
  const queryString = new URLSearchParams(req.url.split('?')[1] || '');

  let hasDuplicates = false;

  for (const param of queryParams) {
    const count = (req.url.split(`${param}=`) || []).length - 1;
    if (count > 1) {
      hasDuplicates = true;
      logger.warn('Potential parameter pollution detected', {
        parameter: param,
        count,
        path: req.path,
        ip: req.ip
      });
    }
  }

  if (hasDuplicates) {
    // Allow request but log it as a potential security issue
    // In production, you might want to reject it
    if (config.env === 'production') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        errorCode: 'INVALID_PARAMETERS'
      });
    }
  }

  next();
}

/**
 * Middleware to rate limit requests
 * 
 * IMPORTANT: This is a basic implementation.
 * In production, use express-rate-limit package with Redis backend:
 * 
 * ```typescript
 * import rateLimit from 'express-rate-limit';
 * import RedisStore from 'rate-limit-redis';
 * 
 * const limiter = rateLimit({
 *   store: new RedisStore({
 *     client: redis,
 *     prefix: 'rate-limit:',
 *   }),
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 100,
 *   standardHeaders: true,
 *   legacyHeaders: false,
 * });
 * ```
 * 
 * Usage:
 * ```typescript
 * app.use(apiRateLimiter);
 * app.post('/auth/login', loginRateLimiter, login);
 * ```
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns void
 */
export function apiRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement with express-rate-limit and Redis
  // This is a placeholder that always allows requests
  // Real implementation should track requests per IP/user

  next();
}

/**
 * Strict rate limiter for authentication endpoints
 * 
 * More restrictive than general API rate limiter
 * 
 * Usage:
 * ```typescript
 * app.post('/auth/login', authRateLimiter, login);
 * app.post('/auth/register', authRateLimiter, register);
 * ```
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns void
 */
export function authRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // TODO: Implement with express-rate-limit
  // Should allow max 5 attempts per 15 minutes per IP
  // Stricter than general API rate limiter

  next();
}

/**
 * Middleware to sanitize request headers
 * 
 * Removes potentially dangerous headers and validates header sizes
 * 
 * Usage:
 * ```typescript
 * app.use(sanitizeHeaders);
 * ```
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns void
 */
export function sanitizeHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Remove potentially dangerous headers
  const dangerousHeaders = [
    'x-forwarded-host',
    'x-original-url',
    'x-rewrite-url'
  ];

  dangerousHeaders.forEach(header => {
    if (req.headers[header]) {
      logger.warn('Potentially dangerous header detected', {
        header,
        value: req.headers[header],
        ip: req.ip
      });
      delete req.headers[header];
    }
  });

  // Check header size (max 8KB is default)
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 8192) {
    logger.warn('Oversized headers detected', {
      size: headerSize,
      ip: req.ip
    });

    return res.status(431).json({
      success: false,
      error: 'Request headers too large',
      errorCode: 'REQUEST_HEADER_FIELDS_TOO_LARGE'
    });
  }

  next();
}

/**
 * Recommended middleware stack order for security:
 * 
 * ```typescript
 * // 1. Logging (morgan) - must come first to log all requests
 * app.use(morgan('combined'));
 * 
 * // 2. Security headers
 * app.use(securityHeaders);
 * 
 * // 3. CORS
 * app.use(corsMiddleware());
 * 
 * // 4. Request parsing
 * app.use(express.json({ limit: '10mb' }));
 * app.use(express.urlencoded({ limit: '10mb', extended: true }));
 * 
 * // 5. Header sanitization
 * app.use(sanitizeHeaders);
 * 
 * // 6. Parameter pollution prevention
 * app.use(preventParameterPollution);
 * 
 * // 7. Rate limiting
 * app.use(apiRateLimiter);
 * 
 * // 8. Authentication
 * // Applied on per-route basis
 * 
 * // 9. Routes
 * app.use('/api', apiRoutes);
 * 
 * // 10. Error handling
 * app.use(errorHandler); // MUST be last
 * ```
 */
