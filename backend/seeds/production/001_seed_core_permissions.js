/**
 * Seed file for core platform permissions
 * Environment: Production
 */

export async function seed(knex) {
  const tableName = 'hris.permissions';

  // Check if permissions already exist
  const existingPermissions = await knex(tableName).select('code').limit(1);

  if (existingPermissions.length > 0) {
    console.log('✓ Permissions already seeded');
    return;
  }

  console.log('→ Seeding core platform permissions...');

  const permissions = [
    // ========================================
    // RBAC Management Permissions
    // ========================================
    {
      code: 'rbac.view',
      name: 'View RBAC Settings',
      description: 'View roles, permissions, and access control settings',
      category: 'rbac',
      is_system: true,
    },
    {
      code: 'rbac.manage',
      name: 'Manage RBAC',
      description: 'Create, update, and delete roles and permissions',
      category: 'rbac',
      is_system: true,
    },
    {
      code: 'rbac.assign_roles',
      name: 'Assign Roles',
      description: 'Assign and unassign roles to users',
      category: 'rbac',
      is_system: true,
    },

    // ========================================
    // User Management Permissions
    // ========================================
    {
      code: 'users.view',
      name: 'View Users',
      description: 'View user profiles and information',
      category: 'users',
      is_system: false,
    },
    {
      code: 'users.create',
      name: 'Create Users',
      description: 'Create new user accounts',
      category: 'users',
      is_system: false,
    },
    {
      code: 'users.update',
      name: 'Update Users',
      description: 'Update user profiles and information',
      category: 'users',
      is_system: false,
    },
    {
      code: 'users.delete',
      name: 'Delete Users',
      description: 'Delete user accounts',
      category: 'users',
      is_system: false,
    },
    {
      code: 'users.manage_all',
      name: 'Manage All Users',
      description: 'Full access to manage all users in organization',
      category: 'users',
      is_system: false,
    },

    // ========================================
    // Organization Permissions
    // ========================================
    {
      code: 'organization.view',
      name: 'View Organization',
      description: 'View organization settings and information',
      category: 'organization',
      is_system: false,
    },
    {
      code: 'organization.update',
      name: 'Update Organization',
      description: 'Update organization settings',
      category: 'organization',
      is_system: false,
    },
    {
      code: 'organization.manage_billing',
      name: 'Manage Billing',
      description: 'Manage billing and subscription settings',
      category: 'organization',
      is_system: false,
    },

    // ========================================
    // Product Access Permissions
    // ========================================
    {
      code: 'products.nexus.access',
      name: 'Access Nexus',
      description: 'Access to Nexus HRIS product',
      category: 'products',
      is_system: false,
    },
    {
      code: 'products.paylinq.access',
      name: 'Access PayLinQ',
      description: 'Access to PayLinQ payroll product',
      category: 'products',
      is_system: false,
    },
    {
      code: 'products.schedulehub.access',
      name: 'Access ScheduleHub',
      description: 'Access to ScheduleHub scheduling product',
      category: 'products',
      is_system: false,
    },
    {
      code: 'products.recruitiq.access',
      name: 'Access RecruitIQ',
      description: 'Access to RecruitIQ recruitment product',
      category: 'products',
      is_system: false,
    },

    // ========================================
    // Reporting Permissions
    // ========================================
    {
      code: 'reports.view',
      name: 'View Reports',
      description: 'View reports and analytics',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'reports.create',
      name: 'Create Reports',
      description: 'Create custom reports',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'reports.export',
      name: 'Export Reports',
      description: 'Export reports to various formats',
      category: 'reports',
      is_system: false,
    },

    // ========================================
    // System Administration Permissions
    // ========================================
    {
      code: 'system.admin',
      name: 'System Administrator',
      description: 'Full system administration access',
      category: 'system',
      is_system: true,
    },
    {
      code: 'system.audit_logs',
      name: 'View Audit Logs',
      description: 'View system audit logs',
      category: 'system',
      is_system: true,
    },
  ];

  await knex(tableName).insert(permissions);

  console.log(`✓ Seeded ${permissions.length} core permissions`);
}
