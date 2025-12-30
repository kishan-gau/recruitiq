/**
 * FeatureAccessService - Core service for feature access control
 * Handles checking if organizations have access to features
 * 
 * This is the most critical service - used by middleware and application code
 * to determine feature access with multi-layer caching for performance
 */

import FeatureRepository from '../repositories/FeatureRepository.js';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.js';
import logger from '../utils/logger.js';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

// In-memory cache (L1) - very fast but limited
const memoryCache = new Map();
const MEMORY_CACHE_TTL = 60 * 1000; // 1 minute

export class FeatureAccessService {
  constructor() {
    this.featureRepo = new FeatureRepository();
    this.grantRepo = new FeatureGrantRepository();
    this.logger = logger;
  }

  /**
   * Check if organization has access to a feature
   * Main entry point for feature checks - uses multi-layer caching
   * 
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {string} featureKey - Feature key
   * @returns {Promise<Object>} { hasAccess: boolean, reason: string, grant: Object, feature: Object }
   */
  async hasFeature(organizationId, productId, featureKey) {
    try {
      // Build cache key
      const cacheKey = `feature:${organizationId}:${productId}:${featureKey}`;

      // Check L1 cache (memory)
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.logger.debug('Feature check from memory cache', { cacheKey });
        return cached;
      }

      // Get feature details
      const feature = await this.featureRepo.findByKey(productId, featureKey);
      if (!feature) {
        const result = {
          hasAccess: false,
          reason: 'feature_not_found',
          feature: null,
          grant: null
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check if feature is disabled
      if (feature.status === 'disabled') {
        const result = {
          hasAccess: false,
          reason: 'feature_disabled',
          feature,
          grant: null
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check for active grant
      const grant = await this.grantRepo.findActiveGrantByKey(organizationId, featureKey, productId);
      
      if (!grant) {
        const result = {
          hasAccess: false,
          reason: 'no_grant',
          feature,
          grant: null
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check if grant is expired
      if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) {
        const result = {
          hasAccess: false,
          reason: 'grant_expired',
          feature,
          grant
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check usage limits
      if (grant.usageLimit !== null && grant.currentUsage >= grant.usageLimit) {
        const result = {
          hasAccess: false,
          reason: 'usage_limit_exceeded',
          feature,
          grant
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Check rollout percentage
      if (feature.rolloutPercentage < 100) {
        const inRollout = await this.checkRollout(
          organizationId,
          feature.rolloutPercentage,
          feature.targetOrganizations || []
        );

        if (!inRollout) {
          const result = {
            hasAccess: false,
            reason: 'not_in_rollout',
            feature,
            grant
          };
          this.setCachedResult(cacheKey, result);
          return result;
        }
      }

      // All checks passed - access granted!
      const result = {
        hasAccess: true,
        reason: null,
        feature,
        grant,
        config: grant.config || feature.defaultConfig || {},
        usage: grant.usageLimit !== null ? {
          current: grant.currentUsage,
          limit: grant.usageLimit,
          remaining: grant.usageLimit - grant.currentUsage
        } : null
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Error checking feature access', {
        organizationId,
        productId,
        featureKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check feature access and throw if denied
   * Convenience method for middleware and services
   * 
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {string} featureKey - Feature key
   * @throws {ForbiddenError} if access is denied
   * @returns {Promise<Object>} Access result
   */
  async requireFeature(organizationId, productId, featureKey) {
    const result = await this.hasFeature(organizationId, productId, featureKey);
    
    if (!result.hasAccess) {
      throw new ForbiddenError(
        this.getAccessDeniedMessage(result),
        { reason: result.reason, featureKey }
      );
    }

    return result;
  }

  /**
   * Check if organization has ANY of the specified features
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {Array<string>} featureKeys - Array of feature keys
   * @returns {Promise<Object>} { hasAccess: boolean, matchedFeature: string }
   */
  async hasAnyFeature(organizationId, productId, featureKeys) {
    try {
      for (const featureKey of featureKeys) {
        const result = await this.hasFeature(organizationId, productId, featureKey);
        if (result.hasAccess) {
          return {
            hasAccess: true,
            matchedFeature: featureKey,
            result
          };
        }
      }

      return {
        hasAccess: false,
        matchedFeature: null,
        result: null
      };
    } catch (error) {
      this.logger.error('Error checking any feature access', {
        organizationId,
        productId,
        featureKeys,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if organization has ALL of the specified features
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @param {Array<string>} featureKeys - Array of feature keys
   * @returns {Promise<Object>} { hasAccess: boolean, results: Object }
   */
  async hasAllFeatures(organizationId, productId, featureKeys) {
    try {
      const results = {};
      let hasAccess = true;

      for (const featureKey of featureKeys) {
        const result = await this.hasFeature(organizationId, productId, featureKey);
        results[featureKey] = result;
        
        if (!result.hasAccess) {
          hasAccess = false;
        }
      }

      return {
        hasAccess,
        results
      };
    } catch (error) {
      this.logger.error('Error checking all features access', {
        organizationId,
        productId,
        featureKeys,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all available and unavailable features for an organization
   * Used for frontend feature catalogs
   * 
   * @param {string} organizationId - Organization ID
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} { available: [], unavailable: [] }
   */
  async getOrganizationFeatures(organizationId, productId) {
    try {
      // Get all features for the product
      const allFeatures = await this.featureRepo.findByProduct(productId, { status: 'stable' });

      // Get organization's grants
      const grants = await this.grantRepo.findByOrganization(organizationId, {
        productId,
        isActive: true,
        notExpired: true
      });

      const grantMap = new Map(grants.map(g => [g.featureKey, g]));

      const available = [];
      const unavailable = [];

      for (const feature of allFeatures) {
        const grant = grantMap.get(feature.featureKey);

        if (grant) {
          // Check usage limits
          const hasUsageRemaining = grant.usageLimit === null || 
                                   grant.currentUsage < grant.usageLimit;

          if (hasUsageRemaining) {
            available.push({
              key: feature.featureKey,
              name: feature.featureName,
              description: feature.description,
              category: feature.category,
              grantedVia: grant.grantedVia,
              config: grant.config || feature.defaultConfig,
              usage: grant.usageLimit !== null ? {
                current: grant.currentUsage,
                limit: grant.usageLimit,
                remaining: grant.usageLimit - grant.currentUsage
              } : null
            });
          } else {
            unavailable.push({
              key: feature.featureKey,
              name: feature.featureName,
              description: feature.description,
              category: feature.category,
              reason: 'usage_limit_exceeded',
              minTier: feature.minTier,
              isAddOn: feature.isAddOn,
              pricing: feature.pricing
            });
          }
        } else {
          unavailable.push({
            key: feature.featureKey,
            name: feature.featureName,
            description: feature.description,
            category: feature.category,
            reason: 'no_grant',
            minTier: feature.minTier,
            isAddOn: feature.isAddOn,
            pricing: feature.pricing
          });
        }
      }

      return { available, unavailable };
    } catch (error) {
      this.logger.error('Error getting organization features', {
        organizationId,
        productId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Track feature usage (increment counter)
   * @param {string} organizationId - Organization ID
   * @param {string} featureKey - Feature key
   * @param {string} productId - Product ID
   * @param {number} amount - Usage amount to add (default 1)
   * @returns {Promise<void>}
   */
  async trackUsage(organizationId, featureKey, productId, amount = 1) {
    try {
      const grant = await this.grantRepo.findActiveGrantByKey(organizationId, featureKey, productId);
      
      if (grant && grant.usageLimit !== null) {
        await this.grantRepo.incrementUsage(grant.id, amount);

        // Invalidate cache
        const cacheKey = `feature:${organizationId}:${productId}:${featureKey}`;
        this.invalidateCache(cacheKey);

        this.logger.debug('Feature usage tracked', {
          organizationId,
          featureKey,
          amount,
          newUsage: grant.currentUsage + amount
        });
      }
    } catch (error) {
      // Don't throw - usage tracking failures shouldn't break the app
      this.logger.error('Error tracking feature usage', {
        organizationId,
        featureKey,
        amount,
        error: error.message
      });
    }
  }

  /**
   * Check if organization is in feature rollout
   * Uses deterministic hashing to ensure consistent results
   * 
   * @private
   * @param {string} organizationId - Organization ID
   * @param {number} percentage - Rollout percentage (0-100)
   * @param {Array} targetOrganizations - Specific org IDs to include
   * @returns {Promise<boolean>}
   */
  async checkRollout(organizationId, percentage, targetOrganizations) {
    // Check if org is in target list
    if (targetOrganizations && targetOrganizations.includes(organizationId)) {
      return true;
    }

    // If 100%, everyone is included
    if (percentage >= 100) {
      return true;
    }

    // If 0%, no one is included (unless in target list)
    if (percentage <= 0) {
      return false;
    }

    // Use deterministic hash to check if org is in rollout percentage
    const hash = crypto.createHash('md5').update(organizationId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const rolloutValue = hashValue % 100;

    return rolloutValue < percentage;
  }

  /**
   * Get human-readable message for access denied
   * @private
   * @param {Object} result - Access check result
   * @returns {string}
   */
  getAccessDeniedMessage(result) {
    switch (result.reason) {
      case 'feature_not_found':
        return 'This feature does not exist';
      case 'feature_disabled':
        return 'This feature is currently disabled';
      case 'no_grant':
        return result.feature && result.feature.minTier
          ? `This feature requires ${result.feature.minTier} tier or higher`
          : 'You do not have access to this feature';
      case 'grant_expired':
        return 'Your access to this feature has expired';
      case 'usage_limit_exceeded':
        return 'You have reached the usage limit for this feature';
      case 'not_in_rollout':
        return 'This feature is not yet available for your organization';
      default:
        return 'Access to this feature is not available';
    }
  }

  /**
   * Get cached result from memory
   * @private
   */
  getCachedResult(cacheKey) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached result in memory
   * @private
   */
  setCachedResult(cacheKey, data) {
    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + MEMORY_CACHE_TTL
    });

    // Clean up old cache entries periodically
    if (memoryCache.size > 10000) {
      this.cleanupCache();
    }
  }

  /**
   * Invalidate cache for a specific key
   * @param {string} cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey) {
    memoryCache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries for an organization
   * @param {string} organizationId - Organization ID
   */
  invalidateOrganizationCache(organizationId) {
    const prefix = `feature:${organizationId}:`;
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now >= value.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }
}

export default FeatureAccessService;
