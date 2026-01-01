/**
 * Feature Check Middleware
 * Verifies if a specific feature is enabled for the user's organization/license
 */

import { query as dbQuery } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Middleware factory to check if a feature is enabled
 * @param {string} featureName - Name of the feature to check (e.g., 'mfa', 'sso', 'api')
 * @returns {Function} Express middleware function
 */
export const checkFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get user's organization
      const userResult = await dbQuery(
        'SELECT organization_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const organizationId = userResult.rows[0].organization_id;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: `Feature "${featureName}" requires an organization`,
          feature: featureName,
          available: false,
        });
      }

      // Get organization's tier and check if feature is enabled
      // Check in organizations table settings or via license
      const orgResult = await dbQuery(
        `SELECT o.tier, o.settings, l.features
         FROM organizations o
         LEFT JOIN (
           SELECT customer_id, features
           FROM licenses
           WHERE customer_id IN (
             SELECT id FROM customers WHERE organization_id = $1
           )
           AND status = 'active'
           AND expires_at > NOW()
           ORDER BY issued_at DESC
           LIMIT 1
         ) l ON l.customer_id = (
           SELECT id FROM customers WHERE organization_id = $1 LIMIT 1
         )
         WHERE o.id = $1`,
        [organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'organizations'
        }
      );

      if (orgResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found',
        });
      }

      const org = orgResult.rows[0];
      
      // Parse features from license
      let features = [];
      if (org.features) {
        features = typeof org.features === 'string' 
          ? JSON.parse(org.features) 
          : org.features;
      }

      // Check if feature is in the array
      const hasFeature = features.includes(featureName);

      if (!hasFeature) {
        logger.warn(`Feature check failed: ${featureName} not available for org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: `This feature is not available on your current plan`,
          feature: featureName,
          available: false,
          currentTier: org.tier,
          upgradeRequired: true,
        });
      }

      // Feature is available, continue to route handler
      req.organizationFeatures = features;
      req.hasFeature = (name) => features.includes(name);
      
      next();
    } catch (_error) {
      logger.error(`Feature check error for ${featureName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify feature availability',
      });
    }
  };
};

/**
 * Check multiple features (user must have ALL of them)
 */
export const checkFeatures = (featureNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get user's organization
      const userResult = await dbQuery(
        'SELECT organization_id FROM users WHERE id = $1',
        [userId],
        null,
        {
          operation: 'SELECT',
          table: 'users'
        }
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const organizationId = userResult.rows[0].organization_id;

      if (!organizationId) {
        return res.status(403).json({
          success: false,
          message: 'Features require an organization',
          available: false,
        });
      }

      // Get organization's features
      const orgResult = await dbQuery(
        `SELECT o.tier, l.features
         FROM organizations o
         LEFT JOIN (
           SELECT customer_id, features
           FROM licenses
           WHERE customer_id IN (
             SELECT id FROM customers WHERE organization_id = $1
           )
           AND status = 'active'
           AND expires_at > NOW()
           ORDER BY issued_at DESC
           LIMIT 1
         ) l ON l.customer_id = (
           SELECT id FROM customers WHERE organization_id = $1 LIMIT 1
         )
         WHERE o.id = $1`,
        [organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'organizations'
        }
      );

      if (orgResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found',
        });
      }

      const org = orgResult.rows[0];
      
      let features = [];
      if (org.features) {
        features = typeof org.features === 'string' 
          ? JSON.parse(org.features) 
          : org.features;
      }

      // Check if ALL required features are available
      const missingFeatures = featureNames.filter(name => !features.includes(name));

      if (missingFeatures.length > 0) {
        logger.warn(`Features check failed: Missing ${missingFeatures.join(', ')} for org ${organizationId}`);
        return res.status(403).json({
          success: false,
          message: `Required features not available on your current plan`,
          missingFeatures,
          currentTier: org.tier,
          upgradeRequired: true,
        });
      }

      // All features available
      req.organizationFeatures = features;
      req.hasFeature = (name) => features.includes(name);
      
      next();
    } catch (_error) {
      logger.error('Features check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify feature availability',
      });
    }
  };
};

export default checkFeature;
