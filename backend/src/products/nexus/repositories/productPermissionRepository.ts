/**
 * ProductPermission Repository
 * Database operations for ProductPermission model
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import ProductPermission from '../models/ProductPermission.js';

class ProductPermissionRepository {
  
  logger: any;

  query: any;

constructor(database = null) {
    this.query = database?.query || query;
    this.logger = logger;
  }

  /**
   * Find all permissions for an organization
   */
  async findByOrganization(organizationId) {
    try {
      const sql = `
        SELECT pp.*, p.name as product_name, p.display_name, p.slug
        FROM product_permissions pp
        JOIN products p ON pp.product_id = p.id
        WHERE pp.organization_id = $1 AND pp.revoked_at IS NULL
        ORDER BY p.is_core DESC, p.name ASC
      `;
      const result = await this.query(sql, [organizationId], organizationId);
      return result.rows.map(row => new ProductPermission(row));
    } catch (error) {
      this.logger.error('Error finding permissions by organization', { organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all permissions for a product
   */
  async findByProduct(productId) {
    const sql = `
      SELECT pp.*, o.name as organization_name
      FROM product_permissions pp
      JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.product_id = $1 AND pp.revoked_at IS NULL
      ORDER BY o.name ASC
    `;
    const result = await this.query(sql, [productId]);
    return result.rows.map(row => new ProductPermission(row));
  }

  /**
   * Find specific permission
   */
  async findByOrganizationAndProduct(organizationId, productId) {
    const sql = `
      SELECT * FROM product_permissions 
      WHERE organization_id = $1 AND product_id = $2 AND revoked_at IS NULL
    `;
    const result = await this.query(sql, [organizationId, productId]);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }

  /**
   * Find enabled permissions for an organization
   */
  async findEnabledByOrganization(organizationId) {
    const sql = `
      SELECT pp.*, p.name as product_name, p.display_name, p.slug, p.base_path, p.ui_config
      FROM product_permissions pp
      JOIN products p ON pp.product_id = p.id
      WHERE pp.organization_id = $1 
        AND pp.is_enabled = TRUE 
        AND pp.revoked_at IS NULL
        AND (pp.license_expires_at IS NULL OR pp.license_expires_at > NOW())
      ORDER BY p.is_core DESC, p.name ASC
    `;
    const result = await this.query(sql, [organizationId]);
    return result.rows.map(row => new ProductPermission(row));
  }

  /**
   * Find expired licenses
   */
  async findExpiredLicenses() {
    const sql = `
      SELECT pp.*, o.name as organization_name, p.name as product_name
      FROM product_permissions pp
      JOIN organizations o ON pp.organization_id = o.id
      JOIN products p ON pp.product_id = p.id
      WHERE pp.license_expires_at < NOW() 
        AND pp.is_enabled = TRUE 
        AND pp.revoked_at IS NULL
    `;
    const result = await this.query(sql, [], null);
    return result.rows.map(row => new ProductPermission(row));
  }

  /**
   * Create or update permission
   */
  async upsert(permissionData, userId) {
    const sql = `
      INSERT INTO product_permissions (
        organization_id, product_id, is_enabled, access_level,
        license_key, license_expires_at, max_users, max_resources,
        enabled_features, disabled_features, notes, granted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (organization_id, product_id) 
      DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        access_level = EXCLUDED.access_level,
        license_key = EXCLUDED.license_key,
        license_expires_at = EXCLUDED.license_expires_at,
        max_users = EXCLUDED.max_users,
        max_resources = EXCLUDED.max_resources,
        enabled_features = EXCLUDED.enabled_features,
        disabled_features = EXCLUDED.disabled_features,
        notes = EXCLUDED.notes,
        granted_by = EXCLUDED.granted_by,
        granted_at = NOW(),
        revoked_at = NULL
      RETURNING *
    `;

    const values = [
      permissionData.organizationId,
      permissionData.productId,
      permissionData.isEnabled !== undefined ? permissionData.isEnabled : true,
      permissionData.accessLevel || 'full',
      permissionData.licenseKey,
      permissionData.licenseExpiresAt,
      permissionData.maxUsers,
      permissionData.maxResources,
      JSON.stringify(permissionData.enabledFeatures),
      JSON.stringify(permissionData.disabledFeatures),
      permissionData.notes,
      userId
    ];

    const result = await this.query(sql, values);
    return new ProductPermission(result.rows[0]);
  }

  /**
   * Update permission
   */
  async update(organizationId, productId, updateData) {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (updateData.isEnabled !== undefined) {
      updates.push(`is_enabled = $${paramCount++}`);
      values.push(updateData.isEnabled);
    }
    if (updateData.accessLevel !== undefined) {
      updates.push(`access_level = $${paramCount++}`);
      values.push(updateData.accessLevel);
    }
    if (updateData.licenseKey !== undefined) {
      updates.push(`license_key = $${paramCount++}`);
      values.push(updateData.licenseKey);
    }
    if (updateData.licenseExpiresAt !== undefined) {
      updates.push(`license_expires_at = $${paramCount++}`);
      values.push(updateData.licenseExpiresAt);
    }
    if (updateData.maxUsers !== undefined) {
      updates.push(`max_users = $${paramCount++}`);
      values.push(updateData.maxUsers);
    }
    if (updateData.maxResources !== undefined) {
      updates.push(`max_resources = $${paramCount++}`);
      values.push(updateData.maxResources);
    }
    if (updateData.enabledFeatures !== undefined) {
      updates.push(`enabled_features = $${paramCount++}`);
      values.push(JSON.stringify(updateData.enabledFeatures));
    }
    if (updateData.disabledFeatures !== undefined) {
      updates.push(`disabled_features = $${paramCount++}`);
      values.push(JSON.stringify(updateData.disabledFeatures));
    }
    if (updateData.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(updateData.notes);
    }

    if (updates.length === 0) {
      return this.findByOrganizationAndProduct(organizationId, productId);
    }

    values.push(organizationId, productId);

    const sql = `
      UPDATE product_permissions 
      SET ${updates.join(', ')} 
      WHERE organization_id = $${paramCount++} 
        AND product_id = $${paramCount++}
        AND revoked_at IS NULL
      RETURNING *
    `;

    const result = await this.query(sql, values);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }

  /**
   * Revoke permission
   */
  async revoke(organizationId, productId, userId) {
    const sql = `
      UPDATE product_permissions 
      SET revoked_at = NOW(), revoked_by = $1, is_enabled = FALSE
      WHERE organization_id = $2 AND product_id = $3 AND revoked_at IS NULL
      RETURNING *
    `;
    const result = await this.query(sql, [userId, organizationId, productId]);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }

  /**
   * Update usage counters
   */
  async updateUsage(organizationId, productId, usersCount, resourcesCount) {
    const sql = `
      UPDATE product_permissions 
      SET 
        users_count = $1,
        resources_count = $2,
        last_accessed_at = NOW()
      WHERE organization_id = $3 AND product_id = $4 AND revoked_at IS NULL
      RETURNING *
    `;
    const result = await this.query(sql, [usersCount, resourcesCount, organizationId, productId]);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }

  /**
   * Increment users count
   */
  async incrementUsersCount(organizationId, productId) {
    const sql = `
      UPDATE product_permissions 
      SET users_count = users_count + 1, last_accessed_at = NOW()
      WHERE organization_id = $1 AND product_id = $2 AND revoked_at IS NULL
      RETURNING *
    `;
    const result = await this.query(sql, [organizationId, productId]);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }

  /**
   * Decrement users count
   */
  async decrementUsersCount(organizationId, productId) {
    const sql = `
      UPDATE product_permissions 
      SET users_count = GREATEST(users_count - 1, 0), last_accessed_at = NOW()
      WHERE organization_id = $1 AND product_id = $2 AND revoked_at IS NULL
      RETURNING *
    `;
    const result = await this.query(sql, [organizationId, productId]);
    return result.rows.length > 0 ? new ProductPermission(result.rows[0]) : null;
  }
}

export default ProductPermissionRepository;

