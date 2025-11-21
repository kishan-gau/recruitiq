/**
 * Barbican Provider Unit Tests
 * Tests for OpenStack Barbican secrets integration
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock axios before importing BarbicanProvider
jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

// Import after mocking
const { default: axios } = await import('axios');
const { default: BarbicanProvider } = await import('../../../../src/config/providers/barbicanProvider.js');

describe('BarbicanProvider', () => {
  let barbicanProvider;
  const mockConfig = {
    endpoint: 'https://barbican.test.com:9311',
    authEndpoint: 'https://keystone.test.com:5000/v3',
    username: 'test-user',
    password: 'test-password',
    projectName: 'test-project',
    projectDomain: 'default',
    userDomain: 'default',
    cacheTTL: 60000, // 1 minute for testing
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create fresh instance
    barbicanProvider = new BarbicanProvider(mockConfig);
  });

  describe('Configuration Validation', () => {
    it('should initialize with valid configuration', () => {
      expect(barbicanProvider.config.endpoint).toBe(mockConfig.endpoint);
      expect(barbicanProvider.config.username).toBe(mockConfig.username);
      expect(barbicanProvider.cache).toBeInstanceOf(Map);
    });

    it('should throw error if endpoint is missing', () => {
      const invalidConfig = { ...mockConfig, endpoint: null };
      
      expect(() => new BarbicanProvider(invalidConfig)).toThrow(
        /Barbican configuration incomplete/
      );
    });

    it('should throw error if authEndpoint is missing', () => {
      const invalidConfig = { ...mockConfig, authEndpoint: null };
      
      expect(() => new BarbicanProvider(invalidConfig)).toThrow(
        /Missing: authEndpoint/
      );
    });

    it('should use default cache TTL if not provided', () => {
      const configWithoutTTL = { ...mockConfig };
      delete configWithoutTTL.cacheTTL;
      
      const provider = new BarbicanProvider(configWithoutTTL);
      
      expect(provider.config.cacheTTL).toBe(3600000); // 1 hour default
    });
  });

  describe('Authentication', () => {
    const mockAuthResponse = {
      headers: {
        'x-subject-token': 'test-token-123',
      },
      data: {
        token: {
          expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        },
      },
    };

    it('should authenticate successfully with Keystone', async () => {
      axios.post.mockResolvedValue(mockAuthResponse);

      const token = await barbicanProvider.authenticate();

      expect(token).toBe('test-token-123');
      expect(axios.post).toHaveBeenCalledWith(
        `${mockConfig.authEndpoint}/auth/tokens`,
        expect.objectContaining({
          auth: expect.objectContaining({
            identity: expect.any(Object),
            scope: expect.any(Object),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should cache authentication token', async () => {
      axios.post.mockResolvedValue(mockAuthResponse);

      // First call - should authenticate
      await barbicanProvider.authenticate();
      expect(axios.post).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      await barbicanProvider.authenticate();
      expect(axios.post).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should re-authenticate when token expires', async () => {
      const expiredTokenResponse = {
        headers: {
          'x-subject-token': 'expired-token',
        },
        data: {
          token: {
            expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
          },
        },
      };

      axios.post.mockResolvedValueOnce(expiredTokenResponse);
      axios.post.mockResolvedValueOnce(mockAuthResponse);

      // First call - gets expired token
      await barbicanProvider.authenticate();
      
      // Second call - should re-authenticate
      await barbicanProvider.authenticate();
      
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('should throw error on authentication failure', async () => {
      axios.post.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(barbicanProvider.authenticate()).rejects.toThrow(
        /Barbican authentication failed/
      );
    });
  });

  describe('Secret Retrieval', () => {
    const mockAuthResponse = {
      headers: { 'x-subject-token': 'test-token' },
      data: {
        token: {
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const mockSecretListResponse = {
      data: {
        secrets: [
          {
            secret_ref: 'https://barbican.test.com:9311/secrets/secret-uuid-123',
          },
        ],
      },
    };

    const mockSecretPayloadResponse = {
      data: 'Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO=', // Secret value
    };

    beforeEach(() => {
      axios.post.mockResolvedValue(mockAuthResponse);
    });

    it('should retrieve secret by name', async () => {
      axios.get.mockResolvedValueOnce(mockSecretListResponse); // Search by name
      axios.get.mockResolvedValueOnce(mockSecretPayloadResponse); // Get payload

      const secretValue = await barbicanProvider.getSecret('JWT_SECRET');

      expect(secretValue).toBe('Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO=');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/secrets'),
        expect.objectContaining({
          params: expect.objectContaining({ name: 'JWT_SECRET' }),
        })
      );
    });

    it('should retrieve secret by UUID', async () => {
      const secretUUID = 'secret-uuid-123';
      axios.get.mockResolvedValue(mockSecretPayloadResponse);

      const secretValue = await barbicanProvider.getSecret(secretUUID);

      expect(secretValue).toBe('Xk7p2m9vN3wR8sT1qF5hJ6gK4lY0dC3bZ9aW7eU2iO=');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(secretUUID),
        expect.any(Object)
      );
    });

    it('should cache retrieved secrets', async () => {
      axios.get.mockResolvedValueOnce(mockSecretListResponse);
      axios.get.mockResolvedValueOnce(mockSecretPayloadResponse);

      // First call - retrieves from Barbican
      await barbicanProvider.getSecret('JWT_SECRET');
      const callCount1 = axios.get.mock.calls.length;

      // Second call - uses cache
      await barbicanProvider.getSecret('JWT_SECRET');
      const callCount2 = axios.get.mock.calls.length;

      expect(callCount2).toBe(callCount1); // No additional API calls
    });

    it('should refresh cache when requested', async () => {
      axios.get.mockResolvedValue(mockSecretListResponse);
      axios.get.mockResolvedValue(mockSecretPayloadResponse);

      // First call
      await barbicanProvider.getSecret('JWT_SECRET');
      const callCount1 = axios.get.mock.calls.length;

      // Second call with refresh
      await barbicanProvider.getSecret('JWT_SECRET', { refresh: true });
      const callCount2 = axios.get.mock.calls.length;

      expect(callCount2).toBeGreaterThan(callCount1); // Made new API calls
    });

    it('should throw error if secret not found', async () => {
      axios.get.mockResolvedValue({ data: { secrets: [] } }); // Empty result

      await expect(barbicanProvider.getSecret('NONEXISTENT_SECRET')).rejects.toThrow(
        /Secret not found/
      );
    });
  });

  describe('Secret Storage', () => {
    const mockAuthResponse = {
      headers: { 'x-subject-token': 'test-token' },
      data: {
        token: {
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const mockStoreResponse = {
      data: {
        secret_ref: 'https://barbican.test.com:9311/secrets/new-secret-uuid',
      },
    };

    beforeEach(() => {
      axios.post.mockResolvedValue(mockAuthResponse);
    });

    it('should store a new secret', async () => {
      axios.post.mockResolvedValueOnce(mockAuthResponse); // Auth
      axios.post.mockResolvedValueOnce(mockStoreResponse); // Store

      const secretRef = await barbicanProvider.storeSecret(
        'NEW_SECRET',
        'secret-value-123'
      );

      expect(secretRef).toBe('https://barbican.test.com:9311/secrets/new-secret-uuid');
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/secrets'),
        expect.objectContaining({
          name: 'NEW_SECRET',
          payload: 'secret-value-123',
        }),
        expect.any(Object)
      );
    });

    it('should store secret with custom options', async () => {
      axios.post.mockResolvedValueOnce(mockAuthResponse);
      axios.post.mockResolvedValueOnce(mockStoreResponse);

      await barbicanProvider.storeSecret('CUSTOM_SECRET', 'value', {
        algorithm: 'rsa',
        bitLength: 2048,
        expiration: '2025-12-31T23:59:59Z',
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          algorithm: 'rsa',
          bit_length: 2048,
          expiration: '2025-12-31T23:59:59Z',
        }),
        expect.any(Object)
      );
    });

    it('should clear cache after storing secret', async () => {
      axios.post.mockResolvedValueOnce(mockAuthResponse);
      axios.post.mockResolvedValueOnce(mockStoreResponse);

      // Add to cache first
      barbicanProvider.cacheSecret('JWT_SECRET', 'old-value');
      expect(barbicanProvider.getCachedSecret('JWT_SECRET')).toBe('old-value');

      // Store new value
      await barbicanProvider.storeSecret('JWT_SECRET', 'new-value');

      // Cache should be cleared
      expect(barbicanProvider.getCachedSecret('JWT_SECRET')).toBeNull();
    });
  });

  describe('Secret Rotation', () => {
    const mockAuthResponse = {
      headers: { 'x-subject-token': 'test-token' },
      data: {
        token: {
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    const mockStoreResponse = {
      data: {
        secret_ref: 'https://barbican.test.com:9311/secrets/rotated-uuid',
      },
    };

    beforeEach(() => {
      axios.post.mockResolvedValue(mockAuthResponse);
      axios.delete.mockResolvedValue({});
      axios.post.mockResolvedValue(mockStoreResponse);
    });

    it('should rotate a secret (delete + store)', async () => {
      const mockSecretRef = 'https://barbican.test.com:9311/secrets/old-uuid';
      axios.get.mockResolvedValue({
        data: { secrets: [{ secret_ref: mockSecretRef }] },
      });

      const newSecretRef = await barbicanProvider.rotateSecret(
        'JWT_SECRET',
        'new-secret-value'
      );

      expect(axios.delete).toHaveBeenCalledWith(
        mockSecretRef,
        expect.any(Object)
      );
      expect(newSecretRef).toContain('/secrets/');
    });
  });

  describe('Cache Management', () => {
    it('should cache secrets with TTL', () => {
      barbicanProvider.cacheSecret('TEST_SECRET', 'test-value');

      const cached = barbicanProvider.getCachedSecret('TEST_SECRET');
      expect(cached).toBe('test-value');
    });

    it('should return null for expired cache entries', () => {
      // Create provider with very short TTL
      const shortTTLProvider = new BarbicanProvider({
        ...mockConfig,
        cacheTTL: 1, // 1ms
      });

      shortTTLProvider.cacheSecret('TEST_SECRET', 'test-value');

      // Wait for cache to expire
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        const cached = shortTTLProvider.getCachedSecret('TEST_SECRET');
        expect(cached).toBeNull();
      });
    });

    it('should clear all cached secrets', () => {
      barbicanProvider.cacheSecret('SECRET_1', 'value1');
      barbicanProvider.cacheSecret('SECRET_2', 'value2');

      expect(barbicanProvider.cache.size).toBe(2);

      barbicanProvider.clearCache();

      expect(barbicanProvider.cache.size).toBe(0);
    });
  });

  describe('Health Check', () => {
    const mockAuthResponse = {
      headers: { 'x-subject-token': 'test-token' },
      data: {
        token: {
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };

    it('should return healthy status when connected', async () => {
      axios.post.mockResolvedValue(mockAuthResponse);
      axios.get.mockResolvedValue({ data: { secrets: [] } });

      const health = await barbicanProvider.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.provider).toBe('barbican');
      expect(health.authenticated).toBe(true);
    });

    it('should return unhealthy status on connection failure', async () => {
      axios.post.mockRejectedValue(new Error('Connection refused'));

      const health = await barbicanProvider.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBeDefined();
    });
  });

  describe('UUID Validation', () => {
    it('should identify valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach(uuid => {
        expect(barbicanProvider.isUUID(uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'JWT_SECRET',
        '',
      ];

      invalidUUIDs.forEach(uuid => {
        expect(barbicanProvider.isUUID(uuid)).toBe(false);
      });
    });
  });
});
