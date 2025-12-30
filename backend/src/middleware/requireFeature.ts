/**
 * Feature Access Middleware
 * Middleware factory functions for protecting routes with feature checks
 * 
 * This is the primary way to protect routes - more powerful than the old checkFeature.js
 * Uses the new Feature Management System with caching and proper access control
 */

import FeatureAccessService from '../services/FeatureAccessService.js';
import logger from '../utils/logger.js';
import { query } from '../config/database.js';

const accessService = new FeatureAccessService();

/**
 * Get product ID from product slug
 * @private
 */
async function getProductId(productSlug) {
  try {
    const result = await query(
      'SELECT id FROM products WHERE slug = $1',
      [productSlug],
      null,
      { operation: 'getProductId' }
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Error getting product ID', { productSlug, error: error.message });
    return null;
  }
}

/**
 * Middleware factory: Require a specific feature
 * 
 * Usage:
 *   router.post('/formulas/validate',
 *     authenticate,
 *     requireFeature('paylinq', 'advanced_formula_engine'),
 *     formulaController.validate
 *   );
 * 
 * @param {string} productSlug - Product slug (e.g., 'paylinq', 'recruitiq')
 * @param {string} featureKey - Feature key to check
 * @param {Object} options - Optional settings
 * @param {boolean} options.trackUsage - Track usage when accessed (default: true)
 * @param {number} options.usageAmount - Amount to increment usage by (default: 1)
 * @returns {Function} Express middleware function
 */
export function requireFeature(productSlug, featureKey, options = {}) {
  const { trackUsage = true, usageAmount = 1 } = options;

  return async (req, res, next) => {
    try {
      // Get organization ID from authenticated user
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this feature'
        });
      }

      // Get product ID
      const productId = await getProductId(productSlug);
      if (!productId) {
        logger.error('Product not found', { productSlug });
        return res.status(500).json({
          success: false,
          error: 'Configuration error',
          message: 'Product configuration not found'
        });
      }

      // Check feature access
      const result = await accessService.hasFeature(organizationId, productId, featureKey);

      if (!result.hasAccess) {
        logger.warn('Feature access denied', {
          organizationId,
          productSlug,
          featureKey,
          reason: result.reason,
          userId: req.user?.id,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'Feature not available',
          message: accessService.getAccessDeniedMessage(result),
          featureKey,
          reason: result.reason,
          feature: result.feature ? {
            name: result.feature.featureName,
            description: result.feature.description,
            minTier: result.feature.minTier,
            isAddOn: result.feature.isAddOn,
            pricing: result.feature.pricing
          } : null
        });
      }

      // Track usage if enabled
      if (trackUsage && result.grant?.usageLimit !== null) {
        // Track asynchronously - don't wait
        accessService.trackUsage(organizationId, featureKey, productId, usageAmount)
          .catch(err => {
            logger.error('Failed to track feature usage', {
              organizationId,
              featureKey,
              error: err.message
            });
          });
      }

      // Attach feature info to request for downstream use
      req.feature = {
        key: featureKey,
        name: result.feature.featureName,
        config: result.config,
        usage: result.usage,
        grant: result.grant
      };

      next();
    } catch (error) {
      logger.error('Error in requireFeature middleware', {
        productSlug,
        featureKey,
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check feature access'
      });
    }
  };
}

/**
 * Middleware factory: Require ANY of the specified features
 * Allows access if user has at least one of the features
 * 
 * Usage:
 *   router.get('/reports',
 *     requireAnyFeature('recruitiq', ['basic_reports', 'advanced_analytics'])
 *   );
 * 
 * @param {string} productSlug - Product slug
 * @param {Array<string>} featureKeys - Array of feature keys
 * @param {Object} options - Optional settings
 * @returns {Function} Express middleware function
 */
export function requireAnyFeature(productSlug, featureKeys, options = {}) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this feature'
        });
      }

      const productId = await getProductId(productSlug);
      if (!productId) {
        return res.status(500).json({
          success: false,
          error: 'Configuration error',
          message: 'Product configuration not found'
        });
      }

      // Check if organization has any of the features
      const result = await accessService.hasAnyFeature(organizationId, productId, featureKeys);

      if (!result.hasAccess) {
        logger.warn('Feature access denied (any)', {
          organizationId,
          productSlug,
          featureKeys,
          userId: req.user?.id,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'Feature not available',
          message: 'You need one of the following features to access this: ' + 
                   featureKeys.join(', '),
          requiredFeatures: featureKeys
        });
      }

      // Attach matched feature to request
      req.feature = {
        key: result.matchedFeature,
        name: result.result.feature.featureName,
        config: result.result.config,
        usage: result.result.usage
      };

      next();
    } catch (error) {
      logger.error('Error in requireAnyFeature middleware', {
        productSlug,
        featureKeys,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check feature access'
      });
    }
  };
}

/**
 * Middleware factory: Require ALL of the specified features
 * Only allows access if user has all features
 * 
 * Usage:
 *   router.post('/advanced-automation',
 *     requireAllFeatures('recruitiq', ['workflows', 'api_access', 'webhooks'])
 *   );
 * 
 * @param {string} productSlug - Product slug
 * @param {Array<string>} featureKeys - Array of feature keys
 * @param {Object} options - Optional settings
 * @returns {Function} Express middleware function
 */
export function requireAllFeatures(productSlug, featureKeys, options = {}) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this feature'
        });
      }

      const productId = await getProductId(productSlug);
      if (!productId) {
        return res.status(500).json({
          success: false,
          error: 'Configuration error',
          message: 'Product configuration not found'
        });
      }

      // Check if organization has all features
      const result = await accessService.hasAllFeatures(organizationId, productId, featureKeys);

      if (!result.hasAccess) {
        // Find which features are missing
        const missingFeatures = Object.entries(result.results)
          .filter(([key, res]) => !res.hasAccess)
          .map(([key]) => key);

        logger.warn('Feature access denied (all)', {
          organizationId,
          productSlug,
          featureKeys,
          missingFeatures,
          userId: req.user?.id,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'Missing required features',
          message: 'You need all of the following features to access this: ' + 
                   featureKeys.join(', '),
          requiredFeatures: featureKeys,
          missingFeatures
        });
      }

      // Attach all features to request
      req.features = Object.fromEntries(
        Object.entries(result.results).map(([key, res]) => [
          key,
          {
            name: res.feature.featureName,
            config: res.config,
            usage: res.usage
          }
        ])
      );

      next();
    } catch (error) {
      logger.error('Error in requireAllFeatures middleware', {
        productSlug,
        featureKeys,
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check feature access'
      });
    }
  };
}

/**
 * Middleware: Check feature access without blocking
 * Attaches feature availability to req.features but doesn't block request
 * Useful for conditional feature display
 * 
 * Usage:
 *   router.get('/dashboard',
 *     checkFeatureAvailability('recruitiq', ['advanced_analytics', 'custom_reports']),
 *     dashboardController.index
 *   );
 * 
 * @param {string} productSlug - Product slug
 * @param {Array<string>} featureKeys - Array of feature keys to check
 * @returns {Function} Express middleware function
 */
export function checkFeatureAvailability(productSlug, featureKeys) {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organizationId || req.organizationId;

      if (!organizationId) {
        req.features = {};
        return next();
      }

      const productId = await getProductId(productSlug);
      if (!productId) {
        req.features = {};
        return next();
      }

      // Check all features
      const features = {};
      for (const featureKey of featureKeys) {
        const result = await accessService.hasFeature(organizationId, productId, featureKey);
        features[featureKey] = {
          available: result.hasAccess,
          reason: result.reason,
          config: result.config,
          usage: result.usage
        };
      }

      req.features = features;
      next();
    } catch (error) {
      logger.error('Error in checkFeatureAvailability middleware', {
        productSlug,
        featureKeys,
        error: error.message
      });

      // Don't block on errors - just set empty features
      req.features = {};
      next();
    }
  };
}

/**
 * Middleware: Enforce usage limits (for rate-limited features)
 * Checks usage limits before allowing access
 * 
 * Usage:
 *   router.post('/api/calls',
 *     requireFeature('recruitiq', 'api_access'),
 *     enforceUsageLimit(),
 *     apiController.handleCall
 *   );
 * 
 * @returns {Function} Express middleware function
 */
export function enforceUsageLimit() {
  return async (req, res, next) => {
    try {
      // Feature info should be attached by requireFeature middleware
      if (!req.feature) {
        logger.warn('enforceUsageLimit called without requireFeature middleware');
        return next();
      }

      const { usage } = req.feature;

      if (!usage || usage.limit === null) {
        // No usage limit - allow
        return next();
      }

      if (usage.current >= usage.limit) {
        return res.status(429).json({
          success: false,
          error: 'Usage limit exceeded',
          message: `You have reached the ${usage.limit} usage limit for this feature`,
          usage: {
            current: usage.current,
            limit: usage.limit,
            remaining: 0
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Error in enforceUsageLimit middleware', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to check usage limits'
      });
    }
  };
}

// Export all middleware functions
export default {
  requireFeature,
  requireAnyFeature,
  requireAllFeatures,
  checkFeatureAvailability,
  enforceUsageLimit
};
