/**
 * Script to create test user for E2E tests
 * Run this before running E2E tests: node e2e/setup/create-test-user.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
    
    // Check if test organization exists
    let orgResult = await client.query(
      `SELECT id FROM organizations WHERE name = 'Test Organization' LIMIT 1`
    );
    
    let orgId;
    
    if (orgResult.rows.length === 0) {
      console.log('📦 Creating test organization...');
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
    
    // Check if test employee (tenant user) exists
    const userResult = await client.query(
      `SELECT user_id FROM hris.user_account WHERE email = 'paylinq@test.com' LIMIT 1`
    );
    
    if (userResult.rows.length > 0) {
      console.log('✓ Test user already exists');
      
      // Update password just in case
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      await client.query(
        `UPDATE hris.user_account SET password = $1, updated_at = NOW() WHERE email = 'paylinq@test.com'`,
        [hashedPassword]
      );
      console.log('✓ Password updated');
    } else {
      console.log('👤 Creating test user...');
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      
      await client.query(
        `INSERT INTO hris.user_account (
          organization_id, email, password, first_name, last_name, 
          employee_number, status, created_at, updated_at
        ) VALUES (
          $1, 'paylinq@test.com', $2, 'Test', 'User',
          'TEST001', 'active', NOW(), NOW()
        )`,
        [orgId, hashedPassword]
      );
      console.log('✓ Test user created');
    }
    
    console.log('\n✅ Test environment setup complete!');
    console.log('\nTest Credentials:');
    console.log('  Email: paylinq@test.com');
    console.log('  Password: Test123!@#');
    console.log('  Organization: Test Organization');
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
