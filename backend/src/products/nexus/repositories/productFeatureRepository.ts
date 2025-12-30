/**
 * ProductFeature Repository
 * Database operations for ProductFeature model
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import ProductFeature from '../models/ProductFeature.js';

class ProductFeatureRepository {
  
  logger: any;

  query: any;

constructor(database = null) {
    this.query = database?.query || query;
    this.logger = logger;
  }

  /**
   * Find all features for a product
   */
  async findByProduct(productId) {
    const sql = `
      SELECT * FROM product_features 
      WHERE product_id = $1
      ORDER BY is_default DESC, feature_key ASC
    `;
    const result = await this.query(sql, [productId]);
    return result.rows.map(row => new ProductFeature(row));
  }

  /**
   * Find feature by key
   */
  async findByKey(productId, featureKey) {
    const sql = `
      SELECT * FROM product_features 
      WHERE product_id = $1 AND feature_key = $2
    `;
    const result = await this.query(sql, [productId, featureKey]);
    return result.rows.length > 0 ? new ProductFeature(result.rows[0]) : null;
  }

  /**
   * Find default features for a product
   */
  async findDefaultByProduct(productId) {
    const sql = `
      SELECT * FROM product_features 
      WHERE product_id = $1 AND is_default = TRUE
      ORDER BY feature_key ASC
    `;
    const result = await this.query(sql, [productId]);
    return result.rows.map(row => new ProductFeature(row));
  }

  /**
   * Find features by status
   */
  async findByStatus(productId, status) {
    const sql = `
      SELECT * FROM product_features 
      WHERE product_id = $1 AND status = $2
      ORDER BY feature_key ASC
    `;
    const result = await this.query(sql, [productId, status]);
    return result.rows.map(row => new ProductFeature(row));
  }

  /**
   * Find features available for organization based on tier
   */
  async findAvailableForOrganization(productId, organizationTier) {
    const tierOrder = {
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };
    
    const sql = `
      SELECT * FROM product_features 
      WHERE product_id = $1 
        AND status NOT IN ('deprecated', 'disabled')
      ORDER BY is_default DESC, feature_key ASC
    `;
    
    const result = await this.query(sql, [productId]);
    const features = result.rows.map(row => new ProductFeature(row));
    
    // Filter by tier
    const orgTierLevel = tierOrder[organizationTier] || 0;
    return features.filter(feature => {
      const featureTierLevel = tierOrder[feature.minTier] || 0;
      return featureTierLevel <= orgTierLevel;
    });
  }

  /**
   * Create feature
   */
  async create(featureData, userId) {
    const sql = `
      INSERT INTO product_features (
        product_id, feature_key, feature_name, description,
        status, is_default, min_tier, requires_features,
        config_schema, default_config,
        rollout_percentage, target_organizations,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      featureData.productId,
      featureData.featureKey,
      featureData.featureName,
      featureData.description,
      featureData.status || 'alpha',
      featureData.isDefault || false,
      featureData.minTier || 'starter',
      JSON.stringify(featureData.requiresFeatures),
      JSON.stringify(featureData.configSchema),
      JSON.stringify(featureData.defaultConfig),
      featureData.rolloutPercentage || 0,
      JSON.stringify(featureData.targetOrganizations),
      userId
    ];

    const result = await this.query(sql, values);
    return new ProductFeature(result.rows[0]);
  }

  /**
   * Update feature
   */
  async update(productId, featureKey, updateData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (updateData.featureName !== undefined) {
      updates.push(`feature_name = $${paramCount++}`);
      values.push(updateData.featureName);
    }
    if (updateData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(updateData.description);
    }
    if (updateData.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(updateData.status);
    }
    if (updateData.isDefault !== undefined) {
      updates.push(`is_default = $${paramCount++}`);
      values.push(updateData.isDefault);
    }
    if (updateData.minTier !== undefined) {
      updates.push(`min_tier = $${paramCount++}`);
      values.push(updateData.minTier);
    }
    if (updateData.requiresFeatures !== undefined) {
      updates.push(`requires_features = $${paramCount++}`);
      values.push(JSON.stringify(updateData.requiresFeatures));
    }
    if (updateData.configSchema !== undefined) {
      updates.push(`config_schema = $${paramCount++}`);
      values.push(JSON.stringify(updateData.configSchema));
    }
    if (updateData.defaultConfig !== undefined) {
      updates.push(`default_config = $${paramCount++}`);
      values.push(JSON.stringify(updateData.defaultConfig));
    }
    if (updateData.rolloutPercentage !== undefined) {
      updates.push(`rollout_percentage = $${paramCount++}`);
      values.push(updateData.rolloutPercentage);
    }
    if (updateData.targetOrganizations !== undefined) {
      updates.push(`target_organizations = $${paramCount++}`);
      values.push(JSON.stringify(updateData.targetOrganizations));
    }

    if (updates.length === 0) {
      return this.findByKey(productId, featureKey);
    }

    updates.push(`updated_at = NOW()`);
    values.push(productId, featureKey);

    const sql = `
      UPDATE product_features 
      SET ${updates.join(', ')} 
      WHERE product_id = $${paramCount++} AND feature_key = $${paramCount++}
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows.length > 0 ? new ProductFeature(result.rows[0]) : null;
  }

  /**
   * Update rollout percentage
   */
  async updateRollout(productId, featureKey, rolloutPercentage) {
    const sql = `
      UPDATE product_features 
      SET rollout_percentage = $1, updated_at = NOW()
      WHERE product_id = $2 AND feature_key = $3
      RETURNING *
    `;
    const result = await this.query(sql, [rolloutPercentage, productId, featureKey]);
    return result.rows.length > 0 ? new ProductFeature(result.rows[0]) : null;
  }

  /**
   * Delete feature
   */
  async delete(productId, featureKey) {
    const sql = `
      DELETE FROM product_features 
      WHERE product_id = $1 AND feature_key = $2
      RETURNING *
    `;
    const result = await this.query(sql, [productId, featureKey]);
    return result.rows.length > 0;
  }
}

export default ProductFeatureRepository;

