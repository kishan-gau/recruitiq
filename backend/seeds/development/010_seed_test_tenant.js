/**
 * Seed: Test Organization and Tenant Users
 * Source: seed-test-tenant.sql
 * 
 * Seeds test organization and tenant users for development:
 * - Test Company Ltd (enterprise tier organization)
 * - tenant@testcompany.com (Owner)
 * - payroll@testcompany.com (Payroll Manager)
 * - employee@testcompany.com (Employee)
 * 
 * Password for all: Admin123!
 */

export async function seed(knex) {
  // ============================================================================
  // CREATE TEST ORGANIZATION
  // ============================================================================
  
  await knex('organizations')
    .insert({
      name: 'Test Company Ltd',
      slug: 'test-company',
      tier: 'enterprise',
      subscription_status: 'active',
      deployment_model: 'shared'
    })
    .onConflict('slug')
    .ignore();

  // Get the organization ID
  const org = await knex('organizations').where('slug', 'test-company').first();
  const orgId = org.id;

  // Password: Admin123! (bcrypt hash)
  const passwordHash = '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO';

  // ============================================================================
  // SEED WORKER TYPES FOR THE ORGANIZATION
  // ============================================================================
  
  // Declare user ID variables at function scope for later use
  let tenantAdminUserId;
  let payrollManagerUserId;
  let employeeUserId;
  
  // Check if hris schema exists
  const hrisSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'hris'
  `);

  if (hrisSchemaExists.rows.length > 0) {
    // Insert worker types
    await knex.raw(`
      INSERT INTO hris.worker_type (
        id, organization_id, code, name, description,
        benefits_eligible, pto_eligible, sick_leave_eligible, vacation_accrual_rate,
        is_active, created_by
      ) VALUES
        (gen_random_uuid(), ?, 'FT', 'Full-Time', 
         'Full-time employees working standard 40 hours per week',
         true, true, true, 3.33, true, NULL),
        (gen_random_uuid(), ?, 'PT', 'Part-Time',
         'Part-time employees working less than 40 hours per week',
         false, true, true, 1.67, true, NULL),
        (gen_random_uuid(), ?, 'CTR', 'Contractor',
         'Independent contractors paid per project or hourly',
         false, false, false, 0, true, NULL)
      ON CONFLICT (organization_id, code) DO NOTHING
    `, [orgId, orgId, orgId]);

    console.log('[OK] Worker types seeded for Test Company');

    // ============================================================================
    // CREATE TENANT ADMIN USER
    // ============================================================================
    
    // Insert tenant admin user into hris.user_account
    const tenantAdminResult = await knex.raw(`
      INSERT INTO hris.user_account (
        email, password_hash, organization_id,
        enabled_products, product_roles,
        email_verified, is_active, created_at
      ) VALUES (
        'tenant@testcompany.com',
        ?,
        ?,
        '["recruitiq", "nexus", "paylinq", "schedulehub"]'::jsonb,
        '{"recruitiq": "admin", "nexus": "admin", "paylinq": "admin", "schedulehub": "admin"}'::jsonb,
        true, true, NOW()
      )
      ON CONFLICT (organization_id, email) DO NOTHING
      RETURNING id
    `, [passwordHash, orgId]);

    tenantAdminUserId = tenantAdminResult.rows[0]?.id;

    if (!tenantAdminUserId) {
      const existingUser = await knex.raw(`
        SELECT id FROM hris.user_account 
        WHERE organization_id = ? AND email = 'tenant@testcompany.com'
      `, [orgId]);
      tenantAdminUserId = existingUser.rows[0]?.id;
    }

    // Get Full-Time worker type ID
    const workerTypeResult = await knex.raw(`
      SELECT id FROM hris.worker_type
      WHERE organization_id = ? AND code = 'FT'
      LIMIT 1
    `, [orgId]);
    const ftWorkerTypeId = workerTypeResult.rows[0]?.id;

    // Create employee record for tenant admin
    if (tenantAdminUserId && ftWorkerTypeId) {
      await knex.raw(`
        INSERT INTO hris.employee (
          organization_id, user_account_id, worker_type_id,
          employee_number, first_name, last_name, email,
          employment_status, employment_type, hire_date, created_at
        ) VALUES (?, ?, ?, 'EMP001', 'Tenant', 'Administrator',
          'tenant@testcompany.com', 'active', 'full_time', NOW(), NOW())
        ON CONFLICT (organization_id, employee_number) DO NOTHING
      `, [orgId, tenantAdminUserId, ftWorkerTypeId]);

      // Update user_account with employee_id
      await knex.raw(`
        UPDATE hris.user_account ua
        SET employee_id = e.id
        FROM hris.employee e
        WHERE ua.id = ?
          AND e.user_account_id = ?
          AND ua.employee_id IS NULL
      `, [tenantAdminUserId, tenantAdminUserId]);

      // Create payroll configuration for tenant admin
      await knex.raw(`
        INSERT INTO payroll.employee_payroll_config (
          organization_id, employee_id, pay_frequency, payment_method,
          currency, payroll_status, payroll_start_date, created_by, created_at
        )
        SELECT ?, e.id, 'monthly', 'direct_deposit', 'SRD', 'active', NOW(), ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP001'
        ON CONFLICT (organization_id, employee_id) DO NOTHING
      `, [orgId, tenantAdminUserId, orgId]);

      // Create compensation record for tenant admin
      await knex.raw(`
        INSERT INTO payroll.compensation (
          organization_id, employee_id, compensation_type, amount, currency,
          frequency, effective_from, is_current, created_by, created_at
        )
        SELECT ?, e.id, 'salary', 28000.00, 'SRD', 'monthly', NOW()::date, true, ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP001'
        ON CONFLICT (employee_id, effective_from) DO NOTHING
      `, [orgId, tenantAdminUserId, orgId]);

      // Assign worker type history for tenant admin (Full-Time)
      await knex.raw(`
        INSERT INTO payroll.worker_type_history (
          organization_id, employee_id, worker_type_id, is_current,
          effective_from, created_by, created_at
        )
        SELECT ?, e.id, wt.id, true, NOW()::date, ?, NOW()
        FROM hris.employee e
        CROSS JOIN hris.worker_type wt
        WHERE e.organization_id = ? AND e.employee_number = 'EMP001'
          AND wt.code = 'FT' AND wt.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll.worker_type_history wth
            WHERE wth.employee_id = e.id AND wth.organization_id = ?
              AND wth.is_current = true AND wth.deleted_at IS NULL
          )
        ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING
      `, [orgId, tenantAdminUserId, orgId, orgId]);
    }

    console.log('[OK] Tenant admin user created: tenant@testcompany.com');

    // ============================================================================
    // CREATE PAYROLL MANAGER USER
    // ============================================================================
    
    const payrollManagerResult = await knex.raw(`
      INSERT INTO hris.user_account (
        email, password_hash, organization_id,
        enabled_products, product_roles,
        email_verified, is_active, created_at
      ) VALUES (
        'payroll@testcompany.com',
        ?,
        ?,
        '["paylinq"]'::jsonb,
        '{"paylinq": "payroll_manager"}'::jsonb,
        true, true, NOW()
      )
      ON CONFLICT (organization_id, email) DO NOTHING
      RETURNING id
    `, [passwordHash, orgId]);

    payrollManagerUserId = payrollManagerResult.rows[0]?.id;

    if (!payrollManagerUserId) {
      const existingUser = await knex.raw(`
        SELECT id FROM hris.user_account 
        WHERE organization_id = ? AND email = 'payroll@testcompany.com'
      `, [orgId]);
      payrollManagerUserId = existingUser.rows[0]?.id;
    }

    // Create employee record for payroll manager
    if (payrollManagerUserId && ftWorkerTypeId) {
      await knex.raw(`
        INSERT INTO hris.employee (
          organization_id, user_account_id, worker_type_id,
          employee_number, first_name, last_name, email,
          employment_status, employment_type, hire_date, created_at
        ) VALUES (?, ?, ?, 'EMP002', 'Payroll', 'Manager',
          'payroll@testcompany.com', 'active', 'full_time', NOW(), NOW())
        ON CONFLICT (organization_id, employee_number) DO NOTHING
      `, [orgId, payrollManagerUserId, ftWorkerTypeId]);

      // Update user_account with employee_id
      await knex.raw(`
        UPDATE hris.user_account ua
        SET employee_id = e.id
        FROM hris.employee e
        WHERE ua.id = ?
          AND e.user_account_id = ?
          AND ua.employee_id IS NULL
      `, [payrollManagerUserId, payrollManagerUserId]);

      // Create payroll configuration for payroll manager
      await knex.raw(`
        INSERT INTO payroll.employee_payroll_config (
          organization_id, employee_id, pay_frequency, payment_method,
          currency, payroll_status, payroll_start_date, created_by, created_at
        )
        SELECT ?, e.id, 'monthly', 'direct_deposit', 'SRD', 'active', NOW(), ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP002'
        ON CONFLICT (organization_id, employee_id) DO NOTHING
      `, [orgId, payrollManagerUserId, orgId]);

      // Create compensation record for payroll manager
      await knex.raw(`
        INSERT INTO payroll.compensation (
          organization_id, employee_id, compensation_type, amount, currency,
          frequency, effective_from, is_current, created_by, created_at
        )
        SELECT ?, e.id, 'salary', 26000.00, 'SRD', 'monthly', NOW()::date, true, ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP002'
        ON CONFLICT (employee_id, effective_from) DO NOTHING
      `, [orgId, payrollManagerUserId, orgId]);

      // Assign worker type history for payroll manager (Full-Time)
      await knex.raw(`
        INSERT INTO payroll.worker_type_history (
          organization_id, employee_id, worker_type_id, is_current,
          effective_from, created_by, created_at
        )
        SELECT ?, e.id, wt.id, true, NOW()::date, ?, NOW()
        FROM hris.employee e
        CROSS JOIN hris.worker_type wt
        WHERE e.organization_id = ? AND e.employee_number = 'EMP002'
          AND wt.code = 'FT' AND wt.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll.worker_type_history wth
            WHERE wth.employee_id = e.id AND wth.organization_id = ?
              AND wth.is_current = true AND wth.deleted_at IS NULL
          )
        ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING
      `, [orgId, payrollManagerUserId, orgId, orgId]);
    }

    console.log('[OK] Payroll manager user created: payroll@testcompany.com');

    // ============================================================================
    // CREATE EMPLOYEE SELF-SERVICE USER
    // ============================================================================
    
    // Get Part-Time worker type ID
    const ptWorkerTypeResult = await knex.raw(`
      SELECT id FROM hris.worker_type
      WHERE organization_id = ? AND code = 'PT'
      LIMIT 1
    `, [orgId]);
    const ptWorkerTypeId = ptWorkerTypeResult.rows[0]?.id;

    const employeeResult = await knex.raw(`
      INSERT INTO hris.user_account (
        email, password_hash, organization_id,
        enabled_products, product_roles,
        email_verified, is_active, created_at
      ) VALUES (
        'employee@testcompany.com',
        ?,
        ?,
        '["nexus"]'::jsonb,
        '{"nexus": "employee"}'::jsonb,
        true, true, NOW()
      )
      ON CONFLICT (organization_id, email) DO NOTHING
      RETURNING id
    `, [passwordHash, orgId]);

    employeeUserId = employeeResult.rows[0]?.id;

    if (!employeeUserId) {
      const existingUser = await knex.raw(`
        SELECT id FROM hris.user_account 
        WHERE organization_id = ? AND email = 'employee@testcompany.com'
      `, [orgId]);
      employeeUserId = existingUser.rows[0]?.id;
    }

    // Create employee record for self-service user
    if (employeeUserId && ptWorkerTypeId) {
      await knex.raw(`
        INSERT INTO hris.employee (
          organization_id, user_account_id, worker_type_id,
          employee_number, first_name, last_name, email,
          employment_status, employment_type, hire_date, created_at
        ) VALUES (?, ?, ?, 'EMP003', 'John', 'Employee',
          'employee@testcompany.com', 'active', 'part_time', NOW(), NOW())
        ON CONFLICT (organization_id, employee_number) DO NOTHING
      `, [orgId, employeeUserId, ptWorkerTypeId]);

      // Update user_account with employee_id
      await knex.raw(`
        UPDATE hris.user_account ua
        SET employee_id = e.id
        FROM hris.employee e
        WHERE ua.id = ?
          AND e.user_account_id = ?
          AND ua.employee_id IS NULL
      `, [employeeUserId, employeeUserId]);

      // Create payroll configuration for employee
      await knex.raw(`
        INSERT INTO payroll.employee_payroll_config (
          organization_id, employee_id, pay_frequency, payment_method,
          currency, payroll_status, payroll_start_date, created_by, created_at
        )
        SELECT ?, e.id, 'weekly', 'direct_deposit', 'SRD', 'active', NOW(), ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP003'
        ON CONFLICT (organization_id, employee_id) DO NOTHING
      `, [orgId, employeeUserId, orgId]);

      // Create compensation record for employee (hourly worker)
      await knex.raw(`
        INSERT INTO payroll.compensation (
          organization_id, employee_id, compensation_type, amount, currency,
          frequency, effective_from, is_current, created_by, created_at
        )
        SELECT ?, e.id, 'hourly', 40.00, 'SRD', 'weekly', NOW()::date, true, ?, NOW()
        FROM hris.employee e
        WHERE e.organization_id = ? AND e.employee_number = 'EMP003'
        ON CONFLICT (employee_id, effective_from) DO NOTHING
      `, [orgId, employeeUserId, orgId]);

      // Assign worker type history for employee (Part-Time hourly)
      await knex.raw(`
        INSERT INTO payroll.worker_type_history (
          organization_id, employee_id, worker_type_id, is_current,
          effective_from, created_by, created_at
        )
        SELECT ?, e.id, wt.id, true, NOW()::date, ?, NOW()
        FROM hris.employee e
        CROSS JOIN hris.worker_type wt
        WHERE e.organization_id = ? AND e.employee_number = 'EMP003'
          AND wt.code = 'PT' AND wt.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll.worker_type_history wth
            WHERE wth.employee_id = e.id AND wth.organization_id = ?
              AND wth.is_current = true AND wth.deleted_at IS NULL
          )
        ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING
      `, [orgId, employeeUserId, orgId, orgId]);
    }

    console.log('[OK] Employee user created: employee@testcompany.com');
  }

  // ============================================================================
  // GRANT PRODUCT PERMISSIONS TO TEST ORGANIZATION
  // ============================================================================
  
  const products = await knex('products').select('id', 'default_features');
  
  for (const product of products) {
    await knex('product_permissions')
      .insert({
        organization_id: orgId,
        product_id: product.id,
        is_enabled: true,
        access_level: 'full',
        enabled_features: JSON.stringify(product.default_features || []),
        granted_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product_id'])
      .ignore();
  }

  console.log('[OK] Product permissions granted to test organization');

  // ============================================================================
  // ASSIGN RBAC ROLES TO TEST USERS
  // ============================================================================
  // NOTE: Roles are assigned here (immediately after user creation) instead of
  // in a separate seed file to ensure roles are available in the same transaction
  
  console.log('');
  console.log('[*] Assigning RBAC roles to test users...');
  
  // Get role IDs from roles table
  const orgAdminRole = await knex('roles').where({ organization_id: orgId, name: 'org_admin' }).first();
  const hrManagerRole = await knex('roles').where({ organization_id: orgId, name: 'hr_manager' }).first();
  const payrollAdminRole = await knex('roles').where({ organization_id: orgId, name: 'payroll_admin' }).first();
  const payrollManagerRole = await knex('roles').where({ organization_id: orgId, name: 'payroll_manager' }).first();
  const employeeRole = await knex('roles').where({ organization_id: orgId, name: 'employee' }).first();

  if (!orgAdminRole) {
    console.log('[WARN] Default tenant roles not found. Role assignments will be skipped.');
    console.log('[INFO] Run seed 008 (seed_rbac_tenant_roles) before this seed to enable role assignments.');
  } else {
    console.log('[INFO] Found tenant roles, proceeding with assignments...');

    // Assign roles to tenant admin (tenant@testcompany.com)
    if (tenantAdminUserId) {
      // org_admin role (full access)
      await knex('user_roles')
        .insert({
          user_id: tenantAdminUserId,
          role_id: orgAdminRole.id,
          created_by: tenantAdminUserId
        })
        .onConflict(['user_id', 'role_id'])
        .merge({ created_at: knex.fn.now() });

      console.log('[OK] Assigned: org_admin → tenant@testcompany.com');

      // hr_manager role (multi-role example)
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

      // payroll_admin role (multi-role example)
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

    // Assign roles to payroll manager (payroll@testcompany.com)
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

    // Assign roles to employee (employee@testcompany.com)
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

    console.log('[OK] RBAC role assignments completed!');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  console.log('');
  console.log('============================================');
  console.log('Test Organization and Users Created');
  console.log('============================================');
  console.log('');
  console.log('Organization Details:');
  console.log('  Name: Test Company Ltd');
  console.log('  Slug: test-company');
  console.log('  Tier: Enterprise');
  console.log('  Status: Active');
  console.log('');
  console.log('Test Users Created:');
  console.log('  1. tenant@testcompany.com (Owner)');
  console.log('     Roles: org_admin, hr_manager, payroll_admin');
  console.log('  2. payroll@testcompany.com (Payroll Manager)');
  console.log('     Roles: payroll_manager');
  console.log('  3. employee@testcompany.com (Employee)');
  console.log('     Roles: employee');
  console.log('  Password for all: Admin123!');
  console.log('');
  console.log('Usage:');
  console.log('  1. Login with tenant@testcompany.com to access all products');
  console.log('  2. Dashboard and all product features will be available');
  console.log('  3. Use payroll@testcompany.com for payroll management');
  console.log('  4. Use employee@testcompany.com to test employee portal');
}
