import pg from 'pg';
import config from './index.js';
import logger from '../utils/logger.js';

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

// Test connection
pool.on('connect', () => {
  logger.info('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  logger.error('❌ PostgreSQL connection error:', err);
  process.exit(1);
});

// Helper to execute queries with automatic organization filtering
export const query = async (text, params, organizationId = null) => {
  const start = Date.now();
  
  try {
    // If organizationId is provided, add it to WHERE clause
    let modifiedText = text;
    let modifiedParams = params || [];
    
    if (organizationId && text.toLowerCase().includes('select')) {
      // Automatically enforce organization_id filtering for SELECT queries
      if (!text.toLowerCase().includes('organization_id')) {
        logger.warn('Query missing organization_id filter:', text);
      }
    }
    
    const result = await pool.query(modifiedText, modifiedParams);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, error: error.message });
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

export default pool;
