import { query } from '../../../config/database.ts';

/**
 * UserRole Model
 * Manages user-role assignments with product context
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class UserRole {
  /**
   * Assign role to user
   * @param {string} userId - User UUID
   * @param {string} roleId - Role UUID
   * @param {string|null} product - Product slug (optional)
   * @param {string} organizationId - Organization UUID
   * @param {string} assignedBy - User UUID performing the action
   * @returns {Promise<Object>} Assignment record
   */
  static async assign(userId, roleId, product, organizationId, assignedBy) {
    const result = await query(
      `
      INSERT INTO public.user_roles (
        user_id, role_id, created_by
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id)
      DO UPDATE SET
        deleted_at = NULL,
        deleted_by = NULL,
        created_by = $3
      RETURNING *
      `,
      [userId, roleId, assignedBy],
      organizationId,
      { operation: 'INSERT', table: 'user_roles' }
    );

    return result.rows[0];
  }

  /**
   * Revoke role from user
   * @param {string} userId - User UUID
   * @param {string} roleId - Role UUID
   * @param {string|null} product - Product slug (optional)
   * @param {string} organizationId - Organization UUID
   * @param {string} revokedBy - User UUID performing the action
   * @returns {Promise<boolean>} True if revoked
   */
  static async revoke(userId, roleId, product, organizationId, revokedBy) {
    const result = await query(
      `
      UPDATE public.user_roles
      SET deleted_at = NOW(), deleted_by = $1
      WHERE user_id = $2
        AND role_id = $3
        AND deleted_at IS NULL
      RETURNING *
      `,
      [revokedBy, userId, roleId],
      organizationId,
      { operation: 'UPDATE', table: 'user_roles' }
    );

    return result.rows.length > 0;
  }

  /**
   * Get all roles for a user
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @param {string|null} product - Product slug (optional filter)
   * @returns {Promise<Array>} Array of user roles
   */
  static async findByUserId(userId, organizationId, product = null) {
    let sql = `
      SELECT 
        ur.*,
        r.name as role_name,
        r.display_name as role_display_name,
        r.description as role_description,
        r.role_type as role_type,
        r.level as role_level
      FROM public.user_roles ur
      INNER JOIN public.roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
      WHERE ur.user_id = $1
        AND (r.organization_id = $2 OR r.organization_id IS NULL)
        AND ur.deleted_at IS NULL
    `;
    
    const values = [userId, organizationId];

    sql += ` ORDER BY r.level DESC, r.name`;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows;
  }

  /**
   * Get all users with a specific role
   * @param {string} roleId - Role UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of users with the role
   */
  static async findByRoleId(roleId, organizationId) {
    const result = await query(
      `
      SELECT 
        ur.*,
        u.email,
        u.employee_id
      FROM public.user_roles ur
      INNER JOIN hris.user_account u ON ur.user_id = u.id
      WHERE ur.role_id = $1
        AND u.organization_id = $2
        AND ur.deleted_at IS NULL
      ORDER BY u.email
      `,
      [roleId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'user_roles' }
    );

    return result.rows;
  }

  /**
   * Get user's permissions (flattened from all roles)
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @param {string|null} product - Product slug (optional filter)
   * @returns {Promise<Array>} Array of permission objects
   */
  static async getUserPermissions(userId, organizationId, product = null) {
    let sql = `
      SELECT DISTINCT p.name as code, p.name, p.product, p.category, p.description
      FROM public.user_roles ur
      INNER JOIN public.roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
      INNER JOIN public.role_permissions rp ON r.id = rp.role_id
      INNER JOIN public.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
        AND (r.organization_id = $2 OR r.organization_id IS NULL)
        AND ur.deleted_at IS NULL
     ORDER BY p.product, p.category, p.name
    `;

    const result = await query(sql, [userId, organizationId], organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows;
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - User UUID
   * @param {string} permissionCode - Permission code
   * @param {string} organizationId - Organization UUID
   * @param {string|null} product - Product slug (optional)
   * @returns {Promise<boolean>} True if user has permission
   */
  static async hasPermission(userId, permissionCode, organizationId, product = null) {
    let sql = `
      SELECT EXISTS(
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
        INNER JOIN public.role_permissions rp ON r.id = rp.role_id
        INNER JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
          AND (r.organization_id = $2 OR r.organization_id IS NULL)
          AND p.name = $3
          AND ur.deleted_at IS NULL
      ) as has_permission
    `;

    const result = await query(sql, [userId, organizationId, permissionCode], organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows[0]?.has_permission || false;
  }

  /**
   * Bulk assign roles to user
   * @param {string} userId - User UUID
   * @param {Array<Object>} roleAssignments - Array of {roleId, product}
   * @param {string} organizationId - Organization UUID
   * @param {string} assignedBy - User UUID performing the action
   * @returns {Promise<Array>} Array of assignment records
   */
  static async bulkAssign(userId, roleAssignments, organizationId, assignedBy) {
    const results = [];

    for (const assignment of roleAssignments) {
      const result = await this.assign(
        userId,
        assignment.roleId,
        assignment.product,
        organizationId,
        assignedBy
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Remove all roles from user
   * @param {string} userId - User UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} revokedBy - User UUID performing the action
   * @returns {Promise<number>} Number of roles revoked
   */
  static async revokeAllForProduct(userId, product, organizationId, revokedBy) {
    const result = await query(
      `
      UPDATE public.user_roles
      SET deleted_at = NOW(), deleted_by = $1
      WHERE user_id = $2
        AND deleted_at IS NULL
      RETURNING id
      `,
      [revokedBy, userId],
      organizationId,
      { operation: 'UPDATE', table: 'user_roles' }
    );

    return result.rows.length;
  }
}

export default UserRole;
