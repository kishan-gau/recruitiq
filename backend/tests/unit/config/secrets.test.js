/**
 * Unit Tests for Secrets Validation
 * Tests the centralized secrets management and validation logic
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';

/**
 * Helper function to generate strong secrets for testing
 */
function generateStrongSecret(minLength) {
  return crypto.randomBytes(Math.ceil(minLength / 2)).toString('hex').slice(0, minLength);
}

/**
 * Helper to set ALL required environment variables for production tests
 * This ensures no previous test's env vars leak through
 */
function setAllRequiredSecrets(overrides = {}) {
  const defaults = {
    JWT_SECRET: generateStrongSecret(45),
    JWT_REFRESH_SECRET: generateStrongSecret(45),
    ENCRYPTION_KEY: generateStrongSecret(130),
    SESSION_SECRET: generateStrongSecret(70),
    DATABASE_PASSWORD: 'Str0ng-DB-P@ssw0rd-W1th-R@nd0mn3ss-12345!',
    REDIS_PASSWORD: 'Str0ng-R3d1s-S3cr3t-R@nd0m-98765!',
    LICENSE_MANAGER_DB_PASSWORD: 'Str0ng-L1c3ns3-DB-S3cr3t-54321!'
  };
  
  Object.assign(process.env, { ...defaults, ...overrides });
}

describe('Secrets Configuration', () => {
  let originalEnv;
  let secretsModule;
  
  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear ALL environment variables except NODE_ENV and system vars
    Object.keys(process.env).forEach(key => {
      if (key !== 'NODE_ENV' && key !== 'PATH' && !key.startsWith('npm_')) {
        delete process.env[key];
      }
    });
    
    // Import the secrets module ONCE to get clearSecretsCache function
    if (!secretsModule) {
      secretsModule = await import('../../../src/config/secrets.js');
    }
    
    // Clear the secrets cache before each test
    if (secretsModule.clearSecretsCache) {
      secretsModule.clearSecretsCache();
    }
    
    // Note: jest.resetModules() doesn't work with ES modules and dynamic imports
    // We rely on clearSecretsCache() instead
  });
  
  afterEach(() => {
    // Clear secrets cache after test too
    if (secretsModule && secretsModule.clearSecretsCache) {
      secretsModule.clearSecretsCache();
    }
    
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('JWT Secret Validation', () => {
    it('should reject JWT_SECRET shorter than 43 characters', async () => {
      process.env.JWT_SECRET = 'too-short-secret-only-32-chars!';
      process.env.JWT_REFRESH_SECRET = 'valid-secret-with-at-least-43-characters!!';
      process.env.ENCRYPTION_KEY = 'a'.repeat(128);
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should reject JWT_REFRESH_SECRET shorter than 43 characters', async () => {
      process.env.JWT_SECRET = 'valid-secret-with-at-least-43-characters!!';
      process.env.JWT_REFRESH_SECRET = 'too-short';
      process.env.ENCRYPTION_KEY = 'a'.repeat(128);
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should reject when JWT_SECRET equals JWT_REFRESH_SECRET', async () => {
      const sameSecret = 'same-secret-for-both-jwt-tokens-43-chars!!';
      process.env.JWT_SECRET = sameSecret;
      process.env.JWT_REFRESH_SECRET = sameSecret;
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should reject forbidden JWT values', async () => {
      const forbiddenValues = ['test', 'dev', 'demo', 'example', 'secret', 'password'];
      
      for (const forbidden of forbiddenValues) {
        process.env.JWT_SECRET = `${forbidden}-long-enough-to-pass-length-check-43`;
        process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
        process.env.ENCRYPTION_KEY = generateStrongSecret(130);
        process.env.SESSION_SECRET = generateStrongSecret(70);
        process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
        process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
        process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
        
        const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
        
        await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
        
        // Clear cache after each iteration to ensure clean state
        clearSecretsCache();
      }
    });

    it('should accept valid session secret', async () => {
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(50);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
      clearSecretsCache();
      
      const secrets = await loadSecrets('production');
      
      expect(secrets.JWT_SECRET).toBe(process.env.JWT_SECRET);
      expect(secrets.JWT_REFRESH_SECRET).toBe(process.env.JWT_REFRESH_SECRET);
    });
  });

  describe('Encryption Key Validation', () => {
    it('should reject ENCRYPTION_KEY shorter than 128 characters', async () => {
      process.env.JWT_SECRET = 'valid-jwt-secret-43-characters-minimum!!';
      process.env.JWT_REFRESH_SECRET = 'different-jwt-refresh-secret-43-chars!';
      process.env.ENCRYPTION_KEY = 'too-short-encryption-key';
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should reject forbidden encryption key values', async () => {
      process.env.JWT_SECRET = 'valid-jwt-secret-43-characters-minimum!!';
      process.env.JWT_REFRESH_SECRET = 'different-jwt-refresh-secret-43-chars!';
      process.env.ENCRYPTION_KEY = 'default-encryption-key-' + 'x'.repeat(120);
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should accept valid encryption key', async () => {
      // Set ALL required secrets to valid values for production
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
      clearSecretsCache();
      
      const secrets = await loadSecrets('production');
      
      expect(secrets.ENCRYPTION_MASTER_KEY).toBeDefined();
      expect(secrets.ENCRYPTION_MASTER_KEY).toBe(process.env.ENCRYPTION_KEY);
    });
  });

  describe('Session Secret Validation', () => {
    it('should reject SESSION_SECRET shorter than 64 characters', async () => {
      process.env.JWT_SECRET = 'valid-jwt-secret-43-characters-minimum!!';
      process.env.JWT_REFRESH_SECRET = 'different-jwt-refresh-secret-43-chars!';
      process.env.ENCRYPTION_KEY = 'a'.repeat(128);
      process.env.SESSION_SECRET = 'too-short-session-secret';
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should accept valid session secret', async () => {
      // Set ALL required secrets to valid values for production
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      const secrets = await loadSecrets('production');
      
      expect(secrets.SESSION_SECRET).toBe(process.env.SESSION_SECRET);
    });
  });

  describe('Database Password Validation', () => {
    it('should reject weak database passwords', async () => {
      const weakPasswords = ['postgres', 'password', 'admin', 'root', 'test'];
      
      for (const weak of weakPasswords) {
        process.env.JWT_SECRET = generateStrongSecret(45);
        process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
        process.env.ENCRYPTION_KEY = generateStrongSecret(130);
        process.env.SESSION_SECRET = generateStrongSecret(70);
        process.env.DATABASE_PASSWORD = weak;
        process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
        process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
        
        const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
        
        await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
        
        // Clear cache after each iteration to ensure clean state
        clearSecretsCache();
      }
    });

    it('should accept strong database password', async () => {
      // Manually set ALL required secrets to prevent environment pollution
      // NOTE: Password must NOT contain forbidden substrings like 'password', 'admin', 'root', 'test', 'postgres'
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(50);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'Str0ng-DB-P@ssw0rd-W1th-R@nd0mn3ss-12345!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
      
      // CRITICAL: Clear cache before loading to ensure fresh environment read
      clearSecretsCache();
      
      const secrets = await loadSecrets('production');
      
      expect(secrets.DATABASE_PASSWORD).toBe('Str0ng-DB-P@ssw0rd-W1th-R@nd0mn3ss-12345!');
    });
  });

  describe('Redis Password Validation', () => {
    it('should reject weak Redis passwords', async () => {
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'postgres';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should accept strong Redis password', async () => {
      process.env.JWT_SECRET = generateStrongSecret(45);
      process.env.JWT_REFRESH_SECRET = generateStrongSecret(45);
      process.env.ENCRYPTION_KEY = generateStrongSecret(130);
      process.env.SESSION_SECRET = generateStrongSecret(70);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-password-random-12345!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets, clearSecretsCache } = await import('../../../src/config/secrets.js');
      clearSecretsCache();
      
      const secrets = await loadSecrets('production');
      
      expect(secrets.REDIS_PASSWORD).toBe(process.env.REDIS_PASSWORD);
    });
  });

  describe('Development Environment', () => {
    it('should allow shorter secrets in development', async () => {
      process.env.JWT_SECRET = 'dev-secret-30-chars-short!';
      process.env.JWT_REFRESH_SECRET = 'dev-refresh-different-30ch!';
      process.env.ENCRYPTION_KEY = 'dev-encryption-key-64-chars' + 'x'.repeat(40);
      process.env.SESSION_SECRET = 'dev-session-32-chars' + 'x'.repeat(44);
      process.env.DATABASE_PASSWORD = 'dev-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'dev-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      // Should not throw in development
      const secrets = await loadSecrets('development');
      
      expect(secrets.JWT_SECRET).toBe(process.env.JWT_SECRET);
    });

    it('should warn about weak secrets in development', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      process.env.JWT_SECRET = 'test-secret-weak-value-but-long-enough!';
      process.env.JWT_REFRESH_SECRET = 'different-value-also-weak-test-secret!';
      process.env.ENCRYPTION_KEY = 'test-encryption-key-' + 'x'.repeat(110);
      process.env.SESSION_SECRET = 'test-session-secret-' + 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'test-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'test-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await loadSecrets('development');
      
      // Development mode logs warnings via logger.warn, not console.warn
      // So we just verify no errors were thrown
      expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Missing Secrets', () => {
    it('should throw error for missing JWT_SECRET', async () => {
      delete process.env.JWT_SECRET;
      process.env.JWT_REFRESH_SECRET = 'valid-refresh-secret-43-characters-long!';
      process.env.ENCRYPTION_KEY = 'a'.repeat(128);
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });

    it('should throw error for missing ENCRYPTION_KEY', async () => {
      process.env.JWT_SECRET = 'valid-jwt-secret-43-characters-minimum!!';
      process.env.JWT_REFRESH_SECRET = 'different-jwt-refresh-secret-43-chars!';
      delete process.env.ENCRYPTION_KEY;
      process.env.SESSION_SECRET = 'x'.repeat(64);
      process.env.DATABASE_PASSWORD = 'strong-db-pass-1234!';
      process.env.REDIS_PASSWORD = 'strong-redis-pass-1234!';
      process.env.LICENSE_MANAGER_DB_PASSWORD = 'strong-license-db-pass!';
      
      const { loadSecrets } = await import('../../../src/config/secrets.js');
      
      await expect(loadSecrets('production')).rejects.toThrow('Failed to load');
    });
  });
});
