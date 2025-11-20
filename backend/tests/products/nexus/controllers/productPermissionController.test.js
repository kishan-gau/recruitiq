/**
 * ProductPermission Controller Tests
 * Tests for product permission HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the service
const mockProductPermissionService = {
  getOrganizationPermissions: jest.fn(),
  getEnabledProducts: jest.fn(),
  hasAccess: jest.fn(),
  hasAccessLevel: jest.fn(),
  isFeatureEnabled: jest.fn(),
  grantAccess: jest.fn(),
  updatePermission: jest.fn(),
  revokeAccess: jest.fn(),
  enableFeature: jest.fn(),
  disableFeature: jest.fn(),
  updateUsage: jest.fn(),
  checkExpiredLicenses: jest.fn()
};

// Mock the service module
jest.unstable_mockModule('../../../../src/products/nexus/services/index.js', () => ({
  productPermissionService: mockProductPermissionService
}));

// Import controller after mocking
const { default: controller } = await import('../../../../src/products/nexus/controllers/productPermissionController.js');

describe('ProductPermissionController', () => {
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

  describe('getOrganizationProducts', () => {
    it('should get all products for organization by default', async () => {
      mockReq.params = { organizationId: 'org-123' };
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', isEnabled: true },
        { id: 'prod-2', name: 'Product 2', isEnabled: false }
      ];
      mockProductPermissionService.getOrganizationPermissions.mockResolvedValue(mockProducts);

      await controller.getOrganizationProducts(mockReq, mockRes);

      expect(mockProductPermissionService.getOrganizationPermissions).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should get only enabled products when enabled=true', async () => {
      mockReq.params = { organizationId: 'org-123' };
      mockReq.query = { enabled: 'true' };
      const mockProducts = [
        { id: 'prod-1', name: 'Product 1', isEnabled: true }
      ];
      mockProductPermissionService.getEnabledProducts.mockResolvedValue(mockProducts);

      await controller.getOrganizationProducts(mockReq, mockRes);

      expect(mockProductPermissionService.getEnabledProducts).toHaveBeenCalledWith('org-123');
      expect(mockProductPermissionService.getOrganizationPermissions).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should not filter when enabled=false', async () => {
      mockReq.params = { organizationId: 'org-123' };
      mockReq.query = { enabled: 'false' };
      const mockProducts = [
        { id: 'prod-1', isEnabled: true },
        { id: 'prod-2', isEnabled: false }
      ];
      mockProductPermissionService.getOrganizationPermissions.mockResolvedValue(mockProducts);

      await controller.getOrganizationProducts(mockReq, mockRes);

      expect(mockProductPermissionService.getOrganizationPermissions).toHaveBeenCalledWith('org-123');
      expect(mockProductPermissionService.getEnabledProducts).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle errors when getting organization products', async () => {
      mockReq.params = { organizationId: 'org-123' };
      mockProductPermissionService.getOrganizationPermissions.mockRejectedValue(new Error('Database error'));

      await controller.getOrganizationProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('checkAccess', () => {
    it('should check if organization has basic access to product', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockProductPermissionService.hasAccess.mockResolvedValue(true);

      await controller.checkAccess(mockReq, mockRes);

      expect(mockProductPermissionService.hasAccess).toHaveBeenCalledWith('org-123', 'prod-456');
      expect(mockRes.json).toHaveBeenCalledWith({ hasAccess: true });
    });

    it('should return false when organization does not have access', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockProductPermissionService.hasAccess.mockResolvedValue(false);

      await controller.checkAccess(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ hasAccess: false });
    });

    it('should check specific access level when provided', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.query = { accessLevel: 'full' };
      mockProductPermissionService.hasAccessLevel.mockResolvedValue(true);

      await controller.checkAccess(mockReq, mockRes);

      expect(mockProductPermissionService.hasAccessLevel).toHaveBeenCalledWith('org-123', 'prod-456', 'full');
      expect(mockProductPermissionService.hasAccess).not.toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ hasAccess: true });
    });

    it('should return false when access level check fails', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.query = { accessLevel: 'admin' };
      mockProductPermissionService.hasAccessLevel.mockResolvedValue(false);

      await controller.checkAccess(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ hasAccess: false });
    });

    it('should handle errors when checking access', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockProductPermissionService.hasAccess.mockRejectedValue(new Error('Database error'));

      await controller.checkAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('checkFeature', () => {
    it('should check if feature is enabled', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'advanced-analytics' };
      mockProductPermissionService.isFeatureEnabled.mockResolvedValue(true);

      await controller.checkFeature(mockReq, mockRes);

      expect(mockProductPermissionService.isFeatureEnabled).toHaveBeenCalledWith('org-123', 'prod-456', 'advanced-analytics');
      expect(mockRes.json).toHaveBeenCalledWith({ isEnabled: true });
    });

    it('should return false when feature is not enabled', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'premium-feature' };
      mockProductPermissionService.isFeatureEnabled.mockResolvedValue(false);

      await controller.checkFeature(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ isEnabled: false });
    });

    it('should handle errors when checking feature', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'feature1' };
      mockProductPermissionService.isFeatureEnabled.mockRejectedValue(new Error('Database error'));

      await controller.checkFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('grantAccess', () => {
    it('should grant product access to organization', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = {
        accessLevel: 'full',
        expiresAt: '2025-12-31',
        maxUsers: 100
      };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        ...mockReq.body
      };
      mockProductPermissionService.grantAccess.mockResolvedValue(mockPermission);

      await controller.grantAccess(mockReq, mockRes);

      expect(mockProductPermissionService.grantAccess).toHaveBeenCalledWith(
        { organizationId: 'org-123', productId: 'prod-456', ...mockReq.body },
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 404 when product not found', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-999' };
      mockReq.body = { accessLevel: 'full' };
      mockProductPermissionService.grantAccess.mockRejectedValue(new Error('Product not found'));

      await controller.grantAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { accessLevel: 'invalid' };
      mockProductPermissionService.grantAccess.mockRejectedValue(new Error('Invalid access level'));

      await controller.grantAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid access level' });
    });
  });

  describe('updatePermission', () => {
    it('should update permission', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { accessLevel: 'read', maxUsers: 50 };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        ...mockReq.body
      };
      mockProductPermissionService.updatePermission.mockResolvedValue(mockPermission);

      await controller.updatePermission(mockReq, mockRes);

      expect(mockProductPermissionService.updatePermission).toHaveBeenCalledWith(
        'org-123',
        'prod-456',
        mockReq.body,
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 404 when permission not found', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-999' };
      mockReq.body = { accessLevel: 'read' };
      mockProductPermissionService.updatePermission.mockRejectedValue(new Error('Permission not found'));

      await controller.updatePermission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Permission not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { maxUsers: -1 };
      mockProductPermissionService.updatePermission.mockRejectedValue(new Error('Validation error'));

      await controller.updatePermission(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Validation error' });
    });
  });

  describe('revokeAccess', () => {
    it('should revoke product access', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        isEnabled: false,
        revokedAt: new Date()
      };
      mockProductPermissionService.revokeAccess.mockResolvedValue(mockPermission);

      await controller.revokeAccess(mockReq, mockRes);

      expect(mockProductPermissionService.revokeAccess).toHaveBeenCalledWith('org-123', 'prod-456', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 404 when permission not found', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-999' };
      mockProductPermissionService.revokeAccess.mockRejectedValue(new Error('Permission not found'));

      await controller.revokeAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Permission not found' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockProductPermissionService.revokeAccess.mockRejectedValue(new Error('Database error'));

      await controller.revokeAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('enableFeature', () => {
    it('should enable feature for organization', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'advanced-analytics' };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        enabledFeatures: ['advanced-analytics']
      };
      mockProductPermissionService.enableFeature.mockResolvedValue(mockPermission);

      await controller.enableFeature(mockReq, mockRes);

      expect(mockProductPermissionService.enableFeature).toHaveBeenCalledWith(
        'org-123',
        'prod-456',
        'advanced-analytics',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 404 when permission not found', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-999', featureKey: 'feature1' };
      mockProductPermissionService.enableFeature.mockRejectedValue(new Error('Permission not found'));

      await controller.enableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Permission not found' });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'invalid-feature' };
      mockProductPermissionService.enableFeature.mockRejectedValue(new Error('Feature not found'));

      await controller.enableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Feature not found' });
    });
  });

  describe('disableFeature', () => {
    it('should disable feature for organization', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'advanced-analytics' };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        enabledFeatures: []
      };
      mockProductPermissionService.disableFeature.mockResolvedValue(mockPermission);

      await controller.disableFeature(mockReq, mockRes);

      expect(mockProductPermissionService.disableFeature).toHaveBeenCalledWith(
        'org-123',
        'prod-456',
        'advanced-analytics',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 404 when permission not found', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-999', featureKey: 'feature1' };
      mockProductPermissionService.disableFeature.mockRejectedValue(new Error('Permission not found'));

      await controller.disableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Permission not found' });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456', featureKey: 'feature1' };
      mockProductPermissionService.disableFeature.mockRejectedValue(new Error('Database error'));

      await controller.disableFeature(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('updateUsage', () => {
    it('should update usage counters', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { usersCount: 50, resourcesCount: 1000 };
      const mockPermission = {
        id: 'perm-1',
        organizationId: 'org-123',
        productId: 'prod-456',
        currentUsers: 50,
        currentResources: 1000
      };
      mockProductPermissionService.updateUsage.mockResolvedValue(mockPermission);

      await controller.updateUsage(mockReq, mockRes);

      expect(mockProductPermissionService.updateUsage).toHaveBeenCalledWith(
        'org-123',
        'prod-456',
        50,
        1000
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should handle partial usage updates', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { usersCount: 25 };
      const mockPermission = {
        id: 'perm-1',
        currentUsers: 25
      };
      mockProductPermissionService.updateUsage.mockResolvedValue(mockPermission);

      await controller.updateUsage(mockReq, mockRes);

      expect(mockProductPermissionService.updateUsage).toHaveBeenCalledWith(
        'org-123',
        'prod-456',
        25,
        undefined
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockPermission);
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { organizationId: 'org-123', productId: 'prod-456' };
      mockReq.body = { usersCount: -10 };
      mockProductPermissionService.updateUsage.mockRejectedValue(new Error('Invalid usage count'));

      await controller.updateUsage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid usage count' });
    });
  });

  describe('getExpiredLicenses', () => {
    it('should get expired licenses', async () => {
      const mockExpiredLicenses = [
        { organizationId: 'org-1', productId: 'prod-1', expiresAt: '2025-01-01' },
        { organizationId: 'org-2', productId: 'prod-2', expiresAt: '2025-01-15' }
      ];
      mockProductPermissionService.checkExpiredLicenses.mockResolvedValue(mockExpiredLicenses);

      await controller.getExpiredLicenses(mockReq, mockRes);

      expect(mockProductPermissionService.checkExpiredLicenses).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockExpiredLicenses);
    });

    it('should return empty array when no expired licenses', async () => {
      mockProductPermissionService.checkExpiredLicenses.mockResolvedValue([]);

      await controller.getExpiredLicenses(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should handle errors when checking expired licenses', async () => {
      mockProductPermissionService.checkExpiredLicenses.mockRejectedValue(new Error('Database error'));

      await controller.getExpiredLicenses(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
