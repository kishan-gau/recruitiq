import { jest } from '@jest/globals';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockConfig = {
  aws: { region: 'us-east-1' },
};

jest.unstable_mockModule('../../utils/logger.ts', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../config/index.ts', () => ({ default: mockConfig }));

const { default: secretsManager } = await import('../secretsManager');

describe('SecretsManager', () => {
  beforeEach(() => { 
    jest.clearAllMocks(); 
    secretsManager.clearCache(); 
    delete process.env.TEST_SECRET;
  });

  describe('Environment Provider', () => {
    test('should get secret from environment variable', async () => {
      process.env.TEST_SECRET = 'test-value';
      const secret = await secretsManager.getSecret('TEST_SECRET');
      expect(secret).toBe('test-value');
    });

    test('should throw error when secret not found', async () => {
      await expect(secretsManager.getSecret('NONEXISTENT')).rejects.toThrow();
    });

    test('should set secret in environment', async () => {
      await secretsManager.setSecret('NEW_SECRET', 'new-value');
      expect(process.env.NEW_SECRET).toBe('new-value');
    });

    test('should delete secret from environment', async () => {
      process.env.DELETE_ME = 'value';
      await secretsManager.deleteSecret('DELETE_ME');
      expect(process.env.DELETE_ME).toBeUndefined();
    });

    test('should throw error when trying to rotate environment secret', async () => {
      process.env.ROTATE_ME = 'value';
      await expect(secretsManager.rotateSecret('ROTATE_ME')).rejects.toThrow();
    });
  });

  describe('Caching', () => {
    test('should cache retrieved secrets', async () => {
      process.env.CACHED_SECRET = 'cached-value';
      
      await secretsManager.getSecret('CACHED_SECRET');
      await secretsManager.getSecret('CACHED_SECRET');
      
      const stats = secretsManager.getCacheStats();
      expect(stats.size).toBe(1);
    });

    test('should invalidate cache when setting secret', async () => {
      process.env.UPDATE_ME = 'old-value';
      
      await secretsManager.getSecret('UPDATE_ME');
      await secretsManager.setSecret('UPDATE_ME', 'new-value');
      
      const secret = await secretsManager.getSecret('UPDATE_ME');
      expect(secret).toBe('new-value');
    });

    test('should invalidate cache when deleting secret', async () => {
      process.env.DELETE_ME = 'value';
      
      await secretsManager.getSecret('DELETE_ME');
      await secretsManager.deleteSecret('DELETE_ME');
      
      await expect(secretsManager.getSecret('DELETE_ME')).rejects.toThrow();
    });

    test('should clear all cached secrets', async () => {
      process.env.SECRET1 = 'value1';
      process.env.SECRET2 = 'value2';
      
      await secretsManager.getSecret('SECRET1');
      await secretsManager.getSecret('SECRET2');
      
      secretsManager.clearCache();
      
      const stats = secretsManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    test('should track cache statistics', async () => {
      process.env.STAT_SECRET = 'value';
      
      await secretsManager.getSecret('STAT_SECRET');
      await secretsManager.getSecret('STAT_SECRET');
      
      const stats = secretsManager.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Multiple Secrets', () => {
    test('should handle multiple secrets independently', async () => {
      process.env.SECRET_ONE = 'value1';
      process.env.SECRET_TWO = 'value2';
      process.env.SECRET_THREE = 'value3';
      
      const secret1 = await secretsManager.getSecret('SECRET_ONE');
      const secret2 = await secretsManager.getSecret('SECRET_TWO');
      const secret3 = await secretsManager.getSecret('SECRET_THREE');
      
      expect(secret1).toBe('value1');
      expect(secret2).toBe('value2');
      expect(secret3).toBe('value3');
    });

    test('should cache multiple secrets separately', async () => {
      process.env.CACHE_A = 'A';
      process.env.CACHE_B = 'B';
      
      await secretsManager.getSecret('CACHE_A');
      await secretsManager.getSecret('CACHE_B');
      
      const stats = secretsManager.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Error Scenarios', () => {
    test('should throw descriptive error for missing secret', async () => {
      await expect(secretsManager.getSecret('DOES_NOT_EXIST'))
        .rejects
        .toThrow(/not found|DOES_NOT_EXIST/i);
    });

    test('should handle empty secret name', async () => {
      await expect(secretsManager.getSecret(''))
        .rejects
        .toThrow();
    });

    test('should handle special characters in secret names', async () => {
      process.env['SECRET_WITH-DASH'] = 'value';
      const secret = await secretsManager.getSecret('SECRET_WITH-DASH');
      expect(secret).toBe('value');
    });
  });

  describe('Value Types', () => {
    test('should handle string values', async () => {
      process.env.STRING_SECRET = 'simple string';
      const secret = await secretsManager.getSecret('STRING_SECRET');
      expect(secret).toBe('simple string');
    });

    test('should handle numeric values', async () => {
      process.env.NUMBER_SECRET = '12345';
      const secret = await secretsManager.getSecret('NUMBER_SECRET');
      expect(secret).toBe('12345');
    });

    test('should throw error for empty string values', async () => {
      process.env.EMPTY_SECRET = '';
      await expect(secretsManager.getSecret('EMPTY_SECRET'))
        .rejects
        .toThrow(/not found/i);
    });

    test('should handle values with spaces', async () => {
      process.env.SPACE_SECRET = 'value with spaces';
      const secret = await secretsManager.getSecret('SPACE_SECRET');
      expect(secret).toBe('value with spaces');
    });
  });

  describe('Cache Behavior', () => {
    test('should use cached value on subsequent calls', async () => {
      process.env.REPEAT_SECRET = 'initial';
      
      const first = await secretsManager.getSecret('REPEAT_SECRET');
      expect(first).toBe('initial');
      
      // Change env var
      process.env.REPEAT_SECRET = 'changed';
      
      // Should still get cached value
      const second = await secretsManager.getSecret('REPEAT_SECRET');
      expect(second).toBe('initial');
    });

    test('should refresh after cache clear', async () => {
      process.env.CLEAR_SECRET = 'original';
      
      const first = await secretsManager.getSecret('CLEAR_SECRET');
      expect(first).toBe('original');
      
      secretsManager.clearCache();
      process.env.CLEAR_SECRET = 'updated';
      
      const second = await secretsManager.getSecret('CLEAR_SECRET');
      expect(second).toBe('updated');
    });
  });
});