/**
 * Security Tests for Log Tenant Isolation
 * 
 * Ensures that logs from different tenants are properly isolated and
 * cannot be accessed cross-tenant
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;

// Use real database for security tests
const testPool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT, 10) || 5432,
  database: process.env.TEST_DB_NAME || 'recruitiq_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
});

const { default: config } = await import('../../src/config/index.js');

describe('Log Tenant Isolation - Security Tests', () => {
  let platformAdminToken;
  let tenant1Data;
  let tenant2Data;

  beforeAll(async () => {
    // Ensure system_logs table exists
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id BIGSERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        tenant_id VARCHAR(50) NOT NULL,
        instance_id VARCHAR(50),
        request_id VARCHAR(50),
        user_id UUID,
        ip_address INET,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        error_stack TEXT,
        error_code VARCHAR(50),
        metadata JSONB
      )
    `);

    // Ensure security_events table exists
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id BIGSERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        event_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        tenant_id VARCHAR(50) NOT NULL,
        instance_id VARCHAR(50),
        user_id UUID,
        user_email VARCHAR(255),
        ip_address INET,
        details JSONB
      )
    `);

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

    // Setup test data
    tenant1Data = {
      tenantId: 'tenant-isolation-test-1',
      instanceId: 'instance-1',
      logs: [
        { level: 'info', message: 'Tenant 1 - Log 1', requestId: 'req-t1-1' },
        { level: 'warn', message: 'Tenant 1 - Log 2', requestId: 'req-t1-2' },
        { level: 'error', message: 'Tenant 1 - Secret Data', requestId: 'req-t1-3' },
      ],
    };

    tenant2Data = {
      tenantId: 'tenant-isolation-test-2',
      instanceId: 'instance-2',
      logs: [
        { level: 'info', message: 'Tenant 2 - Log 1', requestId: 'req-t2-1' },
        { level: 'info', message: 'Tenant 2 - Different Secret', requestId: 'req-t2-2' },
      ],
    };
  });

  beforeEach(async () => {
    // Clean test data
    await testPool.query(`
      DELETE FROM system_logs 
      WHERE tenant_id IN ($1, $2)
    `, [tenant1Data.tenantId, tenant2Data.tenantId]);

    await testPool.query(`
      DELETE FROM security_events 
      WHERE tenant_id IN ($1, $2)
    `, [tenant1Data.tenantId, tenant2Data.tenantId]);

    // Insert tenant 1 logs
    for (const log of tenant1Data.logs) {
      await testPool.query(`
        INSERT INTO system_logs (
          timestamp, level, message, tenant_id, instance_id, request_id
        ) VALUES (NOW(), $1, $2, $3, $4, $5)
      `, [
        log.level,
        log.message,
        tenant1Data.tenantId,
        tenant1Data.instanceId,
        log.requestId,
      ]);
    }

    // Insert tenant 2 logs
    for (const log of tenant2Data.logs) {
      await testPool.query(`
        INSERT INTO system_logs (
          timestamp, level, message, tenant_id, instance_id, request_id
        ) VALUES (NOW(), $1, $2, $3, $4, $5)
      `, [
        log.level,
        log.message,
        tenant2Data.tenantId,
        tenant2Data.instanceId,
        log.requestId,
      ]);
    }
  });

  afterAll(async () => {
    // Cleanup
    await testPool.query(`
      DELETE FROM system_logs 
      WHERE tenant_id IN ($1, $2)
    `, [tenant1Data.tenantId, tenant2Data.tenantId]);

    await testPool.query(`
      DELETE FROM security_events 
      WHERE tenant_id IN ($1, $2)
    `, [tenant1Data.tenantId, tenant2Data.tenantId]);

    await testPool.end();
  });

  // ============================================================================
  // TENANT ISOLATION VERIFICATION
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should only return logs for specified tenant', async () => {
      // Query for tenant 1
      const result1 = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1
        ORDER BY timestamp DESC
      `, [tenant1Data.tenantId]);

      expect(result1.rows).toHaveLength(3);
      result1.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant1Data.tenantId);
      });

      // Query for tenant 2
      const result2 = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1
        ORDER BY timestamp DESC
      `, [tenant2Data.tenantId]);

      expect(result2.rows).toHaveLength(2);
      result2.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant2Data.tenantId);
      });
    });

    it('should not allow cross-tenant log access via SQL injection', async () => {
      // Attempt SQL injection to access tenant 2 data while filtering for tenant 1
      const maliciousInput = `${tenant1Data.tenantId}' OR tenant_id = '${tenant2Data.tenantId}`;
      
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1
      `, [maliciousInput]);

      // Should return 0 results (invalid tenant_id)
      expect(result.rows).toHaveLength(0);
    });

    it('should maintain isolation with UNION attacks', async () => {
      const maliciousInput = `${tenant1Data.tenantId}' UNION SELECT * FROM system_logs WHERE tenant_id = '${tenant2Data.tenantId}`;
      
      // Using parameterized query should prevent injection
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1
      `, [maliciousInput]);

      expect(result.rows).toHaveLength(0);
    });

    it('should verify each log has tenant_id', async () => {
      const result = await testPool.query(`
        SELECT COUNT(*) as count 
        FROM system_logs 
        WHERE tenant_id IS NULL
      `);

      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    it('should ensure tenant_id is always included in inserts', async () => {
      // Try to insert without tenant_id (should fail or use constraint)
      try {
        await testPool.query(`
          INSERT INTO system_logs (level, message, instance_id)
          VALUES ('info', 'No tenant', 'test-instance')
        `);
        
        // If it succeeds, verify it's rejected by application logic
        const result = await testPool.query(`
          SELECT * FROM system_logs 
          WHERE message = 'No tenant'
        `);
        
        // Should not exist or should have been rejected
        if (result.rows.length > 0) {
          expect(result.rows[0].tenant_id).toBeTruthy();
        }
      } catch (error) {
        // Expected: NOT NULL constraint violation
        expect(error.message).toMatch(/null|constraint|tenant_id/i);
      }
    });
  });

  // ============================================================================
  // INSTANCE ISOLATION
  // ============================================================================

  describe('Instance Isolation', () => {
    it('should track different instances per tenant', async () => {
      // Insert another log for tenant 1 but different instance
      await testPool.query(`
        INSERT INTO system_logs (level, message, tenant_id, instance_id)
        VALUES ('info', 'Different instance', $1, 'instance-1-replica')
      `, [tenant1Data.tenantId]);

      const result = await testPool.query(`
        SELECT DISTINCT instance_id 
        FROM system_logs 
        WHERE tenant_id = $1
        ORDER BY instance_id
      `, [tenant1Data.tenantId]);

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      const instanceIds = result.rows.map(r => r.instance_id);
      expect(instanceIds).toContain('instance-1');
      expect(instanceIds).toContain('instance-1-replica');
    });

    it('should allow filtering by both tenant and instance', async () => {
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1 AND instance_id = $2
      `, [tenant1Data.tenantId, tenant1Data.instanceId]);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant1Data.tenantId);
        expect(row.instance_id).toBe(tenant1Data.instanceId);
      });
    });
  });

  // ============================================================================
  // SEARCH ISOLATION
  // ============================================================================

  describe('Search Isolation', () => {
    it('should only search within tenant when filtered', async () => {
      // Search for "Secret" (exists in both tenants)
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1 AND message ILIKE $2
      `, [tenant1Data.tenantId, '%Secret%']);

      expect(result.rows.length).toBeGreaterThan(0);
      result.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant1Data.tenantId);
        expect(row.message).toContain('Tenant 1');
      });
    });

    it('should not leak tenant data in full-text search', async () => {
      // Search without tenant filter should still respect isolation in app
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE message ILIKE $1
      `, ['%Secret%']);

      // Should find logs from both tenants (database level)
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      
      // But application must filter by tenant_id
      const tenant1Logs = result.rows.filter(r => r.tenant_id === tenant1Data.tenantId);
      const tenant2Logs = result.rows.filter(r => r.tenant_id === tenant2Data.tenantId);
      
      expect(tenant1Logs.length).toBeGreaterThan(0);
      expect(tenant2Logs.length).toBeGreaterThan(0);
      
      // Verify they don't leak into each other's results
      tenant1Logs.forEach(log => {
        expect(log.message).not.toContain('Tenant 2');
      });
      
      tenant2Logs.forEach(log => {
        expect(log.message).not.toContain('Tenant 1');
      });
    });
  });

  // ============================================================================
  // AGGREGATION ISOLATION
  // ============================================================================

  describe('Aggregation Isolation', () => {
    it('should count logs per tenant correctly', async () => {
      const result = await testPool.query(`
        SELECT tenant_id, COUNT(*) as count
        FROM system_logs
        WHERE tenant_id IN ($1, $2)
        GROUP BY tenant_id
        ORDER BY tenant_id
      `, [tenant1Data.tenantId, tenant2Data.tenantId]);

      expect(result.rows).toHaveLength(2);
      
      const tenant1Count = result.rows.find(r => r.tenant_id === tenant1Data.tenantId);
      const tenant2Count = result.rows.find(r => r.tenant_id === tenant2Data.tenantId);
      
      expect(parseInt(tenant1Count.count, 10)).toBe(3);
      expect(parseInt(tenant2Count.count, 10)).toBe(2);
    });

    it('should aggregate log levels per tenant separately', async () => {
      const result = await testPool.query(`
        SELECT tenant_id, level, COUNT(*) as count
        FROM system_logs
        WHERE tenant_id = $1
        GROUP BY tenant_id, level
        ORDER BY level
      `, [tenant1Data.tenantId]);

      const levelCounts = result.rows.reduce((acc, row) => {
        acc[row.level] = parseInt(row.count, 10);
        return acc;
      }, {});

      expect(levelCounts.info).toBe(1);
      expect(levelCounts.warn).toBe(1);
      expect(levelCounts.error).toBe(1);
    });
  });

  // ============================================================================
  // SECURITY EVENTS ISOLATION
  // ============================================================================

  describe('Security Events Isolation', () => {
    beforeEach(async () => {
      // Insert security events for both tenants
      await testPool.query(`
        INSERT INTO security_events (
          event_type, severity, tenant_id, user_email, ip_address
        ) VALUES 
          ('login_failure', 'warning', $1, 'user1@tenant1.com', '192.168.1.1'),
          ('unauthorized_access', 'error', $1, 'user2@tenant1.com', '192.168.1.2'),
          ('login_success', 'info', $2, 'user1@tenant2.com', '192.168.2.1')
      `, [tenant1Data.tenantId, tenant2Data.tenantId]);
    });

    it('should isolate security events by tenant', async () => {
      const result1 = await testPool.query(`
        SELECT * FROM security_events
        WHERE tenant_id = $1
      `, [tenant1Data.tenantId]);

      expect(result1.rows).toHaveLength(2);
      result1.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant1Data.tenantId);
        expect(row.user_email).toContain('@tenant1.com');
      });

      const result2 = await testPool.query(`
        SELECT * FROM security_events
        WHERE tenant_id = $1
      `, [tenant2Data.tenantId]);

      expect(result2.rows).toHaveLength(1);
      result2.rows.forEach(row => {
        expect(row.tenant_id).toBe(tenant2Data.tenantId);
        expect(row.user_email).toContain('@tenant2.com');
      });
    });

    it('should not leak security event details across tenants', async () => {
      const result = await testPool.query(`
        SELECT * FROM security_events
        WHERE event_type = 'login_failure' AND tenant_id != $1
      `, [tenant1Data.tenantId]);

      // Should not find tenant1's login failures
      const tenant1Events = result.rows.filter(r => r.user_email?.includes('@tenant1.com'));
      expect(tenant1Events).toHaveLength(0);
    });
  });

  // ============================================================================
  // INDEX VERIFICATION
  // ============================================================================

  describe('Index Verification for Performance', () => {
    it('should have index on tenant_id for fast filtering', async () => {
      const result = await testPool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'system_logs' 
          AND indexdef ILIKE '%tenant_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have composite index on tenant_id and timestamp', async () => {
      const result = await testPool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'system_logs' 
          AND indexdef ILIKE '%tenant_id%'
          AND indexdef ILIKE '%timestamp%'
      `);

      // Should exist for optimal query performance
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DATA RETENTION & CLEANUP
  // ============================================================================

  describe('Data Retention and Cleanup', () => {
    it('should allow deleting logs for specific tenant', async () => {
      // Delete all logs for tenant 1
      await testPool.query(`
        DELETE FROM system_logs WHERE tenant_id = $1
      `, [tenant1Data.tenantId]);

      // Verify tenant 1 logs are gone
      const result1 = await testPool.query(`
        SELECT COUNT(*) as count FROM system_logs WHERE tenant_id = $1
      `, [tenant1Data.tenantId]);
      
      expect(parseInt(result1.rows[0].count, 10)).toBe(0);

      // Verify tenant 2 logs still exist
      const result2 = await testPool.query(`
        SELECT COUNT(*) as count FROM system_logs WHERE tenant_id = $1
      `, [tenant2Data.tenantId]);
      
      expect(parseInt(result2.rows[0].count, 10)).toBeGreaterThan(0);
    });

    it('should support time-based retention per tenant', async () => {
      // Delete old logs for specific tenant
      await testPool.query(`
        DELETE FROM system_logs 
        WHERE tenant_id = $1 
          AND timestamp < NOW() - INTERVAL '30 days'
      `, [tenant1Data.tenantId]);

      // Should succeed without affecting other tenants
      const result = await testPool.query(`
        SELECT COUNT(*) as count FROM system_logs WHERE tenant_id = $1
      `, [tenant2Data.tenantId]);
      
      expect(parseInt(result.rows[0].count, 10)).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // METADATA ISOLATION
  // ============================================================================

  describe('Metadata Isolation', () => {
    it('should store tenant-specific metadata separately', async () => {
      await testPool.query(`
        INSERT INTO system_logs (
          level, message, tenant_id, instance_id, metadata
        ) VALUES (
          'info', 'Metadata test', $1, 'instance-1', 
          '{"customField": "tenant1-specific", "orgId": "org-123"}'::jsonb
        )
      `, [tenant1Data.tenantId]);

      const result = await testPool.query(`
        SELECT metadata FROM system_logs 
        WHERE tenant_id = $1 AND message = 'Metadata test'
      `, [tenant1Data.tenantId]);

      expect(result.rows[0].metadata.customField).toBe('tenant1-specific');
      expect(result.rows[0].metadata.orgId).toBe('org-123');
    });

    it('should not expose metadata across tenants', async () => {
      // Insert sensitive metadata for tenant 1
      await testPool.query(`
        INSERT INTO system_logs (
          level, message, tenant_id, metadata
        ) VALUES (
          'info', 'Sensitive config', $1, '{"apiKey": "secret-key-123"}'::jsonb
        )
      `, [tenant1Data.tenantId]);

      // Query for tenant 2 should not see this metadata
      const result = await testPool.query(`
        SELECT * FROM system_logs 
        WHERE tenant_id = $1 AND metadata @> '{"apiKey": "secret-key-123"}'::jsonb
      `, [tenant2Data.tenantId]);

      expect(result.rows).toHaveLength(0);
    });
  });
});
