/**
 * Product Feature Routes
 * API routes for product feature management
 */

import express, { Router } from 'express';
import { productFeatureController } from '../controllers/index.js';
import { requirePlatformPermission } from '../../../middleware/auth.js';

const router: Router = express.Router();

// Feature listing and query routes
router.get(
  '/products/:productId/features',
  requirePlatformPermission('features:read'),
  productFeatureController.getProductFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/available',
  requirePlatformPermission('features:read'),
  productFeatureController.getAvailableFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/stats',
  requirePlatformPermission('features:read'),
  productFeatureController.getFeatureStats.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey',
  requirePlatformPermission('features:read'),
  productFeatureController.getFeature.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey/check',
  requirePlatformPermission('features:read'),
  productFeatureController.checkFeatureAvailability.bind(productFeatureController)
);

// Feature management routes (admin)
router.post(
  '/products/:productId/features',
  requirePlatformPermission('features:manage'),
  productFeatureController.createFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey',
  requirePlatformPermission('features:manage'),
  productFeatureController.updateFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey/rollout',
  requirePlatformPermission('features:manage'),
  productFeatureController.updateRollout.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/enable',
  requirePlatformPermission('features:manage'),
  productFeatureController.enableFeature.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/disable',
  requirePlatformPermission('features:manage'),
  productFeatureController.disableFeature.bind(productFeatureController)
);

router.delete(
  '/products/:productId/features/:featureKey',
  requirePlatformPermission('features:manage'),
  productFeatureController.deleteFeature.bind(productFeatureController)
);

export default router;
