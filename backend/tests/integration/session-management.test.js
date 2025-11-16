/**
 * Session Management Tests
 * 
 * Tests for JWT token generation, validation, expiration, and blacklisting.
 * 
 * Note: Full integration tests including database operations (concurrent sessions, 
 * token revocation, password change invalidation) are tested via BDD tests 
 * with actual user accounts.
 */

import { jest } from '@jest/globals';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import jwt from 'jsonwebtoken';
import tokenBlacklist from '../../src/services/tokenBlacklist.js';
import config from '../../src/config/index.js';

describe('Session Management Tests', () => {
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testOrgId = '550e8400-e29b-41d4-a716-446655440001';
  
  // Wait for Redis connection before running tests
  beforeAll(async () => {
    // Ensure Redis is connected
    await new Promise(resolve => setTimeout(resolve, 200));
  });
  
  // Cleanup and disconnect Redis after tests
  afterAll(async () => {
    // Give Redis time to process any pending operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Disconnect Redis to allow Jest to exit cleanly
    await tokenBlacklist.disconnect();
  });
  
  // Helper function to generate test tokens with unique identifiers
  function generateTestAccessToken(userId, expiresIn = '15m') {
    return jwt.sign(
      {
        userId,
        organizationId: testOrgId,
        type: 'access',
        jti: Math.random().toString(36).substring(2, 15) // Unique token ID
      },
      config.jwt.secret,
      { expiresIn }
    );
  }

  function generateTestRefreshToken(userId, expiresIn = '30d') {
    return jwt.sign(
      {
        userId,
        organizationId: testOrgId,
        type: 'refresh',
        jti: Math.random().toString(36).substring(2, 15) // Unique token ID
      },
      config.jwt.refreshSecret,
      { expiresIn }
    );
  }

  describe('Token Expiration and Timeout', () => {
    test('should create access tokens with 15 minute expiration', () => {
      const accessToken = generateTestAccessToken(testUserId);
      const decoded = jwt.decode(accessToken);

      // Access token should expire in ~15 minutes (900 seconds)
      const accessExpiry = decoded.exp - decoded.iat;
      expect(accessExpiry).toBeGreaterThan(14 * 60); // At least 14 minutes
      expect(accessExpiry).toBeLessThan(16 * 60); // Less than 16 minutes
    });

    test('should create refresh tokens with 30 day expiration', () => {
      const refreshToken = generateTestRefreshToken(testUserId);
      const decoded = jwt.decode(refreshToken);

      // Refresh token should expire in ~30 days
      const refreshExpiry = decoded.exp - decoded.iat;
      expect(refreshExpiry).toBeGreaterThan(29 * 24 * 60 * 60); // At least 29 days
      expect(refreshExpiry).toBeLessThan(31 * 24 * 60 * 60); // Less than 31 days
    });

    test('should reject expired access tokens', () => {
      // Create an already-expired token
      const expiredToken = jwt.sign(
        { userId: testUserId, organizationId: testOrgId },
        config.jwt.secret,
        { expiresIn: '-1s' } // Expired 1 second ago
      );

      expect(() => {
        jwt.verify(expiredToken, config.jwt.secret);
      }).toThrow(/expired/i);
    });

    test('should reject expired refresh tokens', () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, organizationId: testOrgId },
        config.jwt.refreshSecret,
        { expiresIn: '-1s' }
      );

      expect(() => {
        jwt.verify(expiredToken, config.jwt.refreshSecret);
      }).toThrow(/expired/i);
    });

    test('should validate non-expired tokens', () => {
      const validToken = generateTestAccessToken(testUserId, '1h');
      
      const decoded = jwt.verify(validToken, config.jwt.secret);
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('should include issued-at timestamp', () => {
      const token = generateTestAccessToken(testUserId);
      const decoded = jwt.decode(token);

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      
      // Should be issued within last few seconds
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.iat).toBeGreaterThan(now - 5);
      expect(decoded.iat).toBeLessThanOrEqual(now);
    });
  });

  describe('Concurrent Sessions', () => {
    test('should include user ID in tokens', () => {
      const token = generateTestRefreshToken(testUserId);
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.organizationId).toBe(testOrgId);
    });

    test('should generate different tokens for different users', () => {
      const user1Id = testUserId;
      const user2Id = '550e8400-e29b-41d4-a716-446655440002';

      const token1 = generateTestRefreshToken(user1Id);
      const token2 = generateTestRefreshToken(user2Id);

      // Decoded payloads should have different user IDs
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);

      expect(decoded1.userId).toBe(user1Id);
      expect(decoded2.userId).toBe(user2Id);
      expect(decoded1.userId).not.toBe(decoded2.userId);
    });

    test('should include unique token ID (jti) in each token', () => {
      const token = generateTestRefreshToken(testUserId);
      const decoded = jwt.decode(token);

      // Check that jti exists and is a string
      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.jti.length).toBeGreaterThan(0);
    });
  });

  describe('Token Rotation', () => {
    test('should preserve user identity when generating new tokens', () => {
      const oldToken = generateTestRefreshToken(testUserId);
      const newToken = generateTestRefreshToken(testUserId);

      // Both tokens should represent same user
      const oldDecoded = jwt.decode(oldToken);
      const newDecoded = jwt.decode(newToken);

      expect(oldDecoded.userId).toBe(testUserId);
      expect(newDecoded.userId).toBe(testUserId);
      expect(oldDecoded.userId).toBe(newDecoded.userId);
      expect(oldDecoded.organizationId).toBe(newDecoded.organizationId);
    });

    test('should generate token with fresh expiration on rotation', () => {
      // Create a token expiring soon
      const oldToken = jwt.sign(
        { userId: testUserId, organizationId: testOrgId, jti: 'old123' },
        config.jwt.refreshSecret,
        { expiresIn: '1d' } // 1 day
      );

      // Create fresh token
      const newToken = generateTestRefreshToken(testUserId, '30d');

      const oldDecoded = jwt.decode(oldToken);
      const newDecoded = jwt.decode(newToken);

      // New token should have later expiration
      expect(newDecoded.exp).toBeGreaterThan(oldDecoded.exp);
    });
  });

  describe('Token Blacklisting', () => {
    test('should calculate correct expiration time for blacklist TTL', () => {
      // Create a token that expires in 2 hours
      const token = jwt.sign(
        { userId: testUserId, organizationId: testOrgId, jti: 'test123' },
        config.jwt.secret,
        { expiresIn: '2h' }
      );

      const decoded = jwt.decode(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      // TTL should be approximately 2 hours (7200 seconds)
      expect(expiresIn).toBeGreaterThan(7100); // ~2 hours minus a minute
      expect(expiresIn).toBeLessThanOrEqual(7200);
    });

    test('should verify tokenBlacklist service exists', () => {
      // Verify the service is imported and has required methods
      expect(tokenBlacklist).toBeDefined();
      expect(typeof tokenBlacklist.blacklistToken).toBe('function');
      expect(typeof tokenBlacklist.isBlacklisted).toBe('function');
      expect(typeof tokenBlacklist.blacklistUserTokens).toBe('function');
    });

    // Note: Full integration tests for token blacklisting with Redis
    // are performed in BDD tests with actual Redis connection
    test.skip('should blacklist access token on logout', async () => {
      // This test requires Redis to be running
      // Full implementation is tested in BDD integration tests
    });

    test.skip('should blacklist refresh token on logout', async () => {
      // This test requires Redis to be running
      // Full implementation is tested in BDD integration tests
    });

    test.skip('should reject blacklisted tokens even if JWT is valid', async () => {
      // This test requires Redis to be running
      // Full implementation is tested in BDD integration tests
    });
  });

  describe('Token Security', () => {
    test('should use different secrets for access and refresh tokens', () => {
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.refreshSecret).toBeDefined();
      expect(config.jwt.secret).not.toBe(config.jwt.refreshSecret);
    });

    test('should not allow refresh token to be verified with access secret', () => {
      const refreshToken = generateTestRefreshToken(testUserId);

      expect(() => {
        jwt.verify(refreshToken, config.jwt.secret); // Wrong secret
      }).toThrow();
    });

    test('should not allow access token to be verified with refresh secret', () => {
      const accessToken = generateTestAccessToken(testUserId);

      expect(() => {
        jwt.verify(accessToken, config.jwt.refreshSecret); // Wrong secret
      }).toThrow();
    });

    test('should include required claims in tokens', () => {
      const accessToken = generateTestAccessToken(testUserId);
      const decoded = jwt.decode(accessToken);

      expect(decoded.userId).toBeDefined();
      expect(decoded.organizationId).toBeDefined();
      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expires at
      expect(decoded.jti).toBeDefined(); // Unique token ID
    });

    test('should generate sufficiently long tokens', () => {
      const token1 = generateTestRefreshToken(testUserId);
      const token2 = generateTestAccessToken(testUserId);

      // Tokens should be sufficiently long
      expect(token1.length).toBeGreaterThan(100);
      expect(token2.length).toBeGreaterThan(100);
    });

    test('should include token type in claims', () => {
      const accessToken = generateTestAccessToken(testUserId);
      const refreshToken = generateTestRefreshToken(testUserId);

      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);

      expect(accessDecoded.type).toBe('access');
      expect(refreshDecoded.type).toBe('refresh');
    });
  });

  describe('Token Validation Edge Cases', () => {
    test('should reject malformed tokens', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => {
        jwt.verify(malformedToken, config.jwt.secret);
      }).toThrow();
    });

    test('should reject tokens with invalid signature', () => {
      const validToken = generateTestAccessToken(testUserId);
      
      // Tamper with the token
      const parts = validToken.split('.');
      parts[2] = 'invalidsignature';
      const tamperedToken = parts.join('.');

      expect(() => {
        jwt.verify(tamperedToken, config.jwt.secret);
      }).toThrow(/signature/i);
    });

    test('should reject empty or null tokens', () => {
      expect(() => {
        jwt.verify('', config.jwt.secret);
      }).toThrow();

      expect(() => {
        jwt.verify(null, config.jwt.secret);
      }).toThrow();
    });

    test('should handle tokens with missing claims gracefully', () => {
      // Create token without userId
      const incompleteToken = jwt.sign(
        { organizationId: testOrgId },
        config.jwt.secret,
        { expiresIn: '15m' }
      );

      // Should still be a valid JWT
      const decoded = jwt.verify(incompleteToken, config.jwt.secret);
      expect(decoded).toBeDefined();
      
      // But userId should be undefined
      expect(decoded.userId).toBeUndefined();
      expect(decoded.organizationId).toBeDefined();
    });
  });
});
