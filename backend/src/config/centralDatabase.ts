/**
 * Central Database Configuration
 * 
 * Provides connection pool for central logging and monitoring database.
 * Used by portal routes to query aggregated logs from cloud instances.
 * 
 * This is SEPARATE from the main application database (config/database.js)
 * and is only used when DEPLOYMENT_TYPE=cloud.
 */

import pg from 'pg';
import config from './index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

let centralPool = null;

/**
 * Initialize central database pool
 * Only creates pool if central logging is enabled (cloud deployment)
 */
const initializeCentralPool = () => {
  // For development, we can use the same database
  // In production, this would be a separate centralized database
  const isDevelopment = config.env === 'development';
  
  if (config.centralLogging.enabled || isDevelopment) {
    try {
      centralPool = new Pool({
        host: config.centralLogging.host || config.database.host,
        port: config.centralLogging.port || config.database.port,
        database: config.centralLogging.database || config.database.name,
        user: config.centralLogging.user || config.database.user,
        password: config.centralLogging.password || config.database.password,
        ssl: config.centralLogging.ssl || config.database.ssl ? { rejectUnauthorized: false } : false,
        min: 2,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      centralPool.on('connect', () => {
        logger.info('✅ Central logging database connected');
      });

      centralPool.on('error', (err) => {
        logger.error('❌ Central logging database error:', err);
      });

      logger.info('Central logging pool initialized', {
        host: config.centralLogging.host || config.database.host,
        database: config.centralLogging.database || config.database.name,
        enabled: config.centralLogging.enabled,
      });
    } catch (error) {
      logger.error('Failed to initialize central logging pool:', error);
      centralPool = null;
    }
  } else {
    logger.info('Central logging disabled - pool not initialized');
  }
};

/**
 * Get central database pool
 * Returns null if central logging is not enabled
 */
export const getCentralPool = () => {
  if (!centralPool) {
    initializeCentralPool();
  }
  return centralPool;
};

/**
 * Execute query on central database
 */
export const queryCentralDb = async (text, params = []) => {
  const pool = getCentralPool();
  
  if (!pool) {
    throw new Error('Central logging database not available');
  }
  
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn('Slow central DB query', { duration, text: text.substring(0, 100) });
    }
    
    return result;
  } catch (error) {
    logger.error('Central DB query error:', { text, error: error.message });
    throw error;
  }
};

/**
 * Health check for central database
 */
export const centralHealthCheck = async () => {
  const pool = getCentralPool();
  
  if (!pool) {
    return {
      status: 'disabled',
      message: 'Central logging not enabled',
    };
  }
  
  try {
    const result = await pool.query('SELECT NOW() as now');
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
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

/**
 * Close central database pool
 */
export const closeCentralPool = async () => {
  if (centralPool) {
    try {
      await centralPool.end();
      logger.info('Central database pool closed');
      centralPool = null;
    } catch (error) {
      logger.error('Error closing central database pool:', error);
    }
  }
};

// Initialize on module load
initializeCentralPool();

export default getCentralPool;
