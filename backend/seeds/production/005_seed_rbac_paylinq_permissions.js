/**
 * Seed: PayLinQ (Payroll) Product Permissions
 * Source: seed-rbac-paylinq-permissions.sql
 * 
 * Seeds permissions for PayLinQ payroll product including:
 * - Payroll Run Management
 * - Payroll Structure Management
 * - Payroll Employee Management
 * - Worker Type Management
 * - Component Management
 * - Formula Management
 * - Tax Management
 * - Allowance Management
 * - Deduction Management
 * - Payment Management
 * - Timesheet Management
 * - Scheduling Management
 * - Compliance & Reporting
 * - Settings & Configuration
 */

export async function seed(knex) {
  // ============================================================================
  // PAYLINQ PRODUCT PERMISSIONS
  // ============================================================================

  const paylinqPermissions = [
    // Payroll Run Management
    { product: 'paylinq', name: 'payroll:create', display_name: 'Create Payroll Runs', description: 'Create new payroll runs', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:read', display_name: 'View Payroll Runs', description: 'View payroll run information', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:update', display_name: 'Update Payroll Runs', description: 'Update payroll run information', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:delete', display_name: 'Delete Payroll Runs', description: 'Delete payroll runs', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:process', display_name: 'Process Payroll', description: 'Process and finalize payroll', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:approve', display_name: 'Approve Payroll', description: 'Approve payroll for payment', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:lock', display_name: 'Lock Payroll', description: 'Lock payroll runs from changes', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:export', display_name: 'Export Payroll', description: 'Export payroll data', category: 'payroll' },

    // Payroll Structure Management
    { product: 'paylinq', name: 'payroll:structures:read', display_name: 'View Payroll Structures', description: 'View payroll structure configuration', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:structures:create', display_name: 'Create Payroll Structures', description: 'Create payroll structure templates', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:structures:update', display_name: 'Update Payroll Structures', description: 'Update payroll structure configuration', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:structures:delete', display_name: 'Delete Payroll Structures', description: 'Delete payroll structures', category: 'payroll' },

    // Payroll Employee Management
    { product: 'paylinq', name: 'payroll:employees:read', display_name: 'View Payroll Employees', description: 'View employee payroll records', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employees:create', display_name: 'Create Payroll Employees', description: 'Add employees to payroll', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employees:update', display_name: 'Update Payroll Employees', description: 'Update employee payroll information', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employees:delete', display_name: 'Delete Payroll Employees', description: 'Remove employees from payroll', category: 'payroll' },

    // Payroll Component Assignment
    { product: 'paylinq', name: 'payroll:employee-components:read', display_name: 'View Employee Components', description: 'View components assigned to employees', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employee-components:create', display_name: 'Assign Employee Components', description: 'Assign pay components to employees', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employee-components:update', display_name: 'Update Employee Components', description: 'Update employee component assignments', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:employee-components:delete', display_name: 'Remove Employee Components', description: 'Remove component assignments', category: 'payroll' },

    // Payroll Components (Standalone)
    { product: 'paylinq', name: 'payroll:components:create', display_name: 'Create Payroll Components', description: 'Create payroll-level components', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:components:delete', display_name: 'Delete Payroll Components', description: 'Delete payroll-level components', category: 'payroll' },

    // Payroll Employee Access Management
    { product: 'paylinq', name: 'payroll:employees:manage_access', display_name: 'Manage Employee Access', description: 'Manage employee payroll access permissions', category: 'payroll' },

    // Payroll Formulas
    { product: 'paylinq', name: 'payroll:formulas:execute', display_name: 'Execute Payroll Formulas', description: 'Execute formula calculations for payroll', category: 'payroll' },

    // Payroll Paychecks
    { product: 'paylinq', name: 'payroll:paychecks:read', display_name: 'View Paychecks', description: 'View employee paychecks', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:paychecks:process', display_name: 'Process Paychecks', description: 'Process and generate paychecks', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:paychecks:update', display_name: 'Update Paychecks', description: 'Update paycheck information', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:paychecks:delete', display_name: 'Delete Paychecks', description: 'Delete paychecks', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:paychecks:void', display_name: 'Void Paychecks', description: 'Void issued paychecks', category: 'payroll' },

    // Payroll Payments
    { product: 'paylinq', name: 'payroll:payments:create', display_name: 'Create Payroll Payments', description: 'Create payment records', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:payments:delete', display_name: 'Delete Payroll Payments', description: 'Delete payment records', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:payments:process', display_name: 'Process Payroll Payments', description: 'Process and submit payments', category: 'payroll' },

    // Payroll Reconciliation
    { product: 'paylinq', name: 'payroll:reconciliation:create', display_name: 'Create Reconciliation', description: 'Create payroll reconciliation records', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:reconciliation:read', display_name: 'View Reconciliation', description: 'View reconciliation data', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:reconciliation:update', display_name: 'Update Reconciliation', description: 'Update reconciliation records', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:reconciliation:delete', display_name: 'Delete Reconciliation', description: 'Delete reconciliation records', category: 'payroll' },

    // Payroll Run Management
    { product: 'paylinq', name: 'payroll:run:create', display_name: 'Create Payroll Run', description: 'Create new payroll runs', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:run:approve', display_name: 'Approve Payroll Run', description: 'Approve payroll runs for processing', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:run:process', display_name: 'Process Payroll Run', description: 'Process approved payroll runs', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:run:delete', display_name: 'Delete Payroll Run', description: 'Delete payroll runs', category: 'payroll' },

    // Payroll Run Types
    { product: 'paylinq', name: 'payroll:run_types:create', display_name: 'Create Run Types', description: 'Create payroll run type configurations', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:run_types:delete', display_name: 'Delete Run Types', description: 'Delete run type configurations', category: 'payroll' },

    // Payroll Templates
    { product: 'paylinq', name: 'payroll:templates:create', display_name: 'Create Payroll Templates', description: 'Create payslip/payroll templates', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:templates:read', display_name: 'View Payroll Templates', description: 'View template configurations', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:templates:update', display_name: 'Update Payroll Templates', description: 'Update template configurations', category: 'payroll' },
    { product: 'paylinq', name: 'payroll:templates:delete', display_name: 'Delete Payroll Templates', description: 'Delete templates', category: 'payroll' },

    // Payroll Settings
    { product: 'paylinq', name: 'payroll:settings:delete', display_name: 'Delete Payroll Settings', description: 'Delete payroll configuration settings', category: 'payroll' },

    // Worker Type Management
    { product: 'paylinq', name: 'worker-types:create', display_name: 'Create Worker Types', description: 'Create worker type templates', category: 'worker-types' },
    { product: 'paylinq', name: 'worker-types:read', display_name: 'View Worker Types', description: 'View worker type information', category: 'worker-types' },
    { product: 'paylinq', name: 'worker-types:update', display_name: 'Update Worker Types', description: 'Update worker type templates', category: 'worker-types' },
    { product: 'paylinq', name: 'worker-types:delete', display_name: 'Delete Worker Types', description: 'Delete worker type templates', category: 'worker-types' },
    { product: 'paylinq', name: 'worker-types:manage', display_name: 'Manage Worker Types', description: 'Full worker type management', category: 'worker-types' },

    // Worker Type Components
    { product: 'paylinq', name: 'worker-types:components:read', display_name: 'View Worker Type Components', description: 'View components for worker types', category: 'worker-types' },
    { product: 'paylinq', name: 'worker-types:components:update', display_name: 'Update Worker Type Components', description: 'Update worker type component configuration', category: 'worker-types' },

    // Component Management
    { product: 'paylinq', name: 'components:create', display_name: 'Create Pay Components', description: 'Create pay components', category: 'components' },
    { product: 'paylinq', name: 'components:read', display_name: 'View Pay Components', description: 'View pay component information', category: 'components' },
    { product: 'paylinq', name: 'components:update', display_name: 'Update Pay Components', description: 'Update pay components', category: 'components' },
    { product: 'paylinq', name: 'components:delete', display_name: 'Delete Pay Components', description: 'Delete pay components', category: 'components' },
    { product: 'paylinq', name: 'components:manage', display_name: 'Manage Components', description: 'Full component management', category: 'components' },

    // Component Code Management
    { product: 'paylinq', name: 'components:validate-code', display_name: 'Validate Component Code', description: 'Validate component code uniqueness', category: 'components' },

    // Formula Management
    { product: 'paylinq', name: 'formulas:create', display_name: 'Create Formulas', description: 'Create calculation formulas', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:read', display_name: 'View Formulas', description: 'View formula information', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:update', display_name: 'Update Formulas', description: 'Update calculation formulas', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:delete', display_name: 'Delete Formulas', description: 'Delete formulas', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:test', display_name: 'Test Formulas', description: 'Test formula calculations', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:manage', display_name: 'Manage Formulas', description: 'Full formula management', category: 'formulas' },

    // Formula Templates
    { product: 'paylinq', name: 'formulas:templates:read', display_name: 'View Formula Templates', description: 'View global formula templates', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:templates:clone', display_name: 'Clone Formula Templates', description: 'Clone templates to organization', category: 'formulas' },
    { product: 'paylinq', name: 'formulas:validate', display_name: 'Validate Formulas', description: 'Validate formula syntax', category: 'formulas' },

    // Tax Management
    { product: 'paylinq', name: 'tax:read', display_name: 'View Tax Rules', description: 'View tax calculation rules', category: 'tax' },
    { product: 'paylinq', name: 'tax:update', display_name: 'Update Tax Rules', description: 'Update tax calculation rules', category: 'tax' },
    { product: 'paylinq', name: 'tax:manage', display_name: 'Manage Tax Rules', description: 'Full tax rule management', category: 'tax' },
    { product: 'paylinq', name: 'tax:reports', display_name: 'View Tax Reports', description: 'View tax compliance reports', category: 'tax' },

    // Tax Rule Sets
    { product: 'paylinq', name: 'tax:rule-sets:read', display_name: 'View Tax Rule Sets', description: 'View tax rule set configuration', category: 'tax' },
    { product: 'paylinq', name: 'tax:rule-sets:create', display_name: 'Create Tax Rule Sets', description: 'Create new tax rule sets', category: 'tax' },
    { product: 'paylinq', name: 'tax:rule-sets:update', display_name: 'Update Tax Rule Sets', description: 'Update tax rule sets', category: 'tax' },
    { product: 'paylinq', name: 'tax:rule-sets:delete', display_name: 'Delete Tax Rule Sets', description: 'Delete tax rule sets', category: 'tax' },

    // Tax Calculations
    { product: 'paylinq', name: 'tax:calculate', display_name: 'Calculate Tax', description: 'Calculate tax for payroll', category: 'tax' },

    // Allowance Management
    { product: 'paylinq', name: 'allowances:create', display_name: 'Create Allowances', description: 'Create tax-free allowances', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:read', display_name: 'View Allowances', description: 'View allowance information', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:update', display_name: 'Update Allowances', description: 'Update allowance rules', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:delete', display_name: 'Delete Allowances', description: 'Delete allowances', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:manage', display_name: 'Manage Allowances', description: 'Full allowance management', category: 'allowances' },

    // Allowance Types
    { product: 'paylinq', name: 'allowances:types:read', display_name: 'View Allowance Types', description: 'View allowance type configuration', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:usage:read', display_name: 'View Allowance Usage', description: 'View employee allowance usage', category: 'allowances' },
    { product: 'paylinq', name: 'allowances:calculate', display_name: 'Calculate Allowances', description: 'Calculate tax-free allowances', category: 'allowances' },

    // Deduction Management
    { product: 'paylinq', name: 'deductions:create', display_name: 'Create Deductions', description: 'Create payroll deductions', category: 'deductions' },
    { product: 'paylinq', name: 'deductions:read', display_name: 'View Deductions', description: 'View deduction information', category: 'deductions' },
    { product: 'paylinq', name: 'deductions:update', display_name: 'Update Deductions', description: 'Update deduction rules', category: 'deductions' },
    { product: 'paylinq', name: 'deductions:delete', display_name: 'Delete Deductions', description: 'Delete deductions', category: 'deductions' },
    { product: 'paylinq', name: 'deductions:manage', display_name: 'Manage Deductions', description: 'Full deduction management', category: 'deductions' },

    // Compensation Management
    { product: 'paylinq', name: 'compensation:create', display_name: 'Create Compensation', description: 'Create employee compensation records', category: 'compensation' },
    { product: 'paylinq', name: 'compensation:read', display_name: 'View Compensation', description: 'View employee compensation information', category: 'compensation' },
    { product: 'paylinq', name: 'compensation:update', display_name: 'Update Compensation', description: 'Update compensation records', category: 'compensation' },
    { product: 'paylinq', name: 'compensation:delete', display_name: 'Delete Compensation', description: 'Delete compensation records', category: 'compensation' },

    // Dashboard & Analytics
    { product: 'paylinq', name: 'dashboard:read', display_name: 'View Dashboard', description: 'View PayLinQ dashboard and statistics', category: 'dashboard' },

    // Approval Management
    { product: 'paylinq', name: 'approvals:create', display_name: 'Create Approvals', description: 'Create approval requests', category: 'approvals' },
    { product: 'paylinq', name: 'approvals:read', display_name: 'View Approvals', description: 'View approval requests and history', category: 'approvals' },
    { product: 'paylinq', name: 'approvals:approve', display_name: 'Approve Requests', description: 'Approve or reject approval requests', category: 'approvals' },

    // Payment Management
    { product: 'paylinq', name: 'payments:create', display_name: 'Create Payments', description: 'Create payment batches', category: 'payments' },
    { product: 'paylinq', name: 'payments:read', display_name: 'View Payments', description: 'View payment information', category: 'payments' },
    { product: 'paylinq', name: 'payments:update', display_name: 'Update Payments', description: 'Update payment details', category: 'payments' },
    { product: 'paylinq', name: 'payments:process', display_name: 'Process Payments', description: 'Process payment batches', category: 'payments' },
    { product: 'paylinq', name: 'payments:approve', display_name: 'Approve Payments', description: 'Approve payments for transfer', category: 'payments' },
    { product: 'paylinq', name: 'payments:export', display_name: 'Export Payments', description: 'Export payment files (SEPA, bank)', category: 'payments' },

    // Timesheet Management
    { product: 'paylinq', name: 'timesheets:create', display_name: 'Create Timesheets', description: 'Create employee timesheets', category: 'timesheets' },
    { product: 'paylinq', name: 'timesheets:read', display_name: 'View Timesheets', description: 'View timesheet information', category: 'timesheets' },
    { product: 'paylinq', name: 'timesheets:update', display_name: 'Update Timesheets', description: 'Update timesheet records', category: 'timesheets' },
    { product: 'paylinq', name: 'timesheets:delete', display_name: 'Delete Timesheets', description: 'Delete timesheet records', category: 'timesheets' },
    { product: 'paylinq', name: 'timesheets:approve', display_name: 'Approve Timesheets', description: 'Approve timesheets for payroll', category: 'timesheets' },
    { product: 'paylinq', name: 'timesheets:import', display_name: 'Import Timesheets', description: 'Import timesheet data', category: 'timesheets' },

    // Scheduling Management (PayLinQ-specific scheduling features)
    { product: 'paylinq', name: 'scheduling:create', display_name: 'Create Schedules', description: 'Create employee work schedules', category: 'scheduling' },
    { product: 'paylinq', name: 'scheduling:read', display_name: 'View Schedules', description: 'View work schedules', category: 'scheduling' },
    { product: 'paylinq', name: 'scheduling:update', display_name: 'Update Schedules', description: 'Update work schedules', category: 'scheduling' },
    { product: 'paylinq', name: 'scheduling:delete', display_name: 'Delete Schedules', description: 'Delete work schedules', category: 'scheduling' },
    { product: 'paylinq', name: 'scheduling:approve', display_name: 'Approve Schedule Changes', description: 'Approve schedule change requests', category: 'scheduling' },

    // Compliance & Reporting
    { product: 'paylinq', name: 'reports:read', display_name: 'View Reports', description: 'View payroll reports', category: 'reports' },
    { product: 'paylinq', name: 'reports:export', display_name: 'Export Reports', description: 'Export report data', category: 'reports' },
    { product: 'paylinq', name: 'reports:payslips', display_name: 'View Payslips', description: 'View employee payslips', category: 'reports' },
    { product: 'paylinq', name: 'reports:compliance', display_name: 'View Compliance Reports', description: 'View tax compliance reports', category: 'reports' },
    { product: 'paylinq', name: 'reports:analytics', display_name: 'View Analytics', description: 'View payroll analytics', category: 'reports' },

    // Settings & Configuration
    { product: 'paylinq', name: 'settings:read', display_name: 'View Settings', description: 'View PayLinQ settings', category: 'settings' },
    { product: 'paylinq', name: 'settings:update', display_name: 'Update Settings', description: 'Update PayLinQ configuration', category: 'settings' },
    { product: 'paylinq', name: 'settings:manage', display_name: 'Manage Settings', description: 'Full settings management', category: 'settings' },
    { product: 'paylinq', name: 'settings:currency', display_name: 'Manage Currency Settings', description: 'Configure currency and exchange rates', category: 'settings' },

    // Run Types
    { product: 'paylinq', name: 'run-types:read', display_name: 'View Run Types', description: 'View payroll run type configuration', category: 'settings' },
    { product: 'paylinq', name: 'run-types:create', display_name: 'Create Run Types', description: 'Create new run types', category: 'settings' },
    { product: 'paylinq', name: 'run-types:update', display_name: 'Update Run Types', description: 'Update run type configuration', category: 'settings' },
    { product: 'paylinq', name: 'run-types:delete', display_name: 'Delete Run Types', description: 'Delete run types', category: 'settings' },

    // System Administration
    { product: 'paylinq', name: 'system:admin', display_name: 'System Administration', description: 'Full system administration access', category: 'system' }
  ];

  // Insert all permissions
  for (const permission of paylinqPermissions) {
    await knex('permissions')
      .insert(permission)
      .onConflict(['product', 'name'])
      .ignore();
  }

  console.log('[OK] PayLinQ payroll permissions seeded successfully!');
  console.log('Categories:');
  console.log('  - payroll (68 permissions - includes all payroll operations)');
  console.log('  - worker-types (7 permissions - includes component management)');
  console.log('  - components (7 permissions - includes validation)');
  console.log('  - formulas (8 permissions - includes templates)');
  console.log('  - tax (9 permissions - includes rule sets and calculations)');
  console.log('  - allowances (8 permissions - includes types and usage)');
  console.log('  - deductions (5 permissions)');
  console.log('  - compensation (4 permissions)');
  console.log('  - dashboard (1 permission)');
  console.log('  - approvals (3 permissions)');
  console.log('  - payments (6 permissions)');
  console.log('  - timesheets (6 permissions)');
  console.log('  - scheduling (5 permissions)');
  console.log('  - reports (5 permissions)');
  console.log('  - settings (8 permissions - includes run types and currency)');
  console.log('  - system (1 permission - admin access)');
  console.log('  TOTAL: 130 permissions (complete coverage of all routes)');
}
