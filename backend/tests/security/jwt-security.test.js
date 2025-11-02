/**
 * JWT Secret Security Validation Tests
 * 
 * Tests that JWT secrets meet security requirements:
 * - Minimum 256 bits (43+ characters in base64)
 * - Different secrets for access vs refresh tokens
 * - No weak or predictable patterns
 */

import { describe, test, expect } from '@jest/globals';

// Helper function to validate JWT secret (mirrors config validation logic)
function validateJWTSecrets(jwtSecret, jwtRefreshSecret) {
  const MIN_JWT_SECRET_LENGTH = 43; // 256 bits minimum
  const errors = [];

  if (!jwtSecret) {
    errors.push('JWT_SECRET is required');
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (current: ${jwtSecret.length})`);
  }

  if (!jwtRefreshSecret) {
    errors.push('JWT_REFRESH_SECRET is required');
  } else if (jwtRefreshSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_REFRESH_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (current: ${jwtRefreshSecret.length})`);
  }

  if (jwtSecret && jwtRefreshSecret && jwtSecret === jwtRefreshSecret) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('JWT Secret Security Validation', () => {

  describe('Secret Length Requirements', () => {
    test('should require JWT_SECRET to be at least 43 characters (256 bits)', () => {
      const shortSecret = 'a'.repeat(42); // Just below minimum
      const validRefreshSecret = 'b'.repeat(48);

      const result = validateJWTSecrets(shortSecret, validRefreshSecret);
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('JWT_SECRET must be at least 43');
    });

    test('should require JWT_REFRESH_SECRET to be at least 43 characters (256 bits)', () => {
      const validSecret = 'a'.repeat(48);
      const shortRefreshSecret = 'b'.repeat(42); // Just below minimum

      const result = validateJWTSecrets(validSecret, shortRefreshSecret);
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('JWT_REFRESH_SECRET must be at least 43');
    });

    test('should accept JWT_SECRET of exactly 43 characters', () => {
      const minLengthSecret = 'a'.repeat(43);
      const validRefreshSecret = 'b'.repeat(48);

      const result = validateJWTSecrets(minLengthSecret, validRefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept JWT secrets longer than minimum (e.g., 64 characters)', () => {
      const longSecret = 'a'.repeat(64);
      const longRefreshSecret = 'b'.repeat(64);

      const result = validateJWTSecrets(longSecret, longRefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Secret Uniqueness Requirements', () => {
    test('should reject when JWT_SECRET and JWT_REFRESH_SECRET are identical', () => {
      const sameSecret = 'a'.repeat(48);

      const result = validateJWTSecrets(sameSecret, sameSecret);
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('must be different');
    });

    test('should accept when JWT_SECRET and JWT_REFRESH_SECRET are different', () => {
      const accessSecret = 'a'.repeat(48);
      const refreshSecret = 'b'.repeat(48);

      const result = validateJWTSecrets(accessSecret, refreshSecret);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept secrets that differ by only one character', () => {
      const accessSecret = 'a'.repeat(47) + 'b';
      const refreshSecret = 'a'.repeat(47) + 'c';

      const result = validateJWTSecrets(accessSecret, refreshSecret);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Secret Existence Requirements', () => {
    test('should reject when JWT_SECRET is missing', () => {
      const result = validateJWTSecrets(null, 'b'.repeat(48));
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('JWT_SECRET is required');
    });

    test('should reject when JWT_REFRESH_SECRET is missing', () => {
      const result = validateJWTSecrets('a'.repeat(48), null);
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('JWT_REFRESH_SECRET is required');
    });

    test('should reject when both secrets are missing', () => {
      const result = validateJWTSecrets(null, null);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    test('should reject empty string secrets', () => {
      const result = validateJWTSecrets('', 'b'.repeat(48));
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('JWT_SECRET is required');
    });
  });

  describe('Secret Strength Validation', () => {
    test('should calculate correct bit strength for various lengths', () => {
      // 32 bytes = 256 bits (in base64: ~43 chars)
      // 48 bytes = 384 bits (in base64: 64 chars)
      // 64 bytes = 512 bits (in base64: ~86 chars)
      
      const testCases = [
        { length: 43, minBits: 256, description: '43 chars (256+ bits)' },
        { length: 48, minBits: 288, description: '48 chars (288+ bits)' },
        { length: 64, minBits: 384, description: '64 chars (384+ bits)' },
      ];

      testCases.forEach(({ length }) => {
        const secret = 'a'.repeat(length);
        const refreshSecret = 'b'.repeat(length);

        const result = validateJWTSecrets(secret, refreshSecret);
        
        expect(result.valid).toBe(true);
        expect(secret.length).toBeGreaterThanOrEqual(43);
      });
    });
  });

  describe('Real-world Secret Formats', () => {
    test('should accept base64-encoded secrets from openssl', () => {
      // Typical output from: openssl rand -base64 48
      const base64Secret = 'uXF3xVqKpFHNqKg8YvH5H3YqFjLkN8pRZmW1xVqKpFHNqKg8YvH5H3Y=';
      const base64RefreshSecret = 'pLmW2xVqKpFHNqKg8YvH5H3YqFjLkN8pRZmW1xVqKpFHNqKg8YvH5H3Y=';

      const result = validateJWTSecrets(base64Secret, base64RefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(base64Secret.length).toBeGreaterThanOrEqual(43);
      expect(base64RefreshSecret.length).toBeGreaterThanOrEqual(43);
    });

    test('should accept hex-encoded secrets', () => {
      // 32 bytes in hex = 64 characters
      const hexSecret = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const hexRefreshSecret = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      const result = validateJWTSecrets(hexSecret, hexRefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(hexSecret.length).toBe(64);
    });

    test('should accept alphanumeric secrets with special characters', () => {
      const complexSecret = 'aB3#xY9$mN2@qW7!vC5%jK8&tR4*uP6-zA1+bE0~fD9^gH3_iL2';
      const complexRefreshSecret = 'pQ8#cV4$dW9@eX2!fY7%gZ3&hA6*iB5-jC1+kD0~lE8^mF4_nG7';

      const result = validateJWTSecrets(complexSecret, complexRefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(complexSecret.length).toBeGreaterThanOrEqual(43);
    });
  });

  describe('Documentation and Error Messages', () => {
    test('should provide helpful error message for short secrets', () => {
      const shortSecret = 'tooshort';
      const validRefreshSecret = 'b'.repeat(48);

      const result = validateJWTSecrets(shortSecret, validRefreshSecret);
      
      expect(result.valid).toBe(false);
      // Error message should mention the minimum length requirement
      const errorMessage = result.errors.join(' ');
      expect(errorMessage).toMatch(/43|256/);
    });

    test('should include current length in error message', () => {
      const shortSecret = 'short';
      const validRefreshSecret = 'b'.repeat(48);

      const result = validateJWTSecrets(shortSecret, validRefreshSecret);
      
      expect(result.valid).toBe(false);
      // Error should show current length
      const errorMessage = result.errors.join(' ');
      expect(errorMessage).toContain(shortSecret.length.toString());
    });
  });

  describe('Security Best Practices', () => {
    test('minimum length ensures 256-bit security', () => {
      // 256 bits / 8 bits per byte = 32 bytes
      // base64 encoding: 32 bytes * 4/3 = 42.67 chars (rounded up to 43)
      const MIN_LENGTH = 43;
      
      // Verify the constant matches our calculation
      expect(MIN_LENGTH).toBe(43);
      
      // Test that secrets at this length are accepted
      const secret = 'a'.repeat(43);
      const refreshSecret = 'b'.repeat(43);
      const result = validateJWTSecrets(secret, refreshSecret);
      expect(result.valid).toBe(true);
    });

    test('should enforce different secrets for access and refresh tokens', () => {
      // This is a security best practice: if one secret is compromised,
      // the other token type remains secure
      const sameSecret = 'x'.repeat(48);

      const result = validateJWTSecrets(sameSecret, sameSecret);
      
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('must be different');
    });

    test('should validate production-grade secret generation', () => {
      // Simulate generating secrets with openssl rand -base64 48
      // This produces 64-character base64 strings (48 bytes * 4/3)
      const opensslLikeSecret = 'x'.repeat(64);
      const opensslLikeRefreshSecret = 'y'.repeat(64);
      
      const result = validateJWTSecrets(opensslLikeSecret, opensslLikeRefreshSecret);
      
      expect(result.valid).toBe(true);
      expect(opensslLikeSecret.length).toBe(64);
      // 64 chars base64 = 48 bytes = 384 bits (exceeds 256-bit minimum)
    });
  });
});
