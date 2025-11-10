/**
 * User Management Routes
 * Routes for managing platform and tenant users
 */

import express from 'express';
import { authenticate, requirePlatformUser, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// All routes require platform user authentication
router.use(authenticate);
router.use(requirePlatformUser);

/**
 * GET /api/portal/users
 * Get all users (platform and tenant)
 */
router.get('/users', requirePermission('portal.view'), async (req, res) => {
  try {
    const { user_type, role, search } = req.query;
    
    let query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.user_type,
        u.legacy_role,
        u.role_id,
        u.last_login_at,
        u.last_login_ip,
        u.email_verified,
        u.mfa_enabled,
        u.created_at,
        u.organization_id,
        o.name as organization_name,
        r.name as role_name,
        array_length(u.additional_permissions, 1) as permission_count
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
    `;
    
    const values = [];
    let paramIndex = 1;
    
    if (user_type) {
      query += ` AND u.user_type = $${paramIndex}`;
      values.push(user_type);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND (u.legacy_role = $${paramIndex} OR r.name = $${paramIndex})`;
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
  } catch (error) {
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
router.get('/users/:id', requirePermission('portal.view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        u.id,
        u.email,
        u.name,
        u.user_type,
        u.legacy_role,
        u.role_id,
        u.phone,
        u.avatar_url,
        u.timezone,
        u.last_login_at,
        u.last_login_ip,
        u.email_verified,
        u.mfa_enabled,
        u.created_at,
        u.updated_at,
        u.organization_id,
        u.additional_permissions,
        o.name as organization_name,
        r.name as role_name,
        r.display_name as role_display_name,
        array(
          SELECT p.name 
          FROM permissions p 
          WHERE p.id = ANY(u.additional_permissions)
        ) as permissions
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

/**
 * POST /api/portal/users
 * Create a new user
 */
router.post('/users', requirePermission('portal.manage'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, name, password, user_type, legacy_role, organization_id, permissions } = req.body;
    
    // Validation
    if (!email || !name || !password || !user_type) {
      return res.status(400).json({
        success: false,
        error: 'Email, name, password, and user_type are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
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
    
    // Get permission IDs if permission names provided
    let permissionIds = [];
    if (permissions && permissions.length > 0) {
      const permResult = await client.query(
        'SELECT id FROM permissions WHERE name = ANY($1)',
        [permissions]
      );
      permissionIds = permResult.rows.map(r => r.id);
    }
    
    // Split name into first and last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create user
    const result = await client.query(
      `INSERT INTO users (
        email, name, first_name, last_name, password_hash, user_type, legacy_role, 
        organization_id, additional_permissions, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, email, name, first_name, last_name, user_type, legacy_role`,
      [
        email.toLowerCase(),
        name,
        firstName,
        lastName,
        passwordHash,
        user_type,
        legacy_role || null,
        organization_id || null,
        permissionIds,
        true // Email verified for admin-created users
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
  } catch (error) {
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
router.put('/users/:id', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, timezone, legacy_role } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (name) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
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
    
    if (legacy_role) {
      updates.push(`legacy_role = $${paramIndex}`);
      values.push(legacy_role);
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
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING id, email, name, user_type, legacy_role
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
  } catch (error) {
    logger.error('Failed to update user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * PUT /api/portal/users/:id/permissions
 * Update user permissions
 */
router.put('/users/:id/permissions', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions must be an array'
      });
    }
    
    // Get permission IDs from names
    const permResult = await pool.query(
      'SELECT id FROM permissions WHERE name = ANY($1)',
      [permissions]
    );
    const permissionIds = permResult.rows.map(r => r.id);
    
    const result = await pool.query(
      `UPDATE users 
       SET additional_permissions = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, email, name`,
      [permissionIds, id]
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
  } catch (error) {
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
router.delete('/users/:id', requirePermission('portal.manage'), async (req, res) => {
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
      `UPDATE users 
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
  } catch (error) {
    logger.error('Failed to delete user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

export default router;
