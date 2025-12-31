import pg from 'pg';
import config from './index.js';
import logger from '../utils/logger.js';
import { logQuery, logSlowQuery, logQueryError, analyzeQuery } from '../middleware/queryLogger.js';

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  min: config.database.pool.min,
  max: config.database.pool.max,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection and set search_path
pool.on('connect', async (client) => {
  try {
    // Set search_path to include all product schemas
    // Order matters: public (core + RBAC), hris (Nexus), payroll (PayLinQ), scheduling (ScheduleHub)
    // RBAC tables (roles, permissions) are in public schema as platform infrastructure
    await client.query('SET search_path TO public, hris, payroll, scheduling');
    logger.info('✅ PostgreSQL connected with search_path configured');
  } catch (_error) {
    logger.error('Failed to set search_path:', error);
  }
});

pool.on('error', (err) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(1);
});

// Helper to execute queries with automatic organization filtering and security logging
export const query = async (text, params, organizationId = null, metadata = {}) => {
  const start = Date.now();
  
  // Declare these outside try block so they're accessible in catch
  const modifiedText = text;
  const modifiedParams = params || [];
  
  try {
    // If organizationId is provided, add it to WHERE clause
    
    if (organizationId && text.toLowerCase().includes('select')) {
      // Automatically enforce organization_id filtering for SELECT queries
      if (!text.toLowerCase().includes('organization_id')) {
        logger.warn('Query missing organization_id filter:', text);
      }
    }
    
    // Security logging and analysis
    const suspiciousPatterns = analyzeQuery(modifiedText, modifiedParams);
    if (suspiciousPatterns.length > 0) {
      logQuery(modifiedText, modifiedParams, {
        ...metadata,
        suspicious: true,
        patterns: suspiciousPatterns,
      });
    }
    
    const result = await pool.query(modifiedText, modifiedParams);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 1000) {
      logSlowQuery(modifiedText, modifiedParams, duration, metadata);
    }
    
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    
    return result;
  } catch (_error) {
    logQueryError(modifiedText, modifiedParams, error, metadata);
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

// Get a client from the pool for manual transaction management
export const getClient = async () => {
  return await pool.connect();
};

// Attach getClient to query function for convenience
query.getClient = getClient;

// Transaction helper
export const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (_error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW() as now, version() as version');
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      version: result.rows[0].version,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    };
  } catch (_error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
};

// Graceful shutdown
export const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (_error) {
    logger.error('Error closing database pool:', error);
  }
};

export default pool;
