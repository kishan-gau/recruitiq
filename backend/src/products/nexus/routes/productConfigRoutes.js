/**
 * Product Config Routes
 * API routes for product configuration management
 */

import express from 'express';
import { productConfigController } from '../controllers/index.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Config routes
router.get(
  '/organizations/:organizationId/products/:productId/configs',
  requirePermission('nexus:config:read'),
  productConfigController.getConfigs.bind(productConfigController)
);

router.get(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePermission('nexus:config:read'),
  productConfigController.getConfig.bind(productConfigController)
);

router.put(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePermission('nexus:config:update'),
  productConfigController.setConfig.bind(productConfigController)
);

router.patch(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePermission('nexus:config:update'),
  productConfigController.updateConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs/:configKey',
  requirePermission('nexus:config:delete'),
  productConfigController.deleteConfig.bind(productConfigController)
);

router.delete(
  '/organizations/:organizationId/products/:productId/configs',
  requirePermission('nexus:config:delete'),
  productConfigController.deleteAllConfigs.bind(productConfigController)
);

export default router;
