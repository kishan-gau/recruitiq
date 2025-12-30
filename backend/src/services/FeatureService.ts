/**
 * FeatureService - Business logic for feature management
 * Handles feature CRUD operations, validation, and lifecycle management
 * 
 * This service is used by platform admins to manage the feature catalog
 */

import FeatureRepository from '../repositories/FeatureRepository.ts';
import FeatureGrantRepository from '../repositories/FeatureGrantRepository.ts';
import logger from '../utils/logger.ts';
import { ForbiddenError, NotFoundError, ValidationError } from '../middleware/errorHandler.ts';

export class FeatureService {
  constructor() {
    this.featureRepo = new FeatureRepository();
    this.grantRepo = new FeatureGrantRepository();
    this.logger = logger;
  }

  /**
   * Create a new feature
   * @param {Object} data - Feature data
   * @param {string} createdBy - User ID creating the feature
   * @returns {Promise<Object>}
   */
  async createFeature(data, createdBy) {
    try {
      // Validate required fields
      this.validateFeatureData(data);

      // Check if feature key already exists for this product
      const existing = await this.featureRepo.findByKey(data.productId, data.featureKey);
      if (existing) {
        throw new ValidationError(`Feature with key '${data.featureKey}' already exists for this product`);
      }

      // Validate dependencies if provided
      if (data.requiredFeatures && data.requiredFeatures.length > 0) {
        await this.validateFeatureDependencies(data.productId, data.requiredFeatures);
      }

      // Create feature
      const feature = await this.featureRepo.create({
        ...data,
        createdBy
      });

      this.logger.info('Feature created', {
        featureId: feature.id,
        featureKey: feature.featureKey,
        createdBy
      });

      return feature;
    } catch (error) {
      this.logger.error('Error creating feature', {
        data,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update a feature
   * @param {string} featureId - Feature ID
   * @param {Object} data - Updated data
   * @param {string} updatedBy - User ID updating the feature
   * @returns {Promise<Object>}
   */
  async updateFeature(featureId, data, updatedBy) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      // Validate dependencies if being updated
      if (data.requiredFeatures) {
        await this.validateFeatureDependencies(feature.productId, data.requiredFeatures);
      }

      // Update feature
      const updated = await this.featureRepo.update(featureId, data);

      this.logger.info('Feature updated', {
        featureId,
        updatedBy
      });

      return updated;
    } catch (error) {
      this.logger.error('Error updating feature', {
        featureId,
        data,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get feature by ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object>}
   */
  async getFeature(featureId) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }
      return feature;
    } catch (error) {
      this.logger.error('Error getting feature', {
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get feature by key
   * @param {string} productId - Product ID
   * @param {string} featureKey - Feature key
   * @returns {Promise<Object>}
   */
  async getFeatureByKey(productId, featureKey) {
    try {
      const feature = await this.featureRepo.findByKey(productId, featureKey);
      if (!feature) {
        throw new NotFoundError(`Feature '${featureKey}' not found`);
      }
      return feature;
    } catch (error) {
      this.logger.error('Error getting feature by key', {
        productId,
        featureKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List all features (with filtering and pagination)
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  async listFeatures(filters = {}, options = {}) {
    try {
      return await this.featureRepo.findAll(filters, options);
    } catch (error) {
      this.logger.error('Error listing features', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * List features for a specific product
   * @param {string} productId - Product ID
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async listProductFeatures(productId, filters = {}, options = {}) {
    try {
      return await this.featureRepo.findByProduct(productId, filters, options);
    } catch (error) {
      this.logger.error('Error listing product features', {
        productId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deprecate a feature
   * @param {string} featureId - Feature ID
   * @param {string} message - Deprecation message
   * @param {string} deprecatedBy - User ID deprecating the feature
   * @returns {Promise<Object>}
   */
  async deprecateFeature(featureId, message, deprecatedBy) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      if (feature.status === 'deprecated') {
        throw new ValidationError('Feature is already deprecated');
      }

      // Check if any features depend on this one
      const dependents = await this.findDependentFeatures(featureId);
      if (dependents.length > 0) {
        throw new ValidationError(
          `Cannot deprecate feature: ${dependents.length} other features depend on it`
        );
      }

      const deprecated = await this.featureRepo.deprecate(featureId, message);

      this.logger.info('Feature deprecated', {
        featureId,
        deprecatedBy,
        message
      });

      return deprecated;
    } catch (error) {
      this.logger.error('Error deprecating feature', {
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update feature rollout percentage
   * @param {string} featureId - Feature ID
   * @param {number} percentage - Rollout percentage (0-100)
   * @param {Array} targetOrganizations - Optional specific org IDs
   * @returns {Promise<Object>}
   */
  async updateRollout(featureId, percentage, targetOrganizations = []) {
    try {
      if (percentage < 0 || percentage > 100) {
        throw new ValidationError('Rollout percentage must be between 0 and 100');
      }

      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        throw new NotFoundError('Feature not found');
      }

      const updated = await this.featureRepo.update(featureId, {
        rolloutPercentage: percentage,
        targetOrganizations
      });

      this.logger.info('Feature rollout updated', {
        featureId,
        percentage,
        targetCount: targetOrganizations.length
      });

      return updated;
    } catch (error) {
      this.logger.error('Error updating rollout', {
        featureId,
        percentage,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate feature data
   * @private
   * @param {Object} data - Feature data to validate
   * @throws {ValidationError}
   */
  validateFeatureData(data) {
    if (!data.productId) {
      throw new ValidationError('Product ID is required');
    }

    if (!data.featureKey) {
      throw new ValidationError('Feature key is required');
    }

    if (!data.featureName) {
      throw new ValidationError('Feature name is required');
    }

    // Validate feature key format (lowercase, underscores only)
    if (!/^[a-z0-9_]+$/.test(data.featureKey)) {
      throw new ValidationError(
        'Feature key must contain only lowercase letters, numbers, and underscores'
      );
    }

    // Validate status
    const validStatuses = ['alpha', 'beta', 'stable', 'deprecated', 'disabled'];
    if (data.status && !validStatuses.includes(data.status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate tier
    const validTiers = ['starter', 'professional', 'enterprise'];
    if (data.minTier && !validTiers.includes(data.minTier)) {
      throw new ValidationError(`Min tier must be one of: ${validTiers.join(', ')}`);
    }

    // Validate rollout percentage
    if (data.rolloutPercentage !== undefined) {
      const percentage = parseInt(data.rolloutPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        throw new ValidationError('Rollout percentage must be between 0 and 100');
      }
    }
  }

  /**
   * Validate feature dependencies exist
   * @private
   * @param {string} productId - Product ID
   * @param {Array} requiredFeatures - Array of feature keys
   * @throws {ValidationError}
   */
  async validateFeatureDependencies(productId, requiredFeatures) {
    for (const featureKey of requiredFeatures) {
      const dependency = await this.featureRepo.findByKey(productId, featureKey);
      if (!dependency) {
        throw new ValidationError(`Required feature '${featureKey}' does not exist`);
      }
      if (dependency.status === 'deprecated' || dependency.status === 'disabled') {
        throw new ValidationError(`Required feature '${featureKey}' is ${dependency.status}`);
      }
    }
  }

  /**
   * Find features that depend on a given feature
   * @private
   * @param {string} featureId - Feature ID
   * @returns {Promise<Array>}
   */
  async findDependentFeatures(featureId) {
    try {
      const feature = await this.featureRepo.findById(featureId);
      if (!feature) {
        return [];
      }

      // Get all features for the same product
      const allFeatures = await this.featureRepo.findByProduct(feature.productId);

      // Filter features that require this one
      const dependents = allFeatures.filter(f => 
        f.requiredFeatures && 
        f.requiredFeatures.includes(feature.featureKey)
      );

      return dependents;
    } catch (error) {
      this.logger.error('Error finding dependent features', {
        featureId,
        error: error.message
      });
      throw error;
    }
  }
}

export default FeatureService;
