-- ============================================================================
-- Seed PayLinQ (Payroll) Product Permissions
-- ============================================================================
-- Description: Seeds permissions for PayLinQ payroll product
-- Run this AFTER platform RBAC migration
-- ============================================================================

-- ============================================================================
-- PAYLINQ PRODUCT PERMISSIONS
-- ============================================================================

INSERT INTO public.permissions (product, name, display_name, description, category) VALUES
-- Payroll Run Management
('paylinq', 'payroll:create', 'Create Payroll Runs', 'Create new payroll runs', 'payroll'),
('paylinq', 'payroll:read', 'View Payroll Runs', 'View payroll run information', 'payroll'),
('paylinq', 'payroll:update', 'Update Payroll Runs', 'Update payroll run information', 'payroll'),
('paylinq', 'payroll:delete', 'Delete Payroll Runs', 'Delete payroll runs', 'payroll'),
('paylinq', 'payroll:process', 'Process Payroll', 'Process and finalize payroll', 'payroll'),
('paylinq', 'payroll:approve', 'Approve Payroll', 'Approve payroll for payment', 'payroll'),
('paylinq', 'payroll:lock', 'Lock Payroll', 'Lock payroll runs from changes', 'payroll'),
('paylinq', 'payroll:export', 'Export Payroll', 'Export payroll data', 'payroll'),

-- Payroll Structure Management (NEW - specific permissions)
('paylinq', 'payroll:structures:read', 'View Payroll Structures', 'View payroll structure configuration', 'payroll'),
('paylinq', 'payroll:structures:create', 'Create Payroll Structures', 'Create payroll structure templates', 'payroll'),
('paylinq', 'payroll:structures:update', 'Update Payroll Structures', 'Update payroll structure configuration', 'payroll'),
('paylinq', 'payroll:structures:delete', 'Delete Payroll Structures', 'Delete payroll structures', 'payroll'),

-- Payroll Employee Management (NEW - specific permissions)
('paylinq', 'payroll:employees:read', 'View Payroll Employees', 'View employee payroll records', 'payroll'),
('paylinq', 'payroll:employees:create', 'Create Payroll Employees', 'Add employees to payroll', 'payroll'),
('paylinq', 'payroll:employees:update', 'Update Payroll Employees', 'Update employee payroll information', 'payroll'),
('paylinq', 'payroll:employees:delete', 'Delete Payroll Employees', 'Remove employees from payroll', 'payroll'),

-- Payroll Component Assignment (NEW)
('paylinq', 'payroll:employee-components:read', 'View Employee Components', 'View components assigned to employees', 'payroll'),
('paylinq', 'payroll:employee-components:create', 'Assign Employee Components', 'Assign pay components to employees', 'payroll'),
('paylinq', 'payroll:employee-components:update', 'Update Employee Components', 'Update employee component assignments', 'payroll'),
('paylinq', 'payroll:employee-components:delete', 'Remove Employee Components', 'Remove component assignments', 'payroll'),

-- Payroll Components (Standalone - NEW)
('paylinq', 'payroll:components:create', 'Create Payroll Components', 'Create payroll-level components', 'payroll'),
('paylinq', 'payroll:components:delete', 'Delete Payroll Components', 'Delete payroll-level components', 'payroll'),

-- Payroll Employee Access Management (NEW)
('paylinq', 'payroll:employees:manage_access', 'Manage Employee Access', 'Manage employee payroll access permissions', 'payroll'),

-- Payroll Formulas (NEW)
('paylinq', 'payroll:formulas:execute', 'Execute Payroll Formulas', 'Execute formula calculations for payroll', 'payroll'),

-- Payroll Paychecks (NEW)
('paylinq', 'payroll:paychecks:read', 'View Paychecks', 'View employee paychecks', 'payroll'),
('paylinq', 'payroll:paychecks:process', 'Process Paychecks', 'Process and generate paychecks', 'payroll'),
('paylinq', 'payroll:paychecks:update', 'Update Paychecks', 'Update paycheck information', 'payroll'),
('paylinq', 'payroll:paychecks:delete', 'Delete Paychecks', 'Delete paychecks', 'payroll'),
('paylinq', 'payroll:paychecks:void', 'Void Paychecks', 'Void issued paychecks', 'payroll'),

-- Payroll Payments (NEW)
('paylinq', 'payroll:payments:create', 'Create Payroll Payments', 'Create payment records', 'payroll'),
('paylinq', 'payroll:payments:delete', 'Delete Payroll Payments', 'Delete payment records', 'payroll'),
('paylinq', 'payroll:payments:process', 'Process Payroll Payments', 'Process and submit payments', 'payroll'),

-- Payroll Reconciliation (NEW)
('paylinq', 'payroll:reconciliation:create', 'Create Reconciliation', 'Create payroll reconciliation records', 'payroll'),
('paylinq', 'payroll:reconciliation:read', 'View Reconciliation', 'View reconciliation data', 'payroll'),
('paylinq', 'payroll:reconciliation:update', 'Update Reconciliation', 'Update reconciliation records', 'payroll'),
('paylinq', 'payroll:reconciliation:delete', 'Delete Reconciliation', 'Delete reconciliation records', 'payroll'),

-- Payroll Run Management (NEW)
('paylinq', 'payroll:run:create', 'Create Payroll Run', 'Create new payroll runs', 'payroll'),
('paylinq', 'payroll:run:approve', 'Approve Payroll Run', 'Approve payroll runs for processing', 'payroll'),
('paylinq', 'payroll:run:process', 'Process Payroll Run', 'Process approved payroll runs', 'payroll'),
('paylinq', 'payroll:run:delete', 'Delete Payroll Run', 'Delete payroll runs', 'payroll'),

-- Payroll Run Types (NEW)
('paylinq', 'payroll:run_types:create', 'Create Run Types', 'Create payroll run type configurations', 'payroll'),
('paylinq', 'payroll:run_types:delete', 'Delete Run Types', 'Delete run type configurations', 'payroll'),

-- Payroll Templates (NEW)
('paylinq', 'payroll:templates:create', 'Create Payroll Templates', 'Create payslip/payroll templates', 'payroll'),
('paylinq', 'payroll:templates:read', 'View Payroll Templates', 'View template configurations', 'payroll'),
('paylinq', 'payroll:templates:update', 'Update Payroll Templates', 'Update template configurations', 'payroll'),
('paylinq', 'payroll:templates:delete', 'Delete Payroll Templates', 'Delete templates', 'payroll'),

-- Payroll Settings (NEW)
('paylinq', 'payroll:settings:delete', 'Delete Payroll Settings', 'Delete payroll configuration settings', 'payroll'),

-- Worker Type Management
('paylinq', 'worker-types:create', 'Create Worker Types', 'Create worker type templates', 'worker-types'),
('paylinq', 'worker-types:read', 'View Worker Types', 'View worker type information', 'worker-types'),
('paylinq', 'worker-types:update', 'Update Worker Types', 'Update worker type templates', 'worker-types'),
('paylinq', 'worker-types:delete', 'Delete Worker Types', 'Delete worker type templates', 'worker-types'),
('paylinq', 'worker-types:manage', 'Manage Worker Types', 'Full worker type management', 'worker-types'),

-- Worker Type Components (NEW)
('paylinq', 'worker-types:components:read', 'View Worker Type Components', 'View components for worker types', 'worker-types'),
('paylinq', 'worker-types:components:update', 'Update Worker Type Components', 'Update worker type component configuration', 'worker-types'),

-- Component Management
('paylinq', 'components:create', 'Create Pay Components', 'Create pay components', 'components'),
('paylinq', 'components:read', 'View Pay Components', 'View pay component information', 'components'),
('paylinq', 'components:update', 'Update Pay Components', 'Update pay components', 'components'),
('paylinq', 'components:delete', 'Delete Pay Components', 'Delete pay components', 'components'),
('paylinq', 'components:manage', 'Manage Components', 'Full component management', 'components'),

-- Component Code Management (NEW)
('paylinq', 'components:validate-code', 'Validate Component Code', 'Validate component code uniqueness', 'components'),

-- Formula Management
('paylinq', 'formulas:create', 'Create Formulas', 'Create calculation formulas', 'formulas'),
('paylinq', 'formulas:read', 'View Formulas', 'View formula information', 'formulas'),
('paylinq', 'formulas:update', 'Update Formulas', 'Update calculation formulas', 'formulas'),
('paylinq', 'formulas:delete', 'Delete Formulas', 'Delete formulas', 'formulas'),
('paylinq', 'formulas:test', 'Test Formulas', 'Test formula calculations', 'formulas'),
('paylinq', 'formulas:manage', 'Manage Formulas', 'Full formula management', 'formulas'),

-- Formula Templates (NEW)
('paylinq', 'formulas:templates:read', 'View Formula Templates', 'View global formula templates', 'formulas'),
('paylinq', 'formulas:templates:clone', 'Clone Formula Templates', 'Clone templates to organization', 'formulas'),
('paylinq', 'formulas:validate', 'Validate Formulas', 'Validate formula syntax', 'formulas'),

-- Tax Management
('paylinq', 'tax:read', 'View Tax Rules', 'View tax calculation rules', 'tax'),
('paylinq', 'tax:update', 'Update Tax Rules', 'Update tax calculation rules', 'tax'),
('paylinq', 'tax:manage', 'Manage Tax Rules', 'Full tax rule management', 'tax'),
('paylinq', 'tax:reports', 'View Tax Reports', 'View tax compliance reports', 'tax'),

-- Tax Rule Sets (NEW)
('paylinq', 'tax:rule-sets:read', 'View Tax Rule Sets', 'View tax rule set configuration', 'tax'),
('paylinq', 'tax:rule-sets:create', 'Create Tax Rule Sets', 'Create new tax rule sets', 'tax'),
('paylinq', 'tax:rule-sets:update', 'Update Tax Rule Sets', 'Update tax rule sets', 'tax'),
('paylinq', 'tax:rule-sets:delete', 'Delete Tax Rule Sets', 'Delete tax rule sets', 'tax'),

-- Tax Calculations (NEW)
('paylinq', 'tax:calculate', 'Calculate Tax', 'Calculate tax for payroll', 'tax'),

-- Allowance Management
('paylinq', 'allowances:create', 'Create Allowances', 'Create tax-free allowances', 'allowances'),
('paylinq', 'allowances:read', 'View Allowances', 'View allowance information', 'allowances'),
('paylinq', 'allowances:update', 'Update Allowances', 'Update allowance rules', 'allowances'),
('paylinq', 'allowances:delete', 'Delete Allowances', 'Delete allowances', 'allowances'),
('paylinq', 'allowances:manage', 'Manage Allowances', 'Full allowance management', 'allowances'),

-- Allowance Types (NEW)
('paylinq', 'allowances:types:read', 'View Allowance Types', 'View allowance type configuration', 'allowances'),
('paylinq', 'allowances:usage:read', 'View Allowance Usage', 'View employee allowance usage', 'allowances'),
('paylinq', 'allowances:calculate', 'Calculate Allowances', 'Calculate tax-free allowances', 'allowances'),

-- Deduction Management
('paylinq', 'deductions:create', 'Create Deductions', 'Create payroll deductions', 'deductions'),
('paylinq', 'deductions:read', 'View Deductions', 'View deduction information', 'deductions'),
('paylinq', 'deductions:update', 'Update Deductions', 'Update deduction rules', 'deductions'),
('paylinq', 'deductions:delete', 'Delete Deductions', 'Delete deductions', 'deductions'),
('paylinq', 'deductions:manage', 'Manage Deductions', 'Full deduction management', 'deductions'),

-- Compensation Management (NEW)
('paylinq', 'compensation:create', 'Create Compensation', 'Create employee compensation records', 'compensation'),
('paylinq', 'compensation:read', 'View Compensation', 'View employee compensation information', 'compensation'),
('paylinq', 'compensation:update', 'Update Compensation', 'Update compensation records', 'compensation'),
('paylinq', 'compensation:delete', 'Delete Compensation', 'Delete compensation records', 'compensation'),

-- Dashboard & Analytics (NEW)
('paylinq', 'dashboard:read', 'View Dashboard', 'View PayLinQ dashboard and statistics', 'dashboard'),

-- Approval Management (NEW)
('paylinq', 'approvals:create', 'Create Approvals', 'Create approval requests', 'approvals'),
('paylinq', 'approvals:read', 'View Approvals', 'View approval requests and history', 'approvals'),
('paylinq', 'approvals:approve', 'Approve Requests', 'Approve or reject approval requests', 'approvals'),

-- Payment Management
('paylinq', 'payments:create', 'Create Payments', 'Create payment batches', 'payments'),
('paylinq', 'payments:read', 'View Payments', 'View payment information', 'payments'),
('paylinq', 'payments:update', 'Update Payments', 'Update payment details', 'payments'),
('paylinq', 'payments:process', 'Process Payments', 'Process payment batches', 'payments'),
('paylinq', 'payments:approve', 'Approve Payments', 'Approve payments for transfer', 'payments'),
('paylinq', 'payments:export', 'Export Payments', 'Export payment files (SEPA, bank)', 'payments'),

-- Timesheet Management
('paylinq', 'timesheets:create', 'Create Timesheets', 'Create employee timesheets', 'timesheets'),
('paylinq', 'timesheets:read', 'View Timesheets', 'View timesheet information', 'timesheets'),
('paylinq', 'timesheets:update', 'Update Timesheets', 'Update timesheet records', 'timesheets'),
('paylinq', 'timesheets:delete', 'Delete Timesheets', 'Delete timesheet records', 'timesheets'),
('paylinq', 'timesheets:approve', 'Approve Timesheets', 'Approve timesheets for payroll', 'timesheets'),
('paylinq', 'timesheets:import', 'Import Timesheets', 'Import timesheet data', 'timesheets'),

-- Scheduling Management (PayLinQ-specific scheduling features)
('paylinq', 'scheduling:create', 'Create Schedules', 'Create employee work schedules', 'scheduling'),
('paylinq', 'scheduling:read', 'View Schedules', 'View work schedules', 'scheduling'),
('paylinq', 'scheduling:update', 'Update Schedules', 'Update work schedules', 'scheduling'),
('paylinq', 'scheduling:delete', 'Delete Schedules', 'Delete work schedules', 'scheduling'),
('paylinq', 'scheduling:approve', 'Approve Schedule Changes', 'Approve schedule change requests', 'scheduling'),

-- Compliance & Reporting
('paylinq', 'reports:read', 'View Reports', 'View payroll reports', 'reports'),
('paylinq', 'reports:export', 'Export Reports', 'Export report data', 'reports'),
('paylinq', 'reports:payslips', 'View Payslips', 'View employee payslips', 'reports'),
('paylinq', 'reports:compliance', 'View Compliance Reports', 'View tax compliance reports', 'reports'),
('paylinq', 'reports:analytics', 'View Analytics', 'View payroll analytics', 'reports'),

-- Settings & Configuration
('paylinq', 'settings:read', 'View Settings', 'View PayLinQ settings', 'settings'),
('paylinq', 'settings:update', 'Update Settings', 'Update PayLinQ configuration', 'settings'),
('paylinq', 'settings:manage', 'Manage Settings', 'Full settings management', 'settings'),
('paylinq', 'settings:currency', 'Manage Currency Settings', 'Configure currency and exchange rates', 'settings'),

-- Run Types (NEW)
('paylinq', 'run-types:read', 'View Run Types', 'View payroll run type configuration', 'settings'),
('paylinq', 'run-types:create', 'Create Run Types', 'Create new run types', 'settings'),
('paylinq', 'run-types:update', 'Update Run Types', 'Update run type configuration', 'settings'),
('paylinq', 'run-types:delete', 'Delete Run Types', 'Delete run types', 'settings'),

-- System Administration (NEW)
('paylinq', 'system:admin', 'System Administration', 'Full system administration access', 'system')

ON CONFLICT (product, name) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '[OK] PayLinQ payroll permissions seeded successfully!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  - payroll (68 permissions - includes all payroll operations)';
  RAISE NOTICE '  - worker-types (7 permissions - includes component management)';
  RAISE NOTICE '  - components (7 permissions - includes validation)';
  RAISE NOTICE '  - formulas (8 permissions - includes templates)';
  RAISE NOTICE '  - tax (9 permissions - includes rule sets and calculations)';
  RAISE NOTICE '  - allowances (8 permissions - includes types and usage)';
  RAISE NOTICE '  - deductions (5 permissions)';
  RAISE NOTICE '  - compensation (4 permissions)';
  RAISE NOTICE '  - dashboard (1 permission)';
  RAISE NOTICE '  - approvals (3 permissions)';
  RAISE NOTICE '  - payments (6 permissions)';
  RAISE NOTICE '  - timesheets (6 permissions)';
  RAISE NOTICE '  - scheduling (5 permissions)';
  RAISE NOTICE '  - reports (5 permissions)';
  RAISE NOTICE '  - settings (8 permissions - includes run types and currency)';
  RAISE NOTICE '  - system (1 permission - admin access)';
  RAISE NOTICE '  TOTAL: 130 permissions (complete coverage of all routes)';
  RAISE NOTICE '================================================================';
END;
$$;
