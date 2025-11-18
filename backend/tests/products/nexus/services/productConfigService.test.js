/**
 * ProductConfigService Unit Tests
 * Tests for product configuration management
 * 
 * CRITICAL: This service uses db.query (not query) and is exported as singleton
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock database - DIFFERENT PATTERN: Mock db object with query method
const mockDbQuery = jest.fn();
const mockDb = { query: mockDbQuery };

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: mockDb  // Default export, not named!
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocking - NOTE: Singleton export
const { default: productConfigService } = await import('../../../../src/products/nexus/services/productConfigService.js');

describe('ProductConfigService', () => {
  const productId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductConfig', () => {
    it('should get product config successfully', async () => {
      const config = {
        theme: 'dark',
        language: 'en',
        notifications: true
      };

      mockDbQuery.mockResolvedValueOnce({
        rows: [{ config }]
      });

      const result = await productConfigService.getProductConfig(productId);

      expect(result).toEqual(config);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'SELECT ui_config as config FROM products WHERE id = $1',
        [productId]
      );
    });

    it('should return empty object if config not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const result = await productConfigService.getProductConfig(productId);

      expect(result).toEqual({});
    });

    it('should return empty object if config is null', async () => {
      mockDbQuery.mockResolvedValueOnce({
        rows: [{ config: null }]
      });

      const result = await productConfigService.getProductConfig(productId);

      expect(result).toEqual({});
    });

    it('should handle different product IDs', async () => {
      const config1 = { theme: 'light' };
      const config2 = { theme: 'dark' };
      const productId1 = '111e4567-e89b-12d3-a456-426614174000';
      const productId2 = '222e4567-e89b-12d3-a456-426614174000';

      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ config: config1 }] })
        .mockResolvedValueOnce({ rows: [{ config: config2 }] });

      const result1 = await productConfigService.getProductConfig(productId1);
      const result2 = await productConfigService.getProductConfig(productId2);

      expect(result1).toEqual(config1);
      expect(result2).toEqual(config2);
      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle complex JSON config objects', async () => {
      const config = {
        theme: 'dark',
        language: 'en',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        features: ['feature1', 'feature2', 'feature3'],
        settings: {
          nested: {
            deeply: {
              value: 42
            }
          }
        }
      };

      mockDbQuery.mockResolvedValueOnce({
        rows: [{ config }]
      });

      const result = await productConfigService.getProductConfig(productId);

      expect(result).toEqual(config);
    });
  });

  describe('updateProductConfig', () => {
    it('should update product config successfully', async () => {
      const config = {
        theme: 'light',
        language: 'es',
        notifications: false
      };

      const updatedProduct = {
        id: productId,
        ui_config: config,
        updated_at: new Date()
      };

      mockDbQuery.mockResolvedValueOnce({
        rows: [updatedProduct]
      });

      const result = await productConfigService.updateProductConfig(productId, config);

      expect(result).toEqual(updatedProduct);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'UPDATE products SET ui_config = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [config, productId]
      );
    });

    it('should update timestamp when updating config', async () => {
      const config = { theme: 'dark' };
      const timestamp = new Date();

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: productId,
          ui_config: config,
          updated_at: timestamp
        }]
      });

      const result = await productConfigService.updateProductConfig(productId, config);

      expect(result.updated_at).toEqual(timestamp);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        [config, productId]
      );
    });

    it('should return updated row after update', async () => {
      const config = { theme: 'blue' };

      const updatedProduct = {
        id: productId,
        name: 'Test Product',
        ui_config: config,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDbQuery.mockResolvedValueOnce({
        rows: [updatedProduct]
      });

      const result = await productConfigService.updateProductConfig(productId, config);

      expect(result.id).toBe(productId);
      expect(result.ui_config).toEqual(config);
      expect(result.name).toBe('Test Product');
    });

    it('should handle complex JSON config updates', async () => {
      const config = {
        theme: 'custom',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745'
        },
        layout: {
          sidebar: 'left',
          header: 'fixed',
          footer: 'static'
        }
      };

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: productId,
          ui_config: config
        }]
      });

      const result = await productConfigService.updateProductConfig(productId, config);

      expect(result.ui_config).toEqual(config);
    });

    it('should handle empty config object', async () => {
      const config = {};

      mockDbQuery.mockResolvedValueOnce({
        rows: [{
          id: productId,
          ui_config: config
        }]
      });

      const result = await productConfigService.updateProductConfig(productId, config);

      expect(result.ui_config).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getProductConfig', async () => {
      mockDbQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        productConfigService.getProductConfig(productId)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle database errors in updateProductConfig', async () => {
      const config = { theme: 'dark' };

      mockDbQuery.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        productConfigService.updateProductConfig(productId, config)
      ).rejects.toThrow('Update failed');
    });

    it('should handle query timeout errors', async () => {
      mockDbQuery.mockRejectedValueOnce(new Error('Query timeout exceeded'));

      await expect(
        productConfigService.getProductConfig(productId)
      ).rejects.toThrow('Query timeout exceeded');
    });

    it('should handle connection pool exhaustion', async () => {
      mockDbQuery.mockRejectedValueOnce(new Error('Connection pool exhausted'));

      await expect(
        productConfigService.updateProductConfig(productId, {})
      ).rejects.toThrow('Connection pool exhausted');
    });
  });

  describe('singleton behavior', () => {
    it('should be exported as singleton instance', () => {
      // Service should be an instance, not a class
      expect(typeof productConfigService).toBe('object');
      expect(typeof productConfigService.getProductConfig).toBe('function');
      expect(typeof productConfigService.updateProductConfig).toBe('function');
    });

    it('should maintain state across multiple calls', async () => {
      const config1 = { theme: 'light' };
      const config2 = { theme: 'dark' };

      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ config: config1 }] })
        .mockResolvedValueOnce({ rows: [{ config: config2 }] });

      await productConfigService.getProductConfig(productId);
      await productConfigService.getProductConfig(productId);

      expect(mockDbQuery).toHaveBeenCalledTimes(2);
    });
  });
});
