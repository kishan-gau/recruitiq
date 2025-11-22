import Joi from 'joi';
import UserRole from '../models/UserRole.js';
import Role from '../models/Role.js';
import RoleAuditLog from '../models/RoleAuditLog.js';
import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

/**
 * UserRoleService
 * Business logic for user-role assignments
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class UserRoleService {
  constructor(userRoleModel = null, roleModel = null, auditModel = null) {
    this.userRoleModel = userRoleModel || UserRole;
    this.roleModel = roleModel || Role;
    this.auditModel = auditModel || RoleAuditLog;
  }

  /**
   * Validation schema for assigning role
   */
  static assignSchema = Joi.object({
    userId: Joi.string().uuid().required(),
    roleId: Joi.string().uuid().required(),
    product: Joi.string().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq').optional().allow(null)
  });

  /**
   * Assign role to user
   */
  async assignRole(data, organizationId, assignedBy) {
    try {
      // Validate input
      const validated = await UserRoleService.assignSchema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true
      });

      // Verify user exists and belongs to organization
      const userResult = await query(
        'SELECT id, email FROM hris.user_account WHERE id = $1 AND organization_id = $2',
        [validated.userId, organizationId],
        organizationId
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify role exists and belongs to organization
      const role = await this.roleModel.findById(validated.roleId, organizationId);
      if (!role) {
        throw new Error('Role not found');
      }

      // Check product compatibility
      if (validated.product && role.product && role.product !== validated.product) {
        throw new Error(
          `Role "${role.name}" is specific to ${role.product}, cannot assign to ${validated.product}`
        );
      }

      // Assign role
      const assignment = await this.userRoleModel.assign(
        validated.userId,
        validated.roleId,
        validated.product,
        organizationId,
        assignedBy
      );

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'user_role',
        entityId: assignment.user_id,
        action: 'assign',
        changes: {
          userId: validated.userId,
          roleId: validated.roleId,
          product: validated.product
        },
        performedBy: assignedBy
      });

      logger.info('Role assigned to user', {
        userId: validated.userId,
        roleId: validated.roleId,
        product: validated.product,
        organizationId,
        assignedBy
      });

      return assignment;
    } catch (error) {
      logger.error('Error assigning role', {
        error: error.message,
        data,
        organizationId,
        assignedBy
      });
      throw error;
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId, roleId, product, organizationId, revokedBy) {
    try {
      // Revoke role
      const revoked = await this.userRoleModel.revoke(
        userId,
        roleId,
        product,
        organizationId,
        revokedBy
      );

      if (!revoked) {
        throw new Error('Role assignment not found');
      }

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'user_role',
        entityId: userId,
        action: 'revoke',
        changes: { userId, roleId, product },
        performedBy: revokedBy
      });

      logger.info('Role revoked from user', {
        userId,
        roleId,
        product,
        organizationId,
        revokedBy
      });

      return true;
    } catch (error) {
      logger.error('Error revoking role', {
        error: error.message,
        userId,
        roleId,
        product,
        organizationId,
        revokedBy
      });
      throw error;
    }
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId, organizationId, product = null) {
    return await this.userRoleModel.findByUserId(userId, organizationId, product);
  }

  /**
   * Get all users with a specific role
   */
  async getRoleUsers(roleId, organizationId) {
    // Verify role exists
    const role = await this.roleModel.findById(roleId, organizationId);
    if (!role) {
      throw new Error('Role not found');
    }

    return await this.userRoleModel.findByRoleId(roleId, organizationId);
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId, organizationId, product = null) {
    return await this.userRoleModel.getUserPermissions(userId, organizationId, product);
  }

  /**
   * Check if user has permission
   */
  async checkPermission(userId, permissionCode, organizationId, product = null) {
    return await this.userRoleModel.hasPermission(userId, permissionCode, organizationId, product);
  }

  /**
   * Bulk assign roles to user
   */
  async bulkAssignRoles(userId, roleAssignments, organizationId, assignedBy) {
    try {
      const results = [];

      for (const assignment of roleAssignments) {
        const result = await this.assignRole(
          {
            userId,
            roleId: assignment.roleId,
            product: assignment.product
          },
          organizationId,
          assignedBy
        );
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Error bulk assigning roles', {
        error: error.message,
        userId,
        roleAssignments,
        organizationId,
        assignedBy
      });
      throw error;
    }
  }
}

export default UserRoleService;
