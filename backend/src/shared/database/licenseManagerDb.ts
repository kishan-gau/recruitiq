/**
 * License Manager Database Connection
 * Provides connection to the Platform/Portal database
 * In production: separate database for customer/license/subscription data
 * In development: uses same database as tenant data
 */

import pkg from 'pg';
const { Pool } = pkg;
import logger from '../../utils/logger.js';
import config from '../../config/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded (in case this module loads before config)
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Log platform database configuration for debugging
logger.info('Platform database configuration:', {
  PLATFORM_DATABASE_HOST: process.env.PLATFORM_DATABASE_HOST,
  PLATFORM_DATABASE_PORT: process.env.PLATFORM_DATABASE_PORT,
  PLATFORM_DATABASE_NAME: process.env.PLATFORM_DATABASE_NAME,
  PLATFORM_DATABASE_USER: process.env.PLATFORM_DATABASE_USER,
  fallback_DATABASE_NAME: process.env.DATABASE_NAME,
  hasPassword: !!process.env.PLATFORM_DATABASE_PASSWORD || !!process.env.DATABASE_PASSWORD
});

// Create connection pool for Platform/Portal database
const licensePool = new Pool({
  host: process.env.PLATFORM_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: process.env.PLATFORM_DATABASE_PORT || process.env.DATABASE_PORT || 5432,
  database: process.env.PLATFORM_DATABASE_NAME || process.env.DATABASE_NAME,
  user: process.env.PLATFORM_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
  password: process.env.PLATFORM_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || config.database.password,
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
  } catch (_error) {
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
  } catch (_error) {
    logger.error('Error closing License Manager database pool:', { error: error.message });
  }
}

export default licensePool;
