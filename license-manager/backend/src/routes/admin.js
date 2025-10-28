import express from 'express'
import { adminController } from '../controllers/adminController.js'
import { customerController } from '../controllers/customerController.js'
import { licenseController } from '../controllers/licenseController.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// Auth routes (no authentication required)
router.post('/login', asyncHandler(adminController.login))

// All routes below require authentication
router.use(authenticateAdmin)

// Dashboard
router.get('/dashboard', asyncHandler(adminController.getDashboard))
router.get('/me', asyncHandler(adminController.getMe))

// Admin user management (super_admin only)
router.get('/users',
  requireRole(['super_admin']),
  asyncHandler(adminController.getAdminUsers)
)

router.post('/users',
  requireRole(['super_admin']),
  auditLog('create_admin_user', 'admin_user'),
  asyncHandler(adminController.createAdminUser)
)

router.put('/users/:id',
  requireRole(['super_admin']),
  auditLog('update_admin_user', 'admin_user'),
  asyncHandler(adminController.updateAdminUser)
)

router.delete('/users/:id',
  requireRole(['super_admin']),
  auditLog('delete_admin_user', 'admin_user'),
  asyncHandler(adminController.deleteAdminUser)
)

// Audit log (admin and above)
router.get('/audit-log',
  requireRole(['super_admin', 'admin']),
  asyncHandler(adminController.getAuditLog)
)

// Customer routes
router.get('/customers',
  asyncHandler(customerController.getCustomers)
)

router.get('/customers/:id',
  asyncHandler(customerController.getCustomer)
)

router.post('/customers',
  requireRole(['super_admin', 'admin']),
  auditLog('create_customer', 'customer'),
  asyncHandler(customerController.createCustomer)
)

router.put('/customers/:id',
  requireRole(['super_admin', 'admin']),
  auditLog('update_customer', 'customer'),
  asyncHandler(customerController.updateCustomer)
)

router.delete('/customers/:id',
  requireRole(['super_admin', 'admin']),
  auditLog('delete_customer', 'customer'),
  asyncHandler(customerController.deleteCustomer)
)

router.get('/customers/:id/usage',
  asyncHandler(customerController.getCustomerUsage)
)

// License routes
router.get('/licenses/:id',
  asyncHandler(licenseController.getLicense)
)

router.get('/licenses/expiring',
  asyncHandler(licenseController.getExpiringLicenses)
)

router.post('/licenses',
  requireRole(['super_admin', 'admin']),
  auditLog('create_license', 'license'),
  asyncHandler(licenseController.createLicense)
)

router.put('/licenses/:id',
  requireRole(['super_admin', 'admin']),
  auditLog('update_license', 'license'),
  asyncHandler(licenseController.updateLicense)
)

router.post('/licenses/:id/renew',
  requireRole(['super_admin', 'admin']),
  auditLog('renew_license', 'license'),
  asyncHandler(licenseController.renewLicense)
)

router.post('/licenses/:id/suspend',
  requireRole(['super_admin', 'admin']),
  auditLog('suspend_license', 'license'),
  asyncHandler(licenseController.suspendLicense)
)

router.post('/licenses/:id/reactivate',
  requireRole(['super_admin', 'admin']),
  auditLog('reactivate_license', 'license'),
  asyncHandler(licenseController.reactivateLicense)
)

router.get('/licenses/:id/download',
  auditLog('download_license_file', 'license'),
  asyncHandler(licenseController.generateLicenseFile)
)

router.delete('/licenses/:id',
  requireRole(['super_admin', 'admin']),
  auditLog('delete_license', 'license'),
  asyncHandler(licenseController.deleteLicense)
)

export default router
