import express, { Router } from 'express'
import { validationController } from '../controllers/validationController.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router: Router = express.Router()

// All validation endpoints are public (no authentication)
// They will be called by RecruitIQ instances

// Validate license
router.post('/validate', asyncHandler(validationController.validateLicense))

// Check feature access
router.post('/feature', asyncHandler(validationController.checkFeature))

// Check resource limit (by customer ID)
router.post('/limit', asyncHandler(validationController.checkLimit))

// Check resource limit by instance key (for RecruitIQ instances)
router.post('/check-limit', asyncHandler(validationController.checkLimitByInstance))

// Get license details
router.get('/details/:customerId', asyncHandler(validationController.getLicenseDetails))

// Verify license file (.lic signature)
router.post('/verify-file', asyncHandler(validationController.verifyLicenseFile))

// Get public key for instances to verify signatures
router.get('/public-key', asyncHandler(validationController.getPublicKey))

// Get validation history (for admin debugging)
router.get('/history/:customerId', asyncHandler(validationController.getValidationHistory))

export default router
