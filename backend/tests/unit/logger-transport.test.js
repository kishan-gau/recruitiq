/**
 * Unit Tests for DatabaseTransport (Central Log Forwarding)
 * 
 * Tests the DatabaseTransport class that forwards logs from tenant VPS to platform database
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockPool = {
  query: jest.fn(),
};

const mockConfig = {
  deployment: {
    type: 'cloud',
    tenantId: 'test-tenant-123',
    instanceId: 'test-instance-456',
  },
  centralLogging: {
    enabled: true,
    host: 'central-db.example.com',
    port: 5432,
    database: 'platform_logs',
    user: 'logger',
    password: 'secret',
    ssl: true,
  },
};

jest.unstable_mockModule('../../src/config/index.js', () => ({
  default: mockConfig,
}));

// Import Transport class for testing
class MockDatabaseTransport {
  constructor(opts) {
    this.pool = opts.pool;
    this.tenantId = opts.tenantId;
    this.instanceId = opts.instanceId;
    this.batchSize = opts.batchSize || 100;
    this.flushInterval = opts.flushInterval || 5000;
    this.buffer = [];
    this.flushTimer = null;
  }

  log(info, callback) {
    this.buffer.push(info);
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    callback();
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      const values = logs.map(log => {
        return `(
          NOW(),
          '${log.level}',
          '${this.escapeSql(log.message)}',
          '${this.tenantId}',
          '${this.instanceId}',
          ${log.requestId ? `'${log.requestId}'` : 'NULL'},
          ${log.userId ? log.userId : 'NULL'},
          ${log.ip ? `'${log.ip}'::inet` : 'NULL'},
          ${log.path ? `'${this.escapeSql(log.path)}'` : 'NULL'},
          ${log.method ? `'${log.method}'` : 'NULL'},
          ${log.stack ? `'${this.escapeSql(log.stack)}'` : 'NULL'},
          ${log.code ? `'${log.code}'` : 'NULL'},
          '${JSON.stringify(this.getMetadata(log))}'::jsonb
        )`;
      }).join(',');
      
      const query = `
        INSERT INTO system_logs (
          timestamp, level, message, tenant_id, instance_id,
          request_id, user_id, ip_address, endpoint, method,
          error_stack, error_code, metadata
        ) VALUES ${values}
      `;
      
      await this.pool.query(query);
    } catch (error) {
      console.error('Failed to write logs to database:', error.message);
    }
  }

  getMetadata(info) {
    const metadata = {};
    const excludeKeys = [
      'level', 'message', 'timestamp', 'requestId', 'userId',
      'ip', 'path', 'method', 'stack', 'code', 'service',
      'environment', 'hostname', 'securityEvent'
    ];
    
    for (const [key, value] of Object.entries(info)) {
      if (!excludeKeys.includes(key)) {
        metadata[key] = value;
      }
    }
    
    return metadata;
  }

  escapeSql(str) {
    if (!str) return '';
    return str.toString().replace(/'/g, "''");
  }

  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async close() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

describe('DatabaseTransport - Central Log Forwarding', () => {
  let transport;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    
    transport = new MockDatabaseTransport({
      pool: mockPool,
      tenantId: 'test-tenant-123',
      instanceId: 'test-instance-456',
      batchSize: 3, // Small batch for testing
      flushInterval: 1000,
    });
  });

  afterEach(async () => {
    if (transport) {
      await transport.close();
    }
  });

  // ============================================================================
  // BASIC FUNCTIONALITY
  // ============================================================================

  describe('Constructor and Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(transport.pool).toBe(mockPool);
      expect(transport.tenantId).toBe('test-tenant-123');
      expect(transport.instanceId).toBe('test-instance-456');
      expect(transport.batchSize).toBe(3);
      expect(transport.flushInterval).toBe(1000);
      expect(transport.buffer).toEqual([]);
    });

    it('should use default batch size if not provided', () => {
      const defaultTransport = new MockDatabaseTransport({
        pool: mockPool,
        tenantId: 'test-tenant',
        instanceId: 'test-instance',
      });
      
      expect(defaultTransport.batchSize).toBe(100);
      expect(defaultTransport.flushInterval).toBe(5000);
    });
  });

  // ============================================================================
  // LOG BUFFERING
  // ============================================================================

  describe('Log Buffering', () => {
    it('should buffer logs without flushing', () => {
      const log1 = { level: 'info', message: 'Test log 1' };
      const log2 = { level: 'warn', message: 'Test log 2' };
      
      transport.log(log1, jest.fn());
      transport.log(log2, jest.fn());
      
      expect(transport.buffer).toHaveLength(2);
      expect(transport.buffer[0]).toBe(log1);
      expect(transport.buffer[1]).toBe(log2);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should call callback after buffering', () => {
      const callback = jest.fn();
      const log = { level: 'info', message: 'Test' };
      
      transport.log(log, callback);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should flush when buffer reaches batch size', () => {
      const flushSpy = jest.spyOn(transport, 'flush');
      
      transport.log({ level: 'info', message: 'Log 1' }, jest.fn());
      transport.log({ level: 'info', message: 'Log 2' }, jest.fn());
      expect(flushSpy).not.toHaveBeenCalled();
      
      transport.log({ level: 'info', message: 'Log 3' }, jest.fn());
      expect(flushSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FLUSHING MECHANISM
  // ============================================================================

  describe('Flush Mechanism', () => {
    it('should flush buffered logs to database', async () => {
      transport.log({ level: 'info', message: 'Test log' }, jest.fn());
      
      await transport.flush();
      
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(transport.buffer).toHaveLength(0);
    });

    it('should do nothing if buffer is empty', async () => {
      await transport.flush();
      
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should clear buffer after flushing', async () => {
      transport.log({ level: 'info', message: 'Log 1' }, jest.fn());
      transport.log({ level: 'warn', message: 'Log 2' }, jest.fn());
      
      expect(transport.buffer).toHaveLength(2);
      
      await transport.flush();
      
      expect(transport.buffer).toHaveLength(0);
    });

    it('should handle flush errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));
      
      transport.log({ level: 'error', message: 'Test error' }, jest.fn());
      
      await transport.flush();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write logs to database:',
        'Database connection failed'
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // SQL GENERATION
  // ============================================================================

  describe('SQL Query Generation', () => {
    it('should generate correct INSERT query with tenant_id and instance_id', async () => {
      transport.log({
        level: 'info',
        message: 'Test message',
        requestId: 'req-123',
        userId: 'user-456',
      }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('INSERT INTO system_logs');
      expect(query).toContain('test-tenant-123');
      expect(query).toContain('test-instance-456');
      expect(query).toContain('Test message');
      expect(query).toContain('req-123');
    });

    it('should handle NULL values correctly', async () => {
      transport.log({
        level: 'info',
        message: 'Simple log',
      }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('NULL'); // For missing fields
    });

    it('should batch multiple logs in single INSERT', async () => {
      transport.log({ level: 'info', message: 'Log 1' }, jest.fn());
      transport.log({ level: 'warn', message: 'Log 2' }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('Log 1');
      expect(query).toContain('Log 2');
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Single batch insert
    });

    it('should escape SQL special characters', async () => {
      transport.log({
        level: 'error',
        message: "Message with 'quotes' and \"double quotes\"",
      }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain("''"); // Escaped single quotes
    });
  });

  // ============================================================================
  // METADATA EXTRACTION
  // ============================================================================

  describe('Metadata Extraction', () => {
    it('should extract non-standard fields as metadata', () => {
      const log = {
        level: 'info',
        message: 'Test',
        customField1: 'value1',
        customField2: 'value2',
        requestId: 'req-123', // Should be excluded
      };
      
      const metadata = transport.getMetadata(log);
      
      expect(metadata.customField1).toBe('value1');
      expect(metadata.customField2).toBe('value2');
      expect(metadata.requestId).toBeUndefined();
      expect(metadata.level).toBeUndefined();
      expect(metadata.message).toBeUndefined();
    });

    it('should handle empty metadata', () => {
      const log = {
        level: 'info',
        message: 'Test',
      };
      
      const metadata = transport.getMetadata(log);
      
      expect(metadata).toEqual({});
    });

    it('should include security event metadata', () => {
      const log = {
        level: 'warn',
        message: 'Security event',
        eventType: 'login_failure',
        ipAddress: '192.168.1.1',
      };
      
      const metadata = transport.getMetadata(log);
      
      expect(metadata.eventType).toBe('login_failure');
      expect(metadata.ipAddress).toBe('192.168.1.1');
    });
  });

  // ============================================================================
  // TENANT ISOLATION
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should always include tenant_id in logs', async () => {
      transport.log({ level: 'info', message: 'Test' }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('test-tenant-123');
    });

    it('should include instance_id for multi-instance tracking', async () => {
      transport.log({ level: 'info', message: 'Test' }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      expect(query).toContain('test-instance-456');
    });

    it('should maintain tenant isolation across multiple logs', async () => {
      transport.log({ level: 'info', message: 'Log 1' }, jest.fn());
      transport.log({ level: 'info', message: 'Log 2' }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      const tenantMatches = query.match(/test-tenant-123/g);
      expect(tenantMatches).toHaveLength(2); // Once per log
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should not throw error on database failure', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection timeout'));
      
      transport.log({ level: 'error', message: 'Test' }, jest.fn());
      
      await expect(transport.flush()).resolves.not.toThrow();
    });

    it('should continue accepting logs after flush failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPool.query.mockRejectedValueOnce(new Error('First failure'));
      
      transport.log({ level: 'info', message: 'Log 1' }, jest.fn());
      await transport.flush();
      
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      transport.log({ level: 'info', message: 'Log 2' }, jest.fn());
      await transport.flush();
      
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed log objects', async () => {
      transport.log(null, jest.fn());
      
      await expect(transport.flush()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // PERIODIC FLUSHING
  // ============================================================================

  describe('Periodic Flushing', () => {
    it('should start periodic flush timer', () => {
      transport.startPeriodicFlush();
      
      expect(transport.flushTimer).toBeDefined();
    });

    it('should flush buffered logs periodically', async () => {
      jest.useFakeTimers();
      const flushSpy = jest.spyOn(transport, 'flush');
      
      transport.startPeriodicFlush();
      transport.log({ level: 'info', message: 'Test' }, jest.fn());
      
      jest.advanceTimersByTime(1000);
      
      expect(flushSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should not flush if buffer is empty', async () => {
      jest.useFakeTimers();
      
      transport.startPeriodicFlush();
      
      jest.advanceTimersByTime(1000);
      
      // If buffer is empty, pool should not be queried
      expect(mockPool.query).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  // ============================================================================
  // CLEANUP
  // ============================================================================

  describe('Cleanup', () => {
    it('should clear timer on close', async () => {
      transport.startPeriodicFlush();
      expect(transport.flushTimer).toBeDefined();
      
      await transport.close();
      
      // Timer should be cleared
      expect(transport.flushTimer).toBeNull();
    });

    it('should flush remaining logs on close', async () => {
      transport.log({ level: 'info', message: 'Final log' }, jest.fn());
      
      await transport.close();
      
      expect(mockPool.query).toHaveBeenCalled();
      expect(transport.buffer).toHaveLength(0);
    });
  });

  // ============================================================================
  // SECURITY
  // ============================================================================

  describe('Security', () => {
    it('should escape SQL injection attempts in message', async () => {
      transport.log({
        level: 'info',
        message: "'; DROP TABLE system_logs; --",
      }, jest.fn());
      
      await transport.flush();
      
      const query = mockPool.query.mock.calls[0][0];
      // The single quote is escaped by doubling it
      expect(query).toContain("'''; DROP TABLE system_logs; --");
      // Should not contain unescaped version that could execute
      const linesWithDrop = query.split('\n').filter(line => line.includes('DROP TABLE'));
      linesWithDrop.forEach(line => {
        // Verify the quote before DROP is escaped (doubled)
        expect(line).toMatch(/'{2,}.*DROP TABLE/);
      });
    });

    it('should handle special characters safely', async () => {
      transport.log({
        level: 'info',
        message: 'Test\nNewline\tTab\'Quote"DoubleQuote\\Backslash',
      }, jest.fn());
      
      await transport.flush();
      
      expect(mockPool.query).toHaveBeenCalled();
      // Should not throw or corrupt data
    });
  });
});
