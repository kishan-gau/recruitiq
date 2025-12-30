import express from 'express'
import { adminController } from '../controllers/adminController.js'
import { customerController } from '../controllers/customerController.js'
import { licenseController } from '../controllers/licenseController.js'
// Import from main auth middleware instead of license-specific
import { authenticatePlatform, requirePlatformPermission } from '../../../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// Auth routes now handled by main auth system
// Login will use main /api/auth/login endpoint

// All routes below require platform user authentication
router.use(authenticatePlatform)
router.use(requirePlatformPermission('license.view')) // All license routes need at least view permission

// Dashboard
router.get('/dashboard', asyncHandler(adminController.getDashboard))
router.get('/me', asyncHandler(adminController.getMe))

// Admin user management removed - use main user management system
// Platform users are managed through main auth system

// Audit log (requires audit permission)
router.get('/audit-log',
  requirePlatformPermission('license.analytics', 'security.audit'),
  asyncHandler(adminController.getAuditLog)
)

// Customer routes (all have license.view from router.use above)
router.get('/customers',
  asyncHandler(customerController.getCustomers)
)

router.get('/customers/:id',
  asyncHandler(customerController.getCustomer)
)

router.post('/customers',
  requirePlatformPermission('license.create'),
  auditLog('create_customer', 'customer'),
  asyncHandler(customerController.createCustomer)
)

router.put('/customers/:id',
  requirePlatformPermission('license.edit'),
  auditLog('update_customer', 'customer'),
  asyncHandler(customerController.updateCustomer)
)

router.delete('/customers/:id',
  requirePlatformPermission('license.delete'),
  auditLog('delete_customer', 'customer'),
  asyncHandler(customerController.deleteCustomer)
)

router.get('/customers/:id/usage',
  asyncHandler(customerController.getCustomerUsage)
)

// License routes (all have license.view from router.use above)
router.get('/licenses/:id',
  asyncHandler(licenseController.getLicense)
)

router.get('/licenses/expiring',
  asyncHandler(licenseController.getExpiringLicenses)
)

router.post('/licenses',
  requirePlatformPermission('license.create'),
  auditLog('create_license', 'license'),
  asyncHandler(licenseController.createLicense)
)

router.put('/licenses/:id',
  requirePlatformPermission('license.edit'),
  auditLog('update_license', 'license'),
  asyncHandler(licenseController.updateLicense)
)

router.post('/licenses/:id/renew',
  requirePlatformPermission('license.renew'),
  auditLog('renew_license', 'license'),
  asyncHandler(licenseController.renewLicense)
)

router.post('/licenses/:id/suspend',
  requirePlatformPermission('license.suspend'),
  auditLog('suspend_license', 'license'),
  asyncHandler(licenseController.suspendLicense)
)

router.post('/licenses/:id/reactivate',
  requirePlatformPermission('license.suspend'), // Same permission as suspend
  auditLog('reactivate_license', 'license'),
  asyncHandler(licenseController.reactivateLicense)
)

router.get('/licenses/:id/download',
  requirePlatformPermission('license.download'),
  auditLog('download_license_file', 'license'),
  asyncHandler(licenseController.generateLicenseFile)
)

router.delete('/licenses/:id',
  requirePlatformPermission('license.delete'),
  auditLog('delete_license', 'license'),
  asyncHandler(licenseController.deleteLicense)
)

export default router
