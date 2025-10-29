/**
 * Tests for Secrets Manager
 * 
 * Note: These tests use the EnvironmentProvider by default.
 * For integration tests with real providers, set up appropriate credentials.
 */

import { SecretsManager } from '../secretsManager.js';

describe('SecretsManager', () => {
  let secretsManager;

  beforeEach(() => {
    secretsManager = new SecretsManager();
    secretsManager.clearCache();
    // Force environment provider for tests
    process.env.SECRETS_PROVIDER = 'environment';
  });

  afterEach(() => {
    secretsManager.clearCache();
  });

  describe('Initialization', () => {
    test('should initialize with environment provider by default', async () => {
      await secretsManager.initialize();
      
      expect(secretsManager.initialized).toBe(true);
      expect(secretsManager.provider).toBeDefined();
      expect(secretsManager.provider.name).toBe('Environment');
    });

    test('should only initialize once', async () => {
      await secretsManager.initialize();
      const firstProvider = secretsManager.provider;
      
      await secretsManager.initialize();
      const secondProvider = secretsManager.provider;
      
      expect(firstProvider).toBe(secondProvider);
    });
  });

  describe('Secret Operations', () => {
    beforeEach(async () => {
      process.env.TEST_SECRET = 'test-value';
      process.env.TEST_JSON_SECRET = JSON.stringify({ key: 'value' });
      await secretsManager.initialize();
    });

    afterEach(() => {
      delete process.env.TEST_SECRET;
      delete process.env.TEST_JSON_SECRET;
    });

    test('should get a secret from environment', async () => {
      const value = await secretsManager.getSecret('TEST_SECRET');
      expect(value).toBe('test-value');
    });

    test('should throw error for non-existent secret', async () => {
      await expect(secretsManager.getSecret('NON_EXISTENT')).rejects.toThrow();
    });

    test('should set a secret', async () => {
      await secretsManager.setSecret('NEW_SECRET', 'new-value');
      
      const value = await secretsManager.getSecret('NEW_SECRET');
      expect(value).toBe('new-value');
    });

    test('should delete a secret', async () => {
      process.env.DELETE_ME = 'value';
      
      await secretsManager.deleteSecret('DELETE_ME');
      
      expect(process.env.DELETE_ME).toBeUndefined();
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      process.env.CACHED_SECRET = 'cached-value';
      await secretsManager.initialize();
    });

    afterEach(() => {
      delete process.env.CACHED_SECRET;
    });

    test('should cache secrets after first retrieval', async () => {
      await secretsManager.getSecret('CACHED_SECRET');
      
      const stats = secretsManager.getCacheStats();
      expect(stats.size).toBe(1);
    });

    test('should use cached value on second retrieval', async () => {
      await secretsManager.getSecret('CACHED_SECRET');
      
      // Change environment variable
      process.env.CACHED_SECRET = 'changed-value';
      
      // Should still return cached value
      const value = await secretsManager.getSecret('CACHED_SECRET');
      expect(value).toBe('cached-value');
    });

    test('should clear cache', async () => {
      await secretsManager.getSecret('CACHED_SECRET');
      expect(secretsManager.getCacheStats().size).toBe(1);
      
      secretsManager.clearCache();
      expect(secretsManager.getCacheStats().size).toBe(0);
    });

    test('should invalidate cache on set', async () => {
      await secretsManager.getSecret('CACHED_SECRET');
      expect(secretsManager.getCacheStats().size).toBe(1);
      
      await secretsManager.setSecret('CACHED_SECRET', 'new-value');
      expect(secretsManager.getCacheStats().size).toBe(0);
    });

    test('should invalidate cache on delete', async () => {
      await secretsManager.getSecret('CACHED_SECRET');
      expect(secretsManager.getCacheStats().size).toBe(1);
      
      await secretsManager.deleteSecret('CACHED_SECRET');
      expect(secretsManager.getCacheStats().size).toBe(0);
    });
  });

  describe('Cache TTL', () => {
    beforeEach(async () => {
      process.env.TTL_SECRET = 'initial-value';
      await secretsManager.initialize();
      // Set very short TTL for testing
      secretsManager.cacheTTL = 100; // 100ms
    });

    afterEach(() => {
      delete process.env.TTL_SECRET;
      secretsManager.cacheTTL = 5 * 60 * 1000; // Reset to default
    });

    test('should respect cache TTL', async () => {
      await secretsManager.getSecret('TTL_SECRET');
      expect(secretsManager.getCacheStats().size).toBe(1);
      
      // Change environment variable
      process.env.TTL_SECRET = 'updated-value';
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should fetch new value
      const value = await secretsManager.getSecret('TTL_SECRET');
      expect(value).toBe('updated-value');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await secretsManager.initialize();
    });

    test('should handle provider initialization errors gracefully', async () => {
      // Create new manager with invalid provider
      const badManager = new SecretsManager();
      process.env.SECRETS_PROVIDER = 'invalid-provider';
      
      // Should fall back to environment provider
      await badManager.initialize();
      expect(badManager.provider.name).toBe('Environment');
      
      process.env.SECRETS_PROVIDER = 'environment';
    });

    test('should throw error when secret not found', async () => {
      await expect(
        secretsManager.getSecret('DEFINITELY_NOT_A_SECRET')
      ).rejects.toThrow();
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      await secretsManager.initialize();
    });

    test('should return cache statistics', () => {
      const stats = secretsManager.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('ttl');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.ttl).toBe('number');
    });
  });
});
