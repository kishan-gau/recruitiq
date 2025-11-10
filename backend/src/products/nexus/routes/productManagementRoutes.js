/**
 * Product Management Routes
 * Main router that combines all product-related routes
 */

import express from 'express';
const router = express.Router();

import productRoutes from './productRoutes.js';
import productPermissionRoutes from './productPermissionRoutes.js';
import productFeatureRoutes from './productFeatureRoutes.js';
import productConfigRoutes from './productConfigRoutes.js';

// Mount routes
router.use('/products', productRoutes);
router.use('/', productPermissionRoutes);
router.use('/', productFeatureRoutes);
router.use('/', productConfigRoutes);

export default router;
