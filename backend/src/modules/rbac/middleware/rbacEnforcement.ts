import Role from '../models/Role.js';
import logger from '../../../utils/logger.js';

/**
 * RBAC Enforcement Middleware
 * Specialized middleware for RBAC management routes
 * Based on: docs/rbac/03-MIDDLEWARE-INTEGRATION.md
 */

/**
 * Require RBAC Management Permission
 * Users must have 'rbac:manage' permission to access RBAC admin routes
 */
export function requireRBACManagement(req, res, next) {
  if (!req.user || req.user.type !== 'tenant') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.permissions || !req.user.permissions.includes('rbac:manage')) {
    logger.warn('RBAC management access denied', {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      attemptedAction: 'rbac_management',
      path: req.path
    });

    return res.status(403).json({
      success: false,
      message: 'RBAC management permission required',
      errorCode: 'RBAC_MANAGEMENT_REQUIRED'
    });
  }

  next();
}

/**
 * Require User Management Permission
 * Users must have 'user:edit' or 'rbac:assign' permission
 */
export function requireUserManagement(req, res, next) {
  if (!req.user || req.user.type !== 'tenant') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const hasPermission = ['user:edit', 'rbac:assign'].some(perm => 
    req.user.permissions && req.user.permissions.includes(perm)
  );

  if (!hasPermission) {
    logger.warn('User management access denied', {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      message: 'User management permission required',
      errorCode: 'USER_MANAGEMENT_REQUIRED'
    });
  }

  next();
}

/**
 * Prevent System Role Modification
 * Ensures system roles cannot be modified or deleted
 */
export async function preventSystemRoleModification(req, res, next) {
  try {
    const roleId = req.params.id || req.params.roleId;
    
    if (!roleId) {
      return next();
    }

    // Check if role is a system role
    const role = await Role.findById(roleId, req.user.organizationId);

    if (role && role.is_system) {
      logger.warn('Attempted system role modification', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        attemptedAction: req.method,
        roleId,
        roleName: role.name
      });

      return res.status(403).json({
        success: false,
        message: 'System roles cannot be modified',
        errorCode: 'SYSTEM_ROLE_PROTECTED'
      });
    }

    next();
  } catch (_error) {
    logger.error('Error in preventSystemRoleModification middleware', {
      error: error.message,
      roleId: req.params.id || req.params.roleId
    });
    next(error);
  }
}

/**
 * Validate Product Context
 * Ensures product parameter is valid and user has access
 */
export function validateProductContext(req, res, next) {
  const product = req.body.product || req.query.product || req.params.product;

  if (product) {
    const validProducts = ['paylinq', 'nexus', 'schedulehub', 'recruitiq'];
    
    if (!validProducts.includes(product)) {
      return res.status(400).json({
        success: false,
        message: `Invalid product: ${product}`,
        errorCode: 'INVALID_PRODUCT'
      });
    }

    // Check if user has access to this product
    if (req.user && req.user.enabledProducts && !req.user.enabledProducts.includes(product)) {
      return res.status(403).json({
        success: false,
        message: `Access to ${product} is not enabled`,
        errorCode: 'PRODUCT_NOT_ENABLED'
      });
    }
  }

  next();
}

export default {
  requireRBACManagement,
  requireUserManagement,
  preventSystemRoleModification,
  validateProductContext
};
