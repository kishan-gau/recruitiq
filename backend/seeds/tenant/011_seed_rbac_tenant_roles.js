/**
 * Seed: Default Tenant Roles (Organization-Level System Roles)
 * Source: seed-rbac-tenant-roles.sql
 * 
 * Seeds default system roles for tenant organizations:
 * - Organization Administrator
 * - HR Manager
 * - Payroll Administrator
 * - Payroll Manager
 * - Scheduler
 * - Recruiter
 * - Hiring Manager
 * - Manager
 * - Employee
 * 
 * These roles are created for EACH organization for development/testing.
 * In production, roles are created automatically during organization onboarding.
 */

export async function seed(knex) {
  // Get test organization ID
  const testOrg = await knex('organizations').where('slug', 'test-company').first();
  
  if (!testOrg) {
    console.log('[SKIP] Test organization not found. Run test-tenant seed first.');
    return;
  }

  const testOrgId = testOrg.id;
  console.log('');
  console.log('================================================================');
  console.log('[*] Creating default tenant roles for: Test Company Ltd');
  console.log('================================================================');

  // ============================================================================
  // 1. ORGANIZATION ADMIN (Full access to all products)
  // ============================================================================
  const orgAdminRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'org_admin',
      display_name: 'Organization Administrator',
      role_type: 'tenant',
      description: 'Full administrative access to all products and settings',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Organization Administrator', description: 'Full administrative access to all products and settings' })
    .returning('id');

  const orgAdminRoleId = orgAdminRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'org_admin' }).first())?.id;

  // Assign ALL permissions to org admin
  if (orgAdminRoleId) {
    const allProductPermissions = await knex('permissions').whereIn('product', ['nexus', 'paylinq', 'schedulehub', 'recruitiq']);
    for (const permission of allProductPermissions) {
      await knex('role_permissions')
        .insert({ role_id: orgAdminRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Organization Administrator (full access)');

  // ============================================================================
  // 2. HR MANAGER (Nexus HRIS + RecruitIQ ATS access)
  // ============================================================================
  const hrManagerRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'hr_manager',
      display_name: 'HR Manager',
      role_type: 'tenant',
      description: 'Manage employees, recruitment, benefits, and HR operations',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'HR Manager', description: 'Manage employees, recruitment, benefits, and HR operations' })
    .returning('id');

  const hrManagerRoleId = hrManagerRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'hr_manager' }).first())?.id;

  // Assign Nexus permissions (full HRIS access)
  if (hrManagerRoleId) {
    const nexusPermissions = await knex('permissions')
      .where('product', 'nexus')
      .whereIn('category', ['employees', 'departments', 'locations', 'contracts', 'benefits', 'documents', 'reports', 'settings']);
    
    for (const permission of nexusPermissions) {
      await knex('role_permissions')
        .insert({ role_id: hrManagerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // Assign RecruitIQ permissions (full ATS access)
    const recruitiqPermissions = await knex('permissions').where('product', 'recruitiq');
    for (const permission of recruitiqPermissions) {
      await knex('role_permissions')
        .insert({ role_id: hrManagerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: HR Manager (Nexus + RecruitIQ)');

  // ============================================================================
  // 3. PAYROLL ADMINISTRATOR (PayLinQ full access)
  // ============================================================================
  const payrollAdminRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'payroll_admin',
      display_name: 'Payroll Administrator',
      role_type: 'tenant',
      description: 'Full payroll management including processing, payments, and compliance',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Payroll Administrator', description: 'Full payroll management including processing, payments, and compliance' })
    .returning('id');

  const payrollAdminRoleId = payrollAdminRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'payroll_admin' }).first())?.id;

  // Assign ALL PayLinQ permissions
  if (payrollAdminRoleId) {
    const paylinqPermissions = await knex('permissions').where('product', 'paylinq');
    for (const permission of paylinqPermissions) {
      await knex('role_permissions')
        .insert({ role_id: payrollAdminRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // Add employee view permissions from Nexus
    const nexusViewPermissions = await knex('permissions')
      .where('product', 'nexus')
      .whereIn('name', ['employees:read', 'departments:read', 'locations:read']);
    
    for (const permission of nexusViewPermissions) {
      await knex('role_permissions')
        .insert({ role_id: payrollAdminRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Payroll Administrator (PayLinQ full access)');

  // ============================================================================
  // 4. PAYROLL MANAGER (PayLinQ view + approve)
  // ============================================================================
  const payrollManagerRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'payroll_manager',
      display_name: 'Payroll Manager',
      role_type: 'tenant',
      description: 'Review and approve payroll runs, view reports',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Payroll Manager', description: 'Review and approve payroll runs, view reports' })
    .returning('id');

  const payrollManagerRoleId = payrollManagerRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'payroll_manager' }).first())?.id;

  // Assign PayLinQ view + approve permissions
  if (payrollManagerRoleId) {
    const paylinqViewPermissions = await knex('permissions')
      .where('product', 'paylinq')
      .where(function() {
        this.where('name', 'like', '%:read')
          .orWhere('name', 'like', '%:view')
          .orWhere('name', 'like', '%:approve')
          .orWhere('name', 'like', '%:export');
      });
    
    for (const permission of paylinqViewPermissions) {
      await knex('role_permissions')
        .insert({ role_id: payrollManagerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Payroll Manager (review/approve)');

  // ============================================================================
  // 5. SCHEDULER (ScheduleHub full access)
  // ============================================================================
  const schedulerRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'scheduler',
      display_name: 'Scheduler',
      role_type: 'tenant',
      description: 'Manage schedules, shifts, and worker assignments',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Scheduler', description: 'Manage schedules, shifts, and worker assignments' })
    .returning('id');

  const schedulerRoleId = schedulerRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'scheduler' }).first())?.id;

  // Assign ALL ScheduleHub permissions
  if (schedulerRoleId) {
    const schedulehubPermissions = await knex('permissions').where('product', 'schedulehub');
    for (const permission of schedulehubPermissions) {
      await knex('role_permissions')
        .insert({ role_id: schedulerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // Add employee view permissions from Nexus
    const nexusViewPermissions = await knex('permissions')
      .where('product', 'nexus')
      .whereIn('name', ['employees:read', 'departments:read', 'locations:read']);
    
    for (const permission of nexusViewPermissions) {
      await knex('role_permissions')
        .insert({ role_id: schedulerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Scheduler (ScheduleHub full access)');

  // ============================================================================
  // 6. RECRUITER (RecruitIQ full access)
  // ============================================================================
  const recruiterRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'recruiter',
      display_name: 'Recruiter',
      role_type: 'tenant',
      description: 'Manage job postings, candidates, applications, and interviews',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Recruiter', description: 'Manage job postings, candidates, applications, and interviews' })
    .returning('id');

  const recruiterRoleId = recruiterRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'recruiter' }).first())?.id;

  // Assign ALL RecruitIQ permissions
  if (recruiterRoleId) {
    const recruitiqPermissions = await knex('permissions').where('product', 'recruitiq');
    for (const permission of recruitiqPermissions) {
      await knex('role_permissions')
        .insert({ role_id: recruiterRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Recruiter (RecruitIQ full access)');

  // ============================================================================
  // 7. HIRING MANAGER (RecruitIQ view + interview)
  // ============================================================================
  const hiringManagerRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'hiring_manager',
      display_name: 'Hiring Manager',
      role_type: 'tenant',
      description: 'Review candidates, conduct interviews, and approve offers',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Hiring Manager', description: 'Review candidates, conduct interviews, and approve offers' })
    .returning('id');

  const hiringManagerRoleId = hiringManagerRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'hiring_manager' }).first())?.id;

  // Assign RecruitIQ view + interview permissions
  if (hiringManagerRoleId) {
    const recruitiqPermissions = await knex('permissions')
      .where('product', 'recruitiq')
      .where(function() {
        this.where('name', 'like', '%:read')
          .orWhere('name', 'like', '%:view')
          .orWhereIn('category', ['interviews', 'offers']);
      });
    
    for (const permission of recruitiqPermissions) {
      await knex('role_permissions')
        .insert({ role_id: hiringManagerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Hiring Manager (review/interview)');

  // ============================================================================
  // 8. MANAGER (Department/team management)
  // ============================================================================
  const managerRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'manager',
      display_name: 'Manager',
      role_type: 'tenant',
      description: 'Manage team members, approve time-off, view reports',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Manager', description: 'Manage team members, approve time-off, view reports' })
    .returning('id');

  const managerRoleId = managerRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'manager' }).first())?.id;

  // Assign limited Nexus permissions
  if (managerRoleId) {
    const nexusManagerPermissions = await knex('permissions')
      .where('product', 'nexus')
      .whereIn('name', ['employees:read', 'departments:read', 'timeoff:approve', 'attendance:approve', 'reports:view']);
    
    for (const permission of nexusManagerPermissions) {
      await knex('role_permissions')
        .insert({ role_id: managerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // Assign limited ScheduleHub permissions
    const schedulehubManagerPermissions = await knex('permissions')
      .where('product', 'schedulehub')
      .where(function() {
        this.where('name', 'like', '%:read')
          .orWhere('name', 'like', '%:view')
          .orWhere('name', 'like', '%:approve');
      });
    
    for (const permission of schedulehubManagerPermissions) {
      await knex('role_permissions')
        .insert({ role_id: managerRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Manager (team oversight)');

  // ============================================================================
  // 9. EMPLOYEE (Self-service access)
  // ============================================================================
  const employeeRole = await knex('roles')
    .insert({
      organization_id: testOrgId,
      name: 'employee',
      display_name: 'Employee',
      role_type: 'tenant',
      description: 'View own information, request time-off, view payslips',
      is_active: true
    })
    .onConflict(['organization_id', 'name'])
    .merge({ display_name: 'Employee', description: 'View own information, request time-off, view payslips' })
    .returning('id');

  const employeeRoleId = employeeRole[0]?.id || (await knex('roles').where({ organization_id: testOrgId, name: 'employee' }).first())?.id;

  // Assign self-service permissions
  if (employeeRoleId) {
    // Nexus self-service
    const nexusEmployeePermissions = await knex('permissions')
      .where('product', 'nexus')
      .whereIn('name', ['employees:read', 'timeoff:create', 'timeoff:read', 'documents:read']);
    
    for (const permission of nexusEmployeePermissions) {
      await knex('role_permissions')
        .insert({ role_id: employeeRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // PayLinQ self-service
    const paylinqEmployeePermissions = await knex('permissions')
      .where('product', 'paylinq')
      .whereIn('name', ['reports:payslips']);
    
    for (const permission of paylinqEmployeePermissions) {
      await knex('role_permissions')
        .insert({ role_id: employeeRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }

    // ScheduleHub self-service (using proper column names)
    const schedulehubEmployeePermissions = await knex('permissions')
      .where('product', 'schedulehub')
      .whereIn('name', ['scheduling:schedules:read', 'scheduling:shifts:read', 'scheduling:availability:create', 'scheduling:availability:read', 'scheduling:shift_swaps:create']);
    
    for (const permission of schedulehubEmployeePermissions) {
      await knex('role_permissions')
        .insert({ role_id: employeeRoleId, permission_id: permission.id })
        .onConflict(['role_id', 'permission_id'])
        .ignore();
    }
  }

  console.log('[OK] Created role: Employee (self-service)');

  // Success summary
  console.log('');
  console.log('================================================================');
  console.log('[OK] Default tenant roles created successfully!');
  console.log('================================================================');
  console.log('Roles Created:');
  console.log('  1. Organization Administrator - Full access to all products');
  console.log('  2. HR Manager - Nexus HRIS + RecruitIQ ATS');
  console.log('  3. Payroll Administrator - PayLinQ full access');
  console.log('  4. Payroll Manager - PayLinQ review/approve');
  console.log('  5. Scheduler - ScheduleHub full access');
  console.log('  6. Recruiter - RecruitIQ full access');
  console.log('  7. Hiring Manager - RecruitIQ review/interview');
  console.log('  8. Manager - Team oversight (Nexus + ScheduleHub)');
  console.log('  9. Employee - Self-service access');
  console.log('');
  console.log('[INFO] These roles are organization-scoped (tenant-level)');
  console.log('[INFO] Each organization gets its own set of these roles');
  console.log('[INFO] Custom roles can be created via Settings page');
  console.log('================================================================');
}
