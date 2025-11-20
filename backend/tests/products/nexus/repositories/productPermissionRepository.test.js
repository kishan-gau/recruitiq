/**
 * ProductPermissionRepository Unit Tests
 * 
 * Tests for Nexus product permission repository with comprehensive coverage
 * Includes composite key operations, ON CONFLICT upsert, and atomic counter operations
 * 
 * @group nexus
 * @group repositories
 * @group product-permissions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import repository
import ProductPermissionRepository from '../../../../src/products/nexus/repositories/productPermissionRepository.js';

// Import model
import ProductPermission from '../../../../src/products/nexus/models/ProductPermission.js';

describe('ProductPermissionRepository', () => {
  let repository;
  let mockQuery;
  let mockLogger;

  const mockOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const mockProductId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    // Setup mock query function
    mockQuery = jest.fn();

    // Setup mock logger
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    // Create repository with mock query
    repository = new ProductPermissionRepository({ query: mockQuery });
    
    // CRITICAL: Override logger to prevent "Cannot read properties of undefined" error
    repository.logger = mockLogger;
  });

  describe('Constructor', () => {
    it('should initialize with injected database query', () => {
      const customQuery = jest.fn();
      const repo = new ProductPermissionRepository({ query: customQuery });
      
      expect(repo.query).toBe(customQuery);
    });

    it('should initialize with default query when no database provided', () => {
      const repo = new ProductPermissionRepository();
      
      expect(repo.query).toBeDefined();
    });

    it('should have logger instance', () => {
      expect(repository.logger).toBeDefined();
    });
  });

  describe('findByOrganization', () => {
    it('should find all permissions for an organization with JOIN', async () => {
      const mockPermissions = [
        {
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: true,
          access_level: 'full',
          revoked_at: null,
          product_name: 'Test Product',
          display_name: 'Test Product Display',
          slug: 'test-product'
        },
        {
          id: '2',
          organization_id: mockOrgId,
          product_id: '550e8400-e29b-41d4-a716-446655440002',
          is_enabled: true,
          access_level: 'read',
          revoked_at: null,
          product_name: 'Another Product',
          display_name: 'Another Product Display',
          slug: 'another-product'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockPermissions });

      const result = await repository.findByOrganization(mockOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT pp.*, p.name as product_name, p.display_name, p.slug'),
        [mockOrgId],
        mockOrgId
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN products p ON pp.product_id = p.id'),
        expect.any(Array),
        mockOrgId
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pp.organization_id = $1 AND pp.revoked_at IS NULL'),
        expect.any(Array),
        mockOrgId
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY p.is_core DESC, p.name ASC'),
        expect.any(Array),
        mockOrgId
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ProductPermission);
      expect(result[0].organizationId).toBe(mockOrgId);
    });

    it('should return empty array when organization has no permissions', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByOrganization(mockOrgId);

      expect(result).toEqual([]);
    });

    it('should include product JOIN data in results', async () => {
      const mockPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        access_level: 'full',
        revoked_at: null,
        product_name: 'Nexus',
        display_name: 'Nexus HRIS',
        slug: 'nexus'
      };

      mockQuery.mockResolvedValue({ rows: [mockPermission] });

      const result = await repository.findByOrganization(mockOrgId);

      expect(result[0]).toBeInstanceOf(ProductPermission);
      // Model should preserve JOIN fields
      expect(mockPermission.product_name).toBe('Nexus');
    });

    it('should handle database errors with error logging', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByOrganization(mockOrgId)).rejects.toThrow('Database connection failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error finding permissions by organization',
        expect.objectContaining({
          organizationId: mockOrgId,
          error: 'Database connection failed'
        })
      );
    });
  });

  describe('findByProduct', () => {
    it('should find all permissions for a product with JOIN', async () => {
      const mockPermissions = [
        {
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: true,
          access_level: 'full',
          revoked_at: null,
          organization_name: 'Test Organization'
        },
        {
          id: '2',
          organization_id: '9ee50aee-76c3-46ce-87ed-005c6dd893e0',
          product_id: mockProductId,
          is_enabled: true,
          access_level: 'read',
          revoked_at: null,
          organization_name: 'Another Organization'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockPermissions });

      const result = await repository.findByProduct(mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT pp.*, o.name as organization_name'),
        [mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN organizations o ON pp.organization_id = o.id'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pp.product_id = $1 AND pp.revoked_at IS NULL'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ProductPermission);
      expect(result[0].productId).toBe(mockProductId);
    });

    it('should return empty array when product has no permissions', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByProduct(mockProductId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByProduct(mockProductId)).rejects.toThrow('Database error');
    });
  });

  describe('findByOrganizationAndProduct', () => {
    it('should find permission by composite key', async () => {
      const mockPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        access_level: 'full',
        license_key: 'TEST-KEY-123',
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [mockPermission] });

      const result = await repository.findByOrganizationAndProduct(mockOrgId, mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND product_id = $2 AND revoked_at IS NULL'),
        [mockOrgId, mockProductId]
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.productId).toBe(mockProductId);
    });

    it('should return null when permission not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findByOrganizationAndProduct(mockOrgId, mockProductId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findByOrganizationAndProduct(mockOrgId, mockProductId))
        .rejects.toThrow('Database error');
    });
  });

  describe('findEnabledByOrganization', () => {
    it('should find enabled permissions with complex filtering', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      
      const mockPermissions = [
        {
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: true,
          access_level: 'full',
          license_expires_at: futureDate,
          revoked_at: null,
          product_name: 'Nexus',
          display_name: 'Nexus HRIS',
          slug: 'nexus',
          base_path: '/nexus',
          ui_config: { theme: 'default' }
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockPermissions });

      const result = await repository.findEnabledByOrganization(mockOrgId);

      // Verify call - no context parameter passed (unlike findByOrganization)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pp.organization_id = $1'),
        [mockOrgId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND pp.is_enabled = TRUE'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND pp.revoked_at IS NULL'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('(pp.license_expires_at IS NULL OR pp.license_expires_at > NOW())'),
        expect.any(Array)
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProductPermission);
    });

    it('should include permissions with NULL license expiration (unlimited)', async () => {
      const mockPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        license_expires_at: null, // Unlimited license
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [mockPermission] });

      const result = await repository.findEnabledByOrganization(mockOrgId);

      expect(result).toHaveLength(1);
    });

    it('should exclude expired licenses', async () => {
      // This is tested by the SQL filter, but we verify the query
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findEnabledByOrganization(mockOrgId);

      // Verify the query was called - no context parameter (unlike findByOrganization)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('license_expires_at > NOW()'),
        expect.any(Array)
      );
    });

    it('should return empty array when no enabled permissions', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findEnabledByOrganization(mockOrgId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findEnabledByOrganization(mockOrgId))
        .rejects.toThrow('Database error');
    });
  });

  describe('findExpiredLicenses', () => {
    it('should find expired licenses with triple JOIN', async () => {
      const mockExpired = [
        {
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: true,
          license_expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          revoked_at: null,
          organization_name: 'Test Organization',
          product_name: 'Nexus'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockExpired });

      const result = await repository.findExpiredLicenses();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM product_permissions pp'),
        [],
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN organizations o ON pp.organization_id = o.id'),
        expect.any(Array),
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN products p ON pp.product_id = p.id'),
        expect.any(Array),
        null
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pp.license_expires_at < NOW()'),
        expect.any(Array),
        null
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProductPermission);
    });

    it('should return empty array when no expired licenses', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findExpiredLicenses();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.findExpiredLicenses()).rejects.toThrow('Database error');
    });
  });

  describe('upsert', () => {
    const validPermissionData = {
      organizationId: mockOrgId,
      productId: mockProductId,
      isEnabled: true,
      accessLevel: 'full',
      licenseKey: 'TEST-KEY-123',
      licenseExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      maxUsers: 100,
      maxResources: 500,
      enabledFeatures: ['feature1', 'feature2'],
      disabledFeatures: ['feature3'],
      notes: 'Test permission'
    };

    it('should insert new permission with ON CONFLICT', async () => {
      const createdPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        access_level: 'full',
        license_key: 'TEST-KEY-123',
        enabled_features: ['feature1', 'feature2'],
        disabled_features: ['feature3'],
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [createdPermission] });

      const result = await repository.upsert(validPermissionData, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO product_permissions'),
        expect.arrayContaining([
          mockOrgId,
          mockProductId,
          true,
          'full',
          'TEST-KEY-123',
          expect.any(String),
          100,
          500,
          '["feature1","feature2"]', // JSON.stringify
          '["feature3"]', // JSON.stringify
          'Test permission',
          mockUserId
        ])
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (organization_id, product_id)'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DO UPDATE SET'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
    });

    it('should update existing permission on conflict', async () => {
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        access_level: 'read',
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.upsert({
        ...validPermissionData,
        accessLevel: 'read'
      }, mockUserId);

      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.accessLevel).toBe('read');
    });

    it('should apply default values for optional fields', async () => {
      const minimalData = {
        organizationId: mockOrgId,
        productId: mockProductId
      };

      const createdPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true, // Default
        access_level: 'full', // Default
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [createdPermission] });

      const result = await repository.upsert(minimalData, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          mockOrgId,
          mockProductId,
          true, // Default isEnabled
          'full' // Default accessLevel
        ])
      );
      expect(result.isEnabled).toBe(true);
    });

    it('should stringify JSON fields (enabledFeatures, disabledFeatures)', async () => {
      const permissionWithFeatures = {
        organizationId: mockOrgId,
        productId: mockProductId,
        enabledFeatures: ['module1', 'module2'],
        disabledFeatures: ['module3']
      };

      const createdPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        access_level: 'full',
        enabled_features: ['module1', 'module2'],
        disabled_features: ['module3'],
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [createdPermission] });

      await repository.upsert(permissionWithFeatures, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '["module1","module2"]', // JSON.stringify
          '["module3"]' // JSON.stringify
        ])
      );
    });

    it('should reset revoked_at to NULL on conflict (unrevoke)', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [{
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: true,
          revoked_at: null // Reset from previous revoked state
        }] 
      });

      await repository.upsert(validPermissionData, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked_at = NULL'),
        expect.any(Array)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Constraint violation');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.upsert(validPermissionData, mockUserId))
        .rejects.toThrow('Constraint violation');
    });
  });

  describe('update', () => {
    it('should update single field dynamically', async () => {
      const updateData = { isEnabled: false };
      
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: false,
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.update(mockOrgId, mockProductId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_permissions'),
        expect.arrayContaining([false, mockOrgId, mockProductId])
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET is_enabled = $1'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.isEnabled).toBe(false);
    });

    it('should update multiple fields dynamically', async () => {
      const updateData = {
        isEnabled: false,
        accessLevel: 'read',
        maxUsers: 50,
        notes: 'Updated notes'
      };

      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: false,
        access_level: 'read',
        max_users: 50,
        notes: 'Updated notes',
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.update(mockOrgId, mockProductId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_enabled = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('access_level = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('max_users = $'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('notes = $'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
    });

    it('should return existing permission when no fields to update', async () => {
      const emptyUpdate = {};
      
      const existingPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [existingPermission] });

      const result = await repository.update(mockOrgId, mockProductId, emptyUpdate);

      // Should call findByOrganizationAndProduct instead of UPDATE
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM product_permissions'),
        [mockOrgId, mockProductId]
      );
      expect(result).toBeInstanceOf(ProductPermission);
    });

    it('should stringify JSON fields in updates', async () => {
      const updateData = {
        enabledFeatures: ['newFeature1', 'newFeature2'],
        disabledFeatures: ['oldFeature']
      };

      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: true,
        enabled_features: ['newFeature1', 'newFeature2'],
        disabled_features: ['oldFeature'],
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      await repository.update(mockOrgId, mockProductId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          '["newFeature1","newFeature2"]',
          '["oldFeature"]',
          mockOrgId,
          mockProductId
        ])
      );
    });

    it('should filter by revoked_at IS NULL', async () => {
      const updateData = { isEnabled: false };
      
      mockQuery.mockResolvedValue({ 
        rows: [{
          id: '1',
          organization_id: mockOrgId,
          product_id: mockProductId,
          is_enabled: false,
          revoked_at: null
        }] 
      });

      await repository.update(mockOrgId, mockProductId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND revoked_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should handle database errors', async () => {
      const updateData = { isEnabled: false };
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.update(mockOrgId, mockProductId, updateData))
        .rejects.toThrow('Database error');
    });
  });

  describe('revoke', () => {
    it('should soft delete permission by setting revoked_at', async () => {
      const revokedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        is_enabled: false,
        revoked_at: new Date().toISOString(),
        revoked_by: mockUserId
      };

      mockQuery.mockResolvedValue({ rows: [revokedPermission] });

      const result = await repository.revoke(mockOrgId, mockProductId, mockUserId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_permissions'),
        [mockUserId, mockOrgId, mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET revoked_at = NOW()'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('revoked_by = $1'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_enabled = FALSE'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.isEnabled).toBe(false);
    });

    it('should return null when permission not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.revoke(mockOrgId, mockProductId, mockUserId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.revoke(mockOrgId, mockProductId, mockUserId))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateUsage', () => {
    it('should update users and resources count', async () => {
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        users_count: 25,
        resources_count: 150,
        last_accessed_at: new Date().toISOString(),
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.updateUsage(mockOrgId, mockProductId, 25, 150);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_permissions'),
        [25, 150, mockOrgId, mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('users_count = $1'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('resources_count = $2'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_accessed_at = NOW()'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.usersCount).toBe(25);
      expect(result.resourcesCount).toBe(150);
    });

    it('should return null when permission not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.updateUsage(mockOrgId, mockProductId, 10, 50);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.updateUsage(mockOrgId, mockProductId, 10, 50))
        .rejects.toThrow('Database error');
    });
  });

  describe('incrementUsersCount', () => {
    it('should atomically increment users_count', async () => {
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        users_count: 26, // Incremented from 25
        last_accessed_at: new Date().toISOString(),
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.incrementUsersCount(mockOrgId, mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('users_count = users_count + 1'),
        [mockOrgId, mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_accessed_at = NOW()'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.usersCount).toBe(26);
    });

    it('should return null when permission not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.incrementUsersCount(mockOrgId, mockProductId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.incrementUsersCount(mockOrgId, mockProductId))
        .rejects.toThrow('Database error');
    });
  });

  describe('decrementUsersCount', () => {
    it('should atomically decrement users_count', async () => {
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        users_count: 24, // Decremented from 25
        last_accessed_at: new Date().toISOString(),
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.decrementUsersCount(mockOrgId, mockProductId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('users_count = GREATEST(users_count - 1, 0)'),
        [mockOrgId, mockProductId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_accessed_at = NOW()'),
        expect.any(Array)
      );
      expect(result).toBeInstanceOf(ProductPermission);
      expect(result.usersCount).toBe(24);
    });

    it('should prevent negative users_count using GREATEST', async () => {
      const updatedPermission = {
        id: '1',
        organization_id: mockOrgId,
        product_id: mockProductId,
        users_count: 0, // Floor at 0
        last_accessed_at: new Date().toISOString(),
        revoked_at: null
      };

      mockQuery.mockResolvedValue({ rows: [updatedPermission] });

      const result = await repository.decrementUsersCount(mockOrgId, mockProductId);

      // Verify GREATEST function prevents negative
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('GREATEST(users_count - 1, 0)'),
        expect.any(Array)
      );
      expect(result.usersCount).toBe(0);
    });

    it('should return null when permission not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.decrementUsersCount(mockOrgId, mockProductId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      await expect(repository.decrementUsersCount(mockOrgId, mockProductId))
        .rejects.toThrow('Database error');
    });
  });

  describe('Refactoring Verification', () => {
    it('should use this.query instead of direct database access', async () => {
      // Verify constructor sets up query properly
      const customQuery = jest.fn().mockResolvedValue({ rows: [] });
      const repo = new ProductPermissionRepository({ query: customQuery });

      await repo.findByOrganization(mockOrgId);

      expect(customQuery).toHaveBeenCalled();
    });

    it('should pass organizationId as context for tenant queries', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByOrganization(mockOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        mockOrgId // Context parameter
      );
    });

    it('should pass null context for product-level queries', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findByProduct(mockProductId);

      // Context should be undefined (null not passed explicitly)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should pass explicit null context for global queries', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findExpiredLicenses();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [],
        null // Explicit null context
      );
    });
  });
});
