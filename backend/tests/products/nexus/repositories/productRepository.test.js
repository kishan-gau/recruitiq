/**
 * Test Suite: ProductRepository
 * 
 * Tests database operations for the Product model
 * 
 * Coverage:
 * - Constructor & dependency injection
 * - findAll with filtering
 * - findById
 * - findBySlug
 * - findByName
 * - findActive
 * - findCore
 * - findAddOns
 * - create
 * - update
 * - delete (soft)
 * - hardDelete
 * - restore
 * - search
 * - Error logging
 * - Refactoring verification
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock UUIDs
const mockId = '550e8400-e29b-41d4-a716-446655440000';
const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

describe('ProductRepository', () => {
  let ProductRepository;
  let Product;
  let repository;
  let mockQuery;
  let mockLogger;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockQuery = jest.fn();
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    };

    // Mock database module
    jest.unstable_mockModule('../../../../src/config/database.js', () => ({
      query: mockQuery
    }));

    // Mock logger module
    jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
      default: mockLogger
    }));

    // Import modules after mocking
    const repoModule = await import('../../../../src/products/nexus/repositories/productRepository.js');
    const productModule = await import('../../../../src/products/nexus/models/Product.js');

    ProductRepository = repoModule.default;
    Product = productModule.default;

    // Create repository instance with mock query
    repository = new ProductRepository({ query: mockQuery });
    // CRITICAL: Override logger with mock
    repository.logger = mockLogger;
  });

  // Helper function to create mock DB product
  const createDbProduct = (overrides = {}) => ({
    id: mockId,
    name: 'test-product',
    display_name: 'Test Product',
    description: 'Test product description',
    slug: 'test-product',
    version: '1.0.0',
    npm_package: '@company/test-product',
    repository_url: 'https://github.com/company/test-product',
    documentation_url: 'https://docs.company.com/test-product',
    status: 'active',
    is_core: false,
    requires_license: false,
    base_path: '/test',
    api_prefix: '/api/test',
    default_port: 3000,
    min_tier: 'basic',
    resource_requirements: { cpu: '1', memory: '512MB' },
    features: ['feature1', 'feature2'],
    default_features: ['feature1'],
    icon: 'test-icon',
    color: '#FF0000',
    ui_config: { theme: 'light' },
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: mockUserId,
    deleted_at: null,
    ...overrides
  });

  describe('Constructor', () => {
    it('should accept injected database dependency', () => {
      const customQuery = jest.fn();
      const repo = new ProductRepository({ query: customQuery });

      expect(repo.query).toBe(customQuery);
    });

    it('should use default query function if no dependency provided', async () => {
      const { query: defaultQuery } = await import('../../../../src/config/database.js');
      const repo = new ProductRepository();

      expect(repo.query).toBe(defaultQuery);
    });

    it('should have logger instance', () => {
      expect(repository.logger).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should find all products with default options', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, name: 'product-1' }),
        createDbProduct({ id: '550e8400-e29b-41d4-a716-446655440002', name: 'product-2' })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(result[0].name).toBe('product-1');
      expect(result[1].name).toBe('product-2');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM products'),
        [],
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        [],
        null
      );
    });

    it('should filter by status', async () => {
      // Arrange
      const dbProducts = [createDbProduct({ status: 'beta' })];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findAll({ status: 'beta' });

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['beta'],
        null
      );
    });

    it('should filter by isCore', async () => {
      // Arrange
      const dbProducts = [createDbProduct({ is_core: true })];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findAll({ isCore: true });

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_core = $1'),
        [true],
        null
      );
    });

    it('should include deleted products when includeDeleted is true', async () => {
      // Arrange
      const dbProducts = [createDbProduct({ deleted_at: new Date() })];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findAll({ includeDeleted: true });

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.not.stringContaining('deleted_at IS NULL'),
        [],
        null
      );
    });

    it('should order by is_core DESC, name ASC', async () => {
      // Arrange
      const dbProducts = [createDbProduct()];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      await repository.findAll();

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_core DESC, name ASC'),
        [],
        null
      );
    });

    it('should return empty array when no products found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);
      const options = { status: 'active' };

      // Act & Assert
      await expect(repository.findAll(options)).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding all products',
        expect.objectContaining({
          options,
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('findById', () => {
    it('should find product by ID', async () => {
      // Arrange
      const dbProduct = createDbProduct();
      mockQuery.mockResolvedValue({ rows: [dbProduct] });

      // Act
      const result = await repository.findById(mockId);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.id).toBe(mockId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
        [mockId],
        null
      );
    });

    it('should return null when product not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findById(mockId);

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findById(mockId)).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding product by ID',
        expect.objectContaining({
          id: mockId,
          error: 'Database query failed'
        })
      );
    });
  });

  describe('findBySlug', () => {
    it('should find product by slug', async () => {
      // Arrange
      const dbProduct = createDbProduct({ slug: 'unique-slug' });
      mockQuery.mockResolvedValue({ rows: [dbProduct] });

      // Act
      const result = await repository.findBySlug('unique-slug');

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.slug).toBe('unique-slug');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE slug = $1 AND deleted_at IS NULL'),
        ['unique-slug'],
        null
      );
    });

    it('should return null when slug not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findBySlug('nonexistent-slug');

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findBySlug('test-slug')).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding product by slug',
        expect.objectContaining({
          slug: 'test-slug',
          error: 'Database query failed'
        })
      );
    });
  });

  describe('findByName', () => {
    it('should find product by name', async () => {
      // Arrange
      const dbProduct = createDbProduct({ name: 'unique-name' });
      mockQuery.mockResolvedValue({ rows: [dbProduct] });

      // Act
      const result = await repository.findByName('unique-name');

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.name).toBe('unique-name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name = $1 AND deleted_at IS NULL'),
        ['unique-name'],
        null
      );
    });

    it('should return null when name not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findByName('nonexistent-name');

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findByName('test-name')).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding product by name',
        expect.objectContaining({
          name: 'test-name',
          error: 'Database query failed'
        })
      );
    });
  });

  describe('findActive', () => {
    it('should find all active products', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, status: 'active' }),
        createDbProduct({ id: '550e8400-e29b-41d4-a716-446655440002', status: 'active' })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findActive();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status = 'active'"),
        [],
        null
      );
    });

    it('should return empty array when no active products', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findActive();

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findActive()).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding active products',
        expect.objectContaining({
          error: 'Database query failed'
        })
      );
    });
  });

  describe('findCore', () => {
    it('should find all core products', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, is_core: true }),
        createDbProduct({ id: '550e8400-e29b-41d4-a716-446655440002', is_core: true })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findCore();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_core = TRUE'),
        [],
        null
      );
    });

    it('should return empty array when no core products', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findCore();

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findCore()).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding core products',
        expect.objectContaining({
          error: 'Database query failed'
        })
      );
    });
  });

  describe('findAddOns', () => {
    it('should find all add-on products', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, is_core: false }),
        createDbProduct({ id: '550e8400-e29b-41d4-a716-446655440002', is_core: false })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.findAddOns();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_core = FALSE'),
        [],
        null
      );
    });

    it('should return empty array when no add-on products', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findAddOns();

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.findAddOns()).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding add-on products',
        expect.objectContaining({
          error: 'Database query failed'
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new product with all fields', async () => {
      // Arrange
      const productData = {
        name: 'new-product',
        displayName: 'New Product',
        description: 'New product description',
        slug: 'new-product',
        version: '1.0.0',
        npmPackage: '@company/new-product',
        repositoryUrl: 'https://github.com/company/new',
        documentationUrl: 'https://docs.company.com/new',
        status: 'beta',
        isCore: true,
        requiresLicense: true,
        basePath: '/new',
        apiPrefix: '/api/new',
        defaultPort: 4000,
        minTier: 'premium',
        resourceRequirements: { cpu: '2', memory: '1GB' },
        features: ['feature1', 'feature2'],
        defaultFeatures: ['feature1'],
        icon: 'new-icon',
        color: '#00FF00',
        uiConfig: { theme: 'dark' }
      };

      const createdProduct = createDbProduct(productData);
      mockQuery.mockResolvedValue({ rows: [createdProduct] });

      // Act
      const result = await repository.create(productData, mockUserId);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.name).toBe('new-product');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        expect.arrayContaining([
          productData.name,
          productData.displayName,
          productData.description,
          productData.slug,
          productData.version,
          productData.npmPackage,
          productData.repositoryUrl,
          productData.documentationUrl,
          productData.status,
          productData.isCore,
          productData.requiresLicense,
          productData.basePath,
          productData.apiPrefix,
          productData.defaultPort,
          productData.minTier,
          JSON.stringify(productData.resourceRequirements),
          JSON.stringify(productData.features),
          JSON.stringify(productData.defaultFeatures),
          productData.icon,
          productData.color,
          JSON.stringify(productData.uiConfig),
          mockUserId
        ]),
        null
      );
    });

    it('should apply default values for optional fields', async () => {
      // Arrange
      const minimalData = {
        name: 'minimal-product',
        displayName: 'Minimal Product',
        description: 'Minimal description',
        slug: 'minimal',
        version: '1.0.0'
      };

      const createdProduct = createDbProduct({
        ...minimalData,
        status: 'active',
        is_core: false,
        requires_license: false
      });
      mockQuery.mockResolvedValue({ rows: [createdProduct] });

      // Act
      const result = await repository.create(minimalData, mockUserId);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        expect.arrayContaining([
          'active',  // Default status
          false,     // Default isCore
          false      // Default requiresLicense
        ]),
        null
      );
    });

    it('should JSON.stringify array and object fields', async () => {
      // Arrange
      const productData = {
        name: 'test',
        displayName: 'Test',
        description: 'Test',
        slug: 'test',
        version: '1.0.0',
        resourceRequirements: { cpu: '1' },
        features: ['feat1'],
        defaultFeatures: ['feat1'],
        uiConfig: { theme: 'light' }
      };

      const createdProduct = createDbProduct(productData);
      mockQuery.mockResolvedValue({ rows: [createdProduct] });

      // Act
      await repository.create(productData, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          JSON.stringify(productData.resourceRequirements),
          JSON.stringify(productData.features),
          JSON.stringify(productData.defaultFeatures),
          JSON.stringify(productData.uiConfig)
        ]),
        null
      );
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Duplicate key violation');
      mockQuery.mockRejectedValue(dbError);
      const productData = { name: 'test-product', slug: 'test' };

      // Act & Assert
      await expect(repository.create(productData, mockUserId)).rejects.toThrow('Duplicate key violation');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating product',
        expect.objectContaining({
          name: 'test-product',
          error: 'Duplicate key violation'
        })
      );
    });
  });

  describe('update', () => {
    it('should update product with provided fields', async () => {
      // Arrange
      const updateData = {
        displayName: 'Updated Name',
        description: 'Updated description',
        version: '2.0.0',
        status: 'deprecated'
      };

      // Mock returns DB format with snake_case fields merged
      const updatedProduct = createDbProduct({
        display_name: 'Updated Name',
        description: 'Updated description',
        version: '2.0.0',
        status: 'deprecated'
      });
      mockQuery.mockResolvedValue({ rows: [updatedProduct] });

      // Act
      const result = await repository.update(mockId, updateData);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(result.displayName).toBe('Updated Name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        expect.arrayContaining([
          'Updated Name',
          'Updated description',
          '2.0.0',
          'deprecated',
          mockId
        ]),
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array),
        null
      );
    });

    it('should update only specified fields', async () => {
      // Arrange
      const updateData = { version: '1.1.0' };
      const updatedProduct = createDbProduct({ version: '1.1.0' });
      mockQuery.mockResolvedValue({ rows: [updatedProduct] });

      // Act
      const result = await repository.update(mockId, updateData);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('version = $1'),
        expect.arrayContaining(['1.1.0', mockId]),
        null
      );
    });

    it('should JSON.stringify object fields when updating', async () => {
      // Arrange
      const updateData = {
        features: ['new-feature'],
        defaultFeatures: ['new-feature'],
        uiConfig: { theme: 'dark' }
      };

      const updatedProduct = createDbProduct(updateData);
      mockQuery.mockResolvedValue({ rows: [updatedProduct] });

      // Act
      await repository.update(mockId, updateData);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          JSON.stringify(updateData.features),
          JSON.stringify(updateData.defaultFeatures),
          JSON.stringify(updateData.uiConfig),
          mockId
        ]),
        null
      );
    });

    it('should return existing product when no fields to update', async () => {
      // Arrange
      const existingProduct = createDbProduct();
      mockQuery.mockResolvedValue({ rows: [existingProduct] });

      // Act
      const result = await repository.update(mockId, {});

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND deleted_at IS NULL'),
        [mockId],
        null
      );
    });

    it('should return null when product not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.update(mockId, { version: '2.0.0' });

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Update failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.update(mockId, { version: '2.0.0' })).rejects.toThrow('Update failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating product',
        expect.objectContaining({
          id: mockId,
          error: 'Update failed'
        })
      );
    });
  });

  describe('delete (soft)', () => {
    it('should soft delete a product', async () => {
      // Arrange
      const deletedProduct = createDbProduct({ deleted_at: new Date() });
      mockQuery.mockResolvedValue({ rows: [deletedProduct] });

      // Act
      const result = await repository.delete(mockId);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        [mockId],
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        [mockId],
        null
      );
    });

    it('should return null when product not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.delete(mockId);

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Delete failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.delete(mockId)).rejects.toThrow('Delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error soft deleting product',
        expect.objectContaining({
          id: mockId,
          error: 'Delete failed'
        })
      );
    });
  });

  describe('hardDelete', () => {
    it('should hard delete a product', async () => {
      // Arrange
      const deletedProduct = createDbProduct();
      mockQuery.mockResolvedValue({ rows: [deletedProduct] });

      // Act
      const result = await repository.hardDelete(mockId);

      // Assert
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM products'),
        [mockId],
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING *'),
        [mockId],
        null
      );
    });

    it('should return false when product not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.hardDelete(mockId);

      // Assert
      expect(result).toBe(false);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Hard delete failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.hardDelete(mockId)).rejects.toThrow('Hard delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error hard deleting product',
        expect.objectContaining({
          id: mockId,
          error: 'Hard delete failed'
        })
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted product', async () => {
      // Arrange
      const restoredProduct = createDbProduct({ deleted_at: null });
      mockQuery.mockResolvedValue({ rows: [restoredProduct] });

      // Act
      const result = await repository.restore(mockId);

      // Assert
      expect(result).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE products'),
        [mockId],
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NULL'),
        [mockId],
        null
      );
    });

    it('should return null when product not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.restore(mockId);

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Restore failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.restore(mockId)).rejects.toThrow('Restore failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error restoring product',
        expect.objectContaining({
          id: mockId,
          error: 'Restore failed'
        })
      );
    });
  });

  describe('search', () => {
    it('should search products by name', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, name: 'test-product' })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.search('test');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Product);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('name ILIKE $1'),
        ['%test%'],
        null
      );
    });

    it('should search products by display_name', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, display_name: 'Test Product Display' })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.search('Display');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('display_name ILIKE $1'),
        ['%Display%'],
        null
      );
    });

    it('should search products by description', async () => {
      // Arrange
      const dbProducts = [
        createDbProduct({ id: mockId, description: 'A product with special features' })
      ];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      const result = await repository.search('special');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('description ILIKE $1'),
        ['%special%'],
        null
      );
    });

    it('should return empty array when no matches found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.search('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Search failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(repository.search('test')).rejects.toThrow('Search failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error searching products',
        expect.objectContaining({
          searchTerm: 'test',
          error: 'Search failed'
        })
      );
    });
  });

  describe('Refactoring Verification', () => {
    it('should use this.query instead of direct pool.query', async () => {
      // Arrange
      const dbProducts = [createDbProduct()];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      await repository.findAll();

      // Assert
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should pass null as organizationId context (non-tenant table)', async () => {
      // Arrange
      const dbProducts = [createDbProduct()];
      mockQuery.mockResolvedValue({ rows: dbProducts });

      // Act
      await repository.findAll();

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        null // organizationId should be null for products table
      );
    });

    it('should log errors with proper context', async () => {
      // Arrange
      const dbError = new Error('Query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act
      try {
        await repository.findById(mockId);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding product by ID',
        expect.objectContaining({
          id: mockId,
          error: 'Query failed'
        })
      );
    });

    it('should support dependency injection for testing', () => {
      // Arrange
      const customQuery = jest.fn();
      const customRepo = new ProductRepository({ query: customQuery });

      // Assert
      expect(customRepo.query).toBe(customQuery);
      expect(customRepo.query).not.toBe(mockQuery);
    });
  });
});
