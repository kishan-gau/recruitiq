/**
 * Biometric Authentication Routes
 * WebAuthn-based biometric authentication for mobile PWA
 */

import { Router } from 'express';
import { authenticateTenant } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import BiometricAuthController from '../controllers/biometricAuthController.js';

const router = Router();
const controller = new BiometricAuthController();

// Rate limiting for biometric operations
const biometricRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Too many biometric authentication attempts, please try again later',
});

/**
 * Registration flow
 */

// Generate registration options (step 1)
router.post(
  '/register/options',
  authenticateTenant,
  biometricRateLimit,
  controller.generateRegistrationOptions
);

// Verify registration response (step 2)
router.post(
  '/register/verify',
  authenticateTenant,
  biometricRateLimit,
  controller.verifyRegistration
);

/**
 * Authentication flow
 */

// Generate authentication options (step 1)
router.post(
  '/authenticate/options',
  authenticateTenant,
  biometricRateLimit,
  controller.generateAuthenticationOptions
);

// Verify authentication response (step 2)
router.post(
  '/authenticate/verify',
  authenticateTenant,
  biometricRateLimit,
  controller.verifyAuthentication
);

/**
 * Credential management
 */

// Get employee's registered credentials
router.get(
  '/credentials',
  authenticateTenant,
  controller.getCredentials
);

// Revoke a biometric credential
router.delete(
  '/credentials/:credentialId',
  authenticateTenant,
  controller.revokeCredential
);

export default router;
