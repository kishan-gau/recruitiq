/**
 * Fix RBAC Schema
 * 
 * This script drops the old RBAC tables that have outdated schema
 * and allows the migrations to create the correct schema.
 * 
 * Run this before running migrations if you encounter errors about
 * missing columns like display_name, is_default, is_system_role, product.
 */

import knex from 'knex';
import knexConfig from '../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

async function fixRBACSchema() {
  console.log('🔧 Fixing RBAC schema...\n');

  try {
    // Drop tables in reverse dependency order
    console.log('Dropping old RBAC tables...');
    
    await db.raw('DROP TABLE IF EXISTS user_roles CASCADE');
    console.log('  ✓ Dropped user_roles');
    
    await db.raw('DROP TABLE IF EXISTS role_permissions CASCADE');
    console.log('  ✓ Dropped role_permissions');
    
    await db.raw('DROP TABLE IF EXISTS roles CASCADE');
    console.log('  ✓ Dropped roles');
    
    await db.raw('DROP TABLE IF EXISTS permissions CASCADE');
    console.log('  ✓ Dropped permissions');
    
    console.log('\n✅ Old RBAC tables dropped successfully!');
    console.log('\nNow run: npm run migrate:latest');
    console.log('Then run: npm run seed');
    
  } catch (error) {
    console.error('\n❌ Error fixing RBAC schema:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
}

fixRBACSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
