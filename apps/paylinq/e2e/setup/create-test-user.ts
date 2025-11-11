/**
 * Script to create test user for E2E tests
 * Run this before running E2E tests: npx tsx e2e/setup/create-test-user.ts
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'recruitiq_dev',
  user: 'postgres',
  password: 'postgres',
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up test user...');
    
    // Check organizations table structure
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations'
    `);
    const columns = columnsResult.rows.map(r => r.column_name);
    console.log('Organizations table columns:', columns.join(', '));
    
    // Check if test organization exists
    let orgResult = await client.query(
      `SELECT id FROM organizations WHERE name = 'Test Organization' LIMIT 1`
    );
    
    let orgId: string;
    
    if (orgResult.rows.length === 0) {
      console.log('📦 Creating test organization...');
      
      // Create organization with required fields only
      const newOrg = await client.query(
        `INSERT INTO organizations (name, slug, tier, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        ['Test Organization', 'test-org', 'enterprise']
      );
      orgId = newOrg.rows[0].id;
      console.log(`✓ Test organization created: ${orgId}`);
    } else {
      orgId = orgResult.rows[0].id;
      console.log(`✓ Test organization exists: ${orgId}`);
    }
    
    // Check if test user exists
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = 'paylinq@test.com' LIMIT 1`
    );
    
    if (userResult.rows.length > 0) {
      console.log('✓ Test user already exists');
      
      // Update password just in case
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      await client.query(
        `UPDATE users SET password = $1, updated_at = NOW() WHERE email = 'paylinq@test.com'`,
        [hashedPassword]
      );
      console.log('✓ Password updated');
    } else {
      console.log('👤 Creating test user...');
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      
      await client.query(
        `INSERT INTO users (
          organization_id, email, password, first_name, last_name, 
          role, type, email_verified, enabled_products, product_roles,
          created_at, updated_at
        ) VALUES (
          $1, 'paylinq@test.com', $2, 'Test', 'User',
          'admin', 'tenant', true, ARRAY['paylinq'], 
          '{"paylinq": "admin"}'::jsonb,
          NOW(), NOW()
        )`,
        [orgId, hashedPassword]
      );
      console.log('✓ Test user created');
    }
    
    // Enable Paylinq product for organization
    const productResult = await client.query(
      `SELECT id FROM products WHERE code = 'paylinq' LIMIT 1`
    );
    
    if (productResult.rows.length > 0) {
      const productId = productResult.rows[0].id;
      
      // Check if organization already has product access
      const accessResult = await client.query(
        `SELECT id FROM organization_products 
         WHERE organization_id = $1 AND product_id = $2`,
        [orgId, productId]
      );
      
      if (accessResult.rows.length === 0) {
        await client.query(
          `INSERT INTO organization_products (
            organization_id, product_id, status, 
            enabled_at, created_at, updated_at
          ) VALUES ($1, $2, 'active', NOW(), NOW(), NOW())`,
          [orgId, productId]
        );
        console.log('✓ Paylinq product enabled for organization');
      } else {
        console.log('✓ Paylinq product already enabled');
      }
    } else {
      console.log('⚠ Paylinq product not found in database');
    }
    
    console.log('\n✅ Test environment setup complete!');
    console.log('\nTest Credentials:');
    console.log('  Email: paylinq@test.com');
    console.log('  Password: Test123!@#');
    console.log('\nYou can now run E2E tests with: npm run test:e2e');
    
  } catch (error) {
    console.error('❌ Error setting up test user:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser().catch(console.error);
