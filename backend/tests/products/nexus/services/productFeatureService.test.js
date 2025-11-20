/**
 * Product Feature Service Tests
 * Tests for product feature management functionality
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

const { default: service } = await import('../../../../src/products/nexus/services/productFeatureService.js');

describe('ProductFeatureService', () => {
  const productId = '123e4567-e89b-12d3-a456-426614174000';
  const featureId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductFeatures', () => {
    it('should get all features for a product', async () => {
      const mockFeatures = [
        {
          id: featureId,
          code: 'employee_management',
          name: 'Employee Management',
          description: 'Manage employees',
          type: 'core',
          enabled: true,
          config: { maxEmployees: 1000 }
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          code: 'time_tracking',
          name: 'Time Tracking',
          description: 'Track employee time',
          type: 'addon',
          enabled: false,
          config: {}
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockFeatures });

      const result = await service.getProductFeatures(productId);

      expect(result).toEqual(mockFeatures);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM features f'),
        [productId]
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN product_features pf'),
        [productId]
      );
    });

    it('should return empty array if no features', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getProductFeatures(productId);

      expect(result).toEqual([]);
    });

    it('should order features by name', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getProductFeatures(productId);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY f.name'),
        [productId]
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.getProductFeatures(productId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching product features:', dbError);
    });
  });

  describe('enableProductFeature', () => {
    it('should enable a product feature', async () => {
      const mockResult = {
        product_id: productId,
        feature_id: featureId,
        enabled: true,
        config: {}
      };

      mockDbQuery.mockResolvedValue({ rows: [mockResult] });

      const result = await service.enableProductFeature(productId, featureId);

      expect(result).toEqual(mockResult);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_features'),
        [productId, featureId]  // Only 2 parameters - enabled is hardcoded to true in SQL
      );
    });

    it('should use ON CONFLICT to handle existing features', async () => {
      mockDbQuery.mockResolvedValue({ rows: [{}] });

      await service.enableProductFeature(productId, featureId);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (product_id, feature_id)'),
        [productId, featureId]  // Only 2 parameters
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET enabled = true'),
        [productId, featureId]  // Only 2 parameters
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Insert failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.enableProductFeature(productId, featureId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error enabling product feature:', dbError);
    });
  });

  describe('disableProductFeature', () => {
    it('should disable a product feature', async () => {
      const mockResult = {
        product_id: productId,
        feature_id: featureId,
        enabled: false,
        config: {}
      };

      mockDbQuery.mockResolvedValue({ rows: [mockResult] });

      const result = await service.disableProductFeature(productId, featureId);

      expect(result).toEqual(mockResult);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_features'),
        [productId, featureId]
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET enabled = false'),
        [productId, featureId]
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE product_id = $1 AND feature_id = $2'),
        [productId, featureId]
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(service.disableProductFeature(productId, featureId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error disabling product feature:', dbError);
    });
  });

  describe('updateProductFeatureConfig', () => {
    it('should update product feature config', async () => {
      const config = { maxEmployees: 5000, enableNotifications: true };
      const mockResult = {
        product_id: productId,
        feature_id: featureId,
        enabled: true,
        config
      };

      mockDbQuery.mockResolvedValue({ rows: [mockResult] });

      const result = await service.updateProductFeatureConfig(productId, featureId, config);

      expect(result).toEqual(mockResult);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_features'),
        [config, productId, featureId]
      );
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET config = $1'),
        [config, productId, featureId]
      );
    });

    it('should handle empty config object', async () => {
      const config = {};
      mockDbQuery.mockResolvedValue({ rows: [{ config }] });

      const result = await service.updateProductFeatureConfig(productId, featureId, config);

      expect(result.config).toEqual({});
    });

    it('should handle complex JSON config', async () => {
      const config = {
        limits: {
          maxEmployees: 1000,
          maxDepartments: 50
        },
        features: ['notifications', 'reports'],
        settings: {
          theme: 'dark',
          language: 'en'
        }
      };

      mockDbQuery.mockResolvedValue({ rows: [{ config }] });

      const result = await service.updateProductFeatureConfig(productId, featureId, config);

      expect(result.config).toEqual(config);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Update failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.updateProductFeatureConfig(productId, featureId, {})
      ).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating product feature config:', dbError);
    });
  });

  describe('error handling', () => {
    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockDbQuery.mockRejectedValue(timeoutError);

      await expect(service.getProductFeatures(productId)).rejects.toThrow(timeoutError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      mockDbQuery.mockRejectedValue(poolError);

      await expect(service.enableProductFeature(productId, featureId)).rejects.toThrow(poolError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('singleton behavior', () => {
    it('should be exported as singleton instance', () => {
      expect(service).toBeDefined();
      expect(typeof service.getProductFeatures).toBe('function');
    });

    it('should maintain state across multiple calls', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await service.getProductFeatures(productId);
      await service.enableProductFeature(productId, featureId);

      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });
  });
});
