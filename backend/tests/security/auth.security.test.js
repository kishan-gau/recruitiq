import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock dependencies BEFORE importing module under test
const mockPool = {
  query: jest.fn(),
};

const mockTokenBlacklist = {
  isBlacklisted: jest.fn().mockResolvedValue(false),
  areUserTokensBlacklisted: jest.fn().mockResolvedValue(false),
  add: jest.fn().mockResolvedValue(true),
};

const mockAccountLockout = {
  isLocked: jest.fn().mockResolvedValue(false),
  recordFailedAttempt: jest.fn(),
  resetAttempts: jest.fn(),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockPool,
}));

jest.unstable_mockModule('../../src/services/tokenBlacklist.js', () => ({
  default: mockTokenBlacklist,
}));

jest.unstable_mockModule('../../src/services/accountLockout.js', () => ({
  default: mockAccountLockout,
}));

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.unstable_mockModule('../../src/config/index.js', () => ({
  default: {
    env: 'test',
    jwt: {
      secret: 'test-secret-key-32-characters-long',
      accessSecret: 'test-access-secret-key-32-chars',
      refreshSecret: 'test-refresh-secret-key-32-char',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

// Import AFTER mocking
const { authenticate } = await import('../../src/middleware/auth.js');
const config = (await import('../../src/config/index.js')).default;
const logger = (await import('../../src/utils/logger.js')).default;

describe('Authentication Security Integration Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      cookies: {},
      ip: '192.168.1.100',
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Default successful user query
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 'user-123',
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          user_type: 'tenant',
          avatar_url: null,
          email_verified: true,
          phone: null,
          mfa_enabled: false,
          role_id: 'role-456',
          legacy_role: null,
          additional_permissions: [],
          role_name: 'member',
          role_display_name: 'Member',
          role_type: 'standard',
          role_level: 1,
          organization_name: 'Test Org',
          organization_tier: 'professional',
          subscription_status: 'active',
          permissions: ['read:candidates', 'write:candidates'],
        },
      ],
    });
  });

  // ============================================================================
  // JWT TOKEN VALIDATION
  // ============================================================================

  describe('JWT Token Validation', () => {
    it('should reject request without token', async () => {
      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid bearer token format', async () => {
      mockReq.headers.authorization = 'Invalid token-format';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    });

    it('should accept valid JWT token from Authorization header', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe('user-123');
    });

    it('should accept valid JWT token from cookie', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.cookies.accessToken = token;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
    });

    it('should prefer cookie token over Authorization header', async () => {
      const cookieToken = jwt.sign(
        { userId: 'user-cookie', email: 'cookie@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const headerToken = jwt.sign(
        { userId: 'user-header', email: 'header@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.cookies.accessToken = cookieToken;
      mockReq.headers.authorization = `Bearer ${headerToken}`;

      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-cookie',
            email: 'cookie@example.com',
            organization_id: '550e8400-e29b-41d4-a716-446655440000',
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user.id).toBe('user-cookie');
    });

    it('should reject expired JWT token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    });

    it('should reject token with invalid signature', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    });

    it('should reject malformed JWT token', async () => {
      mockReq.headers.authorization = 'Bearer invalid.token.format';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    });
  });

  // ============================================================================
  // TOKEN BLACKLIST VALIDATION
  // ============================================================================

  describe('Token Blacklist', () => {
    it('should reject blacklisted token', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockTokenBlacklist.isBlacklisted.mockResolvedValueOnce(true);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockTokenBlacklist.isBlacklisted).toHaveBeenCalledWith(token);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token has been revoked',
      });
    });

    it('should reject token when all user tokens are blacklisted', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockTokenBlacklist.areUserTokensBlacklisted.mockResolvedValueOnce(true);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Session has been invalidated',
      });
    });

    it('should check user token blacklist with correct parameters', async () => {
      const iat = Math.floor(Date.now() / 1000);
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com', iat },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockTokenBlacklist.areUserTokensBlacklisted).toHaveBeenCalledWith(
        'user-123',
        iat
      );
    });
  });

  // ============================================================================
  // USER VALIDATION
  // ============================================================================

  describe('User Validation', () => {
    it('should reject if user not found in database', async () => {
      const token = jwt.sign(
        { userId: 'nonexistent-user', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'User not found',
      });
    });

    it('should reject if user is soft-deleted', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // WHERE deleted_at IS NULL

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should attach user information to request', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        user_type: 'tenant',
        role: 'member',
        role_id: 'role-456',
        role_level: 1,
        role_display_name: 'Member',
        avatarUrl: null,
        phone: null,
        mfa_enabled: false,
        permissions: ['read:candidates', 'write:candidates'],
        emailVerified: true,
        organization_id: '550e8400-e29b-41d4-a716-446655440000',
        organization_name: 'Test Org',
        organization_tier: 'professional',
        tier: 'professional',
        subscription_status: 'active',
      });
    });
  });

  // ============================================================================
  // SUBSCRIPTION & ORGANIZATION VALIDATION
  // ============================================================================

  describe('Subscription Validation', () => {
    it('should reject tenant user with canceled subscription', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: '550e8400-e29b-41d4-a716-446655440000',
            user_type: 'tenant',
            subscription_status: 'canceled',
            role_name: 'member',
            permissions: [],
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Organization subscription is not active',
      });
    });

    it('should reject tenant user with suspended subscription', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: '550e8400-e29b-41d4-a716-446655440000',
            user_type: 'tenant',
            subscription_status: 'suspended',
            role_name: 'member',
            permissions: [],
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should allow tenant user with active subscription', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });

    it('should allow non-tenant users regardless of subscription', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'candidate@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: null,
            user_type: 'candidate',
            subscription_status: null,
            role_name: null,
            permissions: [],
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ROW-LEVEL SECURITY (RLS) CONTEXT
  // ============================================================================

  describe('Row-Level Security Context', () => {
    it('should set RLS context for tenant users', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      // Should call set_config with organization_id
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT set_config('app.current_organization_id', $1, true)",
        ['550e8400-e29b-41d4-a716-446655440000']
      );
    });

    it('should not set RLS context for non-tenant users', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'candidate@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: null,
            user_type: 'candidate',
            role_name: null,
            permissions: [],
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Should not call set_config
      expect(mockPool.query).toHaveBeenCalledTimes(2); // Only user query and last_login update
    });

    it('should reject invalid organization_id format', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: 'invalid-uuid-format',
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid organization context',
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Invalid organization_id format',
        { userId: 'user-123' }
      );
    });

    it('should use parameterized query to prevent SQL injection', async () => {
      const maliciousOrgId = "'; DROP TABLE users; --";
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-123',
            organization_id: maliciousOrgId,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Should reject due to invalid UUID format
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid organization context',
      });
    });
  });

  // ============================================================================
  // BCRYPT PASSWORD HASHING
  // ============================================================================

  describe('Bcrypt Password Security', () => {
    it('should hash passwords with sufficient rounds', async () => {
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify correct password', async () => {
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'SecurePassword123!';
      
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should handle empty passwords securely', async () => {
      const emptyPassword = '';
      const hash = await bcrypt.hash(emptyPassword, 10);

      const isValid = await bcrypt.compare(emptyPassword, hash);

      expect(isValid).toBe(true);
      expect(await bcrypt.compare('notempty', hash)).toBe(false);
    });
  });

  // ============================================================================
  // JWT TOKEN GENERATION
  // ============================================================================

  describe('JWT Token Generation', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'member',
      };

      const token = jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: '15m',
      });

      const decoded = jwt.verify(token, config.jwt.accessSecret);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('member');
    });

    it('should generate valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        organizationId: 'org-456',
      };

      const token = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: '7d',
      });

      const decoded = jwt.verify(token, config.jwt.refreshSecret);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.organizationId).toBe('org-456');
    });

    it('should not decode access token with refresh secret', () => {
      const token = jwt.sign(
        { userId: 'user-123' },
        config.jwt.accessSecret,
        { expiresIn: '15m' }
      );

      expect(() => {
        jwt.verify(token, config.jwt.refreshSecret);
      }).toThrow();
    });

    it('should not decode refresh token with access secret', () => {
      const token = jwt.sign(
        { userId: 'user-123' },
        config.jwt.refreshSecret,
        { expiresIn: '7d' }
      );

      expect(() => {
        jwt.verify(token, config.jwt.accessSecret);
      }).toThrow();
    });

    it('should include issued at timestamp', () => {
      const token = jwt.sign(
        { userId: 'user-123' },
        config.jwt.accessSecret,
        { expiresIn: '15m' }
      );

      const decoded = jwt.verify(token, config.jwt.accessSecret);

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });

    it('should include expiration timestamp', () => {
      const token = jwt.sign(
        { userId: 'user-123' },
        config.jwt.accessSecret,
        { expiresIn: '15m' }
      );

      const decoded = jwt.verify(token, config.jwt.accessSecret);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  // ============================================================================
  // LAST LOGIN TRACKING
  // ============================================================================

  describe('Last Login Tracking', () => {
    it('should update last login timestamp and IP', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      mockReq.ip = '203.0.113.42';

      await authenticate(mockReq, mockRes, mockNext);

      // Check if last login update query was called (async, won't wait for it)
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
        ['203.0.113.42', 'user-123']
      );
    });

    it('should handle last login update errors gracefully', async () => {
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      
      // Mock the update query to reject
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'user-123', role_name: 'member', permissions: [], organization_id: '550e8400-e29b-41d4-a716-446655440000', user_type: 'tenant', subscription_status: 'active' }] })
        .mockResolvedValueOnce({ rows: [] }) // RLS context
        .mockRejectedValueOnce(new Error('Database error'));

      await authenticate(mockReq, mockRes, mockNext);

      // Should still call next() even if update fails
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
