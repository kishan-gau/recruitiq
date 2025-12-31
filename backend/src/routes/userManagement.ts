/**
 * User Management Routes
 * Routes for managing platform and tenant users
 */

import express from 'express';
import { authenticatePlatform, requirePlatformPermission } from '../middleware/auth.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// All routes require platform user authentication
router.use(authenticatePlatform);

/**
 * GET /api/portal/users
 * Get all platform users
 */
router.get('/', requirePlatformPermission('portal.view'), async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.role,
        u.permissions,
        u.last_login_at,
        u.last_login_ip,
        u.email_verified,
        u.mfa_enabled,
        u.is_active,
        u.created_at,
        u.created_by
      FROM platform_users u
      WHERE u.deleted_at IS NULL
    `;
    
    const values = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      values.push(role);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY u.created_at DESC';
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (_error) {
    logger.error('Failed to fetch users', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * GET /api/portal/users/:id
 * Get user details with permissions
 */
router.get('/:id', requirePlatformPermission('portal.view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.avatar_url,
        u.timezone,
        u.last_login_at,
        u.last_login_ip,
        u.email_verified,
        u.mfa_enabled,
        u.permissions as direct_permissions,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'display_name', r.display_name,
              'role_type', r.role_type
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'::json
        ) as roles,
        COALESCE(
          array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
          ARRAY[]::varchar[]
        ) as role_permissions
      FROM platform_users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.deleted_at IS NULL
      LEFT JOIN roles r ON ur.role_id = r.id AND r.deleted_at IS NULL AND r.role_type = 'platform'
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.deleted_at IS NULL
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
      GROUP BY u.id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = result.rows[0];
    
    // Combine direct permissions and role-based permissions
    const directPerms = user.direct_permissions || [];
    const rolePerms = user.role_permissions || [];
    const allPermissions = [...new Set([...directPerms, ...rolePerms])];
    
    res.json({
      success: true,
      user: {
        ...user,
        permissions: allPermissions,
        direct_permissions: directPerms,
        role_permissions: rolePerms
      }
    });
  } catch (_error) {
    logger.error('Failed to fetch user', { error: error.message, stack: error.stack, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/portal/users
 * Create a new platform user
 */
router.post('/', requirePlatformPermission('portal.manage'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, name, password, role, permissions, phone, timezone } = req.body;
    
    // Validation
    if (!email || !name || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, password, and role are required'
      });
    }
    
    // Validate role
    const validRoles = ['super_admin', 'admin', 'support', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`
      });
    }
    
    await client.query('BEGIN');
    
    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM platform_users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create user (platform_users stores permissions as JSONB array, not IDs)
    const result = await client.query(
      `INSERT INTO platform_users (
        email, name, first_name, last_name, password_hash, role, 
        permissions, phone, timezone, email_verified, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, email, name, first_name, last_name, role, permissions, phone, timezone, email_verified, is_active, created_at`,
      [
        email.toLowerCase(),
        name,
        firstName,
        lastName,
        passwordHash,
        role,
        JSON.stringify(permissions || []), // Store as JSONB
        phone || null,
        timezone || 'UTC',
        true, // Email verified for admin-created users
        true, // Active by default
        req.user.id
      ]
    );
    
    await client.query('COMMIT');
    
    logger.info('User created', {
      userId: result.rows[0].id,
      email: result.rows[0].email,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (_error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create user', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/portal/users/:id
 * Update user details
 */
router.put('/:id', requirePlatformPermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, first_name, last_name, phone, timezone, role, is_active } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(first_name);
      paramIndex++;
    }
    
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(last_name);
      paramIndex++;
    }
    
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }
    
    if (timezone) {
      updates.push(`timezone = $${paramIndex}`);
      values.push(timezone);
      paramIndex++;
    }
    
    if (role) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE platform_users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING id, email, name, first_name, last_name, role, phone, timezone, is_active, permissions, mfa_enabled, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    logger.info('User updated', {
      userId: id,
      updatedBy: req.user.id
    });
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (_error) {
    logger.error('Failed to update user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * PUT /api/portal/users/:id/permissions
 * Update user permissions (stores as JSONB array of permission strings)
 */
router.put('/:id/permissions', requirePlatformPermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array'
      });
    }
    
    // Store permissions as JSONB array (platform_users.permissions is JSONB)
    const result = await pool.query(
      `UPDATE platform_users 
       SET permissions = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, email, name, role, permissions`,
      [JSON.stringify(permissions), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    logger.info('User permissions updated', {
      userId: id,
      permissions: permissions.length,
      updatedBy: req.user.id
    });
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (_error) {
    logger.error('Failed to update user permissions', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update user permissions'
    });
  }
});

/**
 * DELETE /api/portal/users/:id
 * Soft delete a user
 */
router.delete('/:id', requirePlatformPermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }
    
    const result = await pool.query(
      `UPDATE platform_users 
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    logger.warn('User deleted', {
      userId: id,
      email: result.rows[0].email,
      deletedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (_error) {
    logger.error('Failed to delete user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

export default router;
