-- ============================================================================
-- Platform Roles & Permissions Migration
-- Adds License Manager and Platform roles to existing users table
-- ============================================================================

-- Step 1: Update users table role constraint to include new roles
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  -- Tenant roles (existing)
  'owner', 'admin', 'recruiter', 'member', 'applicant',
  -- Platform roles (new)
  'platform_admin',        -- Full platform access
  'platform_super_admin',  -- Ultimate access to everything
  'license_manager',       -- License management only
  'security_admin',        -- Security monitoring only
  'support_admin'          -- Support/read-only access
));

-- Step 2: Create permissions enum type for better validation
DO $$ BEGIN
  CREATE TYPE permission_type AS ENUM (
    -- License Management Permissions
    'license:view',
    'license:create',
    'license:update',
    'license:delete',
    'license:renew',
    'license:suspend',
    'license:validate',
    
    -- Customer Management Permissions
    'customer:view',
    'customer:create',
    'customer:update',
    'customer:delete',
    'customer:view_usage',
    
    -- VPS/Deployment Permissions
    'vps:provision',
    'vps:manage',
    'vps:delete',
    'vps:view',
    'deployment:create',
    'deployment:cancel',
    
    -- Tier Management Permissions
    'tier:view',
    'tier:create',
    'tier:update',
    'tier:migrate',
    
    -- Security Permissions
    'security:view_logs',
    'security:view_alerts',
    'security:manage_rules',
    'security:export_data',
    
    -- Portal Permissions
    'portal:view_dashboard',
    'portal:manage_users',
    'portal:view_analytics',
    'portal:system_settings',
    
    -- Audit Permissions
    'audit:view',
    'audit:export',
    
    -- Telemetry Permissions
    'telemetry:view',
    'telemetry:export'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add platform-specific fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_platform_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS platform_access_level VARCHAR(50) DEFAULT 'none' 
  CHECK (platform_access_level IN ('none', 'read', 'write', 'admin', 'super_admin'));

-- Index for platform users
CREATE INDEX IF NOT EXISTS idx_users_platform ON users(is_platform_user) WHERE is_platform_user = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_platform_access ON users(platform_access_level);

-- Step 4: Create role_permissions mapping table for default permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role, permission)
);

-- Step 5: Insert default role permissions
INSERT INTO role_permissions (role, permission, description) VALUES
  -- Platform Super Admin (full access)
  ('platform_super_admin', 'license:*', 'Full license management access'),
  ('platform_super_admin', 'customer:*', 'Full customer management access'),
  ('platform_super_admin', 'vps:*', 'Full VPS management access'),
  ('platform_super_admin', 'deployment:*', 'Full deployment access'),
  ('platform_super_admin', 'tier:*', 'Full tier management access'),
  ('platform_super_admin', 'security:*', 'Full security access'),
  ('platform_super_admin', 'portal:*', 'Full portal access'),
  ('platform_super_admin', 'audit:*', 'Full audit access'),
  ('platform_super_admin', 'telemetry:*', 'Full telemetry access'),
  
  -- Platform Admin (most access, no user management)
  ('platform_admin', 'license:view', 'View licenses'),
  ('platform_admin', 'license:create', 'Create licenses'),
  ('platform_admin', 'license:update', 'Update licenses'),
  ('platform_admin', 'license:renew', 'Renew licenses'),
  ('platform_admin', 'license:suspend', 'Suspend licenses'),
  ('platform_admin', 'customer:view', 'View customers'),
  ('platform_admin', 'customer:create', 'Create customers'),
  ('platform_admin', 'customer:update', 'Update customers'),
  ('platform_admin', 'customer:view_usage', 'View customer usage'),
  ('platform_admin', 'vps:view', 'View VPS instances'),
  ('platform_admin', 'deployment:create', 'Create deployments'),
  ('platform_admin', 'tier:view', 'View tiers'),
  ('platform_admin', 'security:view_logs', 'View security logs'),
  ('platform_admin', 'security:view_alerts', 'View security alerts'),
  ('platform_admin', 'portal:view_dashboard', 'View portal dashboard'),
  ('platform_admin', 'portal:view_analytics', 'View analytics'),
  ('platform_admin', 'audit:view', 'View audit logs'),
  ('platform_admin', 'telemetry:view', 'View telemetry'),
  
  -- License Manager (license-specific access)
  ('license_manager', 'license:view', 'View licenses'),
  ('license_manager', 'license:create', 'Create licenses'),
  ('license_manager', 'license:update', 'Update licenses'),
  ('license_manager', 'license:renew', 'Renew licenses'),
  ('license_manager', 'license:suspend', 'Suspend licenses'),
  ('license_manager', 'license:validate', 'Validate licenses'),
  ('license_manager', 'customer:view', 'View customers'),
  ('license_manager', 'customer:create', 'Create customers'),
  ('license_manager', 'customer:update', 'Update customers'),
  ('license_manager', 'customer:view_usage', 'View customer usage'),
  ('license_manager', 'tier:view', 'View tiers'),
  ('license_manager', 'tier:create', 'Create tier versions'),
  ('license_manager', 'tier:update', 'Update tier versions'),
  ('license_manager', 'tier:migrate', 'Migrate customers to new tiers'),
  ('license_manager', 'audit:view', 'View audit logs'),
  ('license_manager', 'telemetry:view', 'View telemetry'),
  
  -- Security Admin (security-focused access)
  ('security_admin', 'security:view_logs', 'View security logs'),
  ('security_admin', 'security:view_alerts', 'View security alerts'),
  ('security_admin', 'security:manage_rules', 'Manage security rules'),
  ('security_admin', 'security:export_data', 'Export security data'),
  ('security_admin', 'audit:view', 'View audit logs'),
  ('security_admin', 'audit:export', 'Export audit logs'),
  ('security_admin', 'portal:view_dashboard', 'View portal dashboard'),
  ('security_admin', 'customer:view', 'View customers'),
  
  -- Support Admin (read-only access)
  ('support_admin', 'license:view', 'View licenses'),
  ('support_admin', 'customer:view', 'View customers'),
  ('support_admin', 'customer:view_usage', 'View customer usage'),
  ('support_admin', 'vps:view', 'View VPS instances'),
  ('support_admin', 'tier:view', 'View tiers'),
  ('support_admin', 'portal:view_dashboard', 'View portal dashboard'),
  ('support_admin', 'audit:view', 'View audit logs'),
  ('support_admin', 'telemetry:view', 'View telemetry')
ON CONFLICT (role, permission) DO NOTHING;

-- Step 6: Create function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  user_id_param UUID,
  permission_param VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  user_permissions JSONB;
  role_perms TEXT[];
  perm TEXT;
BEGIN
  -- Get user role and custom permissions
  SELECT role, permissions INTO user_role, user_permissions
  FROM users
  WHERE id = user_id_param AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has permission in custom permissions array
  IF user_permissions ? permission_param THEN
    RETURN TRUE;
  END IF;
  
  -- Check wildcard permission (e.g., 'license:*' for any license permission)
  IF permission_param ~ '^[a-z_]+:' THEN
    DECLARE
      namespace VARCHAR := split_part(permission_param, ':', 1);
    BEGIN
      IF user_permissions ? (namespace || ':*') THEN
        RETURN TRUE;
      END IF;
    END;
  END IF;
  
  -- Get role-based permissions
  SELECT array_agg(permission) INTO role_perms
  FROM role_permissions
  WHERE role = user_role;
  
  -- Check if permission exists in role permissions
  IF role_perms IS NOT NULL THEN
    FOREACH perm IN ARRAY role_perms LOOP
      -- Check exact match
      IF perm = permission_param THEN
        RETURN TRUE;
      END IF;
      
      -- Check wildcard match (e.g., 'license:*' matches 'license:view')
      IF perm ~ '\*$' THEN
        DECLARE
          perm_namespace VARCHAR := replace(perm, ':*', '');
          check_namespace VARCHAR := split_part(permission_param, ':', 1);
        BEGIN
          IF perm_namespace = check_namespace THEN
            RETURN TRUE;
          END IF;
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Create view for user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role,
  u.is_platform_user,
  u.platform_access_level,
  u.permissions as custom_permissions,
  COALESCE(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'permission', rp.permission,
        'description', rp.description
      )
    ) FILTER (WHERE rp.permission IS NOT NULL),
    '[]'::jsonb
  ) as role_permissions
FROM users u
LEFT JOIN role_permissions rp ON rp.role = u.role
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.name, u.role, u.is_platform_user, u.platform_access_level, u.permissions;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN users.is_platform_user IS 'Indicates if user has platform-level access (not tenant-specific)';
COMMENT ON COLUMN users.platform_access_level IS 'Platform access level: none, read, write, admin, super_admin';
COMMENT ON COLUMN users.permissions IS 'JSONB array of custom permissions granted to this user';
COMMENT ON TABLE role_permissions IS 'Default permissions for each role - used as baseline';
COMMENT ON FUNCTION user_has_permission IS 'Check if user has specific permission (checks both custom and role-based)';

-- Step 9: Create audit table for permission changes
CREATE TABLE IF NOT EXISTS permission_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('permission_added', 'permission_removed', 'role_changed')),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_changes_user ON permission_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_changes_date ON permission_changes(created_at);

COMMENT ON TABLE permission_changes IS 'Audit log for all permission and role changes';

-- Migration complete
SELECT 'Platform roles and permissions migration completed successfully!' as message;
