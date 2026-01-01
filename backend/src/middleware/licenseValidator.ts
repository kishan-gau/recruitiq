/**
 * License Validator Middleware
 * 
 * Validates tenant licenses against the Portal.
 * Runs on tenant VPS to verify license status before allowing operations.
 * 
 * This is part of the Tenant → Portal communication flow.
 */

import axios from 'axios';
import NodeCache from 'node-cache';

/**
 * Options for validateLicense middleware
 */
export interface ValidateLicenseOptions {
  /** Feature to validate (e.g., 'payroll', 'recruitment') */
  feature?: string;
  /** Action to validate (e.g., 'create', 'export') */
  action?: string;
  /** Fail closed if Portal unreachable (default: false) */
  strict?: boolean;
}

// License cache with 24 hour TTL
const licenseCache = new NodeCache({ 
  stdTTL: 86400, // 24 hours
  checkperiod: 3600 // Check for expired entries every hour
});

/**
 * Get cached license info
 * @param {string} licenseKey - License key
 * @returns {Object|null} Cached license info
 */
function getCachedLicense(licenseKey) {
  return licenseCache.get(licenseKey);
}

/**
 * Set cached license info
 * @param {string} licenseKey - License key
 * @param {Object} licenseInfo - License info to cache
 * @param {number} ttl - TTL in seconds (optional)
 */
function setCachedLicense(licenseKey, licenseInfo, ttl = 86400) {
  licenseCache.set(licenseKey, {
    ...licenseInfo,
    cachedAt: new Date().toISOString()
  }, ttl);
}

/**
 * Check if cached license is expired
 * @param {Object} cached - Cached license
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {boolean} True if expired
 */
function isCacheExpired(cached, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!cached || !cached.cachedAt) return true;
  const age = Date.now() - new Date(cached.cachedAt).getTime();
  return age > maxAgeMs;
}

/**
 * Validate license with Portal
 * @param {Object} params - Validation parameters
 * @returns {Promise<Object>} Validation result
 */
async function validateWithPortal(params) {
  const { licenseKey, organizationId, feature, action } = params;
  const portalUrl = process.env.PORTAL_API_URL || 'https://portal.recruitiq.nl';
  const tenantApiKey = process.env.TENANT_API_KEY;

  const response = await axios.post(
    `${portalUrl}/api/licenses/validate`,
    {
      licenseKey,
      organizationId,
      feature,
      action
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': tenantApiKey
      },
      timeout: 10000 // 10 second timeout
    }
  );

  return response.data;
}

/**
 * License validation middleware factory
 * Creates middleware that validates license for specific features/actions
 * 
 * @param {ValidateLicenseOptions} options - Middleware options
 * @returns {Function} Express middleware
 */
export function validateLicense(options: ValidateLicenseOptions = {}) {
  const { feature, action, strict = false } = options;

  return async function licenseValidatorMiddleware(req, res, next) {
    const licenseKey = process.env.LICENSE_KEY;
    const organizationId = req.user?.organizationId || process.env.ORGANIZATION_ID;

    if (!licenseKey) {
      console.error('[LicenseValidator] No LICENSE_KEY configured');
      return res.status(500).json({
        success: false,
        error: 'License configuration error',
        errorCode: 'LICENSE_NOT_CONFIGURED'
      });
    }

    try {
      // Try to validate with Portal
      const validationResult = await validateWithPortal({
        licenseKey,
        organizationId,
        feature: feature || req.feature,
        action: action || req.action
      });

      if (!validationResult.valid) {
        return res.status(403).json({
          success: false,
          error: 'License validation failed',
          errorCode: 'LICENSE_INVALID',
          details: validationResult.reason
        });
      }

      // Cache the successful validation
      setCachedLicense(licenseKey, validationResult);

      // Attach license info to request
      req.licenseInfo = validationResult;
      next();

    } catch (error) {
      console.error('[LicenseValidator] Portal validation failed:', error.message);

      // Fallback: Use locally cached license
      const cached = getCachedLicense(licenseKey);
      
      if (cached && !isCacheExpired(cached, 24 * 60 * 60 * 1000)) {
        console.log('[LicenseValidator] Using cached license (Portal unreachable)');
        req.licenseInfo = cached;
        req.licenseInfo.fromCache = true;
        return next();
      }

      // No valid cache available
      if (strict) {
        return res.status(503).json({
          success: false,
          error: 'License validation unavailable',
          errorCode: 'LICENSE_SERVICE_UNAVAILABLE',
          details: 'Portal is unreachable and no valid cached license available'
        });
      }

      // Non-strict mode: Allow with warning
      console.warn('[LicenseValidator] Allowing request without license validation (non-strict mode)');
      req.licenseInfo = { 
        valid: true, 
        unvalidated: true,
        reason: 'Portal unreachable'
      };
      next();
    }
  };
}

/**
 * Check if current license allows a specific feature
 * @param {string} feature - Feature to check
 * @returns {Function} Express middleware
 */
export function requireFeature(feature) {
  return async function featureCheckMiddleware(req, res, next) {
    // If license info already attached, check it
    if (req.licenseInfo) {
      const features = req.licenseInfo.features || [];
      if (!features.includes(feature) && !features.includes('all')) {
        return res.status(403).json({
          success: false,
          error: `Feature '${feature}' not included in license`,
          errorCode: 'FEATURE_NOT_LICENSED'
        });
      }
      return next();
    }

    // Otherwise, validate with the feature requirement
    return validateLicense({ feature })(req, res, next);
  };
}

/**
 * Check license usage limits
 * @param {string} limitType - Type of limit to check (e.g., 'users', 'jobs', 'candidates')
 * @param {Function} countFn - Function to get current count
 * @returns {Function} Express middleware
 */
export function checkLimit(limitType, countFn) {
  return async function limitCheckMiddleware(req, res, next) {
    const licenseKey = process.env.LICENSE_KEY;
    const cached = getCachedLicense(licenseKey);

    if (!cached || !cached.limits) {
      // Can't check limits, allow with warning
      console.warn(`[LicenseValidator] Cannot check ${limitType} limit - no cached license`);
      return next();
    }

    const limit = cached.limits[limitType];
    if (limit === null || limit === undefined) {
      // Unlimited
      return next();
    }

    try {
      const currentCount = await countFn(req);
      
      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          error: `License limit reached for ${limitType}`,
          errorCode: 'LICENSE_LIMIT_REACHED',
          details: {
            limitType,
            limit,
            current: currentCount
          }
        });
      }

      next();
    } catch (error) {
      console.error(`[LicenseValidator] Failed to check ${limitType} limit:`, error.message);
      // Allow on error to avoid blocking operations
      next();
    }
  };
}

/**
 * Simple license check middleware (no Portal call, just checks local cache/env)
 */
export function requireValidLicense(req, res, next) {
  const licenseKey = process.env.LICENSE_KEY;
  
  if (!licenseKey) {
    return res.status(500).json({
      success: false,
      error: 'License not configured',
      errorCode: 'LICENSE_NOT_CONFIGURED'
    });
  }

  const cached = getCachedLicense(licenseKey);
  
  if (cached && cached.valid && !isCacheExpired(cached)) {
    req.licenseInfo = cached;
    return next();
  }

  // If no cache, assume valid but mark for async validation
  req.licenseInfo = { valid: true, needsValidation: true };
  next();
}

/**
 * Get current license status
 * @returns {Object|null} Current license info from cache
 */
export function getCurrentLicense() {
  const licenseKey = process.env.LICENSE_KEY;
  return licenseKey ? getCachedLicense(licenseKey) : null;
}

/**
 * Force refresh license from Portal
 * @returns {Promise<Object>} Fresh license info
 */
export async function refreshLicense() {
  const licenseKey = process.env.LICENSE_KEY;
  const organizationId = process.env.ORGANIZATION_ID;

  if (!licenseKey) {
    throw new Error('License key not configured');
  }

  const result = await validateWithPortal({
    licenseKey,
    organizationId
  });

  if (result.valid) {
    setCachedLicense(licenseKey, result);
  }

  return result;
}

// Default export for backward compatibility
export default {
  validateLicense,
  requireFeature,
  checkLimit,
  requireValidLicense,
  getCurrentLicense,
  refreshLicense
};
