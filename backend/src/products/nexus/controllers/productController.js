/**
 * Product Controller
 * HTTP handlers for product management endpoints
 */

import { productService } from '../services/index.js';

class ProductController {
  /**
   * GET /api/products
   * Get all products
   */
  async getAllProducts(req, res) {
    try {
      const { status, isCore, includeDeleted } = req.query;
      
      const options = {
        status,
        isCore: isCore === 'true' ? true : isCore === 'false' ? false : undefined,
        includeDeleted: includeDeleted === 'true'
      };

      const products = await productService.getAllProducts(options);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:id
   * Get product by ID
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      res.json(product);
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/slug/:slug
   * Get product by slug
   */
  async getProductBySlug(req, res) {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug);
      res.json(product);
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/active
   * Get all active products
   */
  async getActiveProducts(req, res) {
    try {
      const products = await productService.getActiveProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/core
   * Get core products
   */
  async getCoreProducts(req, res) {
    try {
      const products = await productService.getCoreProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/addons
   * Get add-on products
   */
  async getAddOnProducts(req, res) {
    try {
      const products = await productService.getAddOnProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:id/features
   * Get product with its features
   */
  async getProductWithFeatures(req, res) {
    try {
      const { id } = req.params;
      const product = await productService.getProductWithFeatures(id);
      res.json(product);
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/products
   * Create new product
   */
  async createProduct(req, res) {
    try {
      const userId = req.user?.id;
      const product = await productService.createProduct(req.body, userId);
      res.status(201).json(product);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/products/:id
   * Update product
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const product = await productService.updateProduct(id, req.body, userId);
      res.json(product);
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/products/:id
   * Delete product (soft delete)
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const product = await productService.deleteProduct(id, userId);
      res.json(product);
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot delete core products') {
        return res.status(403).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/search
   * Search products
   */
  async searchProducts(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const products = await productService.searchProducts(q);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ProductController();
