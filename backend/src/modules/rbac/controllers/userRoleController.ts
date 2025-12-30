import UserRoleService from '../services/UserRoleService.js';
import logger from '../../../utils/logger.js';

const userRoleService = new UserRoleService();

/**
 * Assign role to user
 * POST /api/rbac/user-roles
 */
export const assignRole = async (req, res, next) => {
  try {
    const { organizationId, id: assignedBy } = req.user;
    const assignmentData = req.body;

    const assignment = await userRoleService.assignRole(assignmentData, organizationId, assignedBy);

    res.status(201).json({
      success: true,
      assignment,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError' || 
        error.message.includes('not found') || 
        error.message.includes('specific to')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error assigning role', {
      error: error.message,
      data: req.body,
      organizationId: req.user.organizationId,
      assignedBy: req.user.id
    });
    next(error);
  }
};

/**
 * Revoke role from user
 * DELETE /api/rbac/user-roles
 */
export const revokeRole = async (req, res, next) => {
  try {
    const { organizationId, id: revokedBy } = req.user;
    const { userId, roleId, product } = req.body;

    await userRoleService.revokeRole(userId, roleId, product, organizationId, revokedBy);

    res.json({
      success: true,
      message: 'Role revoked successfully'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error revoking role', {
      error: error.message,
      data: req.body,
      organizationId: req.user.organizationId,
      revokedBy: req.user.id
    });
    next(error);
  }
};

/**
 * Get user roles
 * GET /api/rbac/user-roles/:userId
 */
export const getUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.user;
    const { product } = req.query;

    const roles = await userRoleService.getUserRoles(userId, organizationId, product);

    res.json({
      success: true,
      userId,
      roles,
      count: roles.length
    });
  } catch (error) {
    logger.error('Error getting user roles', {
      error: error.message,
      userId: req.params.userId,
      organizationId: req.user.organizationId
    });
    next(error);
  }
};

/**
 * Get users with specific role
 * GET /api/rbac/roles/:roleId/users
 */
export const getRoleUsers = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { organizationId } = req.user;

    const users = await userRoleService.getRoleUsers(roleId, organizationId);

    res.json({
      success: true,
      roleId,
      users,
      count: users.length
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error getting role users', {
      error: error.message,
      roleId: req.params.roleId,
      organizationId: req.user.organizationId
    });
    next(error);
  }
};

/**
 * Get user permissions
 * GET /api/rbac/user-roles/:userId/permissions
 */
export const getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.user;
    const { product } = req.query;

    const permissions = await userRoleService.getUserPermissions(userId, organizationId, product);

    res.json({
      success: true,
      userId,
      permissions,
      count: permissions.length
    });
  } catch (error) {
    logger.error('Error getting user permissions', {
      error: error.message,
      userId: req.params.userId,
      organizationId: req.user.organizationId
    });
    next(error);
  }
};

/**
 * Check if user has permission
 * POST /api/rbac/user-roles/check-permission
 */
export const checkPermission = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { userId, permissionCode, product } = req.body;

    const hasPermission = await userRoleService.checkPermission(
      userId,
      permissionCode,
      organizationId,
      product
    );

    res.json({
      success: true,
      userId,
      permissionCode,
      hasPermission
    });
  } catch (error) {
    logger.error('Error checking permission', {
      error: error.message,
      data: req.body,
      organizationId: req.user.organizationId
    });
    next(error);
  }
};

/**
 * Bulk assign roles to user
 * POST /api/rbac/user-roles/bulk-assign
 */
export const bulkAssignRoles = async (req, res, next) => {
  try {
    const { organizationId, id: assignedBy } = req.user;
    const { userId, roleAssignments } = req.body;

    const results = await userRoleService.bulkAssignRoles(
      userId,
      roleAssignments,
      organizationId,
      assignedBy
    );

    res.status(201).json({
      success: true,
      userId,
      assignments: results,
      count: results.length,
      message: 'Roles assigned successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error bulk assigning roles', {
      error: error.message,
      data: req.body,
      organizationId: req.user.organizationId,
      assignedBy: req.user.id
    });
    next(error);
  }
};
