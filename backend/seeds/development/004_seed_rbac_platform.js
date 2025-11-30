/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // ============================================================================
  // SEED PLATFORM PERMISSIONS (organization_id IS NULL = platform-wide)
  // ============================================================================
  
  const platformPermissions = [
    // License Management Permissions
    { product: 'platform', name: 'license:view', display_name: 'View Licenses', description: 'View licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:create', display_name: 'Create Licenses', description: 'Create new licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:edit', display_name: 'Edit Licenses', description: 'Edit existing licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:delete', display_name: 'Delete Licenses', description: 'Delete licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:renew', display_name: 'Renew Licenses', description: 'Renew licenses', category: 'license' },
    { product: 'platform', name: 'license:suspend', display_name: 'Suspend Licenses', description: 'Suspend licenses', category: 'license' },
    { product: 'platform', name: 'license:download', display_name: 'Download License Files', description: 'Download license files', category: 'license' },
    { product: 'platform', name: 'license:analytics', display_name: 'View License Analytics', description: 'View license analytics and reports', category: 'license' },
    
    // Portal/Platform Management Permissions
    { product: 'platform', name: 'portal:view', display_name: 'View Portal Dashboard', description: 'Access admin portal dashboard', category: 'portal' },
    { product: 'platform', name: 'portal:users:manage', display_name: 'Manage Portal Users', description: 'Manage portal admin users', category: 'portal' },
    { product: 'platform', name: 'portal:settings', display_name: 'Manage Platform Settings', description: 'Manage platform settings', category: 'portal' },
    
    // Security Permissions
    { product: 'platform', name: 'security:audit', display_name: 'View Audit Logs', description: 'View security audit logs', category: 'security' },
    { product: 'platform', name: 'security:manage', display_name: 'Manage Security', description: 'Manage security settings', category: 'security' }
  ];

  // Insert platform permissions with conflict handling
  for (const permission of platformPermissions) {
    await knex('permissions')
      .insert(permission)
      .onConflict(['product', 'name'])
      .ignore();
  }

  // ============================================================================
  // 2. SEED PLATFORM ROLES (Super Admin, Support, etc.)
  // ============================================================================
  
  const platformRoles = [
    {
      name: 'Super Admin',
      display_name: 'Super Admin',
      description: 'Full platform access - all products, all customers',
      is_system_role: true,
      organization_id: null, // Platform-wide role
      product: 'platform'
    },
    {
      name: 'Support Engineer',
      display_name: 'Support Engineer',
      description: 'Read-only access to customer data for support',
      is_system_role: true,
      organization_id: null,
      product: 'platform'
    },
    {
      name: 'Sales Manager',
      display_name: 'Sales Manager',
      description: 'License management and customer analytics',
      is_system_role: true,
      organization_id: null,
      product: 'platform'
    }
  ];

  // Insert platform roles
  const roleIds = {};
  for (const role of platformRoles) {
    const [existingRole] = await knex('roles')
      .where({ name: role.name, organization_id: null, product: role.product })
      .select('id');
    
    if (existingRole) {
      roleIds[role.name] = existingRole.id;
    } else {
      const [insertedRole] = await knex('roles')
        .insert(role)
        .returning('id');
      roleIds[role.name] = insertedRole.id;
    }
  }

  // ============================================================================
  // 3. ASSIGN PERMISSIONS TO PLATFORM ROLES
  // ============================================================================
  
  // Super Admin gets ALL platform permissions
  const allPlatformPermissions = await knex('permissions')
    .where('product', 'platform')
    .select('id');
  
  const superAdminRoleId = roleIds['Super Admin'];
  for (const permission of allPlatformPermissions) {
    await knex('role_permissions')
      .insert({
        role_id: superAdminRoleId,
        permission_id: permission.id
      })
      .onConflict(['role_id', 'permission_id'])
      .ignore();
  }

  // Support Engineer gets read-only permissions
  const supportPermissions = await knex('permissions')
    .where('product', 'platform')
    .whereIn('name', ['license:view', 'portal:view', 'security:audit'])
    .select('id');
  
  const supportRoleId = roleIds['Support Engineer'];
  for (const permission of supportPermissions) {
    await knex('role_permissions')
      .insert({
        role_id: supportRoleId,
        permission_id: permission.id
      })
      .onConflict(['role_id', 'permission_id'])
      .ignore();
  }

  // Sales Manager gets license management permissions
  const salesPermissions = await knex('permissions')
    .where('product', 'platform')
    .where('name', 'like', 'license:%')
    .select('id');
  
  const salesRoleId = roleIds['Sales Manager'];
  for (const permission of salesPermissions) {
    await knex('role_permissions')
      .insert({
        role_id: salesRoleId,
        permission_id: permission.id
      })
      .onConflict(['role_id', 'permission_id'])
      .ignore();
  }

  console.log('✓ Platform RBAC seeded successfully');
};
