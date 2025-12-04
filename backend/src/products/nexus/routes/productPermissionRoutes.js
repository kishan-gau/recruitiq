/**
 * Product Permission Routes
 * API routes for product permission management
 */

import express from 'express';
import { productPermissionController } from '../controllers/index.js';
import { requirePlatformPermission } from '../../../middleware/auth.js';

const router = express.Router();

// Organization product access routes
router.get(
  '/organizations/:organizationId/products',
  requirePlatformPermission('products:read'),
  productPermissionController.getOrganizationProducts.bind(productPermissionController)
);

router.get(
  '/organizations/:organizationId/products/:productId',
  requirePlatformPermission('products:read'),
  productPermissionController.checkAccess.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/grant',
  requirePlatformPermission('products:manage'),
  productPermissionController.grantAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId',
  requirePlatformPermission('products:manage'),
  productPermissionController.updatePermission.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/revoke',
  requirePlatformPermission('products:manage'),
  productPermissionController.revokeAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/usage',
  requirePlatformPermission('products:manage'),
  productPermissionController.updateUsage.bind(productPermissionController)
);

// Feature-specific routes
router.get(
  '/organizations/:organizationId/products/:productId/features/:featureKey',
  requirePlatformPermission('features:read'),
  productPermissionController.checkFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/enable',
  requirePlatformPermission('features:manage'),
  productPermissionController.enableFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/disable',
  requirePlatformPermission('features:manage'),
  productPermissionController.disableFeature.bind(productPermissionController)
);

// Admin routes
router.get(
  '/licenses/expired',
  requirePlatformPermission('licenses:manage'),
  productPermissionController.getExpiredLicenses.bind(productPermissionController)
);

export default router;
