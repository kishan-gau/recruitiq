/**
 * Seed: Admin Users
 * Source: seed-admin-users.sql
 * 
 * Seeds default platform admin users for Portal access:
 * - admin@recruitiq.com (Super Administrator)
 * - license@recruitiq.com (License Administrator)
 * - security@recruitiq.com (Security Administrator)
 * 
 * Password for all: Admin123!
 * 
 * WARNING: Change these passwords in production!
 */

export async function seed(knex) {
  // Get role IDs (these should be created by RBAC migration or separate seed)
  const superAdminRole = await knex('roles').where({ name: 'super_admin', organization_id: null }).first();
  const licenseAdminRole = await knex('roles').where({ name: 'license_admin', organization_id: null }).first();
  const securityAdminRole = await knex('roles').where({ name: 'security_admin', organization_id: null }).first();

  // Password: Admin123! (bcrypt hash)
  const passwordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7WBLFBqHxO';

  // Only create users if roles exist
  if (superAdminRole) {
    // Create Super Admin user
    const result = await knex('platform_users')
      .insert({
        email: 'admin@recruitiq.com',
        password_hash: passwordHash,
        name: 'Super Administrator',
        is_active: true,
        role: 'super_admin'
      })
      .onConflict('email')
      .ignore()
      .returning('id');

    const adminUserId = result[0]?.id;

    // Assign super_admin role
    if (adminUserId) {
      await knex('user_roles')
        .insert({
          user_id: adminUserId,
          role_id: superAdminRole.id,
          created_by: adminUserId
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    }
  }

  if (licenseAdminRole) {
    // Create License Admin user
    const result = await knex('platform_users')
      .insert({
        email: 'license@recruitiq.com',
        password_hash: passwordHash,
        name: 'License Administrator',
        is_active: true,
        role: 'admin'
      })
      .onConflict('email')
      .ignore()
      .returning('id');

    const licenseUserId = result[0]?.id;

    // Assign license_admin role
    if (licenseUserId) {
      await knex('user_roles')
        .insert({
          user_id: licenseUserId,
          role_id: licenseAdminRole.id,
          created_by: licenseUserId
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    }
  }

  if (securityAdminRole) {
    // Create Security Admin user
    const result = await knex('platform_users')
      .insert({
        email: 'security@recruitiq.com',
        password_hash: passwordHash,
        name: 'Security Administrator',
        is_active: true,
        role: 'admin'
      })
      .onConflict('email')
      .ignore()
      .returning('id');

    const securityUserId = result[0]?.id;

    // Assign security_admin role
    if (securityUserId) {
      await knex('user_roles')
        .insert({
          user_id: securityUserId,
          role_id: securityAdminRole.id,
          created_by: securityUserId
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    }
  }

  console.log('');
  console.log('================================================================');
  console.log('[OK] Default admin users seeded successfully!');
  console.log('================================================================');
  console.log('Platform Admin Users Created:');
  console.log('  - admin@recruitiq.com (Super Admin)');
  console.log('  - license@recruitiq.com (License Admin)');
  console.log('  - security@recruitiq.com (Security Admin)');
  console.log('');
  console.log('Password for all: Admin123!');
  console.log('');
  console.log('[WARNING] Remember to change these passwords in production!');
  console.log('================================================================');
}
