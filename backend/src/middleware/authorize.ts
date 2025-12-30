/**
 * Authorization Middleware
 * Enforces role-based access control (RBAC) and permission-based access control (PBAC)
 *
 * Usage:
 * router.delete('/api/jobs/:id',
 *   authenticate,
 *   requireRole('admin', 'recruiter'),
 *   jobController.delete
 * );
 */

import { ForbiddenError } from './errorHandler.ts';
import logger from '../utils/logger.ts';

/**
 * Middleware that checks if user has required role(s)
 * @param {...string} allowedRoles - Role names that can access the endpoint
 * @returns {Function} Express middleware
 *
 * @example
 * // Only admins can access
 * router.get('/admin', authenticate, requireRole('admin'), handler);
 *
 * // Admins OR recruiters can access
 * router.post('/jobs', authenticate, requireRole('admin', 'recruiter'), handler);
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED',
      });
    }

    const { role, id: userId } = req.user;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(role)) {
      logger.logSecurityEvent('forbidden_access_role', {
        userId,
        userRole: role,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        errorCode: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Middleware that checks if user has required permission(s)
 * @param {...string} requiredPermissions - Permission codes (e.g., 'job:create', 'user:delete')
 * @returns {Function} Express middleware
 *
 * @example
 * // Requires specific permission
 * router.delete('/jobs/:id',
 *   authenticate,
 *   requirePermission('job:delete'),
 *   handler
 * );
 *
 * // Multiple permissions (user needs ALL of them)
 * router.post('/admin/payroll',
 *   authenticate,
 *   requirePermission('payroll:create', 'audit:write'),
 *   handler
 * );
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED',
      });
    }

    const { permissions = [], id: userId } = req.user;

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (perm) => !permissions.includes(perm)
      );

      logger.logSecurityEvent('forbidden_access_permission', {
        userId,
        requiredPermissions,
        missingPermissions,
        userPermissions: permissions,
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: `Missing required permission(s): ${missingPermissions.join(', ')}`,
        errorCode: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Middleware that checks if user owns the resource or is an admin
 * @param {string} resourceIdParam - Name of the URL param containing resource ID (e.g., 'id', 'jobId')
 * @param {Function} getResourceOwnerId - Async function that returns the owner ID from resource
 * @returns {Function} Express middleware
 *
 * @example
 * // Check if user owns the job
 * router.put('/jobs/:id',
 *   authenticate,
 *   checkResourceOwnership('id', async (jobId, orgId) => {
 *     const job = await JobService.getById(jobId, orgId);
 *     return job.createdBy;
 *   }),
 *   handler
 * );
 */
export function checkResourceOwnership(resourceIdParam, getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        });
      }

      const { id: userId, role, organizationId } = req.user;
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: `Missing resource ID parameter: ${resourceIdParam}`,
          errorCode: 'BAD_REQUEST',
        });
      }

      // Admins/owners always have access
      if (['admin', 'owner'].includes(role)) {
        return next();
      }

      // Get resource owner
      const ownerId = await getResourceOwnerId(resourceId, organizationId);

      if (!ownerId) {
        // Resource not found - return 404, not 403 (don't reveal existence)
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          errorCode: 'NOT_FOUND',
        });
      }

      // Check if user is the owner
      if (ownerId !== userId) {
        logger.logSecurityEvent('forbidden_access_ownership', {
          userId,
          resourceId,
          resourceOwnerId: ownerId,
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource',
          errorCode: 'FORBIDDEN',
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking resource ownership', {
        error: error.message,
        resourceIdParam,
        userId: req.user?.id,
      });

      next(error);
    }
  };
}

/**
 * Middleware that checks if user has access to a specific organization
 * Used to prevent cross-organization data access
 * @returns {Function} Express middleware
 */
export function checkOrganizationAccess(req, res, next) {
  // Ensure user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      errorCode: 'UNAUTHORIZED',
    });
  }

  const { organizationId: userOrgId } = req.user;
  const { organizationId } = req.body || req.query || {};

  // If request specifies an organization, ensure it matches user's organization
  if (organizationId && organizationId !== userOrgId) {
    logger.logSecurityEvent('forbidden_cross_org_access', {
      userId: req.user.id,
      requestedOrgId: organizationId,
      userOrgId,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied. Organization mismatch.',
      errorCode: 'FORBIDDEN',
    });
  }

  next();
}

/**
 * Combines multiple authorization middleware into one
 * Useful for complex authorization requirements
 *
 * @example
 * const authorize = combineAuth(
 *   requireRole('admin', 'recruiter'),
 *   requirePermission('job:create')
 * );
 *
 * router.post('/jobs', authenticate, authorize, handler);
 */
export function combineAuth(...middleware) {
  return async (req, res, next) => {
    let index = 0;

    const dispatch = (err) => {
      if (err) return next(err);
      const fn = middleware[index++];
      if (!fn) return next();
      fn(req, res, dispatch);
    };

    dispatch();
  };
}

export default {
  requireRole,
  requirePermission,
  checkResourceOwnership,
  checkOrganizationAccess,
  combineAuth,
};
