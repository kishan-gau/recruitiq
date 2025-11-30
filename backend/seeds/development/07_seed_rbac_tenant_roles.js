/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // ============================================================================
  // Seed Default Tenant Roles (Organization-Level System Roles)
  // ============================================================================
  // Description: Seeds default system roles for tenant organizations
  //              These roles are created for EACH organization
  //              Run this AFTER product permissions are seeded
  // ============================================================================

  console.log('\n================================================================');
  console.log('[*] Creating default tenant roles for organizations');
  console.log('================================================================');

  // Get all organizations (multi-tenant support)
  const organizations = await knex('organizations').select('id', 'slug', 'name');

  if (organizations.length === 0) {
    console.log('⚠️  No organizations found. Skipping tenant roles seed.');
    return;
  }

  for (const org of organizations) {
    console.log(`\n[*] Processing organization: ${org.name} (${org.slug})`);

    // ============================================================================
    // 1. ORGANIZATION ADMIN (Full access to all products)
    // ============================================================================
    const [orgAdminRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'platform', // Platform-wide role
        name: 'org_admin',
        display_name: 'Organization Administrator',
        description: 'Full administrative access to all products and settings',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (orgAdminRole) {
      // Assign ALL product permissions to org admin
      const allPermissions = await knex('permissions')
        .select('id')
        .whereIn('product', ['nexus', 'paylinq', 'schedulehub', 'recruitiq']);

      const rolePermissions = allPermissions.map(p => ({
        role_id: orgAdminRole.id,
        permission_id: p.id
      }));

      if (rolePermissions.length > 0) {
        await knex('user_role_permission')
          .insert(rolePermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Organization Administrator (full access)');
    }

    // ============================================================================
    // 2. HR MANAGER (Nexus HRIS + RecruitIQ ATS access)
    // ============================================================================
    const [hrManagerRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'platform',
        name: 'hr_manager',
        display_name: 'HR Manager',
        description: 'Manage employees, recruitment, benefits, and HR operations',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (hrManagerRole) {
      // Assign Nexus permissions (full HRIS access)
      const nexusPermissions = await knex('permissions')
        .select('id')
        .where('product', 'nexus')
        .whereIn('category', ['employees', 'departments', 'locations', 'contracts', 'benefits', 'documents', 'reports', 'settings']);

      // Assign RecruitIQ permissions (full ATS access)
      const recruitiqPermissions = await knex('permissions')
        .select('id')
        .where('product', 'recruitiq');

      const allHRPermissions = [...nexusPermissions, ...recruitiqPermissions].map(p => ({
        role_id: hrManagerRole.id,
        permission_id: p.id
      }));

      if (allHRPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(allHRPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: HR Manager (Nexus + RecruitIQ)');
    }

    // ============================================================================
    // 3. PAYROLL ADMIN (PayLinQ full access + read-only Nexus employee data)
    // ============================================================================
    const [payrollAdminRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'paylinq',
        name: 'payroll_admin',
        display_name: 'Payroll Administrator',
        description: 'Full payroll management access with employee data read access',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (payrollAdminRole) {
      // Assign PayLinQ permissions (full payroll access)
      const paylinqPermissions = await knex('permissions')
        .select('id')
        .where('product', 'paylinq');

      // Assign Nexus read-only employee permissions
      const nexusReadPermissions = await knex('permissions')
        .select('id')
        .where('product', 'nexus')
        .where('category', 'Employee Management')
        .where('name', 'like', '%.view');

      const allPayrollPermissions = [...paylinqPermissions, ...nexusReadPermissions].map(p => ({
        role_id: payrollAdminRole.id,
        permission_id: p.id
      }));

      if (allPayrollPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(allPayrollPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Payroll Administrator (PayLinQ + Nexus read)');
    }

    // ============================================================================
    // 4. PAYROLL MANAGER (PayLinQ manage + read-only employee data)
    // ============================================================================
    const [payrollManagerRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'paylinq',
        name: 'payroll_manager',
        display_name: 'Payroll Manager',
        description: 'Manage payroll runs and employee compensation (no settings access)',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (payrollManagerRole) {
      // Assign PayLinQ permissions (excluding settings)
      const paylinqMgrPermissions = await knex('permissions')
        .select('id')
        .where('product', 'paylinq')
        .whereNot('category', 'settings');

      // Assign Nexus read-only employee permissions
      const nexusReadPermissions = await knex('permissions')
        .select('id')
        .where('product', 'nexus')
        .where('category', 'Employee Management')
        .where('name', 'like', '%.view');

      const allMgrPermissions = [...paylinqMgrPermissions, ...nexusReadPermissions].map(p => ({
        role_id: payrollManagerRole.id,
        permission_id: p.id
      }));

      if (allMgrPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(allMgrPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Payroll Manager (PayLinQ manage)');
    }

    // ============================================================================
    // 5. SCHEDULER (ScheduleHub full access + read-only employee data)
    // ============================================================================
    const [schedulerRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'schedulehub',
        name: 'scheduler',
        display_name: 'Scheduler',
        description: 'Manage schedules, shifts, and time tracking',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (schedulerRole) {
      // Assign ScheduleHub permissions
      const schedulehubPermissions = await knex('permissions')
        .select('id')
        .where('product', 'schedulehub');

      // Assign Nexus read-only employee permissions
      const nexusReadPermissions = await knex('permissions')
        .select('id')
        .where('product', 'nexus')
        .where('category', 'Employee Management')
        .where('name', 'like', '%.view');

      const allSchedulerPermissions = [...schedulehubPermissions, ...nexusReadPermissions].map(p => ({
        role_id: schedulerRole.id,
        permission_id: p.id
      }));

      if (allSchedulerPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(allSchedulerPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Scheduler (ScheduleHub + Nexus read)');
    }

    // ============================================================================
    // 6. RECRUITER (RecruitIQ full access)
    // ============================================================================
    const [recruiterRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'recruitiq',
        name: 'recruiter',
        display_name: 'Recruiter',
        description: 'Manage job postings, candidates, and recruitment pipeline',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (recruiterRole) {
      // Assign RecruitIQ permissions
      const recruitiqPermissions = await knex('permissions')
        .select('id')
        .where('product', 'recruitiq');

      const recruiterPermissions = recruitiqPermissions.map(p => ({
        role_id: recruiterRole.id,
        permission_id: p.id
      }));

      if (recruiterPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(recruiterPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Recruiter (RecruitIQ)');
    }

    // ============================================================================
    // 7. HIRING MANAGER (RecruitIQ limited access)
    // ============================================================================
    const [hiringManagerRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'recruitiq',
        name: 'hiring_manager',
        display_name: 'Hiring Manager',
        description: 'Review candidates and participate in hiring decisions',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (hiringManagerRole) {
      // Assign RecruitIQ read + review permissions
      const hiringPermissions = await knex('permissions')
        .select('id')
        .where('product', 'recruitiq')
        .where(function() {
          this.where('name', 'like', '%.view')
            .orWhere('name', 'like', '%.review');
        });

      const hiringMgrPermissions = hiringPermissions.map(p => ({
        role_id: hiringManagerRole.id,
        permission_id: p.id
      }));

      if (hiringMgrPermissions.length > 0) {
        await knex('user_role_permission')
          .insert(hiringMgrPermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Hiring Manager (RecruitIQ read/review)');
    }

    // ============================================================================
    // 8. EMPLOYEE (Self-service access)
    // ============================================================================
    const [employeeRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'platform',
        name: 'employee',
        display_name: 'Employee',
        description: 'Self-service access to personal data, schedules, and payslips',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (employeeRole) {
      // Assign self-service permissions (view own data)
      const selfServicePermissions = await knex('permissions')
        .select('id')
        .whereIn('product', ['nexus', 'paylinq', 'schedulehub'])
        .where(function() {
          this.where('name', 'like', '%self%')
            .orWhere('name', 'like', '%.view_own')
            .orWhere('name', 'like', 'my_%');
        });

      const employeePermissions = selfServicePermissions.map(p => ({
        role_id: employeeRole.id,
        permission_id: p.id
      }));

      if (employeePermissions.length > 0) {
        await knex('user_role_permission')
          .insert(employeePermissions)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Employee (self-service)');
    }

    // ============================================================================
    // 9. MANAGER (Department/Team manager access)
    // ============================================================================
    const [managerRole] = await knex('roles')
      .insert({
        organization_id: org.id,
        product: 'platform',
        name: 'manager',
        display_name: 'Manager',
        description: 'Manage team members, approve time-off, and view team schedules',
        is_system_role: true,
        is_default: true,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product', 'name'])
      .merge(['display_name', 'description', 'updated_at'])
      .returning('id');

    if (managerRole) {
      // Assign manager permissions (team management)
      const managerPermissions = await knex('permissions')
        .select('id')
        .where('product', 'nexus')
        .where(function() {
          this.where(function() {
            this.where('category', 'Employee Management')
              .where('name', 'like', '%.view');
          })
          .orWhere(function() {
            this.where('category', 'Time Off Management')
              .where('name', 'like', '%timeoff%');
          });
        });

      const scheduleMgrPermissions = await knex('permissions')
        .select('id')
        .where('product', 'schedulehub')
        .where('name', 'like', '%.view');

      const allMgrPerms = [...managerPermissions, ...scheduleMgrPermissions].map(p => ({
        role_id: managerRole.id,
        permission_id: p.id
      }));

      if (allMgrPerms.length > 0) {
        await knex('user_role_permission')
          .insert(allMgrPerms)
          .onConflict(['role_id', 'permission_id'])
          .ignore();
      }

      console.log('  ✓ Created role: Manager (team management)');
    }
  }

  console.log('\n================================================================');
  console.log(`✅ Completed tenant roles seed for ${organizations.length} organization(s)`);
  console.log('================================================================\n');
};
