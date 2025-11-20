/**
 * ProductFeatureRepository Tests
 * Comprehensive test suite for ProductFeature repository operations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ProductFeatureRepository from '../../../../src/products/nexus/repositories/productFeatureRepository.js';
import ProductFeature from '../../../../src/products/nexus/models/ProductFeature.js';

describe('ProductFeatureRepository', () => {
  let repository;
  let mockQuery;
  let mockLogger;

  const mockProductId = '550e8400-e29b-41d4-a716-446655440000';
  const mockFeatureKey = 'advanced-reporting';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Create mock query function
    mockQuery = jest.fn();
    
    // Create mock logger
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    // Initialize repository with mocked dependencies
    repository = new ProductFeatureRepository({ query: mockQuery });
    repository.logger = mockLogger;
  });

  describe('Constructor', () => {
    it('should initialize with injected database query', () => {
      expect(repository.query).toBe(mockQuery);
    });

    it('should initialize with default query when no database provided', () => {
      const repo = new ProductFeatureRepository();
      expect(repo.query).toBeDefined();
      expect(typeof repo.query).toBe('function');
    });

    it('should have logger instance', () => {
      expect(repository.logger).toBeDefined();
      expect(repository.logger).toBe(mockLogger);
    });
  });

  describe('findByProduct', () => {
    it('should find all features for a product ordered by is_default and feature_key', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'feature-1',
          feature_name: 'Feature 1',
          is_default: true,
          status: 'stable'
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'feature-2',
          feature_name: 'Feature 2',
          is_default: false,
          status: 'beta'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findByProduct(mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM product_features'),
        [mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_default DESC, feature_key ASC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ProductFeature);
      expect(result[1]).toBeInstanceOf(ProductFeature);
    });

    it('should return empty array when product has no features', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByProduct(mockProductId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByProduct(mockProductId))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByKey', () => {
    it('should find feature by composite key (productId, featureKey)', async () => {
      const mockFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Advanced Reporting',
        status: 'stable'
      };

      mockQuery.mockResolvedValue({ rows: [mockFeature] });

      const result = await repository.findByKey(mockProductId, mockFeatureKey);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1 AND feature_key = $2'),
        [mockProductId, mockFeatureKey]
      );
      expect(result).toBeInstanceOf(ProductFeature);
      expect(result.featureKey).toBe(mockFeatureKey);
    });

    it('should return null when feature not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByKey(mockProductId, 'non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByKey(mockProductId, mockFeatureKey))
        .rejects.toThrow('Database error');
    });
  });

  describe('findDefaultByProduct', () => {
    it('should find only default features for a product', async () => {
      const mockDefaultFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'basic-feature',
          feature_name: 'Basic Feature',
          is_default: true,
          status: 'stable'
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'core-feature',
          feature_name: 'Core Feature',
          is_default: true,
          status: 'stable'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDefaultFeatures });

      const result = await repository.findDefaultByProduct(mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1 AND is_default = TRUE'),
        [mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY feature_key ASC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result.every(f => f instanceof ProductFeature)).toBe(true);
    });

    it('should return empty array when no default features', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findDefaultByProduct(mockProductId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findDefaultByProduct(mockProductId))
        .rejects.toThrow('Database error');
    });
  });

  describe('findByStatus', () => {
    it('should find features by status', async () => {
      const mockStableFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'stable-feature-1',
          feature_name: 'Stable Feature 1',
          status: 'stable'
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'stable-feature-2',
          feature_name: 'Stable Feature 2',
          status: 'stable'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockStableFeatures });

      const result = await repository.findByStatus(mockProductId, 'stable');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1 AND status = $2'),
        [mockProductId, 'stable']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY feature_key ASC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result.every(f => f instanceof ProductFeature)).toBe(true);
    });

    it('should support different statuses (alpha, beta, stable, deprecated)', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByStatus(mockProductId, 'alpha');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockProductId, 'alpha']
      );

      await repository.findByStatus(mockProductId, 'beta');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockProductId, 'beta']
      );

      await repository.findByStatus(mockProductId, 'deprecated');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [mockProductId, 'deprecated']
      );
    });

    it('should return empty array when no features with status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByStatus(mockProductId, 'deprecated');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByStatus(mockProductId, 'stable'))
        .rejects.toThrow('Database error');
    });
  });

  describe('findAvailableForOrganization', () => {
    it('should find features available for organization tier (starter)', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'basic-feature',
          feature_name: 'Basic Feature',
          status: 'stable',
          is_default: true,
          min_tier: 'starter'
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'pro-feature',
          feature_name: 'Pro Feature',
          status: 'stable',
          is_default: false,
          min_tier: 'professional'
        },
        {
          id: '3',
          product_id: mockProductId,
          feature_key: 'enterprise-feature',
          feature_name: 'Enterprise Feature',
          status: 'stable',
          is_default: false,
          min_tier: 'enterprise'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findAvailableForOrganization(mockProductId, 'starter');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1'),
        [mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status NOT IN ('deprecated', 'disabled')"),
        expect.any(Array)
      );
      expect(result).toHaveLength(1); // Only starter tier feature
      expect(result[0].minTier).toBe('starter');
    });

    it('should find features available for organization tier (professional)', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'basic-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: true
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'pro-feature',
          min_tier: 'professional',
          status: 'stable',
          is_default: false
        },
        {
          id: '3',
          product_id: mockProductId,
          feature_key: 'enterprise-feature',
          min_tier: 'enterprise',
          status: 'stable',
          is_default: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findAvailableForOrganization(mockProductId, 'professional');

      expect(result).toHaveLength(2); // Starter + professional tier features
      expect(result.map(f => f.minTier)).toEqual(['starter', 'professional']);
    });

    it('should find all features for enterprise tier', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'basic-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: true
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'pro-feature',
          min_tier: 'professional',
          status: 'stable',
          is_default: false
        },
        {
          id: '3',
          product_id: mockProductId,
          feature_key: 'enterprise-feature',
          min_tier: 'enterprise',
          status: 'stable',
          is_default: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findAvailableForOrganization(mockProductId, 'enterprise');

      expect(result).toHaveLength(3); // All tier features
    });

    it('should exclude deprecated and disabled features', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'active-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: true
        }
        // Note: SQL query filters out deprecated and disabled, so they won't be in rows
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findAvailableForOrganization(mockProductId, 'enterprise');

      // SQL excludes deprecated/disabled, so verify SQL query was correct
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("status NOT IN ('deprecated', 'disabled')"),
        [mockProductId]
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('stable');
    });

    it('should handle unknown organization tier', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'basic-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: true
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findAvailableForOrganization(mockProductId, 'unknown-tier');

      // Unknown tier level = 0, starter tier level = 1, so no features available
      expect(result).toHaveLength(0);
    });

    it('should order by is_default DESC, feature_key ASC', async () => {
      const mockFeatures = [
        {
          id: '1',
          product_id: mockProductId,
          feature_key: 'z-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: true
        },
        {
          id: '2',
          product_id: mockProductId,
          feature_key: 'a-feature',
          min_tier: 'starter',
          status: 'stable',
          is_default: false
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockFeatures });

      await repository.findAvailableForOrganization(mockProductId, 'starter');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_default DESC, feature_key ASC'),
        expect.any(Array)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findAvailableForOrganization(mockProductId, 'starter'))
        .rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    const validFeatureData = {
      productId: mockProductId,
      featureKey: 'new-feature',
      featureName: 'New Feature',
      description: 'A new feature',
      status: 'alpha',
      isDefault: false,
      minTier: 'professional',
      requiresFeatures: ['base-feature'],
      configSchema: { type: 'object', properties: { enabled: { type: 'boolean' } } },
      defaultConfig: { enabled: true },
      rolloutPercentage: 50,
      targetOrganizations: ['org-1', 'org-2']
    };

    it('should create new feature with all fields', async () => {
      const createdFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: 'new-feature',
        feature_name: 'New Feature',
        description: 'A new feature',
        status: 'alpha',
        is_default: false,
        min_tier: 'professional',
        requires_features: ['base-feature'],
        config_schema: { type: 'object' },
        default_config: { enabled: true },
        rollout_percentage: 50,
        target_organizations: ['org-1', 'org-2'],
        created_by: mockUserId
      };

      mockQuery.mockResolvedValue({ rows: [createdFeature] });

      const result = await repository.create(validFeatureData, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_features'),
        expect.arrayContaining([
          mockProductId,
          'new-feature',
          'New Feature',
          'A new feature',
          'alpha',
          false,
          'professional',
          '["base-feature"]', // JSON.stringify
          JSON.stringify(validFeatureData.configSchema),
          JSON.stringify(validFeatureData.defaultConfig),
          50,
          '["org-1","org-2"]', // JSON.stringify
          mockUserId
        ])
      );
      expect(result).toBeInstanceOf(ProductFeature);
      expect(result.featureKey).toBe('new-feature');
    });

    it('should apply default values for optional fields', async () => {
      const minimalData = {
        productId: mockProductId,
        featureKey: 'minimal-feature',
        featureName: 'Minimal Feature',
        description: 'Minimal description',
        requiresFeatures: [],
        configSchema: {},
        defaultConfig: {},
        targetOrganizations: []
      };

      const createdFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: 'minimal-feature',
        feature_name: 'Minimal Feature',
        description: 'Minimal description',
        status: 'alpha', // Default
        is_default: false, // Default
        min_tier: 'starter', // Default
        requires_features: [],
        config_schema: {},
        default_config: {},
        rollout_percentage: 0, // Default
        target_organizations: [],
        created_by: mockUserId
      };

      mockQuery.mockResolvedValue({ rows: [createdFeature] });

      const result = await repository.create(minimalData, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'alpha',  // Default status
          false,    // Default isDefault
          'starter', // Default minTier
          0         // Default rolloutPercentage
        ])
      );
      expect(result.status).toBe('alpha');
      expect(result.isDefault).toBe(false);
    });

    it('should stringify JSON fields (requiresFeatures, configSchema, defaultConfig, targetOrganizations)', async () => {
      const featureWithJson = {
        productId: mockProductId,
        featureKey: 'json-feature',
        featureName: 'JSON Feature',
        description: 'Feature with JSON',
        requiresFeatures: ['feature1', 'feature2'],
        configSchema: { type: 'object', properties: { key: { type: 'string' } } },
        defaultConfig: { key: 'value' },
        targetOrganizations: ['org1', 'org2', 'org3']
      };

      const createdFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: 'json-feature',
        feature_name: 'JSON Feature',
        description: 'Feature with JSON',
        status: 'alpha',
        is_default: false,
        min_tier: 'starter',
        requires_features: ['feature1', 'feature2'],
        config_schema: featureWithJson.configSchema,
        default_config: featureWithJson.defaultConfig,
        rollout_percentage: 0,
        target_organizations: ['org1', 'org2', 'org3'],
        created_by: mockUserId
      };

      mockQuery.mockResolvedValue({ rows: [createdFeature] });

      await repository.create(featureWithJson, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '["feature1","feature2"]', // JSON.stringify requiresFeatures
          JSON.stringify(featureWithJson.configSchema), // JSON.stringify configSchema
          JSON.stringify(featureWithJson.defaultConfig), // JSON.stringify defaultConfig
          '["org1","org2","org3"]' // JSON.stringify targetOrganizations
        ])
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Unique constraint violation');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.create(validFeatureData, mockUserId))
        .rejects.toThrow('Unique constraint violation');
    });
  });

  describe('update', () => {
    it('should update single field dynamically', async () => {
      const updateData = { featureName: 'Updated Feature Name' };

      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Updated Feature Name',
        status: 'stable'
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      const result = await repository.update(mockProductId, mockFeatureKey, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_features'),
        expect.arrayContaining(['Updated Feature Name', mockProductId, mockFeatureKey])
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET feature_name = $1'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductFeature);
      expect(result.featureName).toBe('Updated Feature Name');
    });

    it('should update multiple fields dynamically', async () => {
      const updateData = {
        featureName: 'Updated Name',
        description: 'Updated description',
        status: 'beta',
        isDefault: true,
        minTier: 'enterprise',
        rolloutPercentage: 75
      };

      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Updated Name',
        description: 'Updated description',
        status: 'beta',
        is_default: true,
        min_tier: 'enterprise',
        rollout_percentage: 75
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      const result = await repository.update(mockProductId, mockFeatureKey, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('feature_name = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('description = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_default = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('min_tier = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('rollout_percentage = $'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductFeature);
    });

    it('should return existing feature when no fields to update', async () => {
      const emptyUpdate = {};

      const existingFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Existing Feature',
        status: 'stable'
      };

      mockQuery.mockResolvedValue({ rows: [existingFeature] });

      const result = await repository.update(mockProductId, mockFeatureKey, emptyUpdate);

      // Should call findByKey instead of UPDATE
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM product_features'),
        [mockProductId, mockFeatureKey]
      );
      expect(result).toBeInstanceOf(ProductFeature);
    });

    it('should stringify JSON fields in updates', async () => {
      const updateData = {
        requiresFeatures: ['new-feature-1', 'new-feature-2'],
        configSchema: { type: 'object', properties: { newKey: { type: 'string' } } },
        defaultConfig: { newKey: 'newValue' },
        targetOrganizations: ['org-new-1', 'org-new-2']
      };

      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Feature',
        requires_features: ['new-feature-1', 'new-feature-2'],
        config_schema: updateData.configSchema,
        default_config: updateData.defaultConfig,
        target_organizations: ['org-new-1', 'org-new-2']
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      await repository.update(mockProductId, mockFeatureKey, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '["new-feature-1","new-feature-2"]', // JSON.stringify
          JSON.stringify(updateData.configSchema),
          JSON.stringify(updateData.defaultConfig),
          '["org-new-1","org-new-2"]' // JSON.stringify
        ])
      );
    });

    it('should return null when feature not found', async () => {
      const updateData = { featureName: 'Updated Name' };

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.update(mockProductId, 'non-existent-key', updateData);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const updateData = { featureName: 'Updated Name' };
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.update(mockProductId, mockFeatureKey, updateData))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateRollout', () => {
    it('should update rollout percentage', async () => {
      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Feature',
        rollout_percentage: 75
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      const result = await repository.updateRollout(mockProductId, mockFeatureKey, 75);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_features'),
        [75, mockProductId, mockFeatureKey]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET rollout_percentage = $1, updated_at = NOW()'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $2 AND feature_key = $3'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductFeature);
      expect(result.rolloutPercentage).toBe(75);
    });

    it('should support 0% rollout (disable)', async () => {
      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        rollout_percentage: 0
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      const result = await repository.updateRollout(mockProductId, mockFeatureKey, 0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [0, mockProductId, mockFeatureKey]
      );
      expect(result.rolloutPercentage).toBe(0);
    });

    it('should support 100% rollout (fully enabled)', async () => {
      const updatedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        rollout_percentage: 100
      };

      mockQuery.mockResolvedValue({ rows: [updatedFeature] });

      const result = await repository.updateRollout(mockProductId, mockFeatureKey, 100);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [100, mockProductId, mockFeatureKey]
      );
      expect(result.rolloutPercentage).toBe(100);
    });

    it('should return null when feature not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.updateRollout(mockProductId, 'non-existent-key', 50);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.updateRollout(mockProductId, mockFeatureKey, 50))
        .rejects.toThrow('Database error');
    });
  });

  describe('delete', () => {
    it('should hard delete feature (no soft delete)', async () => {
      const deletedFeature = {
        id: '1',
        product_id: mockProductId,
        feature_key: mockFeatureKey,
        feature_name: 'Deleted Feature'
      };

      mockQuery.mockResolvedValue({ rows: [deletedFeature] });

      const result = await repository.delete(mockProductId, mockFeatureKey);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM product_features'),
        [mockProductId, mockFeatureKey]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1 AND feature_key = $2'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING *'),
        expect.any(Array)
      );
      expect(result).toBe(true);
    });

    it('should return false when feature not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.delete(mockProductId, 'non-existent-key');

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Foreign key constraint violation');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.delete(mockProductId, mockFeatureKey))
        .rejects.toThrow('Foreign key constraint violation');
    });
  });

  describe('Refactoring Verification', () => {
    it('should use this.query instead of direct database access', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByProduct(mockProductId);

      expect(mockQuery).toHaveBeenCalled();
      expect(repository.query).toBe(mockQuery);
    });

    it('should not pass context parameter (product-level queries)', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByProduct(mockProductId);

      // Verify no third parameter passed (unlike organization-level queries)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array)
        // No third parameter
      );
    });

    it('should use composite key (productId, featureKey) for lookups', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByKey(mockProductId, mockFeatureKey);
      await repository.update(mockProductId, mockFeatureKey, { featureName: 'Updated' });
      await repository.delete(mockProductId, mockFeatureKey);

      // All methods should use both productId and featureKey
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('product_id = $1 AND feature_key = $2'),
        expect.arrayContaining([mockProductId, mockFeatureKey])
      );
    });

    it('should not use soft deletes (hard DELETE)', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: '1' }] });

      await repository.delete(mockProductId, mockFeatureKey);

      // Should use DELETE, not UPDATE with deleted_at
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.any(Array)
      );
      expect(mockQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('deleted_at'),
        expect.any(Array)
      );
    });
  });
});
