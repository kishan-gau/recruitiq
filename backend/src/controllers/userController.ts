import Joi from 'joi';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

// Validation schemas
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(255).required(),
  role: Joi.string().valid('admin', 'recruiter', 'member').required(),
  permissions: Joi.array().items(Joi.string()).default([]),
  phone: Joi.string().max(50),
  timezone: Joi.string().max(100)
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  phone: Joi.string().max(50).allow(''),
  timezone: Joi.string().max(100),
  avatarUrl: Joi.string().uri().allow('')
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('owner', 'admin', 'recruiter', 'member').required(),
  permissions: Joi.array().items(Joi.string())
});

/**
 * List all users in organization
 */
export async function listUsers(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const { role, search, limit = 50, offset = 0 } = req.query;

    const users = await User.findAll(organizationId, {
      role,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID
 */
export async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const user = await User.findById(id, organizationId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        timezone: user.timezone,
        mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Create/invite new user
 */
export async function createUser(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    // Only owner and admin can create users
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can create users');
    }

    // Validate input
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { email, name, role, permissions, phone, timezone } = value;

    // Check license user limit
    const { canAddUser, limit, current } = await User.checkUserLimit(organizationId);
    if (!canAddUser) {
      return res.status(403).json({
        success: false,
        message: `User limit reached. Your organization has reached the maximum of ${limit} enabled users.`,
        current,
        limit,
        tier: req.user.tier || 'starter',
        upgradeSuggestion: 'Please upgrade your plan to add more users.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    // Create user
    const user = await User.create({
      organizationId,
      email,
      password: tempPassword,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
      role,
      permissions
    });

    // TODO: Send invitation email with password reset link

    logger.info(`User invited: ${user.email} by ${req.user.email}`);

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Users can only update themselves unless they're admin/owner
    if (id !== req.user.id && !['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('You can only update your own profile');
    }

    // Validate input
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const user = await User.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await User.update(id, value);

    logger.info(`User updated: ${updatedUser.email}`);

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        timezone: updatedUser.timezone
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update user role and permissions
 */
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner and admin can update roles
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can update user roles');
    }

    // Validate input
    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const user = await User.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Can't change owner role
    if (user.role === 'owner' && value.role !== 'owner') {
      throw new ForbiddenError('Cannot change owner role');
    }

    const updatedUser = await User.updateRole(id, value.role, value.permissions);

    logger.info(`User role updated: ${updatedUser.email} to ${value.role}`);

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        permissions: updatedUser.permissions
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Delete user
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Only owner and admin can delete users
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can delete users');
    }

    const user = await User.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Can't delete owner
    if (user.role === 'owner') {
      throw new ForbiddenError('Cannot delete organization owner');
    }

    // Can't delete yourself
    if (id === req.user.id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    await User.delete(id);

    logger.info(`User deleted: ${user.email} by ${req.user.email}`);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Update user active status (enable/disable)
 */
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const { is_active } = req.body;

    // Only owner and admin can update user status
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can update user status');
    }

    // Validate input
    if (typeof is_active !== 'boolean') {
      throw new ValidationError('is_active must be a boolean value');
    }

    const user = await User.findById(id, organizationId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Can't disable owner
    if (user.role === 'owner') {
      throw new ForbiddenError('Cannot disable organization owner');
    }

    try {
      const updatedUser = await User.updateStatus(id, is_active, organizationId);

      logger.info(`User ${is_active ? 'enabled' : 'disabled'}: ${updatedUser.email} by ${req.user.email}`);

      res.json({
        message: `User ${is_active ? 'enabled' : 'disabled'} successfully`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          is_active: updatedUser.is_active
        }
      });

    } catch (limitError) {
      if (limitError.message.includes('license') || limitError.message.includes('limit')) {
        const { limit, current } = await User.checkUserLimit(organizationId);
        return res.status(403).json({
          success: false,
          message: limitError.message,
          current,
          limit,
          tier: req.user.tier || 'starter'
        });
      }
      throw limitError;
    }

  } catch (error) {
    next(error);
  }
}
