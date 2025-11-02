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
 * Seed permissions
 */
async function seedPermissions() {
  const client = await pool.connect();
  try {
    console.log('Seeding permissions...');
    
    const permissions = [
      // Portal permissions
      { name: 'portal.view', category: 'portal', description: 'View portal dashboard' },
      { name: 'portal.manage', category: 'portal', description: 'Manage portal settings' },
      
      // License permissions
      { name: 'license.view', category: 'license', description: 'View licenses' },
      { name: 'license.create', category: 'license', description: 'Create licenses' },
      { name: 'license.edit', category: 'license', description: 'Edit licenses' },
      { name: 'license.delete', category: 'license', description: 'Delete licenses' },
      { name: 'license.renew', category: 'license', description: 'Renew licenses' },
      { name: 'license.suspend', category: 'license', description: 'Suspend/reactivate licenses' },
      { name: 'license.download', category: 'license', description: 'Download license files' },
      { name: 'license.analytics', category: 'license', description: 'View license analytics' },
      { name: 'license.tiers.manage', category: 'license', description: 'Manage tier presets' },
      
      // Security permissions
      { name: 'security.view', category: 'security', description: 'View security dashboard' },
      { name: 'security.manage', category: 'security', description: 'Manage security settings' },
      { name: 'security.audit', category: 'security', description: 'View audit logs' },
      
      // VPS permissions
      { name: 'vps.view', category: 'vps', description: 'View VPS instances' },
      { name: 'vps.provision', category: 'vps', description: 'Provision VPS instances' },
      { name: 'vps.manage', category: 'vps', description: 'Manage VPS instances' },
      { name: 'vps.delete', category: 'vps', description: 'Delete VPS instances' },
      
      // Customer permissions
      { name: 'customer.view', category: 'customer', description: 'View customers' },
      { name: 'customer.create', category: 'customer', description: 'Create customers' },
      { name: 'customer.edit', category: 'customer', description: 'Edit customers' },
      { name: 'customer.delete', category: 'customer', description: 'Delete customers' },
      
      // Tenant permissions
      { name: 'tenant.view', category: 'tenant', description: 'View tenant information' },
      { name: 'tenant.manage', category: 'tenant', description: 'Manage tenant settings' },
    ];
    
    const permissionIds = {};
    
    for (const perm of permissions) {
      const result = await client.query(`
        INSERT INTO permissions (name, category, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET
          category = EXCLUDED.category,
          description = EXCLUDED.description
        RETURNING id
      `, [perm.name, perm.category, perm.description]);
      
      permissionIds[perm.name] = result.rows[0].id;
    }
    
    console.log(`✓ Seeded ${permissions.length} permissions\n`);
    return permissionIds;
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

    // Seed permissions first
    const permissionIds = await seedPermissions();

    // Get or create organization
    const organizationId = await ensureDefaultOrganization();
    console.log(`Using organization ID: ${organizationId}\n`);

    // Create each admin user
    for (const user of adminUsers) {
      try {
        // Check if user already exists
        const existingUser = await client.query(
          'SELECT id, email, legacy_role FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⚠ User ${user.email} already exists (${existingUser.rows[0].legacy_role}), updating permissions...`);
          
          // Update permissions for existing user
          const userPermissions = [];
          if (user.role === 'platform_admin') {
            userPermissions.push(...Object.values(permissionIds));
          } else if (user.role === 'security_admin') {
            userPermissions.push(
              permissionIds['security.view'],
              permissionIds['security.manage'],
              permissionIds['security.audit'],
              permissionIds['portal.view']
            );
          }
          
          await client.query(
            `UPDATE users 
             SET additional_permissions = $1,
                 user_type = 'platform',
                 legacy_role = $2
             WHERE email = $3`,
            [userPermissions, user.role, user.email]
          );
          
          console.log(`  ✓ Updated with ${userPermissions.length} permissions`);
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

        // Get permissions for user role
        const userPermissions = [];
        if (user.role === 'platform_admin') {
          // Platform admins get all permissions
          userPermissions.push(...Object.values(permissionIds));
        } else if (user.role === 'security_admin') {
          // Security admins get security + portal view
          userPermissions.push(
            permissionIds['security.view'],
            permissionIds['security.manage'],
            permissionIds['security.audit'],
            permissionIds['portal.view']
          );
        }

        // Insert user
        const result = await client.query(
          `INSERT INTO users (
            email,
            password_hash,
            name,
            user_type,
            legacy_role,
            additional_permissions,
            email_verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, email, legacy_role`,
          [
            user.email,
            passwordHash,
            user.name,
            'platform',
            user.role,
            userPermissions,
            true // Email verified for test users
          ]
        );

        console.log(`✓ Created ${user.role}: ${user.email} (${userPermissions.length} permissions)`);
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
