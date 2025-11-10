-- ============================================================================
-- Seed Permissions and Roles
-- Run this after creating the database schema
-- ============================================================================

-- ============================================================================
-- 1. SEED PERMISSIONS
-- ============================================================================

-- License Management Permissions
INSERT INTO permissions (name, category, description) VALUES
('license.view', 'license', 'View licenses and customers'),
('license.create', 'license', 'Create new licenses and customers'),
('license.edit', 'license', 'Edit existing licenses and customers'),
('license.delete', 'license', 'Delete licenses and customers'),
('license.renew', 'license', 'Renew licenses'),
('license.suspend', 'license', 'Suspend licenses'),
('license.download', 'license', 'Download license files'),
('license.tiers.manage', 'license', 'Manage tier presets and migrations'),
('license.analytics', 'license', 'View license analytics and reports')
ON CONFLICT (name) DO NOTHING;

-- Portal/Platform Management Permissions
INSERT INTO permissions (name, category, description) VALUES
('portal.view', 'portal', 'Access admin portal dashboard'),
('portal.users.manage', 'portal', 'Manage portal admin users'),
('portal.settings', 'portal', 'Manage platform settings')
ON CONFLICT (name) DO NOTHING;

-- Security Permissions
INSERT INTO permissions (name, category, description) VALUES
('security.view', 'security', 'View security logs and alerts'),
('security.manage', 'security', 'Manage security settings and respond to alerts'),
('security.audit', 'security', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- VPS/Infrastructure Permissions
INSERT INTO permissions (name, category, description) VALUES
('vps.view', 'vps', 'View VPS instances'),
('vps.provision', 'vps', 'Provision new VPS instances'),
('vps.manage', 'vps', 'Manage VPS instances (start, stop, restart)'),
('vps.delete', 'vps', 'Delete VPS instances'),
('vps.ssh', 'vps', 'SSH access to VPS instances')
ON CONFLICT (name) DO NOTHING;

-- Deployment Permissions
INSERT INTO permissions (name, category, description) VALUES
('deployment.view', 'deployment', 'View deployment status'),
('deployment.create', 'deployment', 'Create new deployments'),
('deployment.manage', 'deployment', 'Manage deployments (cancel, retry)'),
('deployment.logs', 'deployment', 'View deployment logs')
ON CONFLICT (name) DO NOTHING;

-- Tenant/Organization Management Permissions
INSERT INTO permissions (name, category, description) VALUES
('tenant.view', 'tenant', 'View tenant organizations'),
('tenant.create', 'tenant', 'Create new tenant organizations'),
('tenant.edit', 'tenant', 'Edit tenant organizations'),
('tenant.delete', 'tenant', 'Delete tenant organizations'),
('tenant.users.manage', 'tenant', 'Manage users in tenant organizations')
ON CONFLICT (name) DO NOTHING;

-- RecruitIQ Application Permissions (Tenant-level)
INSERT INTO permissions (name, category, description) VALUES
('jobs.view', 'recruitiq', 'View jobs'),
('jobs.create', 'recruitiq', 'Create jobs'),
('jobs.edit', 'recruitiq', 'Edit jobs'),
('jobs.delete', 'recruitiq', 'Delete jobs'),
('candidates.view', 'recruitiq', 'View candidates'),
('candidates.create', 'recruitiq', 'Create candidates'),
('candidates.edit', 'recruitiq', 'Edit candidates'),
('candidates.delete', 'recruitiq', 'Delete candidates'),
('applications.view', 'recruitiq', 'View applications'),
('applications.manage', 'recruitiq', 'Manage applications'),
('interviews.schedule', 'recruitiq', 'Schedule interviews'),
('interviews.conduct', 'recruitiq', 'Conduct interviews and add feedback'),
('workspace.manage', 'recruitiq', 'Manage workspaces'),
('reports.view', 'recruitiq', 'View reports and analytics')
ON CONFLICT (name) DO NOTHING;

-- Paylinq Application Permissions (Tenant-level)
INSERT INTO permissions (name, category, description) VALUES
-- Employee & Compensation
('payroll.employees.view', 'paylinq', 'View employee payroll records'),
('payroll.employees.create', 'paylinq', 'Create employee payroll records'),
('payroll.employees.edit', 'paylinq', 'Edit employee payroll records'),
('payroll.employees.delete', 'paylinq', 'Delete employee payroll records'),
('payroll.compensation.manage', 'paylinq', 'Manage employee compensation'),
-- Timesheets & Attendance
('payroll.timesheets.view', 'paylinq', 'View timesheets'),
('payroll.timesheets.submit', 'paylinq', 'Submit timesheets'),
('payroll.timesheets.approve', 'paylinq', 'Approve timesheets'),
('payroll.timesheets.edit', 'paylinq', 'Edit timesheets'),
('payroll.attendance.view', 'paylinq', 'View time attendance records'),
('payroll.attendance.manage', 'paylinq', 'Manage time attendance'),
-- Payroll Processing
('payroll.runs.view', 'paylinq', 'View payroll runs'),
('payroll.runs.create', 'paylinq', 'Create payroll runs'),
('payroll.runs.process', 'paylinq', 'Process payroll runs'),
('payroll.runs.approve', 'paylinq', 'Approve payroll runs'),
('payroll.runs.delete', 'paylinq', 'Delete payroll runs'),
-- Paychecks & Payments
('payroll.paychecks.view', 'paylinq', 'View paychecks'),
('payroll.paychecks.generate', 'paylinq', 'Generate paychecks'),
('payroll.paychecks.void', 'paylinq', 'Void paychecks'),
('payroll.payments.view', 'paylinq', 'View payment records'),
('payroll.payments.process', 'paylinq', 'Process payments'),
-- Tax Management
('payroll.taxes.view', 'paylinq', 'View tax information'),
('payroll.taxes.manage', 'paylinq', 'Manage tax rates and rules'),
('payroll.taxes.file', 'paylinq', 'File tax reports'),
-- Deductions & Benefits
('payroll.deductions.view', 'paylinq', 'View deductions'),
('payroll.deductions.manage', 'paylinq', 'Manage deductions'),
-- Reporting & Analytics
('payroll.reports.view', 'paylinq', 'View payroll reports'),
('payroll.reports.export', 'paylinq', 'Export payroll reports'),
('payroll.analytics.view', 'paylinq', 'View payroll analytics'),
-- Configuration
('payroll.config.view', 'paylinq', 'View payroll configuration'),
('payroll.config.manage', 'paylinq', 'Manage payroll configuration'),
('payroll.workers.manage', 'paylinq', 'Manage worker types and shifts'),
('payroll.components.manage', 'paylinq', 'Manage pay components')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. SEED ROLES
-- ============================================================================

-- Platform Roles (for admin portal and license manager)
INSERT INTO roles (name, display_name, description, role_type, level) VALUES
('super_admin', 'Super Administrator', 'Full access to all platform features', 'platform', 100),
('platform_admin', 'Platform Administrator', 'Manage platform, licenses, and deployments', 'platform', 90),
('license_admin', 'License Administrator', 'Manage licenses and customers only', 'platform', 70),
('security_admin', 'Security Administrator', 'Manage security and monitoring', 'platform', 80),
('deployment_admin', 'Deployment Administrator', 'Manage VPS and deployments', 'platform', 75),
('support_staff', 'Support Staff', 'View-only access for customer support', 'platform', 50)
ON CONFLICT (name) DO NOTHING;

-- Tenant Roles (for RecruitIQ instances)
INSERT INTO roles (name, display_name, description, role_type, level) VALUES
('owner', 'Owner', 'Full access to organization', 'tenant', 100),
('admin', 'Administrator', 'Manage organization settings and users', 'tenant', 90),
('recruiter', 'Recruiter', 'Manage jobs, candidates, and applications', 'tenant', 70),
('interviewer', 'Interviewer', 'Conduct interviews and provide feedback', 'tenant', 60),
('member', 'Member', 'View-only access', 'tenant', 50),
('applicant', 'Applicant', 'Track application status', 'tenant', 10)
ON CONFLICT (name) DO NOTHING;

-- Paylinq Roles (for Paylinq payroll instances)
INSERT INTO roles (name, display_name, description, role_type, level) VALUES
('payroll_admin', 'Payroll Administrator', 'Full access to payroll system', 'tenant', 95),
('payroll_manager', 'Payroll Manager', 'Process payroll and manage employees', 'tenant', 85),
('payroll_processor', 'Payroll Processor', 'Process payroll runs and generate paychecks', 'tenant', 75),
('payroll_clerk', 'Payroll Clerk', 'Enter timesheets and view payroll data', 'tenant', 65),
('payroll_approver', 'Payroll Approver', 'Approve timesheets and payroll runs', 'tenant', 80),
('employee_self_service', 'Employee', 'View own paychecks and submit timesheets', 'tenant', 30)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. MAP PERMISSIONS TO ROLES
-- ============================================================================

-- Super Admin - All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Platform Admin - All platform permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'platform_admin'
AND p.category IN ('license', 'portal', 'vps', 'deployment', 'tenant')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- License Admin - License management only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'license_admin'
AND (p.category = 'license' OR p.name = 'portal.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Security Admin - Security and audit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'security_admin'
AND (p.category = 'security' OR p.name IN ('portal.view', 'tenant.view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Deployment Admin - VPS and deployment management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'deployment_admin'
AND (p.category IN ('vps', 'deployment') OR p.name IN ('portal.view', 'tenant.view'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support Staff - View-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'support_staff'
AND p.name IN ('portal.view', 'license.view', 'license.analytics', 'tenant.view', 'deployment.view', 'security.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Tenant Roles Permissions

-- Owner - All tenant permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'owner'
AND p.category = 'recruitiq'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin - All except some sensitive operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.category = 'recruitiq'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Recruiter - Job and candidate management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'recruiter'
AND p.name IN (
  'jobs.view', 'jobs.create', 'jobs.edit',
  'candidates.view', 'candidates.create', 'candidates.edit',
  'applications.view', 'applications.manage',
  'interviews.schedule', 'interviews.conduct',
  'reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Interviewer - Interview management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'interviewer'
AND p.name IN (
  'jobs.view',
  'candidates.view',
  'applications.view',
  'interviews.conduct'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member - View-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'member'
AND p.name IN (
  'jobs.view',
  'candidates.view',
  'applications.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Applicant - Track own application
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'applicant'
AND p.name IN ('applications.view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Paylinq Roles Permissions

-- Payroll Admin - Full access to all payroll features
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'payroll_admin'
AND p.category = 'paylinq'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Payroll Manager - Most features except sensitive config
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'payroll_manager'
AND p.name IN (
  'payroll.employees.view', 'payroll.employees.edit',
  'payroll.compensation.manage',
  'payroll.timesheets.view', 'payroll.timesheets.approve', 'payroll.timesheets.edit',
  'payroll.attendance.view', 'payroll.attendance.manage',
  'payroll.runs.view', 'payroll.runs.create', 'payroll.runs.process', 'payroll.runs.approve',
  'payroll.paychecks.view', 'payroll.paychecks.generate',
  'payroll.payments.view', 'payroll.payments.process',
  'payroll.taxes.view', 'payroll.taxes.manage',
  'payroll.deductions.view', 'payroll.deductions.manage',
  'payroll.reports.view', 'payroll.reports.export',
  'payroll.analytics.view',
  'payroll.config.view', 'payroll.workers.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Payroll Processor - Process payroll and generate paychecks
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'payroll_processor'
AND p.name IN (
  'payroll.employees.view',
  'payroll.timesheets.view', 'payroll.timesheets.edit',
  'payroll.attendance.view',
  'payroll.runs.view', 'payroll.runs.create', 'payroll.runs.process',
  'payroll.paychecks.view', 'payroll.paychecks.generate',
  'payroll.payments.view',
  'payroll.taxes.view',
  'payroll.deductions.view',
  'payroll.reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Payroll Approver - Approve timesheets and payroll
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'payroll_approver'
AND p.name IN (
  'payroll.employees.view',
  'payroll.timesheets.view', 'payroll.timesheets.approve',
  'payroll.attendance.view',
  'payroll.runs.view', 'payroll.runs.approve',
  'payroll.paychecks.view',
  'payroll.payments.view',
  'payroll.reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Payroll Clerk - Data entry and viewing
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'payroll_clerk'
AND p.name IN (
  'payroll.employees.view',
  'payroll.timesheets.view', 'payroll.timesheets.submit',
  'payroll.attendance.view',
  'payroll.runs.view',
  'payroll.paychecks.view',
  'payroll.reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Employee Self Service - View own data and submit timesheets
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'employee_self_service'
AND p.name IN (
  'payroll.timesheets.view', 'payroll.timesheets.submit',
  'payroll.paychecks.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 4. CREATE DEFAULT PLATFORM ADMIN USER
-- ============================================================================

-- Insert default super admin (password: Admin123!)
-- Password hash for 'Admin123!' (bcrypt, 10 rounds)
INSERT INTO platform_users (
  email, 
  password_hash, 
  name, 
  role,
  email_verified,
  created_at
)
VALUES (
  'admin@recruitiq.com',
  '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
  'System Administrator',
  'super_admin',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Insert license admin user (password: Admin123!)
INSERT INTO platform_users (
  email, 
  password_hash, 
  name, 
  role,
  email_verified,
  created_at
)
VALUES (
  'license@recruitiq.com',
  '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
  'License Administrator',
  'admin',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Insert security admin user (password: Admin123!)
INSERT INTO platform_users (
  email, 
  password_hash, 
  name, 
  role,
  email_verified,
  created_at
)
VALUES (
  'security@recruitiq.com',
  '$2a$10$bJj0F63g2bnq9tL52p65e.ynUaBcXg340tgzV4m5.ImdFkOupxvuO', -- Admin123!
  'Security Administrator',
  'admin',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name VARCHAR, permission_category VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.category
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
  WHERE u.id = user_uuid AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name_param VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id OR p.id = ANY(u.additional_permissions)
    WHERE u.id = user_uuid 
    AND p.name = permission_name_param 
    AND u.deleted_at IS NULL
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function to get role permissions
CREATE OR REPLACE FUNCTION get_role_permissions(role_name_param VARCHAR)
RETURNS TABLE(permission_name VARCHAR, permission_category VARCHAR, permission_description TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name, p.category, p.description
  FROM roles r
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE r.name = role_name_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '[OK] Permissions and roles seeded successfully!';
  RAISE NOTICE '[INFO] Default users created:';
  RAISE NOTICE '   - admin@recruitiq.com (Super Admin)';
  RAISE NOTICE '   - license@recruitiq.com (License Admin)';
  RAISE NOTICE '   - security@recruitiq.com (Security Admin)';
  RAISE NOTICE '   Password for all: Admin123!';
  RAISE NOTICE '[WARNING] Remember to change these passwords in production!';
END $$;
