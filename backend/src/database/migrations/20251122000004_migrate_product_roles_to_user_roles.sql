-- ============================================================================
-- Migration: Migrate Product Roles to RBAC User Roles
-- Description: Migrates existing product_roles JSONB data to user_roles table
-- Author: RecruitIQ Team
-- Date: 2025-11-22
-- Version: 1.0
-- ============================================================================

-- This migration:
-- 1. Reads product_roles JSONB from hris.user_account
-- 2. Maps old role names to new RBAC roles
-- 3. Creates user_roles entries with product context
-- 4. Preserves audit trail

BEGIN;

-- ============================================================================
-- 1. CREATE TEMPORARY ROLE MAPPING TABLE
-- ============================================================================

CREATE TEMP TABLE role_mapping AS
SELECT 
  'admin' as old_role,
  'org_admin' as new_role,
  NULL::VARCHAR as product
UNION ALL
SELECT 'manager', 'manager', NULL
UNION ALL
SELECT 'user', 'user', NULL
UNION ALL
SELECT 'viewer', 'viewer', NULL
-- PayLinQ specific
UNION ALL
SELECT 'payroll_admin', 'payroll_admin', 'paylinq'
UNION ALL
SELECT 'payroll_manager', 'payroll_processor', 'paylinq'
UNION ALL
SELECT 'payroll_processor', 'payroll_processor', 'paylinq'
UNION ALL
SELECT 'payroll_viewer', 'payroll_viewer', 'paylinq'
-- Nexus specific
UNION ALL
SELECT 'hr_admin', 'hr_admin', 'nexus'
UNION ALL
SELECT 'hr_manager', 'hr_manager', 'nexus'
UNION ALL
SELECT 'hr_viewer', 'hr_viewer', 'nexus'
-- RecruitIQ specific
UNION ALL
SELECT 'recruitment_admin', 'recruitment_admin', 'recruitiq'
UNION ALL
SELECT 'recruiter', 'recruiter', 'recruitiq'
UNION ALL
SELECT 'hiring_manager', 'hiring_manager', 'recruitiq'
-- ScheduleHub specific
UNION ALL
SELECT 'schedule_admin', 'schedule_admin', 'schedulehub'
UNION ALL
SELECT 'scheduler', 'scheduler', 'schedulehub'
UNION ALL
SELECT 'shift_worker', 'shift_worker', 'schedulehub';

-- ============================================================================
-- 2. MIGRATE PRODUCT_ROLES TO USER_ROLES
-- ============================================================================

-- Insert user_roles from product_roles JSONB
INSERT INTO user_roles (user_id, role_id, product, assigned_at, assigned_by)
SELECT DISTINCT
  u.id as user_id,
  r.id as role_id,
  COALESCE(rm.product, pr.key) as product,
  u.created_at as assigned_at,
  u.created_by as assigned_by
FROM 
  hris.user_account u,
  LATERAL jsonb_each_text(u.product_roles) AS pr(key, value)
LEFT JOIN 
  role_mapping rm ON pr.value = rm.old_role 
    AND (rm.product IS NULL OR rm.product = pr.key)
INNER JOIN 
  roles r ON r.name = COALESCE(rm.new_role, pr.value)
    AND (r.product IS NULL OR r.product = pr.key)
    AND r.deleted_at IS NULL
WHERE 
  u.product_roles IS NOT NULL
  AND u.product_roles != '{}'::jsonb
  AND u.deleted_at IS NULL
ON CONFLICT (user_id, role_id, COALESCE(product, '')) DO NOTHING;

-- ============================================================================
-- 3. VERIFICATION QUERY
-- ============================================================================

-- Log migration summary
DO $$
DECLARE
  total_users INTEGER;
  migrated_users INTEGER;
  total_role_assignments INTEGER;
BEGIN
  -- Count total active users with product_roles
  SELECT COUNT(DISTINCT id) INTO total_users
  FROM hris.user_account
  WHERE product_roles IS NOT NULL 
    AND product_roles != '{}'::jsonb
    AND deleted_at IS NULL;
  
  -- Count users with new role assignments
  SELECT COUNT(DISTINCT user_id) INTO migrated_users
  FROM user_roles
  WHERE revoked_at IS NULL;
  
  -- Count total role assignments
  SELECT COUNT(*) INTO total_role_assignments
  FROM user_roles
  WHERE revoked_at IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RBAC Migration Summary';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users with product_roles: %', total_users;
  RAISE NOTICE 'Users migrated to user_roles: %', migrated_users;
  RAISE NOTICE 'Total role assignments created: %', total_role_assignments;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these manually after migration)
-- ============================================================================

-- 1. Check users with product_roles but no user_roles
-- SELECT 
--   u.id,
--   u.email,
--   u.product_roles,
--   COUNT(ur.role_id) as assigned_roles
-- FROM hris.user_account u
-- LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
-- WHERE u.product_roles IS NOT NULL 
--   AND u.product_roles != '{}'::jsonb
--   AND u.deleted_at IS NULL
-- GROUP BY u.id, u.email, u.product_roles
-- HAVING COUNT(ur.role_id) = 0;

-- 2. Compare product_roles vs user_roles for a specific user
-- SELECT 
--   u.email,
--   u.product_roles as old_roles,
--   json_agg(
--     json_build_object(
--       'role', r.name,
--       'product', ur.product,
--       'assigned_at', ur.assigned_at
--     )
--   ) as new_roles
-- FROM hris.user_account u
-- INNER JOIN user_roles ur ON u.id = ur.user_id AND ur.revoked_at IS NULL
-- INNER JOIN roles r ON ur.role_id = r.id
-- WHERE u.email = 'specific@email.com'
-- GROUP BY u.id, u.email, u.product_roles;

-- 3. Product-wise role distribution
-- SELECT 
--   ur.product,
--   r.name as role_name,
--   COUNT(*) as user_count
-- FROM user_roles ur
-- INNER JOIN roles r ON ur.role_id = r.id
-- WHERE ur.revoked_at IS NULL
-- GROUP BY ur.product, r.name
-- ORDER BY ur.product, user_count DESC;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration:
-- BEGIN;
-- DELETE FROM user_roles WHERE assigned_at >= '2025-11-22'::date;
-- COMMIT;
