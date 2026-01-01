/**
 * FeatureRepository - Manages feature catalog operations
 * Handles CRUD operations for the features table
 * 
 * Features are NOT organization-scoped (they are global product features)
 * Access control happens through organization_feature_grants
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { mapDbToApi } from '../utils/dtoMapper.js';

export interface FindByProductFilters {
  status?: string;
  category?: string;
  isAddOn?: boolean;
  minTier?: string;
}

export interface FindByProductOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
}

export interface FindAllFilters {
  productId?: string;
  status?: string;
  search?: string;
}

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
}

export interface FindAllResult {
  features: unknown[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

export class FeatureRepository {
  protected tableName: string;
  protected logger: typeof logger;

  constructor() {
    this.tableName = 'features';
    this.logger = logger;
  }

  /**
   * Find feature by ID
   * @param {string} id - Feature ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    try {
      const sql = `
        SELECT f.*, p.name as product_name, p.slug as product_slug
        FROM ${this.tableName} f
        JOIN products p ON f.product_id = p.id
        WHERE f.id = $1
      `;
      
      const result = await query(sql, [id], null, {
        operation: 'findById',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error in findById', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find feature by product and feature key
   * @param {string} productId - Product ID
   * @param {string} featureKey - Feature key
   * @returns {Promise<Object|null>}
   */
  async findByKey(productId, featureKey) {
    try {
      const sql = `
        SELECT f.*, p.name as product_name, p.slug as product_slug
        FROM ${this.tableName} f
        JOIN products p ON f.product_id = p.id
        WHERE f.product_id = $1 
        AND f.feature_key = $2
      `;
      
      const result = await query(sql, [productId, featureKey], null, {
        operation: 'findByKey',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error in findByKey', {
        table: this.tableName,
        productId,
        featureKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find all features for a product
   * @param {string} productId - Product ID
   * @param {Object} filters - Optional filters (status, category, isAddOn)
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>}
   */
  async findByProduct(productId: string, filters: FindByProductFilters = {}, options: FindByProductOptions = {}): Promise<unknown[]> {
    try {
      const { limit = 100, offset = 0, orderBy = 'category, feature_name' } = options;
      
      let sql = `
        SELECT f.*, p.name as product_name, p.slug as product_slug,
               (SELECT COUNT(DISTINCT organization_id) 
                FROM organization_feature_grants 
                WHERE feature_id = f.id AND is_active = TRUE) as organizations_using
        FROM ${this.tableName} f
        JOIN products p ON f.product_id = p.id
        WHERE f.product_id = $1
      `;
      
      const params = [productId];
      let paramIndex = 2;

      // Add filters
      if (filters.status) {
        sql += ` AND f.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.category) {
        sql += ` AND f.category = $${paramIndex}`;
        params.push(filters.category);
        paramIndex++;
      }

      if (filters.isAddOn !== undefined) {
        sql += ` AND f.is_add_on = $${paramIndex}`;
        params.push(filters.isAddOn);
        paramIndex++;
      }

      if (filters.minTier) {
        sql += ` AND f.min_tier = $${paramIndex}`;
        params.push(filters.minTier);
        paramIndex++;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, null, {
        operation: 'findByProduct',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error in findByProduct', {
        table: this.tableName,
        productId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find all features (admin view)
   * @param {Object} filters - Optional filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} { features: [], total: number }
   */
  async findAll(filters: FindAllFilters = {}, options: FindAllOptions = {}): Promise<FindAllResult> {
    try {
      const { limit = 50, offset = 0, orderBy = 'f.created_at DESC' } = options;
      
      let sql = `
        SELECT f.*, p.name as product_name, p.slug as product_slug,
               (SELECT COUNT(DISTINCT organization_id) 
                FROM organization_feature_grants 
                WHERE feature_id = f.id AND is_active = TRUE) as organizations_using
        FROM ${this.tableName} f
        JOIN products p ON f.product_id = p.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      // Add filters
      if (filters.productId) {
        sql += ` AND f.product_id = $${paramIndex}`;
        params.push(filters.productId);
        paramIndex++;
      }

      if (filters.status) {
        sql += ` AND f.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.search) {
        sql += ` AND (f.feature_name ILIKE $${paramIndex} OR f.feature_key ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Get total count
      const countSql = `SELECT COUNT(*) as count FROM (${sql}) as subquery`;
      const countResult = await query(countSql, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Add pagination
      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, null, {
        operation: 'findAll',
        table: this.tableName
      });

      return {
        features: result.rows.map(row => mapDbToApi(row)),
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      this.logger.error('Error in findAll', {
        table: this.tableName,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new feature
   * @param {Object} data - Feature data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const sql = `
        INSERT INTO ${this.tableName} (
          id, product_id, feature_key, feature_name, description, category,
          status, min_tier, is_add_on, pricing, required_features, conflicting_features,
          config_schema, default_config, has_usage_limit, default_usage_limit, usage_limit_unit,
          rollout_percentage, target_organizations, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        RETURNING *
      `;

      const values = [
        id,
        data.productId,
        data.featureKey,
        data.featureName,
        data.description || null,
        data.category || null,
        data.status || 'beta',
        data.minTier || null,
        data.isAddOn || false,
        JSON.stringify(data.pricing || {}),
        JSON.stringify(data.requiredFeatures || []),
        JSON.stringify(data.conflictingFeatures || []),
        JSON.stringify(data.configSchema || {}),
        JSON.stringify(data.defaultConfig || {}),
        data.hasUsageLimit || false,
        data.defaultUsageLimit || null,
        data.usageLimitUnit || null,
        data.rolloutPercentage || 100,
        JSON.stringify(data.targetOrganizations || []),
        data.createdBy || null,
        now,
        now
      ];

      const result = await query(sql, values, null, {
        operation: 'create',
        table: this.tableName
      });

      this.logger.info('Feature created', {
        table: this.tableName,
        id,
        featureKey: data.featureKey
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in create', {
        table: this.tableName,
        data,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update a feature
   * @param {string} id - Feature ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    try {
      const allowedFields = [
        'feature_name', 'description', 'category', 'status', 'min_tier', 
        'is_add_on', 'pricing', 'required_features', 'conflicting_features',
        'config_schema', 'default_config', 'has_usage_limit', 'default_usage_limit',
        'usage_limit_unit', 'rollout_percentage', 'target_organizations',
        'deprecated_at', 'deprecation_message'
      ];

      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        if (allowedFields.includes(snakeKey)) {
          updates.push(`${snakeKey} = $${paramIndex}`);
          
          // Handle JSONB fields
          if (['pricing', 'required_features', 'conflicting_features', 'config_schema', 'default_config', 'target_organizations'].includes(snakeKey)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return await this.findById(id);
      }

      updates.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      values.push(id);

      const sql = `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await query(sql, values, null, {
        operation: 'update',
        table: this.tableName
      });

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('Feature updated', {
        table: this.tableName,
        id
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in update', {
        table: this.tableName,
        id,
        data,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Deprecate a feature (soft delete with message)
   * @param {string} id - Feature ID
   * @param {string} message - Deprecation message
   * @returns {Promise<Object|null>}
   */
  async deprecate(id, message) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET status = 'deprecated',
            deprecated_at = $1,
            deprecation_message = $2,
            updated_at = $1
        WHERE id = $3
        RETURNING *
      `;

      const result = await query(sql, [new Date(), message, id], null, {
        operation: 'deprecate',
        table: this.tableName
      });

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('Feature deprecated', {
        table: this.tableName,
        id,
        message
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in deprecate', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate feature dependencies
   * @param {string} featureId - Feature ID
   * @param {Array} organizationFeatures - Array of feature keys org already has
   * @returns {Promise<Object>} { isValid: boolean, missingFeatures: [] }
   */
  async validateDependencies(featureId, organizationFeatures) {
    try {
      const feature = await this.findById(featureId);
      
      if (!feature || !feature.requiredFeatures || feature.requiredFeatures.length === 0) {
        return { isValid: true, missingFeatures: [] };
      }

      const missingFeatures = feature.requiredFeatures.filter(
        key => !organizationFeatures.includes(key)
      );

      return {
        isValid: missingFeatures.length === 0,
        missingFeatures
      };
    } catch (error) {
      this.logger.error('Error in validateDependencies', {
        table: this.tableName,
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check for feature conflicts
   * @param {string} featureId - Feature ID
   * @param {Array} organizationFeatures - Array of feature keys org already has
   * @returns {Promise<Object>} { hasConflicts: boolean, conflictingFeatures: [] }
   */
  async checkConflicts(featureId, organizationFeatures) {
    try {
      const feature = await this.findById(featureId);
      
      if (!feature || !feature.conflictingFeatures || feature.conflictingFeatures.length === 0) {
        return { hasConflicts: false, conflictingFeatures: [] };
      }

      const conflictingFeatures = feature.conflictingFeatures.filter(
        key => organizationFeatures.includes(key)
      );

      return {
        hasConflicts: conflictingFeatures.length > 0,
        conflictingFeatures
      };
    } catch (error) {
      this.logger.error('Error in checkConflicts', {
        table: this.tableName,
        featureId,
        error: error.message
      });
      throw error;
    }
  }
}

export default FeatureRepository;
