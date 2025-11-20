/**
 * Product Routes
 * API routes for product management
 */

import express from 'express';
import { authenticatePlatform } from '../../../middleware/auth.js';
import { productController } from '../controllers/index.js';

const router = express.Router();

// All routes require platform authentication
router.use(authenticatePlatform);

// Public routes (or with basic auth)
router.get('/', productController.getAllProducts.bind(productController));
router.get('/active', productController.getActiveProducts.bind(productController));
router.get('/core', productController.getCoreProducts.bind(productController));
router.get('/addons', productController.getAddOnProducts.bind(productController));
router.get('/search', productController.searchProducts.bind(productController));
router.get('/slug/:slug', productController.getProductBySlug.bind(productController));
router.get('/:id', productController.getProductById.bind(productController));
router.get('/:id/features', productController.getProductWithFeatures.bind(productController));

// Admin routes (require admin authentication middleware)
router.post('/', productController.createProduct.bind(productController));
router.patch('/:id', productController.updateProduct.bind(productController));
router.delete('/:id', productController.deleteProduct.bind(productController));

export default router;
