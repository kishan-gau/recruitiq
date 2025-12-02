/**
 * Seed: Platform RBAC Permissions and Roles
 * Source: seed-rbac-platform.sql
 * 
 * Seeds platform-level permissions and roles for Portal app:
 * - License management permissions
 * - Portal/platform management permissions
 * - Security permissions
 * - VPS/infrastructure permissions
 * - Deployment permissions
 * - Tenant/organization management permissions
 * - Platform roles (super_admin, platform_admin, etc.)
 */

export async function seed(knex) {
  // ============================================================================
  // 1. SEED PLATFORM PERMISSIONS (organization_id IS NULL = platform-wide)
  // ============================================================================

  // License Management Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'license:view', display_name: 'View Licenses', description: 'View licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:create', display_name: 'Create Licenses', description: 'Create new licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:edit', display_name: 'Edit Licenses', description: 'Edit existing licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:delete', display_name: 'Delete Licenses', description: 'Delete licenses and customers', category: 'license' },
    { product: 'platform', name: 'license:renew', display_name: 'Renew Licenses', description: 'Renew licenses', category: 'license' },
    { product: 'platform', name: 'license:suspend', display_name: 'Suspend Licenses', description: 'Suspend licenses', category: 'license' },
    { product: 'platform', name: 'license:download', display_name: 'Download License Files', description: 'Download license files', category: 'license' },
    { product: 'platform', name: 'license:analytics', display_name: 'View License Analytics', description: 'View license analytics and reports', category: 'license' }
  ]).onConflict(['product', 'name']).ignore();

  // Portal/Platform Management Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'portal:view', display_name: 'View Portal Dashboard', description: 'Access admin portal dashboard', category: 'portal' },
    { product: 'platform', name: 'portal:users:manage', display_name: 'Manage Portal Users', description: 'Manage portal admin users', category: 'portal' },
    { product: 'platform', name: 'portal:settings', display_name: 'Manage Platform Settings', description: 'Manage platform settings', category: 'portal' }
  ]).onConflict(['product', 'name']).ignore();

  // Security Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'security:view', display_name: 'View Security Logs', description: 'View security logs and alerts', category: 'security' },
    { product: 'platform', name: 'security:manage', display_name: 'Manage Security', description: 'Manage security settings and respond to alerts', category: 'security' },
    { product: 'platform', name: 'security:audit', display_name: 'View Audit Logs', description: 'View audit logs', category: 'security' }
  ]).onConflict(['product', 'name']).ignore();

  // VPS/Infrastructure Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'vps:view', display_name: 'View VPS Instances', description: 'View VPS instances', category: 'infrastructure' },
    { product: 'platform', name: 'vps:provision', display_name: 'Provision VPS', description: 'Provision new VPS instances', category: 'infrastructure' },
    { product: 'platform', name: 'vps:manage', display_name: 'Manage VPS', description: 'Manage VPS instances (start, stop, restart)', category: 'infrastructure' },
    { product: 'platform', name: 'vps:delete', display_name: 'Delete VPS', description: 'Delete VPS instances', category: 'infrastructure' },
    { product: 'platform', name: 'vps:ssh', display_name: 'SSH Access', description: 'SSH access to VPS instances', category: 'infrastructure' }
  ]).onConflict(['product', 'name']).ignore();

  // Deployment Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'deployment:view', display_name: 'View Deployments', description: 'View deployment status', category: 'deployment' },
    { product: 'platform', name: 'deployment:create', display_name: 'Create Deployments', description: 'Create new deployments', category: 'deployment' },
    { product: 'platform', name: 'deployment:manage', display_name: 'Manage Deployments', description: 'Manage deployments (cancel, retry)', category: 'deployment' },
    { product: 'platform', name: 'deployment:logs', display_name: 'View Deployment Logs', description: 'View deployment logs', category: 'deployment' }
  ]).onConflict(['product', 'name']).ignore();

  // Tenant/Organization Management Permissions
  await knex('permissions').insert([
    { product: 'platform', name: 'tenant:view', display_name: 'View Tenants', description: 'View tenant organizations', category: 'tenant' },
    { product: 'platform', name: 'tenant:create', display_name: 'Create Tenants', description: 'Create new tenant organizations', category: 'tenant' },
    { product: 'platform', name: 'tenant:edit', display_name: 'Edit Tenants', description: 'Edit tenant organizations', category: 'tenant' },
    { product: 'platform', name: 'tenant:delete', display_name: 'Delete Tenants', description: 'Delete tenant organizations', category: 'tenant' },
    { product: 'platform', name: 'tenant:users:manage', display_name: 'Manage Tenant Users', description: 'Manage users in tenant organizations', category: 'tenant' }
  ]).onConflict(['product', 'name']).ignore();

  // ============================================================================
  // 2. SEED PLATFORM ROLES (organization_id IS NULL = platform-wide)
  // ============================================================================

  // Create platform roles (organization_id = NULL for platform-wide roles)
  const platformRoles = [
    { organization_id: null, name: 'super_admin', display_name: 'Super Administrator', role_type: 'system', description: 'Full access to all platform features' },
    { organization_id: null, name: 'platform_admin', display_name: 'Platform Administrator', role_type: 'system', description: 'Manage platform, licenses, and deployments' },
    { organization_id: null, name: 'license_admin', display_name: 'License Administrator', role_type: 'system', description: 'Manage licenses and customers only' },
    { organization_id: null, name: 'security_admin', display_name: 'Security Administrator', role_type: 'system', description: 'Manage security and monitoring' },
    { organization_id: null, name: 'deployment_admin', display_name: 'Deployment Administrator', role_type: 'system', description: 'Manage VPS and deployments' },
    { organization_id: null, name: 'support_staff', display_name: 'Support Staff', role_type: 'system', description: 'View-only access for customer support' }
  ];

  for (const role of platformRoles) {
    await knex('roles')
      .insert(role)
      .onConflict(['organization_id', 'name'])
      .merge({ display_name: role.display_name, description: role.description });
  }

  // Get role IDs for permission assignments
  const superAdminRole = await knex('roles').where({ name: 'super_admin', organization_id: null }).first();
  const platformAdminRole = await knex('roles').where({ name: 'platform_admin', organization_id: null }).first();
  const licenseAdminRole = await knex('roles').where({ name: 'license_admin', organization_id: null }).first();
  const securityAdminRole = await knex('roles').where({ name: 'security_admin', organization_id: null }).first();
  const deploymentAdminRole = await knex('roles').where({ name: 'deployment_admin', organization_id: null }).first();
  const supportStaffRole = await knex('roles').where({ name: 'support_staff', organization_id: null }).first();

  // Get platform permissions
  const platformPermissions = await knex('permissions').where('product', 'platform');

  // Assign permissions to super_admin (all permissions)
  if (superAdminRole) {
    for (const permission of platformPermissions) {
      await knex('role_permissions')
        .insert({ role_id: superAdminRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  // Assign permissions to platform_admin
  if (platformAdminRole) {
    const platformAdminPermissions = platformPermissions.filter(p => 
      ['portal', 'license', 'deployment', 'tenant'].includes(p.category)
    );
    for (const permission of platformAdminPermissions) {
      await knex('role_permissions')
        .insert({ role_id: platformAdminRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  // Assign permissions to license_admin
  if (licenseAdminRole) {
    const licensePermissions = platformPermissions.filter(p => p.category === 'license');
    for (const permission of licensePermissions) {
      await knex('role_permissions')
        .insert({ role_id: licenseAdminRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  // Assign permissions to security_admin
  if (securityAdminRole) {
    const securityPermissions = platformPermissions.filter(p => p.category === 'security');
    for (const permission of securityPermissions) {
      await knex('role_permissions')
        .insert({ role_id: securityAdminRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  // Assign permissions to deployment_admin
  if (deploymentAdminRole) {
    const deploymentPermissions = platformPermissions.filter(p => 
      ['infrastructure', 'deployment'].includes(p.category)
    );
    for (const permission of deploymentPermissions) {
      await knex('role_permissions')
        .insert({ role_id: deploymentAdminRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  // Assign view-only permissions to support_staff
  if (supportStaffRole) {
    const viewPermissions = platformPermissions.filter(p => p.name.endsWith(':view'));
    for (const permission of viewPermissions) {
      await knex('role_permissions')
        .insert({ role_id: supportStaffRole.id, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Platform RBAC permissions and roles seeded successfully!');
  console.log('Platform Roles Created (organization_id = NULL):');
  console.log('  - super_admin - Full platform access');
  console.log('  - platform_admin - Platform, licenses, deployments');
  console.log('  - security_admin - Security and monitoring');
  console.log('  - deployment_admin - VPS and deployments');
  console.log('  - license_admin - Licenses only');
  console.log('  - support_staff - View-only support access');
}
