import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import IntegrationService from '../../../../../src/products/schedulehub/services/integrationService.js';
import IntegrationRepository from '../../../../../src/products/schedulehub/repositories/IntegrationRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';

describe('IntegrationService', () => {
  let service;
  let mockRepository;

  // Helper function to generate DB format data (snake_case)
  const createDbIntegration = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    integration_name: 'Test Integration',
    integration_type: 'api',
    configuration: { api_key: 'test-key', endpoint: 'https://api.example.com' },
    is_active: true,
    last_sync_at: new Date('2025-01-01T12:00:00Z'),
    sync_status: 'success',
    created_at: new Date('2025-01-01T10:00:00Z'),
    updated_at: new Date('2025-01-01T10:00:00Z'),
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByType: jest.fn(),
      updateSyncStatus: jest.fn()
    };
    service = new IntegrationService(mockRepository);
  });

  describe('create', () => {
    it('should create integration with valid data', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const validData = {
        integrationName: 'Test Integration',
        integrationType: 'api',
        configuration: { api_key: 'test-key' }
      };

      const dbIntegration = createDbIntegration({
        integration_name: validData.integrationName,
        integration_type: validData.integrationType,
        configuration: validData.configuration
      });
      mockRepository.create.mockResolvedValue(dbIntegration);

      const result = await service.create(validData, orgId, userId);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          integration_name: validData.integrationName,
          integration_type: validData.integrationType,
          configuration: validData.configuration,
          organization_id: orgId
        }),
        orgId,
        userId
      );
      expect(result).toBeDefined();
      expect(result.integrationName).toBe(validData.integrationName);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {};

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid integration type', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        integrationName: 'Test',
        integrationType: 'invalid',
        configuration: {}
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should return integration when found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbIntegration = createDbIntegration();

      mockRepository.findById.mockResolvedValue(dbIntegration);

      const result = await service.getById(integrationId, orgId);

      expect(mockRepository.findById).toHaveBeenCalledWith(integrationId, orgId);
      expect(result).toBeDefined();
      expect(result.integrationName).toBe(dbIntegration.integration_name);
    });

    it('should throw NotFoundError when integration not found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById(integrationId, orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update integration with valid data', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        integrationName: 'Updated Integration'
      };

      const existingIntegration = createDbIntegration();
      const updatedIntegration = { ...existingIntegration, integration_name: updateData.integrationName };

      mockRepository.findById.mockResolvedValue(existingIntegration);
      mockRepository.update.mockResolvedValue(updatedIntegration);

      const result = await service.update(integrationId, updateData, orgId, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        integrationId,
        expect.objectContaining({
          integration_name: updateData.integrationName
        }),
        orgId,
        userId
      );
      expect(result.integrationName).toBe(updateData.integrationName);
    });

    it('should throw NotFoundError when integration not found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(integrationId, {}, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return all integrations for organization', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbIntegrations = [
        createDbIntegration({ integration_name: 'Integration 1' }),
        createDbIntegration({ integration_name: 'Integration 2' })
      ];

      mockRepository.findAll.mockResolvedValue(dbIntegrations);

      const result = await service.list(orgId);

      expect(mockRepository.findAll).toHaveBeenCalledWith(orgId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].integrationName).toBe('Integration 1');
      expect(result[1].integrationName).toBe('Integration 2');
    });

    it('should return empty array when no integrations found', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.list(orgId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete integration when found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const existingIntegration = createDbIntegration();

      mockRepository.findById.mockResolvedValue(existingIntegration);
      mockRepository.delete.mockResolvedValue();

      await service.delete(integrationId, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(integrationId, orgId);
      expect(mockRepository.delete).toHaveBeenCalledWith(integrationId, orgId, userId);
    });

    it('should throw NotFoundError when integration not found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete(integrationId, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getByType', () => {
    it('should return integrations of specific type', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const integrationType = 'api';
      const dbIntegrations = [
        createDbIntegration({ integration_type: integrationType })
      ];

      mockRepository.findByType.mockResolvedValue(dbIntegrations);

      const result = await service.getByType(integrationType, orgId);

      expect(mockRepository.findByType).toHaveBeenCalledWith(integrationType, orgId);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].integrationType).toBe(integrationType);
    });
  });

  describe('updateSyncStatus', () => {
    it('should update sync status', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const status = 'success';
      const lastSyncAt = new Date();
      const existingIntegration = createDbIntegration();

      mockRepository.findById.mockResolvedValue(existingIntegration);
      mockRepository.updateSyncStatus.mockResolvedValue();

      await service.updateSyncStatus(integrationId, status, lastSyncAt, orgId);

      expect(mockRepository.updateSyncStatus).toHaveBeenCalledWith(
        integrationId,
        status,
        lastSyncAt,
        orgId
      );
    });

    it('should throw NotFoundError when integration not found', async () => {
      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateSyncStatus(integrationId, 'success', new Date(), orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});