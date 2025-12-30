/**
 * Product Controller
 * HTTP handlers for product management endpoints
 */

import { productService } from '../services/index.ts';

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
      
      // ✅ Industry Standard: Use resource-specific key
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
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
      
      // ✅ Industry Standard: Use singular resource-specific key
      res.json({
        success: true,
        product
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message,
          errorCode: 'PRODUCT_NOT_FOUND'
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
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
      
      // ✅ Industry Standard: Use singular resource-specific key
      res.json({
        success: true,
        product
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message,
          errorCode: 'PRODUCT_NOT_FOUND'
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * GET /api/products/active
   * Get all active products
   */
  async getActiveProducts(req, res) {
    try {
      const products = await productService.getActiveProducts();
      
      // ✅ Industry Standard: Use resource-specific key
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * GET /api/products/core
   * Get core products
   */
  async getCoreProducts(req, res) {
    try {
      const products = await productService.getCoreProducts();
      
      // ✅ Industry Standard: Use resource-specific key
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * GET /api/products/addons
   * Get add-on products
   */
  async getAddOnProducts(req, res) {
    try {
      const products = await productService.getAddOnProducts();
      
      // ✅ Industry Standard: Use resource-specific key
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
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
      
      // ✅ Industry Standard: Use singular resource-specific key
      res.json({
        success: true,
        product
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message,
          errorCode: 'PRODUCT_NOT_FOUND'
        });
      }
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
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
      
      // ✅ Industry Standard: 201 Created with resource-specific key
      res.status(201).json({
        success: true,
        product,
        message: 'Product created successfully'
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ 
          success: false,
          error: error.message,
          errorCode: 'DUPLICATE_ENTRY'
        });
      }
      res.status(400).json({ 
        success: false,
        error: error.message,
        errorCode: 'VALIDATION_ERROR'
      });
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
      
      // ✅ Industry Standard: Use resource-specific key with message
      res.json({
        success: true,
        product,
        message: 'Product updated successfully'
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message,
          errorCode: 'PRODUCT_NOT_FOUND'
        });
      }
      res.status(400).json({ 
        success: false,
        error: error.message,
        errorCode: 'VALIDATION_ERROR'
      });
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
      
      // ✅ Industry Standard: Success response for delete
      res.json({
        success: true,
        product,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ 
          success: false,
          error: error.message,
          errorCode: 'PRODUCT_NOT_FOUND'
        });
      }
      if (error.message === 'Cannot delete core products') {
        return res.status(403).json({ 
          success: false,
          error: error.message,
          errorCode: 'FORBIDDEN'
        });
      }
      res.status(400).json({ 
        success: false,
        error: error.message,
        errorCode: 'VALIDATION_ERROR'
      });
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
        return res.status(400).json({ 
          success: false,
          error: 'Search query is required',
          errorCode: 'VALIDATION_ERROR'
        });
      }
      const products = await productService.searchProducts(q);
      
      // ✅ Industry Standard: Use resource-specific key
      res.json({
        success: true,
        products
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: error.message,
        errorCode: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}

export default new ProductController();
