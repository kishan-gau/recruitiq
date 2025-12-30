/**
 * Product Routes
 * API routes for product management
 */

import express, { Router } from 'express';
import { requirePlatformPermission } from '../../../middleware/auth.js';
import { productController } from '../controllers/index.js';

const router: Router = express.Router();

// Public routes (or with basic auth)
router.get('/', requirePlatformPermission('products:read'), productController.getAllProducts.bind(productController));
router.get('/active', requirePlatformPermission('products:read'), productController.getActiveProducts.bind(productController));
router.get('/core', requirePlatformPermission('products:read'), productController.getCoreProducts.bind(productController));
router.get('/addons', requirePlatformPermission('products:read'), productController.getAddOnProducts.bind(productController));
router.get('/search', requirePlatformPermission('products:read'), productController.searchProducts.bind(productController));
router.get('/slug/:slug', requirePlatformPermission('products:read'), productController.getProductBySlug.bind(productController));
router.get('/:id', requirePlatformPermission('products:read'), productController.getProductById.bind(productController));
router.get('/:id/features', requirePlatformPermission('products:read'), productController.getProductWithFeatures.bind(productController));

// Admin routes (require admin authentication middleware)
router.post('/', requirePlatformPermission('products:manage'), productController.createProduct.bind(productController));
router.patch('/:id', requirePlatformPermission('products:manage'), productController.updateProduct.bind(productController));
router.delete('/:id', requirePlatformPermission('products:manage'), productController.deleteProduct.bind(productController));

export default router;
