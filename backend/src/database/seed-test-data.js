#!/usr/bin/env node
/**
 * Seed Test Data
 * 
 * Seeds the database with test data for E2E testing.
 * Requires an empty database - run purge-database.js first.
 * 
 * Usage: node src/database/seed-test-data.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'recruitiq_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

// Test user constants
const TEST_ORG_ID = '123e4567-e89b-12d3-a456-426614174001';
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_WORKSPACE_ID = '123e4567-e89b-12d3-a456-426614174002';
const TEST_EMAIL = 'test@recruitiq.com';
const TEST_PASSWORD = 'TestPassword123!';

async function seedTestData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting test data seeding...\n');
    
    // Verify database is empty first
    const checkResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM organizations) as organizations
    `);
    
    if (parseInt(checkResult.rows[0].users) > 0 || parseInt(checkResult.rows[0].organizations) > 0) {
      console.log('⚠️  WARNING: Database is not empty!');
      console.log(`   Users: ${checkResult.rows[0].users}`);
      console.log(`   Organizations: ${checkResult.rows[0].organizations}`);
      console.log('\n💡 Run purge-database.js first to clean the database.\n');
      throw new Error('Database must be empty before seeding');
    }
    
    console.log('✓ Database is empty, proceeding with seed...\n');
    
    // 1. Create test organization
    console.log('🏢 Creating test organization...');
    await client.query(`
      INSERT INTO organizations (
        id, name, slug, tier, max_users, max_workspaces, 
        deployment_model, mfa_required, mfa_enforcement_date,
        created_at, updated_at
      )
      VALUES ($1, 'Test Organization', 'test-org', 'professional', 50, 10, 'shared', true, NOW() + INTERVAL '7 days', NOW(), NOW())
    `, [TEST_ORG_ID]);
    console.log(`✓ Organization created: ${TEST_ORG_ID} (MFA required with 7-day grace period)\n`);
    
    // 2. Create test user with hashed password
    console.log('👤 Creating test user...');
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    await client.query(`
      INSERT INTO users (id, organization_id, email, password_hash, name, user_type, legacy_role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'Test User', 'tenant', 'admin', NOW(), NOW())
    `, [TEST_USER_ID, TEST_ORG_ID, TEST_EMAIL, hashedPassword]);
    console.log(`✓ User created: ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}\n`);
    
    // 3. Create test workspace
    console.log('📁 Creating test workspace...');
    await client.query(`
      INSERT INTO workspaces (id, organization_id, name, created_by, created_at, updated_at)
      VALUES ($1, $2, 'Test Workspace', $3, NOW(), NOW())
    `, [TEST_WORKSPACE_ID, TEST_ORG_ID, TEST_USER_ID]);
    console.log(`✓ Workspace created: ${TEST_WORKSPACE_ID}\n`);
    
    // 4. Add user to workspace
    console.log('🔗 Linking user to workspace...');
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
      VALUES ($1, $2, 'admin', NOW())
    `, [TEST_WORKSPACE_ID, TEST_USER_ID]);
    console.log('✓ User linked to workspace\n');
    
    // 5. Create flow templates
    console.log('📋 Creating flow templates...');
    
    const flowTemplates = [
      {
        name: 'Standard Hiring Flow',
        description: 'Default hiring process with all standard stages',
        stages: [
          { name: 'Application Review', order: 1, type: 'review' },
          { name: 'Phone Screen', order: 2, type: 'phone' },
          { name: 'Technical Interview', order: 3, type: 'technical' },
          { name: 'Behavioral Interview', order: 4, type: 'behavioral' },
          { name: 'Final Interview', order: 5, type: 'final' },
          { name: 'Offer', order: 6, type: 'offer' },
        ]
      },
      {
        name: 'Quick Hire Flow',
        description: 'Streamlined process for urgent positions',
        stages: [
          { name: 'Application Review', order: 1, type: 'review' },
          { name: 'Combined Interview', order: 2, type: 'combined' },
          { name: 'Offer', order: 3, type: 'offer' },
        ]
      },
      {
        name: 'Sales Role Flow',
        description: 'Specialized flow for sales positions',
        stages: [
          { name: 'Application Review', order: 1, type: 'review' },
          { name: 'Phone Screen', order: 2, type: 'phone' },
          { name: 'Sales Pitch Demo', order: 3, type: 'presentation' },
          { name: 'Manager Interview', order: 4, type: 'managerial' },
          { name: 'Offer', order: 5, type: 'offer' },
        ]
      }
    ];
    
    for (const template of flowTemplates) {
      await client.query(`
        INSERT INTO flow_templates (organization_id, workspace_id, name, description, stages, is_default, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        TEST_ORG_ID,
        TEST_WORKSPACE_ID,
        template.name,
        template.description,
        JSON.stringify(template.stages),
        template.name === 'Standard Hiring Flow',
        TEST_USER_ID
      ]);
      console.log(`  ✓ ${template.name}`);
    }
    console.log('');
    
    await client.query('COMMIT');
    
    console.log('✅ Test data seeding completed successfully!\n');
    
    console.log('📋 Test Credentials:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   Organization ID: ${TEST_ORG_ID}`);
    console.log(`   Workspace ID: ${TEST_WORKSPACE_ID}`);
    console.log(`   User ID: ${TEST_USER_ID}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding test data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('seed-test-data.js')) {
  seedTestData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}

export default seedTestData;
