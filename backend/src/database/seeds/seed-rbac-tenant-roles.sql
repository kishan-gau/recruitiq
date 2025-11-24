-- ============================================================================
-- Seed Default Tenant Roles (Organization-Level System Roles)
-- ============================================================================
-- Description: Seeds default system roles for tenant organizations
--              These roles are created for EACH organization
--              Run this AFTER product permissions are seeded
-- ============================================================================

-- ============================================================================
-- CREATE DEFAULT TENANT ROLES FOR TEST ORGANIZATION
-- ============================================================================
-- Note: In production, these roles should be created automatically when
--       a new organization is onboarded. This seed is for development/testing.

DO $$
DECLARE
  test_org_id UUID;
  
  -- Role IDs
  org_admin_role_id UUID;
  hr_manager_role_id UUID;
  payroll_admin_role_id UUID;
  payroll_manager_role_id UUID;
  scheduler_role_id UUID;
  recruiter_role_id UUID;
  hiring_manager_role_id UUID;
  employee_role_id UUID;
  manager_role_id UUID;
BEGIN
  -- Get test organization ID
  SELECT id INTO test_org_id FROM organizations WHERE slug = 'test-company';
  
  IF test_org_id IS NULL THEN
    RAISE EXCEPTION 'Test organization not found! Run seed-test-tenant.sql first.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[*] Creating default tenant roles for: Test Company Ltd';
  RAISE NOTICE '================================================================';

  -- ============================================================================
  -- 1. ORGANIZATION ADMIN (Full access to all products)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'org_admin',
    'Organization Administrator',
    'tenant',
    'Full administrative access to all products and settings',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO org_admin_role_id;

  -- Assign ALL permissions to org admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT org_admin_role_id, id 
  FROM public.permissions 
  WHERE product IN ('nexus', 'paylinq', 'schedulehub', 'recruitiq')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Organization Administrator (full access)';

  -- ============================================================================
  -- 2. HR MANAGER (Nexus HRIS + RecruitIQ ATS access)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'hr_manager',
    'HR Manager',
    'tenant',
    'Manage employees, recruitment, benefits, and HR operations',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO hr_manager_role_id;

  -- Assign Nexus permissions (full HRIS access)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT hr_manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'nexus'
    AND category IN ('employees', 'departments', 'locations', 'contracts', 'benefits', 'documents', 'reports', 'settings')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign RecruitIQ permissions (full ATS access)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT hr_manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'recruitiq'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: HR Manager (Nexus + RecruitIQ)';

  -- ============================================================================
  -- 3. PAYROLL ADMINISTRATOR (PayLinQ full access)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'payroll_admin',
    'Payroll Administrator',
    'tenant',
    'Full payroll management including processing, payments, and compliance',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO payroll_admin_role_id;

  -- Assign ALL PayLinQ permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT payroll_admin_role_id, id 
  FROM public.permissions 
  WHERE product = 'paylinq'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Add employee view permissions from Nexus
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT payroll_admin_role_id, id 
  FROM public.permissions 
  WHERE product = 'nexus'
    AND name IN ('employees:read', 'departments:read', 'locations:read')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Payroll Administrator (PayLinQ full access)';

  -- ============================================================================
  -- 4. PAYROLL MANAGER (PayLinQ view + approve)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'payroll_manager',
    'Payroll Manager',
    'tenant',
    'Review and approve payroll runs, view reports',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO payroll_manager_role_id;

  -- Assign PayLinQ view + approve permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT payroll_manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'paylinq'
    AND (name LIKE '%:read' OR name LIKE '%:view' OR name LIKE '%:approve' OR name LIKE '%:export')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Payroll Manager (review/approve)';

  -- ============================================================================
  -- 5. SCHEDULER (ScheduleHub full access)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'scheduler',
    'Scheduler',
    'tenant',
    'Manage schedules, shifts, and worker assignments',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO scheduler_role_id;

  -- Assign ALL ScheduleHub permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT scheduler_role_id, id 
  FROM public.permissions 
  WHERE product = 'schedulehub'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Add employee view permissions from Nexus
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT scheduler_role_id, id 
  FROM public.permissions 
  WHERE product = 'nexus'
    AND name IN ('employees:read', 'departments:read', 'locations:read')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Scheduler (ScheduleHub full access)';

  -- ============================================================================
  -- 6. RECRUITER (RecruitIQ full access)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'recruiter',
    'Recruiter',
    'tenant',
    'Manage job postings, candidates, applications, and interviews',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO recruiter_role_id;

  -- Assign ALL RecruitIQ permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT recruiter_role_id, id 
  FROM public.permissions 
  WHERE product = 'recruitiq'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Recruiter (RecruitIQ full access)';

  -- ============================================================================
  -- 7. HIRING MANAGER (RecruitIQ view + interview)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'hiring_manager',
    'Hiring Manager',
    'tenant',
    'Review candidates, conduct interviews, and approve offers',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO hiring_manager_role_id;

  -- Assign RecruitIQ view + interview permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT hiring_manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'recruitiq'
    AND (name LIKE '%:read' OR name LIKE '%:view' OR category IN ('interviews', 'offers'))
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Hiring Manager (review/interview)';

  -- ============================================================================
  -- 8. MANAGER (Department/team management)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'manager',
    'Manager',
    'tenant',
    'Manage team members, approve time-off, view reports',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO manager_role_id;

  -- Assign limited Nexus permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'nexus'
    AND (
      name IN ('employees:read', 'departments:read', 'timeoff:approve', 'attendance:approve', 'reports:view')
    )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign limited ScheduleHub permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT manager_role_id, id 
  FROM public.permissions 
  WHERE product = 'schedulehub'
    AND (name LIKE '%:read' OR name LIKE '%:view' OR name LIKE '%:approve')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Manager (team oversight)';

  -- ============================================================================
  -- 9. EMPLOYEE (Self-service access)
  -- ============================================================================
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description, is_active)
  VALUES (
    test_org_id,
    'employee',
    'Employee',
    'tenant',
    'View own information, request time-off, view payslips',
    true
  )
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description
  RETURNING id INTO employee_role_id;

  -- Assign self-service permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT employee_role_id, id 
  FROM public.permissions 
  WHERE product = 'nexus'
    AND name IN ('employees:read', 'timeoff:create', 'timeoff:read', 'documents:read')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT employee_role_id, id 
  FROM public.permissions 
  WHERE product = 'paylinq'
    AND name IN ('reports:payslips')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT employee_role_id, id 
  FROM public.permissions 
  WHERE product = 'schedulehub'
    AND name IN ('schedules:read', 'shifts:read', 'availability:create', 'availability:read', 'swaps:create')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE '[OK] Created role: Employee (self-service)';

  -- Success summary
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] Default tenant roles created successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Roles Created:';
  RAISE NOTICE '  1. Organization Administrator - Full access to all products';
  RAISE NOTICE '  2. HR Manager - Nexus HRIS + RecruitIQ ATS';
  RAISE NOTICE '  3. Payroll Administrator - PayLinQ full access';
  RAISE NOTICE '  4. Payroll Manager - PayLinQ review/approve';
  RAISE NOTICE '  5. Scheduler - ScheduleHub full access';
  RAISE NOTICE '  6. Recruiter - RecruitIQ full access';
  RAISE NOTICE '  7. Hiring Manager - RecruitIQ review/interview';
  RAISE NOTICE '  8. Manager - Team oversight (Nexus + ScheduleHub)';
  RAISE NOTICE '  9. Employee - Self-service access';
  RAISE NOTICE '';
  RAISE NOTICE '[INFO] These roles are organization-scoped (tenant-level)';
  RAISE NOTICE '[INFO] Each organization gets its own set of these roles';
  RAISE NOTICE '[INFO] Custom roles can be created via Settings page';
  RAISE NOTICE '================================================================';
END;
$$;
