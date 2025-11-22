import { query } from '../../../config/database.js';

/**
 * Role Model
 * Organization-scoped roles with permissions
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class Role {
  /**
   * Create a new role
   * @param {Object} data - Role data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the action
   * @returns {Promise<Object>} Created role
   */
  static async create(data, organizationId, userId) {
    const result = await query(
      `
      INSERT INTO roles (
        organization_id, name, display_name, description, product,
        is_system, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        organizationId,
        data.name,
        data.display_name || data.name,
        data.description || null,
        data.product || null,
        false, // User-created roles are never system roles
        true,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'roles' }
    );

    return result.rows[0];
  }

  /**
   * Find role by ID (with organization check)
   * @param {string} id - Role UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Role object or null
   */
  static async findById(id, organizationId) {
    const result = await query(
      `
      SELECT * FROM roles
      WHERE id = $1 
        AND (organization_id = $2 OR organization_id IS NULL)
        AND deleted_at IS NULL
      `,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );
    return result.rows[0] || null;
  }

  /**
   * Find role with its permissions
   * @param {string} id - Role UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Role with permissions or null
   */
  static async findByIdWithPermissions(id, organizationId) {
    const result = await query(
      `
      SELECT 
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'name', p.name,
              'description', p.description,
              'product', p.product,
              'category', p.category
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
      WHERE r.id = $1 
        AND (r.organization_id = $2 OR r.organization_id IS NULL)
        AND r.deleted_at IS NULL
      GROUP BY r.id
      `,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );
    return result.rows[0] || null;
  }

  /**
   * Find all roles for an organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of roles
   */
  static async findAll(organizationId, filters = {}) {
    let sql = `
      SELECT 
        r.*,
        COUNT(DISTINCT ur.user_id) FILTER (WHERE ur.revoked_at IS NULL) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.revoked_at IS NULL
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE (r.organization_id = $1 OR r.organization_id IS NULL)
        AND r.deleted_at IS NULL
    `;
    
    const values = [organizationId];
    let paramCount = 1;

    if (filters.product !== undefined) {
      paramCount++;
      sql += ` AND (r.product = $${paramCount} OR r.product IS NULL)`;
      values.push(filters.product);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      sql += ` AND r.is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.isSystem !== undefined) {
      paramCount++;
      sql += ` AND r.is_system = $${paramCount}`;
      values.push(filters.isSystem);
    }

    sql += `
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.level DESC, r.name ASC
    `;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'roles'
    });
    
    return result.rows;
  }

  /**
   * Update role
   * @param {string} id - Role UUID
   * @param {Object} data - Updated data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the action
   * @returns {Promise<Object|null>} Updated role or null
   */
  static async update(id, data, organizationId, userId) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    if (data.name !== undefined) {
      paramCount++;
      fields.push(`name = $${paramCount}`);
      values.push(data.name);
    }

    if (data.display_name !== undefined) {
      paramCount++;
      fields.push(`display_name = $${paramCount}`);
      values.push(data.display_name);
    }

    if (data.description !== undefined) {
      paramCount++;
      fields.push(`description = $${paramCount}`);
      values.push(data.description);
    }

    if (data.isActive !== undefined) {
      paramCount++;
      fields.push(`is_active = $${paramCount}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated metadata
    paramCount++;
    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${paramCount}`);
    values.push(userId);

    // Add WHERE conditions
    paramCount++;
    values.push(id);
    const idParam = paramCount;

    paramCount++;
    values.push(organizationId);
    const orgParam = paramCount;

    const sql = `
      UPDATE roles
      SET ${fields.join(', ')}
      WHERE id = $${idParam}
        AND organization_id = $${orgParam}
        AND deleted_at IS NULL
        AND is_system = false
      RETURNING *
    `;

    const result = await query(sql, values, organizationId, {
      operation: 'UPDATE',
      table: 'roles'
    });

    return result.rows[0] || null;
  }

  /**
   * Soft delete role
   * @param {string} id - Role UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the action
   * @returns {Promise<boolean>} True if deleted
   */
  static async softDelete(id, organizationId, userId) {
    const result = await query(
      `
      UPDATE roles
      SET deleted_at = NOW(), deleted_by = $1
      WHERE id = $2
        AND organization_id = $3
        AND deleted_at IS NULL
        AND is_system = false
      RETURNING id
      `,
      [userId, id, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'roles' }
    );

    return result.rows.length > 0;
  }

  /**
   * Assign permissions to role
   * @param {string} roleId - Role UUID
   * @param {Array<string>} permissionIds - Array of permission UUIDs
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing the action
   * @returns {Promise<boolean>} True if successful
   */
  static async assignPermissions(roleId, permissionIds, organizationId, userId) {
    // Verify role belongs to organization
    const role = await this.findById(roleId, organizationId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Clear existing permissions
    await query(
      `DELETE FROM role_permissions WHERE role_id = $1`,
      [roleId]
    );

    // Insert new permissions
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds
        .map((permId, idx) => `($1, $${idx + 2}, NOW(), $${permissionIds.length + 2})`)
        .join(', ');

      await query(
        `INSERT INTO role_permissions (role_id, permission_id, created_at, created_by)
         VALUES ${values}`,
        [roleId, ...permissionIds, userId]
      );
    }

    return true;
  }
}

export default Role;
