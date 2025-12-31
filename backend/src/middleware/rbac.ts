/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Provides permission-based and role-based authorization for API endpoints.
 * Works with the centralized RBAC system (public.roles, public.permissions, etc.)
 * 
 * @module middleware/rbac
 */

import { query } from '../config/database.js';
import { ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * RBAC middleware - checks if user has required permission(s)
 * 
 * @param {string|Array<string>} requiredPermission - Permission(s) required (e.g., 'payroll_runs:create')
 * @param {Object} options - Additional options
 * @param {boolean} options.requireAll - If true with array, user must have ALL permissions (default: false = any)
 * @returns {Function} Express middleware
 * 
 * @example
 * // Single permission (user must have this)
 * router.post('/jobs', requirePermission('payroll_runs:create'), createJob);
 * 
 * @example
 * // Multiple permissions (user must have at least ONE)
 * router.get('/reports', requirePermission(['reports:view', 'admin:full']), getReports);
 * 
 * @example
 * // Multiple permissions (user must have ALL)
 * router.post('/sensitive', requirePermission(['data:write', 'data:delete'], { requireAll: true }), doSensitive);
 */
export function requirePermission(requiredPermission, options = {}) {
  return async (req, res, next) => {
    try {
      const { id: userId, organizationId } = req.user;
      
      // Convert to array if single permission
      const permissions = Array.isArray(requiredPermission) 
        ? requiredPermission 
        : [requiredPermission];

      // Check if user has required permissions
      const hasPermission = await checkUserPermissions(
        userId, 
        organizationId, 
        permissions,
        options
      );

      if (!hasPermission) {
        logger.logSecurityEvent('permission_denied', {
          userId,
          organizationId,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method,
          requireAll: options.requireAll || false
        });

        const permissionText = permissions.length > 1
          ? (options.requireAll ? permissions.join(' and ') : permissions.join(' or '))
          : permissions[0];

        throw new ForbiddenError(
          `Access denied. Required permission: ${permissionText}`
        );
      }

      // Attach user permissions to request for use in controllers
      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(userId, organizationId);
      }
      
      next();
    } catch (_error) {
      next(error);
    }
  };
}

/**
 * Check if user has required permissions
 * 
 * @private
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @param {Array<string>} permissions - Permission names to check
 * @param {Object} options - Options (requireAll)
 * @returns {Promise<boolean>} True if user has required permissions
 */
async function checkUserPermissions(userId, organizationId, permissions, options = {}) {
  const { requireAll = false } = options;

  const result = await query(
    `
    SELECT DISTINCT p.name
    FROM public.permissions p
    INNER JOIN public.role_permissions rp ON p.id = rp.permission_id
    INNER JOIN public.roles r ON rp.role_id = r.id
    INNER JOIN public.user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND (r.organization_id = $2 OR r.organization_id IS NULL)
      AND ur.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND p.name = ANY($3)
    `,
    [userId, organizationId, permissions],
    organizationId,
    { operation: 'SELECT', table: 'permissions' }
  );

  if (requireAll) {
    // User must have ALL specified permissions
    return result.rows.length === permissions.length;
  } else {
    // User must have AT LEAST ONE permission
    return result.rows.length > 0;
  }
}

/**
 * Get all permissions for a user in their organization
 * 
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<Array<string>>} Array of permission names
 */
async function getUserPermissions(userId, organizationId) {
  const result = await query(
    `
    SELECT DISTINCT p.name, p.resource, p.action, p.product_slug
    FROM public.permissions p
    INNER JOIN public.role_permissions rp ON p.id = rp.permission_id
    INNER JOIN public.roles r ON rp.role_id = r.id
    INNER JOIN public.user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND (r.organization_id = $2 OR r.organization_id IS NULL)
      AND ur.deleted_at IS NULL
      AND r.deleted_at IS NULL
    ORDER BY p.name
    `,
    [userId, organizationId],
    organizationId,
    { operation: 'SELECT', table: 'permissions' }
  );

  return result.rows.map(row => row.name);
}

/**
 * Check if user has specific role(s)
 * 
 * @param {...string} roleNames - Role names (user must have at least one)
 * @returns {Function} Express middleware
 * 
 * @example
 * // User must be admin or owner
 * router.delete('/users/:id', requireRole('org_admin', 'org_owner'), deleteUser);
 */
export function requireRole(...roleNames) {
  return async (req, res, next) => {
    try {
      const { id: userId, organizationId } = req.user;

      const result = await query(
        `
        SELECT r.name, r.display_name
        FROM public.roles r
        INNER JOIN public.user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND (r.organization_id = $2 OR r.organization_id IS NULL)
          AND r.name = ANY($3)
          AND ur.deleted_at IS NULL
          AND r.deleted_at IS NULL
        LIMIT 1
        `,
        [userId, organizationId, roleNames],
        organizationId,
        { operation: 'SELECT', table: 'roles' }
      );

      if (result.rows.length === 0) {
        logger.logSecurityEvent('role_denied', {
          userId,
          organizationId,
          requiredRoles: roleNames,
          path: req.path,
          method: req.method
        });

        throw new ForbiddenError(
          `Access denied. Required role: ${roleNames.join(' or ')}`
        );
      }

      // Attach user role to request
      req.userRole = result.rows[0].name;

      next();
    } catch (_error) {
      next(error);
    }
  };
}

/**
 * Attach user permissions and roles to request (no enforcement)
 * Useful for endpoints that need to check permissions conditionally
 * 
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/dashboard', authenticate, attachPermissions, getDashboard);
 * // In controller: if (req.userPermissions.includes('admin:full')) { ... }
 */
export async function attachPermissions(req, res, next) {
  try {
    if (!req.user) {
      return next(new Error('Authentication required before attaching permissions'));
    }

    const { id: userId, organizationId } = req.user;

    // Get user permissions
    req.userPermissions = await getUserPermissions(userId, organizationId);

    // Get user roles
    const rolesResult = await query(
      `
      SELECT DISTINCT r.name, r.display_name
      FROM public.roles r
      INNER JOIN public.user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND ur.organization_id = $2
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY r.name
      `,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );

    req.userRoles = rolesResult.rows.map(row => row.name);

    next();
  } catch (_error) {
    logger.error('Error attaching permissions', {
      error: error.message,
      userId: req.user?.id,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Helper to check if user has permission (for use in controllers)
 * 
 * @param {Object} req - Express request object
 * @param {string|Array<string>} permission - Permission(s) to check
 * @returns {Promise<boolean>} True if user has permission
 * 
 * @example
 * // In controller
 * if (await hasPermission(req, 'payroll_runs:delete')) {
 *   // Allow delete
 * }
 */
export async function hasPermission(req, permission) {
  const { id: userId, organizationId } = req.user;
  const permissions = Array.isArray(permission) ? permission : [permission];
  return checkUserPermissions(userId, organizationId, permissions, { requireAll: false });
}

/**
 * Helper to check if user has role (for use in controllers)
 * 
 * @param {Object} req - Express request object
 * @param {string|Array<string>} role - Role(s) to check
 * @returns {Promise<boolean>} True if user has role
 * 
 * @example
 * // In controller
 * if (await hasRole(req, 'org_admin')) {
 *   // Admin-only logic
 * }
 */
export async function hasRole(req, role) {
  const { id: userId, organizationId } = req.user;
  const roles = Array.isArray(role) ? role : [role];

  const result = await query(
    `
    SELECT 1
    FROM public.roles r
    INNER JOIN public.user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = $1
      AND ur.organization_id = $2
      AND r.name = ANY($3)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    LIMIT 1
    `,
    [userId, organizationId, roles],
    organizationId,
    { operation: 'SELECT', table: 'roles' }
  );

  return result.rows.length > 0;
}

/**
 * Exports for testing
 */
export const __testing__ = {
  checkUserPermissions,
  getUserPermissions
};
