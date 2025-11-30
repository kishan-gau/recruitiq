/**
 * Development Seed: Roles
 * Seeds system roles for test organizations
 */

export async function seed(knex) {
  // Delete existing role_permissions and roles
  await knex('role_permissions').del();
  await knex('roles').del();

  // Get organization IDs
  const testOrg = await knex('organizations').where('slug', 'test-org').first();
  const demoOrg = await knex('organizations').where('slug', 'demo-company').first();

  if (!testOrg || !demoOrg) {
    throw new Error('Organizations must be seeded before roles');
  }

  // Define system roles for each organization
  const systemRoles = [
    {
      name: 'owner',
      display_name: 'Organization Owner',
      product: 'platform',
      description: 'Full administrative access to the organization',
      is_system_role: true,
      is_default: true
    },
    {
      name: 'admin',
      display_name: 'Administrator',
      product: 'platform',
      description: 'Administrative access with some limitations',
      is_system_role: true,
      is_default: false
    },
    {
      name: 'manager',
      display_name: 'Manager',
      product: 'platform',
      description: 'Team management and operational access',
      is_system_role: true,
      is_default: false
    },
    {
      name: 'user',
      display_name: 'User',
      product: 'platform',
      description: 'Standard user access',
      is_system_role: true,
      is_default: false
    },
    {
      name: 'viewer',
      display_name: 'Viewer',
      product: 'platform',
      description: 'Read-only access',
      is_system_role: true,
      is_default: false
    }
  ];

  // Insert roles for both organizations
  const roleIds = {};
  
  for (const orgId of [testOrg.id, demoOrg.id]) {
    roleIds[orgId] = {};
    
    for (const roleData of systemRoles) {
      const [role] = await knex('roles').insert({
        id: knex.raw('uuid_generate_v4()'),
        organization_id: orgId,
        product: roleData.product,
        name: roleData.name,
        display_name: roleData.display_name,
        description: roleData.description,
        is_system_role: roleData.is_system_role,
        is_custom_role: false,
        is_default: roleData.is_default,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      }).returning('*');
      
      roleIds[orgId][roleData.name] = role.id;
    }
  }

  // Get all permissions
  const allPermissions = await knex('permissions').select('id', 'name', 'category');
  
  // Create permission maps by category
  const permissionsByCategory = {};
  for (const perm of allPermissions) {
    if (!permissionsByCategory[perm.category]) {
      permissionsByCategory[perm.category] = [];
    }
    permissionsByCategory[perm.category].push(perm);
  }

  // Assign permissions to roles for test organization
  const orgId = testOrg.id;

  // Owner - ALL permissions
  for (const perm of allPermissions) {
    await knex('role_permissions').insert({
      id: knex.raw('uuid_generate_v4()'),
      role_id: roleIds[orgId].owner,
      permission_id: perm.id,
      created_at: knex.fn.now()
    });
  }

  // Admin - All tenant and product permissions (no platform)
  const adminCategories = ['tenant', 'recruitiq', 'paylinq', 'nexus', 'schedulehub'];
  for (const category of adminCategories) {
    if (permissionsByCategory[category]) {
      for (const perm of permissionsByCategory[category]) {
        await knex('role_permissions').insert({
          id: knex.raw('uuid_generate_v4()'),
          role_id: roleIds[orgId].admin,
          permission_id: perm.id,
          created_at: knex.fn.now()
        });
      }
    }
  }

  // Manager - View and manage permissions (no delete/settings)
  const managerPermPatterns = ['.view', '.create', '.edit', '.manage', '.schedule', '.process', '.assign'];
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && managerPermPatterns.some(pattern => perm.name.includes(pattern))) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds[orgId].manager,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
    }
  }

  // User - Basic view and create permissions
  const userPermPatterns = ['.view', '.create'];
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && perm.category !== 'tenant' && 
        userPermPatterns.some(pattern => perm.name.includes(pattern))) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds[orgId].user,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
    }
  }

  // Viewer - Only view permissions
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && perm.name.includes('.view')) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds[orgId].viewer,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
    }
  }
}
