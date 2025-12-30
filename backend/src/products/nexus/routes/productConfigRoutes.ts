/**
 * Product Config Routes
 * API routes for product configuration management
 */

import express, { Router } from 'express';
import { productConfigController } from '../controllers/index.js';
import { requirePlatformPermission } from '../../../middleware/auth.js';

const router: Router = express.Router();

// Config routes
router.get(
  '/organizations/:organizationId/products/:productId/configs',
  requirePlatformPermission('config:read'),
  productConfigController.getConfigs.bind(productConfigController)
);

router.get(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePlatformPermission('config:read'),
  productConfigController.getConfig.bind(productConfigController)
);

router.put(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePlatformPermission('config:manage'),
  productConfigController.setConfig.bind(productConfigController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePlatformPermission('config:manage'),
  productConfigController.updateConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePlatformPermission('config:manage'),
  productConfigController.deleteConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs',
  requirePlatformPermission('config:manage'),
  productConfigController.deleteAllConfigs.bind(productConfigController)
);

export default router;
