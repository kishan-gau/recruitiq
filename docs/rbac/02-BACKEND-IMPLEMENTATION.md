# Backend Implementation - Centralized RBAC System

**Part of:** [RBAC Implementation Plan](./00-OVERVIEW.md)  
**Version:** 1.0  
**Date:** November 21, 2025

---

## Table of Contents

1. [Module Structure](#module-structure)
2. [Models](#models)
3. [Services](#services)
4. [Controllers](#controllers)
5. [Routes](#routes)
6. [Validation Schemas](#validation-schemas)
7. [Error Handling](#error-handling)

---

## Module Structure

### Directory Layout

```
backend/src/
├── modules/
│   └── rbac/                           # NEW: Centralized RBAC module
│       ├── models/
│       │   ├── Permission.js           # Permission model
│       │   ├── Role.js                 # Role model
│       │   ├── RolePermission.js       # Many-to-many model
│       │   ├── UserRole.js             # User-role assignment
│       │   └── RoleAuditLog.js         # Audit trail
│       │
│       ├── services/
│       │   ├── PermissionService.js    # Permission logic
│       │   ├── RoleService.js          # Role CRUD + assignments
│       │   ├── UserRoleService.js      # User-role management
│       │   └── RBACEnforcementService.js # Permission checking
│       │
│       ├── controllers/
│       │   ├── permissionController.js # Permission endpoints
│       │   ├── roleController.js       # Role endpoints
│       │   └── userRoleController.js   # User-role endpoints
│       │
│       ├── routes/
│       │   └── index.js                # RBAC routes aggregator
│       │
│       ├── middleware/
│       │   └── rbacEnforcement.js      # Permission checking middleware
│       │
│       ├── dto/
│       │   ├── roleDto.js              # Role data transformers
│       │   └── permissionDto.js        # Permission data transformers
│       │
│       ├── validators/
│       │   ├── roleValidators.js       # Joi schemas for roles
│       │   └── permissionValidators.js # Joi schemas for permissions
│       │
│       └── utils/
│           └── rbacHelpers.js          # Utility functions
│
├── middleware/
│   └── auth.js                         # Updated with RBAC integration
│
└── server.js                           # Mount RBAC routes
```

---

## Models

### 1. Permission Model

```javascript
// backend/src/modules/rbac/models/Permission.js

import { query } from '../../../config/database.js';

/**
 * Permission Model
 * System-defined permissions for all products
 */
class Permission {
  /**
   * Find permission by ID
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
   */
  static async findByCode(code) {
    const result = await query(
      `SELECT * FROM permissions WHERE code = $1 AND is_active = true`,
      [code]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all permissions with optional filters
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
   */
  static async findGrouped() {
    const result = await query(`
      SELECT 
        product,
        category,
        json_agg(
          json_build_object(
            'id', id,
            'code', code,
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
}

export default Permission;
```

### 2. Role Model

```javascript
// backend/src/modules/rbac/models/Role.js

import { query } from '../../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Role Model
 * Organization-scoped roles with permissions
 */
class Role {
  /**
   * Create a new role
   */
  static async create(data, organizationId, userId) {
    const id = uuidv4();
    
    const result = await query(
      `
      INSERT INTO roles (
        id, organization_id, name, description, product,
        is_system, is_active, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        id,
        organizationId,
        data.name,
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
   */
  static async findById(id, organizationId) {
    const result = await query(
      `
      SELECT * FROM roles
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );
    return result.rows[0] || null;
  }

  /**
   * Find role with its permissions
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
              'code', p.code,
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
      WHERE r.id = $1 AND r.organization_id = $2 AND r.deleted_at IS NULL
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
   */
  static async findAll(organizationId, filters = {}) {
    let sql = `
      SELECT 
        r.*,
        COUNT(DISTINCT ur.user_id) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.revoked_at IS NULL
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.organization_id = $1 AND r.deleted_at IS NULL
    `;
    
    const values = [organizationId];
    let paramCount = 1;

    if (filters.product !== undefined) {
      paramCount++;
      sql += ` AND r.product = $${paramCount}`;
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
      ORDER BY r.is_system DESC, r.name ASC
    `;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'roles'
    });
    
    return result.rows;
  }

  /**
   * Update role
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
```

### 3. UserRole Model

```javascript
// backend/src/modules/rbac/models/UserRole.js

import { query } from '../../../config/database.js';

/**
 * UserRole Model
 * Manages user-role assignments with product context
 */
class UserRole {
  /**
   * Assign role to user
   */
  static async assign(userId, roleId, product, organizationId, assignedBy) {
    const result = await query(
      `
      INSERT INTO user_roles (
        user_id, role_id, product, assigned_by
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, role_id, COALESCE(product, ''))
      DO UPDATE SET
        revoked_at = NULL,
        revoked_by = NULL,
        assigned_at = NOW(),
        assigned_by = $4
      RETURNING *
      `,
      [userId, roleId, product || null, assignedBy],
      organizationId,
      { operation: 'INSERT', table: 'user_roles' }
    );

    return result.rows[0];
  }

  /**
   * Revoke role from user
   */
  static async revoke(userId, roleId, product, organizationId, revokedBy) {
    const result = await query(
      `
      UPDATE user_roles
      SET revoked_at = NOW(), revoked_by = $1
      WHERE user_id = $2
        AND role_id = $3
        AND COALESCE(product, '') = COALESCE($4, '')
        AND revoked_at IS NULL
      RETURNING *
      `,
      [revokedBy, userId, roleId, product || null],
      organizationId,
      { operation: 'UPDATE', table: 'user_roles' }
    );

    return result.rows.length > 0;
  }

  /**
   * Get all roles for a user
   */
  static async findByUserId(userId, organizationId, product = null) {
    let sql = `
      SELECT 
        ur.*,
        r.name as role_name,
        r.description as role_description,
        r.product as role_product
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
      WHERE ur.user_id = $1
        AND r.organization_id = $2
        AND ur.revoked_at IS NULL
    `;
    
    const values = [userId, organizationId];
    let paramCount = 2;

    if (product) {
      paramCount++;
      sql += ` AND (ur.product = $${paramCount} OR ur.product IS NULL)`;
      values.push(product);
    }

    sql += ` ORDER BY r.name`;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows;
  }

  /**
   * Get all users with a specific role
   */
  static async findByRoleId(roleId, organizationId) {
    const result = await query(
      `
      SELECT 
        ur.*,
        u.email,
        u.first_name,
        u.last_name
      FROM user_roles ur
      INNER JOIN hris.user_account u ON ur.user_id = u.id
      WHERE ur.role_id = $1
        AND u.organization_id = $2
        AND ur.revoked_at IS NULL
      ORDER BY u.last_name, u.first_name
      `,
      [roleId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'user_roles' }
    );

    return result.rows;
  }

  /**
   * Get user's permissions (flattened from all roles)
   */
  static async getUserPermissions(userId, organizationId, product = null) {
    let sql = `
      SELECT DISTINCT p.code, p.name, p.product, p.category
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
      INNER JOIN role_permissions rp ON r.id = rp.role_id
      INNER JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
      WHERE ur.user_id = $1
        AND r.organization_id = $2
        AND ur.revoked_at IS NULL
    `;
    
    const values = [userId, organizationId];
    let paramCount = 2;

    if (product) {
      paramCount++;
      sql += ` AND (ur.product = $${paramCount} OR ur.product IS NULL)`;
      values.push(product);
    }

    sql += ` ORDER BY p.product, p.category, p.code`;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows;
  }

  /**
   * Check if user has specific permission
   */
  static async hasPermission(userId, permissionCode, organizationId, product = null) {
    let sql = `
      SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id AND r.deleted_at IS NULL
        INNER JOIN role_permissions rp ON r.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
        WHERE ur.user_id = $1
          AND r.organization_id = $2
          AND p.code = $3
          AND ur.revoked_at IS NULL
    `;
    
    const values = [userId, organizationId, permissionCode];
    let paramCount = 3;

    if (product) {
      paramCount++;
      sql += ` AND (ur.product = $${paramCount} OR ur.product IS NULL)`;
      values.push(product);
    }

    sql += `) as has_permission`;

    const result = await query(sql, values, organizationId, {
      operation: 'SELECT',
      table: 'user_roles'
    });

    return result.rows[0]?.has_permission || false;
  }
}

export default UserRole;
```

---

## Services

### 1. RoleService

```javascript
// backend/src/modules/rbac/services/RoleService.js

import Joi from 'joi';
import Role from '../models/Role.js';
import RoleAuditLog from '../models/RoleAuditLog.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * RoleService
 * Business logic for role management
 */
class RoleService {
  /**
   * Validation schema for creating roles
   */
  static get createSchema() {
    return Joi.object({
      name: Joi.string().required().trim().min(2).max(100)
        .messages({
          'string.empty': 'Role name is required',
          'string.min': 'Role name must be at least 2 characters',
          'string.max': 'Role name cannot exceed 100 characters'
        }),
      description: Joi.string().optional().trim().max(500).allow(''),
      product: Joi.string().optional().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq').allow(null),
      permissionIds: Joi.array().items(Joi.string().uuid()).optional().default([])
    }).options({ stripUnknown: true });
  }

  /**
   * Validation schema for updating roles
   */
  static get updateSchema() {
    return Joi.object({
      name: Joi.string().optional().trim().min(2).max(100),
      description: Joi.string().optional().trim().max(500).allow(''),
      isActive: Joi.boolean().optional()
    }).min(1).options({ stripUnknown: true });
  }

  /**
   * Create a new role
   */
  async create(data, organizationId, userId) {
    try {
      // Validate input
      const validated = await RoleService.createSchema.validateAsync(data);

      // Check for duplicate role name
      const existing = await Role.findAll(organizationId, {
        product: validated.product
      });
      
      const duplicate = existing.find(
        r => r.name.toLowerCase() === validated.name.toLowerCase()
      );
      
      if (duplicate) {
        throw new ValidationError(
          `Role "${validated.name}" already exists for this ${validated.product || 'organization'}`
        );
      }

      // Create role
      const role = await Role.create(validated, organizationId, userId);

      // Assign permissions if provided
      if (validated.permissionIds && validated.permissionIds.length > 0) {
        await Role.assignPermissions(
          role.id,
          validated.permissionIds,
          organizationId,
          userId
        );
      }

      // Log audit trail
      await RoleAuditLog.log({
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
      return await Role.findByIdWithPermissions(role.id, organizationId);
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
      ? await Role.findByIdWithPermissions(id, organizationId)
      : await Role.findById(id, organizationId);

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role;
  }

  /**
   * List all roles
   */
  async list(organizationId, filters = {}) {
    return await Role.findAll(organizationId, filters);
  }

  /**
   * Update role
   */
  async update(id, data, organizationId, userId) {
    try {
      // Validate input
      const validated = await RoleService.updateSchema.validateAsync(data);

      // Get existing role
      const existing = await this.getById(id, organizationId, false);

      // Check if system role
      if (existing.is_system) {
        throw new ForbiddenError('Cannot modify system roles');
      }

      // Check for duplicate name
      if (validated.name) {
        const roles = await Role.findAll(organizationId, {
          product: existing.product
        });
        
        const duplicate = roles.find(
          r => r.id !== id && r.name.toLowerCase() === validated.name.toLowerCase()
        );
        
        if (duplicate) {
          throw new ValidationError(`Role "${validated.name}" already exists`);
        }
      }

      // Update role
      const updated = await Role.update(id, validated, organizationId, userId);

      if (!updated) {
        throw new NotFoundError('Role not found or cannot be updated');
      }

      // Log audit trail
      await RoleAuditLog.log({
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

      return await Role.findByIdWithPermissions(id, organizationId);
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
        throw new ForbiddenError('Cannot delete system roles');
      }

      // Soft delete
      const deleted = await Role.softDelete(id, organizationId, userId);

      if (!deleted) {
        throw new NotFoundError('Role not found or already deleted');
      }

      // Log audit trail
      await RoleAuditLog.log({
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
        throw new ForbiddenError('Cannot modify permissions for system roles');
      }

      // Assign permissions
      await Role.assignPermissions(roleId, validated, organizationId, userId);

      // Log audit trail
      await RoleAuditLog.log({
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

      return await Role.findByIdWithPermissions(roleId, organizationId);
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
```

### 2. UserRoleService

```javascript
// backend/src/modules/rbac/services/UserRoleService.js

import Joi from 'joi';
import UserRole from '../models/UserRole.js';
import Role from '../models/Role.js';
import RoleAuditLog from '../models/RoleAuditLog.js';
import { query } from '../../../config/database.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

/**
 * UserRoleService
 * Business logic for user-role assignments
 */
class UserRoleService {
  /**
   * Validation schema for assigning role
   */
  static get assignSchema() {
    return Joi.object({
      userId: Joi.string().uuid().required(),
      roleId: Joi.string().uuid().required(),
      product: Joi.string().valid('paylinq', 'nexus', 'schedulehub', 'recruitiq').optional().allow(null)
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(data, organizationId, assignedBy) {
    try {
      // Validate input
      const validated = await UserRoleService.assignSchema.validateAsync(data);

      // Verify user exists and belongs to organization
      const userResult = await query(
        'SELECT id, email FROM hris.user_account WHERE id = $1 AND organization_id = $2',
        [validated.userId, organizationId],
        organizationId
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      // Verify role exists and belongs to organization
      const role = await Role.findById(validated.roleId, organizationId);
      if (!role) {
        throw new NotFoundError('Role not found');
      }

      // Check product compatibility
      if (validated.product && role.product && role.product !== validated.product) {
        throw new ValidationError(
          `Role "${role.name}" is specific to ${role.product}, cannot assign to ${validated.product}`
        );
      }

      // Assign role
      const assignment = await UserRole.assign(
        validated.userId,
        validated.roleId,
        validated.product,
        organizationId,
        assignedBy
      );

      // Log audit trail
      await RoleAuditLog.log({
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
      const revoked = await UserRole.revoke(
        userId,
        roleId,
        product,
        organizationId,
        revokedBy
      );

      if (!revoked) {
        throw new NotFoundError('Role assignment not found');
      }

      // Log audit trail
      await RoleAuditLog.log({
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
    return await UserRole.findByUserId(userId, organizationId, product);
  }

  /**
   * Get all users with a specific role
   */
  async getRoleUsers(roleId, organizationId) {
    // Verify role exists
    const role = await Role.findById(roleId, organizationId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return await UserRole.findByRoleId(roleId, organizationId);
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(userId, organizationId, product = null) {
    return await UserRole.getUserPermissions(userId, organizationId, product);
  }

  /**
   * Check if user has permission
   */
  async checkPermission(userId, permissionCode, organizationId, product = null) {
    return await UserRole.hasPermission(userId, permissionCode, organizationId, product);
  }
}

export default UserRoleService;
```

---

**Next:** [03-MIDDLEWARE-INTEGRATION.md](./03-MIDDLEWARE-INTEGRATION.md)

_Remaining implementation details will follow in the next document..._
