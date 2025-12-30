/**
 * Product Management Routes
 * Main router that combines all product-related routes
 */

import express, { Router } from 'express';
import { authenticatePlatform } from '../../../middleware/auth.ts';
const router: Router = express.Router();

import productRoutes from './productRoutes.ts';
import productPermissionRoutes from './productPermissionRoutes.ts';
import productFeatureRoutes from './productFeatureRoutes.ts';
import productConfigRoutes from './productConfigRoutes.ts';

// Apply platform authentication to ALL product management routes
router.use(authenticatePlatform);

// Mount routes
// Note: Already mounted at /api/admin/products in app.js, so use relative paths
router.use('/', productRoutes);
router.use('/', productPermissionRoutes);
router.use('/', productFeatureRoutes);
router.use('/', productConfigRoutes);

export default router;
