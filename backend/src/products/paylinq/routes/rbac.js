/**
 * PayLinQ RBAC Routes
 * 
 * Product-specific role and permission management for PayLinQ.
 * Allows organizations to manage roles and permissions within their tenant.
 */

import express from 'express';
import { query } from '../../../config/database.js';
import { requirePermission } from '../../../middleware/auth.js';
import logger from '../../../utils/logger.js';

const router = express.Router();

// ============================================================================
// ROLES MANAGEMENT
// ============================================================================

/**
 * GET /api/products/paylinq/rbac/roles
 * Get all roles for PayLinQ product within organization
 */
router.get('/roles', requirePermission('settings:read'), async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    
    console.log('🎯 RBAC /roles endpoint hit!', { organizationId, userId: req.user.id });

    const result = await query(
      `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.role_type,
        r.created_at,
        r.updated_at,
        COALESCE(
          (
            SELECT COUNT(DISTINCT ur.user_id) 
            FROM public.user_roles ur
            JOIN hris.user_account ua ON ur.user_id = ua.id
            WHERE ur.role_id = r.id 
              AND ua.organization_id = $1
              AND ua.deleted_at IS NULL
              AND ur.deleted_at IS NULL
          ), 0
        ) as user_count,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'display_name', p.display_name,
              'description', p.description,
              'category', p.category
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id AND p.category = 'paylinq'
      WHERE r.role_type = 'tenant'
      GROUP BY r.id
      ORDER BY r.role_type DESC, r.name ASC
      `,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );

    console.log('🎯 RBAC /roles query result:', { rowCount: result.rows.length });

    res.json({
      success: true,
      roles: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching PayLinQ roles', {
      error: error.message,
      organizationId: req.user?.organizationId,
    });
    next(error);
  }
});

/**
 * GET /api/products/paylinq/rbac/roles/:id
 * Get a specific role by ID
 */
router.get('/roles/:id', requirePermission('settings:read'), async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await query(
      `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.role_type,
        r.created_at,
        r.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'display_name', p.display_name,
              'description', p.description,
              'category', p.category
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'::json
        ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id AND p.category = 'paylinq'
      WHERE r.id = $1
        AND r.role_type = 'tenant'
      GROUP BY r.id
      `,
      [id],
      null,
      { operation: 'SELECT', table: 'roles' }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      role: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching PayLinQ role', {
      error: error.message,
      roleId: req.params.id,
      organizationId: req.user?.organizationId,
    });
    next(error);
  }
});

/**
 * POST /api/products/paylinq/rbac/roles/:roleId/permissions
 * Assign permissions to a role
 */
router.post('/roles/:roleId/permissions', requirePermission('settings:update'), async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user;
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'permissionIds must be a non-empty array',
        errorCode: 'INVALID_INPUT',
      });
    }

    // Verify role exists and belongs to organization
    const roleCheck = await query(
      `
      SELECT id FROM roles 
      WHERE id = $1 
        AND (organization_id = $2 OR organization_id IS NULL)
        AND deleted_at IS NULL
        AND (role_type = 'tenant' OR role_type = 'product')
      `,
      [roleId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );

    if (roleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found',
        errorCode: 'ROLE_NOT_FOUND',
      });
    }

    // Remove existing permissions for this role
    await query(
      `DELETE FROM role_permissions WHERE role_id = $1`,
      [roleId],
      organizationId,
      { operation: 'DELETE', table: 'role_permissions' }
    );

    // Add new permissions
    const insertValues = permissionIds.map((permId) => `('${roleId}', '${permId}')`).join(',');
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ${insertValues}`,
      [],
      organizationId,
      { operation: 'INSERT', table: 'role_permissions' }
    );

    logger.info('Role permissions updated', {
      roleId,
      permissionCount: permissionIds.length,
      organizationId,
      userId,
    });

    res.json({
      success: true,
      message: 'Permissions updated successfully',
    });
  } catch (error) {
    logger.error('Error updating role permissions', {
      error: error.message,
      roleId: req.params.roleId,
      organizationId: req.user?.organizationId,
    });
    next(error);
  }
});

// ============================================================================
// PERMISSIONS MANAGEMENT
// ============================================================================

/**
 * GET /api/products/paylinq/rbac/permissions
 * Get all permissions for PayLinQ product
 */
router.get('/permissions', requirePermission('settings:read'), async (req, res, next) => {
  try {
    console.log('🎯 RBAC /permissions endpoint hit!', { organizationId: req.user.organizationId });
    
    const result = await query(
      `
      SELECT 
        id,
        name,
        display_name,
        description,
        category,
        product,
        created_at
      FROM permissions
      WHERE product = 'paylinq'
      ORDER BY category, name
      `,
      [],
      req.user.organizationId,
      { operation: 'SELECT', table: 'permissions' }
    );

    console.log('🎯 RBAC /permissions query result:', { rowCount: result.rows.length });

    res.json({
      success: true,
      permissions: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching PayLinQ permissions', {
      error: error.message,
      organizationId: req.user?.organizationId,
    });
    next(error);
  }
});

/**
 * GET /api/products/paylinq/rbac/permissions/categories
 * Get permission categories with counts
 */
router.get('/permissions/categories', requirePermission('settings:read'), async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT 
        category,
        COUNT(*) as permission_count,
        json_agg(
          json_build_object(
            'id', id,
            'name', name,
            'display_name', display_name,
            'description', description
          )
          ORDER BY name
        ) as permissions
      FROM permissions
      WHERE category = 'paylinq'
      GROUP BY category
      ORDER BY category
      `,
      [],
      req.user.organizationId,
      { operation: 'SELECT', table: 'permissions' }
    );

    res.json({
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    logger.error('Error fetching PayLinQ permission categories', {
      error: error.message,
      organizationId: req.user?.organizationId,
    });
    next(error);
  }
});

export default router;
