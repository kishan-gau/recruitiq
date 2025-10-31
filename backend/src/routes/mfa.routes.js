/**
 * MFA Routes
 * Multi-Factor Authentication endpoints
 */

const express = require('express');
const router = express.Router();
const mfaController = require('../controllers/mfaController');
const { authenticate } = require('../middleware/auth');
const { createEndpointLimiter } = require('../middleware/rateLimit');

/**
 * MFA Verification Rate Limiter
 * Strict rate limiting for MFA verification attempts
 * 5 attempts per 5 minutes per user/IP
 */
const mfaVerifyLimiter = createEndpointLimiter({
  endpoint: 'mfa-verify',
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts
  message: 'Too many MFA verification attempts. Please wait 5 minutes and try again.',
});

/**
 * MFA Setup Rate Limiter
 * Prevent abuse of MFA setup process
 * 3 setups per hour per user
 */
const mfaSetupLimiter = createEndpointLimiter({
  endpoint: 'mfa-setup',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: 'Too many MFA setup attempts. Please try again later.',
});

/**
 * MFA Management Rate Limiter
 * For disable/regenerate operations
 * 5 operations per hour
 */
const mfaManageLimiter = createEndpointLimiter({
  endpoint: 'mfa-manage',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many MFA management operations. Please try again later.',
});

/**
 * @route   POST /api/auth/mfa/setup
 * @desc    Initialize MFA setup (generate QR code)
 * @access  Private (authenticated users)
 */
router.post('/setup', authenticate, mfaSetupLimiter, mfaController.setupMFA);

/**
 * @route   POST /api/auth/mfa/verify-setup
 * @desc    Verify TOTP token and enable MFA
 * @access  Private (authenticated users)
 */
router.post('/verify-setup', authenticate, mfaVerifyLimiter, mfaController.verifySetup);

/**
 * @route   POST /api/auth/mfa/verify
 * @desc    Verify MFA token during login
 * @access  Public (uses temporary MFA token)
 */
router.post('/verify', mfaVerifyLimiter, mfaController.verifyMFA);

/**
 * @route   POST /api/auth/mfa/use-backup-code
 * @desc    Use backup code for login when TOTP unavailable
 * @access  Public (uses temporary MFA token)
 */
router.post('/use-backup-code', mfaVerifyLimiter, mfaController.useBackupCode);

/**
 * @route   POST /api/auth/mfa/disable
 * @desc    Disable MFA for user
 * @access  Private (requires password + TOTP/backup code)
 */
router.post('/disable', authenticate, mfaManageLimiter, mfaController.disableMFA);

/**
 * @route   POST /api/auth/mfa/regenerate-backup-codes
 * @desc    Generate new backup codes (invalidates old ones)
 * @access  Private (requires password + TOTP)
 */
router.post('/regenerate-backup-codes', authenticate, mfaManageLimiter, mfaController.regenerateBackupCodes);

/**
 * @route   GET /api/auth/mfa/status
 * @desc    Get MFA status for current user
 * @access  Private (authenticated users)
 */
router.get('/status', authenticate, mfaController.getMFAStatus);

module.exports = router;
