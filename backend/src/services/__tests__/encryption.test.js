/**
 * Encryption Service Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import encryption from '../../services/encryption.js';

describe('Encryption Service', () => {
  // Set up test encryption key
  const TEST_MASTER_KEY = 'test-master-key-must-be-at-least-32-chars-long-for-security';
  
  beforeAll(() => {
    process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY;
  });
  
  afterAll(() => {
    delete process.env.ENCRYPTION_MASTER_KEY;
  });
  
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toBeTruthy();
      expect(decrypted).toBe(plaintext);
    });
    
    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'sensitive data';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same plaintext
      expect(encryption.decrypt(encrypted1)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2)).toBe(plaintext);
    });
    
    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle null/undefined values', () => {
      expect(encryption.encrypt(null)).toBe(null);
      expect(encryption.encrypt(undefined)).toBe(undefined);
      expect(encryption.decrypt(null)).toBe(null);
      expect(encryption.decrypt(undefined)).toBe(undefined);
    });
    
    it('should handle unicode characters', () => {
      const plaintext = '🔐 sensitive émoji dätä 中文';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle long strings', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
    
    it('should throw error with invalid ciphertext', () => {
      expect(() => {
        encryption.decrypt('invalid-base64-data');
      }).toThrow();
    });
    
    it('should throw error with tampered ciphertext', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryption.encrypt(plaintext);
      
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      
      expect(() => {
        encryption.decrypt(tampered);
      }).toThrow();
    });
  });
  
  describe('encryptFields/decryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        publicInfo: 'Not sensitive',
      };
      
      const encrypted = encryption.encryptFields(data, ['email', 'phone']);
      
      expect(encrypted.name).toBe(data.name);
      expect(encrypted.publicInfo).toBe(data.publicInfo);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.phone).not.toBe(data.phone);
      
      const decrypted = encryption.decryptFields(encrypted, ['email', 'phone']);
      
      expect(decrypted.email).toBe(data.email);
      expect(decrypted.phone).toBe(data.phone);
    });
    
    it('should handle objects with missing fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
      };
      
      const encrypted = encryption.encryptFields(data, ['email', 'phone', 'ssn']);
      
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.ssn).toBeUndefined();
    });
    
    it('should handle null/undefined values in fields', () => {
      const data = {
        email: null,
        phone: undefined,
        ssn: '',
      };
      
      const encrypted = encryption.encryptFields(data, ['email', 'phone', 'ssn']);
      
      expect(encrypted.email).toBe(null);
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.ssn).toBe('');
    });
    
    it('should not modify original object', () => {
      const data = {
        email: 'john@example.com',
      };
      
      const encrypted = encryption.encryptFields(data, ['email']);
      
      expect(data.email).toBe('john@example.com');
      expect(encrypted.email).not.toBe('john@example.com');
    });
  });
  
  describe('hash functions', () => {
    it('should create consistent hash for same input', () => {
      const data = 'test@example.com';
      const hash1 = encryption.hash(data);
      const hash2 = encryption.hash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });
    
    it('should create different hash for different input', () => {
      const hash1 = encryption.hash('test1@example.com');
      const hash2 = encryption.hash('test2@example.com');
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should hash with salt', () => {
      const data = 'password123';
      const result = encryption.hashWithSalt(data);
      
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('salt');
      expect(result.hash).toHaveLength(64);
      expect(result.salt).toHaveLength(128); // 64 bytes hex = 128 chars
    });
    
    it('should verify hashed data correctly', () => {
      const data = 'password123';
      const { hash, salt } = encryption.hashWithSalt(data);
      
      expect(encryption.verifyHash(data, hash, salt)).toBe(true);
      expect(encryption.verifyHash('wrong', hash, salt)).toBe(false);
    });
    
    it('should use provided salt', () => {
      const data = 'password123';
      const salt = 'a'.repeat(128);
      
      const result1 = encryption.hashWithSalt(data, salt);
      const result2 = encryption.hashWithSalt(data, salt);
      
      expect(result1.hash).toBe(result2.hash);
      expect(result1.salt).toBe(salt);
    });
  });
  
  describe('rotateEncryption', () => {
    it('should re-encrypt data with new key', () => {
      const plaintext = 'sensitive data';
      const oldKey = 'old-key-must-be-at-least-32-chars-long';
      const newKey = 'new-key-must-be-at-least-32-chars-long';
      
      const oldEncrypted = encryption.encrypt(plaintext, oldKey);
      const newEncrypted = encryption.rotateEncryption(oldEncrypted, oldKey, newKey);
      
      expect(newEncrypted).not.toBe(oldEncrypted);
      expect(encryption.decrypt(newEncrypted, newKey)).toBe(plaintext);
      
      // Old key should no longer work
      expect(() => {
        encryption.decrypt(newEncrypted, oldKey);
      }).toThrow();
    });
  });
  
  describe('generateEncryptionKey', () => {
    it('should generate random key of default length', () => {
      const key = encryption.generateEncryptionKey();
      
      expect(key).toHaveLength(128); // 64 bytes hex = 128 chars
    });
    
    it('should generate random key of specified length', () => {
      const key = encryption.generateEncryptionKey(32);
      
      expect(key).toHaveLength(64); // 32 bytes hex = 64 chars
    });
    
    it('should generate different keys', () => {
      const key1 = encryption.generateEncryptionKey();
      const key2 = encryption.generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('isEncrypted', () => {
    it('should identify encrypted data', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryption.encrypt(plaintext);
      
      expect(encryption.isEncrypted(encrypted)).toBe(true);
      expect(encryption.isEncrypted(plaintext)).toBe(false);
    });
    
    it('should handle invalid inputs', () => {
      expect(encryption.isEncrypted(null)).toBe(false);
      expect(encryption.isEncrypted(undefined)).toBe(false);
      expect(encryption.isEncrypted('')).toBe(false);
      expect(encryption.isEncrypted(123)).toBe(false);
      expect(encryption.isEncrypted({})).toBe(false);
    });
  });
  
  describe('validateEncryptionConfig', () => {
    it('should validate correct configuration', () => {
      const result = encryption.validateEncryptionConfig();
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.algorithm).toBe('aes-256-gcm');
      expect(result.keyLength).toBe(256);
    });
    
    it('should detect missing master key', () => {
      delete process.env.ENCRYPTION_MASTER_KEY;
      
      const result = encryption.validateEncryptionConfig();
      
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      
      // Restore key
      process.env.ENCRYPTION_MASTER_KEY = TEST_MASTER_KEY;
    });
  });
  
  describe('middleware functions', () => {
    it('should create encrypt middleware', () => {
      const middleware = encryption.encryptMiddleware(['email', 'ssn']);
      
      expect(typeof middleware).toBe('function');
      
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        ssn: '123-45-6789',
      };
      
      const encrypted = middleware(data);
      
      expect(encrypted.name).toBe(data.name);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.ssn).not.toBe(data.ssn);
    });
    
    it('should create decrypt middleware', () => {
      const encryptMw = encryption.encryptMiddleware(['email']);
      const decryptMw = encryption.decryptMiddleware(['email']);
      
      const data = { email: 'john@example.com' };
      const encrypted = encryptMw(data);
      const decrypted = decryptMw(encrypted);
      
      expect(decrypted.email).toBe(data.email);
    });
    
    it('should handle array of data in decrypt middleware', () => {
      const decryptMw = encryption.decryptMiddleware(['email']);
      
      const data = [
        { email: encryption.encrypt('john@example.com') },
        { email: encryption.encrypt('jane@example.com') },
      ];
      
      const decrypted = decryptMw(data);
      
      expect(decrypted).toHaveLength(2);
      expect(decrypted[0].email).toBe('john@example.com');
      expect(decrypted[1].email).toBe('jane@example.com');
    });
  });
  
  describe('performance', () => {
    it('should encrypt/decrypt efficiently', () => {
      const plaintext = 'sensitive data';
      const iterations = 1000;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const encrypted = encryption.encrypt(plaintext);
        encryption.decrypt(encrypted);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 encryptions + decryptions in less than 5 seconds
      expect(duration).toBeLessThan(5000);
      
      console.log(`Encryption performance: ${iterations} iterations in ${duration}ms`);
    });
  });
});
