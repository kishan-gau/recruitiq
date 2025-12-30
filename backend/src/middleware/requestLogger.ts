import logger, { logPerformance } from '../utils/logger.ts';

/**
 * Enhanced request logging middleware with security and performance tracking
 * 
 * Features:
 * - Logs all incoming requests with context
 * - Tracks request duration and performance
 * - Includes request ID for tracing
 * - Redacts sensitive data automatically (via logger)
 * - Different log levels based on response status
 * - Performance monitoring for slow requests
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request (info level for non-sensitive paths)
  const shouldLogRequest = !req.path.includes('/health') || req.query.verbose === 'true';
  
  if (shouldLogRequest) {
    logger.info('Incoming request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      // Don't log body by default (may contain sensitive data)
      // Individual routes can log body if needed with redaction
    });
  }
  
  // Capture original res.json to log response size
  const originalJson = res.json.bind(res);
  let responseSize = 0;
  
  res.json = function(data) {
    responseSize = JSON.stringify(data).length;
    return originalJson(data);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      responseSize: responseSize > 0 ? `${Math.round(responseSize / 1024)}KB` : 'N/A',
      userId: req.user?.id,
    };
    
    // Log at appropriate level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else if (shouldLogRequest) {
      logger.info('Request completed', logData);
    }
    
    // Track slow requests (threshold: 3 seconds)
    if (duration > 3000) {
      logPerformance('HTTP Request', duration, {
        threshold: 3000,
        method: req.method,
        path: req.path,
        requestId: req.id,
      });
    }
  });
  
  next();
};

export default requestLogger;

