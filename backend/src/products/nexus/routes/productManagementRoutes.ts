/**
 * Product Management Routes
 * Main router that combines all product-related routes
 */

import express, { Router } from 'express';
import { authenticatePlatform } from '../../../middleware/auth.js';
const router: Router = express.Router();

import productRoutes from './productRoutes.js';
import productPermissionRoutes from './productPermissionRoutes.js';
import productFeatureRoutes from './productFeatureRoutes.js';
import productConfigRoutes from './productConfigRoutes.js';

// Apply platform authentication to ALL product management routes
router.use(authenticatePlatform);

// Mount routes
// Note: Already mounted at /api/admin/products in app.js, so use relative paths
router.use('/', productRoutes);
router.use('/', productPermissionRoutes);
router.use('/', productFeatureRoutes);
router.use('/', productConfigRoutes);

export default router;
