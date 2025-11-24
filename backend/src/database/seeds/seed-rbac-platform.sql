-- ============================================================================
-- Seed Default RBAC Permissions and Platform Roles
-- Run this AFTER RBAC migration to populate default permissions and roles
-- ============================================================================

-- ============================================================================
-- 1. SEED PLATFORM PERMISSIONS (organization_id IS NULL = platform-wide)
-- ============================================================================

-- License Management Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'license:view', 'View Licenses', 'View licenses and customers', 'license'),
('platform', 'license:create', 'Create Licenses', 'Create new licenses and customers', 'license'),
('platform', 'license:edit', 'Edit Licenses', 'Edit existing licenses and customers', 'license'),
('platform', 'license:delete', 'Delete Licenses', 'Delete licenses and customers', 'license'),
('platform', 'license:renew', 'Renew Licenses', 'Renew licenses', 'license'),
('platform', 'license:suspend', 'Suspend Licenses', 'Suspend licenses', 'license'),
('platform', 'license:download', 'Download License Files', 'Download license files', 'license'),
('platform', 'license:analytics', 'View License Analytics', 'View license analytics and reports', 'license')
ON CONFLICT (product, name) DO NOTHING;

-- Portal/Platform Management Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'portal:view', 'View Portal Dashboard', 'Access admin portal dashboard', 'portal'),
('platform', 'portal:users:manage', 'Manage Portal Users', 'Manage portal admin users', 'portal'),
('platform', 'portal:settings', 'Manage Platform Settings', 'Manage platform settings', 'portal')
ON CONFLICT (product, name) DO NOTHING;

-- Security Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'security:view', 'View Security Logs', 'View security logs and alerts', 'security'),
('platform', 'security:manage', 'Manage Security', 'Manage security settings and respond to alerts', 'security'),
('platform', 'security:audit', 'View Audit Logs', 'View audit logs', 'security')
ON CONFLICT (product, name) DO NOTHING;

-- VPS/Infrastructure Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'vps:view', 'View VPS Instances', 'View VPS instances', 'infrastructure'),
('platform', 'vps:provision', 'Provision VPS', 'Provision new VPS instances', 'infrastructure'),
('platform', 'vps:manage', 'Manage VPS', 'Manage VPS instances (start, stop, restart)', 'infrastructure'),
('platform', 'vps:delete', 'Delete VPS', 'Delete VPS instances', 'infrastructure'),
('platform', 'vps:ssh', 'SSH Access', 'SSH access to VPS instances', 'infrastructure')
ON CONFLICT (product, name) DO NOTHING;

-- Deployment Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'deployment:view', 'View Deployments', 'View deployment status', 'deployment'),
('platform', 'deployment:create', 'Create Deployments', 'Create new deployments', 'deployment'),
('platform', 'deployment:manage', 'Manage Deployments', 'Manage deployments (cancel, retry)', 'deployment'),
('platform', 'deployment:logs', 'View Deployment Logs', 'View deployment logs', 'deployment')
ON CONFLICT (product, name) DO NOTHING;

-- Tenant/Organization Management Permissions
INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
('platform', 'tenant:view', 'View Tenants', 'View tenant organizations', 'tenant'),
('platform', 'tenant:create', 'Create Tenants', 'Create new tenant organizations', 'tenant'),
('platform', 'tenant:edit', 'Edit Tenants', 'Edit tenant organizations', 'tenant'),
('platform', 'tenant:delete', 'Delete Tenants', 'Delete tenant organizations', 'tenant'),
('platform', 'tenant:users:manage', 'Manage Tenant Users', 'Manage users in tenant organizations', 'tenant')
ON CONFLICT (product, name) DO NOTHING;

-- ============================================================================
-- 2. SEED PLATFORM ROLES (organization_id IS NULL = platform-wide)
-- ============================================================================

DO $$
DECLARE
  super_admin_role_id UUID;
  platform_admin_role_id UUID;
  license_admin_role_id UUID;
  security_admin_role_id UUID;
  deployment_admin_role_id UUID;
  support_staff_role_id UUID;
BEGIN
  -- Create platform roles (organization_id = NULL for platform-wide roles)
  INSERT INTO public.roles (organization_id, name, display_name, role_type, description) VALUES
  (NULL, 'super_admin', 'Super Administrator', 'system', 'Full access to all platform features'),
  (NULL, 'platform_admin', 'Platform Administrator', 'system', 'Manage platform, licenses, and deployments'),
  (NULL, 'license_admin', 'License Administrator', 'system', 'Manage licenses and customers only'),
  (NULL, 'security_admin', 'Security Administrator', 'system', 'Manage security and monitoring'),
  (NULL, 'deployment_admin', 'Deployment Administrator', 'system', 'Manage VPS and deployments'),
  (NULL, 'support_staff', 'Support Staff', 'system', 'View-only access for customer support')
  ON CONFLICT (organization_id, name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description = EXCLUDED.description;

  -- Get role IDs for permission assignments
  SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'super_admin' AND organization_id IS NULL;
  SELECT id INTO platform_admin_role_id FROM public.roles WHERE name = 'platform_admin' AND organization_id IS NULL;
  SELECT id INTO license_admin_role_id FROM public.roles WHERE name = 'license_admin' AND organization_id IS NULL;
  SELECT id INTO security_admin_role_id FROM public.roles WHERE name = 'security_admin' AND organization_id IS NULL;
  SELECT id INTO deployment_admin_role_id FROM public.roles WHERE name = 'deployment_admin' AND organization_id IS NULL;
  SELECT id INTO support_staff_role_id FROM public.roles WHERE name = 'support_staff' AND organization_id IS NULL;

  -- Assign permissions to super_admin (all permissions)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT super_admin_role_id, id FROM public.permissions WHERE product = 'platform'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign permissions to platform_admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT platform_admin_role_id, id FROM public.permissions 
  WHERE product = 'platform' 
    AND category IN ('portal', 'license', 'deployment', 'tenant')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign permissions to license_admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT license_admin_role_id, id FROM public.permissions 
  WHERE product = 'platform' 
    AND category = 'license'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign permissions to security_admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT security_admin_role_id, id FROM public.permissions 
  WHERE product = 'platform' 
    AND category = 'security'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign permissions to deployment_admin
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT deployment_admin_role_id, id FROM public.permissions 
  WHERE product = 'platform' 
    AND category IN ('infrastructure', 'deployment')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Assign view-only permissions to support_staff
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT support_staff_role_id, id FROM public.permissions 
  WHERE product = 'platform' 
    AND name LIKE '%:view'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] Platform roles and permissions seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Platform Roles Created (organization_id = NULL):';
  RAISE NOTICE '  - super_admin - Full platform access';
  RAISE NOTICE '  - platform_admin - Platform, licenses, deployments';
  RAISE NOTICE '  - security_admin - Security and monitoring';
  RAISE NOTICE '  - deployment_admin - VPS and deployments';
  RAISE NOTICE '  - license_admin - Licenses only';
  RAISE NOTICE '  - support_staff - View-only support access';
  RAISE NOTICE '================================================================';
END;
$$;
