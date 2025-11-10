/**
 * Product Permission Service
 * Manages product permissions and access control
 */

import db from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ProductPermissionService {
  async getProductPermissions(productId) {
    try {
      const result = await db.query(
        'SELECT * FROM product_permissions WHERE product_id = $1',
        [productId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching product permissions:', error);
      throw error;
    }
  }

  async createProductPermission(data) {
    try {
      const result = await db.query(
        'INSERT INTO product_permissions (product_id, permission_code, name, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [data.productId, data.permissionCode, data.name, data.description]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating product permission:', error);
      throw error;
    }
  }

  async updateProductPermission(id, data) {
    try {
      const result = await db.query(
        'UPDATE product_permissions SET name = $1, description = $2 WHERE id = $3 RETURNING *',
        [data.name, data.description, id]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating product permission:', error);
      throw error;
    }
  }

  async deleteProductPermission(id) {
    try {
      await db.query('DELETE FROM product_permissions WHERE id = $1', [id]);
      return true;
    } catch (error) {
      logger.error('Error deleting product permission:', error);
      throw error;
    }
  }
}

export default new ProductPermissionService();
