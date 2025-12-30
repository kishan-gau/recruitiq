/**
 * Feature Access API Routes (Tenant-facing)
 * 
 * API endpoints for tenant applications to check feature access
 * and view available features for their organization
 * 
 * Access: Requires authenticated tenant user
 * Security: Automatic organization isolation via req.user.organizationId
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import FeatureAccessService from '../services/FeatureAccessService.js';
import FeatureRepository from '../repositories/FeatureRepository.js';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.js';
import platformDb from '../shared/database/licenseManagerDb.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize services
const accessService = new FeatureAccessService();
const featureRepo = new FeatureRepository();
const grantRepo = new FeatureGrantRepository();

// All feature routes require authentication
router.use(authenticate);

/**
 * Helper function to get product ID from slug
 */
async function getProductId(productSlug) {
  try {
    const result = await platformDb.query(
      'SELECT id FROM products WHERE slug = $1',
      [productSlug]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Error getting product ID', { productSlug, error: error.message });
    return null;
  }
}

// ============================================================================
// FEATURE ACCESS CHECK
// ============================================================================

/**
 * GET /api/features/check
 * Check if current organization has access to a specific feature
 * 
 * Query params:
 * - productId or productSlug: Product identifier (required)
 * - featureKey: Feature key to check (required)
 */
router.get('/check', async (req, res) => {
  try {
    const { productSlug, productId: queryProductId, featureKey } = req.query;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    if (!featureKey) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Feature key is required'
      });
    }

    // Get product ID
    let productId = queryProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Valid product ID or slug is required'
      });
    }

    // Check feature access
    const result = await accessService.hasFeature(organizationId, productId, featureKey);

    // Return different response based on access
    if (result.hasAccess) {
      res.json({
        success: true,
        hasAccess: true,
        feature: {
          key: result.feature.featureKey,
          name: result.feature.featureName,
          description: result.feature.description,
          category: result.feature.category
        },
        grantedVia: result.grant.grantedVia,
        config: result.config,
        usage: result.usage
      });
    } else {
      res.json({
        success: true,
        hasAccess: false,
        reason: result.reason,
        message: accessService.getAccessDeniedMessage(result),
        feature: result.feature ? {
          key: result.feature.featureKey,
          name: result.feature.featureName,
          description: result.feature.description,
          minTier: result.feature.minTier,
          isAddOn: result.feature.isAddOn,
          pricing: result.feature.pricing
        } : null,
        upgradeRequired: result.reason === 'no_grant' && result.feature?.minTier
      });
    }
  } catch (error) {
    logger.error('Error checking feature access', {
      error: error.message,
      query: req.query,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check feature access'
    });
  }
});

/**
 * POST /api/features/check-multiple
 * Check access to multiple features at once
 * 
 * Body:
 * - productId or productSlug: Product identifier (required)
 * - featureKeys: Array of feature keys (required)
 */
router.post('/check-multiple', async (req, res) => {
  try {
    const { productSlug, productId: bodyProductId, featureKeys } = req.body;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    if (!featureKeys || !Array.isArray(featureKeys) || featureKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Feature keys array is required'
      });
    }

    // Get product ID
    let productId = bodyProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Valid product ID or slug is required'
      });
    }

    // Check each feature
    const results = {};
    for (const featureKey of featureKeys) {
      const result = await accessService.hasFeature(organizationId, productId, featureKey);
      results[featureKey] = {
        hasAccess: result.hasAccess,
        reason: result.reason,
        config: result.config,
        usage: result.usage
      };
    }

    res.json({
      success: true,
      features: results
    });
  } catch (error) {
    logger.error('Error checking multiple features', {
      error: error.message,
      body: req.body,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to check features'
    });
  }
});

// ============================================================================
// FEATURE CATALOG (Tenant View)
// ============================================================================

/**
 * GET /api/features
 * Get all available and unavailable features for current organization
 * 
 * Query params:
 * - productId or productSlug: Product identifier (required)
 */
router.get('/', async (req, res) => {
  try {
    const { productSlug, productId: queryProductId } = req.query;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    // Get product ID
    let productId = queryProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Valid product ID or slug is required'
      });
    }

    // Get all features for organization
    const result = await accessService.getOrganizationFeatures(organizationId, productId);

    res.json({
      success: true,
      features: result
    });
  } catch (error) {
    logger.error('Error getting organization features', {
      error: error.message,
      query: req.query,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get features'
    });
  }
});

/**
 * GET /api/features/my-grants
 * Get current organization's active feature grants
 * 
 * Query params:
 * - productId or productSlug: Filter by product (optional)
 */
router.get('/my-grants', async (req, res) => {
  try {
    const { productSlug, productId: queryProductId } = req.query;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    // Get product ID if filtering
    let productId = queryProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    // Get grants
    const filters = {
      isActive: true,
      notExpired: true
    };

    if (productId) {
      filters.productId = productId;
    }

    const grants = await grantRepo.findByOrganization(organizationId, filters);

    res.json({
      success: true,
      grants: grants.map(grant => ({
        id: grant.id,
        featureKey: grant.featureKey,
        featureName: grant.featureName,
        category: grant.category,
        grantedVia: grant.grantedVia,
        grantedAt: grant.grantedAt,
        expiresAt: grant.expiresAt,
        usage: grant.usageLimit !== null ? {
          current: grant.currentUsage,
          limit: grant.usageLimit,
          remaining: grant.remainingUsage
        } : null,
        config: grant.config
      }))
    });
  } catch (error) {
    logger.error('Error getting organization grants', {
      error: error.message,
      query: req.query,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get feature grants'
    });
  }
});

// ============================================================================
// SELF-SERVICE FEATURE REQUESTS
// ============================================================================

/**
 * POST /api/features/request-access
 * Request access to a feature (e.g., trial, upgrade)
 * 
 * Body:
 * - featureKey: Feature key (required)
 * - productId or productSlug: Product identifier (required)
 * - requestType: 'trial', 'upgrade', 'add_on' (required)
 * - reason: Request reason (optional)
 */
router.post('/request-access', async (req, res) => {
  try {
    const { featureKey, productSlug, productId: bodyProductId, requestType, reason } = req.body;
    const organizationId = req.user.organizationId;
    const userId = req.user.id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    if (!featureKey || !requestType) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Feature key and request type are required'
      });
    }

    // Get product ID
    let productId = bodyProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Valid product ID or slug is required'
      });
    }

    // Get feature
    const feature = await featureRepo.findByKey(productId, featureKey);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Feature not found'
      });
    }

    // Store request in database (you could create a feature_access_requests table)
    // For now, just log it
    logger.info('Feature access requested', {
      organizationId,
      userId,
      featureId: feature.id,
      featureKey,
      requestType,
      reason
    });

    // TODO: Implement actual request workflow
    // - Store in database
    // - Send notification to admins
    // - Auto-approve trials if configured
    // - Trigger upgrade flow if applicable

    res.json({
      success: true,
      message: 'Feature access request submitted successfully',
      request: {
        featureKey,
        featureName: feature.featureName,
        requestType,
        status: 'pending',
        submittedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error requesting feature access', {
      error: error.message,
      body: req.body,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to submit feature access request'
    });
  }
});

/**
 * GET /api/features/usage-summary
 * Get usage summary for features with limits
 */
router.get('/usage-summary', async (req, res) => {
  try {
    const { productSlug, productId: queryProductId } = req.query;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Organization ID not found in user context'
      });
    }

    // Get product ID if filtering
    let productId = queryProductId;
    if (!productId && productSlug) {
      productId = await getProductId(productSlug);
    }

    // Get grants with usage limits
    const filters = {
      isActive: true,
      notExpired: true
    };

    if (productId) {
      filters.productId = productId;
    }

    const grants = await grantRepo.findByOrganization(organizationId, filters);

    // Filter only those with usage limits
    const usageSummary = grants
      .filter(grant => grant.usageLimit !== null)
      .map(grant => ({
        featureKey: grant.featureKey,
        featureName: grant.featureName,
        usage: {
          current: grant.currentUsage,
          limit: grant.usageLimit,
          remaining: grant.usageLimit - grant.currentUsage,
          percentage: Math.round((grant.currentUsage / grant.usageLimit) * 100)
        },
        usageResetAt: grant.usageResetAt,
        status: grant.currentUsage >= grant.usageLimit ? 'exceeded' :
                grant.currentUsage >= grant.usageLimit * 0.8 ? 'warning' : 'ok'
      }));

    res.json({
      success: true,
      usageSummary
    });
  } catch (error) {
    logger.error('Error getting usage summary', {
      error: error.message,
      query: req.query,
      userId: req.user.id,
      organizationId: req.user.organizationId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get usage summary'
    });
  }
});

export default router;
