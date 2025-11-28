-- ============================================================================
-- Seed Test Organization and Tenant User for Paylinq Development
-- ============================================================================

-- Create a test organization for Paylinq testing
INSERT INTO organizations (
  name,
  slug,
  tier,
  subscription_status,
  deployment_model,
  created_at
) VALUES (
  'Test Company Ltd',
  'test-company',
  'enterprise',
  'active',
  'shared',
  NOW()
) ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- Seed worker types for the test organization FIRST (needed for employees)
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert worker types for this organization
  INSERT INTO hris.worker_type (
    id, organization_id, code, name, description,
    benefits_eligible, pto_eligible, sick_leave_eligible, vacation_accrual_rate,
    is_active, created_by
  ) VALUES
    -- Full-Time
    (gen_random_uuid(), org_id, 'FT', 'Full-Time', 
     'Full-time employees working standard 40 hours per week',
     true, true, true, 3.33, true, NULL),
    
    -- Part-Time
    (gen_random_uuid(), org_id, 'PT', 'Part-Time',
     'Part-time employees working less than 40 hours per week',
     false, true, true, 1.67, true, NULL),
    
    -- Contractor
    (gen_random_uuid(), org_id, 'CTR', 'Contractor',
     'Independent contractors paid per project or hourly',
     false, false, false, 0, true, NULL)
  ON CONFLICT (organization_id, code) DO NOTHING;
  
  RAISE NOTICE '[OK] Worker types seeded for Test Company';
END $$;

-- Create a tenant admin user for the test organization
-- Password: Admin123!
DO $$
DECLARE
  org_id UUID;
  v_user_account_id UUID;
  v_worker_type_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert tenant admin user into hris.user_account
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'tenant@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["recruitiq", "nexus", "paylinq", "schedulehub"]'::jsonb,
    '{"recruitiq": "admin", "nexus": "admin", "paylinq": "admin", "schedulehub": "admin"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING
  RETURNING id INTO v_user_account_id;
  
  -- Get the user_account_id if it already exists
  IF v_user_account_id IS NULL THEN
    SELECT id INTO v_user_account_id FROM hris.user_account 
    WHERE organization_id = org_id AND email = 'tenant@testcompany.com';
  END IF;
  
  -- Create employee record for tenant admin
  -- Get Full-Time worker type ID for tenant admin employee
  SELECT id INTO v_worker_type_id
  FROM hris.worker_type
  WHERE organization_id = org_id
    AND code = 'FT'
  LIMIT 1;

  INSERT INTO hris.employee (
    organization_id,
    user_account_id,
    worker_type_id,
    employee_number,
    first_name,
    last_name,
    email,
    employment_status,
    employment_type,
    hire_date,
    created_at
  ) VALUES (
    org_id,
    v_user_account_id,
    v_worker_type_id,
    'EMP001',
    'Tenant',
    'Administrator',
    'tenant@testcompany.com',
    'active',
    'full_time',
    NOW(),
    NOW()
  ) ON CONFLICT (organization_id, employee_number) DO NOTHING;
  
  -- Update user_account with employee_id
  UPDATE hris.user_account ua
  SET employee_id = e.id
  FROM hris.employee e
  WHERE ua.id = v_user_account_id 
    AND e.user_account_id = v_user_account_id
    AND ua.employee_id IS NULL;
  
  -- Create payroll configuration for tenant admin
  INSERT INTO payroll.employee_payroll_config (
    organization_id,
    employee_id,
    pay_frequency,
    payment_method,
    currency,
    payroll_status,
    payroll_start_date,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'monthly',
    'direct_deposit',
    'SRD',
    'active',
    NOW(),
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP001'
  ON CONFLICT (organization_id, employee_id) DO NOTHING;
  
  -- Create compensation record for tenant admin
  INSERT INTO payroll.compensation (
    organization_id,
    employee_id,
    compensation_type,
    amount,
    currency,
    effective_from,
    is_current,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'salary',
    15000.00,
    'SRD',
    NOW()::date,
    true,
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP001'
  ON CONFLICT (employee_id, effective_from) DO NOTHING;
  
  -- Assign worker type for tenant admin (Full-Time)
  -- NOTE: Uses payroll.worker_type_history for historical tracking
  -- References hris.worker_type (not the old worker_type_template)
  INSERT INTO payroll.worker_type_history (
    organization_id,
    employee_id,
    worker_type_id,
    is_current,
    effective_from,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    wt.id,
    true,
    NOW()::date,
    v_user_account_id,
    NOW()
  FROM hris.employee e
  CROSS JOIN hris.worker_type wt
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP001'
    AND wt.code = 'FT'
    AND wt.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM payroll.worker_type_history wth
      WHERE wth.employee_id = e.id
        AND wth.organization_id = org_id
        AND wth.is_current = true
        AND wth.deleted_at IS NULL
    )
  ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING;
  
  RAISE NOTICE '[OK] Test organization and tenant user created successfully!';
  RAISE NOTICE '[INFO] Organization: Test Company Ltd (test-company)';
  RAISE NOTICE '[INFO] Tenant User: tenant@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
  RAISE NOTICE '[INFO] You can now login with this user to access Paylinq features';
END $$;

-- Create a payroll manager user for the test organization
DO $$
DECLARE
  org_id UUID;
  v_user_account_id UUID;
  v_worker_type_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert payroll manager user
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'payroll@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["paylinq"]'::jsonb,
    '{"paylinq": "payroll_manager"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING
  RETURNING id INTO v_user_account_id;
  
  -- Get the user_account_id if it already exists
  IF v_user_account_id IS NULL THEN
    SELECT id INTO v_user_account_id FROM hris.user_account 
    WHERE organization_id = org_id AND email = 'payroll@testcompany.com';
  END IF;
  
  -- Get Full-Time worker type ID for payroll manager
  SELECT id INTO v_worker_type_id
  FROM hris.worker_type
  WHERE organization_id = org_id
    AND code = 'FT'
  LIMIT 1;

  -- Create employee record for payroll manager
  INSERT INTO hris.employee (
    organization_id,
    user_account_id,
    worker_type_id,
    employee_number,
    first_name,
    last_name,
    email,
    employment_status,
    employment_type,
    hire_date,
    created_at
  ) VALUES (
    org_id,
    v_user_account_id,
    v_worker_type_id,
    'EMP002',
    'Payroll',
    'Manager',
    'payroll@testcompany.com',
    'active',
    'full_time',
    NOW(),
    NOW()
  ) ON CONFLICT (organization_id, employee_number) DO NOTHING;
  
  -- Update user_account with employee_id
  UPDATE hris.user_account ua
  SET employee_id = e.id
  FROM hris.employee e
  WHERE ua.id = v_user_account_id 
    AND e.user_account_id = v_user_account_id
    AND ua.employee_id IS NULL;
  
  -- Create payroll configuration for payroll manager
  INSERT INTO payroll.employee_payroll_config (
    organization_id,
    employee_id,
    pay_frequency,
    payment_method,
    currency,
    payroll_status,
    payroll_start_date,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'monthly',
    'direct_deposit',
    'SRD',
    'active',
    NOW(),
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP002'
  ON CONFLICT (organization_id, employee_id) DO NOTHING;
  
  -- Create compensation record for payroll manager
  INSERT INTO payroll.compensation (
    organization_id,
    employee_id,
    compensation_type,
    amount,
    currency,
    effective_from,
    is_current,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'salary',
    26000.00,
    'SRD',
    NOW()::date,
    true,
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP002'
  ON CONFLICT (employee_id, effective_from) DO NOTHING;
  
  -- Assign worker type for payroll manager (Full-Time)
  INSERT INTO payroll.worker_type_history (
    organization_id,
    employee_id,
    worker_type_id,
    is_current,
    effective_from,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    wt.id,
    true,
    NOW()::date,
    v_user_account_id,
    NOW()
  FROM hris.employee e
  CROSS JOIN hris.worker_type wt
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP002'
    AND wt.code = 'FT'
    AND wt.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM payroll.worker_type_history wth
      WHERE wth.employee_id = e.id
        AND wth.organization_id = org_id
        AND wth.is_current = true
        AND wth.deleted_at IS NULL
    )
  ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING;
  
  RAISE NOTICE '[INFO] Payroll Manager: payroll@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
END $$;

-- Create an employee self-service user
DO $$
DECLARE
  org_id UUID;
  v_user_account_id UUID;
  v_worker_type_id UUID;
BEGIN
  -- Get the test organization ID
  SELECT id INTO org_id FROM organizations WHERE slug = 'test-company';
  
  -- Insert employee user
  INSERT INTO hris.user_account (
    email,
    password_hash,
    organization_id,
    enabled_products,
    product_roles,
    email_verified,
    is_active,
    created_at
  ) VALUES (
    'employee@testcompany.com',
    '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
    org_id,
    '["nexus"]'::jsonb,
    '{"nexus": "employee"}'::jsonb,
    true,
    true,
    NOW()
  ) ON CONFLICT (organization_id, email) DO NOTHING
  RETURNING id INTO v_user_account_id;
  
  -- Get the user_account_id if it already exists
  IF v_user_account_id IS NULL THEN
    SELECT id INTO v_user_account_id FROM hris.user_account 
    WHERE organization_id = org_id AND email = 'employee@testcompany.com';
  END IF;
  
  -- Get Part-Time worker type ID for regular employee
  SELECT id INTO v_worker_type_id
  FROM hris.worker_type
  WHERE organization_id = org_id
    AND code = 'PT'
  LIMIT 1;

  -- Create employee record for self-service user
  INSERT INTO hris.employee (
    organization_id,
    user_account_id,
    worker_type_id,
    employee_number,
    first_name,
    last_name,
    email,
    employment_status,
    employment_type,
    hire_date,
    created_at
  ) VALUES (
    org_id,
    v_user_account_id,
    v_worker_type_id,
    'EMP003',
    'John',
    'Employee',
    'employee@testcompany.com',
    'active',
    'part_time',
    NOW(),
    NOW()
  ) ON CONFLICT (organization_id, employee_number) DO NOTHING;
  
  -- Update user_account with employee_id
  UPDATE hris.user_account ua
  SET employee_id = e.id
  FROM hris.employee e
  WHERE ua.id = v_user_account_id 
    AND e.user_account_id = v_user_account_id
    AND ua.employee_id IS NULL;
  
  -- Create payroll configuration for employee
  INSERT INTO payroll.employee_payroll_config (
    organization_id,
    employee_id,
    pay_frequency,
    payment_method,
    currency,
    payroll_status,
    payroll_start_date,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'biweekly',
    'direct_deposit',
    'SRD',
    'active',
    NOW(),
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP003'
  ON CONFLICT (organization_id, employee_id) DO NOTHING;
  
  -- Create compensation record for employee (hourly worker)
  INSERT INTO payroll.compensation (
    organization_id,
    employee_id,
    compensation_type,
    amount,
    currency,
    effective_from,
    is_current,
    overtime_rate,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    'hourly',
    125.00,
    'SRD',
    NOW()::date,
    true,
    187.50, -- 1.5x overtime rate
    v_user_account_id,
    NOW()
  FROM hris.employee e
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP003'
  ON CONFLICT (employee_id, effective_from) DO NOTHING;
  
  -- Assign worker type for employee (Part-Time hourly)
  INSERT INTO payroll.worker_type_history (
    organization_id,
    employee_id,
    worker_type_id,
    is_current,
    effective_from,
    created_by,
    created_at
  )
  SELECT
    org_id,
    e.id,
    wt.id,
    true,
    NOW()::date,
    v_user_account_id,
    NOW()
  FROM hris.employee e
  CROSS JOIN hris.worker_type wt
  WHERE e.organization_id = org_id 
    AND e.employee_number = 'EMP003'
    AND wt.code = 'PT'
    AND wt.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM payroll.worker_type_history wth
      WHERE wth.employee_id = e.id
        AND wth.organization_id = org_id
        AND wth.is_current = true
        AND wth.deleted_at IS NULL
    )
  ON CONFLICT (organization_id, employee_id, worker_type_id, effective_from) DO NOTHING;
  
  RAISE NOTICE '[INFO] Employee: employee@testcompany.com';
  RAISE NOTICE '[INFO] Password: Admin123!';
END $$;

-- Summary
SELECT 
  '============================================' as "====================";
SELECT 'Test Organization and Users Created' as "Status";
SELECT 
  '============================================' as "====================";
SELECT '' as "Separator";
SELECT 'Organization Details:' as "Section";
SELECT '  Name: Test Company Ltd' as "Info";
SELECT '  Slug: test-company' as "Info";
SELECT '  Tier: Enterprise' as "Info";
SELECT '  Status: Active' as "Info";
SELECT '' as "Separator";
SELECT 'Test Users Created:' as "Section";
SELECT '  1. tenant@testcompany.com (Owner)' as "Info";
SELECT '  2. payroll@testcompany.com (Payroll Manager)' as "Info";
SELECT '  3. employee@testcompany.com (Employee)' as "Info";
SELECT '  Password for all: Admin123!' as "Info";
SELECT '' as "Separator";
SELECT 'Usage:' as "Section";
SELECT '  1. Login with tenant@testcompany.com to access Paylinq' as "Info";
SELECT '  2. Dashboard and all Paylinq features will be available' as "Info";
SELECT '  3. Use payroll@testcompany.com for payroll management' as "Info";
SELECT '  4. Use employee@testcompany.com to test employee portal' as "Info";

-- ============================================================================
-- Grant Product Permissions to Test Organization
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
BEGIN
  -- Get test organization ID
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-company';
  
  IF test_org_id IS NOT NULL THEN
    -- Grant all products to test organization (Enterprise tier)
    INSERT INTO product_permissions (
      organization_id, product_id, is_enabled, access_level,
      enabled_features, granted_at
    )
    SELECT 
      test_org_id,
      p.id,
      TRUE,
      'full',
      p.default_features,
      NOW()
    FROM products p
    ON CONFLICT (organization_id, product_id) DO NOTHING;
    
    RAISE NOTICE '[OK] Product permissions granted to test organization';
  END IF;
END $$;

-- ============================================================================
-- ASSIGN RBAC ROLES TO TEST USERS
-- ============================================================================
-- Description: Links test users to appropriate RBAC roles
-- Prerequisite: seed-rbac-tenant-roles.sql must be executed first
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  
  -- User IDs
  tenant_admin_user_id UUID;
  
  -- Role IDs
  org_admin_role_id UUID;
  hr_manager_role_id UUID;
  payroll_admin_role_id UUID;
  employee_role_id UUID;
BEGIN
  -- Get test organization ID
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-company';
  
  IF test_org_id IS NULL THEN
    RAISE NOTICE '[SKIP] Test organization not found. Skipping role assignments.';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[*] Assigning RBAC roles to test users...';
  RAISE NOTICE '================================================================';
  
  -- ============================================================================
  -- GET USER IDs
  -- ============================================================================
  
  -- Get tenant admin user ID
  SELECT ua.id INTO tenant_admin_user_id
  FROM hris.user_account ua
  WHERE ua.organization_id = test_org_id 
    AND ua.email = 'tenant@testcompany.com';
    
  IF tenant_admin_user_id IS NULL THEN
    RAISE NOTICE '[WARN] Tenant admin user not found. Skipping role assignments.';
    RETURN;
  END IF;
  
  RAISE NOTICE '[INFO] Found user: tenant@testcompany.com (ID: %)', tenant_admin_user_id;
  
  -- ============================================================================
  -- GET ROLE IDs
  -- ============================================================================
  
  -- Get org_admin role
  SELECT id INTO org_admin_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'org_admin';
  
  -- Get hr_manager role
  SELECT id INTO hr_manager_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'hr_manager';
  
  -- Get payroll_admin role
  SELECT id INTO payroll_admin_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'payroll_admin';
  
  -- Get employee role
  SELECT id INTO employee_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'employee';
  
  -- Verify roles exist
  IF org_admin_role_id IS NULL THEN
    RAISE NOTICE '[WARN] org_admin role not found! Run seed-rbac-tenant-roles.sql first.';
    RETURN;
  END IF;
  
  RAISE NOTICE '[INFO] Found roles: org_admin, hr_manager, payroll_admin, employee';
  
  -- ============================================================================
  -- ASSIGN ROLES TO USERS
  -- ============================================================================
  
  -- Assign org_admin role to tenant@testcompany.com
  INSERT INTO public.user_roles (user_id, role_id, organization_id, assigned_at, assigned_by)
  VALUES (
    tenant_admin_user_id, 
    org_admin_role_id, 
    test_org_id, 
    NOW(),
    tenant_admin_user_id  -- Self-assigned during seed
  )
  ON CONFLICT (user_id, role_id, organization_id) DO UPDATE
  SET assigned_at = NOW();
  
  RAISE NOTICE '[OK] Assigned role: org_admin → tenant@testcompany.com';
  
  -- Optionally assign additional roles for testing
  -- This allows testing multi-role scenarios
  
  -- Also assign hr_manager role (multi-role example)
  INSERT INTO public.user_roles (user_id, role_id, organization_id, assigned_at, assigned_by)
  VALUES (
    tenant_admin_user_id, 
    hr_manager_role_id, 
    test_org_id, 
    NOW(),
    tenant_admin_user_id
  )
  ON CONFLICT (user_id, role_id, organization_id) DO UPDATE
  SET assigned_at = NOW();
  
  RAISE NOTICE '[OK] Assigned role: hr_manager → tenant@testcompany.com (multi-role)';
  
  -- Also assign payroll_admin role (multi-role example)
  INSERT INTO public.user_roles (user_id, role_id, organization_id, assigned_at, assigned_by)
  VALUES (
    tenant_admin_user_id, 
    payroll_admin_role_id, 
    test_org_id, 
    NOW(),
    tenant_admin_user_id
  )
  ON CONFLICT (user_id, role_id, organization_id) DO UPDATE
  SET assigned_at = NOW();
  
  RAISE NOTICE '[OK] Assigned role: payroll_admin → tenant@testcompany.com (multi-role)';
  
  -- Success summary
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] RBAC role assignments completed!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'User: tenant@testcompany.com';
  RAISE NOTICE '  - org_admin (Organization Administrator)';
  RAISE NOTICE '  - hr_manager (HR Manager)';
  RAISE NOTICE '  - payroll_admin (Payroll Administrator)';
  RAISE NOTICE '';
  RAISE NOTICE '[INFO] User now has full access to all products';
  RAISE NOTICE '[INFO] Test multi-role scenarios with this user';
  RAISE NOTICE '[INFO] Additional users can be created via Settings page';
  RAISE NOTICE '================================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] Failed to assign roles: %', SQLERRM;
    RAISE NOTICE '[INFO] Make sure seed-rbac-tenant-roles.sql was executed first';
END $$;
