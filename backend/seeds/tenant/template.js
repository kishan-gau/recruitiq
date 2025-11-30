/**
 * Tenant Seed Template
 * Use this as a template to create system roles for a new organization
 * 
 * Usage:
 * 1. Copy this file
 * 2. Replace ORGANIZATION_ID with actual organization UUID
 * 3. Run: npx knex seed:run --specific=tenant/organization_name.js
 */

export async function seed(knex) {
  // Replace with actual organization ID
  const ORGANIZATION_ID = 'YOUR_ORG_ID_HERE';
  
  // Verify organization exists
  const org = await knex('organizations').where('id', ORGANIZATION_ID).first();
  if (!org) {
    throw new Error(`Organization ${ORGANIZATION_ID} not found`);
  }

  console.log(`Creating system roles for organization: ${org.name}`);

  // Define system roles
  const systemRoles = [
    {
      name: 'owner',
      display_name: 'Organization Owner',
      role_type: 'tenant',
      description: 'Full administrative access to the organization'
    },
    {
      name: 'admin',
      display_name: 'Administrator',
      role_type: 'tenant',
      description: 'Administrative access with some limitations'
    },
    {
      name: 'manager',
      display_name: 'Manager',
      role_type: 'tenant',
      description: 'Team management and operational access'
    },
    {
      name: 'user',
      display_name: 'User',
      role_type: 'tenant',
      description: 'Standard user access'
    },
    {
      name: 'viewer',
      display_name: 'Viewer',
      role_type: 'tenant',
      description: 'Read-only access'
    }
  ];

  // Insert roles
  const roleIds = {};
  for (const roleData of systemRoles) {
    const [role] = await knex('roles').insert({
      id: knex.raw('uuid_generate_v4()'),
      organization_id: ORGANIZATION_ID,
      name: roleData.name,
      display_name: roleData.display_name,
      role_type: roleData.role_type,
      description: roleData.description,
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }).returning('*');
    
    roleIds[roleData.name] = role.id;
    console.log(`  Created role: ${roleData.display_name}`);
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

  console.log('Assigning permissions to roles...');

  // Owner - ALL permissions
  for (const perm of allPermissions) {
    await knex('role_permissions').insert({
      id: knex.raw('uuid_generate_v4()'),
      role_id: roleIds.owner,
      permission_id: perm.id,
      created_at: knex.fn.now()
    });
  }
  console.log(`  Owner: ${allPermissions.length} permissions`);

  // Admin - All tenant and product permissions (no platform)
  const adminCategories = ['tenant', 'recruitiq', 'paylinq', 'nexus', 'schedulehub'];
  let adminPermCount = 0;
  for (const category of adminCategories) {
    if (permissionsByCategory[category]) {
      for (const perm of permissionsByCategory[category]) {
        await knex('role_permissions').insert({
          id: knex.raw('uuid_generate_v4()'),
          role_id: roleIds.admin,
          permission_id: perm.id,
          created_at: knex.fn.now()
        });
        adminPermCount++;
      }
    }
  }
  console.log(`  Admin: ${adminPermCount} permissions`);

  // Manager - View and manage permissions (no delete/settings)
  const managerPermPatterns = ['.view', '.create', '.edit', '.manage', '.schedule', '.process', '.assign'];
  let managerPermCount = 0;
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && managerPermPatterns.some(pattern => perm.name.includes(pattern))) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds.manager,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
      managerPermCount++;
    }
  }
  console.log(`  Manager: ${managerPermCount} permissions`);

  // User - Basic view and create permissions
  const userPermPatterns = ['.view', '.create'];
  let userPermCount = 0;
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && perm.category !== 'tenant' && 
        userPermPatterns.some(pattern => perm.name.includes(pattern))) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds.user,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
      userPermCount++;
    }
  }
  console.log(`  User: ${userPermCount} permissions`);

  // Viewer - Only view permissions
  let viewerPermCount = 0;
  for (const perm of allPermissions) {
    if (perm.category !== 'platform' && perm.name.includes('.view')) {
      await knex('role_permissions').insert({
        id: knex.raw('uuid_generate_v4()'),
        role_id: roleIds.viewer,
        permission_id: perm.id,
        created_at: knex.fn.now()
      });
      viewerPermCount++;
    }
  }
  console.log(`  Viewer: ${viewerPermCount} permissions`);

  console.log(`✅ Successfully created system roles for ${org.name}`);
}
