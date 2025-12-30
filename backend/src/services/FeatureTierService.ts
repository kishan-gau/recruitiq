/**
 * FeatureTierService - Manages tier-based feature grants
 * Handles automatic feature granting/revoking when organizations change tiers
 * 
 * This service syncs features when:
 * - Organization upgrades/downgrades tier
 * - Tier feature configuration changes
 * - Manual tier sync is requested
 */

import FeatureRepository from '../repositories/FeatureRepository.js';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.js';
import FeatureAccessService from './FeatureAccessService.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

export class FeatureTierService {
  constructor() {
    this.featureRepo = new FeatureRepository();
    this.grantRepo = new FeatureGrantRepository();
    this.accessService = new FeatureAccessService();
    this.logger = logger;
  }

  /**
   * Get all features included in a tier
   * @param {string} productId - Product ID
   * @param {string} tier - Tier name (starter, professional, enterprise)
   * @returns {Promise<Array>} Array of features
   */
  async getTierFeatures(productId, tier) {
    try {
      const validTiers = ['starter', 'professional', 'enterprise'];
      if (!validTiers.includes(tier)) {
        throw new ValidationError(`Invalid tier: ${tier}`);
      }

      // Get all features for the product that are included in this tier
      const features = await this.featureRepo.findByProduct(productId, {
        status: 'stable',
        isAddOn: false
      });

      // Filter by tier hierarchy: enterprise > professional > starter
      const tierHierarchy = {
        starter: ['starter'],
        professional: ['starter', 'professional'],
        enterprise: ['starter', 'professional', 'enterprise']
      };

      const includedTiers = tierHierarchy[tier];

      return features.filter(f => 
        f.minTier && includedTiers.includes(f.minTier)
      );
    } catch (error) {
      this.logger.error('Error getting tier features', {
        productId,
        tier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync organization features based on their current tier
   * Grants tier-included features and revokes features no longer in tier
   * 
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {string} newTier - New tier
   * @param {string} syncedBy - User ID performing the sync
   * @returns {Promise<Object>} { added: [], removed: [], unchanged: [] }
   */
  async syncTierFeatures(organizationId, productId, newTier, syncedBy) {
    try {
      // Get features that should be in the new tier
      const tierFeatures = await this.getTierFeatures(productId, newTier);
      const tierFeatureIds = tierFeatures.map(f => f.id);

      // Get current grants for this organization
      const currentGrants = await this.grantRepo.findByOrganization(organizationId, {
        productId,
        isActive: true
      });

      // Filter only tier-included grants (not add-ons, manual grants, etc.)
      const tierGrants = currentGrants.filter(g => g.grantedVia === 'tier_included');
      const currentTierFeatureIds = tierGrants.map(g => g.featureId);

      // Determine what to add and remove
      const toAdd = tierFeatureIds.filter(id => !currentTierFeatureIds.includes(id));
      const toRemove = tierGrants
        .filter(g => !tierFeatureIds.includes(g.featureId))
        .map(g => g.featureId);

      const result = {
        added: [],
        removed: [],
        unchanged: tierGrants.length - toRemove.length
      };

      // Grant new features
      if (toAdd.length > 0) {
        const granted = await this.grantRepo.bulkGrant(
          organizationId,
          toAdd,
          'tier_included',
          syncedBy
        );
        result.added = granted.map(g => ({
          featureId: g.featureId,
          featureKey: g.featureKey,
          featureName: g.featureName
        }));
      }

      // Revoke removed features
      if (toRemove.length > 0) {
        const revokedCount = await this.grantRepo.bulkRevoke(
          organizationId,
          toRemove,
          syncedBy,
          `Tier changed to ${newTier}`
        );

        // Get names of revoked features
        const revokedFeatures = tierGrants
          .filter(g => toRemove.includes(g.featureId))
          .map(g => ({
            featureId: g.featureId,
            featureKey: g.featureKey,
            featureName: g.featureName
          }));

        result.removed = revokedFeatures;
      }

      // Invalidate cache for this organization
      this.accessService.invalidateOrganizationCache(organizationId);

      this.logger.info('Tier features synced', {
        organizationId,
        productId,
        newTier,
        added: result.added.length,
        removed: result.removed.length,
        unchanged: result.unchanged
      });

      return result;
    } catch (error) {
      this.logger.error('Error syncing tier features', {
        organizationId,
        productId,
        newTier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Preview tier change - show what features would be added/removed
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {string} currentTier - Current tier
   * @param {string} targetTier - Target tier
   * @returns {Promise<Object>} { addedFeatures: [], removedFeatures: [], unchangedCount: number }
   */
  async previewTierChange(organizationId, productId, currentTier, targetTier) {
    try {
      const currentFeatures = await this.getTierFeatures(productId, currentTier);
      const targetFeatures = await this.getTierFeatures(productId, targetTier);

      const currentFeatureKeys = new Set(currentFeatures.map(f => f.featureKey));
      const targetFeatureKeys = new Set(targetFeatures.map(f => f.featureKey));

      const addedFeatures = targetFeatures.filter(
        f => !currentFeatureKeys.has(f.featureKey)
      ).map(f => ({
        key: f.featureKey,
        name: f.featureName,
        description: f.description,
        category: f.category
      }));

      const removedFeatures = currentFeatures.filter(
        f => !targetFeatureKeys.has(f.featureKey)
      ).map(f => ({
        key: f.featureKey,
        name: f.featureName,
        description: f.description,
        category: f.category
      }));

      const unchangedCount = currentFeatures.filter(
        f => targetFeatureKeys.has(f.featureKey)
      ).length;

      return {
        addedFeatures,
        removedFeatures,
        unchangedCount,
        summary: {
          currentTier,
          targetTier,
          currentFeatureCount: currentFeatures.length,
          targetFeatureCount: targetFeatures.length,
          netChange: targetFeatures.length - currentFeatures.length
        }
      };
    } catch (error) {
      this.logger.error('Error previewing tier change', {
        organizationId,
        productId,
        currentTier,
        targetTier,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Grant a feature as an add-on (outside of tier)
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @param {string} grantedBy - User ID granting the feature
   * @param {Object} options - Optional grant settings (expiresAt, usageLimit, etc.)
   * @returns {Promise<Object>}
   */
  async grantAddon(organizationId, featureId, grantedBy, options = {}) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      if (!feature.isAddOn) {
        throw new ValidationError('This feature is not available as an add-on');
      }

      // Check if grant already exists
      const existingGrant = await this.grantRepo.findActiveGrant(organizationId, featureId);
      if (existingGrant) {
        throw new ValidationError('Organization already has this feature');
      }

      // Validate dependencies
      const orgFeatures = await this.grantRepo.findByOrganization(organizationId, {
        productId: feature.productId,
        isActive: true
      });
      const orgFeatureKeys = orgFeatures.map(g => g.featureKey);

      const validation = await this.featureRepo.validateDependencies(featureId, orgFeatureKeys);
      if (!validation.isValid) {
        throw new ValidationError(
          `Missing required features: ${validation.missingFeatures.join(', ')}`
        );
      }

      // Check conflicts
      const conflicts = await this.featureRepo.checkConflicts(featureId, orgFeatureKeys);
      if (conflicts.hasConflicts) {
        throw new ValidationError(
          `Conflicting features: ${conflicts.conflictingFeatures.join(', ')}`
        );
      }

      // Create grant
      const grant = await this.grantRepo.create({
        organizationId,
        featureId,
        grantedVia: 'add_on_purchase',
        grantedBy,
        grantedReason: options.reason || 'Add-on purchase',
        expiresAt: options.expiresAt || null,
        usageLimit: options.usageLimit || feature.defaultUsageLimit,
        billingStatus: options.billingStatus || 'active',
        subscriptionId: options.subscriptionId || null,
        config: options.config || feature.defaultConfig
      });

      // Invalidate cache
      this.accessService.invalidateOrganizationCache(organizationId);

      this.logger.info('Add-on feature granted', {
        organizationId,
        featureId,
        featureKey: feature.featureKey,
        grantedBy
      });

      return grant;
    } catch (error) {
      this.logger.error('Error granting add-on', {
        organizationId,
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Revoke an add-on feature
   * @param {string} grantId - Grant ID
   * @param {string} revokedBy - User ID revoking the feature
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object>}
   */
  async revokeAddon(grantId, revokedBy, reason) {
    try {
      const grant = await this.grantRepo.findById(grantId);
      if (!grant) {
        throw new NotFoundError('Feature grant not found');
      }

      if (grant.grantedVia !== 'add_on_purchase') {
        throw new ValidationError('Can only revoke add-on features with this method');
      }

      const revoked = await this.grantRepo.revoke(grantId, revokedBy, reason);

      // Invalidate cache
      this.accessService.invalidateOrganizationCache(grant.organizationId);

      this.logger.info('Add-on feature revoked', {
        grantId,
        organizationId: grant.organizationId,
        featureKey: grant.featureKey,
        revokedBy,
        reason
      });

      return revoked;
    } catch (error) {
      this.logger.error('Error revoking add-on', {
        grantId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Grant a feature manually (admin override)
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @param {string} grantedBy - User ID granting the feature
   * @param {Object} options - Grant settings
   * @returns {Promise<Object>}
   */
  async manualGrant(organizationId, featureId, grantedBy, options = {}) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      // Check if grant already exists
      const existingGrant = await this.grantRepo.findActiveGrant(organizationId, featureId);
      if (existingGrant) {
        throw new ValidationError('Organization already has this feature');
      }

      // Create grant (skip dependency checks for manual grants)
      const grant = await this.grantRepo.create({
        organizationId,
        featureId,
        grantedVia: 'manual_grant',
        grantedBy,
        grantedReason: options.reason || 'Manual grant by admin',
        expiresAt: options.expiresAt || null,
        usageLimit: options.usageLimit || null,
        config: options.config || feature.defaultConfig
      });

      // Invalidate cache
      this.accessService.invalidateOrganizationCache(organizationId);

      this.logger.info('Feature manually granted', {
        organizationId,
        featureId,
        featureKey: feature.featureKey,
        grantedBy,
        reason: options.reason
      });

      return grant;
    } catch (error) {
      this.logger.error('Error manual grant', {
        organizationId,
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Grant trial access to a feature
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @param {number} trialDays - Trial duration in days
   * @param {string} grantedBy - User ID or 'system'
   * @returns {Promise<Object>}
   */
  async grantTrial(organizationId, featureId, trialDays, grantedBy) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      // Check if trial already exists
      const existingGrant = await this.grantRepo.findActiveGrant(organizationId, featureId);
      if (existingGrant) {
        throw new ValidationError('Organization already has access to this feature');
      }

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + trialDays);

      // Create trial grant
      const grant = await this.grantRepo.create({
        organizationId,
        featureId,
        grantedVia: 'trial',
        grantedBy,
        grantedReason: `${trialDays}-day trial`,
        expiresAt,
        billingStatus: 'trial',
        config: feature.defaultConfig
      });

      // Invalidate cache
      this.accessService.invalidateOrganizationCache(organizationId);

      this.logger.info('Trial feature granted', {
        organizationId,
        featureId,
        featureKey: feature.featureKey,
        trialDays,
        expiresAt
      });

      return grant;
    } catch (error) {
      this.logger.error('Error granting trial', {
        organizationId,
        featureId,
        trialDays,
        error: error.message
      });
      throw error;
    }
  }
}

export default FeatureTierService;
