/**
 * Barbican Provider Unit Tests
 * 
 * Tests the Barbican secret management provider integration
 * Validates secret storage, retrieval, rotation, and error handling
 * 
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import axios from 'axios';
import BarbicanProvider from '../../../src/config/secrets/providers/BarbicanProvider.js';

// Mock axios
jest.mock('axios');

describe('BarbicanProvider', () => {
  let provider;
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset environment variables
    process.env.BARBICAN_ENDPOINT = 'http://localhost:9311';
    process.env.BARBICAN_PROJECT_ID = 'test-project';
    process.env.BARBICAN_API_KEY = 'test-api-key';

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    // Mock axios.create to return our mock instance
    axios.create.mockReturnValue(mockAxiosInstance);

    // Create provider instance
    provider = new BarbicanProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear cache between tests
    if (provider && provider.cache) {
      provider.cache.clear();
    }
  });

  describe('Constructor', () => {
    it('should initialize with environment variables', () => {
      expect(provider.endpoint).toBe('http://localhost:9311');
      expect(provider.projectId).toBe('test-project');
      expect(provider.apiKey).toBe('test-api-key');
    });

    it('should throw error if Barbican endpoint is missing', () => {
      delete process.env.BARBICAN_ENDPOINT;

      expect(() => new BarbicanProvider()).toThrow('BARBICAN_ENDPOINT is required');
    });

    it('should throw error if Barbican project ID is missing', () => {
      delete process.env.BARBICAN_PROJECT_ID;

      expect(() => new BarbicanProvider()).toThrow('BARBICAN_PROJECT_ID is required');
    });

    it('should use default cache TTL if not specified', () => {
      expect(provider.cacheTtl).toBe(300000); // 5 minutes in milliseconds
    });

    it('should use custom cache TTL from environment', () => {
      process.env.BARBICAN_CACHE_TTL = '60000';
      const customProvider = new BarbicanProvider();

      expect(customProvider.cacheTtl).toBe(60000);
    });
  });

  describe('getSecret', () => {
    const secretName = 'JWT_SECRET';
    const secretRef = 'http://localhost:9311/v1/secrets/secret-uuid';
    const secretValue = 'my-secret-value';

    beforeEach(() => {
      // Mock successful metadata retrieval
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          secrets: [
            {
              name: secretName,
              secret_ref: secretRef,
              status: 'ACTIVE',
              created: new Date().toISOString(),
            },
          ],
        },
      });

      // Mock successful secret payload retrieval
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: secretValue,
      });
    });

    it('should retrieve secret successfully', async () => {
      const result = await provider.getSecret(secretName);

      expect(result).toBe(secretValue);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should use cached secret on subsequent calls', async () => {
      // First call - fetches from Barbican
      const result1 = await provider.getSecret(secretName);
      expect(result1).toBe(secretValue);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

      // Reset mock call counts
      mockAxiosInstance.get.mockClear();

      // Second call - should use cache
      const result2 = await provider.getSecret(secretName);
      expect(result2).toBe(secretValue);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should throw error if secret not found', async () => {
      mockAxiosInstance.get.mockReset();
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { secrets: [] },
      });

      await expect(provider.getSecret('NONEXISTENT_SECRET'))
        .rejects
        .toThrow('Secret NONEXISTENT_SECRET not found in Barbican');
    });

    it('should throw error if secret is not active', async () => {
      mockAxiosInstance.get.mockReset();
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          secrets: [
            {
              name: secretName,
              secret_ref: secretRef,
              status: 'EXPIRED',
            },
          ],
        },
      });

      await expect(provider.getSecret(secretName))
        .rejects
        .toThrow(`Secret ${secretName} is not active (status: EXPIRED)`);
    });

    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.get.mockReset();
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.getSecret(secretName))
        .rejects
        .toThrow('Failed to retrieve secret JWT_SECRET: Network error');
    });
  });

  describe('setSecret', () => {
    const secretName = 'NEW_SECRET';
    const secretValue = 'new-secret-value';
    const secretRef = 'http://localhost:9311/v1/secrets/new-uuid';

    it('should store secret successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: secretRef },
      });

      const result = await provider.setSecret(secretName, secretValue);

      expect(result.secret_ref).toBe(secretRef);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/secrets',
        expect.objectContaining({
          name: secretName,
          payload: secretValue,
          payload_content_type: 'text/plain',
          payload_content_encoding: 'base64',
        })
      );
    });

    it('should store secret with custom options', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: secretRef },
      });

      const options = {
        algorithm: 'aes',
        bit_length: 256,
        mode: 'cbc',
      };

      await provider.setSecret(secretName, secretValue, options);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/secrets',
        expect.objectContaining({
          name: secretName,
          algorithm: 'aes',
          bit_length: 256,
          mode: 'cbc',
        })
      );
    });

    it('should invalidate cache after storing secret', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: secretRef },
      });

      await provider.setSecret(secretName, secretValue);

      // Verify cache was cleared for this secret
      const cacheKey = `secret_${secretName}`;
      expect(provider.cache.has(cacheKey)).toBe(false);
    });

    it('should handle storage errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(provider.setSecret(secretName, secretValue))
        .rejects
        .toThrow('Failed to store secret NEW_SECRET: Storage failed');
    });
  });

  describe('generateSecret', () => {
    const secretName = 'GENERATED_SECRET';
    const secretRef = 'http://localhost:9311/v1/secrets/generated-uuid';

    it('should generate symmetric secret successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: secretRef },
      });

      const result = await provider.generateSecret(secretName, {
        algorithm: 'aes',
        bit_length: 256,
        mode: 'cbc',
        secret_type: 'symmetric',
      });

      expect(result.secret_ref).toBe(secretRef);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/secrets',
        expect.objectContaining({
          name: secretName,
          algorithm: 'aes',
          bit_length: 256,
          mode: 'cbc',
          secret_type: 'symmetric',
        })
      );
    });

    it('should use default generation options if not provided', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: secretRef },
      });

      await provider.generateSecret(secretName);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/secrets',
        expect.objectContaining({
          algorithm: 'aes',
          bit_length: 256,
          mode: 'cbc',
          secret_type: 'symmetric',
        })
      );
    });

    it('should handle generation errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Generation failed'));

      await expect(provider.generateSecret(secretName))
        .rejects
        .toThrow('Failed to generate secret GENERATED_SECRET: Generation failed');
    });
  });

  describe('deleteSecret', () => {
    const secretName = 'DELETE_ME';
    const secretRef = 'http://localhost:9311/v1/secrets/delete-uuid';

    beforeEach(() => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          secrets: [
            {
              name: secretName,
              secret_ref: secretRef,
              status: 'ACTIVE',
            },
          ],
        },
      });
    });

    it('should delete secret successfully', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      await provider.deleteSecret(secretName);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(secretRef);
    });

    it('should invalidate cache after deletion', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      // Add to cache first
      provider.cache.set(`secret_${secretName}`, 'cached-value', 300000);

      await provider.deleteSecret(secretName);

      expect(provider.cache.has(`secret_${secretName}`)).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockAxiosInstance.delete.mockRejectedValueOnce(new Error('Deletion failed'));

      await expect(provider.deleteSecret(secretName))
        .rejects
        .toThrow('Failed to delete secret DELETE_ME: Deletion failed');
    });
  });

  describe('rotateSecret', () => {
    const secretName = 'ROTATE_ME';
    const secretRef = 'http://localhost:9311/v1/secrets/rotate-uuid';
    const newSecretRef = 'http://localhost:9311/v1/secrets/new-rotate-uuid';

    beforeEach(() => {
      // Mock getting existing secret
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          secrets: [
            {
              name: secretName,
              secret_ref: secretRef,
              status: 'ACTIVE',
            },
          ],
        },
      });
    });

    it('should rotate secret successfully', async () => {
      // Mock deletion
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      // Mock creation of new secret
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: newSecretRef },
      });

      const result = await provider.rotateSecret(secretName);

      expect(result.secret_ref).toBe(newSecretRef);
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(secretRef);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/secrets',
        expect.objectContaining({ name: secretName })
      );
    });

    it('should invalidate cache after rotation', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { secret_ref: newSecretRef },
      });

      // Add to cache first
      provider.cache.set(`secret_${secretName}`, 'old-value', 300000);

      await provider.rotateSecret(secretName);

      expect(provider.cache.has(`secret_${secretName}`)).toBe(false);
    });

    it('should handle rotation errors', async () => {
      mockAxiosInstance.delete.mockRejectedValueOnce(new Error('Rotation failed'));

      await expect(provider.rotateSecret(secretName))
        .rejects
        .toThrow('Failed to rotate secret ROTATE_ME: Rotation failed');
    });
  });

  describe('listSecrets', () => {
    it('should list all secrets', async () => {
      const mockSecrets = [
        {
          name: 'SECRET_1',
          secret_ref: 'http://localhost:9311/v1/secrets/uuid-1',
          status: 'ACTIVE',
          created: '2025-01-01T00:00:00Z',
        },
        {
          name: 'SECRET_2',
          secret_ref: 'http://localhost:9311/v1/secrets/uuid-2',
          status: 'ACTIVE',
          created: '2025-01-02T00:00:00Z',
        },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { secrets: mockSecrets },
      });

      const result = await provider.listSecrets();

      expect(result).toEqual(mockSecrets);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/secrets');
    });

    it('should handle empty secret list', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { secrets: [] },
      });

      const result = await provider.listSecrets();

      expect(result).toEqual([]);
    });

    it('should handle list errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('List failed'));

      await expect(provider.listSecrets())
        .rejects
        .toThrow('Failed to list secrets: List failed');
    });
  });

  describe('Cache Management', () => {
    it('should respect cache TTL', async () => {
      // Create provider with short TTL for testing
      process.env.BARBICAN_CACHE_TTL = '100'; // 100ms
      const shortTtlProvider = new BarbicanProvider();

      const secretName = 'TTL_TEST';
      const secretRef = 'http://localhost:9311/v1/secrets/ttl-uuid';

      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            secrets: [{ name: secretName, secret_ref: secretRef, status: 'ACTIVE' }],
          },
        })
        .mockResolvedValueOnce({ data: 'first-value' });

      // First call
      await shortTtlProvider.getSecret(secretName);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);

      mockAxiosInstance.get.mockClear();

      // Immediate second call - should use cache
      await shortTtlProvider.getSecret(secretName);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mock new responses
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: {
            secrets: [{ name: secretName, secret_ref: secretRef, status: 'ACTIVE' }],
          },
        })
        .mockResolvedValueOnce({ data: 'second-value' });

      // Third call after TTL - should fetch again
      await shortTtlProvider.getSecret(secretName);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
