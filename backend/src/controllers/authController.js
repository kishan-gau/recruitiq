import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
import mfaService from '../services/mfaService.js';
import { validatePassword } from '../utils/passwordSecurity.js';

// Validation schemas
const registerSchema = Joi.object({
  organizationName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(12).max(128).required(), // Updated to 12-char minimum per NIST guidelines
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
      organizationId: user.organization_id,
      jti: crypto.randomBytes(16).toString('hex') // Add unique token identifier
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * Extract device metadata from request
 */
function extractDeviceMetadata(req) {
  const userAgent = req.get('user-agent') || '';
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  
  return {
    userAgent,
    ipAddress,
    deviceFingerprint: RefreshToken.generateDeviceFingerprint(userAgent, ipAddress),
    deviceName: RefreshToken.parseDeviceName(userAgent)
  };
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

    // Validate password security (NIST SP 800-63B compliance)
    const passwordValidation = await validatePassword(password, {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireDigits: true,
      requireSpecialChars: true,
      checkBreached: true, // Check against Have I Been Pwned
      checkCommon: true,   // Check against common password list
    });

    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('. '));
    }

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

    // Store refresh token with device metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    const deviceMetadata = extractDeviceMetadata(req);
    await RefreshToken.create(user.id, refreshToken, expiresAt, deviceMetadata);

    logger.info(`Refresh token created for new user ${user.email} from device: ${deviceMetadata.deviceName}`);

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
    const { mfaEnabled } = await mfaService.checkMFARequired(user.id);
    
    // Check organization MFA policy
    let mfaRequired = false;
    let mfaEnforcementDate = null;
    
    if (user.organization_id) {
      const org = await Organization.findById(user.organization_id);
      if (org) {
        mfaRequired = org.mfa_required || false;
        mfaEnforcementDate = org.mfa_enforcement_date;
      }
    }

    // Enforce mandatory MFA with grace period
    if (mfaRequired && !mfaEnabled) {
      const now = new Date();
      const isGracePeriodActive = mfaEnforcementDate && new Date(mfaEnforcementDate) > now;
      
      if (isGracePeriodActive) {
        // Grace period: Allow login but warn user
        const daysRemaining = Math.ceil((new Date(mfaEnforcementDate) - now) / (1000 * 60 * 60 * 24));
        logger.warn(`User ${user.email} logged in without MFA during grace period (${daysRemaining} days remaining)`);
        
        // Continue with normal login, but include warning in response
        // (We'll handle this after the normal token generation)
      } else {
        // Grace period expired or no grace period: Block login
        logger.warn(`Login blocked for ${user.email}: MFA required but not enabled (enforcement: ${mfaEnforcementDate || 'immediate'})`);
        
        return res.status(403).json({
          success: false,
          message: 'Multi-factor authentication is required',
          code: 'MFA_SETUP_REQUIRED',
          mfaRequired: true,
          mfaEnforced: true,
          setupRequired: true,
        });
      }
    }
    
    if (mfaEnabled) {
      // Generate temporary MFA token (short-lived, 5 minutes)
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

    // Get organization session policy
    let sessionPolicy = 'multiple';
    let maxSessionsPerUser = 5;
    let concurrentLoginDetection = false;

    if (user.organization_id) {
      const org = await Organization.findById(user.organization_id);
      if (org) {
        sessionPolicy = org.session_policy || 'multiple';
        maxSessionsPerUser = org.max_sessions_per_user || 5;
        concurrentLoginDetection = org.concurrent_login_detection || false;
      }
    }

    // Handle session policy
    if (sessionPolicy === 'single') {
      // Single session mode: Revoke all existing sessions
      const existingSessions = await RefreshToken.getActiveSessions(user.id);
      if (existingSessions.length > 0) {
        await RefreshToken.revokeAllForUser(user.id);
        logger.info(`Single session policy: Revoked ${existingSessions.length} existing session(s) for ${user.email}`);
      }
    } else if (concurrentLoginDetection) {
      // Check for concurrent logins from different IPs
      const recentSessions = await RefreshToken.getActiveSessions(user.id);
      const currentIp = req.ip || req.connection.remoteAddress;
      
      // Check if there's an active session from a different IP in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const concurrentSession = recentSessions.find(session => {
        const lastUsed = new Date(session.last_used_at || session.created_at);
        return session.ip_address !== currentIp && lastUsed > fiveMinutesAgo;
      });

      if (concurrentSession) {
        logger.warn(`Concurrent login detected for ${user.email}: Current IP ${currentIp}, Active IP ${concurrentSession.ip_address}`);
        // TODO: Send alert to org admin or block login
        // For now, just log the warning
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token with device metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const deviceMetadata = extractDeviceMetadata(req);
    await RefreshToken.create(user.id, refreshToken, expiresAt, deviceMetadata);

    // Enforce session limit for multiple session mode
    if (sessionPolicy === 'multiple') {
      const revokedCount = await RefreshToken.enforceSessionLimit(user.id, maxSessionsPerUser);
      if (revokedCount > 0) {
        logger.info(`Session limit enforced for ${user.email}: ${revokedCount} old sessions revoked (max: ${maxSessionsPerUser})`);
      }
    }

    logger.info(`User logged in: ${user.email} (${user.id}) from ${ip} on device: ${deviceMetadata.deviceName} [Policy: ${sessionPolicy}]`);

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
      token: accessToken, // For backward compatibility
      accessToken,
      refreshToken
    };

    // Add MFA grace period warning if applicable
    if (mfaRequired && !mfaEnabled && mfaEnforcementDate) {
      const now = new Date();
      const daysRemaining = Math.ceil((new Date(mfaEnforcementDate) - now) / (1000 * 60 * 60 * 24));
      
      if (daysRemaining > 0) {
        response.mfaWarning = {
          message: `MFA setup required. Multi-Factor Authentication is required for your organization. Please enable MFA within ${daysRemaining} days to continue accessing your account.`,
          daysRemaining,
          enforcementDate: mfaEnforcementDate,
          setupRequired: true,
        };
      }
    }

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

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token with device metadata
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    const deviceMetadata = extractDeviceMetadata(req);
    
    await RefreshToken.rotate(
      refreshToken, 
      user.id, 
      newRefreshToken, 
      expiresAt, 
      deviceMetadata
    );

    // Update last used timestamp
    await RefreshToken.updateLastUsed(newRefreshToken);

    logger.info(`Tokens refreshed for user: ${user.email} (${user.id}) from device: ${deviceMetadata.deviceName}`);

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
      password: Joi.string().min(12).max(128).required(), // Updated to 12-char minimum
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const { token, password } = value;

    // Validate password security (NIST SP 800-63B compliance)
    const passwordValidation = await validatePassword(password, {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireDigits: true,
      requireSpecialChars: true,
      checkBreached: true, // Check against Have I Been Pwned
      checkCommon: true,   // Check against common password list
    });

    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join('. '));
    }

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

/**
 * GET /api/auth/sessions
 * Get all active sessions for the authenticated user
 */
export async function getActiveSessions(req, res, next) {
  try {
    const userId = req.user.id;

    const sessions = await RefreshToken.getActiveSessions(userId);

    // Determine which session is the current one based on the request's refresh token
    const currentRefreshToken = req.cookies?.refreshToken;
    const currentDeviceFingerprint = currentRefreshToken 
      ? RefreshToken.generateDeviceFingerprint(
          req.get('user-agent') || '',
          req.ip || req.connection.remoteAddress || ''
        )
      : null;

    // Format sessions for response
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      deviceName: session.device_name || 'Unknown Device',
      ipAddress: session.ip_address,
      location: null, // TODO: Add IP geolocation lookup
      createdAt: session.created_at,
      lastUsedAt: session.last_used_at || session.created_at,
      isCurrent: session.device_fingerprint === currentDeviceFingerprint,
      userAgent: session.user_agent
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
      totalSessions: formattedSessions.length
    });

    logger.info(`Sessions list requested for user: ${req.user.email} (${userId})`);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
export async function revokeSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const result = await RefreshToken.revokeSession(userId, sessionId);

    if (!result) {
      throw new ValidationError('Session not found or already revoked');
    }

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });

    logger.info(`Session ${sessionId} revoked for user: ${req.user.email} (${userId})`);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/auth/sessions
 * Revoke all sessions except the current one
 */
export async function revokeAllSessions(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Get current refresh token to exclude it
    const currentRefreshToken = req.cookies?.refreshToken;
    if (!currentRefreshToken) {
      throw new ValidationError('Current session not found');
    }

    // Get current token record
    const currentToken = await RefreshToken.findByToken(currentRefreshToken);
    if (!currentToken) {
      throw new UnauthorizedError('Invalid current session');
    }

    // Get all active sessions
    const allSessions = await RefreshToken.getActiveSessions(userId);
    
    // Revoke all sessions except current one
    let revokedCount = 0;
    for (const session of allSessions) {
      if (session.id !== currentToken.id) {
        await RefreshToken.revokeSession(userId, session.id);
        revokedCount++;
      }
    }

    res.json({
      success: true,
      message: `${revokedCount} session(s) revoked successfully`,
      revokedCount
    });

    logger.info(`All sessions revoked for user: ${req.user.email} (${userId}), count: ${revokedCount}`);
  } catch (error) {
    next(error);
  }
}
