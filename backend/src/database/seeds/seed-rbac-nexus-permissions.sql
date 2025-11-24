-- ============================================================================
-- Seed Nexus (HRIS) Product Permissions
-- ============================================================================
-- Description: Seeds permissions for Nexus HRIS product
-- Run this AFTER platform RBAC migration
-- ============================================================================

-- ============================================================================
-- NEXUS PRODUCT PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
-- Employee Management
('nexus', 'employees:create', 'Create Employees', 'Create new employee records', 'employees'),
('nexus', 'employees:read', 'View Employees', 'View employee information', 'employees'),
('nexus', 'employees:update', 'Update Employees', 'Update employee information', 'employees'),
('nexus', 'employees:delete', 'Delete Employees', 'Delete employee records', 'employees'),
('nexus', 'employees:terminate', 'Terminate Employees', 'Terminate employee contracts', 'employees'),
('nexus', 'employees:export', 'Export Employees', 'Export employee data', 'employees'),
('nexus', 'employees:import', 'Import Employees', 'Import employee data', 'employees'),

-- Location Management
('nexus', 'locations:create', 'Create Locations', 'Create new work locations', 'locations'),
('nexus', 'locations:read', 'View Locations', 'View location information', 'locations'),
('nexus', 'locations:update', 'Update Locations', 'Update location information', 'locations'),
('nexus', 'locations:delete', 'Delete Locations', 'Delete location records', 'locations'),
('nexus', 'locations:manage', 'Manage Locations', 'Full location management', 'locations'),

-- Department Management
('nexus', 'departments:create', 'Create Departments', 'Create new departments', 'departments'),
('nexus', 'departments:read', 'View Departments', 'View department information', 'departments'),
('nexus', 'departments:update', 'Update Departments', 'Update department information', 'departments'),
('nexus', 'departments:delete', 'Delete Departments', 'Delete department records', 'departments'),
('nexus', 'departments:manage', 'Manage Departments', 'Full department management', 'departments'),

-- Contract Management
('nexus', 'contracts:create', 'Create Contracts', 'Create employment contracts', 'contracts'),
('nexus', 'contracts:read', 'View Contracts', 'View contract information', 'contracts'),
('nexus', 'contracts:update', 'Update Contracts', 'Update contract information', 'contracts'),
('nexus', 'contracts:delete', 'Delete Contracts', 'Delete contract records', 'contracts'),
('nexus', 'contracts:approve', 'Approve Contracts', 'Approve contract changes', 'contracts'),
('nexus', 'contracts:sign', 'Sign Contracts', 'Sign contracts electronically', 'contracts'),

-- Time-Off Management
('nexus', 'timeoff:create', 'Create Time-Off Requests', 'Create time-off requests', 'timeoff'),
('nexus', 'timeoff:read', 'View Time-Off Requests', 'View time-off information', 'timeoff'),
('nexus', 'timeoff:update', 'Update Time-Off Requests', 'Update time-off requests', 'timeoff'),
('nexus', 'timeoff:delete', 'Delete Time-Off Requests', 'Delete time-off requests', 'timeoff'),
('nexus', 'timeoff:approve', 'Approve Time-Off', 'Approve/reject time-off requests', 'timeoff'),
('nexus', 'timeoff:manage', 'Manage Time-Off', 'Full time-off management', 'timeoff'),

-- Attendance Management
('nexus', 'attendance:create', 'Create Attendance Records', 'Create attendance records', 'attendance'),
('nexus', 'attendance:read', 'View Attendance', 'View attendance records', 'attendance'),
('nexus', 'attendance:update', 'Update Attendance', 'Update attendance records', 'attendance'),
('nexus', 'attendance:delete', 'Delete Attendance', 'Delete attendance records', 'attendance'),
('nexus', 'attendance:approve', 'Approve Attendance', 'Approve attendance records', 'attendance'),

-- Benefits Management
('nexus', 'benefits:create', 'Create Benefits', 'Create benefit plans', 'benefits'),
('nexus', 'benefits:read', 'View Benefits', 'View benefit information', 'benefits'),
('nexus', 'benefits:update', 'Update Benefits', 'Update benefit plans', 'benefits'),
('nexus', 'benefits:delete', 'Delete Benefits', 'Delete benefit plans', 'benefits'),
('nexus', 'benefits:enroll', 'Enroll in Benefits', 'Enroll employees in benefits', 'benefits'),
('nexus', 'benefits:manage', 'Manage Benefits', 'Full benefits administration', 'benefits'),

-- Performance Management
('nexus', 'performance:create', 'Create Performance Reviews', 'Create performance reviews', 'performance'),
('nexus', 'performance:read', 'View Performance Reviews', 'View performance information', 'performance'),
('nexus', 'performance:update', 'Update Performance Reviews', 'Update performance reviews', 'performance'),
('nexus', 'performance:delete', 'Delete Performance Reviews', 'Delete performance reviews', 'performance'),
('nexus', 'performance:approve', 'Approve Performance Reviews', 'Approve performance reviews', 'performance'),
('nexus', 'performance:goals', 'Manage Goals', 'Manage employee goals', 'performance'),

-- Document Management
('nexus', 'documents:create', 'Upload Documents', 'Upload employee documents', 'documents'),
('nexus', 'documents:read', 'View Documents', 'View employee documents', 'documents'),
('nexus', 'documents:update', 'Update Documents', 'Update document information', 'documents'),
('nexus', 'documents:delete', 'Delete Documents', 'Delete documents', 'documents'),
('nexus', 'documents:download', 'Download Documents', 'Download employee documents', 'documents'),
('nexus', 'documents:sign', 'Request Signatures', 'Request document signatures', 'documents'),

-- Reports & Analytics
('nexus', 'reports:view', 'View Reports', 'View HRIS reports', 'reports'),
('nexus', 'reports:export', 'Export Reports', 'Export report data', 'reports'),
('nexus', 'reports:headcount', 'View Headcount Reports', 'View headcount analytics', 'reports'),
('nexus', 'reports:turnover', 'View Turnover Reports', 'View turnover analytics', 'reports'),
('nexus', 'reports:attendance', 'View Attendance Reports', 'View attendance analytics', 'reports'),

-- Settings & Configuration
('nexus', 'settings:view', 'View Settings', 'View Nexus settings', 'settings'),
('nexus', 'settings:update', 'Update Settings', 'Update Nexus configuration', 'settings'),
('nexus', 'settings:manage', 'Manage Settings', 'Full settings management', 'settings')

ON CONFLICT (product, name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] Nexus HRIS permissions seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  - employees (7 permissions)';
  RAISE NOTICE '  - locations (5 permissions)';
  RAISE NOTICE '  - departments (5 permissions)';
  RAISE NOTICE '  - contracts (6 permissions)';
  RAISE NOTICE '  - timeoff (6 permissions)';
  RAISE NOTICE '  - attendance (5 permissions)';
  RAISE NOTICE '  - benefits (6 permissions)';
  RAISE NOTICE '  - performance (6 permissions)';
  RAISE NOTICE '  - documents (6 permissions)';
  RAISE NOTICE '  - reports (5 permissions)';
  RAISE NOTICE '  - settings (3 permissions)';
  RAISE NOTICE '================================================================';
END;
$$;
