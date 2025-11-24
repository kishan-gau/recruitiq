/**
 * Product Routes
 * API routes for product management
 */

import express from 'express';
import { authenticatePlatform, requirePermission } from '../../../middleware/auth.js';
import { productController } from '../controllers/index.js';

const router = express.Router();

// All routes require platform authentication
router.use(authenticatePlatform);

// Public routes (or with basic auth)
router.get('/', requirePermission('nexus:products:read'), productController.getAllProducts.bind(productController));
router.get('/active', requirePermission('nexus:products:read'), productController.getActiveProducts.bind(productController));
router.get('/core', requirePermission('nexus:products:read'), productController.getCoreProducts.bind(productController));
router.get('/addons', requirePermission('nexus:products:read'), productController.getAddOnProducts.bind(productController));
router.get('/search', requirePermission('nexus:products:read'), productController.searchProducts.bind(productController));
router.get('/slug/:slug', requirePermission('nexus:products:read'), productController.getProductBySlug.bind(productController));
router.get('/:id', requirePermission('nexus:products:read'), productController.getProductById.bind(productController));
router.get('/:id/features', requirePermission('nexus:products:read'), productController.getProductWithFeatures.bind(productController));

// Admin routes (require admin authentication middleware)
router.post('/', requirePermission('nexus:products:create'), productController.createProduct.bind(productController));
router.patch('/:id', requirePermission('nexus:products:update'), productController.updateProduct.bind(productController));
router.delete('/:id', requirePermission('nexus:products:delete'), productController.deleteProduct.bind(productController));

export default router;
