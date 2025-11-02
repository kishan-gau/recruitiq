/**
 * Setup Load Test User
 * Creates and/or unlocks the load test user account
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { createClient } from 'redis';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recruitiq_dev'
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

async function setupLoadTestUser() {
  try {
    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Connected to Redis');
    
    console.log('🔍 Checking for load test user...');
    
    // Check if user exists
    const result = await pool.query(
      `SELECT id, email, failed_login_attempts, locked_until FROM users WHERE email = $1`,
      ['loadtest@recruitiq.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User does not exist. Creating...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash('LoadTest123!@#', 10);
      
      // Create user (assign to first organization)
      await pool.query(`
        INSERT INTO users (email, password_hash, name, organization_id, legacy_role)
        SELECT $1, $2, $3, id, 'owner'
        FROM organizations
        LIMIT 1
      `, ['loadtest@recruitiq.com', hashedPassword, 'Load Test User']);
      
      console.log('✅ Load test user created successfully');
    } else {
      console.log('✅ User exists:', {
        id: result.rows[0].id,
        email: result.rows[0].email,
        failedAttempts: result.rows[0].failed_login_attempts,
        locked: result.rows[0].locked_until ? 'Yes' : 'No'
      });
      
      // Reset account lockout
      await pool.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = $1`,
        ['loadtest@recruitiq.com']
      );
      
      console.log('✅ Account unlocked in database');
    }
    
    // Clear Redis lockouts for this user
    console.log('🔍 Clearing Redis lockouts...');
    const keys = await redisClient.keys('*loadtest@recruitiq.com*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`✅ Cleared ${keys.length} Redis lockout keys`);
    } else {
      console.log('✅ No Redis lockouts found');
    }
    
    // Also clear IP-based lockouts (localhost testing)
    const ipKeys = await redisClient.keys('*::ffff:127.0.0.1*');
    if (ipKeys.length > 0) {
      await redisClient.del(ipKeys);
      console.log(`✅ Cleared ${ipKeys.length} IP-based lockout keys`);
    }
    
    console.log('✅ Load test user ready for testing');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
  }
}

setupLoadTestUser();
