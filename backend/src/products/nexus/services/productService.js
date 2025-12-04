/**
 * Product Service
 * Business logic for managing products in the system
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class ProductService {
  /**
   * Get all active products for dynamic loading
   */
  async getActiveProducts() {
    try {
      const result = await query(`
        SELECT 
          id,
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config as config,
          created_at,
          updated_at
        FROM products
        WHERE status = 'active'
        ORDER BY is_core DESC, name ASC
      `);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching active products:', error);
      throw error;
    }
  }

  /**
   * Get all products with optional filters
   */
  async getAllProducts(options = {}) {
    try {
      const { status, isCore } = options;
      const conditions = [];
      const params = [];

      if (status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(status);
      }

      if (isCore !== undefined) {
        conditions.push(`is_core = $${params.length + 1}`);
        params.push(isCore);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await query(`
        SELECT 
          id,
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config as config,
          created_at,
          updated_at
        FROM products
        ${whereClause}
        ORDER BY is_core DESC, name ASC
      `, params);

      return result.rows;
    } catch (error) {
      logger.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    try {
      const result = await query(`
        SELECT 
          id,
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config as config,
          created_at,
          updated_at
        FROM products
        WHERE id = $1
      `, [id]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching product by ID:', error);
      throw error;
    }
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug) {
    try {
      const result = await query(`
        SELECT 
          id,
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config as config,
          created_at,
          updated_at
        FROM products
        WHERE slug = $1
      `, [slug]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching product by slug:', error);
      throw error;
    }
  }

  /**
   * Get core products
   */
  async getCoreProducts() {
    return this.getAllProducts({ isCore: true, status: 'active' });
  }

  /**
   * Get add-on products
   */
  async getAddOnProducts() {
    return this.getAllProducts({ isCore: false, status: 'active' });
  }

  /**
   * Get product with its features
   */
  async getProductWithFeatures(id) {
    try {
      const product = await this.getProductById(id);
      if (!product) {
        return null;
      }

      const featuresResult = await query(`
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
      `, [id]);

      product.features = featuresResult.rows;
      return product;
    } catch (error) {
      logger.error('Error fetching product with features:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(productData, userId) {
    try {
      const {
        slug,
        name,
        description,
        version,
        isCore,
        basePath,
        npmPackage,
        config
      } = productData;

      const result = await query(`
        INSERT INTO products (
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config,
          created_by
        ) VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9)
        RETURNING *
      `, [slug, name, description, version, isCore, basePath, npmPackage, config, userId]);

      logger.info('Product created', { productId: result.rows[0].id, slug, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(id, updateData, userId) {
    try {
      const fields = [];
      const params = [];
      let paramCount = 1;

      if (updateData.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        params.push(updateData.name);
      }

      if (updateData.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        params.push(updateData.description);
      }

      if (updateData.version !== undefined) {
        fields.push(`version = $${paramCount++}`);
        params.push(updateData.version);
      }

      if (updateData.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        params.push(updateData.status);
      }

      if (updateData.config !== undefined) {
        fields.push(`ui_config = $${paramCount++}`);
        params.push(updateData.config);
      }

      fields.push(`updated_by = $${paramCount++}`);
      params.push(userId);

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id);

      const result = await query(`
        UPDATE products
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Product updated', { productId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete a product (soft delete by setting status to inactive)
   */
  async deleteProduct(id, userId) {
    try {
      const result = await query(`
        UPDATE products
        SET 
          status = 'inactive',
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Product deleted', { productId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(searchQuery) {
    try {
      const result = await query(`
        SELECT 
          id,
          slug,
          name,
          description,
          version,
          status,
          is_core,
          base_path,
          npm_package,
          ui_config as config,
          created_at,
          updated_at
        FROM products
        WHERE 
          name ILIKE $1 OR
          description ILIKE $1 OR
          slug ILIKE $1
        ORDER BY is_core DESC, name ASC
      `, [`%${searchQuery}%`]);

      return result.rows;
    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }
}

export default new ProductService();
