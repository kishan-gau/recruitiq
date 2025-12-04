/**
 * Knex.js Configuration
 * 
 * Database migration and seed management for RecruitIQ
 * 
 * @see https://knexjs.org/guide/
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const config = {
  // Development environment
  development: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      database: process.env.DATABASE_NAME || 'recruitiq_dev',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds/development',
      loadExtensions: ['.js'],
    },
  },

  // Platform database (for portal/license management)
  platform: {
    client: 'pg',
    connection: {
      host: process.env.PLATFORM_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.PLATFORM_DATABASE_PORT, 10) || 5432,
      database: process.env.PLATFORM_DATABASE_NAME || 'platform_db',
      user: process.env.PLATFORM_DATABASE_USER || 'postgres',
      password: process.env.PLATFORM_DATABASE_PASSWORD || 'postgres',
      ssl: process.env.PLATFORM_DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds/production',
      loadExtensions: ['.js'],
    },
  },

  // Test environment
  test: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      database: process.env.DATABASE_NAME || 'recruitiq_test',
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds/development',
      loadExtensions: ['.js'],
    },
  },

  // Staging environment
  staging: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 5,
      max: 20,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds/production',
      loadExtensions: ['.js'],
    },
  },

  // Production environment
  production: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 20,
      max: 100,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
    seeds: {
      directory: './seeds/production',
      loadExtensions: ['.js'],
    },
  },
};

export default config;
