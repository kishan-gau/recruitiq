/**
 * Tests for ProductConfigController
 * 
 * Controller Layer: HTTP request/response handling
 * Tests verify:
 * - Request parsing (params, query, body)
 * - Service method calls with correct arguments
 * - Response formatting with appropriate status codes
 * - Error handling and status code logic
 * 
 * NOTE: This controller exports a singleton instance, not a class
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock service BEFORE importing controller
const mockProductConfigService = {
  getConfigs: jest.fn(),
  getConfigMap: jest.fn(),
  getConfig: jest.fn(),
  setConfig: jest.fn(),
  updateConfig: jest.fn(),
  deleteConfig: jest.fn(),
  deleteAllConfigs: jest.fn()
};

jest.unstable_mockModule('../../../../src/products/nexus/services/index.js', () => ({
  productConfigService: mockProductConfigService
}));

// Import controller AFTER mocking
const { default: productConfigController } = await import('../../../../src/products/nexus/controllers/productConfigController.js');

describe('ProductConfigController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 'user-123' },
      params: {
        organizationId: 'org-123',
        productId: 'prod-123',
        configKey: 'test-key'
      },
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getConfigs', () => {
    it('should get all configs for organization and product', async () => {
      const mockConfigs = [
        { configKey: 'key1', configValue: 'value1' },
        { configKey: 'key2', configValue: 'value2' }
      ];

      mockProductConfigService.getConfigs.mockResolvedValue(mockConfigs);

      await productConfigController.getConfigs(mockReq, mockRes);

      expect(mockProductConfigService.getConfigs).toHaveBeenCalledWith(
        'org-123',
        'prod-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfigs);
    });

    it('should return config map when format=map', async () => {
      mockReq.query = { format: 'map' };

      const mockConfigMap = {
        key1: 'value1',
        key2: 'value2'
      };

      mockProductConfigService.getConfigMap.mockResolvedValue(mockConfigMap);

      await productConfigController.getConfigs(mockReq, mockRes);

      expect(mockProductConfigService.getConfigMap).toHaveBeenCalledWith(
        'org-123',
        'prod-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfigMap);
    });

    it('should handle errors when getting configs', async () => {
      mockProductConfigService.getConfigs.mockRejectedValue(
        new Error('Database error')
      );

      await productConfigController.getConfigs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });
  });

  describe('getConfig', () => {
    it('should get a specific config value', async () => {
      const mockConfig = {
        configKey: 'test-key',
        configValue: 'test-value',
        configType: 'string'
      };

      mockProductConfigService.getConfig.mockResolvedValue(mockConfig);

      await productConfigController.getConfig(mockReq, mockRes);

      expect(mockProductConfigService.getConfig).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'test-key'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfig);
    });

    it('should return 404 when config not found', async () => {
      mockProductConfigService.getConfig.mockResolvedValue(null);

      await productConfigController.getConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Config not found'
      });
    });

    it('should handle errors when getting config', async () => {
      mockProductConfigService.getConfig.mockRejectedValue(
        new Error('Database error')
      );

      await productConfigController.getConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Database error'
      });
    });
  });

  describe('setConfig', () => {
    it('should set a config value with all options', async () => {
      mockReq.body = {
        configValue: 'new-value',
        configType: 'string',
        isEncrypted: false,
        isSensitive: true,
        description: 'Test configuration'
      };

      const mockConfig = {
        configKey: 'test-key',
        configValue: 'new-value',
        configType: 'string',
        isEncrypted: false,
        isSensitive: true,
        description: 'Test configuration'
      };

      mockProductConfigService.setConfig.mockResolvedValue(mockConfig);

      await productConfigController.setConfig(mockReq, mockRes);

      expect(mockProductConfigService.setConfig).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'test-key',
        'new-value',
        {
          configType: 'string',
          isEncrypted: false,
          isSensitive: true,
          description: 'Test configuration'
        },
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfig);
    });

    it('should set a config with minimal data', async () => {
      mockReq.body = {
        configValue: 'simple-value'
      };

      const mockConfig = {
        configKey: 'test-key',
        configValue: 'simple-value'
      };

      mockProductConfigService.setConfig.mockResolvedValue(mockConfig);

      await productConfigController.setConfig(mockReq, mockRes);

      expect(mockProductConfigService.setConfig).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'test-key',
        'simple-value',
        {
          configType: undefined,
          isEncrypted: undefined,
          isSensitive: undefined,
          description: undefined
        },
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfig);
    });

    it('should return 400 when configValue is missing', async () => {
      mockReq.body = {};

      await productConfigController.setConfig(mockReq, mockRes);

      expect(mockProductConfigService.setConfig).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'configValue is required'
      });
    });

    it('should handle errors during config creation', async () => {
      mockReq.body = { configValue: 'value' };

      mockProductConfigService.setConfig.mockRejectedValue(
        new Error('Invalid config type')
      );

      await productConfigController.setConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid config type'
      });
    });
  });

  describe('updateConfig', () => {
    it('should update a config value', async () => {
      mockReq.body = {
        configValue: 'updated-value'
      };

      const mockConfig = {
        configKey: 'test-key',
        configValue: 'updated-value'
      };

      mockProductConfigService.updateConfig.mockResolvedValue(mockConfig);

      await productConfigController.updateConfig(mockReq, mockRes);

      expect(mockProductConfigService.updateConfig).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'test-key',
        'updated-value',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockConfig);
    });

    it('should return 400 when configValue is missing', async () => {
      mockReq.body = {};

      await productConfigController.updateConfig(mockReq, mockRes);

      expect(mockProductConfigService.updateConfig).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'configValue is required'
      });
    });

    it('should return 404 when config not found', async () => {
      mockReq.body = { configValue: 'value' };

      mockProductConfigService.updateConfig.mockRejectedValue(
        new Error('Config not found')
      );

      await productConfigController.updateConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Config not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.body = { configValue: 'value' };

      mockProductConfigService.updateConfig.mockRejectedValue(
        new Error('Invalid value type')
      );

      await productConfigController.updateConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid value type'
      });
    });
  });

  describe('deleteConfig', () => {
    it('should delete a config successfully', async () => {
      mockProductConfigService.deleteConfig.mockResolvedValue(undefined);

      await productConfigController.deleteConfig(mockReq, mockRes);

      expect(mockProductConfigService.deleteConfig).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'test-key',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 404 when config not found', async () => {
      mockProductConfigService.deleteConfig.mockRejectedValue(
        new Error('Config not found')
      );

      await productConfigController.deleteConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Config not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockProductConfigService.deleteConfig.mockRejectedValue(
        new Error('Delete operation failed')
      );

      await productConfigController.deleteConfig(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Delete operation failed'
      });
    });
  });

  describe('deleteAllConfigs', () => {
    it('should delete all configs for organization and product', async () => {
      mockProductConfigService.deleteAllConfigs.mockResolvedValue(5);

      await productConfigController.deleteAllConfigs(mockReq, mockRes);

      expect(mockProductConfigService.deleteAllConfigs).toHaveBeenCalledWith(
        'org-123',
        'prod-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        deleted: 5
      });
    });

    it('should return zero when no configs to delete', async () => {
      mockProductConfigService.deleteAllConfigs.mockResolvedValue(0);

      await productConfigController.deleteAllConfigs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        deleted: 0
      });
    });

    it('should handle errors when deleting all configs', async () => {
      mockProductConfigService.deleteAllConfigs.mockRejectedValue(
        new Error('Bulk delete failed')
      );

      await productConfigController.deleteAllConfigs(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bulk delete failed'
      });
    });
  });
});
