/**
 * MFA Controller
 * Handles Multi-Factor Authentication endpoints
 */

const mfaService = require('../services/mfaService');
const tokenBlacklist = require('../services/tokenBlacklist');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const config = require('../config');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

/**
 * POST /api/auth/mfa/setup
 * Generate MFA secret and QR code for user to set up authenticator app
 * Requires authentication
 */
exports.setupMFA = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Check if MFA is already enabled
    const mfaStatus = await mfaService.getMFAStatus(userId);
    if (mfaStatus.enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is already enabled. Disable it first to set up again.',
      });
    }

    // Generate new secret and QR code
    const { secret, qrCodeUrl, manualEntryKey } = await mfaService.generateSecret(userEmail);

    // Store secret temporarily in session or return it
    // DON'T enable MFA yet - wait for verification
    res.json({
      success: true,
      data: {
        qrCodeUrl, // QR code for scanning with authenticator app
        manualEntryKey, // Secret for manual entry
        message: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
      },
      // Include secret in response for verification step
      tempSecret: secret,
    });

    logger.info(`MFA setup initiated for user: ${userId}`);
  } catch (error) {
    logger.error('Error in setupMFA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set up MFA',
    });
  }
};

/**
 * POST /api/auth/mfa/verify-setup
 * Verify TOTP token and enable MFA
 * Body: { token: string, secret: string }
 */
exports.verifySetup = async (req, res) => {
  try {
    const { token, secret } = req.body;
    const userId = req.user.id;

    if (!token || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Token and secret are required',
      });
    }

    // Verify the TOTP token
    const isValid = mfaService.verifyToken(token, secret);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please try again.',
      });
    }

    // Generate backup codes
    const { codes, hashedCodes } = await mfaService.generateBackupCodes();

    // Enable MFA for user
    await mfaService.enableMFA(userId, secret, hashedCodes);

    res.json({
      success: true,
      message: 'MFA has been successfully enabled',
      data: {
        backupCodes: codes, // Show backup codes once
        warning: 'Save these backup codes in a secure location. You will not be able to see them again.',
      },
    });

    logger.info(`MFA enabled successfully for user: ${userId}`);
  } catch (error) {
    logger.error('Error in verifySetup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable MFA',
    });
  }
};

/**
 * POST /api/auth/mfa/verify
 * Verify MFA token during login (after initial credentials check)
 * Body: { mfaToken: string, token: string }
 */
exports.verifyMFA = async (req, res) => {
  try {
    const { mfaToken, token } = req.body;

    if (!mfaToken || !token) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and temporary token are required',
      });
    }

    // Verify temporary MFA token
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, config.jwt.accessSecret);
      
      if (decoded.type !== 'mfa_pending') {
        return res.status(401).json({
          success: false,
          message: 'Invalid MFA token',
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired MFA token',
      });
    }

    const userId = decoded.userId;

    // Get user's MFA secret
    const { mfaEnabled, mfaSecret } = await mfaService.checkMFARequired(userId);
    
    if (!mfaEnabled || !mfaSecret) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled for this account',
      });
    }

    // Verify TOTP token
    const isValid = mfaService.verifyToken(token, mfaSecret);
    if (!isValid) {
      logger.warn(`Failed MFA verification attempt for user: ${userId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    // Get full user details
    const result = await pool.query(
      `SELECT u.*, r.name as role_name, r.level as role_level
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    // Generate real access and refresh tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        organizationId: user.organization_id,
        userType: user.user_type,
        role: user.role_name,
        roleLevel: user.role_level,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    // Store refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${config.jwt.refreshExpiry}')`,
      [user.id, refreshToken]
    );

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: 'MFA verification successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.user_type,
          role: user.role_name,
        },
        accessToken,
        refreshToken,
      },
    });

    logger.info(`MFA verification successful for user: ${userId}`);
  } catch (error) {
    logger.error('Error in verifyMFA:', error);
    res.status(500).json({
      success: false,
      message: 'MFA verification failed',
    });
  }
};

/**
 * POST /api/auth/mfa/use-backup-code
 * Use a backup code for authentication when TOTP is unavailable
 * Body: { mfaToken: string, backupCode: string }
 */
exports.useBackupCode = async (req, res) => {
  try {
    const { mfaToken, backupCode } = req.body;

    if (!mfaToken || !backupCode) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and backup code are required',
      });
    }

    // Verify temporary MFA token
    let decoded;
    try {
      decoded = jwt.verify(mfaToken, config.jwt.accessSecret);
      
      if (decoded.type !== 'mfa_pending') {
        return res.status(401).json({
          success: false,
          message: 'Invalid MFA token',
        });
      }
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired MFA token',
      });
    }

    const userId = decoded.userId;

    // Get user's backup codes
    const result = await pool.query(
      `SELECT mfa_enabled, mfa_backup_codes 
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    if (!user.mfa_enabled || !user.mfa_backup_codes || user.mfa_backup_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No backup codes available',
      });
    }

    // Verify backup code
    const codeIndex = await mfaService.verifyBackupCode(backupCode, user.mfa_backup_codes);
    
    if (codeIndex === -1) {
      logger.warn(`Failed backup code attempt for user: ${userId}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid backup code',
      });
    }

    // Mark backup code as used
    await mfaService.markBackupCodeUsed(userId, codeIndex);

    // Get remaining backup codes count
    const remainingCodes = user.mfa_backup_codes.length - 1;

    // Get full user details for token generation
    const userResult = await pool.query(
      `SELECT u.*, r.name as role_name, r.level as role_level
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    const fullUser = userResult.rows[0];

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      {
        userId: fullUser.id,
        email: fullUser.email,
        organizationId: fullUser.organization_id,
        userType: fullUser.user_type,
        role: fullUser.role_name,
        roleLevel: fullUser.role_level,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
      { userId: fullUser.id, email: fullUser.email },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    // Store refresh token
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${config.jwt.refreshExpiry}')`,
      [fullUser.id, refreshToken]
    );

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Backup code accepted',
      data: {
        user: {
          id: fullUser.id,
          email: fullUser.email,
          name: fullUser.name,
          userType: fullUser.user_type,
          role: fullUser.role_name,
        },
        accessToken,
        refreshToken,
        warning: remainingCodes <= 2 
          ? `Only ${remainingCodes} backup codes remaining. Consider regenerating them.`
          : `${remainingCodes} backup codes remaining`,
      },
    });

    logger.info(`Backup code used successfully for user: ${userId} (${remainingCodes} codes remaining)`);
  } catch (error) {
    logger.error('Error in useBackupCode:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify backup code',
    });
  }
};

/**
 * POST /api/auth/mfa/disable
 * Disable MFA for the user
 * Body: { password: string, token: string }
 * Requires current password and TOTP token or backup code
 */
exports.disableMFA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const userId = req.user.id;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Password and verification code are required',
      });
    }

    // Get user details
    const result = await pool.query(
      `SELECT password_hash, mfa_enabled, mfa_secret, mfa_backup_codes
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    if (!user.mfa_enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Verify TOTP token or backup code
    let isTokenValid = false;

    // Try as TOTP token first
    if (/^\d{6}$/.test(token.replace(/\s/g, ''))) {
      isTokenValid = mfaService.verifyToken(token, user.mfa_secret);
    }

    // If not valid as TOTP, try as backup code
    if (!isTokenValid && user.mfa_backup_codes) {
      const codeIndex = await mfaService.verifyBackupCode(token, user.mfa_backup_codes);
      isTokenValid = codeIndex !== -1;
    }

    if (!isTokenValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    // Disable MFA
    await mfaService.disableMFA(userId);

    // Invalidate all user sessions for security
    await tokenBlacklist.blacklistAllUserTokens(userId);

    res.json({
      success: true,
      message: 'MFA has been disabled. All sessions have been invalidated for security.',
    });

    logger.info(`MFA disabled for user: ${userId}`);
  } catch (error) {
    logger.error('Error in disableMFA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable MFA',
    });
  }
};

/**
 * POST /api/auth/mfa/regenerate-backup-codes
 * Generate new backup codes (invalidates old ones)
 * Body: { password: string, token: string }
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const { password, token } = req.body;
    const userId = req.user.id;

    if (!password || !token) {
      return res.status(400).json({
        success: false,
        message: 'Password and verification code are required',
      });
    }

    // Get user details
    const result = await pool.query(
      `SELECT password_hash, mfa_enabled, mfa_secret
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    if (!user.mfa_enabled) {
      return res.status(400).json({
        success: false,
        message: 'MFA is not enabled',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Verify TOTP token
    const isTokenValid = mfaService.verifyToken(token, user.mfa_secret);
    if (!isTokenValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code',
      });
    }

    // Regenerate backup codes
    const newCodes = await mfaService.regenerateBackupCodes(userId);

    res.json({
      success: true,
      message: 'New backup codes generated',
      data: {
        backupCodes: newCodes,
        warning: 'Save these backup codes in a secure location. Old backup codes are no longer valid.',
      },
    });

    logger.info(`Backup codes regenerated for user: ${userId}`);
  } catch (error) {
    logger.error('Error in regenerateBackupCodes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate backup codes',
    });
  }
};

/**
 * GET /api/auth/mfa/status
 * Get MFA status for current user
 */
exports.getMFAStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await mfaService.getMFAStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error in getMFAStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get MFA status',
    });
  }
};
