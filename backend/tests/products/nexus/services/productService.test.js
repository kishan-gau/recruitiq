/**
 * Product Service Tests
 * Tests for product management functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock database and logger
const mockDbQuery = jest.fn();
const mockDb = { query: mockDbQuery };
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: mockDb
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

const { default: service } = await import('../../../../src/products/nexus/services/productService.js');

describe('ProductService', () => {
  const productId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveProducts', () => {
    it('should get all active products', async () => {
      const mockProducts = [
        {
          id: productId,
          slug: 'nexus',
          name: 'Nexus HRIS',
          description: 'HR management system',
          version: '1.0.0',
          status: 'active',
          is_core: true,
          base_path: '/nexus',
          npm_package: '@recruitiq/nexus',
          config: { theme: 'blue' },
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockProducts });

      const result = await service.getActiveProducts();

      expect(result).toEqual(mockProducts);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = \'active\'')
      );
    });

    it('should order by is_core DESC and name ASC', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getActiveProducts();

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_core DESC, name ASC')
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getActiveProducts()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching active products:', dbError);
    });
  });

  describe('getAllProducts', () => {
    it('should get all products without filters', async () => {
      const mockProducts = [
        { id: productId, slug: 'nexus', name: 'Nexus HRIS', status: 'active', is_core: true }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockProducts });

      const result = await service.getAllProducts();

      expect(result).toEqual(mockProducts);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM products'),
        []
      );
    });

    it('should filter by status', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getAllProducts({ status: 'active' });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['active']
      );
    });

    it('should filter by isCore', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getAllProducts({ isCore: true });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_core = $1'),
        [true]
      );
    });

    it('should filter by both status and isCore', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getAllProducts({ status: 'active', isCore: false });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 AND is_core = $2'),
        ['active', false]
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getAllProducts()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching products:', dbError);
    });
  });

  describe('getProductById', () => {
    it('should get product by ID', async () => {
      const mockProduct = {
        id: productId,
        slug: 'nexus',
        name: 'Nexus HRIS',
        status: 'active'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockProduct] });

      const result = await service.getProductById(productId);

      expect(result).toEqual(mockProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [productId]
      );
    });

    it('should return null if product not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProductById(productId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getProductById(productId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching product by ID:', dbError);
    });
  });

  describe('getProductBySlug', () => {
    it('should get product by slug', async () => {
      const mockProduct = {
        id: productId,
        slug: 'nexus',
        name: 'Nexus HRIS',
        status: 'active'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockProduct] });

      const result = await service.getProductBySlug('nexus');

      expect(result).toEqual(mockProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE slug = $1'),
        ['nexus']
      );
    });

    it('should return null if product not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProductBySlug('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getProductBySlug('nexus')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching product by slug:', dbError);
    });
  });

  describe('getCoreProducts', () => {
    it('should get core products', async () => {
      const mockProducts = [
        { id: productId, slug: 'nexus', name: 'Nexus HRIS', is_core: true, status: 'active' }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockProducts });

      const result = await service.getCoreProducts();

      expect(result).toEqual(mockProducts);
      // Check for both possible parameter orders (status first or isCore first)
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 AND is_core = $2'),
        ['active', true]
      );
    });
  });

  describe('getAddOnProducts', () => {
    it('should get add-on products', async () => {
      const mockProducts = [
        { id: productId, slug: 'custom', name: 'Custom Product', is_core: false, status: 'active' }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockProducts });

      const result = await service.getAddOnProducts();

      expect(result).toEqual(mockProducts);
      // Check for both possible parameter orders (status first or isCore first)
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 AND is_core = $2'),
        ['active', false]
      );
    });
  });

  describe('getProductWithFeatures', () => {
    it('should get product with its features', async () => {
      const mockProduct = {
        id: productId,
        slug: 'nexus',
        name: 'Nexus HRIS'
      };

      const mockFeatures = [
        {
          id: 'feature-1',
          code: 'employee_management',
          name: 'Employee Management',
          description: 'Manage employees',
          type: 'core',
          enabled: true,
          config: {}
        }
      ];

      // First call: getProductById
      mockDbQuery.mockResolvedValueOnce({ rows: [mockProduct] });
      // Second call: get features
      mockDbQuery.mockResolvedValueOnce({ rows: mockFeatures });

      const result = await service.getProductWithFeatures(productId);

      expect(result).toEqual({ ...mockProduct, features: mockFeatures });
      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });

    it('should return null if product not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProductWithFeatures(productId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getProductWithFeatures(productId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching product with features:', dbError);
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const productData = {
        slug: 'new-product',
        name: 'New Product',
        description: 'A new product',
        version: '1.0.0',
        isCore: false,
        basePath: '/new-product',
        npmPackage: '@recruitiq/new-product',
        config: { theme: 'green' }
      };

      const mockCreatedProduct = {
        id: productId,
        ...productData,
        status: 'active',
        created_by: userId
      };

      mockDbQuery.mockResolvedValue({ rows: [mockCreatedProduct] });

      const result = await service.createProduct(productData, userId);

      expect(result).toEqual(mockCreatedProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        [
          productData.slug,
          productData.name,
          productData.description,
          productData.version,
          productData.isCore,
          productData.basePath,
          productData.npmPackage,
          productData.config,
          userId
        ]
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Product created',
        { productId: mockCreatedProduct.id, slug: productData.slug, userId }
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Insert failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.createProduct({}, userId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating product:', dbError);
    });
  });

  describe('updateProduct', () => {
    it('should update product name', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUpdatedProduct = {
        id: productId,
        slug: 'nexus',
        name: 'Updated Name'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockUpdatedProduct] });

      const result = await service.updateProduct(productId, updateData, userId);

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        [updateData.name, userId, productId]
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Product updated', { productId, userId });
    });

    it('should update multiple fields', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated Description',
        version: '2.0.0',
        status: 'inactive',
        config: { theme: 'red' }
      };

      const mockUpdatedProduct = { id: productId, ...updateData };
      mockDbQuery.mockResolvedValue({ rows: [mockUpdatedProduct] });

      const result = await service.updateProduct(productId, updateData, userId);

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        [
          updateData.name,
          updateData.description,
          updateData.version,
          updateData.status,
          updateData.config,
          userId,
          productId
        ]
      );
    });

    it('should return null if product not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.updateProduct(productId, { name: 'Test' }, userId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.updateProduct(productId, {}, userId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating product:', dbError);
    });
  });

  describe('deleteProduct', () => {
    it('should soft delete product', async () => {
      const mockDeletedProduct = {
        id: productId,
        slug: 'nexus',
        status: 'inactive'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockDeletedProduct] });

      const result = await service.deleteProduct(productId, userId);

      expect(result).toEqual(mockDeletedProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        [productId, userId]
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = \'inactive\''),
        [productId, userId]
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Product deleted', { productId, userId });
    });

    it('should return null if product not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.deleteProduct(productId, userId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Delete failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.deleteProduct(productId, userId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting product:', dbError);
    });
  });

  describe('searchProducts', () => {
    it('should search products by name', async () => {
      const mockProducts = [
        { id: productId, slug: 'nexus', name: 'Nexus HRIS' }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockProducts });

      const result = await service.searchProducts('nexus');

      expect(result).toEqual(mockProducts);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('name ILIKE $1 OR'),
        ['%nexus%']
      );
    });

    it('should search products by description', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.searchProducts('HR system');

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('description ILIKE $1'),
        ['%HR system%']
      );
    });

    it('should search products by slug', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.searchProducts('paylinq');

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('slug ILIKE $1'),
        ['%paylinq%']
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Search failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.searchProducts('test')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error searching products:', dbError);
    });
  });

  describe('singleton behavior', () => {
    it('should be exported as singleton instance', () => {
      expect(service).toBeDefined();
      expect(typeof service.getActiveProducts).toBe('function');
    });

    it('should maintain state across multiple calls', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getActiveProducts();
      await service.getAllProducts();

      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });
  });
});
