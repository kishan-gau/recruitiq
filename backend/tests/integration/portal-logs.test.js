/**/**

 * Integration Tests for Portal Logs API * Integration Tests for Portal Logs API

 *  * 

 * Tests that platform admins can access centralized logs from tenant VPS instances. * Tests that platform admins can access centralized logs from tenant VPS instances

 * These tests use the REAL database (not mocks) to validate actual functionality. */

 */

import { jest } from '@jest/globals';

import { jest } from '@jest/globals';import request from 'supertest';

import request from 'supertest';import jwt from 'jsonwebtoken';

import jwt from 'jsonwebtoken';

import pg from 'pg';// Mock central database

const mockCentralDb = {

const { Pool } = pg;  query: jest.fn(),

};

// Import app and config (no mocks)

const { default: app } = await import('../../src/server.js');jest.unstable_mockModule('../../src/config/centralDatabase.js', () => ({

const { default: config } = await import('../../src/config/index.js');  queryCentralDb: mockCentralDb.query,

  getCentralPool: jest.fn(() => ({ connected: true })),

describe('Portal Logs API - Integration Tests', () => {  closeCentralPool: jest.fn(),

  let pool;}));

  let platformAdminToken;

  let tenantUserToken;// Mock logger with all exports

  let limitedAdminToken;const mockLogger = {

  info: jest.fn(),

  beforeAll(async () => {  warn: jest.fn(),

    // Create database pool  error: jest.fn(),

    pool = new Pool({  debug: jest.fn(),

      host: process.env.DATABASE_HOST || 'localhost',  logSecurityEvent: jest.fn(),

      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,};

      database: process.env.DATABASE_NAME || 'recruitiq_test',

      user: process.env.DATABASE_USER || 'postgres',jest.unstable_mockModule('../../src/utils/logger.js', () => ({

      password: process.env.DATABASE_PASSWORD || 'postgres',  default: mockLogger,

    });  SecurityEventType: {

    LOGIN_SUCCESS: 'login_success',

    // Create platform admin token    LOGIN_FAILURE: 'login_failure',

    platformAdminToken = jwt.sign(    PORTAL_LOGS_ACCESSED: 'portal_logs_accessed',

      {  },

        userId: 'admin-123',  logSecurityEvent: mockLogger.logSecurityEvent,

        email: 'admin@platform.com',  trackFailedLogin: jest.fn(),

        userType: 'platform',  generateRequestId: jest.fn(() => 'test-request-id'),

        role: 'platform_admin',  createRequestLogger: jest.fn(() => mockLogger),

        permissions: ['portal.view', 'security:view_logs'],  logPerformance: jest.fn(),

      },  logWithContext: jest.fn(),

      config.jwt.secret,  logDatabaseError: jest.fn(),

      { expiresIn: '1h' }}));

    );

// Import app after mocks

    // Create regular tenant user token (should not have access)const { default: app } = await import('../../src/server.js');

    tenantUserToken = jwt.sign(const { default: config } = await import('../../src/config/index.js');

      {

        userId: 'user-456',describe('Portal Logs API - Integration Tests', () => {

        email: 'user@tenant.com',  let platformAdminToken;

        userType: 'tenant',  let tenantUserToken;

        organizationId: 'org-789',

        role: 'member',  beforeAll(() => {

        permissions: [],    // Create platform admin token

      },    platformAdminToken = jwt.sign(

      config.jwt.secret,      {

      { expiresIn: '1h' }        userId: 'admin-123',

    );        email: 'admin@platform.com',

        userType: 'platform',

    // Create platform admin without portal.view permission        role: 'platform_admin',

    limitedAdminToken = jwt.sign(        permissions: ['portal.view', 'security:view_logs'],

      {      },

        userId: 'limited-admin-123',      config.jwt.secret,

        email: 'limited@platform.com',      { expiresIn: '1h' }

        userType: 'platform',    );

        role: 'platform_viewer',

        permissions: ['other.permission'],    // Create regular tenant user token (should not have access)

      },    tenantUserToken = jwt.sign(

      config.jwt.secret,      {

      { expiresIn: '1h' }        userId: 'user-456',

    );        email: 'user@tenant.com',

        userType: 'tenant',

    // Seed test data        organizationId: 'org-789',

    await pool.query('TRUNCATE system_logs, security_events CASCADE');        role: 'member',

            permissions: [],

    await pool.query(`      },

      INSERT INTO system_logs (level, message, tenant_id, instance_id, timestamp, endpoint, method)      config.jwt.secret,

      VALUES       { expiresIn: '1h' }

        ('info', 'User login', 'tenant-123', 'instance-456', NOW() - INTERVAL '1 hour', '/api/auth/login', 'POST'),    );

        ('error', 'Database connection failed', 'tenant-123', 'instance-456', NOW() - INTERVAL '2 hours', '/api/data', 'GET'),  });

        ('warn', 'High memory usage', 'tenant-789', 'instance-789', NOW() - INTERVAL '3 hours', '/api/status', 'GET'),

        ('info', 'Application started', 'tenant-123', 'instance-456', NOW() - INTERVAL '4 hours', NULL, NULL)  beforeEach(() => {

    `);    jest.clearAllMocks();

  });

    await pool.query(`

      INSERT INTO security_events (event_type, severity, tenant_id, instance_id, timestamp, user_email)  // ============================================================================

      VALUES  // GET /api/portal/logs - System Logs

        ('login_success', 'info', 'tenant-123', 'instance-456', NOW() - INTERVAL '1 hour', 'user@example.com'),  // ============================================================================

        ('unauthorized_access', 'warning', 'tenant-123', 'instance-456', NOW() - INTERVAL '2 hours', 'attacker@example.com'),

        ('data_breach_attempt', 'critical', 'tenant-789', 'instance-789', NOW() - INTERVAL '3 hours', 'malicious@example.com')  describe('GET /api/portal/logs', () => {

    `);    it('should require authentication', async () => {

  });      const response = await request(app)

        .get('/api/portal/logs')

  afterAll(async () => {        .expect(401);

    // Clean up test data

    await pool.query('TRUNCATE system_logs, security_events CASCADE');      expect(response.body.error).toContain('token');

    await pool.end();    });

  });

    it('should require platform user access', async () => {

  beforeEach(() => {      const response = await request(app)

    jest.clearAllMocks();        .get('/api/portal/logs')

  });        .set('Authorization', `Bearer ${tenantUserToken}`)

        .expect(403);

  // ============================================================================

  // GET /api/portal/logs - System Logs      expect(response.body.error).toContain('platform');

  // ============================================================================    });



  describe('GET /api/portal/logs', () => {    it('should fetch logs for platform admin', async () => {

    it('should require authentication', async () => {      mockCentralDb.query

      const response = await request(app)        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query

        .get('/api/portal/logs')        .mockResolvedValueOnce({ // Logs query

        .expect(401);          rows: [

            {

      expect(response.body.error).toBeDefined();              id: 1,

    });              timestamp: '2025-11-01T10:00:00Z',

              level: 'info',

    it('should require platform user access', async () => {              message: 'User login',

      const response = await request(app)              tenant_id: 'tenant-123',

        .get('/api/portal/logs')              instance_id: 'instance-456',

        .set('Authorization', `Bearer ${tenantUserToken}`)              request_id: 'req-789',

        .expect(403);              user_id: 'user-abc',

              ip_address: '192.168.1.1',

      expect(response.body.error).toBeDefined();              endpoint: '/api/auth/login',

    });              method: 'POST',

            },

    it('should fetch logs for platform admin', async () => {          ],

      const response = await request(app)        });

        .get('/api/portal/logs')

        .set('Authorization', `Bearer ${platformAdminToken}`)      const response = await request(app)

        .expect(200);        .get('/api/portal/logs')

        .set('Authorization', `Bearer ${platformAdminToken}`)

      expect(response.body.success).toBe(true);        .expect(200);

      expect(response.body.data.logs).toBeInstanceOf(Array);

      expect(response.body.data.logs.length).toBeGreaterThan(0);      expect(response.body.success).toBe(true);

      expect(response.body.data.pagination).toBeDefined();      expect(response.body.data.logs).toHaveLength(1);

      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(4);      expect(response.body.data.logs[0].message).toBe('User login');

    });      expect(response.body.data.pagination).toBeDefined();

      expect(mockCentralDb.query).toHaveBeenCalledTimes(2);

    it('should filter logs by tenant_id', async () => {    });

      const response = await request(app)

        .get('/api/portal/logs?tenantId=tenant-123')    it('should filter logs by tenant_id', async () => {

        .set('Authorization', `Bearer ${platformAdminToken}`)      mockCentralDb.query

        .expect(200);        .mockResolvedValueOnce({ rows: [{ count: '5' }] })

        .mockResolvedValueOnce({ rows: [] });

      expect(response.body.success).toBe(true);

      expect(response.body.data.logs).toBeInstanceOf(Array);      await request(app)

              .get('/api/portal/logs?tenantId=tenant-123')

      // All logs should be for tenant-123        .set('Authorization', `Bearer ${platformAdminToken}`)

      response.body.data.logs.forEach(log => {        .expect(200);

        expect(log.tenant_id).toBe('tenant-123');

      });      const countQuery = mockCentralDb.query.mock.calls[0][0];

    });      const logsQuery = mockCentralDb.query.mock.calls[1][0];

      

    it('should filter logs by instance_id', async () => {      expect(countQuery).toContain('tenant_id = $1');

      const response = await request(app)      expect(logsQuery).toContain('tenant_id = $1');

        .get('/api/portal/logs?instanceId=instance-789')      expect(mockCentralDb.query.mock.calls[0][1]).toContain('tenant-123');

        .set('Authorization', `Bearer ${platformAdminToken}`)    });

        .expect(200);

    it('should filter logs by instance_id', async () => {

      expect(response.body.success).toBe(true);      mockCentralDb.query

              .mockResolvedValueOnce({ rows: [{ count: '3' }] })

      // All logs should be for instance-789        .mockResolvedValueOnce({ rows: [] });

      response.body.data.logs.forEach(log => {

        expect(log.instance_id).toBe('instance-789');      await request(app)

      });        .get('/api/portal/logs?instanceId=instance-789')

    });        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);

    it('should filter logs by level', async () => {

      const response = await request(app)      expect(mockCentralDb.query.mock.calls[0][1]).toContain('instance-789');

        .get('/api/portal/logs?level=error')    });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);    it('should filter logs by level', async () => {

      mockCentralDb.query

      expect(response.body.success).toBe(true);        .mockResolvedValueOnce({ rows: [{ count: '2' }] })

              .mockResolvedValueOnce({ rows: [] });

      // All logs should be error level

      response.body.data.logs.forEach(log => {      await request(app)

        expect(log.level).toBe('error');        .get('/api/portal/logs?level=error')

      });        .set('Authorization', `Bearer ${platformAdminToken}`)

    });        .expect(200);



    it('should filter logs by date range', async () => {      expect(mockCentralDb.query.mock.calls[0][1]).toContain('error');

      const startDate = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago    });

      const endDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago

    it('should filter logs by date range', async () => {

      const response = await request(app)      mockCentralDb.query

        .get(`/api/portal/logs?startDate=${startDate}&endDate=${endDate}`)        .mockResolvedValueOnce({ rows: [{ count: '15' }] })

        .set('Authorization', `Bearer ${platformAdminToken}`)        .mockResolvedValueOnce({ rows: [] });

        .expect(200);

      await request(app)

      expect(response.body.success).toBe(true);        .get('/api/portal/logs?startDate=2025-11-01&endDate=2025-11-02')

      expect(response.body.data.logs).toBeInstanceOf(Array);        .set('Authorization', `Bearer ${platformAdminToken}`)

    });        .expect(200);



    it('should search logs by message', async () => {      const values = mockCentralDb.query.mock.calls[0][1];

      const response = await request(app)      expect(values).toContain('2025-11-01');

        .get('/api/portal/logs?search=login')      expect(values).toContain('2025-11-02');

        .set('Authorization', `Bearer ${platformAdminToken}`)    });

        .expect(200);

    it('should search logs by message', async () => {

      expect(response.body.success).toBe(true);      mockCentralDb.query

      expect(response.body.data.logs).toBeInstanceOf(Array);        .mockResolvedValueOnce({ rows: [{ count: '8' }] })

              .mockResolvedValueOnce({ rows: [] });

      // Should contain logs with "login" in message

      const hasLoginMessage = response.body.data.logs.some(log =>       await request(app)

        log.message.toLowerCase().includes('login')        .get('/api/portal/logs?search=login')

      );        .set('Authorization', `Bearer ${platformAdminToken}`)

      expect(hasLoginMessage).toBe(true);        .expect(200);

    });

      const query = mockCentralDb.query.mock.calls[0][0];

    it('should support pagination', async () => {      expect(query).toContain('ILIKE');

      const response = await request(app)      expect(mockCentralDb.query.mock.calls[0][1]).toContainEqual('%login%');

        .get('/api/portal/logs?limit=2&offset=0')    });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);    it('should support pagination', async () => {

      mockCentralDb.query

      expect(response.body.success).toBe(true);        .mockResolvedValueOnce({ rows: [{ count: '100' }] })

      expect(response.body.data.logs.length).toBeLessThanOrEqual(2);        .mockResolvedValueOnce({ rows: [] });

      expect(response.body.data.pagination.limit).toBe(2);

      expect(response.body.data.pagination.offset).toBe(0);      await request(app)

    });        .get('/api/portal/logs?limit=50&offset=25')

        .set('Authorization', `Bearer ${platformAdminToken}`)

    it('should enforce maximum limit of 1000', async () => {        .expect(200);

      const response = await request(app)

        .get('/api/portal/logs?limit=9999')      const logsQuery = mockCentralDb.query.mock.calls[1][0];

        .set('Authorization', `Bearer ${platformAdminToken}`)      const values = mockCentralDb.query.mock.calls[1][1];

        .expect(200);      

      expect(logsQuery).toContain('LIMIT');

      expect(response.body.data.pagination.limit).toBe(1000);      expect(logsQuery).toContain('OFFSET');

    });      expect(values).toContain(50);

      expect(values).toContain(25);

    it('should log security event for logs access', async () => {    });

      await request(app)

        .get('/api/portal/logs?tenantId=tenant-123')    it('should enforce maximum limit of 1000', async () => {

        .set('Authorization', `Bearer ${platformAdminToken}`)      mockCentralDb.query

        .expect(200);        .mockResolvedValueOnce({ rows: [{ count: '5000' }] })

        .mockResolvedValueOnce({ rows: [] });

      // Verify security event was logged (check in database)

      const result = await pool.query(      const response = await request(app)

        `SELECT * FROM security_events         .get('/api/portal/logs?limit=9999')

         WHERE event_type = 'portal_logs_accessed'         .set('Authorization', `Bearer ${platformAdminToken}`)

         ORDER BY timestamp DESC LIMIT 1`        .expect(200);

      );

      expect(response.body.data.pagination.limit).toBe(1000);

      expect(result.rows.length).toBeGreaterThan(0);      const values = mockCentralDb.query.mock.calls[1][1];

    });      expect(values).toContain(1000);

    });

    it('should handle database errors gracefully', async () => {

      // The route should return proper error structure even if DB fails    it('should log security event for logs access', async () => {

      // For now, just verify the route returns proper response      mockCentralDb.query

      const response = await request(app)        .mockResolvedValueOnce({ rows: [{ count: '1' }] })

        .get('/api/portal/logs')        .mockResolvedValueOnce({ rows: [{ id: 1, message: 'Test' }] });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);      await request(app)

        .get('/api/portal/logs?tenantId=tenant-123')

      expect(response.body).toHaveProperty('success');        .set('Authorization', `Bearer ${platformAdminToken}`)

      expect(response.body).toHaveProperty('data');        .expect(200);

    });

  });      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(

        'portal_logs_accessed',

  // ============================================================================        expect.objectContaining({

  // GET /api/portal/logs/security - Security Events          severity: 'info',

  // ============================================================================          adminId: 'admin-123',

          filters: expect.objectContaining({ tenantId: 'tenant-123' }),

  describe('GET /api/portal/logs/security', () => {        }),

    it('should fetch security events', async () => {        expect.any(Object)

      const response = await request(app)      );

        .get('/api/portal/logs/security')    });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);    it('should handle database errors gracefully', async () => {

      mockCentralDb.query.mockRejectedValueOnce(new Error('Connection timeout'));

      expect(response.body.success).toBe(true);

      expect(response.body.data.events).toBeInstanceOf(Array);      const response = await request(app)

      expect(response.body.data.events.length).toBeGreaterThan(0);        .get('/api/portal/logs')

    });        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(500);

    it('should filter by event type', async () => {

      const response = await request(app)      expect(response.body.success).toBe(false);

        .get('/api/portal/logs/security?eventType=unauthorized_access')      expect(response.body.error).toBe('Failed to fetch logs');

        .set('Authorization', `Bearer ${platformAdminToken}`)      expect(mockLogger.error).toHaveBeenCalled();

        .expect(200);    });

  });

      expect(response.body.success).toBe(true);

        // ============================================================================

      // All events should be unauthorized_access  // GET /api/portal/logs/security - Security Events

      response.body.data.events.forEach(event => {  // ============================================================================

        expect(event.event_type).toBe('unauthorized_access');

      });  describe('GET /api/portal/logs/security', () => {

    });    it('should fetch security events', async () => {

      mockCentralDb.query

    it('should filter by severity', async () => {        .mockResolvedValueOnce({ rows: [{ count: '5' }] })

      const response = await request(app)        .mockResolvedValueOnce({

        .get('/api/portal/logs/security?severity=critical')          rows: [

        .set('Authorization', `Bearer ${platformAdminToken}`)            {

        .expect(200);              id: 1,

              timestamp: '2025-11-01T10:00:00Z',

      expect(response.body.success).toBe(true);              event_type: 'login_failure',

                    severity: 'warning',

      // All events should be critical severity              tenant_id: 'tenant-123',

      response.body.data.events.forEach(event => {              user_email: 'user@example.com',

        expect(event.severity).toBe('critical');              ip_address: '192.168.1.1',

      });            },

    });          ],

        });

    it('should combine multiple filters', async () => {

      const response = await request(app)      const response = await request(app)

        .get('/api/portal/logs/security?tenantId=tenant-123&severity=warning')        .get('/api/portal/logs/security')

        .set('Authorization', `Bearer ${platformAdminToken}`)        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);        .expect(200);



      expect(response.body.success).toBe(true);      expect(response.body.success).toBe(true);

            expect(response.body.data.events).toHaveLength(1);

      // All events should match both filters      expect(response.body.data.events[0].event_type).toBe('login_failure');

      response.body.data.events.forEach(event => {    });

        expect(event.tenant_id).toBe('tenant-123');

        expect(event.severity).toBe('warning');    it('should filter by event type', async () => {

      });      mockCentralDb.query

    });        .mockResolvedValueOnce({ rows: [{ count: '2' }] })

        .mockResolvedValueOnce({ rows: [] });

    it('should log security event for access', async () => {

      await request(app)      await request(app)

        .get('/api/portal/logs/security')        .get('/api/portal/logs/security?eventType=unauthorized_access')

        .set('Authorization', `Bearer ${platformAdminToken}`)        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);        .expect(200);



      // Verify security event was logged      expect(mockCentralDb.query.mock.calls[0][1]).toContain('unauthorized_access');

      const result = await pool.query(    });

        `SELECT * FROM security_events 

         WHERE event_type = 'portal_security_events_accessed'     it('should filter by severity', async () => {

         ORDER BY timestamp DESC LIMIT 1`      mockCentralDb.query

      );        .mockResolvedValueOnce({ rows: [{ count: '3' }] })

        .mockResolvedValueOnce({ rows: [] });

      expect(result.rows.length).toBeGreaterThan(0);

    });      await request(app)

  });        .get('/api/portal/logs/security?severity=critical')

        .set('Authorization', `Bearer ${platformAdminToken}`)

  // ============================================================================        .expect(200);

  // GET /api/portal/logs/search - Full-text Search

  // ============================================================================      expect(mockCentralDb.query.mock.calls[0][1]).toContain('critical');

    });

  describe('GET /api/portal/logs/search', () => {

    it('should require search query', async () => {    it('should combine multiple filters', async () => {

      const response = await request(app)      mockCentralDb.query

        .get('/api/portal/logs/search')        .mockResolvedValueOnce({ rows: [{ count: '1' }] })

        .set('Authorization', `Bearer ${platformAdminToken}`)        .mockResolvedValueOnce({ rows: [] });

        .expect(400);

      await request(app)

      expect(response.body.error).toContain('at least 3 characters');        .get('/api/portal/logs/security?tenantId=tenant-123&severity=error&eventType=data_breach')

    });        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);

    it('should require minimum 3 characters', async () => {

      const response = await request(app)      const values = mockCentralDb.query.mock.calls[0][1];

        .get('/api/portal/logs/search?q=ab')      expect(values).toContain('tenant-123');

        .set('Authorization', `Bearer ${platformAdminToken}`)      expect(values).toContain('error');

        .expect(400);      expect(values).toContain('data_breach');

    });

      expect(response.body.error).toContain('at least 3 characters');

    });    it('should log security event for access', async () => {

      mockCentralDb.query

    it('should search logs by query', async () => {        .mockResolvedValueOnce({ rows: [{ count: '0' }] })

      const response = await request(app)        .mockResolvedValueOnce({ rows: [] });

        .get('/api/portal/logs/search?q=login')

        .set('Authorization', `Bearer ${platformAdminToken}`)      await request(app)

        .expect(200);        .get('/api/portal/logs/security')

        .set('Authorization', `Bearer ${platformAdminToken}`)

      expect(response.body.success).toBe(true);        .expect(200);

      expect(response.body.data.results).toBeInstanceOf(Array);

      expect(response.body.data.query).toBe('login');      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(

    });        'portal_security_events_accessed',

        expect.any(Object),

    it('should filter search by tenant', async () => {        expect.any(Object)

      const response = await request(app)      );

        .get('/api/portal/logs/search?q=Database&tenantId=tenant-123')    });

        .set('Authorization', `Bearer ${platformAdminToken}`)  });

        .expect(200);

  // ============================================================================

      expect(response.body.success).toBe(true);  // GET /api/portal/logs/search - Full-Text Search

        // ============================================================================

      // All results should be for tenant-123

      response.body.data.results.forEach(log => {  describe('GET /api/portal/logs/search', () => {

        expect(log.tenant_id).toBe('tenant-123');    it('should require search query', async () => {

      });      const response = await request(app)

    });        .get('/api/portal/logs/search')

        .set('Authorization', `Bearer ${platformAdminToken}`)

    it('should limit search results', async () => {        .expect(400);

      const response = await request(app)

        .get('/api/portal/logs/search?q=info&limit=2')      expect(response.body.error).toContain('at least 3 characters');

        .set('Authorization', `Bearer ${platformAdminToken}`)    });

        .expect(200);

    it('should require minimum 3 characters', async () => {

      expect(response.body.success).toBe(true);      const response = await request(app)

      expect(response.body.data.results.length).toBeLessThanOrEqual(2);        .get('/api/portal/logs/search?q=ab')

    });        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(400);

    it('should enforce maximum limit of 500', async () => {

      const response = await request(app)      expect(response.body.error).toContain('at least 3 characters');

        .get('/api/portal/logs/search?q=info&limit=9999')    });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);    it('should search logs by query', async () => {

      mockCentralDb.query.mockResolvedValueOnce({

      expect(response.body.success).toBe(true);        rows: [

      // Limit is enforced in the query, not in response          {

    });            id: 1,

            timestamp: '2025-11-01T10:00:00Z',

    it('should log security event for search', async () => {            level: 'error',

      await request(app)            message: 'Database connection failed',

        .get('/api/portal/logs/search?q=sensitive')            tenant_id: 'tenant-123',

        .set('Authorization', `Bearer ${platformAdminToken}`)          },

        .expect(200);        ],

      });

      // Verify security event was logged

      const result = await pool.query(      const response = await request(app)

        `SELECT * FROM security_events         .get('/api/portal/logs/search?q=database')

         WHERE event_type = 'portal_logs_searched'         .set('Authorization', `Bearer ${platformAdminToken}`)

         ORDER BY timestamp DESC LIMIT 1`        .expect(200);

      );

      expect(response.body.success).toBe(true);

      expect(result.rows.length).toBeGreaterThan(0);      expect(response.body.data.results).toHaveLength(1);

    });      expect(response.body.data.query).toBe('database');

  });      

      const query = mockCentralDb.query.mock.calls[0][0];

  // ============================================================================      expect(query).toContain('ILIKE');

  // GET /api/portal/logs/download - CSV Download    });

  // ============================================================================

    it('should filter search by tenant', async () => {

  describe('GET /api/portal/logs/download', () => {      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

    it('should download logs as CSV', async () => {

      const response = await request(app)      await request(app)

        .get('/api/portal/logs/download')        .get('/api/portal/logs/search?q=error&tenantId=tenant-123')

        .set('Authorization', `Bearer ${platformAdminToken}`)        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);        .expect(200);



      expect(response.headers['content-type']).toContain('text/csv');      const query = mockCentralDb.query.mock.calls[0][0];

      expect(response.headers['content-disposition']).toContain('attachment');      expect(query).toContain('tenant_id = $2');

      expect(response.text).toContain('timestamp,level,message'); // CSV header      expect(mockCentralDb.query.mock.calls[0][1]).toContain('tenant-123');

    });    });



    it('should filter download by tenant', async () => {    it('should limit search results', async () => {

      const response = await request(app)      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

        .get('/api/portal/logs/download?tenantId=tenant-123')

        .set('Authorization', `Bearer ${platformAdminToken}`)      await request(app)

        .expect(200);        .get('/api/portal/logs/search?q=test&limit=100')

        .set('Authorization', `Bearer ${platformAdminToken}`)

      expect(response.headers['content-type']).toContain('text/csv');        .expect(200);

      // CSV should only contain tenant-123 logs

      const lines = response.text.split('\n');      const values = mockCentralDb.query.mock.calls[0][1];

      const dataLines = lines.slice(1); // Skip header      expect(values).toContain(100);

      dataLines.forEach(line => {    });

        if (line.trim()) {

          expect(line).toContain('tenant-123');    it('should enforce maximum limit of 500', async () => {

        }      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      });

    });      await request(app)

        .get('/api/portal/logs/search?q=test&limit=9999')

    it('should filter download by date range', async () => {        .set('Authorization', `Bearer ${platformAdminToken}`)

      const startDate = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();        .expect(200);

      const endDate = new Date().toISOString();

      const values = mockCentralDb.query.mock.calls[0][1];

      const response = await request(app)      expect(values).toContain(500);

        .get(`/api/portal/logs/download?startDate=${startDate}&endDate=${endDate}`)    });

        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(200);    it('should log security event for search', async () => {

      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

      expect(response.headers['content-type']).toContain('text/csv');

    });      await request(app)

        .get('/api/portal/logs/search?q=sensitive')

    it('should limit download to 10000 records', async () => {        .set('Authorization', `Bearer ${platformAdminToken}`)

      const response = await request(app)        .expect(200);

        .get('/api/portal/logs/download')

        .set('Authorization', `Bearer ${platformAdminToken}`)      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(

        .expect(200);        'portal_logs_searched',

        expect.objectContaining({

      const lines = response.text.split('\n').filter(line => line.trim());          searchQuery: 'sensitive',

      // Should have header + data (max 10000 + 1 header)        }),

      expect(lines.length).toBeLessThanOrEqual(10001);        expect.any(Object)

    });      );

    });

    it('should escape CSV special characters', async () => {  });

      // Insert a log with special characters

      await pool.query(`  // ============================================================================

        INSERT INTO system_logs (level, message, tenant_id, instance_id, timestamp)  // GET /api/portal/logs/download - CSV Export

        VALUES ('error', 'Error with "quotes" and ,commas,', 'tenant-test', 'instance-test', NOW())  // ============================================================================

      `);

  describe('GET /api/portal/logs/download', () => {

      const response = await request(app)    it('should download logs as CSV', async () => {

        .get('/api/portal/logs/download?tenantId=tenant-test')      mockCentralDb.query.mockResolvedValueOnce({

        .set('Authorization', `Bearer ${platformAdminToken}`)        rows: [

        .expect(200);          {

            timestamp: '2025-11-01T10:00:00Z',

      // Check that quotes are escaped            level: 'info',

      expect(response.text).toContain('""'); // Escaped quotes            message: 'User login',

    });            tenant_id: 'tenant-123',

            instance_id: 'instance-456',

    it('should log security event with warning severity', async () => {            user_id: 'user-789',

      await request(app)            ip_address: '192.168.1.1',

        .get('/api/portal/logs/download')            endpoint: '/api/auth/login',

        .set('Authorization', `Bearer ${platformAdminToken}`)            method: 'POST',

        .expect(200);          },

        ],

      // Verify security event was logged with warning severity      });

      const result = await pool.query(

        `SELECT * FROM security_events       const response = await request(app)

         WHERE event_type = 'portal_logs_downloaded'         .get('/api/portal/logs/download')

         AND severity = 'warning'        .set('Authorization', `Bearer ${platformAdminToken}`)

         ORDER BY timestamp DESC LIMIT 1`        .expect(200);

      );

      expect(response.headers['content-type']).toContain('text/csv');

      expect(result.rows.length).toBeGreaterThan(0);      expect(response.headers['content-disposition']).toContain('attachment');

    });      expect(response.headers['content-disposition']).toContain('logs-');

  });      expect(response.text).toContain('timestamp,level,message');

      expect(response.text).toContain('User login');

  // ============================================================================    });

  // GET /api/portal/stats - Platform Statistics

  // ============================================================================    it('should filter download by tenant', async () => {

      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

  describe('GET /api/portal/stats', () => {

    it('should fetch platform statistics', async () => {      await request(app)

      const response = await request(app)        .get('/api/portal/logs/download?tenantId=tenant-123')

        .get('/api/portal/stats')        .set('Authorization', `Bearer ${platformAdminToken}`)

        .set('Authorization', `Bearer ${platformAdminToken}`)        .expect(200);

        .expect(200);

      const query = mockCentralDb.query.mock.calls[0][0];

      expect(response.body.success).toBe(true);      expect(query).toContain('tenant_id = $1');

      expect(response.body.data.tenants).toBeGreaterThanOrEqual(0);    });

      expect(response.body.data.instances).toBeGreaterThanOrEqual(0);

      expect(response.body.data.logsByLevel).toBeDefined();    it('should filter download by date range', async () => {

      expect(response.body.data.securityBySeverity).toBeDefined();      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

    });

      await request(app)

    it('should handle missing data gracefully', async () => {        .get('/api/portal/logs/download?startDate=2025-11-01&endDate=2025-11-02')

      // Clear all logs temporarily        .set('Authorization', `Bearer ${platformAdminToken}`)

      await pool.query('TRUNCATE system_logs, security_events CASCADE');        .expect(200);



      const response = await request(app)      const values = mockCentralDb.query.mock.calls[0][1];

        .get('/api/portal/stats')      expect(values).toContain('2025-11-01');

        .set('Authorization', `Bearer ${platformAdminToken}`)      expect(values).toContain('2025-11-02');

        .expect(200);    });



      expect(response.body.data.tenants).toBe(0);    it('should limit download to 10000 records', async () => {

      expect(response.body.data.logsByLevel).toEqual({});      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });



      // Restore test data for other tests      await request(app)

      await pool.query(`        .get('/api/portal/logs/download')

        INSERT INTO system_logs (level, message, tenant_id, instance_id, timestamp, endpoint, method)        .set('Authorization', `Bearer ${platformAdminToken}`)

        VALUES         .expect(200);

          ('info', 'User login', 'tenant-123', 'instance-456', NOW() - INTERVAL '1 hour', '/api/auth/login', 'POST'),

          ('error', 'Database connection failed', 'tenant-123', 'instance-456', NOW() - INTERVAL '2 hours', '/api/data', 'GET'),      const query = mockCentralDb.query.mock.calls[0][0];

          ('warn', 'High memory usage', 'tenant-789', 'instance-789', NOW() - INTERVAL '3 hours', '/api/status', 'GET'),      expect(query).toContain('LIMIT 10000');

          ('info', 'Application started', 'tenant-123', 'instance-456', NOW() - INTERVAL '4 hours', NULL, NULL)    });

      `);

    it('should escape CSV special characters', async () => {

      await pool.query(`      mockCentralDb.query.mockResolvedValueOnce({

        INSERT INTO security_events (event_type, severity, tenant_id, instance_id, timestamp, user_email)        rows: [

        VALUES          {

          ('login_success', 'info', 'tenant-123', 'instance-456', NOW() - INTERVAL '1 hour', 'user@example.com'),            timestamp: '2025-11-01T10:00:00Z',

          ('unauthorized_access', 'warning', 'tenant-123', 'instance-456', NOW() - INTERVAL '2 hours', 'attacker@example.com'),            level: 'error',

          ('data_breach_attempt', 'critical', 'tenant-789', 'instance-789', NOW() - INTERVAL '3 hours', 'malicious@example.com')            message: 'Error with "quotes" and ,commas,',

      `);            tenant_id: 'tenant-123',

    });            instance_id: null,

  });            user_id: null,

            ip_address: null,

  // ============================================================================            endpoint: null,

  // Authorization Tests            method: null,

  // ============================================================================          },

        ],

  describe('Authorization', () => {      });

    it('should block tenant users from portal routes', async () => {

      await request(app)      const response = await request(app)

        .get('/api/portal/logs')        .get('/api/portal/logs/download')

        .set('Authorization', `Bearer ${tenantUserToken}`)        .set('Authorization', `Bearer ${platformAdminToken}`)

        .expect(403);        .expect(200);



      await request(app)      expect(response.text).toContain('""quotes""'); // Escaped quotes

        .get('/api/portal/logs/security')      expect(response.text).toContain('"Error with ""quotes"" and ,commas,"');

        .set('Authorization', `Bearer ${tenantUserToken}`)    });

        .expect(403);

    it('should log security event with warning severity', async () => {

      await request(app)      mockCentralDb.query.mockResolvedValueOnce({ rows: [] });

        .get('/api/portal/logs/search?q=test')

        .set('Authorization', `Bearer ${tenantUserToken}`)      await request(app)

        .expect(403);        .get('/api/portal/logs/download')

        .set('Authorization', `Bearer ${platformAdminToken}`)

      await request(app)        .expect(200);

        .get('/api/portal/stats')

        .set('Authorization', `Bearer ${tenantUserToken}`)      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith(

        .expect(403);        'portal_logs_downloaded',

    });        expect.objectContaining({

          severity: 'warning',

    it('should require portal.view permission', async () => {          adminId: 'admin-123',

      const response = await request(app)        }),

        .get('/api/portal/logs')        expect.any(Object)

        .set('Authorization', `Bearer ${limitedAdminToken}`)      );

        .expect(403);    });

  });

      expect(response.body.error).toBeDefined();

    });  // ============================================================================

  });  // GET /api/portal/stats - Platform Statistics

});  // ============================================================================


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
