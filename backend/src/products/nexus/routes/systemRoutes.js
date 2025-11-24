import express from 'express';
import productManager from '../../core/ProductManager.js';
import { authenticatePlatform, requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const userRole = req.user.role || req.user.user_role;
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const userRole = req.user.role || req.user.user_role;
  if (userRole !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Super admin access required' });
  }
  next();
};

router.get('/status', authenticatePlatform, requirePermission('nexus:system:read'), (req, res) => {
  try {
    const status = productManager.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product system status', message: error.message });
  }
});

router.get('/health', authenticatePlatform, requirePermission('nexus:system:read'), (req, res) => {
  try {
    const health = productManager.healthCheck();
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({ healthy: false, status: 'error', error: error.message, timestamp: new Date() });
  }
});

router.get('/list', authenticatePlatform, requirePermission('nexus:system:read'), (req, res) => {
  try {
    const products = productManager.getAllProducts();
    res.json({ count: products.length, products: products.map(p => ({ slug: p.product.slug, name: p.product.name, version: p.product.version, status: p.product.status, isCore: p.product.isCore, hasRoutes: !!p.routes, middlewareCount: p.middleware ? p.middleware.length : 0, loadedAt: p.loadedAt })) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list products', message: error.message });
  }
});

router.get('/routes', authenticatePlatform, requirePermission('nexus:system:read'), (req, res) => {
  try {
    const routes = productManager.getRoutes();
    res.json({ count: routes.length, routes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list routes', message: error.message });
  }
});

router.get('/:slug', authenticatePlatform, requirePermission('nexus:system:read'), (req, res) => {
  try {
    const { slug } = req.params;
    const product = productManager.getProduct(slug);
    if (!product) return res.status(404).json({ error: 'Product not found', slug });
    res.json({ slug: product.product.slug, name: product.product.name, version: product.product.version, description: product.product.description, status: product.product.status, isCore: product.product.isCore, basePath: product.product.basePath, npmPackage: product.product.npmPackage, modulePath: product.modulePath, hasRoutes: !!product.routes, middleware: product.middleware ? product.middleware.length : 0, config: product.config, loadedAt: product.loadedAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get product details', message: error.message });
  }
});

router.post('/:slug/reload', authenticatePlatform, requirePermission('nexus:system:manage'), async (req, res) => {
  try {
    const { slug } = req.params;
    await productManager.reloadProduct(slug);
    res.json({ success: true, message: 'Product ' + slug + ' reloaded successfully', warning: 'Full reload requires server restart' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reload product', message: error.message });
  }
});

router.post('/:slug/unload', authenticatePlatform, requirePermission('nexus:system:manage'), (req, res) => {
  try {
    const { slug } = req.params;
    const success = productManager.unloadProduct(slug);
    if (success) {
      res.json({ success: true, message: 'Product ' + slug + ' unloaded successfully', warning: 'Full removal requires server restart' });
    } else {
      res.status(404).json({ error: 'Product not found or already unloaded', slug });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to unload product', message: error.message });
  }
});

export default router;