/**
 * Seed Default Platform Admin Users
 * Creates platform admin users for Portal access (not tenant users)
 * Run this AFTER RBAC migration to create default admin users
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Default password hash for Admin123!
  const defaultPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7WBLFBqHxO';

  // Define platform admin users
  const platformUsers = [
    {
      email: 'admin@recruitiq.com',
      name: 'Super Administrator',
      roleName: 'super_admin'
    },
    {
      email: 'license@recruitiq.com',
      name: 'License Administrator',
      roleName: 'license_admin'
    },
    {
      email: 'security@recruitiq.com',
      name: 'Security Administrator',
      roleName: 'security_admin'
    }
  ];

  console.log('\n================================================================');
  console.log('[INFO] Seeding platform admin users...');
  console.log('================================================================\n');

  for (const user of platformUsers) {
    // Get role ID (should exist from RBAC seeding)
    const [role] = await knex('public.roles')
      .where({ name: user.roleName })
      .whereNull('organization_id')
      .select('id')
      .limit(1);

    if (!role) {
      console.log(`[SKIP] Role '${user.roleName}' not found - skipping user ${user.email}`);
      continue;
    }

    // Create platform user
    const [insertedUser] = await knex('public.platform_users')
      .insert({
        email: user.email,
        password_hash: defaultPasswordHash,
        name: user.name,
        is_active: true,
        created_at: knex.fn.now()
      })
      .onConflict('email')
      .ignore()
      .returning('id');

    if (insertedUser) {
      // Assign role to user
      await knex('public.user_roles')
        .insert({
          user_id: insertedUser.id,
          role_id: role.id,
          created_by: insertedUser.id
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();

      console.log(`[OK] Created user: ${user.email} with role: ${user.roleName}`);
    } else {
      console.log(`[SKIP] User already exists: ${user.email}`);
    }
  }

  console.log('\n================================================================');
  console.log('[OK] Platform admin users seeded successfully!');
  console.log('================================================================');
  console.log('Platform Admin Users:');
  console.log('  - admin@recruitiq.com (Super Admin)');
  console.log('  - license@recruitiq.com (License Admin)');
  console.log('  - security@recruitiq.com (Security Admin)');
  console.log('');
  console.log('Password for all: Admin123!');
  console.log('');
  console.log('[WARNING] Remember to change these passwords in production!');
  console.log('================================================================\n');
};
