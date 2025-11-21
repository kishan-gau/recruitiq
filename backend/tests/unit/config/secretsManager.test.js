/**
 * Unit Tests for SecretsManager
 * Tests the main SecretsManager class with both Barbican and Hashicorp Vault providers
 * 
 * @requires @jest/globals
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the providers before importing SecretsManager
jest.unstable_mockModule('../../../src/config/secrets/providers/BarbicanProvider.js', () => ({
  default: jest.fn()
}));

jest.unstable_mockModule('../../../src/config/secrets/providers/HashicorpVaultProvider.js', () => ({
  default: jest.fn()
}));

// Import after mocking
const { default: SecretsManager } = await import('../../../src/config/secrets/SecretsManager.js');
const { default: BarbicanProvider } = await import('../../../src/config/secrets/providers/BarbicanProvider.js');
const { default: HashicorpVaultProvider } = await import('../../../src/config/secrets/providers/HashicorpVaultProvider.js');

describe('SecretsManager', () => {
  let mockProvider;
  let secretsManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock provider
    mockProvider = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getSecret: jest.fn(),
      setSecret: jest.fn(),
      deleteSecret: jest.fn(),
      listSecrets: jest.fn(),
      generateSecret: jest.fn(),
      rotateSecret: jest.fn()
    };

    // Mock the provider constructors
    BarbicanProvider.mockImplementation(() => mockProvider);
    HashicorpVaultProvider.mockImplementation(() => mockProvider);
  });

  describe('constructor', () => {
    it('should initialize with default Barbican provider', () => {
      secretsManager = new SecretsManager();
      expect(BarbicanProvider).toHaveBeenCalled();
    });

    it('should initialize with Hashicorp Vault provider when specified', () => {
      secretsManager = new SecretsManager({ provider: 'hashicorp' });
      expect(HashicorpVaultProvider).toHaveBeenCalled();
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        new SecretsManager({ provider: 'unknown' });
      }).toThrow('Unknown secrets provider: unknown');
    });

    it('should pass config to provider constructor', () => {
      const config = {
        provider: 'barbican',
        endpoint: 'https://custom.endpoint.com',
        projectId: 'custom-project'
      };

      secretsManager = new SecretsManager(config);
      expect(BarbicanProvider).toHaveBeenCalledWith(config);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should call provider initialize method', async () => {
      await secretsManager.initialize();
      expect(mockProvider.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockProvider.initialize.mockRejectedValue(new Error('Init failed'));
      await expect(secretsManager.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('getSecret', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should retrieve secret from provider', async () => {
      const secretName = 'JWT_SECRET';
      const secretValue = 'secret-value-123';

      mockProvider.getSecret.mockResolvedValue(secretValue);

      const result = await secretsManager.getSecret(secretName);

      expect(mockProvider.getSecret).toHaveBeenCalledWith(secretName);
      expect(result).toBe(secretValue);
    });

    it('should cache secrets after first retrieval', async () => {
      const secretName = 'JWT_SECRET';
      const secretValue = 'secret-value-123';

      mockProvider.getSecret.mockResolvedValue(secretValue);

      // First call
      await secretsManager.getSecret(secretName);
      // Second call
      await secretsManager.getSecret(secretName);

      // Provider should only be called once
      expect(mockProvider.getSecret).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on second call', async () => {
      const secretName = 'JWT_SECRET';
      const secretValue = 'secret-value-123';

      mockProvider.getSecret.mockResolvedValue(secretValue);

      const result1 = await secretsManager.getSecret(secretName);
      const result2 = await secretsManager.getSecret(secretName);

      expect(result1).toBe(secretValue);
      expect(result2).toBe(secretValue);
    });

    it('should throw error for missing secret', async () => {
      mockProvider.getSecret.mockResolvedValue(null);

      await expect(
        secretsManager.getSecret('NONEXISTENT_SECRET')
      ).rejects.toThrow('Secret NONEXISTENT_SECRET not found');
    });

    it('should handle provider errors', async () => {
      mockProvider.getSecret.mockRejectedValue(new Error('Provider error'));

      await expect(
        secretsManager.getSecret('JWT_SECRET')
      ).rejects.toThrow('Provider error');
    });
  });

  describe('setSecret', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should store secret via provider', async () => {
      const secretName = 'NEW_SECRET';
      const secretValue = 'new-value-123';
      const secretRef = { secretId: 'secret-123' };

      mockProvider.setSecret.mockResolvedValue(secretRef);

      const result = await secretsManager.setSecret(secretName, secretValue);

      expect(mockProvider.setSecret).toHaveBeenCalledWith(secretName, secretValue, undefined);
      expect(result).toEqual(secretRef);
    });

    it('should pass options to provider', async () => {
      const secretName = 'NEW_SECRET';
      const secretValue = 'new-value-123';
      const options = { expiration: '2025-12-31T23:59:59Z' };
      const secretRef = { secretId: 'secret-123' };

      mockProvider.setSecret.mockResolvedValue(secretRef);

      await secretsManager.setSecret(secretName, secretValue, options);

      expect(mockProvider.setSecret).toHaveBeenCalledWith(secretName, secretValue, options);
    });

    it('should invalidate cache after setting secret', async () => {
      const secretName = 'JWT_SECRET';
      const oldValue = 'old-value';
      const newValue = 'new-value';

      // Get initial value (cached)
      mockProvider.getSecret.mockResolvedValue(oldValue);
      await secretsManager.getSecret(secretName);

      // Set new value
      mockProvider.setSecret.mockResolvedValue({ secretId: 'secret-123' });
      await secretsManager.setSecret(secretName, newValue);

      // Get again - should call provider (cache invalidated)
      mockProvider.getSecret.mockResolvedValue(newValue);
      await secretsManager.getSecret(secretName);

      expect(mockProvider.getSecret).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteSecret', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should delete secret via provider', async () => {
      const secretName = 'OLD_SECRET';

      mockProvider.deleteSecret.mockResolvedValue(undefined);

      await secretsManager.deleteSecret(secretName);

      expect(mockProvider.deleteSecret).toHaveBeenCalledWith(secretName);
    });

    it('should invalidate cache after deletion', async () => {
      const secretName = 'JWT_SECRET';
      const secretValue = 'secret-value';

      // Get and cache secret
      mockProvider.getSecret.mockResolvedValue(secretValue);
      await secretsManager.getSecret(secretName);

      // Delete secret
      mockProvider.deleteSecret.mockResolvedValue(undefined);
      await secretsManager.deleteSecret(secretName);

      // Try to get again - should call provider (cache invalidated)
      mockProvider.getSecret.mockResolvedValue(null);
      
      await expect(
        secretsManager.getSecret(secretName)
      ).rejects.toThrow('Secret JWT_SECRET not found');

      expect(mockProvider.getSecret).toHaveBeenCalledTimes(2);
    });
  });

  describe('listSecrets', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should list secrets from provider', async () => {
      const secrets = [
        { name: 'JWT_SECRET', created: '2025-01-01' },
        { name: 'DB_PASSWORD', created: '2025-01-02' }
      ];

      mockProvider.listSecrets.mockResolvedValue(secrets);

      const result = await secretsManager.listSecrets();

      expect(mockProvider.listSecrets).toHaveBeenCalled();
      expect(result).toEqual(secrets);
    });

    it('should return empty array when no secrets', async () => {
      mockProvider.listSecrets.mockResolvedValue([]);

      const result = await secretsManager.listSecrets();

      expect(result).toEqual([]);
    });
  });

  describe('generateSecret', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should generate secret via provider', async () => {
      const secretName = 'GENERATED_SECRET';
      const options = {
        algorithm: 'aes',
        bit_length: 256,
        mode: 'cbc'
      };
      const secretRef = { secretId: 'secret-123', payload: 'generated-value' };

      mockProvider.generateSecret.mockResolvedValue(secretRef);

      const result = await secretsManager.generateSecret(secretName, options);

      expect(mockProvider.generateSecret).toHaveBeenCalledWith(secretName, options);
      expect(result).toEqual(secretRef);
    });

    it('should invalidate cache after generation', async () => {
      const secretName = 'JWT_SECRET';

      // Generate secret
      mockProvider.generateSecret.mockResolvedValue({ secretId: 'secret-123' });
      await secretsManager.generateSecret(secretName, { algorithm: 'aes' });

      // Get secret - should call provider (not cached)
      mockProvider.getSecret.mockResolvedValue('generated-value');
      await secretsManager.getSecret(secretName);

      expect(mockProvider.getSecret).toHaveBeenCalledTimes(1);
    });
  });

  describe('rotateSecret', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should rotate secret via provider', async () => {
      const secretName = 'JWT_SECRET';
      const newSecretRef = { secretId: 'secret-456', payload: 'new-value' };

      mockProvider.rotateSecret.mockResolvedValue(newSecretRef);

      const result = await secretsManager.rotateSecret(secretName);

      expect(mockProvider.rotateSecret).toHaveBeenCalledWith(secretName);
      expect(result).toEqual(newSecretRef);
    });

    it('should invalidate cache after rotation', async () => {
      const secretName = 'JWT_SECRET';
      const oldValue = 'old-value';
      const newValue = 'new-value';

      // Get and cache old value
      mockProvider.getSecret.mockResolvedValue(oldValue);
      await secretsManager.getSecret(secretName);

      // Rotate secret
      mockProvider.rotateSecret.mockResolvedValue({ secretId: 'secret-456' });
      await secretsManager.rotateSecret(secretName);

      // Get new value - should call provider (cache invalidated)
      mockProvider.getSecret.mockResolvedValue(newValue);
      const result = await secretsManager.getSecret(secretName);

      expect(mockProvider.getSecret).toHaveBeenCalledTimes(2);
      expect(result).toBe(newValue);
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should clear entire cache', async () => {
      // Cache multiple secrets
      mockProvider.getSecret.mockResolvedValue('value1');
      await secretsManager.getSecret('SECRET_1');
      
      mockProvider.getSecret.mockResolvedValue('value2');
      await secretsManager.getSecret('SECRET_2');

      // Clear cache
      secretsManager.clearCache();

      // Get secrets again - should call provider for both
      mockProvider.getSecret.mockResolvedValue('value1-new');
      await secretsManager.getSecret('SECRET_1');
      
      mockProvider.getSecret.mockResolvedValue('value2-new');
      await secretsManager.getSecret('SECRET_2');

      expect(mockProvider.getSecret).toHaveBeenCalledTimes(4);
    });

    it('should clear specific secret from cache', async () => {
      // Cache two secrets
      mockProvider.getSecret.mockResolvedValue('value1');
      await secretsManager.getSecret('SECRET_1');
      
      mockProvider.getSecret.mockResolvedValue('value2');
      await secretsManager.getSecret('SECRET_2');

      // Clear only SECRET_1
      secretsManager.clearCache('SECRET_1');

      // Get SECRET_1 - should call provider
      mockProvider.getSecret.mockResolvedValue('value1-new');
      await secretsManager.getSecret('SECRET_1');

      // Get SECRET_2 - should use cache
      await secretsManager.getSecret('SECRET_2');

      // SECRET_1 called twice (initial + after clear), SECRET_2 called once
      expect(mockProvider.getSecret).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should propagate provider errors', async () => {
      const error = new Error('Provider connection failed');
      mockProvider.getSecret.mockRejectedValue(error);

      await expect(
        secretsManager.getSecret('JWT_SECRET')
      ).rejects.toThrow('Provider connection failed');
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      mockProvider.getSecret.mockRejectedValue(timeoutError);

      await expect(
        secretsManager.getSecret('JWT_SECRET')
      ).rejects.toThrow('Request timeout');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockProvider.initialize.mockRejectedValue(authError);

      await expect(
        secretsManager.initialize()
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      secretsManager = new SecretsManager();
    });

    it('should handle full lifecycle: generate -> get -> rotate -> delete', async () => {
      const secretName = 'LIFECYCLE_SECRET';

      // Generate
      mockProvider.generateSecret.mockResolvedValue({ secretId: 'secret-123' });
      await secretsManager.generateSecret(secretName, { algorithm: 'aes' });

      // Get
      mockProvider.getSecret.mockResolvedValue('generated-value');
      const value1 = await secretsManager.getSecret(secretName);
      expect(value1).toBe('generated-value');

      // Rotate
      mockProvider.rotateSecret.mockResolvedValue({ secretId: 'secret-456' });
      await secretsManager.rotateSecret(secretName);

      // Get after rotation
      mockProvider.getSecret.mockResolvedValue('rotated-value');
      const value2 = await secretsManager.getSecret(secretName);
      expect(value2).toBe('rotated-value');

      // Delete
      mockProvider.deleteSecret.mockResolvedValue(undefined);
      await secretsManager.deleteSecret(secretName);

      // Get after deletion (should fail)
      mockProvider.getSecret.mockResolvedValue(null);
      await expect(
        secretsManager.getSecret(secretName)
      ).rejects.toThrow(`Secret ${secretName} not found`);
    });

    it('should handle multiple concurrent requests with caching', async () => {
      const secretName = 'CONCURRENT_SECRET';
      const secretValue = 'cached-value';

      mockProvider.getSecret.mockResolvedValue(secretValue);

      // Make multiple concurrent requests
      const results = await Promise.all([
        secretsManager.getSecret(secretName),
        secretsManager.getSecret(secretName),
        secretsManager.getSecret(secretName)
      ]);

      // All should return same value
      expect(results).toEqual([secretValue, secretValue, secretValue]);

      // Provider should only be called once (cached)
      expect(mockProvider.getSecret).toHaveBeenCalledTimes(1);
    });
  });
});
