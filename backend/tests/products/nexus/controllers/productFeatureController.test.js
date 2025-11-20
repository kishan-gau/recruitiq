/**
 * ProductFeature Controller Tests
 * Tests for product feature management HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the service
const mockProductFeatureService = {
  getProductFeatures: jest.fn(),
  getFeaturesByStatus: jest.fn(),
  getDefaultFeatures: jest.fn(),
  getFeature: jest.fn(),
  getAvailableFeatures: jest.fn(),
  isFeatureAvailable: jest.fn(),
  getFeatureStats: jest.fn(),
  createFeature: jest.fn(),
  updateFeature: jest.fn(),
  updateRollout: jest.fn(),
  enableFeature: jest.fn(),
  disableFeature: jest.fn(),
  deleteFeature: jest.fn()
};

// Mock the service module
jest.unstable_mockModule('../../../../src/products/nexus/services/index.js', () => ({
  productFeatureService: mockProductFeatureService
}));

// Import controller after mocking
const { default: controller } = await import('../../../../src/products/nexus/controllers/productFeatureController.js');

describe('ProductFeatureController', () => {
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
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('getProductFeatures', () => {
    it('should get all features for a product', async () => {
      mockReq.params = { productId: 'prod-123' };
      const mockFeatures = [
        { id: 'feat-1', featureKey: 'feature-1' },
        { id: 'feat-2', featureKey: 'feature-2' }
      ];
      mockProductFeatureService.getProductFeatures.mockResolvedValue(mockFeatures);

      await controller.getProductFeatures(mockReq, mockRes);

      expect(mockProductFeatureService.getProductFeatures).toHaveBeenCalledWith('prod-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockFeatures);
    });

    it('should get features by status when status query param is provided', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.query = { status: 'active' };
      const mockFeatures = [{ id: 'feat-1', status: 'active' }];
      mockProductFeatureService.getFeaturesByStatus.mockResolvedValue(mockFeatures);

      await controller.getProductFeatures(mockReq, mockRes);

      expect(mockProductFeatureService.getFeaturesByStatus).toHaveBeenCalledWith('prod-123', 'active');
      expect(mockProductFeatureService.getProductFeatures).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockFeatures);
    });

    it('should get default features when defaultOnly=true', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.query = { defaultOnly: 'true' };
      const mockFeatures = [{ id: 'feat-1', isDefault: true }];
      mockProductFeatureService.getDefaultFeatures.mockResolvedValue(mockFeatures);

      await controller.getProductFeatures(mockReq, mockRes);

      expect(mockProductFeatureService.getDefaultFeatures).toHaveBeenCalledWith('prod-123');
      expect(mockProductFeatureService.getProductFeatures).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockFeatures);
    });

    it('should handle errors when getting product features', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockProductFeatureService.getProductFeatures.mockRejectedValue(new Error('Database error'));

      await controller.getProductFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getFeature', () => {
    it('should get a specific feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'advanced-reporting' };
      const mockFeature = { id: 'feat-1', featureKey: 'advanced-reporting' };
      mockProductFeatureService.getFeature.mockResolvedValue(mockFeature);

      await controller.getFeature(mockReq, mockRes);

      expect(mockProductFeatureService.getFeature).toHaveBeenCalledWith('prod-123', 'advanced-reporting');
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockProductFeatureService.getFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.getFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should handle other errors when getting feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockProductFeatureService.getFeature.mockRejectedValue(new Error('Database error'));

      await controller.getFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getAvailableFeatures', () => {
    it('should get available features for organization tier', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.query = { tier: 'premium' };
      const mockFeatures = [
        { id: 'feat-1', featureKey: 'feature-1', minTier: 'basic' },
        { id: 'feat-2', featureKey: 'feature-2', minTier: 'premium' }
      ];
      mockProductFeatureService.getAvailableFeatures.mockResolvedValue(mockFeatures);

      await controller.getAvailableFeatures(mockReq, mockRes);

      expect(mockProductFeatureService.getAvailableFeatures).toHaveBeenCalledWith('prod-123', 'premium');
      expect(mockRes.json).toHaveBeenCalledWith(mockFeatures);
    });

    it('should return 400 when tier query param is missing', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.query = {};

      await controller.getAvailableFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization tier is required' });
      expect(mockProductFeatureService.getAvailableFeatures).not.toHaveBeenCalled();
    });

    it('should handle errors when getting available features', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.query = { tier: 'premium' };
      mockProductFeatureService.getAvailableFeatures.mockRejectedValue(new Error('Database error'));

      await controller.getAvailableFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('checkFeatureAvailability', () => {
    it('should check if feature is available for organization', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'advanced-reporting' };
      mockReq.query = { organizationId: 'org-123', tier: 'premium' };
      mockProductFeatureService.isFeatureAvailable.mockResolvedValue(true);

      await controller.checkFeatureAvailability(mockReq, mockRes);

      expect(mockProductFeatureService.isFeatureAvailable).toHaveBeenCalledWith(
        'prod-123',
        'advanced-reporting',
        'org-123',
        'premium'
      );
      expect(mockRes.json).toHaveBeenCalledWith({ isAvailable: true });
    });

    it('should return false when feature is not available', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'enterprise-feature' };
      mockReq.query = { organizationId: 'org-123', tier: 'basic' };
      mockProductFeatureService.isFeatureAvailable.mockResolvedValue(false);

      await controller.checkFeatureAvailability(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ isAvailable: false });
    });

    it('should return 400 when organizationId is missing', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.query = { tier: 'premium' };

      await controller.checkFeatureAvailability(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization ID and tier are required' });
      expect(mockProductFeatureService.isFeatureAvailable).not.toHaveBeenCalled();
    });

    it('should return 400 when tier is missing', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.query = { organizationId: 'org-123' };

      await controller.checkFeatureAvailability(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Organization ID and tier are required' });
    });

    it('should handle errors when checking feature availability', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.query = { organizationId: 'org-123', tier: 'premium' };
      mockProductFeatureService.isFeatureAvailable.mockRejectedValue(new Error('Database error'));

      await controller.checkFeatureAvailability(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getFeatureStats', () => {
    it('should get feature statistics for a product', async () => {
      mockReq.params = { productId: 'prod-123' };
      const mockStats = {
        totalFeatures: 10,
        activeFeatures: 8,
        defaultFeatures: 5,
        rolloutStats: { enabled: 6, partialRollout: 2, disabled: 2 }
      };
      mockProductFeatureService.getFeatureStats.mockResolvedValue(mockStats);

      await controller.getFeatureStats(mockReq, mockRes);

      expect(mockProductFeatureService.getFeatureStats).toHaveBeenCalledWith('prod-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should handle errors when getting feature stats', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockProductFeatureService.getFeatureStats.mockRejectedValue(new Error('Database error'));

      await controller.getFeatureStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('createFeature', () => {
    it('should create a new feature', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.body = {
        featureKey: 'new-feature',
        displayName: 'New Feature',
        description: 'A new feature',
        minTier: 'basic'
      };
      const mockFeature = { id: 'feat-1', productId: 'prod-123', ...mockReq.body };
      mockProductFeatureService.createFeature.mockResolvedValue(mockFeature);

      await controller.createFeature(mockReq, mockRes);

      expect(mockProductFeatureService.createFeature).toHaveBeenCalledWith(
        { productId: 'prod-123', ...mockReq.body },
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { productId: 'prod-999' };
      mockReq.body = { featureKey: 'new-feature', displayName: 'New Feature' };
      mockProductFeatureService.createFeature.mockRejectedValue(new Error('Product not found'));

      await controller.createFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 409 when feature already exists', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.body = { featureKey: 'existing-feature', displayName: 'Existing Feature' };
      mockProductFeatureService.createFeature.mockRejectedValue(new Error('Feature with key existing-feature already exists'));

      await controller.createFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature with key existing-feature already exists' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { productId: 'prod-123' };
      mockReq.body = { featureKey: '' };
      mockProductFeatureService.createFeature.mockRejectedValue(new Error('Validation error'));

      await controller.createFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });
  });

  describe('updateFeature', () => {
    it('should update a feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = { displayName: 'Updated Feature', description: 'Updated description' };
      const mockFeature = { id: 'feat-1', featureKey: 'feature-1', ...mockReq.body };
      mockProductFeatureService.updateFeature.mockResolvedValue(mockFeature);

      await controller.updateFeature(mockReq, mockRes);

      expect(mockProductFeatureService.updateFeature).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        mockReq.body,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockReq.body = { displayName: 'Updated Feature' };
      mockProductFeatureService.updateFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.updateFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = { displayName: '' };
      mockProductFeatureService.updateFeature.mockRejectedValue(new Error('Validation error'));

      await controller.updateFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });
  });

  describe('updateRollout', () => {
    it('should update feature rollout percentage', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = { rolloutPercentage: 50 };
      const mockFeature = { id: 'feat-1', featureKey: 'feature-1', rolloutPercentage: 50 };
      mockProductFeatureService.updateRollout.mockResolvedValue(mockFeature);

      await controller.updateRollout(mockReq, mockRes);

      expect(mockProductFeatureService.updateRollout).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        50,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should accept 0 as rolloutPercentage', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = { rolloutPercentage: 0 };
      const mockFeature = { id: 'feat-1', rolloutPercentage: 0 };
      mockProductFeatureService.updateRollout.mockResolvedValue(mockFeature);

      await controller.updateRollout(mockReq, mockRes);

      expect(mockProductFeatureService.updateRollout).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        0,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 400 when rolloutPercentage is missing', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = {};

      await controller.updateRollout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'rolloutPercentage is required' });
      expect(mockProductFeatureService.updateRollout).not.toHaveBeenCalled();
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockReq.body = { rolloutPercentage: 50 };
      mockProductFeatureService.updateRollout.mockRejectedValue(new Error('Feature not found'));

      await controller.updateRollout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockReq.body = { rolloutPercentage: 150 };
      mockProductFeatureService.updateRollout.mockRejectedValue(new Error('Invalid rollout percentage'));

      await controller.updateRollout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid rollout percentage' });
    });
  });

  describe('enableFeature', () => {
    it('should enable a feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      const mockFeature = { id: 'feat-1', featureKey: 'feature-1', rolloutPercentage: 100 };
      mockProductFeatureService.enableFeature.mockResolvedValue(mockFeature);

      await controller.enableFeature(mockReq, mockRes);

      expect(mockProductFeatureService.enableFeature).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockProductFeatureService.enableFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.enableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockProductFeatureService.enableFeature.mockRejectedValue(new Error('Database error'));

      await controller.enableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('disableFeature', () => {
    it('should disable a feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      const mockFeature = { id: 'feat-1', featureKey: 'feature-1', rolloutPercentage: 0 };
      mockProductFeatureService.disableFeature.mockResolvedValue(mockFeature);

      await controller.disableFeature(mockReq, mockRes);

      expect(mockProductFeatureService.disableFeature).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockFeature);
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockProductFeatureService.disableFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.disableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockProductFeatureService.disableFeature.mockRejectedValue(new Error('Database error'));

      await controller.disableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('deleteFeature', () => {
    it('should delete a feature', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockProductFeatureService.deleteFeature.mockResolvedValue();

      await controller.deleteFeature(mockReq, mockRes);

      expect(mockProductFeatureService.deleteFeature).toHaveBeenCalledWith(
        'prod-123',
        'feature-1',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 404 when feature not found', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'non-existent' };
      mockProductFeatureService.deleteFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.deleteFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { productId: 'prod-123', featureKey: 'feature-1' };
      mockProductFeatureService.deleteFeature.mockRejectedValue(new Error('Database error'));

      await controller.deleteFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
