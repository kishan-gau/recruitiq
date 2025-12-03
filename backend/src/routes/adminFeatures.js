/**
 * Feature Management Admin API Routes
 * 
 * API endpoints for platform administrators to manage features across all products
 * Includes feature CRUD, grant management, analytics, and rollout control
 * 
 * Access: Requires 'platform_admin' role or 'features.manage' permission
 * Security: All actions are audit logged
 */

import express from 'express';
import { authenticatePlatform, requirePlatformPermission } from '../middleware/auth.js';
import FeatureService from '../services/FeatureService.js';
import FeatureTierService from '../services/FeatureTierService.js';
import FeatureAccessService from '../services/FeatureAccessService.js';
import FeatureRepository from '../repositories/FeatureRepository.js';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Initialize services
const featureService = new FeatureService();
const tierService = new FeatureTierService();
const accessService = new FeatureAccessService();
const featureRepo = new FeatureRepository();
const grantRepo = new FeatureGrantRepository();

// All feature admin routes require platform user authentication
router.use(authenticatePlatform);

// ============================================================================
// FEATURE CATALOG MANAGEMENT
// ============================================================================

/**
 * POST /api/admin/features
 * Create a new feature
 */
router.post('/features', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const {
      productId,
      featureKey,
      featureName,
      description,
      category,
      status,
      minTier,
      isAddOn,
      pricing,
      requiredFeatures,
      conflictingFeatures,
      configSchema,
      defaultConfig,
      hasUsageLimit,
      defaultUsageLimit,
      usageLimitUnit,
      rolloutPercentage,
      targetOrganizations
    } = req.body;

    const feature = await featureService.createFeature({
      productId,
      featureKey,
      featureName,
      description,
      category,
      status,
      minTier,
      isAddOn,
      pricing,
      requiredFeatures,
      conflictingFeatures,
      configSchema,
      defaultConfig,
      hasUsageLimit,
      defaultUsageLimit,
      usageLimitUnit,
      rolloutPercentage,
      targetOrganizations
    }, req.user.id);

    logger.info('Feature created via admin API', {
      featureId: feature.id,
      featureKey: feature.featureKey,
      adminId: req.user.id
    });

    res.status(201).json({
      success: true,
      feature
    });
  } catch (error) {
    logger.error('Error creating feature', {
      error: error.message,
      body: req.body,
      adminId: req.user.id
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create feature'
    });
  }
});

/**
 * GET /api/admin/features
 * List all features with filtering and pagination
 */
router.get('/features', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const {
      productId,
      status,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await featureService.listFeatures(
      { productId, status, search },
      { limit: parseInt(limit), offset }
    );

    res.json({
      success: true,
      features: result.features,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: result.pages
      }
    });
  } catch (error) {
    logger.error('Error listing features', {
      error: error.message,
      query: req.query,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list features'
    });
  }
});

/**
 * GET /api/admin/features/:featureId
 * Get feature details
 */
router.get('/features/:featureId', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const { featureId } = req.params;

    const feature = await featureService.getFeature(featureId);

    res.json({
      success: true,
      feature
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    logger.error('Error getting feature', {
      error: error.message,
      featureId: req.params.featureId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get feature'
    });
  }
});

/**
 * PATCH /api/admin/features/:featureId
 * Update a feature
 */
router.patch('/features/:featureId', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { featureId } = req.params;
    const updateData = req.body;

    const feature = await featureService.updateFeature(featureId, updateData, req.user.id);

    logger.info('Feature updated via admin API', {
      featureId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      feature
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error updating feature', {
      error: error.message,
      featureId: req.params.featureId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update feature'
    });
  }
});

/**
 * POST /api/admin/features/:featureId/deprecate
 * Deprecate a feature
 */
router.post('/features/:featureId/deprecate', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { featureId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Deprecation message is required'
      });
    }

    const feature = await featureService.deprecateFeature(featureId, message, req.user.id);

    logger.info('Feature deprecated via admin API', {
      featureId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      feature
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error deprecating feature', {
      error: error.message,
      featureId: req.params.featureId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to deprecate feature'
    });
  }
});

/**
 * PATCH /api/admin/features/:featureId/rollout
 * Update feature rollout percentage
 */
router.patch('/features/:featureId/rollout', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { featureId } = req.params;
    const { percentage, targetOrganizations = [] } = req.body;

    if (percentage === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Rollout percentage is required'
      });
    }

    const feature = await featureService.updateRollout(featureId, percentage, targetOrganizations);

    logger.info('Feature rollout updated via admin API', {
      featureId,
      percentage,
      targetCount: targetOrganizations.length,
      adminId: req.user.id
    });

    res.json({
      success: true,
      feature
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error updating rollout', {
      error: error.message,
      featureId: req.params.featureId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update rollout'
    });
  }
});

// ============================================================================
// FEATURE GRANT MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/organizations/:organizationId/features
 * Get all feature grants for an organization
 */
router.get('/organizations/:organizationId/features', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { productId } = req.query;

    const filters = {};
    if (productId) filters.productId = productId;

    const grants = await grantRepo.findByOrganization(organizationId, filters);

    res.json({
      success: true,
      organizationId,
      features: grants
    });
  } catch (error) {
    logger.error('Error listing organization features', {
      error: error.message,
      organizationId: req.params.organizationId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list organization features'
    });
  }
});

/**
 * POST /api/admin/organizations/:organizationId/features/grant
 * Grant a feature to an organization
 */
router.post('/organizations/:organizationId/features/grant', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const {
      featureId,
      grantedVia = 'manual_grant',
      reason,
      expiresAt,
      usageLimit,
      config,
      billingStatus,
      subscriptionId
    } = req.body;

    if (!featureId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Feature ID is required'
      });
    }

    // Use appropriate service method based on grant type
    let grant;
    if (grantedVia === 'add_on_purchase') {
      grant = await tierService.grantAddon(organizationId, featureId, req.user.id, {
        reason,
        expiresAt,
        usageLimit,
        config,
        billingStatus,
        subscriptionId
      });
    } else if (grantedVia === 'trial') {
      const trialDays = req.body.trialDays || 30;
      grant = await tierService.grantTrial(organizationId, featureId, trialDays, req.user.id);
    } else {
      grant = await tierService.manualGrant(organizationId, featureId, req.user.id, {
        reason,
        expiresAt,
        usageLimit,
        config
      });
    }

    logger.info('Feature granted via admin API', {
      grantId: grant.id,
      organizationId,
      featureId,
      grantedVia,
      adminId: req.user.id
    });

    res.json({
      success: true,
      grant
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error granting feature', {
      error: error.message,
      organizationId: req.params.organizationId,
      body: req.body,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to grant feature'
    });
  }
});

/**
 * DELETE /api/admin/organizations/:organizationId/features/:grantId
 * Revoke a feature grant
 */
router.delete('/organizations/:organizationId/features/:grantId', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { grantId } = req.params;
    const { reason = 'Revoked by admin' } = req.body;

    const grant = await grantRepo.revoke(grantId, req.user.id, reason);

    if (!grant) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Feature grant not found'
      });
    }

    logger.info('Feature revoked via admin API', {
      grantId,
      organizationId: req.params.organizationId,
      reason,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Feature revoked successfully',
      grant
    });
  } catch (error) {
    logger.error('Error revoking feature', {
      error: error.message,
      grantId: req.params.grantId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to revoke feature'
    });
  }
});

/**
 * POST /api/admin/organizations/:organizationId/features/sync-tier
 * Sync features based on organization tier
 */
router.post('/organizations/:organizationId/features/sync-tier', requirePlatformPermission('features:manage'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { productId, tier } = req.body;

    if (!productId || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Product ID and tier are required'
      });
    }

    const changes = await tierService.syncTierFeatures(organizationId, productId, tier, req.user.id);

    logger.info('Tier features synced via admin API', {
      organizationId,
      productId,
      tier,
      added: changes.added.length,
      removed: changes.removed.length,
      adminId: req.user.id
    });

    res.json({
      success: true,
      changes: {
        added: changes.added.length,
        removed: changes.removed.length,
        unchanged: changes.unchanged,
        addedFeatures: changes.added,
        removedFeatures: changes.removed
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error syncing tier features', {
      error: error.message,
      organizationId: req.params.organizationId,
      body: req.body,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to sync tier features'
    });
  }
});

/**
 * POST /api/admin/organizations/:organizationId/features/preview-tier-change
 * Preview tier change impact
 */
router.post('/organizations/:organizationId/features/preview-tier-change', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { productId, currentTier, targetTier } = req.body;

    if (!productId || !currentTier || !targetTier) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Product ID, current tier, and target tier are required'
      });
    }

    const preview = await tierService.previewTierChange(organizationId, productId, currentTier, targetTier);

    res.json({
      success: true,
      preview
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    logger.error('Error previewing tier change', {
      error: error.message,
      organizationId: req.params.organizationId,
      body: req.body,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to preview tier change'
    });
  }
});

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * GET /api/admin/features/:featureId/analytics
 * Get feature usage analytics
 */
router.get('/features/:featureId/analytics', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const { featureId } = req.params;
    const { period = '30d' } = req.query;

    // Parse period (e.g., '7d', '30d', '90d')
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get feature details
    const feature = await featureRepo.findById(featureId);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Feature not found'
      });
    }

    // Get usage statistics
    const usageStats = await query(`
      SELECT 
        COUNT(DISTINCT organization_id) as unique_organizations,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(usage_count) as total_usage,
        DATE(created_at) as date,
        event_type
      FROM feature_usage_events
      WHERE feature_id = $1
        AND created_at >= $2
      GROUP BY DATE(created_at), event_type
      ORDER BY date DESC
    `, [featureId, startDate]);

    // Get active grants count
    const grantsStats = await query(`
      SELECT 
        COUNT(*) as active_grants,
        granted_via,
        COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at > NOW()) as expiring_soon_count
      FROM organization_feature_grants
      WHERE feature_id = $1
        AND is_active = TRUE
      GROUP BY granted_via
    `, [featureId]);

    res.json({
      success: true,
      feature: {
        id: feature.id,
        featureKey: feature.featureKey,
        featureName: feature.featureName
      },
      analytics: {
        period: `${days}d`,
        startDate,
        usageByDay: usageStats.rows,
        grants: grantsStats.rows,
        summary: {
          totalUsage: usageStats.rows.reduce((sum, row) => sum + parseInt(row.total_usage || 0), 0),
          uniqueOrganizations: Math.max(...usageStats.rows.map(r => parseInt(r.unique_organizations || 0)), 0),
          uniqueUsers: Math.max(...usageStats.rows.map(r => parseInt(r.unique_users || 0)), 0)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting feature analytics', {
      error: error.message,
      featureId: req.params.featureId,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get feature analytics'
    });
  }
});

/**
 * GET /api/admin/features/adoption-report
 * Get feature adoption report across all organizations
 */
router.get('/features/adoption-report', requirePlatformPermission('features:view'), async (req, res) => {
  try {
    const { productId } = req.query;

    let productFilter = '';
    const params = [];
    
    if (productId) {
      productFilter = 'WHERE f.product_id = $1';
      params.push(productId);
    }

    const report = await query(`
      SELECT 
        f.id,
        f.feature_key,
        f.feature_name,
        f.product_id,
        p.name as product_name,
        f.status,
        f.min_tier,
        f.is_add_on,
        COUNT(DISTINCT ofg.organization_id) FILTER (WHERE ofg.is_active = TRUE) as organizations_using,
        COUNT(DISTINCT o.id) as total_organizations,
        ROUND(
          (COUNT(DISTINCT ofg.organization_id) FILTER (WHERE ofg.is_active = TRUE)::DECIMAL / 
           NULLIF(COUNT(DISTINCT o.id), 0)) * 100, 
          2
        ) as adoption_rate
      FROM features f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN organization_feature_grants ofg ON f.id = ofg.feature_id
      LEFT JOIN organizations o ON o.id IS NOT NULL
      ${productFilter}
      GROUP BY f.id, f.feature_key, f.feature_name, f.product_id, p.name, f.status, f.min_tier, f.is_add_on
      ORDER BY adoption_rate DESC, f.feature_name
    `, params);

    res.json({
      success: true,
      report: {
        productId: productId || 'all',
        features: report.rows.map(row => ({
          id: row.id,
          featureKey: row.feature_key,
          featureName: row.feature_name,
          productName: row.product_name,
          status: row.status,
          minTier: row.min_tier,
          isAddOn: row.is_add_on,
          organizationsUsing: parseInt(row.organizations_using),
          totalOrganizations: parseInt(row.total_organizations),
          adoptionRate: parseFloat(row.adoption_rate)
        }))
      }
    });
  } catch (error) {
    logger.error('Error generating adoption report', {
      error: error.message,
      query: req.query,
      adminId: req.user.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate adoption report'
    });
  }
});

export default router;
