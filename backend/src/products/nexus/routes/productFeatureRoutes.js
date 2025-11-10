/**
 * Product Feature Routes
 * API routes for product feature management
 */

import express from 'express';
import { productFeatureController } from '../controllers/index.js';

const router = express.Router();

// Feature listing and query routes
router.get(
  '/products/:productId/features',
  productFeatureController.getProductFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/available',
  productFeatureController.getAvailableFeatures.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/stats',
  productFeatureController.getFeatureStats.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey',
  productFeatureController.getFeature.bind(productFeatureController)
);

router.get(
  '/products/:productId/features/:featureKey/check',
  productFeatureController.checkFeatureAvailability.bind(productFeatureController)
);

// Feature management routes (admin)
router.post(
  '/products/:productId/features',
  productFeatureController.createFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey',
  productFeatureController.updateFeature.bind(productFeatureController)
);

router.patch(
  '/products/:productId/features/:featureKey/rollout',
  productFeatureController.updateRollout.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/enable',
  productFeatureController.enableFeature.bind(productFeatureController)
);

router.post(
  '/products/:productId/features/:featureKey/disable',
  productFeatureController.disableFeature.bind(productFeatureController)
);

router.delete(
  '/products/:productId/features/:featureKey',
  productFeatureController.deleteFeature.bind(productFeatureController)
);

export default router;
