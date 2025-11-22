-- ============================================================================
-- Migration: Seed System Roles and Role-Permission Mappings
-- Description: Creates default system roles and assigns appropriate permissions
-- Author: RecruitIQ Team
-- Date: 2025-11-22
-- Version: 1.0
-- Based on: docs/rbac/RBAC_IMPLEMENTATION_ROADMAP.md
-- ============================================================================

-- NOTE: No transaction wrapper - each INSERT handles errors independently

-- ============================================================================
-- 1. SEED SYSTEM ROLES
-- ============================================================================

-- Global System Roles (organization_id = NULL, apply to all orgs)
INSERT INTO roles (name, display_name, description, organization_id, product, is_system, is_active, level, role_type) VALUES
('super_admin', 'Super Administrator', 'Full system access across all organizations and products', NULL, NULL, true, true, 100, 'platform'),
('org_owner', 'Organization Owner', 'Full access within organization across all products', NULL, NULL, true, true, 90, 'tenant'),
('org_admin', 'Organization Administrator', 'Administrative access within organization', NULL, NULL, true, true, 80, 'tenant'),
('manager', 'Manager', 'Team management and operational access', NULL, NULL, true, true, 50, 'tenant'),
('user', 'Standard User', 'Basic user access', NULL, NULL, true, true, 30, 'tenant'),
('viewer', 'Viewer', 'Read-only access', NULL, NULL, true, true, 10, 'tenant')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active,
    level = EXCLUDED.level,
    role_type = EXCLUDED.role_type;

-- Product-Specific Roles (can be customized per organization)
INSERT INTO roles (name, display_name, description, organization_id, product, is_system, is_active, level, role_type) VALUES
-- PayLinQ Roles
('payroll_admin', 'Payroll Administrator', 'Full payroll management access', NULL, 'paylinq', true, true, 70, 'tenant'),
('payroll_processor', 'Payroll Processor', 'Process and manage payroll runs', NULL, 'paylinq', true, true, 60, 'tenant'),
('payroll_viewer', 'Payroll Viewer', 'View-only access to payroll data', NULL, 'paylinq', true, true, 20, 'tenant'),

-- Nexus Roles
('hr_admin', 'HR Administrator', 'Full HR management access', NULL, 'nexus', true, true, 70, 'tenant'),
('hr_manager', 'HR Manager', 'Manage employees and HR operations', NULL, 'nexus', true, true, 60, 'tenant'),
('hr_viewer', 'HR Viewer', 'View-only access to HR data', NULL, 'nexus', true, true, 20, 'tenant'),

-- RecruitIQ Roles
('recruitment_admin', 'Recruitment Administrator', 'Full recruitment management access', NULL, 'recruitiq', true, true, 70, 'tenant'),
('recruiter', 'Recruiter', 'Manage jobs, candidates, and interviews', NULL, 'recruitiq', true, true, 60, 'tenant'),
('hiring_manager', 'Hiring Manager', 'Review applications and conduct interviews', NULL, 'recruitiq', true, true, 50, 'tenant'),

-- ScheduleHub Roles
('schedule_admin', 'Schedule Administrator', 'Full scheduling management access', NULL, 'schedulehub', true, true, 70, 'tenant'),
('scheduler', 'Scheduler', 'Create and manage schedules', NULL, 'schedulehub', true, true, 60, 'tenant'),
('shift_worker', 'Shift Worker', 'View and swap own shifts', NULL, 'schedulehub', true, true, 30, 'tenant')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    is_system = EXCLUDED.is_system,
    is_active = EXCLUDED.is_active,
    level = EXCLUDED.level,
    role_type = EXCLUDED.role_type;

-- ============================================================================
-- 2. ASSIGN PERMISSIONS TO SUPER_ADMIN (ALL PERMISSIONS)
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'super_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 3. ASSIGN PERMISSIONS TO ORG_OWNER (ALL NON-PLATFORM PERMISSIONS)
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'org_owner'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND (p.product IS NULL OR p.product != 'platform')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 4. ASSIGN PERMISSIONS TO ORG_ADMIN
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'org_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        -- Global permissions (excluding RBAC manage)
        'user:view', 'user:create', 'user:edit', 'user:reset_password',
        'rbac:view', 'rbac:assign',
        'org:settings:view', 'org:settings:edit',
        
        -- PayLinQ (all except delete)
        'payroll:run:view', 'payroll:run:create', 'payroll:run:edit', 'payroll:run:approve', 'payroll:run:process',
        'payroll:component:view', 'payroll:component:manage',
        'payroll:worker:view', 'payroll:worker:edit',
        'payroll:time:view', 'payroll:time:approve',
        'payroll:reports:view', 'payroll:reports:export',
        'payroll:settings:view', 'payroll:settings:manage',
        
        -- Nexus (all except delete)
        'employee:view', 'employee:create', 'employee:edit', 'employee:terminate',
        'attendance:view', 'attendance:record', 'attendance:approve',
        'timeoff:view', 'timeoff:request', 'timeoff:approve',
        'benefits:view', 'benefits:enroll', 'benefits:manage',
        'documents:view', 'documents:upload',
        'dept:view', 'dept:manage', 'location:view', 'location:manage',
        'performance:view', 'performance:manage',
        'hris:reports:view', 'hris:reports:export',
        
        -- RecruitIQ (all except delete)
        'job:view', 'job:create', 'job:edit', 'job:publish', 'job:close',
        'candidate:view', 'candidate:edit',
        'application:view', 'application:review', 'application:reject',
        'interview:view', 'interview:schedule', 'interview:conduct',
        'ats:reports:view', 'ats:reports:export',
        
        -- ScheduleHub (all)
        'schedule:view', 'schedule:create', 'schedule:edit', 'schedule:publish',
        'station:view', 'station:manage',
        'shift:view', 'shift:swap',
        'scheduling:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 5. ASSIGN PERMISSIONS TO MANAGER
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'manager'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        -- Global permissions (view only)
        'user:view',
        'rbac:view',
        'org:settings:view',
        
        -- PayLinQ (view, create, edit, approve)
        'payroll:run:view', 'payroll:run:create', 'payroll:run:edit', 'payroll:run:approve',
        'payroll:component:view',
        'payroll:worker:view', 'payroll:worker:edit',
        'payroll:time:view', 'payroll:time:approve',
        'payroll:reports:view',
        'payroll:settings:view',
        
        -- Nexus (view, create, edit, approve)
        'employee:view', 'employee:create', 'employee:edit',
        'attendance:view', 'attendance:record', 'attendance:approve',
        'timeoff:view', 'timeoff:request', 'timeoff:approve',
        'benefits:view', 'benefits:enroll',
        'documents:view', 'documents:upload',
        'dept:view', 'location:view',
        'performance:view', 'performance:manage',
        'hris:reports:view',
        
        -- RecruitIQ (view, create, edit, review)
        'job:view', 'job:create', 'job:edit', 'job:publish',
        'candidate:view', 'candidate:edit',
        'application:view', 'application:review',
        'interview:view', 'interview:schedule', 'interview:conduct',
        'ats:reports:view',
        
        -- ScheduleHub (view, create, edit)
        'schedule:view', 'schedule:create', 'schedule:edit',
        'station:view',
        'shift:view', 'shift:swap',
        'scheduling:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 6. ASSIGN PERMISSIONS TO USER
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'user'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        -- Global permissions (view only)
        'user:view',
        'org:settings:view',
        
        -- PayLinQ (view and self-service)
        'payroll:run:view',
        'payroll:component:view',
        'payroll:worker:view',
        'payroll:time:view',
        'payroll:reports:view',
        
        -- Nexus (view and self-service)
        'employee:view',
        'attendance:view', 'attendance:record',
        'timeoff:view', 'timeoff:request',
        'benefits:view',
        'documents:view', 'documents:upload',
        'dept:view', 'location:view',
        
        -- RecruitIQ (view only)
        'job:view',
        'candidate:view',
        'application:view',
        'interview:view',
        
        -- ScheduleHub (view and self-service)
        'schedule:view',
        'station:view',
        'shift:view', 'shift:swap'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 7. ASSIGN PERMISSIONS TO VIEWER
-- ============================================================================

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'viewer'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name LIKE '%:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 8. PRODUCT-SPECIFIC ROLE PERMISSIONS
-- ============================================================================

-- PAYROLL_ADMIN (all payroll permissions)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'payroll_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND (p.product = 'paylinq' OR p.name IN ('user:view', 'org:settings:view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PAYROLL_PROCESSOR
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'payroll_processor'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'payroll:run:view', 'payroll:run:create', 'payroll:run:edit', 'payroll:run:process',
        'payroll:component:view',
        'payroll:worker:view', 'payroll:worker:edit',
        'payroll:time:view', 'payroll:time:approve',
        'payroll:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PAYROLL_VIEWER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'payroll_viewer'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.product = 'paylinq'
    AND p.name LIKE '%:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR_ADMIN (all nexus permissions)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'hr_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND (p.product = 'nexus' OR p.name IN ('user:view', 'user:create', 'org:settings:view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR_MANAGER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'hr_manager'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'employee:view', 'employee:create', 'employee:edit',
        'attendance:view', 'attendance:approve',
        'timeoff:view', 'timeoff:approve',
        'benefits:view', 'benefits:enroll',
        'documents:view', 'documents:upload',
        'dept:view', 'location:view',
        'performance:view', 'performance:manage',
        'hris:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR_VIEWER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'hr_viewer'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.product = 'nexus'
    AND p.name LIKE '%:view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- RECRUITMENT_ADMIN (all recruitiq permissions)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'recruitment_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND (p.product = 'recruitiq' OR p.name IN ('user:view', 'org:settings:view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- RECRUITER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'recruiter'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'job:view', 'job:create', 'job:edit', 'job:publish', 'job:close',
        'candidate:view', 'candidate:edit',
        'application:view', 'application:review',
        'interview:view', 'interview:schedule', 'interview:conduct',
        'ats:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HIRING_MANAGER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'hiring_manager'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'job:view',
        'candidate:view',
        'application:view', 'application:review',
        'interview:view', 'interview:conduct',
        'ats:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SCHEDULE_ADMIN (all schedulehub permissions)
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'schedule_admin'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND (p.product = 'schedulehub' OR p.name IN ('user:view', 'org:settings:view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SCHEDULER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'scheduler'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'schedule:view', 'schedule:create', 'schedule:edit', 'schedule:publish',
        'station:view', 'station:manage',
        'shift:view',
        'scheduling:reports:view'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SHIFT_WORKER
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 
    (SELECT id FROM roles WHERE name = 'shift_worker'),
    p.id,
    NOW()
FROM permissions p
WHERE p.is_active = true
    AND p.name IN (
        'schedule:view',
        'station:view',
        'shift:view', 'shift:swap'
    )
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify roles and permissions were seeded correctly:

-- 1. List all roles
-- SELECT name, display_name, product, is_system, level
-- FROM roles
-- WHERE deleted_at IS NULL
-- ORDER BY level DESC, product, name;

-- 2. Count permissions per role
-- SELECT r.name, r.display_name, COUNT(rp.permission_id) as permission_count
-- FROM roles r
-- LEFT JOIN role_permissions rp ON r.id = rp.role_id
-- WHERE r.deleted_at IS NULL
-- GROUP BY r.id, r.name, r.display_name
-- ORDER BY r.level DESC;

-- 3. View permissions for a specific role (e.g., 'org_admin')
-- SELECT p.name, p.category, p.product, p.description
-- FROM permissions p
-- INNER JOIN role_permissions rp ON p.id = rp.permission_id
-- INNER JOIN roles r ON rp.role_id = r.id
-- WHERE r.name = 'org_admin' AND p.is_active = true
-- ORDER BY p.product, p.category, p.name;
