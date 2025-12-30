/**
 * ProductConfig Repository
 * Database operations for ProductConfig model
 */

import { query } from '../../../config/database.ts';
import logger from '../../../utils/logger.ts';
import ProductConfig from '../models/ProductConfig.ts';

class ProductConfigRepository {
  constructor(database = null) {
    this.query = database?.query || query;
    this.logger = logger;
  }

  /**
   * Find all configs for an organization and product
   */
  async findByOrganizationAndProduct(organizationId, productId) {
    try {
      const sql = `
        SELECT * FROM product_configs 
        WHERE organization_id = $1 AND product_id = $2
        ORDER BY config_key ASC
      `;
      const result = await this.query(sql, [organizationId, productId], organizationId);
      return result.rows.map(row => new ProductConfig(row));
    } catch (error) {
      this.logger.error('Error finding configs', { organizationId, productId, error: error.message });
      throw error;
    }
  }

  /**
   * Find specific config
   */
  async findByKey(organizationId, productId, configKey) {
    try {
      const sql = `
        SELECT * FROM product_configs 
        WHERE organization_id = $1 AND product_id = $2 AND config_key = $3
      `;
      const result = await this.query(sql, [organizationId, productId, configKey], organizationId);
      return result.rows.length > 0 ? new ProductConfig(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding config by key', { organizationId, productId, configKey, error: error.message });
      throw error;
    }
  }

  /**
   * Find all configs for a product across all organizations
   */
  async findByProduct(productId) {
    try {
      const sql = `
        SELECT pc.*, o.name as organization_name
        FROM product_configs pc
        JOIN organizations o ON pc.organization_id = o.id
        WHERE pc.product_id = $1
        ORDER BY o.name ASC, pc.config_key ASC
      `;
      const result = await this.query(sql, [productId], null);
      return result.rows.map(row => new ProductConfig(row));
    } catch (error) {
      this.logger.error('Error finding configs by product', { productId, error: error.message });
      throw error;
    }
  }

  /**
   * Find sensitive configs
   */
  async findSensitive(organizationId, productId) {
    try {
      const sql = `
        SELECT * FROM product_configs 
        WHERE organization_id = $1 AND product_id = $2 AND is_sensitive = TRUE
        ORDER BY config_key ASC
      `;
      const result = await this.query(sql, [organizationId, productId], organizationId);
      return result.rows.map(row => new ProductConfig(row));
    } catch (error) {
      this.logger.error('Error finding sensitive configs', { organizationId, productId, error: error.message });
      throw error;
    }
  }

  /**
   * Create or update config
   */
  async upsert(configData, userId) {
    try {
      const sql = `
        INSERT INTO product_configs (
          organization_id, product_id, config_key, config_value,
          config_type, is_encrypted, is_sensitive, description, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (organization_id, product_id, config_key) 
        DO UPDATE SET
          config_value = EXCLUDED.config_value,
          config_type = EXCLUDED.config_type,
          is_encrypted = EXCLUDED.is_encrypted,
          is_sensitive = EXCLUDED.is_sensitive,
          description = EXCLUDED.description,
          updated_at = NOW(),
          updated_by = EXCLUDED.updated_by
        RETURNING *
      `;

      const values = [
        configData.organizationId,
        configData.productId,
        configData.configKey,
        JSON.stringify(configData.configValue),
        configData.configType || 'custom',
        configData.isEncrypted || false,
        configData.isSensitive || false,
        configData.description,
        userId
      ];

      const result = await this.query(sql, values, configData.organizationId);
      return new ProductConfig(result.rows[0]);
    } catch (error) {
      this.logger.error('Error upserting config', { organizationId: configData.organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update config value
   */
  async updateValue(organizationId, productId, configKey, configValue, userId) {
    try {
      const sql = `
        UPDATE product_configs 
        SET 
          config_value = $1,
          updated_at = NOW(),
          updated_by = $2
        WHERE organization_id = $3 AND product_id = $4 AND config_key = $5
        RETURNING *
      `;
      const result = await this.query(sql, [
        JSON.stringify(configValue),
        userId,
        organizationId,
        productId,
        configKey
      ], organizationId);
      return result.rows.length > 0 ? new ProductConfig(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating config value', { organizationId, productId, configKey, error: error.message });
      throw error;
    }
  }

  /**
   * Delete config
   */
  async delete(organizationId, productId, configKey) {
    try {
      const sql = `
        DELETE FROM product_configs 
        WHERE organization_id = $1 AND product_id = $2 AND config_key = $3
        RETURNING *
      `;
      const result = await this.query(sql, [organizationId, productId, configKey], organizationId);
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error deleting config', { organizationId, productId, configKey, error: error.message });
      throw error;
    }
  }

  /**
   * Delete all configs for organization and product
   */
  async deleteAllByOrganizationAndProduct(organizationId, productId) {
    try {
      const sql = `
        DELETE FROM product_configs 
        WHERE organization_id = $1 AND product_id = $2
      `;
      const result = await this.query(sql, [organizationId, productId], organizationId);
      return result.rowCount;
    } catch (error) {
      this.logger.error('Error deleting all configs', { organizationId, productId, error: error.message });
      throw error;
    }
  }

  /**
   * Get config as key-value map
   */
  async getConfigMap(organizationId, productId) {
    try {
      const configs = await this.findByOrganizationAndProduct(organizationId, productId);
      const configMap = {};
      configs.forEach(config => {
        configMap[config.configKey] = config.configValue;
      });
      return configMap;
    } catch (error) {
      this.logger.error('Error getting config map', { organizationId, productId, error: error.message });
      throw error;
    }
  }
}

export default ProductConfigRepository;
