/**
 * Product Config Routes
 * API routes for product configuration management
 */

import express from 'express';
import { productConfigController } from '../controllers/index.js';

const router = express.Router();

// Config routes
router.get(
  '/organizations/:organizationId/products/:productId/configs',
  productConfigController.getConfigs.bind(productConfigController)
);

router.get(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  productConfigController.getConfig.bind(productConfigController)
);

router.put(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  productConfigController.setConfig.bind(productConfigController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  productConfigController.updateConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  productConfigController.deleteConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs',
  productConfigController.deleteAllConfigs.bind(productConfigController)
);

export default router;
