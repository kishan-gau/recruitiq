/**
 * ProductConfigRepository Tests
 * Tests for refactored ProductConfig repository with DI pattern
 */

import { jest } from '@jest/globals';

describe('ProductConfigRepository', () => {
  let ProductConfigRepository;
  let ProductConfig;
  let repository;
  let mockQuery;
  let mockLogger;

  // Test data
  const mockOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const mockProductId = 'prod-123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const mockConfigKey = 'feature.enabled';

  // Helper to create DB format config
  const createDbConfig = (overrides = {}) => ({
    id: 'config-123e4567-e89b-12d3-a456-426614174000',
    organization_id: mockOrganizationId,
    product_id: mockProductId,
    config_key: 'feature.enabled',
    config_value: 'true',
    data_type: 'boolean',
    is_sensitive: false,
    description: 'Enable feature',
    created_by: mockUserId,
    updated_by: mockUserId,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides
  });

  beforeEach(async () => {
    // Mock database query
    mockQuery = jest.fn();
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn()
    };

    // Mock the database module
    jest.unstable_mockModule('../../../../src/config/database.js', () => ({
      query: mockQuery
    }));

    // Mock logger
    jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
      default: mockLogger
    }));

    // Import modules with mocks
    const repoModule = await import('../../../../src/products/nexus/repositories/productConfigRepository.js');
    ProductConfigRepository = repoModule.default;

    const modelModule = await import('../../../../src/products/nexus/models/ProductConfig.js');
    ProductConfig = modelModule.default;

    // Create repository with mock query
    repository = new ProductConfigRepository({ query: mockQuery });
    // Override logger with mock
    repository.logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('Constructor', () => {
    it('should accept injected database dependency', () => {
      const customQuery = jest.fn();
      const repo = new ProductConfigRepository({ query: customQuery });

      expect(repo.query).toBe(customQuery);
    });

    it('should use default query function if no dependency provided', async () => {
      // Import actual query to verify default behavior
      const { query: actualQuery } = await import('../../../../src/config/database.js');
      const repo = new ProductConfigRepository();

      expect(repo.query).toBeDefined();
    });

    it('should have logger instance', () => {
      expect(repository.logger).toBeDefined();
      expect(typeof repository.logger.error).toBe('function');
      expect(typeof repository.logger.info).toBe('function');
    });
  });

  describe('findByOrganizationAndProduct', () => {
    it('should find all configs for organization and product', async () => {
      // Arrange
      const mockConfigs = [
        createDbConfig({ config_key: 'feature.a' }),
        createDbConfig({ config_key: 'feature.b' })
      ];
      mockQuery.mockResolvedValue({ rows: mockConfigs });

      // Act
      const result = await repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM product_configs'),
        [mockOrganizationId, mockProductId],
        mockOrganizationId
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ProductConfig);
      expect(result[0].configKey).toBe('feature.a');
      expect(result[1].configKey).toBe('feature.b');
    });

    it('should return empty array when no configs found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should order configs by config_key', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY config_key ASC'),
        expect.any(Array),
        mockOrganizationId
      );
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId)
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding configs',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('findByKey', () => {
    it('should find config by key', async () => {
      // Arrange
      const mockConfig = createDbConfig();
      mockQuery.mockResolvedValue({ rows: [mockConfig] });

      // Act
      const result = await repository.findByKey(mockOrganizationId, mockProductId, mockConfigKey);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND product_id = $2 AND config_key = $3'),
        [mockOrganizationId, mockProductId, mockConfigKey],
        mockOrganizationId
      );
      expect(result).toBeInstanceOf(ProductConfig);
      expect(result.configKey).toBe('feature.enabled');
    });

    it('should return null when config not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findByKey(mockOrganizationId, mockProductId, 'nonexistent.key');

      // Assert
      expect(result).toBeNull();
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Query timeout');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findByKey(mockOrganizationId, mockProductId, mockConfigKey)
      ).rejects.toThrow('Query timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding config by key',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          configKey: mockConfigKey,
          error: 'Query timeout'
        })
      );
    });
  });

  describe('findByProduct', () => {
    it('should find all configs for a product across organizations', async () => {
      // Arrange
      const mockConfigs = [
        createDbConfig({ organization_id: 'org-1' }),
        createDbConfig({ organization_id: 'org-2' })
      ];
      mockQuery.mockResolvedValue({ rows: mockConfigs });

      // Act
      const result = await repository.findByProduct(mockProductId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pc.product_id = $1'),
        [mockProductId],
        null // No organization context
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no configs found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findByProduct(mockProductId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Connection lost');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findByProduct(mockProductId)
      ).rejects.toThrow('Connection lost');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding configs by product',
        expect.objectContaining({
          productId: mockProductId,
          error: 'Connection lost'
        })
      );
    });
  });

  describe('findSensitive', () => {
    it('should find only sensitive configs', async () => {
      // Arrange
      const sensitiveConfig = createDbConfig({ is_sensitive: true, config_key: 'api.key' });
      mockQuery.mockResolvedValue({ rows: [sensitiveConfig] });

      // Act
      const result = await repository.findSensitive(mockOrganizationId, mockProductId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND product_id = $2 AND is_sensitive = TRUE'),
        [mockOrganizationId, mockProductId],
        mockOrganizationId
      );
      expect(result).toHaveLength(1);
      expect(result[0].configKey).toBe('api.key');
      expect(result[0].isSensitive).toBe(true);
    });

    it('should return empty array when no sensitive configs', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.findSensitive(mockOrganizationId, mockProductId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Access denied');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findSensitive(mockOrganizationId, mockProductId)
      ).rejects.toThrow('Access denied');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding sensitive configs',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          error: 'Access denied'
        })
      );
    });
  });

  describe('upsert', () => {
    it('should insert new config when not exists', async () => {
      // Arrange
      const configData = {
        organizationId: mockOrganizationId,
        productId: mockProductId,
        configKey: 'new.feature',
        configValue: 'enabled',
        configType: 'string',
        isSensitive: false
      };

      const insertedConfig = createDbConfig({ config_key: 'new.feature', config_value: '"enabled"' });
      mockQuery.mockResolvedValueOnce({ rows: [insertedConfig] });

      // Act
      const result = await repository.upsert(configData, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_configs'),
        expect.arrayContaining([mockOrganizationId, mockProductId, 'new.feature', '"enabled"']),
        mockOrganizationId
      );
      expect(result).toBeInstanceOf(ProductConfig);
    });

    it('should update existing config when exists', async () => {
      // Arrange
      const configData = {
        organizationId: mockOrganizationId,
        productId: mockProductId,
        configKey: 'existing.feature',
        configValue: 'updated',
        configType: 'string'
      };

      const updatedConfig = createDbConfig({ config_key: 'existing.feature', config_value: '"updated"' });
      mockQuery.mockResolvedValueOnce({ rows: [updatedConfig] });

      // Act
      const result = await repository.upsert(configData, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array),
        mockOrganizationId
      );
      // Repository JSON.stringifies values, ProductConfig model stores as-is
      expect(result.configValue).toBe('"updated"');
    });

    it('should handle optional fields', async () => {
      // Arrange
      const minimalConfig = {
        organizationId: mockOrganizationId,
        productId: mockProductId,
        configKey: 'minimal',
        configValue: 'value'
      };

      mockQuery.mockResolvedValueOnce({ rows: [createDbConfig()] });

      // Act
      const result = await repository.upsert(minimalConfig, mockUserId);

      // Assert - should use defaults for optional fields
      expect(result).toBeInstanceOf(ProductConfig);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const configData = {
        organizationId: mockOrganizationId,
        productId: mockProductId,
        configKey: 'test',
        configValue: 'value'
      };
      const dbError = new Error('Constraint violation');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.upsert(configData, mockUserId)
      ).rejects.toThrow('Constraint violation');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error upserting config',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          error: 'Constraint violation'
        })
      );
    });
  });

  describe('updateValue', () => {
    it('should update config value', async () => {
      // Arrange
      const newValue = 'new-value';
      const updatedConfig = createDbConfig({ config_value: JSON.stringify(newValue) });
      mockQuery.mockResolvedValue({ rows: [updatedConfig] });

      // Act
      const result = await repository.updateValue(
        mockOrganizationId,
        mockProductId,
        mockConfigKey,
        newValue,
        mockUserId
      );

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_configs'),
        [JSON.stringify(newValue), mockUserId, mockOrganizationId, mockProductId, mockConfigKey],
        mockOrganizationId
      );
      // Repository JSON.stringifies values, ProductConfig model stores as-is
      expect(result.configValue).toBe(JSON.stringify(newValue));
    });

    it('should return null when config not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.updateValue(
        mockOrganizationId,
        mockProductId,
        'nonexistent',
        'value',
        mockUserId
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should update timestamp', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [createDbConfig()] });

      // Act
      await repository.updateValue(mockOrganizationId, mockProductId, mockConfigKey, 'value', mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array),
        mockOrganizationId
      );
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Update failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.updateValue(mockOrganizationId, mockProductId, mockConfigKey, 'value', mockUserId)
      ).rejects.toThrow('Update failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error updating config value',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          configKey: mockConfigKey,
          error: 'Update failed'
        })
      );
    });
  });

  describe('delete', () => {
    it('should delete config by key', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [createDbConfig()], rowCount: 1 });

      // Act
      const result = await repository.delete(mockOrganizationId, mockProductId, mockConfigKey);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM product_configs'),
        [mockOrganizationId, mockProductId, mockConfigKey],
        mockOrganizationId
      );
      expect(result).toBe(true);
    });

    it('should return false when config not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await repository.delete(mockOrganizationId, mockProductId, 'nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Delete failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.delete(mockOrganizationId, mockProductId, mockConfigKey)
      ).rejects.toThrow('Delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting config',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          configKey: mockConfigKey,
          error: 'Delete failed'
        })
      );
    });
  });

  describe('deleteAllByOrganizationAndProduct', () => {
    it('should delete all configs for organization and product', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [], rowCount: 5 });

      // Act
      const result = await repository.deleteAllByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM product_configs'),
        [mockOrganizationId, mockProductId],
        mockOrganizationId
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no configs to delete', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await repository.deleteAllByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert
      expect(result).toBe(0);
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Bulk delete failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.deleteAllByOrganizationAndProduct(mockOrganizationId, mockProductId)
      ).rejects.toThrow('Bulk delete failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error deleting all configs',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          error: 'Bulk delete failed'
        })
      );
    });
  });

  describe('getConfigMap', () => {
    it('should return config key-value map', async () => {
      // Arrange
      const mockConfigs = [
        createDbConfig({ config_key: 'feature.a', config_value: 'true' }),
        createDbConfig({ config_key: 'feature.b', config_value: 'false' }),
        createDbConfig({ config_key: 'max.items', config_value: '100' })
      ];
      mockQuery.mockResolvedValue({ rows: mockConfigs });

      // Act
      const result = await repository.getConfigMap(mockOrganizationId, mockProductId);

      // Assert
      expect(result).toEqual({
        'feature.a': 'true',
        'feature.b': 'false',
        'max.items': '100'
      });
    });

    it('should return empty object when no configs', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await repository.getConfigMap(mockOrganizationId, mockProductId);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle configs with null values', async () => {
      // Arrange
      const mockConfigs = [
        createDbConfig({ config_key: 'optional', config_value: null })
      ];
      mockQuery.mockResolvedValue({ rows: mockConfigs });

      // Act
      const result = await repository.getConfigMap(mockOrganizationId, mockProductId);

      // Assert
      // Note: ProductConfig model converts null to undefined via || operator
      expect(result).toEqual({ optional: undefined });
    });

    it('should log and throw error on database failure', async () => {
      // Arrange
      const dbError = new Error('Query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.getConfigMap(mockOrganizationId, mockProductId)
      ).rejects.toThrow('Query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting config map',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          error: 'Query failed'
        })
      );
    });
  });

  describe('Refactoring Verification', () => {
    it('should use this.query instead of direct pool.query', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId);

      // Assert - verify custom query wrapper is used
      expect(mockQuery).toHaveBeenCalled();
      expect(mockQuery.mock.calls[0][2]).toBe(mockOrganizationId); // Third param is organizationId
    });

    it('should pass organizationId context to query wrapper', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      await repository.findByKey(mockOrganizationId, mockProductId, 'test');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        mockOrganizationId // Organization context for logging/metrics
      );
    });

    it('should log errors with proper context', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        repository.findByOrganizationAndProduct(mockOrganizationId, mockProductId)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding configs',
        expect.objectContaining({
          organizationId: mockOrganizationId,
          productId: mockProductId,
          error: 'Database error'
        })
      );
    });

    it('should support dependency injection for testing', () => {
      // Arrange
      const customQuery = jest.fn();
      const customLogger = { error: jest.fn() };

      // Act
      const customRepo = new ProductConfigRepository({ query: customQuery });
      customRepo.logger = customLogger;

      // Assert
      expect(customRepo.query).toBe(customQuery);
      expect(customRepo.logger).toBe(customLogger);
    });
  });
});
