/**
 * Product Controller Tests
 * Tests for product management HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the service
const mockProductService = {
  getAllProducts: jest.fn(),
  getProductById: jest.fn(),
  getProductBySlug: jest.fn(),
  getActiveProducts: jest.fn(),
  getCoreProducts: jest.fn(),
  getAddOnProducts: jest.fn(),
  getProductWithFeatures: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  searchProducts: jest.fn()
};

// Mock the service module
jest.unstable_mockModule('../../../../src/products/nexus/services/index.js', () => ({
  productService: mockProductService
}));

// Import controller after mocking
const { default: controller } = await import('../../../../src/products/nexus/controllers/productController.js');

describe('ProductController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-123' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getAllProducts', () => {
    it('should get all products with default options', async () => {
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1' },
        { id: 'prod-2', name: 'Product 2' }
      ];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockProductService.getAllProducts).toHaveBeenCalledWith({
        status: undefined,
        isCore: undefined,
        includeDeleted: false
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should get products with status filter', async () => {
      mockReq.query = { status: 'active' };
      const mockProducts = [{ id: 'prod-1', name: 'Active Product' }];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockProductService.getAllProducts).toHaveBeenCalledWith({
        status: 'active',
        isCore: undefined,
        includeDeleted: false
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should get products with isCore=true filter', async () => {
      mockReq.query = { isCore: 'true' };
      const mockProducts = [{ id: 'prod-1', isCore: true }];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockProductService.getAllProducts).toHaveBeenCalledWith({
        status: undefined,
        isCore: true,
        includeDeleted: false
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should get products with isCore=false filter', async () => {
      mockReq.query = { isCore: 'false' };
      const mockProducts = [{ id: 'prod-1', isCore: false }];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockProductService.getAllProducts).toHaveBeenCalledWith({
        status: undefined,
        isCore: false,
        includeDeleted: false
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should get products including deleted when includeDeleted=true', async () => {
      mockReq.query = { includeDeleted: 'true' };
      const mockProducts = [{ id: 'prod-1', deletedAt: new Date() }];
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockProductService.getAllProducts).toHaveBeenCalledWith({
        status: undefined,
        isCore: undefined,
        includeDeleted: true
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle errors when getting all products', async () => {
      mockProductService.getAllProducts.mockRejectedValue(new Error('Database error'));

      await controller.getAllProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getProductById', () => {
    it('should get a product by ID', async () => {
      mockReq.params = { id: 'prod-123' };
      const mockProduct = { id: 'prod-123', name: 'Test Product' };
      mockProductService.getProductById.mockResolvedValue(mockProduct);

      await controller.getProductById(mockReq, mockRes);

      expect(mockProductService.getProductById).toHaveBeenCalledWith('prod-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: 'prod-999' };
      mockProductService.getProductById.mockRejectedValue(new Error('Product not found'));

      await controller.getProductById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should handle other errors when getting product by ID', async () => {
      mockReq.params = { id: 'prod-123' };
      mockProductService.getProductById.mockRejectedValue(new Error('Database error'));

      await controller.getProductById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getProductBySlug', () => {
    it('should get a product by slug', async () => {
      mockReq.params = { slug: 'test-product' };
      const mockProduct = { id: 'prod-123', slug: 'test-product', name: 'Test Product' };
      mockProductService.getProductBySlug.mockResolvedValue(mockProduct);

      await controller.getProductBySlug(mockReq, mockRes);

      expect(mockProductService.getProductBySlug).toHaveBeenCalledWith('test-product');
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 404 when product not found by slug', async () => {
      mockReq.params = { slug: 'non-existent' };
      mockProductService.getProductBySlug.mockRejectedValue(new Error('Product not found'));

      await controller.getProductBySlug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should handle other errors when getting product by slug', async () => {
      mockReq.params = { slug: 'test-product' };
      mockProductService.getProductBySlug.mockRejectedValue(new Error('Database error'));

      await controller.getProductBySlug(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getActiveProducts', () => {
    it('should get all active products', async () => {
      const mockProducts = [
        { id: 'prod-1', status: 'active' },
        { id: 'prod-2', status: 'active' }
      ];
      mockProductService.getActiveProducts.mockResolvedValue(mockProducts);

      await controller.getActiveProducts(mockReq, mockRes);

      expect(mockProductService.getActiveProducts).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle errors when getting active products', async () => {
      mockProductService.getActiveProducts.mockRejectedValue(new Error('Database error'));

      await controller.getActiveProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getCoreProducts', () => {
    it('should get all core products', async () => {
      const mockProducts = [
        { id: 'prod-1', isCore: true },
        { id: 'prod-2', isCore: true }
      ];
      mockProductService.getCoreProducts.mockResolvedValue(mockProducts);

      await controller.getCoreProducts(mockReq, mockRes);

      expect(mockProductService.getCoreProducts).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle errors when getting core products', async () => {
      mockProductService.getCoreProducts.mockRejectedValue(new Error('Database error'));

      await controller.getCoreProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getAddOnProducts', () => {
    it('should get all add-on products', async () => {
      const mockProducts = [
        { id: 'prod-1', isCore: false },
        { id: 'prod-2', isCore: false }
      ];
      mockProductService.getAddOnProducts.mockResolvedValue(mockProducts);

      await controller.getAddOnProducts(mockReq, mockRes);

      expect(mockProductService.getAddOnProducts).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle errors when getting add-on products', async () => {
      mockProductService.getAddOnProducts.mockRejectedValue(new Error('Database error'));

      await controller.getAddOnProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getProductWithFeatures', () => {
    it('should get a product with its features', async () => {
      mockReq.params = { id: 'prod-123' };
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        features: [
          { id: 'feat-1', name: 'Feature 1' },
          { id: 'feat-2', name: 'Feature 2' }
        ]
      };
      mockProductService.getProductWithFeatures.mockResolvedValue(mockProduct);

      await controller.getProductWithFeatures(mockReq, mockRes);

      expect(mockProductService.getProductWithFeatures).toHaveBeenCalledWith('prod-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: 'prod-999' };
      mockProductService.getProductWithFeatures.mockRejectedValue(new Error('Product not found'));

      await controller.getProductWithFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should handle other errors when getting product with features', async () => {
      mockReq.params = { id: 'prod-123' };
      mockProductService.getProductWithFeatures.mockRejectedValue(new Error('Database error'));

      await controller.getProductWithFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const productData = {
        name: 'New Product',
        slug: 'new-product',
        description: 'A new product',
        isCore: false
      };
      mockReq.body = productData;
      const mockProduct = { id: 'prod-123', ...productData };
      mockProductService.createProduct.mockResolvedValue(mockProduct);

      await controller.createProduct(mockReq, mockRes);

      expect(mockProductService.createProduct).toHaveBeenCalledWith(productData, 'user-123');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 409 when product already exists', async () => {
      mockReq.body = { name: 'Existing Product', slug: 'existing' };
      mockProductService.createProduct.mockRejectedValue(new Error('Product with slug existing already exists'));

      await controller.createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product with slug existing already exists' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.body = { name: 'Invalid Product' };
      mockProductService.createProduct.mockRejectedValue(new Error('Validation error'));

      await controller.createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });
  });

  describe('updateProduct', () => {
    it('should update a product', async () => {
      mockReq.params = { id: 'prod-123' };
      mockReq.body = { name: 'Updated Product', description: 'Updated description' };
      const mockProduct = { id: 'prod-123', ...mockReq.body };
      mockProductService.updateProduct.mockResolvedValue(mockProduct);

      await controller.updateProduct(mockReq, mockRes);

      expect(mockProductService.updateProduct).toHaveBeenCalledWith('prod-123', mockReq.body, 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: 'prod-999' };
      mockReq.body = { name: 'Updated Product' };
      mockProductService.updateProduct.mockRejectedValue(new Error('Product not found'));

      await controller.updateProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'prod-123' };
      mockReq.body = { name: '' };
      mockProductService.updateProduct.mockRejectedValue(new Error('Validation error'));

      await controller.updateProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });
  });

  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      mockReq.params = { id: 'prod-123' };
      const mockProduct = { id: 'prod-123', deletedAt: new Date() };
      mockProductService.deleteProduct.mockResolvedValue(mockProduct);

      await controller.deleteProduct(mockReq, mockRes);

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith('prod-123', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { id: 'prod-999' };
      mockProductService.deleteProduct.mockRejectedValue(new Error('Product not found'));

      await controller.deleteProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 403 when trying to delete core product', async () => {
      mockReq.params = { id: 'prod-123' };
      mockProductService.deleteProduct.mockRejectedValue(new Error('Cannot delete core products'));

      await controller.deleteProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cannot delete core products' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'prod-123' };
      mockProductService.deleteProduct.mockRejectedValue(new Error('Database error'));

      await controller.deleteProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      mockReq.query = { q: 'test' };
      const mockProducts = [
        { id: 'prod-1', name: 'Test Product 1' },
        { id: 'prod-2', name: 'Test Product 2' }
      ];
      mockProductService.searchProducts.mockResolvedValue(mockProducts);

      await controller.searchProducts(mockReq, mockRes);

      expect(mockProductService.searchProducts).toHaveBeenCalledWith('test');
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should return 400 when search query is missing', async () => {
      mockReq.query = {};

      await controller.searchProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Search query is required' });
      expect(mockProductService.searchProducts).not.toHaveBeenCalled();
    });

    it('should handle errors when searching products', async () => {
      mockReq.query = { q: 'test' };
      mockProductService.searchProducts.mockRejectedValue(new Error('Database error'));

      await controller.searchProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
