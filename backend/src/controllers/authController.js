import jwt from 'jsonwebtoken';
import Joi from 'joi';
import config from '../config/index.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import RefreshToken from '../models/RefreshToken.js';
import logger from '../utils/logger.js';
import { ValidationError, UnauthorizedError, ConflictError } from '../middleware/errorHandler.js';
import tokenBlacklist from '../services/tokenBlacklist.js';
import accountLockout from '../services/accountLockout.js';
import ipTracking from '../services/ipTracking.js';

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
      organizationId: user.organization_id || null,
      userType: user.user_type,
      role: user.role || user.role_name,
      roleId: user.role_id,
      roleLevel: user.role_level,
      permissions: user.permissions || []
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
    const ip = req.ip || req.connection.remoteAddress;

    // Check if email is locked
    const emailLockStatus = await accountLockout.checkLockout(email, 'email');
    if (emailLockStatus.isLocked) {
      logger.warn(`Login attempt for locked account: ${email}`, { ip });
      throw new UnauthorizedError(
        `Account temporarily locked due to multiple failed login attempts. Try again in ${emailLockStatus.lockoutRemainingMinutes} minutes.`
      );
    }

    // Check if IP is locked
    const ipLockStatus = await accountLockout.checkLockout(ip, 'ip');
    if (ipLockStatus.isLocked) {
      logger.warn(`Login attempt from locked IP: ${ip}`, { email });
      throw new UnauthorizedError(
        `Too many failed login attempts from this location. Try again in ${ipLockStatus.lockoutRemainingMinutes} minutes.`
      );
    }

    // Check for manual locks
    const isManuallyLockedEmail = await accountLockout.isManuallyLocked(email, 'email');
    const isManuallyLockedIp = await accountLockout.isManuallyLocked(ip, 'ip');
    
    if (isManuallyLockedEmail || isManuallyLockedIp) {
      logger.warn(`Login attempt for manually locked account/IP: ${email}/${ip}`);
      throw new UnauthorizedError('Account has been locked. Please contact support.');
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      // Record failed attempt (even for non-existent users to prevent enumeration)
      await accountLockout.recordFailedAttempt(email, 'email');
      await accountLockout.recordFailedAttempt(ip, 'ip');
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked (legacy check from User model)
    if (User.isAccountLocked && User.isAccountLocked(user)) {
      throw new UnauthorizedError('Account locked. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);
    if (!isPasswordValid) {
      // Record failed attempts
      const emailResult = await accountLockout.recordFailedAttempt(email, 'email');
      const ipResult = await accountLockout.recordFailedAttempt(ip, 'ip');
      
      logger.warn(`Failed login attempt for ${email} from ${ip}`, {
        emailAttempts: emailResult.failedAttempts,
        ipAttempts: ipResult.failedAttempts,
      });
      
      // Add progressive delay
      const delay = accountLockout.getProgressiveDelay(emailResult.failedAttempts);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      throw new UnauthorizedError('Invalid credentials');
    }

    // Clear failed login attempts on successful login
    await accountLockout.clearFailedAttempts(email, 'email');
    await accountLockout.clearFailedAttempts(ip, 'ip');
    
    // Legacy: Reset failed logins in User model if exists
    if (User.resetFailedLogins) {
      await User.resetFailedLogins(email);
    }

    // Update last login timestamp
    await User.updateLastLogin(user.id);

    // Track IP address and detect anomalies
    const ipAnalysis = await ipTracking.recordIP(user.id, ip, {
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // Log IP anomalies (but don't block login)
    if (ipAnalysis.isSuspicious) {
      logger.warn('Suspicious login detected', {
        userId: user.id,
        email: user.email,
        ip,
        reasons: ipAnalysis.suspiciousReasons,
        knownIPs: ipAnalysis.totalKnownIPs,
      });
      // TODO: Send security alert email to user
    }

    // Check if MFA is enabled for this user
    const mfaService = require('../services/mfaService');
    const { mfaEnabled } = await mfaService.checkMFARequired(user.id);
    
    if (mfaEnabled) {
      // Generate temporary MFA token (short-lived, 5 minutes)
      const jwt = require('jsonwebtoken');
      const config = require('../config');
      
      const mfaToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          type: 'mfa_pending'
        },
        config.jwt.accessSecret,
        { expiresIn: '5m' }
      );
      
      logger.info(`MFA required for login: ${user.email} (${user.id})`);
      
      return res.json({
        message: 'MFA verification required',
        mfaRequired: true,
        mfaToken, // Temporary token for MFA verification step
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await RefreshToken.create(user.id, refreshToken, expiresAt);

    logger.info(`User logged in: ${user.email} (${user.id}) from ${ip}`);

    // Set HTTP-only cookies for SSO across different ports
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set accessToken cookie (short-lived, 15 minutes)
    res.cookie('accessToken', accessToken, {
      httpOnly: true, // Cannot be accessed via JavaScript (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    // Set refreshToken cookie (long-lived, 30 days)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, // Cannot be accessed via JavaScript (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Return user data and tokens (include security notice if suspicious)
    const response = {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        user_type: user.user_type,
        permissions: user.permissions,
        organization: {
          id: user.organization_id,
          name: user.organization_name,
          tier: user.organization_tier
        }
      },
      accessToken,
      refreshToken
    };

    // Add security notice if this is a new/suspicious IP
    if (ipAnalysis.isSuspicious) {
      response.securityNotice = {
        message: 'Login from new location detected',
        reasons: ipAnalysis.suspiciousReasons,
        isNewIP: ipAnalysis.isNewIP,
      };
    }

    res.json(response);

  } catch (error) {
    next(error);
  }
}

/**
 * Logout user (revoke refresh token and blacklist access token)
 */
export async function logout(req, res, next) {
  try {
    // Get refreshToken from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    // If no refresh token, user might already be logged out - just clear cookies and return success
    if (!refreshToken) {
      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      return res.json({ message: 'Logout successful' });
    }

    // Get access token from cookie, header, or body
    let accessToken = req.cookies?.accessToken;
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    // Blacklist the access token if provided
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.exp) {
          const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
          if (expiresIn > 0) {
            await tokenBlacklist.blacklistToken(accessToken, expiresIn);
            logger.debug('Access token blacklisted on logout');
          }
        }
      } catch (err) {
        logger.error('Failed to blacklist access token:', err);
        // Continue with logout even if blacklisting fails
      }
    }

    // Blacklist the refresh token
    try {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await tokenBlacklist.blacklistToken(refreshToken, expiresIn);
          logger.debug('Refresh token blacklisted on logout');
        }
      }
    } catch (err) {
      logger.error('Failed to blacklist refresh token:', err);
    }

    // Revoke the refresh token from database
    await RefreshToken.revoke(refreshToken);

    logger.info(`User logged out: ${req.user?.email || 'Unknown'}`);

    // Clear HTTP-only cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });

    res.json({ message: 'Logout successful' });

  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token with token rotation
 */
export async function refresh(req, res, next) {
  try {
    // Get refreshToken from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Check if refresh token is blacklisted
    const isBlacklisted = await tokenBlacklist.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      logger.warn('Attempt to use blacklisted refresh token');
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if token exists and is not revoked in database
    const tokenRecord = await RefreshToken.findByToken(refreshToken);
    if (!tokenRecord) {
      logger.warn('Refresh token not found in database', { userId: payload.userId });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Get user
    const user = await User.findById(payload.userId, payload.organizationId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Blacklist the old refresh token
    try {
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await tokenBlacklist.blacklistToken(refreshToken, expiresIn);
        logger.debug('Old refresh token blacklisted during rotation');
      }
    } catch (err) {
      logger.error('Failed to blacklist old refresh token:', err);
      // Continue even if blacklisting fails
    }

    // Revoke old refresh token from database
    await RefreshToken.revoke(refreshToken);

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await RefreshToken.create(user.id, newRefreshToken, expiresAt);

    logger.info(`Tokens refreshed for user: ${user.email} (${user.id})`);

    // Set new HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
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
        user_type: user.user_type,
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

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function requestPasswordReset(req, res, next) {
  try {
    const passwordResetService = require('../services/passwordResetService');
    
    // Validate input
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { email } = value;

    // Check rate limiting
    const rateCheck = await passwordResetService.canRequestReset(email);
    if (!rateCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: rateCheck.message,
      });
    }

    // Request reset (always return success to prevent email enumeration)
    const result = await passwordResetService.requestPasswordReset(email);

    if (result.emailFound) {
      // TODO: Send email with reset link
      // For now, log the token (in production, send via email)
      logger.info(`Password reset token for ${email}: ${result.token}`);
      
      // In production, you would send an email here:
      // await emailService.sendPasswordResetEmail({
      //   to: result.userEmail,
      //   name: result.userName,
      //   resetUrl: `${config.frontend.url}/reset-password?token=${result.token}`,
      // });
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });

    logger.info(`Password reset requested for: ${email}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Verify password reset token
 * GET /api/auth/reset-password/:token
 */
export async function verifyPasswordResetToken(req, res, next) {
  try {
    const passwordResetService = require('../services/passwordResetService');
    const { token } = req.params;

    if (!token) {
      throw new ValidationError('Reset token is required');
    }

    const verification = await passwordResetService.verifyResetToken(token);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: verification.error,
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: verification.email,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const passwordResetService = require('../services/passwordResetService');
    
    // Validate input
    const schema = Joi.object({
      token: Joi.string().required(),
      password: Joi.string().min(8).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { token, password } = value;

    // Reset password
    const result = await passwordResetService.resetPassword(token, password);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. All sessions have been invalidated. Please log in with your new password.',
    });

    logger.info(`Password reset completed for user: ${result.userId}`);
  } catch (error) {
    next(error);
  }
}
