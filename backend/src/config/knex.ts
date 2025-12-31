/**
 * Knex Database Connection
 * 
 * Provides Knex.js instance for query building and migrations
 * 
 * This is an ALTERNATIVE to the raw pg Pool connection.
 * Use Knex for:
 * - Query building
 * - Migrations
 * - Schema management
 * 
 * Use raw Pool for:
 * - Direct SQL queries with tenant isolation wrapper
 * - Custom query logging
 * - Performance-critical queries
 */

import knex from 'knex';
import config from '../config/index.js';
import knexConfig from '../../knexfile.js';

// Get environment-specific Knex config
const environment = process.env.NODE_ENV || 'development';
const knexEnvConfig = knexConfig[environment];

/**
 * Knex instance with connection pooling
 * 
 * @type {import('knex').Knex}
 */
const db = knex(knexEnvConfig);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Knex database connection successful');
    return true;
  } catch (_error) {
    console.error('❌ Knex database connection failed:', error.message);
    throw error;
  }
}

/**
 * Close all database connections
 */
async function closeConnection() {
  await db.destroy();
  console.log('🔌 Knex database connection closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

export { db, testConnection, closeConnection };
export default db;
