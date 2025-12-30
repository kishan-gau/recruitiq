import { generateRequestId } from '../utils/logger.js';

/**
 * Middleware to add unique request ID to each request
 * Enables request tracing across logs and helps with debugging
 * 
 * Features:
 * - Generates unique ID for each request
 * - Accepts X-Request-ID header if provided (useful for distributed tracing)
 * - Adds ID to request object and response headers
 * - Enables correlation of logs across services
 */
export function requestIdMiddleware(req, res, next) {
  // Check if request already has an ID from upstream service
  const existingId = req.get('X-Request-ID') || req.get('X-Correlation-ID');
  
  // Use existing ID or generate new one
  req.id = existingId || generateRequestId();
  
  // Add to response headers for client-side tracing
  res.set('X-Request-ID', req.id);
  
  next();
}

export default requestIdMiddleware;
