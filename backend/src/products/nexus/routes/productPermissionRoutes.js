/**
 * Product Permission Routes
 * API routes for product permission management
 */

import express from 'express';
import { productPermissionController } from '../controllers/index.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Organization product access routes
router.get(
  '/organizations/:organizationId/products',
  requirePermission('nexus:products:read'),
  productPermissionController.getOrganizationProducts.bind(productPermissionController)
);

router.get(
  '/organizations/:organizationId/products/:productId',
  requirePermission('nexus:products:read'),
  productPermissionController.checkAccess.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/grant',
  requirePermission('nexus:products:manage'),
  productPermissionController.grantAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId',
  requirePermission('nexus:products:manage'),
  productPermissionController.updatePermission.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/revoke',
  requirePermission('nexus:products:manage'),
  productPermissionController.revokeAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/usage',
  requirePermission('nexus:products:manage'),
  productPermissionController.updateUsage.bind(productPermissionController)
);

// Feature-specific routes
router.get(
  '/organizations/:organizationId/products/:productId/features/:featureKey',
  requirePermission('nexus:features:read'),
  productPermissionController.checkFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/enable',
  requirePermission('nexus:features:update'),
  productPermissionController.enableFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/disable',
  requirePermission('nexus:features:update'),
  productPermissionController.disableFeature.bind(productPermissionController)
);

// Admin routes
router.get(
  '/licenses/expired',
  requirePermission('nexus:admin'),
  productPermissionController.getExpiredLicenses.bind(productPermissionController)
);

export default router;
