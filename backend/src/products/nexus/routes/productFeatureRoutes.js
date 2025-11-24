/**
 * Product Feature Routes
 * API routes for product feature management
 */

import express from 'express';
import { productFeatureController } from '../controllers/index.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Feature listing and query routes
router.get(
  '/products/:productId/features',
  requirePermission('nexus:features:read'),
  productFeatureController.getProductFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/available',
  requirePermission('nexus:features:read'),
  productFeatureController.getAvailableFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/stats',
  requirePermission('nexus:features:read'),
  productFeatureController.getFeatureStats.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey',
  requirePermission('nexus:features:read'),
  productFeatureController.getFeature.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey/check',
  requirePermission('nexus:features:read'),
  productFeatureController.checkFeatureAvailability.bind(productFeatureController)
);

// Feature management routes (admin)
router.post(
  '/products/:productId/features',
  requirePermission('nexus:features:create'),
  productFeatureController.createFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey',
  requirePermission('nexus:features:update'),
  productFeatureController.updateFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey/rollout',
  requirePermission('nexus:features:update'),
  productFeatureController.updateRollout.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/enable',
  requirePermission('nexus:features:update'),
  productFeatureController.enableFeature.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/disable',
  requirePermission('nexus:features:update'),
  productFeatureController.disableFeature.bind(productFeatureController)
);

router.delete(
  '/products/:productId/features/:featureKey',
  requirePermission('nexus:features:delete'),
  productFeatureController.deleteFeature.bind(productFeatureController)
);

export default router;
