/**
 * Product Permission Routes
 * API routes for product permission management
 */

import express from 'express';
import { productPermissionController } from '../controllers/index.js';

const router = express.Router();

// Organization product access routes
router.get(
  '/organizations/:organizationId/products',
  productPermissionController.getOrganizationProducts.bind(productPermissionController)
);

router.get(
  '/organizations/:organizationId/products/:productId',
  productPermissionController.checkAccess.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/grant',
  productPermissionController.grantAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId',
  productPermissionController.updatePermission.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/revoke',
  productPermissionController.revokeAccess.bind(productPermissionController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/usage',
  productPermissionController.updateUsage.bind(productPermissionController)
);

// Feature-specific routes
router.get(
  '/organizations/:organizationId/products/:productId/features/:featureKey',
  productPermissionController.checkFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/enable',
  productPermissionController.enableFeature.bind(productPermissionController)
);

router.post(
  '/organizations/:organizationId/products/:productId/features/:featureKey/disable',
  productPermissionController.disableFeature.bind(productPermissionController)
);

// Admin routes
router.get(
  '/licenses/expired',
  productPermissionController.getExpiredLicenses.bind(productPermissionController)
);

export default router;
