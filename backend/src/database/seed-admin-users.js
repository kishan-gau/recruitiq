/**
 * Seed Platform Admin Users
 * Creates test users for platform administration and security monitoring
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

const SALT_ROUNDS = 10;

// Test admin users to create
const adminUsers = [
  {
    email: 'platform_admin@recruitiq.com',
    password: 'Admin123!',
    name: 'Platform Administrator',
    role: 'platform_admin'
  },
  {
    email: 'security_admin@recruitiq.com',
    password: 'Admin123!',
    name: 'Security Administrator',
    role: 'security_admin'
  },
  {
    email: 'admin@recruitiq.com',
    password: 'Admin123!',
    name: 'Test Admin',
    role: 'admin'
  }
];

/**
 * Create or get a default organization for admin users
 */
async function ensureDefaultOrganization() {
  const client = await pool.connect();
  try {
    // Check if default org exists
    const result = await client.query(
      'SELECT id FROM organizations WHERE slug = $1',
      ['platform']
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Create default organization
    const insertResult = await client.query(
      `INSERT INTO organizations (name, slug, tier, max_users, max_workspaces)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Platform Administration', 'platform', 'enterprise', 100, 10]
    );

    console.log('✓ Created default platform organization');
    return insertResult.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Seed platform admin users
 */
async function seedAdminUsers() {
  const client = await pool.connect();
  
  try {
    console.log('Starting admin user seeding...\n');

    // Get or create organization
    const organizationId = await ensureDefaultOrganization();
    console.log(`Using organization ID: ${organizationId}\n`);

    // Create each admin user
    for (const user of adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id, email, role FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⚠ User ${user.email} already exists (${existingUser.rows[0].role})`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Insert user
        const result = await client.query(
          `INSERT INTO users (
            organization_id,
            email,
            password_hash,
            name,
            role,
            email_verified
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, email, role`,
          [
            organizationId,
            user.email,
            passwordHash,
            user.name,
            user.role,
            true // Email verified for test users
          ]
        );

        console.log(`✓ Created ${user.role}: ${user.email}`);
      } catch (error) {
        console.error(`✗ Failed to create ${user.email}:`, error.message);
      }
    }

    console.log('\n✓ Admin user seeding completed!');
    console.log('\nTest Credentials:');
    adminUsers.forEach(user => {
      console.log(`  ${user.email} / ${user.password}`);
    });

  } catch (error) {
    console.error('Error seeding admin users:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run the seed script
 */
async function main() {
  try {
    await seedAdminUsers();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('seed-admin-users.js')) {
  main();
}

export { seedAdminUsers };
