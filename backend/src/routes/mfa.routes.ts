/**
 * MFA Routes
 * Multi-Factor Authentication endpoints
 */

import express from 'express';
import * as mfaController from '../controllers/mfaController.js';
import { authenticate } from '../middleware/auth.js';
import { createEndpointLimiter } from '../middleware/rateLimit.js';
import { checkFeature } from '../middleware/checkFeature.js';

const router = express.Router();

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
 * @access  Private (authenticated users + MFA feature required)
 */
router.post('/setup', authenticate, checkFeature('mfa'), mfaSetupLimiter, mfaController.setupMFA);

/**
 * @route   POST /api/auth/mfa/verify-setup
 * @desc    Verify TOTP token and enable MFA
 * @access  Private (authenticated users + MFA feature required)
 */
router.post('/verify-setup', authenticate, checkFeature('mfa'), mfaVerifyLimiter, mfaController.verifySetup);

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
 * @access  Private (requires password + TOTP/backup code + MFA feature)
 */
router.post('/disable', authenticate, checkFeature('mfa'), mfaManageLimiter, mfaController.disableMFA);

/**
 * @route   POST /api/auth/mfa/regenerate-backup-codes
 * @desc    Generate new backup codes (invalidates old ones)
 * @access  Private (requires password + TOTP + MFA feature)
 */
router.post('/regenerate-backup-codes', authenticate, checkFeature('mfa'), mfaManageLimiter, mfaController.regenerateBackupCodes);

/**
 * @route   GET /api/auth/mfa/status
 * @desc    Get MFA status for current user
 * @access  Private (authenticated users + MFA feature required)
 */
router.get('/status', authenticate, checkFeature('mfa'), mfaController.getMFAStatus);

export default router;
