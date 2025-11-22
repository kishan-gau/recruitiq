-- ============================================================================
-- Migration: Seed RBAC Permissions
-- Description: Seeds system permissions for all products (PayLinQ, Nexus, RecruitIQ, ScheduleHub, Global)
-- Author: RecruitIQ Team
-- Date: 2025-11-22
-- Version: 1.0
-- Based on: docs/rbac/01-DATABASE-DESIGN.md
-- ============================================================================

-- NOTE: No transaction wrapper - each INSERT handles errors independently

-- ============================================================================
-- GLOBAL PERMISSIONS
-- ============================================================================

-- User Management
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('user:view', 'user_management', 'View user accounts and profiles', 'global', 1),
('user:create', 'user_management', 'Create new user accounts', 'global', 2),
('user:edit', 'user_management', 'Modify user account details', 'global', 3),
('user:delete', 'user_management', 'Delete or deactivate user accounts', 'global', 4),
('user:reset_password', 'user_management', 'Reset passwords for user accounts', 'global', 5)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- RBAC Management
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('rbac:view', 'rbac', 'View roles and permission assignments', 'global', 10),
('rbac:manage', 'rbac', 'Create, edit, delete roles and assign permissions', 'global', 11),
('rbac:assign', 'rbac', 'Assign or revoke user roles', 'global', 12)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Organization Settings
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('org:settings:view', 'organization', 'View organization configuration', 'global', 20),
('org:settings:edit', 'organization', 'Modify organization settings', 'global', 21)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- PAYLINQ PERMISSIONS
-- ============================================================================

-- Payroll Runs
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:run:view', 'payroll_runs', 'View payroll run details', 'paylinq', 100),
('payroll:run:create', 'payroll_runs', 'Create new payroll runs', 'paylinq', 101),
('payroll:run:edit', 'payroll_runs', 'Modify payroll run details', 'paylinq', 102),
('payroll:run:approve', 'payroll_runs', 'Approve payroll runs for processing', 'paylinq', 103),
('payroll:run:process', 'payroll_runs', 'Execute payroll processing', 'paylinq', 104),
('payroll:run:delete', 'payroll_runs', 'Delete draft payroll runs', 'paylinq', 105)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Pay Components
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:component:view', 'components', 'View pay component definitions', 'paylinq', 110),
('payroll:component:manage', 'components', 'Create, edit, delete pay components', 'paylinq', 111)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Workers
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:worker:view', 'workers', 'View worker payroll information', 'paylinq', 120),
('payroll:worker:edit', 'workers', 'Modify worker payroll details', 'paylinq', 121)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Time Entries
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:time:view', 'time_entries', 'View time entry records', 'paylinq', 130),
('payroll:time:approve', 'time_entries', 'Approve or reject time entries', 'paylinq', 131)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Reports
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:reports:view', 'reports', 'Access payroll reports and analytics', 'paylinq', 140),
('payroll:reports:export', 'reports', 'Export payroll data and reports', 'paylinq', 141)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Settings
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('payroll:settings:view', 'settings', 'View payroll configuration', 'paylinq', 150),
('payroll:settings:manage', 'settings', 'Modify payroll system settings', 'paylinq', 151)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- NEXUS PERMISSIONS
-- ============================================================================

-- Employees
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('employee:view', 'employees', 'View employee profiles and details', 'nexus', 200),
('employee:create', 'employees', 'Add new employee records', 'nexus', 201),
('employee:edit', 'employees', 'Modify employee information', 'nexus', 202),
('employee:terminate', 'employees', 'Terminate employee contracts', 'nexus', 203),
('employee:delete', 'employees', 'Delete employee records', 'nexus', 204)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Attendance
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('attendance:view', 'attendance', 'View attendance records', 'nexus', 210),
('attendance:record', 'attendance', 'Clock in/out and record attendance', 'nexus', 211),
('attendance:approve', 'attendance', 'Approve attendance corrections', 'nexus', 212)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Time Off
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('timeoff:view', 'time_off', 'View time off request records', 'nexus', 220),
('timeoff:request', 'time_off', 'Submit time off requests', 'nexus', 221),
('timeoff:approve', 'time_off', 'Approve or reject time off requests', 'nexus', 222)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Benefits
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('benefits:view', 'benefits', 'View benefit plans and enrollments', 'nexus', 230),
('benefits:enroll', 'benefits', 'Enroll employees in benefit plans', 'nexus', 231),
('benefits:manage', 'benefits', 'Create and manage benefit plans', 'nexus', 232)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Documents
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('documents:view', 'documents', 'View employee documents', 'nexus', 240),
('documents:upload', 'documents', 'Upload employee documents', 'nexus', 241),
('documents:delete', 'documents', 'Delete employee documents', 'nexus', 242)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Departments & Locations
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('dept:view', 'organization', 'View department information', 'nexus', 250),
('dept:manage', 'organization', 'Create, edit, delete departments', 'nexus', 251),
('location:view', 'organization', 'View office locations', 'nexus', 252),
('location:manage', 'organization', 'Create, edit, delete locations', 'nexus', 253)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Performance
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('performance:view', 'performance', 'View performance review data', 'nexus', 260),
('performance:manage', 'performance', 'Create and conduct performance reviews', 'nexus', 261)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Reports
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('hris:reports:view', 'reports', 'Access HR reports and analytics', 'nexus', 270),
('hris:reports:export', 'reports', 'Export HR data and reports', 'nexus', 271)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- RECRUITIQ PERMISSIONS
-- ============================================================================

-- Jobs
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('job:view', 'jobs', 'View job postings', 'recruitiq', 300),
('job:create', 'jobs', 'Create new job postings', 'recruitiq', 301),
('job:edit', 'jobs', 'Modify job posting details', 'recruitiq', 302),
('job:publish', 'jobs', 'Publish jobs to public', 'recruitiq', 303),
('job:close', 'jobs', 'Close job postings', 'recruitiq', 304),
('job:delete', 'jobs', 'Delete job postings', 'recruitiq', 305)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Candidates
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('candidate:view', 'candidates', 'View candidate profiles', 'recruitiq', 310),
('candidate:edit', 'candidates', 'Modify candidate information', 'recruitiq', 311),
('candidate:delete', 'candidates', 'Delete candidate records', 'recruitiq', 312)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Applications
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('application:view', 'applications', 'View job applications', 'recruitiq', 320),
('application:review', 'applications', 'Review and update application status', 'recruitiq', 321),
('application:reject', 'applications', 'Reject applications', 'recruitiq', 322)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Interviews
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('interview:view', 'interviews', 'View interview schedules', 'recruitiq', 330),
('interview:schedule', 'interviews', 'Schedule candidate interviews', 'recruitiq', 331),
('interview:conduct', 'interviews', 'Conduct and provide interview feedback', 'recruitiq', 332)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Reports
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('ats:reports:view', 'reports', 'Access recruitment reports', 'recruitiq', 340),
('ats:reports:export', 'reports', 'Export recruitment data', 'recruitiq', 341)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- SCHEDULEHUB PERMISSIONS
-- ============================================================================

-- Schedules
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('schedule:view', 'schedules', 'View shift schedules', 'schedulehub', 400),
('schedule:create', 'schedules', 'Create new shift schedules', 'schedulehub', 401),
('schedule:edit', 'schedules', 'Modify shift assignments', 'schedulehub', 402),
('schedule:publish', 'schedules', 'Publish schedules to employees', 'schedulehub', 403)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Stations
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('station:view', 'stations', 'View station information', 'schedulehub', 410),
('station:manage', 'stations', 'Create, edit, delete stations', 'schedulehub', 411)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Shifts
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('shift:view', 'shifts', 'View shift information', 'schedulehub', 420),
('shift:swap', 'shifts', 'Request or approve shift swaps', 'schedulehub', 421)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

-- Reports
INSERT INTO permissions (name, category, description, product, display_order) VALUES
('scheduling:reports:view', 'reports', 'Access scheduling reports', 'schedulehub', 430)
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    product = EXCLUDED.product,
    display_order = EXCLUDED.display_order;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify permissions were seeded correctly:
-- SELECT product, category, COUNT(*) as permission_count
-- FROM permissions
-- WHERE is_active = true
-- GROUP BY product, category
-- ORDER BY product, category;
