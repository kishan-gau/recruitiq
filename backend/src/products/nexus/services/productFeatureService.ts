/**
 * Product Feature Service
 * Manages product features and feature flags
 */

import db from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ProductFeatureService {
  async getProductFeatures(productId) {
    try {
      const result = await db.query(`
        SELECT 
          f.id,
          f.code,
          f.name,
          f.description,
          f.type,
          pf.enabled,
          pf.config
        FROM features f
        INNER JOIN product_features pf ON f.id = pf.feature_id
        WHERE pf.product_id = $1
        ORDER BY f.name
      `, [productId]);
      return result.rows;
    } catch (_error) {
      logger.error('Error fetching product features:', error);
      throw error;
    }
  }

  async enableProductFeature(productId, featureId) {
    try {
      const result = await db.query(`
        INSERT INTO product_features (product_id, feature_id, enabled)
        VALUES ($1, $2, true)
        ON CONFLICT (product_id, feature_id)
        DO UPDATE SET enabled = true
        RETURNING *
      `, [productId, featureId]);
      return result.rows[0];
    } catch (_error) {
      logger.error('Error enabling product feature:', error);
      throw error;
    }
  }

  async disableProductFeature(productId, featureId) {
    try {
      const result = await db.query(`
        UPDATE product_features
        SET enabled = false
        WHERE product_id = $1 AND feature_id = $2
        RETURNING *
      `, [productId, featureId]);
      return result.rows[0];
    } catch (_error) {
      logger.error('Error disabling product feature:', error);
      throw error;
    }
  }

  async updateProductFeatureConfig(productId, featureId, config) {
    try {
      const result = await db.query(`
        UPDATE product_features
        SET config = $1
        WHERE product_id = $2 AND feature_id = $3
        RETURNING *
      `, [config, productId, featureId]);
      return result.rows[0];
    } catch (_error) {
      logger.error('Error updating product feature config:', error);
      throw error;
    }
  }
}

export default new ProductFeatureService();
