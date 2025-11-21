/**
 * License Manager Database Connection
 * Provides connection to the License Manager database (license_manager_db)
 */

import pkg from 'pg';
const { Pool } = pkg;
import logger from '../../utils/logger.js';
import config from '../../config/index.js';

// Create connection pool for License Manager database
const licensePool = new Pool({
  host: process.env.LICENSE_MANAGER_DB_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.LICENSE_MANAGER_DB_PORT || process.env.DB_PORT || 5432,
  database: process.env.LICENSE_MANAGER_DB_NAME || 'license_manager_db',
  user: process.env.LICENSE_MANAGER_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.LICENSE_MANAGER_DB_PASSWORD || config.database.password, // Use validated secret
  max: 10, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Pool error handling
licensePool.on('error', (err) => {
  logger.error('Unexpected error on License Manager database pool', { error: err.message });
});

// Pool connect event
licensePool.on('connect', () => {
  logger.debug('New client connected to License Manager database pool');
});

// Test connection
licensePool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('❌ License Manager database connection failed:', { error: err.message });
  } else {
    logger.info('✅ License Manager database connected successfully');
  }
});

/**
 * Health check for License Manager database
 */
export async function healthCheck() {
  try {
    const result = await licensePool.query('SELECT NOW() as now, current_database() as database');
    return {
      status: 'healthy',
      database: result.rows[0].database,
      timestamp: result.rows[0].now,
    };
  } catch (error) {
    logger.error('License Manager database health check failed:', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * Close the pool
 */
export async function closeLicensePool() {
  try {
    await licensePool.end();
    logger.info('License Manager database pool closed');
  } catch (error) {
    logger.error('Error closing License Manager database pool:', { error: error.message });
  }
}

export default licensePool;
