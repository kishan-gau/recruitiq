/**
 * FeatureGrantRepository - Manages organization feature grants
 * Handles which organizations have access to which features
 * 
 * This is the core of feature access control - grants determine
 * whether an organization can use a specific feature
 */

import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { mapDbToApi } from '../utils/dtoMapper.js';

export class FeatureGrantRepository {
  constructor() {
    this.tableName = 'organization_feature_grants';
    this.logger = logger;
  }

  /**
   * Find grant by ID
   * @param {string} id - Grant ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    try {
      const sql = `
        SELECT 
          ofg.*,
          f.feature_key, f.feature_name, f.product_id, f.has_usage_limit,
          p.name as product_name, p.slug as product_slug,
          o.name as organization_name, o.slug as organization_slug
        FROM ${this.tableName} ofg
        JOIN features f ON ofg.feature_id = f.id
        JOIN products p ON f.product_id = p.id
        JOIN organizations o ON ofg.organization_id = o.id
        WHERE ofg.id = $1
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
   * Find active grant for organization and feature
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<Object|null>}
   */
  async findActiveGrant(organizationId, featureId) {
    try {
      const sql = `
        SELECT 
          ofg.*,
          f.feature_key, f.feature_name, f.product_id,
          p.name as product_name, p.slug as product_slug
        FROM ${this.tableName} ofg
        JOIN features f ON ofg.feature_id = f.id
        JOIN products p ON f.product_id = p.id
        WHERE ofg.organization_id = $1 
        AND ofg.feature_id = $2
        AND ofg.is_active = TRUE
        AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
        LIMIT 1
      `;
      
      const result = await query(sql, [organizationId, featureId], organizationId, {
        operation: 'findActiveGrant',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error in findActiveGrant', {
        table: this.tableName,
        organizationId,
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find active grant by feature key
   * @param {string} organizationId - Organization ID
   * @param {string} featureKey - Feature key
   * @param {string} productId - Product ID (optional)
   * @returns {Promise<Object|null>}
   */
  async findActiveGrantByKey(organizationId, featureKey, productId = null) {
    try {
      let sql = `
        SELECT 
          ofg.*,
          f.feature_key, f.feature_name, f.product_id, f.config_schema, f.default_config,
          f.has_usage_limit, f.default_usage_limit, f.usage_limit_unit,
          p.name as product_name, p.slug as product_slug
        FROM ${this.tableName} ofg
        JOIN features f ON ofg.feature_id = f.id
        JOIN products p ON f.product_id = p.id
        WHERE ofg.organization_id = $1 
        AND f.feature_key = $2
        AND ofg.is_active = TRUE
        AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
      `;
      
      const params = [organizationId, featureKey];

      if (productId) {
        sql += ` AND f.product_id = $3`;
        params.push(productId);
      }

      sql += ` LIMIT 1`;

      const result = await query(sql, params, organizationId, {
        operation: 'findActiveGrantByKey',
        table: this.tableName
      });

      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error in findActiveGrantByKey', {
        table: this.tableName,
        organizationId,
        featureKey,
        productId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find all grants for an organization
   * @param {string} organizationId - Organization ID
   * @param {Object} filters - Optional filters (productId, isActive, grantedVia)
   * @returns {Promise<Array>}
   */
  async findByOrganization(organizationId, filters = {}) {
    try {
      let sql = `
        SELECT 
          ofg.*,
          f.feature_key, f.feature_name, f.product_id, f.category, f.status,
          p.name as product_name, p.slug as product_slug,
          CASE 
            WHEN ofg.usage_limit IS NOT NULL 
            THEN ofg.usage_limit - ofg.current_usage 
            ELSE NULL 
          END as remaining_usage
        FROM ${this.tableName} ofg
        JOIN features f ON ofg.feature_id = f.id
        JOIN products p ON f.product_id = p.id
        WHERE ofg.organization_id = $1
      `;
      
      const params = [organizationId];
      let paramIndex = 2;

      // Add filters
      if (filters.productId) {
        sql += ` AND f.product_id = $${paramIndex}`;
        params.push(filters.productId);
        paramIndex++;
      }

      if (filters.isActive !== undefined) {
        sql += ` AND ofg.is_active = $${paramIndex}`;
        params.push(filters.isActive);
        paramIndex++;
      }

      if (filters.grantedVia) {
        sql += ` AND ofg.granted_via = $${paramIndex}`;
        params.push(filters.grantedVia);
        paramIndex++;
      }

      if (filters.notExpired) {
        sql += ` AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())`;
      }

      sql += ` ORDER BY f.category, f.feature_name`;

      const result = await query(sql, params, organizationId, {
        operation: 'findByOrganization',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error in findByOrganization', {
        table: this.tableName,
        organizationId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Find all grants for a feature (admin view)
   * @param {string} featureId - Feature ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findByFeature(featureId, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;

      const sql = `
        SELECT 
          ofg.*,
          o.name as organization_name, o.slug as organization_slug, o.tier as organization_tier
        FROM ${this.tableName} ofg
        JOIN organizations o ON ofg.organization_id = o.id
        WHERE ofg.feature_id = $1
        ORDER BY ofg.granted_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(sql, [featureId, limit, offset], null, {
        operation: 'findByFeature',
        table: this.tableName
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error in findByFeature', {
        table: this.tableName,
        featureId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new feature grant
   * @param {Object} data - Grant data
   * @returns {Promise<Object>}
   */
  async create(data) {
    try {
      const id = uuidv4();
      const now = new Date();
      
      const sql = `
        INSERT INTO ${this.tableName} (
          id, organization_id, feature_id, granted_via, granted_reason,
          is_active, config, expires_at, auto_renew, usage_limit,
          current_usage, last_usage_at, usage_reset_at, billing_status,
          subscription_id, granted_by, granted_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `;

      const values = [
        id,
        data.organizationId,
        data.featureId,
        data.grantedVia,
        data.grantedReason || null,
        data.isActive !== undefined ? data.isActive : true,
        JSON.stringify(data.config || {}),
        data.expiresAt || null,
        data.autoRenew || false,
        data.usageLimit || null,
        data.currentUsage || 0,
        data.lastUsageAt || null,
        data.usageResetAt || null,
        data.billingStatus || null,
        data.subscriptionId || null,
        data.grantedBy || null,
        now,
        now,
        now
      ];

      const result = await query(sql, values, data.organizationId, {
        operation: 'create',
        table: this.tableName
      });

      this.logger.info('Feature grant created', {
        table: this.tableName,
        id,
        organizationId: data.organizationId,
        featureId: data.featureId,
        grantedVia: data.grantedVia
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
   * Update a grant
   * @param {string} id - Grant ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    try {
      const allowedFields = [
        'is_active', 'config', 'expires_at', 'auto_renew', 'usage_limit',
        'current_usage', 'last_usage_at', 'usage_reset_at', 'billing_status',
        'subscription_id', 'revoked_at', 'revoked_by', 'revoked_reason'
      ];

      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(data)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        if (allowedFields.includes(snakeKey)) {
          updates.push(`${snakeKey} = $${paramIndex}`);
          
          // Handle JSONB fields
          if (snakeKey === 'config') {
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

      this.logger.info('Feature grant updated', {
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
   * Increment usage counter
   * @param {string} id - Grant ID
   * @param {number} amount - Amount to increment by (default 1)
   * @returns {Promise<Object|null>}
   */
  async incrementUsage(id, amount = 1) {
    try {
      const sql = `
        UPDATE ${this.tableName}
        SET current_usage = current_usage + $1,
            last_usage_at = $2,
            updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await query(sql, [amount, new Date(), id], null, {
        operation: 'incrementUsage',
        table: this.tableName
      });

      if (result.rows.length === 0) {
        return null;
      }

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in incrementUsage', {
        table: this.tableName,
        id,
        amount,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Revoke a grant (soft deactivation)
   * @param {string} id - Grant ID
   * @param {string} revokedBy - User ID who revoked
   * @param {string} reason - Revocation reason
   * @returns {Promise<Object|null>}
   */
  async revoke(id, revokedBy, reason) {
    try {
      const now = new Date();
      
      const sql = `
        UPDATE ${this.tableName}
        SET is_active = FALSE,
            revoked_at = $1,
            revoked_by = $2,
            revoked_reason = $3,
            updated_at = $1
        WHERE id = $4
        RETURNING *
      `;

      const result = await query(sql, [now, revokedBy, reason, id], null, {
        operation: 'revoke',
        table: this.tableName
      });

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info('Feature grant revoked', {
        table: this.tableName,
        id,
        revokedBy,
        reason
      });

      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error in revoke', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk grant features to organization (used for tier syncs)
   * @param {string} organizationId - Organization ID
   * @param {Array} featureIds - Array of feature IDs to grant
   * @param {string} grantedVia - How features are granted
   * @param {string} grantedBy - User ID who granted
   * @returns {Promise<Array>}
   */
  async bulkGrant(organizationId, featureIds, grantedVia, grantedBy) {
    try {
      const grants = [];
      const now = new Date();

      for (const featureId of featureIds) {
        const id = uuidv4();
        grants.push({
          id,
          organizationId,
          featureId,
          grantedVia,
          grantedBy,
          now
        });
      }

      if (grants.length === 0) {
        return [];
      }

      // Build bulk insert query
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      grants.forEach(grant => {
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
        );
        values.push(
          grant.id,
          grant.organizationId,
          grant.featureId,
          grant.grantedVia,
          grant.grantedBy,
          grant.now,
          grant.now
        );
        paramIndex += 7;
      });

      const sql = `
        INSERT INTO ${this.tableName} (
          id, organization_id, feature_id, granted_via, granted_by, granted_at, created_at
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (organization_id, feature_id) DO UPDATE
        SET is_active = TRUE,
            granted_via = EXCLUDED.granted_via,
            granted_by = EXCLUDED.granted_by,
            granted_at = EXCLUDED.granted_at,
            updated_at = EXCLUDED.created_at
        RETURNING *
      `;

      const result = await query(sql, values, organizationId, {
        operation: 'bulkGrant',
        table: this.tableName
      });

      this.logger.info('Bulk feature grants created', {
        table: this.tableName,
        organizationId,
        count: result.rows.length
      });

      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error in bulkGrant', {
        table: this.tableName,
        organizationId,
        featureIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Bulk revoke features from organization (used for tier downgrades)
   * @param {string} organizationId - Organization ID
   * @param {Array} featureIds - Array of feature IDs to revoke
   * @param {string} revokedBy - User ID who revoked
   * @param {string} reason - Revocation reason
   * @returns {Promise<number>} Number of grants revoked
   */
  async bulkRevoke(organizationId, featureIds, revokedBy, reason) {
    try {
      if (featureIds.length === 0) {
        return 0;
      }

      const now = new Date();
      const placeholders = featureIds.map((_, i) => `$${i + 5}`).join(', ');

      const sql = `
        UPDATE ${this.tableName}
        SET is_active = FALSE,
            revoked_at = $1,
            revoked_by = $2,
            revoked_reason = $3,
            updated_at = $1
        WHERE organization_id = $4
        AND feature_id IN (${placeholders})
        AND is_active = TRUE
      `;

      const result = await query(
        sql, 
        [now, revokedBy, reason, organizationId, ...featureIds], 
        organizationId,
        {
          operation: 'bulkRevoke',
          table: this.tableName
        }
      );

      this.logger.info('Bulk feature grants revoked', {
        table: this.tableName,
        organizationId,
        count: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      this.logger.error('Error in bulkRevoke', {
        table: this.tableName,
        organizationId,
        featureIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if grant exists
   * @param {string} organizationId - Organization ID
   * @param {string} featureId - Feature ID
   * @returns {Promise<boolean>}
   */
  async exists(organizationId, featureId) {
    try {
      const sql = `
        SELECT EXISTS(
          SELECT 1 FROM ${this.tableName}
          WHERE organization_id = $1
          AND feature_id = $2
        ) as exists
      `;

      const result = await query(sql, [organizationId, featureId], organizationId, {
        operation: 'exists',
        table: this.tableName
      });

      return result.rows[0].exists;
    } catch (error) {
      this.logger.error('Error in exists', {
        table: this.tableName,
        organizationId,
        featureId,
        error: error.message
      });
      throw error;
    }
  }
}

export default FeatureGrantRepository;
