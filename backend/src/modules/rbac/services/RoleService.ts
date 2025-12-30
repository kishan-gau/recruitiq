import Joi from 'joi';
import Role from '../models/Role.ts';
import Permission from '../models/Permission.ts';
import RoleAuditLog from '../models/RoleAuditLog.ts';
import logger from '../../../utils/logger.ts';

/**
 * RoleService
 * Business logic for role management
 * Based on: docs/rbac/02-BACKEND-IMPLEMENTATION.md
 */
class RoleService {
  constructor(roleModel = null, permissionModel = null, auditModel = null) {
    this.roleModel = roleModel || Role;
    this.permissionModel = permissionModel || Permission;
    this.auditModel = auditModel || RoleAuditLog;
  }

  /**
   * Validation schema for creating roles
   */
  static createSchema = Joi.object({
    name: Joi.string().required().trim().min(2).max(100)
      .messages({
        'string.empty': 'Role name is required',
        'string.min': 'Role name must be at least 2 characters',
        'string.max': 'Role name cannot exceed 100 characters'
      }),
    display_name: Joi.string().optional().trim().max(255).allow(''),
    description: Joi.string().optional().trim().max(500).allow(''),
    product: Joi.string().optional().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq').allow(null),
    permissionIds: Joi.array().items(Joi.string().uuid()).optional().default([])
  }).options({ stripUnknown: true });

  /**
   * Validation schema for updating roles
   */
  static updateSchema = Joi.object({
    name: Joi.string().optional().trim().min(2).max(100),
    display_name: Joi.string().optional().trim().max(255).allow(''),
    description: Joi.string().optional().trim().max(500).allow(''),
    isActive: Joi.boolean().optional()
  }).min(1).options({ stripUnknown: true });

  /**
   * Create a new role
   */
  async create(data, organizationId, userId) {
    try {
      // Validate input
      const validated = await RoleService.createSchema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true
      });

      // Check for duplicate role name
      const existing = await this.roleModel.findAll(organizationId, {
        product: validated.product
      });
      
      const duplicate = existing.find(
        r => r.name.toLowerCase() === validated.name.toLowerCase()
      );
      
      if (duplicate) {
        throw new Error(
          `Role "${validated.name}" already exists for this ${validated.product || 'organization'}`
        );
      }

      // Verify permissions exist if provided
      if (validated.permissionIds && validated.permissionIds.length > 0) {
        const permsExist = await this.permissionModel.exists(validated.permissionIds);
        if (!permsExist) {
          throw new Error('One or more permission IDs are invalid');
        }
      }

      // Create role
      const role = await this.roleModel.create(validated, organizationId, userId);

      // Assign permissions if provided
      if (validated.permissionIds && validated.permissionIds.length > 0) {
        await this.roleModel.assignPermissions(
          role.id,
          validated.permissionIds,
          organizationId,
          userId
        );
      }

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'role',
        entityId: role.id,
        action: 'create',
        changes: { created: validated },
        performedBy: userId
      });

      logger.info('Role created', {
        roleId: role.id,
        name: role.name,
        organizationId,
        userId
      });

      // Return role with permissions
      return await this.roleModel.findByIdWithPermissions(role.id, organizationId);
    } catch (error) {
      logger.error('Error creating role', {
        error: error.message,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get role by ID
   */
  async getById(id, organizationId, includePermissions = true) {
    const role = includePermissions
      ? await this.roleModel.findByIdWithPermissions(id, organizationId)
      : await this.roleModel.findById(id, organizationId);

    if (!role) {
      throw new Error('Role not found');
    }

    return role;
  }

  /**
   * List all roles
   */
  async list(organizationId, filters = {}) {
    return await this.roleModel.findAll(organizationId, filters);
  }

  /**
   * Update role
   */
  async update(id, data, organizationId, userId) {
    try {
      // Validate input
      const validated = await RoleService.updateSchema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true
      });

      // Get existing role
      const existing = await this.getById(id, organizationId, false);

      // Check if system role
      if (existing.is_system) {
        throw new Error('Cannot modify system roles');
      }

      // Check for duplicate name
      if (validated.name) {
        const roles = await this.roleModel.findAll(organizationId, {
          product: existing.product
        });
        
        const duplicate = roles.find(
          r => r.id !== id && r.name.toLowerCase() === validated.name.toLowerCase()
        );
        
        if (duplicate) {
          throw new Error(`Role "${validated.name}" already exists`);
        }
      }

      // Update role
      const updated = await this.roleModel.update(id, validated, organizationId, userId);

      if (!updated) {
        throw new Error('Role not found or cannot be updated');
      }

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'role',
        entityId: id,
        action: 'update',
        changes: { before: existing, after: validated },
        performedBy: userId
      });

      logger.info('Role updated', {
        roleId: id,
        changes: validated,
        organizationId,
        userId
      });

      return await this.roleModel.findByIdWithPermissions(id, organizationId);
    } catch (error) {
      logger.error('Error updating role', {
        error: error.message,
        roleId: id,
        data,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete role
   */
  async delete(id, organizationId, userId) {
    try {
      // Get existing role
      const existing = await this.getById(id, organizationId, false);

      // Check if system role
      if (existing.is_system) {
        throw new Error('Cannot delete system roles');
      }

      // Soft delete
      const deleted = await this.roleModel.softDelete(id, organizationId, userId);

      if (!deleted) {
        throw new Error('Role not found or already deleted');
      }

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'role',
        entityId: id,
        action: 'delete',
        changes: { deleted: existing },
        performedBy: userId
      });

      logger.info('Role deleted', {
        roleId: id,
        name: existing.name,
        organizationId,
        userId
      });

      return true;
    } catch (error) {
      logger.error('Error deleting role', {
        error: error.message,
        roleId: id,
        organizationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(roleId, permissionIds, organizationId, userId) {
    try {
      // Validate input
      const schema = Joi.object({
        permissionIds: Joi.array().items(Joi.string().uuid()).required().min(0)
      });
      
      const { permissionIds: validated } = await schema.validateAsync({ permissionIds });

      // Get role
      const role = await this.getById(roleId, organizationId, false);

      // Check if system role
      if (role.is_system) {
        throw new Error('Cannot modify permissions for system roles');
      }

      // Verify permissions exist
      if (validated.length > 0) {
        const permsExist = await this.permissionModel.exists(validated);
        if (!permsExist) {
          throw new Error('One or more permission IDs are invalid');
        }
      }

      // Assign permissions
      await this.roleModel.assignPermissions(roleId, validated, organizationId, userId);

      // Log audit trail
      await this.auditModel.log({
        organizationId,
        entityType: 'role_permission',
        entityId: roleId,
        action: 'assign',
        changes: { permissionIds: validated },
        performedBy: userId
      });

      logger.info('Permissions assigned to role', {
        roleId,
        permissionCount: validated.length,
        organizationId,
        userId
      });

      return await this.roleModel.findByIdWithPermissions(roleId, organizationId);
    } catch (error) {
      logger.error('Error assigning permissions', {
        error: error.message,
        roleId,
        permissionIds,
        organizationId,
        userId
      });
      throw error;
    }
  }
}

export default RoleService;
