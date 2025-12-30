/**
 * Platform User Controller
 * Handles CRUD operations for platform administrators (users table with user_type='platform')
 * These are super admins who manage the entire RecruitIQ platform
 */

import Joi from 'joi';
import bcrypt from 'bcryptjs';
import platformDb from '../shared/database/licenseManagerDb.ts';
import logger from '../utils/logger.ts';

// Validation schemas
const createPlatformUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).max(255).required(),
  role: Joi.string().valid('super_admin', 'admin', 'support').default('admin'),
  phone: Joi.string().max(50).optional(),
  timezone: Joi.string().max(100).optional()
});

const updatePlatformUserSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('super_admin', 'admin', 'support').optional(),
  phone: Joi.string().max(50).allow('').optional(),
  timezone: Joi.string().max(100).optional(),
  isActive: Joi.boolean().optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

/**
 * Create a new platform user (super admin, admin, or support)
 * Only accessible by existing super_admin users
 */
export const createPlatformUser = async (req, res) => {
  try {
    const { error, value } = createPlatformUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { email, password, name, role, phone, timezone } = value;

    // Check if email already exists in users table
    const existingUser = await platformDb.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create platform user
    const result = await platformDb.query(
      `INSERT INTO users 
       (email, password_hash, name, role, user_type, phone, timezone, is_active)
       VALUES ($1, $2, $3, $4, 'platform', $5, $6, true)
       RETURNING id, email, name, role, user_type, phone, timezone, is_active, created_at`,
      [email.toLowerCase(), passwordHash, name, role, phone, timezone]
    );

    const user = result.rows[0];

    logger.info('Platform user created', {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: 'Platform user created successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: user.user_type,
        phone: user.phone,
        timezone: user.timezone,
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    logger.error('Error creating platform user', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create platform user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * List all platform users
 */
export const listPlatformUsers = async (req, res) => {
  try {
    const { role, search, isActive, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT id, email, name, role, user_type, phone, timezone, is_active, 
             last_login_at, created_at, updated_at
      FROM users
      WHERE user_type = 'platform'
    `;
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      sql += ` AND role = $${paramCount}`;
      params.push(role);
    }

    if (isActive !== undefined) {
      paramCount++;
      sql += ` AND is_active = $${paramCount}`;
      params.push(isActive === 'true');
    }

    if (search) {
      paramCount++;
      sql += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await platformDb.query(sql, params);

    // Get total count
    const countResult = await platformDb.query(
      `SELECT COUNT(*) as total FROM users WHERE user_type = 'platform'`,
      []
    );

    res.json({
      success: true,
      data: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: user.user_type,
        phone: user.phone,
        timezone: user.timezone,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error listing platform users', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to list platform users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get platform user by ID
 */
export const getPlatformUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await platformDb.query(
      `SELECT id, email, name, role, user_type, phone, timezone, is_active, 
              last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1 AND user_type = 'platform'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform user not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: user.user_type,
        phone: user.phone,
        timezone: user.timezone,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    logger.error('Error getting platform user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to get platform user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update platform user
 */
export const updatePlatformUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePlatformUserSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        paramCount++;
        const columnName = key === 'isActive' ? 'is_active' : key;
        updates.push(`${columnName} = $${paramCount}`);
        params.push(val);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }

    params.push(id);
    const result = await platformDb.query(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${params.length} AND user_type = 'platform'
       RETURNING id, email, name, role, user_type, phone, timezone, is_active, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform user not found'
      });
    }

    const user = result.rows[0];

    logger.info('Platform user updated', {
      userId: user.id,
      updatedBy: req.user.userId,
      changes: value
    });

    res.json({
      success: true,
      message: 'Platform user updated successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        userType: user.user_type,
        phone: user.phone,
        timezone: user.timezone,
        isActive: user.is_active,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    logger.error('Error updating platform user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update platform user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Change platform user password
 */
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = changePasswordSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const { currentPassword, newPassword } = value;

    // Only allow users to change their own password unless they're super_admin
    if (req.user.userId !== id && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only change your own password'
      });
    }

    // Get current password hash
    const userResult = await platformDb.query(
      'SELECT password_hash FROM users WHERE id = $1 AND user_type = $2',
      [id, 'platform']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform user not found'
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await platformDb.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, id]
    );

    logger.info('Platform user password changed', {
      userId: id,
      changedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deactivate platform user (soft delete)
 */
export const deactivatePlatformUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deactivating yourself
    if (req.user.userId === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const result = await platformDb.query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_type = 'platform'
       RETURNING id, email, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform user not found'
      });
    }

    logger.info('Platform user deactivated', {
      userId: id,
      deactivatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Platform user deactivated successfully'
    });
  } catch (error) {
    logger.error('Error deactivating platform user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate platform user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reactivate platform user
 */
export const reactivatePlatformUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await platformDb.query(
      `UPDATE users
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_type = 'platform'
       RETURNING id, email, name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Platform user not found'
      });
    }

    logger.info('Platform user reactivated', {
      userId: id,
      reactivatedBy: req.user.userId
    });

    res.json({
      success: true,
      message: 'Platform user reactivated successfully'
    });
  } catch (error) {
    logger.error('Error reactivating platform user', { error: error.message, userId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate platform user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  createPlatformUser,
  listPlatformUsers,
  getPlatformUser,
  updatePlatformUser,
  changePassword,
  deactivatePlatformUser,
  reactivatePlatformUser
};
