/**
 * Feature Grant Repository Tests
 * 
 * Tests the FeatureGrantRepository data access layer for organization feature grants
 */

import FeatureGrantRepository from '../../../src/repositories/FeatureGrantRepository.js';
import { query } from '../../../src/config/database.js';
import { NotFoundError, ValidationError } from '../../../src/utils/errors.js';

jest.mock('../../../src/config/database.js');

describe('FeatureGrantRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new FeatureGrantRepository();
    jest.clearAllMocks();
  });

  describe('findActiveGrant', () => {
    it('should find an active grant by organization and feature ID', async () => {
      const mockGrant = {
        id: 'grant-1',
        organization_id: 'org-1',
        feature_id: 'feature-1',
        feature_key: 'advanced_analytics',
        granted_via: 'tier',
        granted_at: new Date(),
        expires_at: null,
        revoked_at: null,
        usage_limit: 1000,
        usage_count: 150,
        remaining_usage: 850,
        config: null,
        billing_status: 'active',
      };

      query.mockResolvedValue({ rows: [mockGrant] });

      const result = await repository.findActiveGrant('org-1', 'feature-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'grant-1',
        organizationId: 'org-1',
        featureId: 'feature-1',
        grantedVia: 'tier',
      }));
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM active_feature_grants'),
        ['org-1', 'feature-1']
      );
    });

    it('should return null when no active grant exists', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await repository.findActiveGrant('org-1', 'feature-1');

      expect(result).toBeNull();
    });
  });

  describe('findActiveGrantByKey', () => {
    it('should find grant by feature key', async () => {
      const mockGrant = {
        id: 'grant-1',
        feature_key: 'advanced_analytics',
        granted_via: 'addon',
      };

      query.mockResolvedValue({ rows: [mockGrant] });

      const result = await repository.findActiveGrantByKey(
        'org-1',
        'advanced_analytics',
        'product-1'
      );

      expect(result).toEqual(expect.objectContaining({
        featureKey: 'advanced_analytics',
      }));
    });
  });

  describe('findByOrganization', () => {
    it('should find all grants for an organization', async () => {
      const mockGrants = [
        { id: 'g1', feature_key: 'feature1', granted_via: 'tier' },
        { id: 'g2', feature_key: 'feature2', granted_via: 'addon' },
      ];

      query.mockResolvedValue({ rows: mockGrants });

      const result = await repository.findByOrganization('org-1');

      expect(result).toHaveLength(2);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('organization_id = $1'),
        expect.arrayContaining(['org-1'])
      );
    });

    it('should filter by product ID', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByOrganization('org-1', { productId: 'product-1' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('f.product_id = $'),
        expect.arrayContaining(['org-1', 'product-1'])
      );
    });

    it('should filter by status', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByOrganization('org-1', { status: 'active' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.arrayContaining(['org-1'])
      );
    });

    it('should filter by granted_via', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.findByOrganization('org-1', { grantedVia: 'trial' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('granted_via = $'),
        expect.arrayContaining(['org-1', 'trial'])
      );
    });
  });

  describe('create', () => {
    it('should create a new feature grant', async () => {
      const grantData = {
        organizationId: 'org-1',
        featureId: 'feature-1',
        grantedVia: 'addon',
        grantedBy: 'user-1',
        expiresAt: new Date('2025-12-31'),
        usageLimit: 1000,
        config: { customSetting: true },
        billingStatus: 'active',
      };

      const mockCreated = {
        id: 'new-grant',
        ...grantData,
        granted_at: new Date(),
        usage_count: 0,
      };

      query.mockResolvedValue({ rows: [mockCreated] });

      const result = await repository.create(grantData);

      expect(result).toEqual(expect.objectContaining({
        id: 'new-grant',
        organizationId: 'org-1',
        featureId: 'feature-1',
        grantedVia: 'addon',
      }));
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_feature_grants'),
        expect.arrayContaining(['org-1', 'feature-1', 'addon', 'user-1'])
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = {
        organizationId: 'org-1',
        // Missing featureId and grantedVia
      };

      await expect(repository.create(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should handle duplicate grant attempts', async () => {
      query.mockRejectedValue({
        code: '23505',
        constraint: 'organization_feature_grants_unique_active',
      });

      const grantData = {
        organizationId: 'org-1',
        featureId: 'feature-1',
        grantedVia: 'tier',
      };

      await expect(repository.create(grantData)).rejects.toThrow(ValidationError);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      const mockUpdated = {
        id: 'grant-1',
        usage_count: 151,
        remaining_usage: 849,
      };

      query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await repository.incrementUsage('grant-1', 1);

      expect(result.usageCount).toBe(151);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organization_feature_grants'),
        ['grant-1', 1]
      );
    });

    it('should increment by custom amount', async () => {
      query.mockResolvedValue({ rows: [{ usage_count: 160 }] });

      await repository.incrementUsage('grant-1', 10);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['grant-1', 10]
      );
    });

    it('should throw NotFoundError when grant does not exist', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(repository.incrementUsage('nonexistent', 1)).rejects.toThrow(NotFoundError);
    });
  });

  describe('revoke', () => {
    it('should soft-delete a grant with reason', async () => {
      const mockRevoked = {
        id: 'grant-1',
        revoked_at: new Date(),
        revoked_by: 'admin-1',
        revoke_reason: 'Subscription canceled',
      };

      query.mockResolvedValue({ rows: [mockRevoked] });

      const result = await repository.revoke('grant-1', 'admin-1', 'Subscription canceled');

      expect(result.revokedAt).toBeDefined();
      expect(result.revokedBy).toBe('admin-1');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('revoked_at = NOW()'),
        ['grant-1', 'admin-1', 'Subscription canceled']
      );
    });

    it('should revoke without a reason', async () => {
      query.mockResolvedValue({ rows: [{ id: 'grant-1', revoked_at: new Date() }] });

      await repository.revoke('grant-1', 'admin-1');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['grant-1', 'admin-1', null]
      );
    });
  });

  describe('bulkGrant', () => {
    it('should grant multiple features at once', async () => {
      const mockGrants = [
        { id: 'g1', feature_id: 'f1' },
        { id: 'g2', feature_id: 'f2' },
        { id: 'g3', feature_id: 'f3' },
      ];

      query.mockResolvedValue({ rows: mockGrants });

      const result = await repository.bulkGrant(
        'org-1',
        ['f1', 'f2', 'f3'],
        'tier',
        'admin-1'
      );

      expect(result).toHaveLength(3);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_feature_grants'),
        expect.arrayContaining(['org-1', 'tier', 'admin-1'])
      );
    });

    it('should handle empty feature list', async () => {
      const result = await repository.bulkGrant('org-1', [], 'tier', 'admin-1');

      expect(result).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('bulkRevoke', () => {
    it('should revoke multiple grants at once', async () => {
      query.mockResolvedValue({ rowCount: 3 });

      const count = await repository.bulkRevoke(
        'org-1',
        ['f1', 'f2', 'f3'],
        'admin-1',
        'Tier downgrade'
      );

      expect(count).toBe(3);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organization_feature_grants'),
        expect.arrayContaining(['org-1', 'admin-1', 'Tier downgrade'])
      );
    });
  });

  describe('findExpiring', () => {
    it('should find grants expiring within specified days', async () => {
      const mockExpiring = [
        {
          id: 'g1',
          feature_key: 'trial_feature',
          expires_at: new Date('2025-11-15'),
          organization_name: 'Test Org',
        },
      ];

      query.mockResolvedValue({ rows: mockExpiring });

      const result = await repository.findExpiring(7); // 7 days

      expect(result).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at BETWEEN NOW()'),
        [7]
      );
    });
  });

  describe('findByUsageThreshold', () => {
    it('should find grants approaching usage limit', async () => {
      const mockNearLimit = [
        {
          id: 'g1',
          feature_key: 'api_calls',
          usage_count: 850,
          usage_limit: 1000,
          usage_percentage: 85,
        },
      ];

      query.mockResolvedValue({ rows: mockNearLimit });

      const result = await repository.findByUsageThreshold('org-1', 80); // 80%

      expect(result).toHaveLength(1);
      expect(result[0].usagePercentage).toBe(85);
    });
  });

  describe('getUsageSummary', () => {
    it('should get usage summary for organization', async () => {
      const mockSummary = [
        {
          feature_key: 'api_calls',
          feature_name: 'API Calls',
          usage_limit: 1000,
          usage_count: 750,
          remaining_usage: 250,
        },
        {
          feature_key: 'reports',
          feature_name: 'Custom Reports',
          usage_limit: 50,
          usage_count: 48,
          remaining_usage: 2,
        },
      ];

      query.mockResolvedValue({ rows: mockSummary });

      const result = await repository.getUsageSummary('org-1');

      expect(result).toHaveLength(2);
      expect(result[0].featureKey).toBe('api_calls');
      expect(result[0].usageLimit).toBe(1000);
      expect(result[0].usageCount).toBe(750);
    });

    it('should filter by product ID', async () => {
      query.mockResolvedValue({ rows: [] });

      await repository.getUsageSummary('org-1', 'product-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('f.product_id = $2'),
        ['org-1', 'product-1']
      );
    });
  });

  describe('updateConfig', () => {
    it('should update grant configuration', async () => {
      const newConfig = {
        apiVersion: 'v2',
        webhookUrl: 'https://example.com/webhook',
      };

      const mockUpdated = {
        id: 'grant-1',
        config: newConfig,
      };

      query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await repository.updateConfig('grant-1', newConfig);

      expect(result.config).toEqual(newConfig);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('config = $2'),
        ['grant-1', JSON.stringify(newConfig)]
      );
    });
  });

  describe('updateBillingStatus', () => {
    it('should update billing status', async () => {
      query.mockResolvedValue({
        rows: [{ id: 'grant-1', billing_status: 'past_due' }],
      });

      const result = await repository.updateBillingStatus('grant-1', 'past_due');

      expect(result.billingStatus).toBe('past_due');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('billing_status = $2'),
        ['grant-1', 'past_due']
      );
    });
  });

  describe('countByGrantedVia', () => {
    it('should count grants by source', async () => {
      const mockCounts = [
        { granted_via: 'tier', count: '50' },
        { granted_via: 'addon', count: '15' },
        { granted_via: 'trial', count: '8' },
      ];

      query.mockResolvedValue({ rows: mockCounts });

      const result = await repository.countByGrantedVia('org-1');

      expect(result).toEqual({
        tier: 50,
        addon: 15,
        trial: 8,
      });
    });
  });
});
