/**
 * Product Repository
 * Database operations for Product model
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Product from '../models/Product.js';

class ProductRepository {
  constructor(database = null) {
    this.query = database?.query || query;
    this.logger = logger;
  }

  /**
   * Find all products
   */
  async findAll(options = {}) {
    try {
      const { includeDeleted = false, status, isCore } = options;
      
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (!includeDeleted) {
        sql += ' AND deleted_at IS NULL';
      }

      if (status) {
        sql += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      if (isCore !== undefined) {
        sql += ` AND is_core = $${paramCount++}`;
        params.push(isCore);
      }

      sql += ' ORDER BY is_core DESC, name ASC';

      const result = await this.query(sql, params, null);
      return result.rows.map(row => new Product(row));
    } catch (error) {
      this.logger.error('Error finding all products', { options, error: error.message });
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  async findById(id) {
    try {
      const sql = 'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL';
      const result = await this.query(sql, [id], null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding product by ID', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug) {
    try {
      const sql = 'SELECT * FROM products WHERE slug = $1 AND deleted_at IS NULL';
      const result = await this.query(sql, [slug], null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding product by slug', { slug, error: error.message });
      throw error;
    }
  }

  /**
   * Find product by name
   */
  async findByName(name) {
    try {
      const sql = 'SELECT * FROM products WHERE name = $1 AND deleted_at IS NULL';
      const result = await this.query(sql, [name], null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding product by name', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Find active products
   */
  async findActive() {
    try {
      const sql = `
        SELECT * FROM products 
        WHERE status = 'active' AND deleted_at IS NULL 
        ORDER BY is_core DESC, name ASC
      `;
      const result = await this.query(sql, [], null);
      return result.rows.map(row => new Product(row));
    } catch (error) {
      this.logger.error('Error finding active products', { error: error.message });
      throw error;
    }
  }

  /**
   * Find core products
   */
  async findCore() {
    try {
      const sql = `
        SELECT * FROM products 
        WHERE is_core = TRUE AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await this.query(sql, [], null);
      return result.rows.map(row => new Product(row));
    } catch (error) {
      this.logger.error('Error finding core products', { error: error.message });
      throw error;
    }
  }

  /**
   * Find add-on products
   */
  async findAddOns() {
    try {
      const sql = `
        SELECT * FROM products 
        WHERE is_core = FALSE AND deleted_at IS NULL 
        ORDER BY name ASC
      `;
      const result = await this.query(sql, [], null);
      return result.rows.map(row => new Product(row));
    } catch (error) {
      this.logger.error('Error finding add-on products', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async create(productData, userId) {
    try {
      const sql = `
        INSERT INTO products (
          name, display_name, description, slug, version,
          npm_package, repository_url, documentation_url,
          status, is_core, requires_license,
          base_path, api_prefix, default_port,
          min_tier, resource_requirements,
          features, default_features,
          icon, color, ui_config,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, $16,
          $17, $18,
          $19, $20, $21,
          $22
        )
        RETURNING *
      `;

      const values = [
        productData.name,
        productData.displayName,
        productData.description,
        productData.slug,
        productData.version,
        productData.npmPackage,
        productData.repositoryUrl,
        productData.documentationUrl,
        productData.status || 'active',
        productData.isCore || false,
        productData.requiresLicense || false,
        productData.basePath,
        productData.apiPrefix,
        productData.defaultPort,
        productData.minTier,
        JSON.stringify(productData.resourceRequirements),
        JSON.stringify(productData.features),
        JSON.stringify(productData.defaultFeatures),
        productData.icon,
        productData.color,
        JSON.stringify(productData.uiConfig),
        userId
      ];

      const result = await this.query(sql, values, null);
      return new Product(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating product', { name: productData.name, error: error.message });
      throw error;
    }
  }

  /**
   * Update a product
   */
  async update(id, productData) {
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (productData.displayName !== undefined) {
        updates.push(`display_name = $${paramCount++}`);
        values.push(productData.displayName);
      }
      if (productData.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(productData.description);
      }
      if (productData.version !== undefined) {
        updates.push(`version = $${paramCount++}`);
        values.push(productData.version);
      }
      if (productData.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(productData.status);
      }
      if (productData.npmPackage !== undefined) {
        updates.push(`npm_package = $${paramCount++}`);
        values.push(productData.npmPackage);
      }
      if (productData.repositoryUrl !== undefined) {
        updates.push(`repository_url = $${paramCount++}`);
        values.push(productData.repositoryUrl);
      }
      if (productData.documentationUrl !== undefined) {
        updates.push(`documentation_url = $${paramCount++}`);
        values.push(productData.documentationUrl);
      }
      if (productData.features !== undefined) {
        updates.push(`features = $${paramCount++}`);
        values.push(JSON.stringify(productData.features));
      }
      if (productData.defaultFeatures !== undefined) {
        updates.push(`default_features = $${paramCount++}`);
        values.push(JSON.stringify(productData.defaultFeatures));
      }
      if (productData.icon !== undefined) {
        updates.push(`icon = $${paramCount++}`);
        values.push(productData.icon);
      }
      if (productData.color !== undefined) {
        updates.push(`color = $${paramCount++}`);
        values.push(productData.color);
      }
      if (productData.uiConfig !== undefined) {
        updates.push(`ui_config = $${paramCount++}`);
        values.push(JSON.stringify(productData.uiConfig));
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const sql = `
        UPDATE products 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount} AND deleted_at IS NULL 
        RETURNING *
      `;

      const result = await this.query(sql, values, null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating product', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Soft delete a product
   */
  async delete(id) {
    try {
      const sql = `
        UPDATE products 
        SET deleted_at = NOW() 
        WHERE id = $1 AND deleted_at IS NULL 
        RETURNING *
      `;
      const result = await this.query(sql, [id], null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error soft deleting product', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Hard delete a product (use with caution)
   */
  async hardDelete(id) {
    try {
      const sql = 'DELETE FROM products WHERE id = $1 RETURNING *';
      const result = await this.query(sql, [id], null);
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error hard deleting product', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Restore a soft-deleted product
   */
  async restore(id) {
    try {
      const sql = `
        UPDATE products 
        SET deleted_at = NULL 
        WHERE id = $1 
        RETURNING *
      `;
      const result = await this.query(sql, [id], null);
      return result.rows.length > 0 ? new Product(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error restoring product', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Search products
   */
  async search(searchTerm) {
    try {
      const sql = `
        SELECT * FROM products 
        WHERE (
          name ILIKE $1 
          OR display_name ILIKE $1 
          OR description ILIKE $1
        )
        AND deleted_at IS NULL
        ORDER BY is_core DESC, name ASC
      `;
      const result = await this.query(sql, [`%${searchTerm}%`], null);
      return result.rows.map(row => new Product(row));
    } catch (error) {
      this.logger.error('Error searching products', { searchTerm, error: error.message });
      throw error;
    }
  }
}

export default ProductRepository;
