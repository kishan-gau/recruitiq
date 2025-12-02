/**
 * Seed: Test User Roles
 * Source: seed-test-user-roles.sql
 * 
 * Assigns RBAC roles to test users:
 * - tenant@testcompany.com → org_admin, hr_manager, payroll_admin
 * - payroll@testcompany.com → payroll_manager
 * - employee@testcompany.com → employee
 * 
 * Prerequisites:
 *   1. seed-test-tenant.sql (creates test organization and users)
 *   2. seed-rbac-tenant-roles.sql (creates default tenant roles)
 */

export async function seed(knex) {
  // Get test organization ID
  const testOrg = await knex('organizations').where('slug', 'test-company').first();
  
  if (!testOrg) {
    console.log('[SKIP] Test organization not found. Skipping role assignments.');
    return;
  }

  const testOrgId = testOrg.id;

  console.log('');
  console.log('================================================================');
  console.log('[*] Assigning RBAC roles to test users...');
  console.log('================================================================');

  // Check if hris schema exists
  const hrisSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'hris'
  `);

  if (hrisSchemaExists.rows.length === 0) {
    console.log('[SKIP] HRIS schema not found. Skipping role assignments.');
    return;
  }

  // ============================================================================
  // GET USER IDs
  // ============================================================================
  
  const tenantAdminResult = await knex.raw(`
    SELECT id FROM hris.user_account 
    WHERE organization_id = ? AND email = 'tenant@testcompany.com'
  `, [testOrgId]);
  const tenantAdminUserId = tenantAdminResult.rows[0]?.id;

  const payrollManagerResult = await knex.raw(`
    SELECT id FROM hris.user_account 
    WHERE organization_id = ? AND email = 'payroll@testcompany.com'
  `, [testOrgId]);
  const payrollManagerUserId = payrollManagerResult.rows[0]?.id;

  const employeeResult = await knex.raw(`
    SELECT id FROM hris.user_account 
    WHERE organization_id = ? AND email = 'employee@testcompany.com'
  `, [testOrgId]);
  const employeeUserId = employeeResult.rows[0]?.id;

  if (!tenantAdminUserId) {
    console.log('[WARN] Test users not found. Skipping role assignments.');
    return;
  }

  console.log('[INFO] Found users:');
  console.log(`  - tenant@testcompany.com (ID: ${tenantAdminUserId})`);
  console.log(`  - payroll@testcompany.com (ID: ${payrollManagerUserId || 'not found'})`);
  console.log(`  - employee@testcompany.com (ID: ${employeeUserId || 'not found'})`);

  // ============================================================================
  // GET ROLE IDs
  // ============================================================================
  
  const orgAdminRole = await knex('roles').where({ organization_id: testOrgId, name: 'org_admin' }).first();
  const hrManagerRole = await knex('roles').where({ organization_id: testOrgId, name: 'hr_manager' }).first();
  const payrollAdminRole = await knex('roles').where({ organization_id: testOrgId, name: 'payroll_admin' }).first();
  const payrollManagerRole = await knex('roles').where({ organization_id: testOrgId, name: 'payroll_manager' }).first();
  const employeeRole = await knex('roles').where({ organization_id: testOrgId, name: 'employee' }).first();

  if (!orgAdminRole) {
    console.log('[ERROR] Default roles not found! Run seed-rbac-tenant-roles.js first.');
    return;
  }

  console.log('[INFO] Found roles: org_admin, hr_manager, payroll_admin, payroll_manager, employee');

  // ============================================================================
  // ASSIGN ROLES TO TENANT ADMIN (tenant@testcompany.com)
  // ============================================================================
  
  if (tenantAdminUserId) {
    // Assign org_admin role (full access)
    await knex('user_roles')
      .insert({
        user_id: tenantAdminUserId,
        role_id: orgAdminRole.id,
        created_by: tenantAdminUserId
      })
      .onConflict(['user_id', 'role_id'])
      .merge({ created_at: knex.fn.now() });

    console.log('[OK] Assigned: org_admin → tenant@testcompany.com');

    // Also assign hr_manager role (multi-role example)
    if (hrManagerRole) {
      await knex('user_roles')
        .insert({
          user_id: tenantAdminUserId,
          role_id: hrManagerRole.id,
          created_by: tenantAdminUserId
        })
        .onConflict(['user_id', 'role_id'])
        .merge({ created_at: knex.fn.now() });

      console.log('[OK] Assigned: hr_manager → tenant@testcompany.com');
    }

    // Also assign payroll_admin role (multi-role example)
    if (payrollAdminRole) {
      await knex('user_roles')
        .insert({
          user_id: tenantAdminUserId,
          role_id: payrollAdminRole.id,
          created_by: tenantAdminUserId
        })
        .onConflict(['user_id', 'role_id'])
        .merge({ created_at: knex.fn.now() });

      console.log('[OK] Assigned: payroll_admin → tenant@testcompany.com');
    }
  }

  // ============================================================================
  // ASSIGN ROLES TO PAYROLL MANAGER (payroll@testcompany.com)
  // ============================================================================
  
  if (payrollManagerUserId && payrollManagerRole) {
    await knex('user_roles')
      .insert({
        user_id: payrollManagerUserId,
        role_id: payrollManagerRole.id,
        created_by: tenantAdminUserId
      })
      .onConflict(['user_id', 'role_id'])
      .merge({ created_at: knex.fn.now() });

    console.log('[OK] Assigned: payroll_manager → payroll@testcompany.com');
  }

  // ============================================================================
  // ASSIGN ROLES TO EMPLOYEE (employee@testcompany.com)
  // ============================================================================
  
  if (employeeUserId && employeeRole) {
    await knex('user_roles')
      .insert({
        user_id: employeeUserId,
        role_id: employeeRole.id,
        created_by: tenantAdminUserId
      })
      .onConflict(['user_id', 'role_id'])
      .merge({ created_at: knex.fn.now() });

    console.log('[OK] Assigned: employee → employee@testcompany.com');
  }

  // Success summary
  console.log('');
  console.log('================================================================');
  console.log('[OK] RBAC role assignments completed!');
  console.log('================================================================');
  console.log('User: tenant@testcompany.com');
  console.log('  - org_admin (Organization Administrator)');
  console.log('  - hr_manager (HR Manager)');
  console.log('  - payroll_admin (Payroll Administrator)');
  console.log('');
  console.log('User: payroll@testcompany.com');
  console.log('  - payroll_manager (Payroll Manager - review/approve)');
  console.log('');
  console.log('User: employee@testcompany.com');
  console.log('  - employee (Employee - self-service)');
  console.log('');
  console.log('[INFO] Users now have full access to their assigned products');
  console.log('[INFO] Test multi-role scenarios with tenant@testcompany.com');
  console.log('[INFO] Additional users can be created via Settings page');
  console.log('================================================================');
}
