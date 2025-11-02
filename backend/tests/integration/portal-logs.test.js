/**
 * Integration Tests for Portal Logs API
 * 
 * Tests that platform admins can access centralized logs from tenant VPS instances
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock central database
const mockCentralDb = {
  query: jest.fn(),
};

jest.unstable_mockModule('../../src/config/centralDatabase.js', () => ({
  queryCentralDb: mockCentralDb.query,
  getCentralPool: jest.fn(() => ({ connected: true })),
  closeCentralPool: jest.fn(),
}));

// Mock logger with all exports
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logSecurityEvent: jest.fn(),
};

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: mockLogger,
  SecurityEventType: {
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    PORTAL_LOGS_ACCESSED: 'portal_logs_accessed',
  },
  logSecurityEvent: mockLogger.logSecurityEvent,
  trackFailedLogin: jest.fn(),
  generateRequestId: jest.fn(() => 'test-request-id'),
  createRequestLogger: jest.fn(() => mockLogger),
  logPerformance: jest.fn(),
  logWithContext: jest.fn(),
  logDatabaseError: jest.fn(),
}));

// Import app after mocks
const { default: app } = await import('../../src/server.js');
const { default: config } = await import('../../src/config/index.js');

describe('Portal Logs API - Integration Tests', () => {
  let platformAdminToken;
  let tenantUserToken;

  beforeAll(() => {
    // Create platform admin token
    platformAdminToken = jwt.sign(
      {
        userId: 'admin-123',
        email: 'admin@platform.com',
        userType: 'platform',
        role: 'platform_admin',
        permissions: ['portal.view', 'security:view_logs'],
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Create regular tenant user token (should not have access)
    tenantUserToken = jwt.sign(
      {
        userId: 'user-456',
        email: 'user@tenant.com',
        userType: 'tenant',
        organizationId: 'org-789',
        role: 'member',
        permissions: [],
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET /api/portal/logs - System Logs
  // ============================================================================

  describe('GET /api/portal/logs', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/portal/logs')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should require platform user access', async () => {
      const response = await request(app)
        .get('/api/portal/logs')
        .set('Authorization', `Bearer ${tenantUserToken}`)
        .expect(403);

      expect(response.body.error).toContain('platform');
    });

    it('should fetch logs for platform admin', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
        .mockResolvedValueOnce({ // Logs query
          rows: [
            {
              id: 1,
              timestamp: '2025-11-01T10:00:00Z',
              level: 'info',
              message: 'User login',
              tenant_id: 'tenant-123',
              instance_id: 'instance-456',
              request_id: 'req-789',
              user_id: 'user-abc',
              ip_address: '192.168.1.1',
              endpoint: '/api/auth/login',
              method: 'POST',
            },
          ],
        });

      const response = await request(app)
        .get('/api/portal/logs')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toHaveLength(1);
      expect(response.body.data.logs[0].message).toBe('User login');
      expect(response.body.data.pagination).toBeDefined();
      expect(mockCentralDb.query).toHaveBeenCalledTimes(2);
    });

    it('should filter logs by tenant_id', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?tenantId=tenant-123')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const countQuery = mockCentralDb.query.mock.calls[0][0];
      const logsQuery = mockCentralDb.query.mock.calls[1][0];
      
      expect(countQuery).toContain('tenant_id = $1');
      expect(logsQuery).toContain('tenant_id = $1');
      expect(mockCentralDb.query.mock.calls[0][1]).toContain('tenant-123');
    });

    it('should filter logs by instance_id', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?instanceId=instance-789')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockCentralDb.query.mock.calls[0][1]).toContain('instance-789');
    });

    it('should filter logs by level', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?level=error')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockCentralDb.query.mock.calls[0][1]).toContain('error');
    });

    it('should filter logs by date range', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?startDate=2025-11-01&endDate=2025-11-02')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const values = mockCentralDb.query.mock.calls[0][1];
      expect(values).toContain('2025-11-01');
      expect(values).toContain('2025-11-02');
    });

    it('should search logs by message', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '8' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?search=login')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const query = mockCentralDb.query.mock.calls[0][0];
      expect(query).toContain('ILIKE');
      expect(mockCentralDb.query.mock.calls[0][1]).toContainEqual('%login%');
    });

    it('should support pagination', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs?limit=50&offset=25')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const logsQuery = mockCentralDb.query.mock.calls[1][0];
      const values = mockCentralDb.query.mock.calls[1][1];
      
      expect(logsQuery).toContain('LIMIT');
      expect(logsQuery).toContain('OFFSET');
      expect(values).toContain(50);
      expect(values).toContain(25);
    });

    it('should enforce maximum limit of 1000', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '5000' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/portal/logs?limit=9999')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data.pagination.limit).toBe(1000);
      const values = mockCentralDb.query.mock.calls[1][1];
      expect(values).toContain(1000);
    });

    it('should log security event for logs access', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, message: 'Test' }] });

      await request(app)
        .get('/api/portal/logs?tenantId=tenant-123')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'portal_logs_accessed',
        expect.objectContaining({
          severity: 'info',
          adminId: 'admin-123',
          filters: expect.objectContaining({ tenantId: 'tenant-123' }),
        }),
        expect.any(Object)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockCentralDb.query.mockRejectedValueOnce(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/portal/logs')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch logs');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET /api/portal/logs/security - Security Events
  // ============================================================================

  describe('GET /api/portal/logs/security', () => {
    it('should fetch security events', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              timestamp: '2025-11-01T10:00:00Z',
              event_type: 'login_failure',
              severity: 'warning',
              tenant_id: 'tenant-123',
              user_email: 'user@example.com',
              ip_address: '192.168.1.1',
            },
          ],
        });

      const response = await request(app)
        .get('/api/portal/logs/security')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toHaveLength(1);
      expect(response.body.data.events[0].event_type).toBe('login_failure');
    });

    it('should filter by event type', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/security?eventType=unauthorized_access')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockCentralDb.query.mock.calls[0][1]).toContain('unauthorized_access');
    });

    it('should filter by severity', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/security?severity=critical')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockCentralDb.query.mock.calls[0][1]).toContain('critical');
    });

    it('should combine multiple filters', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/security?tenantId=tenant-123&severity=error&eventType=data_breach')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const values = mockCentralDb.query.mock.calls[0][1];
      expect(values).toContain('tenant-123');
      expect(values).toContain('error');
      expect(values).toContain('data_breach');
    });

    it('should log security event for access', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/security')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'portal_security_events_accessed',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // GET /api/portal/logs/search - Full-Text Search
  // ============================================================================

  describe('GET /api/portal/logs/search', () => {
    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/portal/logs/search')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400);

      expect(response.body.error).toContain('at least 3 characters');
    });

    it('should require minimum 3 characters', async () => {
      const response = await request(app)
        .get('/api/portal/logs/search?q=ab')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(400);

      expect(response.body.error).toContain('at least 3 characters');
    });

    it('should search logs by query', async () => {
      mockCentralDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            timestamp: '2025-11-01T10:00:00Z',
            level: 'error',
            message: 'Database connection failed',
            tenant_id: 'tenant-123',
          },
        ],
      });

      const response = await request(app)
        .get('/api/portal/logs/search?q=database')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(1);
      expect(response.body.data.query).toBe('database');
      
      const query = mockCentralDb.query.mock.calls[0][0];
      expect(query).toContain('ILIKE');
    });

    it('should filter search by tenant', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/search?q=error&tenantId=tenant-123')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const query = mockCentralDb.query.mock.calls[0][0];
      expect(query).toContain('tenant_id = $2');
      expect(mockCentralDb.query.mock.calls[0][1]).toContain('tenant-123');
    });

    it('should limit search results', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/search?q=test&limit=100')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const values = mockCentralDb.query.mock.calls[0][1];
      expect(values).toContain(100);
    });

    it('should enforce maximum limit of 500', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/search?q=test&limit=9999')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const values = mockCentralDb.query.mock.calls[0][1];
      expect(values).toContain(500);
    });

    it('should log security event for search', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/search?q=sensitive')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'portal_logs_searched',
        expect.objectContaining({
          searchQuery: 'sensitive',
        }),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // GET /api/portal/logs/download - CSV Export
  // ============================================================================

  describe('GET /api/portal/logs/download', () => {
    it('should download logs as CSV', async () => {
      mockCentralDb.query.mockResolvedValueOnce({
        rows: [
          {
            timestamp: '2025-11-01T10:00:00Z',
            level: 'info',
            message: 'User login',
            tenant_id: 'tenant-123',
            instance_id: 'instance-456',
            user_id: 'user-789',
            ip_address: '192.168.1.1',
            endpoint: '/api/auth/login',
            method: 'POST',
          },
        ],
      });

      const response = await request(app)
        .get('/api/portal/logs/download')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('logs-');
      expect(response.text).toContain('timestamp,level,message');
      expect(response.text).toContain('User login');
    });

    it('should filter download by tenant', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/download?tenantId=tenant-123')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const query = mockCentralDb.query.mock.calls[0][0];
      expect(query).toContain('tenant_id = $1');
    });

    it('should filter download by date range', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/download?startDate=2025-11-01&endDate=2025-11-02')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const values = mockCentralDb.query.mock.calls[0][1];
      expect(values).toContain('2025-11-01');
      expect(values).toContain('2025-11-02');
    });

    it('should limit download to 10000 records', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/download')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      const query = mockCentralDb.query.mock.calls[0][0];
      expect(query).toContain('LIMIT 10000');
    });

    it('should escape CSV special characters', async () => {
      mockCentralDb.query.mockResolvedValueOnce({
        rows: [
          {
            timestamp: '2025-11-01T10:00:00Z',
            level: 'error',
            message: 'Error with "quotes" and ,commas,',
            tenant_id: 'tenant-123',
            instance_id: null,
            user_id: null,
            ip_address: null,
            endpoint: null,
            method: null,
          },
        ],
      });

      const response = await request(app)
        .get('/api/portal/logs/download')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.text).toContain('""quotes""'); // Escaped quotes
      expect(response.text).toContain('"Error with ""quotes"" and ,commas,"');
    });

    it('should log security event with warning severity', async () => {
      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .get('/api/portal/logs/download')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(
        'portal_logs_downloaded',
        expect.objectContaining({
          severity: 'warning',
          adminId: 'admin-123',
        }),
        expect.any(Object)
      );
    });
  });

  // ============================================================================
  // GET /api/portal/stats - Platform Statistics
  // ============================================================================

  describe('GET /api/portal/stats', () => {
    it('should fetch platform statistics', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Tenants
        .mockResolvedValueOnce({ rows: [{ count: '12' }] }) // Instances
        .mockResolvedValueOnce({ // Log counts
          rows: [
            { level: 'info', count: '100' },
            { level: 'error', count: '10' },
          ],
        })
        .mockResolvedValueOnce({ // Security counts
          rows: [
            { severity: 'warning', count: '5' },
            { severity: 'critical', count: '2' },
          ],
        });

      const response = await request(app)
        .get('/api/portal/stats')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenants).toBe(5);
      expect(response.body.data.instances).toBe(12);
      expect(response.body.data.logsByLevel.info).toBe(100);
      expect(response.body.data.logsByLevel.error).toBe(10);
      expect(response.body.data.securityBySeverity.warning).toBe(5);
      expect(response.body.data.securityBySeverity.critical).toBe(2);
    });

    it('should handle missing data gracefully', async () => {
      mockCentralDb.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/portal/stats')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200);

      expect(response.body.data.tenants).toBe(0);
      expect(response.body.data.logsByLevel).toEqual({});
      expect(response.body.data.securityBySeverity).toEqual({});
    });
  });

  // ============================================================================
  // AUTHORIZATION
  // ============================================================================

  describe('Authorization', () => {
    it('should block tenant users from portal routes', async () => {
      await request(app)
        .get('/api/portal/logs')
        .set('Authorization', `Bearer ${tenantUserToken}`)
        .expect(403);

      await request(app)
        .get('/api/portal/logs/security')
        .set('Authorization', `Bearer ${tenantUserToken}`)
        .expect(403);

      await request(app)
        .get('/api/portal/logs/search?q=test')
        .set('Authorization', `Bearer ${tenantUserToken}`)
        .expect(403);

      await request(app)
        .get('/api/portal/stats')
        .set('Authorization', `Bearer ${tenantUserToken}`)
        .expect(403);
    });

    it('should require portal.view permission', async () => {
      const limitedAdminToken = jwt.sign(
        {
          userId: 'admin-limited',
          email: 'limited@platform.com',
          userType: 'platform',
          role: 'platform_viewer',
          permissions: [], // No portal.view
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/portal/logs')
        .set('Authorization', `Bearer ${limitedAdminToken}`)
        .expect(403);
    });
  });
});
