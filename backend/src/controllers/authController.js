import jwt from 'jsonwebtoken';
import Joi from 'joi';
import config from '../config/index.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import RefreshToken from '../models/RefreshToken.js';
import logger from '../utils/logger.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';

// Validation schemas
const registerSchema = Joi.object({
  organizationName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
      role: user.role
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organization_id
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * Register new organization and owner user
 */
export async function register(req, res, next) {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { organizationName, email, password, firstName, lastName } = value;

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check if organization name is available
    const isNameAvailable = await Organization.isNameAvailable(organizationName);
    if (!isNameAvailable) {
      throw new ConflictError('Organization name already taken');
    }

    // Create organization first
    const organization = await Organization.create({
      name: organizationName,
      tier: 'starter',
      subscriptionStatus: 'trialing'
    });

    // Create owner user
    const user = await User.create({
      organizationId: organization.id,
      email,
      password,
      firstName,
      lastName,
      role: 'owner',
      permissions: ['*'] // Owner has all permissions
    });

    logger.info(`New organization registered: ${organization.name} (${organization.id})`);
    logger.info(`Owner user created: ${user.email} (${user.id})`);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await RefreshToken.create(user.id, refreshToken, expiresAt);

    // Return user data and tokens
    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: {
          id: organization.id,
          name: organization.name,
          tier: organization.tier,
          subscriptionStatus: organization.subscription_status
        }
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 */
export async function login(req, res, next) {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { email, password } = value;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (User.isAccountLocked(user)) {
      throw new UnauthorizedError('Account locked due to multiple failed login attempts. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = await User.incrementFailedLogins(email);
      logger.warn(`Failed login attempt for ${email} (${failedAttempts} attempts)`);
      
      throw new UnauthorizedError('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    await User.resetFailedLogins(email);

    // Update last login timestamp
    await User.updateLastLogin(user.id, user.organization_id);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await RefreshToken.create(user.id, refreshToken, expiresAt);

    logger.info(`User logged in: ${user.email} (${user.id})`);

    // Return user data and tokens
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        organization: {
          id: user.organization_id,
          name: user.organization_name,
          tier: user.organization_tier
        }
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Logout user (revoke refresh token)
 */
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Revoke the token
    await RefreshToken.revoke(refreshToken);

    logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);

    res.json({ message: 'Logout successful' });

  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if token exists and is not revoked
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const user = await User.findById(payload.userId, payload.organizationId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    res.json({
      accessToken: newAccessToken
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 */
export async function me(req, res, next) {
  try {
    // User is already attached by authenticate middleware
    const user = req.user;

    if (!user) {
      throw new UnauthorizedError('Not authenticated');
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
        mfaEnabled: user.mfa_enabled,
        organization: {
          id: user.organization_id,
          name: user.organization_name,
          tier: user.organization_tier
        }
      }
    });

  } catch (error) {
    next(error);
  }
}
