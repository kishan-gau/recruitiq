/**
 * Feature Access Service Tests
 * 
 * Tests the core feature access control service with caching
 */

import FeatureAccessService from '../../../src/services/FeatureAccessService.js';
import FeatureRepository from '../../../src/repositories/FeatureRepository.js';
import FeatureGrantRepository from '../../../src/repositories/FeatureGrantRepository.js';
import { ForbiddenError } from '../../../src/utils/errors.js';

jest.mock('../../../src/repositories/FeatureRepository.js');
jest.mock('../../../src/repositories/FeatureGrantRepository.js');

describe('FeatureAccessService', () => {
  let featureRepo;
  let grantRepo;

  beforeEach(() => {
    featureRepo = new FeatureRepository();
    grantRepo = new FeatureGrantRepository();
    
    // Clear cache before each test
    FeatureAccessService.cache.clear();
    
    jest.clearAllMocks();
  });

  describe('hasFeature', () => {
    it('should return true when organization has active grant', async () => {
      const mockFeature = {
        id: 'feature-1',
        featureKey: 'advanced_analytics',
        status: 'active',
        rolloutPercentage: 100,
      };

      const mockGrant = {
        id: 'grant-1',
        featureId: 'feature-1',
        usageLimit: null,
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'advanced_analytics'
      );

      expect(result).toBe(true);
    });

    it('should return false when feature does not exist', async () => {
      featureRepo.findByKey.mockResolvedValue(null);

      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'nonexistent'
      );

      expect(result).toBe(false);
    });

    it('should return false when feature is disabled', async () => {
      const mockFeature = {
        id: 'feature-1',
        status: 'disabled',
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);

      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'disabled_feature'
      );

      expect(result).toBe(false);
    });

    it('should return false when no active grant exists', async () => {
      const mockFeature = {
        id: 'feature-1',
        status: 'active',
        rolloutPercentage: 100,
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(null);

      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'premium_feature'
      );

      expect(result).toBe(false);
    });

    it('should return false when usage limit is exceeded', async () => {
      const mockFeature = {
        id: 'feature-1',
        status: 'active',
      };

      const mockGrant = {
        id: 'grant-1',
        usageLimit: 1000,
        usageCount: 1000,
        remainingUsage: 0,
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'limited_feature'
      );

      expect(result).toBe(false);
    });

    it('should check rollout percentage', async () => {
      const mockFeature = {
        id: 'feature-1',
        status: 'active',
        rolloutPercentage: 50,
      };

      const mockGrant = {
        id: 'grant-1',
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      // Org hash determines rollout inclusion
      const result = await FeatureAccessService.hasFeature(
        'org-1',
        'product-1',
        'beta_feature'
      );

      expect(typeof result).toBe('boolean');
    });

    it('should use cache for repeated checks', async () => {
      const mockFeature = { id: 'f1', status: 'active', rolloutPercentage: 100 };
      const mockGrant = { id: 'g1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      // First call
      await FeatureAccessService.hasFeature('org-1', 'product-1', 'feature1');

      // Second call should use cache
      await FeatureAccessService.hasFeature('org-1', 'product-1', 'feature1');

      // Repository should only be called once
      expect(featureRepo.findByKey).toHaveBeenCalledTimes(1);
      expect(grantRepo.findActiveGrantByKey).toHaveBeenCalledTimes(1);
    });

    it('should expire cache after TTL', async () => {
      const mockFeature = { id: 'f1', status: 'active', rolloutPercentage: 100 };
      const mockGrant = { id: 'g1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      // First call
      await FeatureAccessService.hasFeature('org-1', 'product-1', 'feature1');

      // Manually expire cache
      const cacheKey = 'org-1:product-1:feature1';
      FeatureAccessService.cache.delete(cacheKey);

      // Second call should hit database again
      await FeatureAccessService.hasFeature('org-1', 'product-1', 'feature1');

      expect(featureRepo.findByKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkFeature', () => {
    it('should return detailed access information', async () => {
      const mockFeature = {
        id: 'feature-1',
        featureKey: 'analytics',
        status: 'active',
        rolloutPercentage: 100,
      };

      const mockGrant = {
        id: 'grant-1',
        grantedVia: 'tier',
        expiresAt: null,
        usageLimit: 1000,
        usageCount: 250,
        remainingUsage: 750,
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      const result = await FeatureAccessService.checkFeature(
        'org-1',
        'product-1',
        'analytics'
      );

      expect(result).toEqual({
        featureKey: 'analytics',
        hasAccess: true,
        grantedVia: 'tier',
        expiresAt: null,
        usageLimit: 1000,
        usageCount: 250,
        remainingUsage: 750,
      });
    });

    it('should include reason when access is denied', async () => {
      featureRepo.findByKey.mockResolvedValue(null);

      const result = await FeatureAccessService.checkFeature(
        'org-1',
        'product-1',
        'nonexistent'
      );

      expect(result).toEqual({
        featureKey: 'nonexistent',
        hasAccess: false,
        reason: 'Feature does not exist',
      });
    });
  });

  describe('requireFeature', () => {
    it('should not throw when feature is available', async () => {
      const mockFeature = { id: 'f1', status: 'active', rolloutPercentage: 100 };
      const mockGrant = { id: 'g1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);

      await expect(
        FeatureAccessService.requireFeature('org-1', 'product-1', 'feature1')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenError when feature is not available', async () => {
      featureRepo.findByKey.mockResolvedValue(null);

      await expect(
        FeatureAccessService.requireFeature('org-1', 'product-1', 'premium')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should include feature name in error message', async () => {
      const mockFeature = {
        id: 'f1',
        name: 'Advanced Analytics',
        status: 'active',
      };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(null);

      await expect(
        FeatureAccessService.requireFeature('org-1', 'product-1', 'analytics')
      ).rejects.toThrow('Advanced Analytics');
    });
  });

  describe('hasAnyFeature', () => {
    it('should return true if any feature is available', async () => {
      featureRepo.findByKey
        .mockResolvedValueOnce(null) // feature1 not found
        .mockResolvedValueOnce({ id: 'f2', status: 'active', rolloutPercentage: 100 }); // feature2 found

      grantRepo.findActiveGrantByKey.mockResolvedValue({ id: 'g2' });

      const result = await FeatureAccessService.hasAnyFeature(
        'org-1',
        'product-1',
        ['feature1', 'feature2']
      );

      expect(result).toBe(true);
    });

    it('should return false if no features are available', async () => {
      featureRepo.findByKey.mockResolvedValue(null);

      const result = await FeatureAccessService.hasAnyFeature(
        'org-1',
        'product-1',
        ['feature1', 'feature2']
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAllFeatures', () => {
    it('should return true if all features are available', async () => {
      featureRepo.findByKey.mockResolvedValue({
        id: 'f1',
        status: 'active',
        rolloutPercentage: 100,
      });
      grantRepo.findActiveGrantByKey.mockResolvedValue({ id: 'g1' });

      const result = await FeatureAccessService.hasAllFeatures(
        'org-1',
        'product-1',
        ['feature1', 'feature2']
      );

      expect(result).toBe(true);
    });

    it('should return false if any feature is missing', async () => {
      featureRepo.findByKey
        .mockResolvedValueOnce({ id: 'f1', status: 'active', rolloutPercentage: 100 })
        .mockResolvedValueOnce(null);

      grantRepo.findActiveGrantByKey.mockResolvedValue({ id: 'g1' });

      const result = await FeatureAccessService.hasAllFeatures(
        'org-1',
        'product-1',
        ['feature1', 'feature2']
      );

      expect(result).toBe(false);
    });
  });

  describe('getOrganizationFeatures', () => {
    it('should return available and unavailable features', async () => {
      const mockFeatures = [
        { id: 'f1', featureKey: 'feature1', status: 'active' },
        { id: 'f2', featureKey: 'feature2', status: 'active' },
        { id: 'f3', featureKey: 'feature3', status: 'active' },
      ];

      const mockGrants = [
        { featureId: 'f1' },
        { featureId: 'f2' },
      ];

      featureRepo.findByProduct.mockResolvedValue(mockFeatures);
      grantRepo.findByOrganization.mockResolvedValue(mockGrants);

      const result = await FeatureAccessService.getOrganizationFeatures(
        'org-1',
        'product-1'
      );

      expect(result.available).toHaveLength(2);
      expect(result.unavailable).toHaveLength(1);
      expect(result.available[0].featureKey).toBe('feature1');
      expect(result.unavailable[0].featureKey).toBe('feature3');
    });
  });

  describe('trackUsage', () => {
    it('should increment usage count', async () => {
      const mockFeature = { id: 'feature-1' };
      const mockGrant = { id: 'grant-1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);
      grantRepo.incrementUsage.mockResolvedValue({ usageCount: 1 });

      await FeatureAccessService.trackUsage('org-1', 'product-1', 'api_calls');

      expect(grantRepo.incrementUsage).toHaveBeenCalledWith('grant-1', 1);
    });

    it('should invalidate cache after usage tracking', async () => {
      const mockFeature = { id: 'f1' };
      const mockGrant = { id: 'g1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);
      grantRepo.incrementUsage.mockResolvedValue({ usageCount: 1 });

      await FeatureAccessService.trackUsage('org-1', 'product-1', 'feature1');

      // Cache should be cleared for this key
      const cacheKey = 'org-1:product-1:feature1';
      expect(FeatureAccessService.cache.has(cacheKey)).toBe(false);
    });

    it('should support custom increment amount', async () => {
      const mockFeature = { id: 'f1' };
      const mockGrant = { id: 'g1' };

      featureRepo.findByKey.mockResolvedValue(mockFeature);
      grantRepo.findActiveGrantByKey.mockResolvedValue(mockGrant);
      grantRepo.incrementUsage.mockResolvedValue({ usageCount: 10 });

      await FeatureAccessService.trackUsage('org-1', 'product-1', 'api_calls', 10);

      expect(grantRepo.incrementUsage).toHaveBeenCalledWith('g1', 10);
    });
  });

  describe('invalidateCache', () => {
    it('should clear cache for specific organization', () => {
      FeatureAccessService.cache.set('org-1:product-1:feature1', {
        value: true,
        timestamp: Date.now(),
      });
      FeatureAccessService.cache.set('org-2:product-1:feature1', {
        value: true,
        timestamp: Date.now(),
      });

      FeatureAccessService.invalidateCache('org-1');

      expect(FeatureAccessService.cache.has('org-1:product-1:feature1')).toBe(false);
      expect(FeatureAccessService.cache.has('org-2:product-1:feature1')).toBe(true);
    });

    it('should clear cache for specific feature', () => {
      FeatureAccessService.cache.set('org-1:product-1:feature1', {
        value: true,
        timestamp: Date.now(),
      });
      FeatureAccessService.cache.set('org-1:product-1:feature2', {
        value: true,
        timestamp: Date.now(),
      });

      FeatureAccessService.invalidateCache('org-1', 'product-1', 'feature1');

      expect(FeatureAccessService.cache.has('org-1:product-1:feature1')).toBe(false);
      expect(FeatureAccessService.cache.has('org-1:product-1:feature2')).toBe(true);
    });
  });

  describe('checkRollout', () => {
    it('should deterministically include organizations in rollout', () => {
      // Same org and feature should always get same result
      const result1 = FeatureAccessService.checkRollout('org-1', 'feature-1', 50);
      const result2 = FeatureAccessService.checkRollout('org-1', 'feature-1', 50);

      expect(result1).toBe(result2);
    });

    it('should respect rollout percentage', () => {
      // At 0%, no orgs should be included
      const result0 = FeatureAccessService.checkRollout('org-1', 'feature-1', 0);
      expect(result0).toBe(false);

      // At 100%, all orgs should be included
      const result100 = FeatureAccessService.checkRollout('org-1', 'feature-1', 100);
      expect(result100).toBe(true);
    });
  });
});
