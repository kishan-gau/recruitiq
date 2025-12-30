/**
 * Security Monitoring Middleware
 * 
 * Integrates security monitoring into the request/response cycle.
 */

import securityMonitor, { SecurityEventType } from '../services/securityMonitor.ts';
import logger from '../utils/logger.ts';

/**
 * Track failed login attempts
 * 
 * @param {Object} req - Express request
 * @param {Object} user - User data (if available)
 */
export function trackFailedLogin(req, user = {}) {
  securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
    ip: req.ip || req.connection.remoteAddress,
    username: user.email || user.username || req.body.email || req.body.username,
    userAgent: req.get('user-agent'),
    endpoint: req.path,
    method: req.method,
  });
}

/**
 * Track successful login
 * 
 * @param {Object} req - Express request
 * @param {Object} user - User data
 */
export function trackSuccessfulLogin(req, user) {
  // Check for suspicious login patterns
  const suspicious = detectSuspiciousLogin(req, user);
  
  if (suspicious) {
    securityMonitor.trackEvent(SecurityEventType.SUSPICIOUS_LOGIN, {
      ip: req.ip,
      userId: user.id,
      username: user.email || user.username,
      userAgent: req.get('user-agent'),
      reason: suspicious.reason,
    });
  }
}

/**
 * Detect suspicious login patterns
 * 
 * @param {Object} req - Express request
 * @param {Object} user - User data
 * @returns {Object|null} Suspicious pattern details or null
 */
function detectSuspiciousLogin(req, user) {
  // Check for unusual time (simplified - would use user's typical login times)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    return {
      reason: 'Login during unusual hours',
      hour,
    };
  }
  
  // Check for unusual user agent changes
  // This would require storing and comparing previous user agents
  
  return null;
}

/**
 * Track unauthorized access attempts
 * 
 * @param {Object} req - Express request
 * @param {string} resource - Resource being accessed
 */
export function trackUnauthorizedAccess(req, resource) {
  securityMonitor.trackEvent(SecurityEventType.UNAUTHORIZED_ACCESS, {
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.email || req.user?.username,
    resource,
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
  });
}

/**
 * Track forbidden resource access
 * 
 * @param {Object} req - Express request
 * @param {string} resource - Resource being accessed
 * @param {string} requiredRole - Required role for access
 */
export function trackForbiddenAccess(req, resource, requiredRole) {
  securityMonitor.trackEvent(SecurityEventType.FORBIDDEN_RESOURCE, {
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.email || req.user?.username,
    userRole: req.user?.role,
    requiredRole,
    resource,
    endpoint: req.path,
    method: req.method,
  });
}

/**
 * Track rate limit exceeded
 * 
 * @param {Object} req - Express request
 */
export function trackRateLimitExceeded(req) {
  securityMonitor.trackEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
    ip: req.ip,
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('user-agent'),
  });
}

/**
 * Track SQL injection attempt
 * 
 * @param {Object} req - Express request
 * @param {string} suspiciousInput - The suspicious input
 */
export function trackSQLInjectionAttempt(req, suspiciousInput) {
  securityMonitor.trackEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
    ip: req.ip,
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    suspiciousInput: suspiciousInput.substring(0, 100), // Limit length
    userAgent: req.get('user-agent'),
  });
}

/**
 * Track XSS attempt
 * 
 * @param {Object} req - Express request
 * @param {string} suspiciousInput - The suspicious input
 */
export function trackXSSAttempt(req, suspiciousInput) {
  securityMonitor.trackEvent(SecurityEventType.XSS_ATTEMPT, {
    ip: req.ip,
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    suspiciousInput: suspiciousInput.substring(0, 100),
    userAgent: req.get('user-agent'),
  });
}

/**
 * Track malicious file upload
 * 
 * @param {Object} req - Express request
 * @param {Object} file - File details
 * @param {string} threat - Threat description
 */
export function trackMaliciousUpload(req, file, threat) {
  securityMonitor.trackEvent(SecurityEventType.MALICIOUS_FILE_UPLOAD, {
    ip: req.ip,
    userId: req.user?.id,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    threat,
    endpoint: req.path,
  });
}

/**
 * Track sensitive data access
 * 
 * @param {Object} req - Express request
 * @param {string} dataType - Type of sensitive data
 * @param {string} recordId - Record identifier
 */
export function trackSensitiveDataAccess(req, dataType, recordId) {
  securityMonitor.trackEvent(SecurityEventType.SENSITIVE_DATA_ACCESS, {
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.email || req.user?.username,
    dataType,
    recordId,
    endpoint: req.path,
    method: req.method,
  });
}

/**
 * Track bulk data export
 * 
 * @param {Object} req - Express request
 * @param {number} recordCount - Number of records exported
 * @param {string} dataType - Type of data exported
 */
export function trackBulkExport(req, recordCount, dataType) {
  securityMonitor.trackEvent(SecurityEventType.BULK_DATA_EXPORT, {
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.email || req.user?.username,
    recordCount,
    dataType,
    endpoint: req.path,
    method: req.method,
  });
}

/**
 * Track configuration change
 * 
 * @param {Object} req - Express request
 * @param {string} configKey - Configuration key changed
 * @param {*} oldValue - Old value (will be redacted if sensitive)
 * @param {*} newValue - New value (will be redacted if sensitive)
 */
export function trackConfigChange(req, configKey, oldValue, newValue) {
  securityMonitor.trackEvent(SecurityEventType.CONFIG_CHANGED, {
    ip: req.ip,
    userId: req.user?.id,
    username: req.user?.email || req.user?.username,
    configKey,
    // Don't log actual values for sensitive config
    changedAt: new Date(),
  });
}

/**
 * Middleware to monitor security events in request pipeline
 */
export function securityMonitoringMiddleware() {
  return (req, res, next) => {
    // Track request start time
    req.securityMonitorStart = Date.now();
    
    // Detect potential attack patterns in request
    detectAttackPatterns(req);
    
    // Continue to next middleware
    next();
  };
}

/**
 * Detect attack patterns in request
 * 
 * @param {Object} req - Express request
 */
function detectAttackPatterns(req) {
  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(['"].*OR.*['"].*=.*['"])/i,
  ];
  
  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe[^>]*>/i,
  ];
  
  // Check all input sources
  const inputs = [
    ...Object.values(req.query || {}),
    ...Object.values(req.body || {}),
    ...Object.values(req.params || {}),
  ];
  
  for (const input of inputs) {
    if (typeof input !== 'string') continue;
    
    // Check SQL injection
    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        trackSQLInjectionAttempt(req, input);
        break;
      }
    }
    
    // Check XSS
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        trackXSSAttempt(req, input);
        break;
      }
    }
  }
}

/**
 * Get security monitoring metrics
 * 
 * @returns {Object} Security metrics
 */
export function getSecurityMetrics() {
  return securityMonitor.getMetrics();
}

/**
 * Get security monitoring health status
 * 
 * @returns {Object} Health status
 */
export function getSecurityMonitoringHealth() {
  return securityMonitor.healthCheck();
}

/**
 * Reset security monitoring (for testing)
 */
export function resetSecurityMonitoring() {
  securityMonitor.reset();
}

export default {
  trackFailedLogin,
  trackSuccessfulLogin,
  trackUnauthorizedAccess,
  trackForbiddenAccess,
  trackRateLimitExceeded,
  trackSQLInjectionAttempt,
  trackXSSAttempt,
  trackMaliciousUpload,
  trackSensitiveDataAccess,
  trackBulkExport,
  trackConfigChange,
  securityMonitoringMiddleware,
  getSecurityMetrics,
  getSecurityMonitoringHealth,
  resetSecurityMonitoring,
};
