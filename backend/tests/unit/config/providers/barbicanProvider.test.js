import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import BarbicanProvider from '../../../../src/config/providers/barbicanProvider.js';

// Mock axios
jest.mock('axios');

describe('BarbicanProvider', () => {
  let provider;
  let mockConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      authEndpoint: 'https://keystone.example.com/v3',
      endpoint: 'https://barbican.example.com/v1',
      projectId: 'test-project-123',
      username: 'test-user',
      password: 'test-password',
      userDomainName: 'Default',
      projectDomainName: 'Default',
    };

    provider = new BarbicanProvider(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(provider.config).toEqual(mockConfig);
      expect(provider.authToken).toBeNull();
      expect(provider.tokenExpiry).toBeNull();
      expect(provider.cache).toEqual({});
    });

    it('should throw error with missing authEndpoint', () => {
      expect(() => new BarbicanProvider({ ...mockConfig, authEndpoint: '' }))
        .toThrow('Barbican authEndpoint is required');
    });

    it('should throw error with missing endpoint', () => {
      expect(() => new BarbicanProvider({ ...mockConfig, endpoint: '' }))
        .toThrow('Barbican endpoint is required');
    });

    it('should throw error with missing projectId', () => {
      expect(() => new BarbicanProvider({ ...mockConfig, projectId: '' }))
        .toThrow('Barbican projectId is required');
    });

    it('should throw error with missing credentials', () => {
      expect(() => new BarbicanProvider({ ...mockConfig, username: '', password: '' }))
        .toThrow('Barbican username and password are required');
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully and cache token', async () => {
      const mockToken = 'test-auth-token-123';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      axios.post.mockResolvedValue({
        headers: { 'x-subject-token': mockToken },
        data: {
          token: {
            expires_at: mockExpiry,
          },
        },
      });

      const token = await provider.authenticate();

      expect(token).toBe(mockToken);
      expect(provider.authToken).toBe(mockToken);
      expect(provider.tokenExpiry).toBeGreaterThan(Date.now());
      expect(axios.post).toHaveBeenCalledWith(
        `${mockConfig.authEndpoint}/auth/tokens`,
        expect.objectContaining({
          auth: expect.objectContaining({
            identity: expect.any(Object),
            scope: expect.any(Object),
          }),
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should reuse cached token if not expired', async () => {
      const mockToken = 'cached-token-123';
      provider.authToken = mockToken;
      provider.tokenExpiry = Date.now() + 600000; // 10 minutes from now

      const token = await provider.authenticate();

      expect(token).toBe(mockToken);
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should re-authenticate if token is expired', async () => {
      const oldToken = 'expired-token';
      const newToken = 'new-token-123';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString();

      provider.authToken = oldToken;
      provider.tokenExpiry = Date.now() - 1000; // Already expired

      axios.post.mockResolvedValue({
        headers: { 'x-subject-token': newToken },
        data: {
          token: {
            expires_at: mockExpiry,
          },
        },
      });

      const token = await provider.authenticate();

      expect(token).toBe(newToken);
      expect(axios.post).toHaveBeenCalled();
    });

    it('should throw error on authentication failure', async () => {
      axios.post.mockRejectedValue(new Error('Invalid credentials'));

      await expect(provider.authenticate()).rejects.toThrow(
        'Barbican authentication failed: Invalid credentials'
      );
    });
  });

  describe('getSecret', () => {
    beforeEach(() => {
      // Mock successful authentication
      const mockToken = 'test-token';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString();

      axios.post.mockResolvedValue({
        headers: { 'x-subject-token': mockToken },
        data: {
          token: {
            expires_at: mockExpiry,
          },
        },
      });
    });

    it('should retrieve secret successfully using UUID', async () => {
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';
      const secretValue = 'my-secret-value';

      axios.get.mockResolvedValue({
        data: secretValue,
      });

      const result = await provider.getSecret(secretUUID);

      expect(result).toBe(secretValue);
      expect(axios.get).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets/${secretUUID}/payload`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': expect.any(String),
            Accept: 'text/plain',
          }),
        })
      );
    });

    it('should retrieve secret by name (with lookup)', async () => {
      const secretName = 'JWT_SECRET';
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';
      const secretValue = 'my-secret-value';

      // Mock search by name
      axios.get.mockImplementation((url) => {
        if (url.includes('/secrets') && !url.includes('/payload')) {
          return Promise.resolve({
            data: {
              secrets: [
                {
                  secret_ref: `${mockConfig.endpoint}/secrets/${secretUUID}`,
                  name: secretName,
                },
              ],
            },
          });
        } else if (url.includes('/payload')) {
          return Promise.resolve({ data: secretValue });
        }
      });

      const result = await provider.getSecret(secretName);

      expect(result).toBe(secretValue);
      expect(axios.get).toHaveBeenCalledTimes(2); // 1 for search, 1 for payload
    });

    it('should use cached secret if available', async () => {
      const secretName = 'JWT_SECRET';
      const cachedValue = 'cached-secret';

      provider.cache[secretName] = {
        value: cachedValue,
        timestamp: Date.now(),
      };

      const result = await provider.getSecret(secretName);

      expect(result).toBe(cachedValue);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should refresh cached secret when requested', async () => {
      const secretName = 'JWT_SECRET';
      const cachedValue = 'cached-secret';
      const newValue = 'new-secret-value';
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';

      provider.cache[secretName] = {
        value: cachedValue,
        timestamp: Date.now(),
      };

      // Mock search and payload retrieval
      axios.get.mockImplementation((url) => {
        if (url.includes('/secrets') && !url.includes('/payload')) {
          return Promise.resolve({
            data: {
              secrets: [
                {
                  secret_ref: `${mockConfig.endpoint}/secrets/${secretUUID}`,
                  name: secretName,
                },
              ],
            },
          });
        } else if (url.includes('/payload')) {
          return Promise.resolve({ data: newValue });
        }
      });

      const result = await provider.getSecret(secretName, { refresh: true });

      expect(result).toBe(newValue);
      expect(axios.get).toHaveBeenCalled();
    });

    it('should throw error when secret not found', async () => {
      const secretName = 'NONEXISTENT_SECRET';

      axios.get.mockImplementation((url) => {
        if (url.includes('/secrets') && !url.includes('/payload')) {
          return Promise.resolve({
            data: { secrets: [] },
          });
        }
      });

      await expect(provider.getSecret(secretName)).rejects.toThrow();
    });

    it('should throw error on retrieval failure', async () => {
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';

      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(provider.getSecret(secretUUID)).rejects.toThrow(
        'Barbican secret retrieval failed: Network error'
      );
    });
  });

  describe('createSecret', () => {
    beforeEach(() => {
      // Mock successful authentication
      const mockToken = 'test-token';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString();

      axios.post.mockImplementation((url) => {
        if (url.includes('/auth/tokens')) {
          return Promise.resolve({
            headers: { 'x-subject-token': mockToken },
            data: {
              token: {
                expires_at: mockExpiry,
              },
            },
          });
        }
      });
    });

    it('should create secret successfully', async () => {
      const secretName = 'NEW_SECRET';
      const secretValue = 'new-secret-value';
      const secretRef = `${mockConfig.endpoint}/secrets/123e4567-e89b-12d3-a456-426614174000`;

      axios.post.mockImplementation((url) => {
        if (url.includes('/secrets')) {
          return Promise.resolve({
            data: {
              secret_ref: secretRef,
            },
          });
        }
      });

      const result = await provider.createSecret(secretName, secretValue);

      expect(result.secret_ref).toBe(secretRef);
      expect(axios.post).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets`,
        expect.objectContaining({
          name: secretName,
          payload: secretValue,
          payload_content_type: 'text/plain',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': expect.any(String),
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should support custom algorithm options', async () => {
      const secretName = 'AES_KEY';
      const secretValue = 'aes-key-value';
      const secretRef = `${mockConfig.endpoint}/secrets/123e4567-e89b-12d3-a456-426614174000`;

      axios.post.mockImplementation((url) => {
        if (url.includes('/secrets')) {
          return Promise.resolve({
            data: {
              secret_ref: secretRef,
            },
          });
        }
      });

      const options = {
        algorithm: 'aes',
        bit_length: 256,
        mode: 'cbc',
      };

      const result = await provider.createSecret(secretName, secretValue, options);

      expect(result.secret_ref).toBe(secretRef);
      expect(axios.post).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets`,
        expect.objectContaining({
          name: secretName,
          payload: secretValue,
          algorithm: 'aes',
          bit_length: 256,
          mode: 'cbc',
        }),
        expect.any(Object)
      );
    });

    it('should throw error on creation failure', async () => {
      const secretName = 'FAIL_SECRET';
      const secretValue = 'fail-value';

      axios.post.mockImplementation((url) => {
        if (url.includes('/secrets')) {
          return Promise.reject(new Error('Permission denied'));
        }
      });

      await expect(provider.createSecret(secretName, secretValue)).rejects.toThrow(
        'Barbican secret creation failed: Permission denied'
      );
    });
  });

  describe('deleteSecret', () => {
    beforeEach(() => {
      // Mock successful authentication
      const mockToken = 'test-token';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString();

      axios.post.mockResolvedValue({
        headers: { 'x-subject-token': mockToken },
        data: {
          token: {
            expires_at: mockExpiry,
          },
        },
      });
    });

    it('should delete secret successfully', async () => {
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';

      axios.delete.mockResolvedValue({ status: 204 });

      await provider.deleteSecret(secretUUID);

      expect(axios.delete).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets/${secretUUID}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': expect.any(String),
          }),
        })
      );
    });

    it('should throw error on deletion failure', async () => {
      const secretUUID = '123e4567-e89b-12d3-a456-426614174000';

      axios.delete.mockRejectedValue(new Error('Not found'));

      await expect(provider.deleteSecret(secretUUID)).rejects.toThrow(
        'Barbican secret deletion failed: Not found'
      );
    });
  });

  describe('listSecrets', () => {
    beforeEach(() => {
      // Mock successful authentication
      const mockToken = 'test-token';
      const mockExpiry = new Date(Date.now() + 3600000).toISOString();

      axios.post.mockResolvedValue({
        headers: { 'x-subject-token': mockToken },
        data: {
          token: {
            expires_at: mockExpiry,
          },
        },
      });
    });

    it('should list secrets successfully', async () => {
      const mockSecrets = [
        {
          secret_ref: `${mockConfig.endpoint}/secrets/123`,
          name: 'JWT_SECRET',
          status: 'ACTIVE',
        },
        {
          secret_ref: `${mockConfig.endpoint}/secrets/456`,
          name: 'DB_PASSWORD',
          status: 'ACTIVE',
        },
      ];

      axios.get.mockResolvedValue({
        data: {
          secrets: mockSecrets,
          total: 2,
        },
      });

      const result = await provider.listSecrets();

      expect(result.secrets).toEqual(mockSecrets);
      expect(result.total).toBe(2);
      expect(axios.get).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Token': expect.any(String),
          }),
        })
      );
    });

    it('should support pagination options', async () => {
      axios.get.mockResolvedValue({
        data: {
          secrets: [],
          total: 0,
        },
      });

      await provider.listSecrets({ limit: 50, offset: 10 });

      expect(axios.get).toHaveBeenCalledWith(
        `${mockConfig.endpoint}/secrets`,
        expect.objectContaining({
          params: {
            limit: 50,
            offset: 10,
          },
        })
      );
    });

    it('should throw error on list failure', async () => {
      axios.get.mockRejectedValue(new Error('Service unavailable'));

      await expect(provider.listSecrets()).rejects.toThrow(
        'Barbican secret listing failed: Service unavailable'
      );
    });
  });

  describe('cache management', () => {
    it('should cache secrets correctly', () => {
      const secretName = 'TEST_SECRET';
      const secretValue = 'test-value';

      provider.cacheSecret(secretName, secretValue);

      expect(provider.cache[secretName]).toBeDefined();
      expect(provider.cache[secretName].value).toBe(secretValue);
      expect(provider.cache[secretName].timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should retrieve cached secrets', () => {
      const secretName = 'TEST_SECRET';
      const secretValue = 'test-value';

      provider.cache[secretName] = {
        value: secretValue,
        timestamp: Date.now(),
      };

      const cached = provider.getCachedSecret(secretName);

      expect(cached).toBe(secretValue);
    });

    it('should return null for expired cache', () => {
      const secretName = 'TEST_SECRET';
      const secretValue = 'test-value';

      provider.cache[secretName] = {
        value: secretValue,
        timestamp: Date.now() - (provider.cacheTTL + 1000), // Expired
      };

      const cached = provider.getCachedSecret(secretName);

      expect(cached).toBeNull();
    });

    it('should return null for non-existent cache', () => {
      const cached = provider.getCachedSecret('NONEXISTENT');

      expect(cached).toBeNull();
    });

    it('should clear cache correctly', () => {
      provider.cache = {
        SECRET1: { value: 'val1', timestamp: Date.now() },
        SECRET2: { value: 'val2', timestamp: Date.now() },
      };

      provider.clearCache();

      expect(provider.cache).toEqual({});
    });
  });

  describe('utility methods', () => {
    it('should correctly identify UUIDs', () => {
      expect(provider.isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(provider.isUUID('not-a-uuid')).toBe(false);
      expect(provider.isUUID('123')).toBe(false);
      expect(provider.isUUID('')).toBe(false);
    });
  });
});
