/**
 * Feature Repository Tests
 * 
 * Tests the FeatureRepository data access layer for feature catalog management
 */

import FeatureRepository from '../../../src/repositories/FeatureRepository.js';
import { query } from '../../../src/config/database.js';
import { NotFoundError, ValidationError } from '../../../src/utils/errors.js';

// Mock the database query function
jest.mock('../../../src/config/database.js');

describe('FeatureRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new FeatureRepository();
    jest.clearAllMocks();
  });

  describe('findByKey', () => {
    it('should find a feature by product ID and key', async () => {
      const mockFeature = {
        id: 'feature-1',
        product_id: 'product-1',
        feature_key: 'advanced_analytics',
        name: 'Advanced Analytics',
        status: 'active',
        min_tier: 'professional',
        rollout_percentage: 100,
        dependencies: null,
        conflicts: null,
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      query.mockResolvedValue({ rows: [mockFeature] });

      const result = await repository.findByKey('product-1', 'advanced_analytics');

      expect(result).toEqual(expect.objectContaining({
        id: 'feature-1',
        featureKey: 'advanced_analytics',
        name: 'Advanced Analytics',
      }));
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.product_id = $1 AND f.feature_key = $2'),
        ['product-1', 'advanced_analytics']
      );
    });

    it('should return null when feature not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await repository.findByKey('product-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByProduct', () => {
    it('should find all features for a product', async () => {
      const mockFeatures = [
        { id: 'f1', feature_key: 'feature1', name: 'Feature 1', status: 'active' },
        { id: 'f2', feature_key: 'feature2', name: 'Feature 2', status: 'active' },
      ];

      query.mockResolvedValue({ rows: mockFeatures });

      const result = await repository.findByProduct('product-1');

      expect(result).toHaveLength(2);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE f.product_id = $1'),
        expect.arrayContaining(['product-1'])
      );
    });

    it('should filter by status', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByProduct('product-1', { status: 'beta' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND f.status = $'),
        expect.arrayContaining(['product-1', 'beta'])
      );
    });

    it('should filter by category', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByProduct('product-1', { category: 'analytics' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND f.category = $'),
        expect.arrayContaining(['product-1', 'analytics'])
      );
    });

    it('should filter by minimum tier', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByProduct('product-1', { minTier: 'enterprise' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND f.min_tier = $'),
        expect.arrayContaining(['product-1', 'enterprise'])
      );
    });

    it('should support pagination', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByProduct('product-1', {}, { limit: 10, offset: 20 });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining(['product-1', 10, 20])
      );
    });

    it('should support sorting', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByProduct('product-1', {}, { sortBy: 'name', sortOrder: 'DESC' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY f.name DESC'),
        expect.any(Array)
      );
    });
  });

  describe('create', () => {
    it('should create a new feature', async () => {
      const featureData = {
        productId: 'product-1',
        featureKey: 'new_feature',
        name: 'New Feature',
        description: 'A new feature',
        category: 'analytics',
        status: 'active',
        minTier: 'professional',
        rolloutPercentage: 50,
        dependencies: ['feature1', 'feature2'],
        conflicts: ['old_feature'],
        metadata: { version: '1.0' },
      };

      const mockCreated = {
        id: 'new-id',
        ...featureData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      query.mockResolvedValue({ rows: [mockCreated] });

      const result = await repository.create(featureData);

      expect(result).toEqual(expect.objectContaining({
        featureKey: 'new_feature',
        name: 'New Feature',
      }));
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO features'),
        expect.arrayContaining([
          'product-1',
          'new_feature',
          'New Feature',
          'A new feature',
        ])
      );
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        productId: 'product-1',
        // Missing required fields
      };

      await expect(repository.create(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should handle database constraint violations', async () => {
      query.mockRejectedValue({
        code: '23505', // Unique violation
        constraint: 'features_product_id_feature_key_key',
      });

      const featureData = {
        productId: 'product-1',
        featureKey: 'duplicate',
        name: 'Duplicate Feature',
      };

      await expect(repository.create(featureData)).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update a feature', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: 'beta',
      };

      const mockUpdated = {
        id: 'feature-1',
        ...updateData,
        updated_at: new Date(),
      };

      query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await repository.update('feature-1', updateData);

      expect(result).toEqual(expect.objectContaining({
        name: 'Updated Name',
        status: 'beta',
      }));
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE features'),
        expect.arrayContaining(['feature-1'])
      );
    });

    it('should throw NotFoundError when feature does not exist', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.update('nonexistent', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('deprecate', () => {
    it('should deprecate a feature with message', async () => {
      const mockDeprecated = {
        id: 'feature-1',
        status: 'deprecated',
        metadata: { deprecation_message: 'Use new_feature instead' },
      };

      query.mockResolvedValue({ rows: [mockDeprecated] });

      const result = await repository.deprecate('feature-1', 'Use new_feature instead');

      expect(result.status).toBe('deprecated');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'deprecated'"),
        expect.arrayContaining(['feature-1'])
      );
    });
  });

  describe('validateDependencies', () => {
    it('should validate that dependencies exist', async () => {
      query.mockResolvedValue({ rows: [{ count: '2' }] });

      const isValid = await repository.validateDependencies(
        'product-1',
        ['feature1', 'feature2']
      );

      expect(isValid).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining(['product-1', ['feature1', 'feature2']])
      );
    });

    it('should return false when dependencies are missing', async () => {
      query.mockResolvedValue({ rows: [{ count: '1' }] }); // Only 1 of 2 found

      const isValid = await repository.validateDependencies(
        'product-1',
        ['feature1', 'feature2']
      );

      expect(isValid).toBe(false);
    });

    it('should detect circular dependencies', async () => {
      // Mock feature with dependencies
      query.mockResolvedValueOnce({
        rows: [{
          dependencies: JSON.stringify(['feature2']),
        }],
      });
      // Mock dependency that points back
      query.mockResolvedValueOnce({
        rows: [{
          dependencies: JSON.stringify(['feature1']),
        }],
      });

      const hasCircular = await repository.checkCircularDependency(
        'product-1',
        'feature1',
        ['feature2']
      );

      expect(hasCircular).toBe(true);
    });
  });

  describe('checkConflicts', () => {
    it('should detect conflicting features in active grants', async () => {
      query.mockResolvedValue({ rows: [{ count: '1' }] });

      const hasConflicts = await repository.checkConflicts(
        'org-1',
        'product-1',
        ['conflicting_feature']
      );

      expect(hasConflicts).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('organization_feature_grants'),
        expect.arrayContaining(['org-1', 'product-1'])
      );
    });

    it('should return false when no conflicts exist', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      const hasConflicts = await repository.checkConflicts(
        'org-1',
        'product-1',
        ['non_conflicting_feature']
      );

      expect(hasConflicts).toBe(false);
    });
  });

  describe('countByStatus', () => {
    it('should count features by status', async () => {
      const mockCounts = [
        { status: 'active', count: '15' },
        { status: 'beta', count: '3' },
        { status: 'deprecated', count: '2' },
      ];

      query.mockResolvedValue({ rows: mockCounts });

      const result = await repository.countByStatus('product-1');

      expect(result).toEqual({
        active: 15,
        beta: 3,
        deprecated: 2,
      });
    });
  });

  describe('findDependents', () => {
    it('should find features that depend on given feature', async () => {
      const mockDependents = [
        { id: 'f1', feature_key: 'dependent1', dependencies: ['target_feature'] },
        { id: 'f2', feature_key: 'dependent2', dependencies: ['target_feature', 'other'] },
      ];

      query.mockResolvedValue({ rows: mockDependents });

      const result = await repository.findDependents('product-1', 'target_feature');

      expect(result).toHaveLength(2);
      expect(result[0].featureKey).toBe('dependent1');
    });
  });
});
