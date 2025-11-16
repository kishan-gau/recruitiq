import jwt from 'jsonwebtoken';
import PlatformUser from '../../models/PlatformUser.js';
import db from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Platform Authentication Controller
 * Handles authentication for platform users (Portal admins, License Managers)
 * Uses platform_users table
 * Generates JWT tokens with type: 'platform'
 */

/**
 * Login platform user
 * POST /api/platform/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await PlatformUser.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (PlatformUser.isAccountLocked(user)) {
      return res.status(403).json({
        error: 'Account is locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await PlatformUser.verifyPassword(user, password);

    if (!isValidPassword) {
      // Increment failed login attempts
      await PlatformUser.incrementFailedLogins(email);
      
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'platform', // Critical: identifies this as platform token
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // 15 minutes
    );

    // Generate refresh token (long-lived)
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { 
        id: user.id, 
        tokenId: refreshTokenId,
        type: 'platform'
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await db.query(
      `INSERT INTO platform_refresh_tokens 
       (id, user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        refreshTokenId,
        user.id,
        refreshToken,
        expiresAt,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent') || null
      ]
    );

    // Update last login
    await PlatformUser.updateLastLogin(user.id, req.ip || req.connection.remoteAddress);

    // SECURITY: Set tokens as httpOnly cookies (industry standard - protects against XSS)
    // Using 'platform_' prefix for clarity, strict sameSite (no SSO for platform admin)
    res.cookie('platform_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Strict for platform security (no cross-origin)
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    res.cookie('platform_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Strict for platform security
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Return success with user info only (tokens are in httpOnly cookies)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        type: 'platform'
      }
    });

  } catch (error) {
    console.error('Platform login error:', error);
    res.status(500).json({
      error: 'An error occurred during login'
    });
  }
};

/**
 * Refresh access token
 * POST /api/platform/auth/refresh
 */
export const refresh = async (req, res) => {
  try {
    // SECURITY: Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token'
      });
    }

    // Verify token type
    if (decoded.type !== 'platform') {
      return res.status(403).json({
        error: 'Invalid token type'
      });
    }

    // Check if refresh token exists in database and is not revoked
    const tokenResult = await db.query(
      `SELECT id, user_id, revoked_at 
       FROM platform_refresh_tokens 
       WHERE id = $1 AND token = $2`,
      [decoded.tokenId, refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Refresh token not found'
      });
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.revoked_at) {
      return res.status(401).json({
        error: 'Refresh token has been revoked'
      });
    }

    // Get user
    const user = await PlatformUser.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(403).json({
        error: 'User account is not active'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'platform',
        permissions: user.permissions || []
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // SECURITY: Set new access token as httpOnly cookie
    res.cookie('platform_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // Strict for platform security
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.json({
      success: true
    });

  } catch (error) {
    console.error('Platform token refresh error:', error);
    res.status(500).json({
      error: 'An error occurred during token refresh'
    });
  }
};

/**
 * Logout platform user
 * POST /api/platform/auth/logout
 */
export const logout = async (req, res) => {
  try {
    // SECURITY: Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      await db.query(
        `UPDATE platform_refresh_tokens 
         SET revoked_at = NOW() 
         WHERE token = $1`,
        [refreshToken]
      );
    }

    // SECURITY: Clear httpOnly cookies (must match cookie options used in login)
    // Use res.cookie with maxAge: 0 instead of clearCookie to ensure Max-Age=0 in response
    res.cookie('platform_access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    res.cookie('platform_refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Platform logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout'
    });
  }
};

/**
 * Get current platform user profile
 * GET /api/platform/auth/me
 */
export const getProfile = async (req, res) => {
  try {
    // User is already attached to req by authentication middleware
    const user = await PlatformUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        phone: user.phone,
        avatar: user.avatar,
        timezone: user.timezone,
        emailVerified: user.email_verified,
        mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        type: 'platform'
      }
    });

  } catch (error) {
    console.error('Get platform profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile'
    });
  }
};

/**
 * Revoke all refresh tokens for a user (force logout all sessions)
 * POST /api/platform/auth/revoke-all-sessions
 */
export const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE platform_refresh_tokens 
       SET revoked_at = NOW() 
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    res.json({
      success: true,
      message: 'All sessions revoked successfully'
    });

  } catch (error) {
    console.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while revoking sessions'
    });
  }
};
