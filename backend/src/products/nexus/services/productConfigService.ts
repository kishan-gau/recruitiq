/**
 * Product Config Service
 * Manages product configuration settings
 */

import db from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';

class ProductConfigService {
  async getProductConfig(productId) {
    try {
      const result = await db.query(
        'SELECT ui_config as config FROM products WHERE id = $1',
        [productId]
      );
      return result.rows[0]?.config || {};
    } catch (error) {
      logger.error('Error fetching product config:', error);
      throw error;
    }
  }

  async updateProductConfig(productId, config) {
    try {
      const result = await db.query(
        'UPDATE products SET ui_config = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [config, productId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating product config:', error);
      throw error;
    }
  }
}

export default new ProductConfigService();
