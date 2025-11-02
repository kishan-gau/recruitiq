import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock dependencies BEFORE importing module under test
const mockPool = {
  query: jest.fn(),
};

const mockTokenBlacklist = {
  isBlacklisted: jest.fn().mockResolvedValue(false),
  areUserTokensBlacklisted: jest.fn().mockResolvedValue(false),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({
  default: mockPool,
}));

jest.unstable_mockModule('../../src/services/tokenBlacklist.js', () => ({
  default: mockTokenBlacklist,
}));

jest.unstable_mockModule('../../src/services/accountLockout.js', () => ({
  default: {
    isLocked: jest.fn().mockResolvedValue(false),
  },
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

describe('RLS SQL Injection Prevention Tests', () => {
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
  // SQL INJECTION ATTACK VECTORS
  // ============================================================================

  describe('SQL Injection Attack Vectors', () => {
    it('should reject SQL injection in organization_id - DROP TABLE', async () => {
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
      expect(logger.error).toHaveBeenCalledWith(
        'Invalid organization_id format',
        { userId: 'user-123' }
      );
    });

    it('should reject SQL injection - UNION SELECT', async () => {
      const maliciousOrgId = "' UNION SELECT * FROM users WHERE '1'='1";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Invalid organization context',
      });
    });

    it('should reject SQL injection - boolean-based blind SQL injection', async () => {
      const maliciousOrgId = "' OR '1'='1";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject SQL injection - time-based blind SQL injection', async () => {
      const maliciousOrgId = "'; SELECT pg_sleep(10); --";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject SQL injection - stacked queries', async () => {
      const maliciousOrgId = "'; DELETE FROM sessions WHERE '1'='1'; --";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject SQL injection - comment-based bypass', async () => {
      const maliciousOrgId = "admin'--";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject SQL injection - hex encoding bypass attempt', async () => {
      const maliciousOrgId = "0x61646d696e"; // 'admin' in hex
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject SQL injection - NULL byte injection', async () => {
      const maliciousOrgId = "admin\0";
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

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================================================
  // PARAMETERIZED QUERY VALIDATION
  // ============================================================================

  describe('Parameterized Query Usage', () => {
    it('should use parameterized query for RLS context setting', async () => {
      const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      // Verify parameterized query is used (not string concatenation)
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT set_config('app.current_organization_id', $1, true)",
        [validOrgId]
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should NOT use string concatenation for RLS context', async () => {
      const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      // Should NOT see queries like this (string concatenation):
      // `SELECT set_config('app.current_organization_id', '${organizationId}', true)`
      const queryCalls = mockPool.query.mock.calls;
      for (const call of queryCalls) {
        const query = call[0];
        if (query.includes('set_config')) {
          // Verify it uses $1 parameter, not string interpolation
          expect(query).toContain('$1');
          expect(query).not.toMatch(/\$\{.*\}/); // No template literals
        }
      }
    });

    it('should validate UUID format before setting RLS context', async () => {
      const invalidUuid = 'not-a-valid-uuid-format';
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
            organization_id: invalidUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Should reject before attempting to set RLS context
      expect(mockRes.status).toHaveBeenCalledWith(403);
      
      // Verify set_config was never called with invalid UUID
      const setConfigCalls = mockPool.query.mock.calls.filter(
        call => call[0].includes('set_config')
      );
      expect(setConfigCalls).toHaveLength(0);
    });
  });

  // ============================================================================
  // UUID FORMAT VALIDATION
  // ============================================================================

  describe('UUID Format Validation', () => {
    it('should accept valid UUIDv4', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
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
            organization_id: validUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });

    it('should reject UUID with extra characters', async () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-446655440000extra';
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
            organization_id: invalidUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject UUID with wrong format', async () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-44665544000'; // Missing digit
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
            organization_id: invalidUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should reject UUID with invalid characters', async () => {
      const invalidUuid = '550e8400-e29b-41d4-a716-44665544000g'; // 'g' is invalid hex
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
            organization_id: invalidUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle tenant user with no organization_id gracefully', async () => {
      const emptyOrgId = '';
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
            organization_id: emptyOrgId,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Empty organization_id for tenant is allowed (edge case for setup)
      // RLS context simply won't be set, which is acceptable
      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept uppercase UUID', async () => {
      const uppercaseUuid = '550E8400-E29B-41D4-A716-446655440000';
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
            organization_id: uppercaseUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(403);
    });

    it('should accept mixed case UUID', async () => {
      const mixedCaseUuid = '550e8400-E29B-41d4-A716-446655440000';
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
            organization_id: mixedCaseUuid,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RLS CONTEXT ISOLATION
  // ============================================================================

  describe('RLS Context Isolation', () => {
    it('should set RLS context only for tenant users', async () => {
      const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
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
            organization_id: validOrgId,
            user_type: 'tenant',
            role_name: 'member',
            permissions: [],
            subscription_status: 'active',
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Should call set_config for tenant users
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT set_config('app.current_organization_id', $1, true)",
        [validOrgId]
      );
    });

    it('should NOT set RLS context for non-tenant users', async () => {
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
            subscription_status: null,
          },
        ],
      });

      await authenticate(mockReq, mockRes, mockNext);

      // Should NOT call set_config for non-tenant users
      const setConfigCalls = mockPool.query.mock.calls.filter(
        call => call[0].includes('set_config')
      );
      expect(setConfigCalls).toHaveLength(0);
    });

    it('should use session-local context (true parameter)', async () => {
      const validOrgId = '550e8400-e29b-41d4-a716-446655440000';
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      await authenticate(mockReq, mockRes, mockNext);

      // Verify the query uses `true` for session-local context
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT set_config('app.current_organization_id', $1, true)",
        [validOrgId]
      );
      
      // The 'true' parameter ensures context is transaction-local and doesn't bleed to other requests
    });
  });
});
