import { query } from '../../../config/database.js';

/**
 * Permission Model
 * System-defined permissions for all products
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class Permission {
  /**
   * Find permission by ID
   * @param {string} id - Permission UUID
   * @returns {Promise<Object|null>} Permission object or null
   */
  static async findById(id) {
    const result = await query(
      `SELECT * FROM permissions WHERE id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find permission by code
   * @param {string} code - Permission code (e.g., 'payroll:run:create')
   * @returns {Promise<Object|null>} Permission object or null
   */
  static async findByCode(code) {
    const result = await query(
      `SELECT * FROM permissions WHERE name = $1 AND is_active = true`,
      [code]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all permissions with optional filters
   * @param {Object} filters - Optional filters
   * @param {string} filters.product - Filter by product
   * @param {string} filters.category - Filter by category
   * @returns {Promise<Array>} Array of permission objects
   */
  static async findAll(filters = {}) {
    let sql = `SELECT * FROM permissions WHERE is_active = true`;
    const values = [];
    let paramCount = 0;

    if (filters.product) {
      paramCount++;
      sql += ` AND product = $${paramCount}`;
      values.push(filters.product);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    sql += ` ORDER BY product, category, display_order, name`;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get permissions grouped by product and category
   * @returns {Promise<Array>} Array of grouped permissions
   */
  static async findGrouped() {
    const result = await query(`
      SELECT 
        product,
        category,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'description', description,
            'display_order', display_order
          ) ORDER BY display_order, name
        ) as permissions
      FROM permissions
      WHERE is_active = true
      GROUP BY product, category
      ORDER BY product, category
    `);
    return result.rows;
  }

  /**
   * Get permissions for specific role IDs
   * @param {Array<string>} roleIds - Array of role UUIDs
   * @returns {Promise<Array>} Array of permission objects
   */
  static async findByRoleIds(roleIds) {
    if (!roleIds || roleIds.length === 0) return [];

    const result = await query(
      `
      SELECT DISTINCT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ANY($1)
        AND p.is_active = true
      ORDER BY p.product, p.category, p.display_order
      `,
      [roleIds]
    );
    return result.rows;
  }

  /**
   * Check if permissions exist
   * @param {Array<string>} permissionIds - Array of permission UUIDs
   * @returns {Promise<boolean>} True if all permissions exist
   */
  static async exists(permissionIds) {
    if (!permissionIds || permissionIds.length === 0) return false;

    const result = await query(
      `
      SELECT COUNT(*) as count
      FROM permissions
      WHERE id = ANY($1) AND is_active = true
      `,
      [permissionIds]
    );

    return parseInt(result.rows[0].count) === permissionIds.length;
  }
}

export default Permission;
