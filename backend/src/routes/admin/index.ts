/**
 * Admin Routes - Parent Router
 * Platform administration endpoints
 * 
 * Mounts admin sub-routers:
 * - /features - Feature management
 * 
 * Note: Product catalog management is handled by productManagementRoutes
 * mounted directly in app.js at /api/admin to maintain existing architecture.
 * This router handles other admin concerns.
 * 
 * @module routes/admin
 */

import express, { Router } from 'express';
import { authenticatePlatform } from '../../middleware/auth.ts';

const router: Router = express.Router();

// Apply platform authentication to all admin routes
router.use(authenticatePlatform);

// Import admin sub-routers
import featuresRouter from './features.ts';
import dashboardRouter from './dashboard.ts';
// Import customer routes from license module for convenience
import { customerController } from '../../modules/license/controllers/customerController.ts';
import { requirePlatformPermission } from '../../middleware/auth.ts';
import { asyncHandler } from '../../modules/license/middleware/errorHandler.ts';
import { auditLog } from '../../modules/license/middleware/audit.ts';

// Mount admin sub-routers
router.use('/features', featuresRouter);  // Creates /api/admin/features
router.use('/dashboard', dashboardRouter);  // Creates /api/admin/dashboard

// Customer routes (alias for /api/admin/licenses/customers)
// These are convenience routes that forward to the license module
router.get('/customers',
  requirePlatformPermission('license.view'),
  asyncHandler(customerController.getCustomers)
);

router.get('/customers/:id',
  requirePlatformPermission('license.view'),
  asyncHandler(customerController.getCustomer)
);

router.post('/customers',
  requirePlatformPermission('license.create'),
  auditLog('create_customer', 'customer'),
  asyncHandler(customerController.createCustomer)
);

router.put('/customers/:id',
  requirePlatformPermission('license.edit'),
  auditLog('update_customer', 'customer'),
  asyncHandler(customerController.updateCustomer)
);

router.delete('/customers/:id',
  requirePlatformPermission('license.delete'),
  auditLog('delete_customer', 'customer'),
  asyncHandler(customerController.deleteCustomer)
);

router.get('/customers/:id/usage',
  requirePlatformPermission('license.view'),
  asyncHandler(customerController.getCustomerUsage)
);

export default router;
