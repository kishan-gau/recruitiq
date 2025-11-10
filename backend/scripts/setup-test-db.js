#!/usr/bin/env node

/**
 * Database Setup Script for Tests
 * 
 * This script creates the test database and runs migrations.
 * Run this before running integration tests.
 * 
 * Usage:
 *   node scripts/setup-test-db.js
 */

import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
config({ path: join(__dirname, '../.env.test') });

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'recruitiq_test';
const DB_USER = process.env.DATABASE_USER || 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'postgres';
const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || 5432;

console.log('🗄️  Setting up test database...');
console.log(`   Database: ${TEST_DB_NAME}`);
console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
console.log(`   User: ${DB_USER}`);

async function setupTestDatabase() {
  // Connect to postgres database to create test database
  const adminPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: 'postgres',
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    // Drop existing test database if it exists
    console.log(`\n🗑️  Dropping existing database ${TEST_DB_NAME} (if exists)...`);
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    
    // Create test database
    console.log(`\n📦 Creating database ${TEST_DB_NAME}...`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log('✅ Database created successfully');

  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }

  // Connect to the test database to run migrations
  const testPool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: TEST_DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    console.log('\n🔧 Running migrations...');
    
    // Array of schema files to run in order
    const schemaFiles = [
      '../src/database/schema.sql',              // Main schema
      '../src/database/nexus-hris-schema.sql',   // Nexus HRIS
      '../src/database/paylinq-schema.sql',      // PayLinQ payroll
      '../src/database/schedulehub-schema.sql',  // ScheduleHub scheduling
      '../src/database/central-logging-schema.sql', // Central logging for portal
    ];

    let schemasLoaded = 0;
    
    for (const schemaFile of schemaFiles) {
      const schemaPath = join(__dirname, schemaFile);
      try {
        console.log(`   Loading ${schemaFile.split('/').pop()}...`);
        const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
        await testPool.query(schemaSQL);
        schemasLoaded++;
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(`   ⚠️  ${schemaFile.split('/').pop()} not found, skipping...`);
        } else {
          console.error(`   ❌ Error loading ${schemaFile.split('/').pop()}:`, err.message);
          throw err;
        }
      }
    }

    if (schemasLoaded === 0) {
      console.log('⚠️  No schema files found, creating minimal schema...');
      await createMinimalSchema(testPool);
    } else {
      console.log(`✅ Loaded ${schemasLoaded} schema file(s)`);
    }

    // Run seed data files in order
    console.log('\n🌱 Loading seed data...');
    
    const seedFiles = [
      '../src/database/seed-products.sql',        // Product definitions
      '../src/database/seed-test-tenant.sql',     // Test tenant/users
      '../src/database/formula-templates-seed.sql', // Formula templates
    ];

    let seedsLoaded = 0;
    
    for (const seedFile of seedFiles) {
      const seedPath = join(__dirname, seedFile);
      try {
        console.log(`   Loading ${seedFile.split('/').pop()}...`);
        const seedSQL = await fs.readFile(seedPath, 'utf-8');
        await testPool.query(seedSQL);
        seedsLoaded++;
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.log(`   ⚠️  ${seedFile.split('/').pop()} not found, skipping...`);
        } else {
          console.error(`   ⚠️  Error loading ${seedFile.split('/').pop()}:`, err.message);
          // Don't throw on seed errors, just warn
        }
      }
    }

    if (seedsLoaded > 0) {
      console.log(`✅ Loaded ${seedsLoaded} seed file(s)`);
    } else {
      console.log('ℹ️  No seed data files found, skipping...');
    }

    console.log('\n✅ Test database setup complete!');
    console.log(`\nYou can now run tests with: npm test`);

  } catch (error) {
    console.error('❌ Error setting up schema:', error.message);
    throw error;
  } finally {
    await testPool.end();
  }
}

async function createMinimalSchema(pool) {
  // Create basic tables required for most tests
  const minimalSchema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Organizations table
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      tier VARCHAR(50) DEFAULT 'free',
      subscription_status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      user_type VARCHAR(50) DEFAULT 'tenant',
      email_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Workspaces table
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Jobs table
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(255) NOT NULL,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Candidates table
    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- System logs table for security tests
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
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
    CREATE INDEX IF NOT EXISTS idx_workspaces_organization ON workspaces(organization_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_organization ON jobs(organization_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_organization ON candidates(organization_id);
    CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id);
  `;

  await pool.query(minimalSchema);
  console.log('✅ Minimal schema created');
}

// Run the setup
setupTestDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
