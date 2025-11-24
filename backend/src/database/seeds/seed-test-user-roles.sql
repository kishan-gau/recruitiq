-- ============================================================================
-- ASSIGN RBAC ROLES TO TEST USERS
-- ============================================================================
-- Description: Links test users to appropriate RBAC roles
-- Prerequisites: 
--   1. seed-test-tenant.sql (creates test organization and users)
--   2. seed-rbac-tenant-roles.sql (creates default tenant roles)
-- ============================================================================

DO $$
DECLARE
  test_org_id UUID;
  
  -- User IDs
  tenant_admin_user_id UUID;
  payroll_manager_user_id UUID;
  employee_user_id UUID;
  
  -- Role IDs
  org_admin_role_id UUID;
  hr_manager_role_id UUID;
  payroll_admin_role_id UUID;
  payroll_manager_role_id UUID;
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
    
  -- Get payroll manager user ID
  SELECT ua.id INTO payroll_manager_user_id
  FROM hris.user_account ua
  WHERE ua.organization_id = test_org_id 
    AND ua.email = 'payroll@testcompany.com';
    
  -- Get employee user ID
  SELECT ua.id INTO employee_user_id
  FROM hris.user_account ua
  WHERE ua.organization_id = test_org_id 
    AND ua.email = 'employee@testcompany.com';
    
  IF tenant_admin_user_id IS NULL THEN
    RAISE NOTICE '[WARN] Test users not found. Skipping role assignments.';
    RETURN;
  END IF;
  
  RAISE NOTICE '[INFO] Found users:';
  RAISE NOTICE '  - tenant@testcompany.com (ID: %)', tenant_admin_user_id;
  RAISE NOTICE '  - payroll@testcompany.com (ID: %)', payroll_manager_user_id;
  RAISE NOTICE '  - employee@testcompany.com (ID: %)', employee_user_id;
  
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
  
  -- Get payroll_manager role
  SELECT id INTO payroll_manager_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'payroll_manager';
  
  -- Get employee role
  SELECT id INTO employee_role_id 
  FROM public.roles 
  WHERE organization_id = test_org_id AND name = 'employee';
  
  -- Verify roles exist
  IF org_admin_role_id IS NULL THEN
    RAISE NOTICE '[ERROR] Default roles not found! Run seed-rbac-tenant-roles.sql first.';
    RETURN;
  END IF;
  
  RAISE NOTICE '[INFO] Found roles: org_admin, hr_manager, payroll_admin, payroll_manager, employee';
  
  -- ============================================================================
  -- ASSIGN ROLES TO TENANT ADMIN (tenant@testcompany.com)
  -- ============================================================================
  
  -- Assign org_admin role (full access)
  INSERT INTO public.user_roles (user_id, role_id, created_at, created_by)
  VALUES (
    tenant_admin_user_id, 
    org_admin_role_id, 
    NOW(),
    tenant_admin_user_id  -- Self-assigned during seed
  )
  ON CONFLICT (user_id, role_id) DO UPDATE
  SET created_at = NOW();
  
  RAISE NOTICE '[OK] Assigned: org_admin → tenant@testcompany.com';
  
  -- Also assign hr_manager role (multi-role example)
  INSERT INTO public.user_roles (user_id, role_id, created_at, created_by)
  VALUES (
    tenant_admin_user_id, 
    hr_manager_role_id, 
    NOW(),
    tenant_admin_user_id
  )
  ON CONFLICT (user_id, role_id) DO UPDATE
  SET created_at = NOW();
  
  RAISE NOTICE '[OK] Assigned: hr_manager → tenant@testcompany.com';
  
  -- Also assign payroll_admin role (multi-role example)
  INSERT INTO public.user_roles (user_id, role_id, created_at, created_by)
  VALUES (
    tenant_admin_user_id, 
    payroll_admin_role_id, 
    NOW(),
    tenant_admin_user_id
  )
  ON CONFLICT (user_id, role_id) DO UPDATE
  SET created_at = NOW();
  
  RAISE NOTICE '[OK] Assigned: payroll_admin → tenant@testcompany.com';
  
  -- ============================================================================
  -- ASSIGN ROLES TO PAYROLL MANAGER (payroll@testcompany.com)
  -- ============================================================================
  
  IF payroll_manager_user_id IS NOT NULL THEN
    -- Assign payroll_manager role
    INSERT INTO public.user_roles (user_id, role_id, created_at, created_by)
    VALUES (
      payroll_manager_user_id, 
      payroll_manager_role_id, 
      NOW(),
      tenant_admin_user_id  -- Assigned by admin
    )
    ON CONFLICT (user_id, role_id) DO UPDATE
    SET created_at = NOW();
    
    RAISE NOTICE '[OK] Assigned: payroll_manager → payroll@testcompany.com';
  END IF;
  
  -- ============================================================================
  -- ASSIGN ROLES TO EMPLOYEE (employee@testcompany.com)
  -- ============================================================================
  
  IF employee_user_id IS NOT NULL THEN
    -- Assign employee role
    INSERT INTO public.user_roles (user_id, role_id, created_at, created_by)
    VALUES (
      employee_user_id, 
      employee_role_id, 
      NOW(),
      tenant_admin_user_id  -- Assigned by admin
    )
    ON CONFLICT (user_id, role_id) DO UPDATE
    SET created_at = NOW();
    
    RAISE NOTICE '[OK] Assigned: employee → employee@testcompany.com';
  END IF;
  
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
  RAISE NOTICE 'User: payroll@testcompany.com';
  RAISE NOTICE '  - payroll_manager (Payroll Manager - review/approve)';
  RAISE NOTICE '';
  RAISE NOTICE 'User: employee@testcompany.com';
  RAISE NOTICE '  - employee (Employee - self-service)';
  RAISE NOTICE '';
  RAISE NOTICE '[INFO] Users now have full access to their assigned products';
  RAISE NOTICE '[INFO] Test multi-role scenarios with tenant@testcompany.com';
  RAISE NOTICE '[INFO] Additional users can be created via Settings page';
  RAISE NOTICE '================================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] Failed to assign roles: %', SQLERRM;
    RAISE NOTICE '[INFO] Make sure seed-rbac-tenant-roles.sql was executed first';
END $$;
