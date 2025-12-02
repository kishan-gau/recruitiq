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

    let tenantAdminUserId = tenantAdminResult.rows[0]?.id;

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

    let payrollManagerUserId = payrollManagerResult.rows[0]?.id;

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

    let employeeUserId = employeeResult.rows[0]?.id;

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
        enabled_features: product.default_features,
        granted_at: knex.fn.now()
      })
      .onConflict(['organization_id', 'product_id'])
      .ignore();
  }

  console.log('[OK] Product permissions granted to test organization');

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
  console.log('  2. payroll@testcompany.com (Payroll Manager)');
  console.log('  3. employee@testcompany.com (Employee)');
  console.log('  Password for all: Admin123!');
  console.log('');
  console.log('Usage:');
  console.log('  1. Login with tenant@testcompany.com to access Paylinq');
  console.log('  2. Dashboard and all Paylinq features will be available');
  console.log('  3. Use payroll@testcompany.com for payroll management');
  console.log('  4. Use employee@testcompany.com to test employee portal');
}
