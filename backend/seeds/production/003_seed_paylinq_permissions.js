/**
 * PayLinQ RBAC Permissions Seed
 * 
 * Populates PayLinQ-specific permissions for multi-tenant RBAC system.
 * Converted from: src/database/seeds/seed-rbac-paylinq-permissions.sql
 * 
 * Categories:
 * - payroll: 68 permissions
 * - worker-types: 7 permissions
 * - components: 7 permissions
 * - formulas: 8 permissions
 * - tax: 9 permissions
 * - allowances: 8 permissions
 * - deductions: 5 permissions
 * - compensation: 4 permissions
 * - dashboard: 1 permission
 * - approvals: 3 permissions
 * - payments: 6 permissions
 * - timesheets: 6 permissions
 * - scheduling: 5 permissions
 * - reports: 5 permissions
 * - settings: 8 permissions
 * - system: 1 permission
 * 
 * Total: 130 PayLinQ permissions
 */

/**
 * Seeds PayLinQ module permissions
 * 
 * @param {import('knex').Knex} knex - Knex instance
 * @returns {Promise<void>}
 */
export async function seed(knex) {
  const tableName = 'hris.permissions';

  // Check if permissions already exist (idempotency)
  const existingPermissions = await knex(tableName)
    .select('code')
    .where('code', 'like', 'paylinq:%')
    .limit(1);

  if (existingPermissions.length > 0) {
    console.log('✓ PayLinQ permissions already seeded, skipping...');
    return;
  }

  const permissions = [
    // ========================================
    // PAYROLL MANAGEMENT (68 permissions)
    // ========================================
    {
      code: 'paylinq:payroll:create',
      name: 'Create Payroll Runs',
      description: 'Create new payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:read',
      name: 'View Payroll Runs',
      description: 'View payroll run details',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:update',
      name: 'Update Payroll Runs',
      description: 'Modify existing payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:delete',
      name: 'Delete Payroll Runs',
      description: 'Delete payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:list',
      name: 'List Payroll Runs',
      description: 'View list of all payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:calculate',
      name: 'Calculate Payroll',
      description: 'Execute payroll calculations',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:approve',
      name: 'Approve Payroll',
      description: 'Approve payroll runs for processing',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:reject',
      name: 'Reject Payroll',
      description: 'Reject payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:submit',
      name: 'Submit Payroll',
      description: 'Submit payroll for approval',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:finalize',
      name: 'Finalize Payroll',
      description: 'Mark payroll as final and lock changes',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:reopen',
      name: 'Reopen Payroll',
      description: 'Reopen finalized payroll for corrections',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:export',
      name: 'Export Payroll Data',
      description: 'Export payroll data to external formats',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:import',
      name: 'Import Payroll Data',
      description: 'Import payroll data from external sources',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:process',
      name: 'Process Payroll',
      description: 'Process approved payroll for payment',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:reverse',
      name: 'Reverse Payroll',
      description: 'Reverse processed payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:recalculate',
      name: 'Recalculate Payroll',
      description: 'Recalculate payroll after changes',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:validate',
      name: 'Validate Payroll',
      description: 'Run validation checks on payroll data',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:lock',
      name: 'Lock Payroll',
      description: 'Lock payroll to prevent changes',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:unlock',
      name: 'Unlock Payroll',
      description: 'Unlock locked payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:archive',
      name: 'Archive Payroll',
      description: 'Archive old payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:restore',
      name: 'Restore Payroll',
      description: 'Restore archived payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:duplicate',
      name: 'Duplicate Payroll',
      description: 'Create copy of existing payroll run',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:preview',
      name: 'Preview Payroll',
      description: 'Preview payroll calculations before finalizing',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:adjust',
      name: 'Adjust Payroll',
      description: 'Make manual adjustments to payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:audit',
      name: 'Audit Payroll',
      description: 'View payroll audit trail',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:compare',
      name: 'Compare Payroll Runs',
      description: 'Compare multiple payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:schedule',
      name: 'Schedule Payroll',
      description: 'Schedule automatic payroll runs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:notifications',
      name: 'Manage Payroll Notifications',
      description: 'Configure payroll notifications',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:history',
      name: 'View Payroll History',
      description: 'View historical payroll data',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:analytics',
      name: 'View Payroll Analytics',
      description: 'Access payroll analytics and insights',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:reconcile',
      name: 'Reconcile Payroll',
      description: 'Reconcile payroll with accounting systems',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:batch',
      name: 'Batch Process Payroll',
      description: 'Process multiple payroll runs in batch',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:template',
      name: 'Manage Payroll Templates',
      description: 'Create and manage payroll templates',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:override',
      name: 'Override Payroll Rules',
      description: 'Override automatic payroll rules',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:corrections',
      name: 'Make Payroll Corrections',
      description: 'Correct errors in processed payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:year-end',
      name: 'Process Year-End Payroll',
      description: 'Handle year-end payroll processing',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:statutory',
      name: 'Manage Statutory Deductions',
      description: 'Configure statutory deductions and contributions',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:exchange-rates',
      name: 'Manage Exchange Rates',
      description: 'Configure currency exchange rates for payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:multi-currency',
      name: 'Multi-Currency Payroll',
      description: 'Process payroll in multiple currencies',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:off-cycle',
      name: 'Process Off-Cycle Payroll',
      description: 'Process off-cycle or supplemental payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:retroactive',
      name: 'Process Retroactive Pay',
      description: 'Calculate and process retroactive pay adjustments',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:advance',
      name: 'Process Pay Advances',
      description: 'Handle employee pay advances',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:final',
      name: 'Process Final Pay',
      description: 'Calculate final pay for terminated employees',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:garnishments',
      name: 'Manage Garnishments',
      description: 'Process wage garnishments and attachments',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:loans',
      name: 'Manage Employee Loans',
      description: 'Track and deduct employee loan repayments',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:benefits-deductions',
      name: 'Manage Benefits Deductions',
      description: 'Configure employee benefits deductions',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:cost-centers',
      name: 'Allocate to Cost Centers',
      description: 'Allocate payroll costs to cost centers',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:projects',
      name: 'Allocate to Projects',
      description: 'Allocate payroll costs to projects',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:gl-export',
      name: 'Export to General Ledger',
      description: 'Export payroll data to general ledger',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:bank-file',
      name: 'Generate Bank Files',
      description: 'Generate bank payment files',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:payslips',
      name: 'Generate Payslips',
      description: 'Generate employee payslips',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:employee-self-service',
      name: 'Employee Self-Service Access',
      description: 'Allow employees to view their payroll data',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:mass-update',
      name: 'Mass Update Payroll Data',
      description: 'Update multiple payroll records simultaneously',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:bulk-corrections',
      name: 'Bulk Corrections',
      description: 'Apply corrections to multiple payroll records',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:compliance',
      name: 'Compliance Reporting',
      description: 'Generate regulatory compliance reports',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:government-reporting',
      name: 'Government Reporting',
      description: 'Submit reports to government agencies',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:variance-analysis',
      name: 'Variance Analysis',
      description: 'Analyze payroll variances between periods',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:costing',
      name: 'Payroll Costing',
      description: 'Calculate true cost of employment',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:forecasting',
      name: 'Payroll Forecasting',
      description: 'Forecast future payroll costs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:budgeting',
      name: 'Payroll Budgeting',
      description: 'Compare payroll against budget',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:simulation',
      name: 'Payroll Simulation',
      description: 'Simulate payroll changes before applying',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:what-if',
      name: 'What-If Analysis',
      description: 'Run what-if scenarios on payroll',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:benchmarking',
      name: 'Payroll Benchmarking',
      description: 'Compare payroll metrics against benchmarks',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:dashboards',
      name: 'Payroll Dashboards',
      description: 'Access payroll dashboards and KPIs',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:alerts',
      name: 'Payroll Alerts',
      description: 'Configure and receive payroll alerts',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:workflows',
      name: 'Manage Payroll Workflows',
      description: 'Configure payroll approval workflows',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:integration',
      name: 'Payroll Integration',
      description: 'Integrate payroll with external systems',
      category: 'payroll',
      is_system: false,
    },
    {
      code: 'paylinq:payroll:api',
      name: 'Payroll API Access',
      description: 'Access payroll data via API',
      category: 'payroll',
      is_system: false,
    },

    // ========================================
    // WORKER TYPES (7 permissions)
    // ========================================
    {
      code: 'paylinq:worker-types:create',
      name: 'Create Worker Types',
      description: 'Create new worker type configurations',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:read',
      name: 'View Worker Types',
      description: 'View worker type details',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:update',
      name: 'Update Worker Types',
      description: 'Modify existing worker types',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:delete',
      name: 'Delete Worker Types',
      description: 'Delete worker type configurations',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:list',
      name: 'List Worker Types',
      description: 'View list of all worker types',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:assign',
      name: 'Assign Worker Types',
      description: 'Assign worker types to employees',
      category: 'worker-types',
      is_system: false,
    },
    {
      code: 'paylinq:worker-types:templates',
      name: 'Manage Worker Type Templates',
      description: 'Create and manage worker type templates',
      category: 'worker-types',
      is_system: false,
    },

    // ========================================
    // PAY COMPONENTS (7 permissions)
    // ========================================
    {
      code: 'paylinq:components:create',
      name: 'Create Pay Components',
      description: 'Create new pay components',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:read',
      name: 'View Pay Components',
      description: 'View pay component details',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:update',
      name: 'Update Pay Components',
      description: 'Modify existing pay components',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:delete',
      name: 'Delete Pay Components',
      description: 'Delete pay components',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:list',
      name: 'List Pay Components',
      description: 'View list of all pay components',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:activate',
      name: 'Activate/Deactivate Components',
      description: 'Change component active status',
      category: 'components',
      is_system: false,
    },
    {
      code: 'paylinq:components:order',
      name: 'Reorder Components',
      description: 'Change component display order',
      category: 'components',
      is_system: false,
    },

    // ========================================
    // FORMULAS (8 permissions)
    // ========================================
    {
      code: 'paylinq:formulas:create',
      name: 'Create Formulas',
      description: 'Create new calculation formulas',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:read',
      name: 'View Formulas',
      description: 'View formula details',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:update',
      name: 'Update Formulas',
      description: 'Modify existing formulas',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:delete',
      name: 'Delete Formulas',
      description: 'Delete formulas',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:list',
      name: 'List Formulas',
      description: 'View list of all formulas',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:test',
      name: 'Test Formulas',
      description: 'Test formula calculations',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:validate',
      name: 'Validate Formulas',
      description: 'Validate formula syntax and logic',
      category: 'formulas',
      is_system: false,
    },
    {
      code: 'paylinq:formulas:version',
      name: 'Manage Formula Versions',
      description: 'Track and manage formula versions',
      category: 'formulas',
      is_system: false,
    },

    // ========================================
    // TAX MANAGEMENT (9 permissions)
    // ========================================
    {
      code: 'paylinq:tax:create',
      name: 'Create Tax Rules',
      description: 'Create new tax rules and configurations',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:read',
      name: 'View Tax Rules',
      description: 'View tax rule details',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:update',
      name: 'Update Tax Rules',
      description: 'Modify existing tax rules',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:delete',
      name: 'Delete Tax Rules',
      description: 'Delete tax rules',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:list',
      name: 'List Tax Rules',
      description: 'View list of all tax rules',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:calculate',
      name: 'Calculate Taxes',
      description: 'Execute tax calculations',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:filing',
      name: 'Tax Filing',
      description: 'Prepare and submit tax filings',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:reports',
      name: 'Tax Reports',
      description: 'Generate tax reports',
      category: 'tax',
      is_system: false,
    },
    {
      code: 'paylinq:tax:year-end',
      name: 'Year-End Tax Processing',
      description: 'Process year-end tax forms',
      category: 'tax',
      is_system: false,
    },

    // ========================================
    // ALLOWANCES (8 permissions)
    // ========================================
    {
      code: 'paylinq:allowances:create',
      name: 'Create Allowances',
      description: 'Create new allowance configurations',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:read',
      name: 'View Allowances',
      description: 'View allowance details',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:update',
      name: 'Update Allowances',
      description: 'Modify existing allowances',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:delete',
      name: 'Delete Allowances',
      description: 'Delete allowances',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:list',
      name: 'List Allowances',
      description: 'View list of all allowances',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:assign',
      name: 'Assign Allowances',
      description: 'Assign allowances to employees',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:calculate',
      name: 'Calculate Allowances',
      description: 'Calculate allowance amounts',
      category: 'allowances',
      is_system: false,
    },
    {
      code: 'paylinq:allowances:history',
      name: 'View Allowance History',
      description: 'View historical allowance data',
      category: 'allowances',
      is_system: false,
    },

    // ========================================
    // DEDUCTIONS (5 permissions)
    // ========================================
    {
      code: 'paylinq:deductions:create',
      name: 'Create Deductions',
      description: 'Create new deduction configurations',
      category: 'deductions',
      is_system: false,
    },
    {
      code: 'paylinq:deductions:read',
      name: 'View Deductions',
      description: 'View deduction details',
      category: 'deductions',
      is_system: false,
    },
    {
      code: 'paylinq:deductions:update',
      name: 'Update Deductions',
      description: 'Modify existing deductions',
      category: 'deductions',
      is_system: false,
    },
    {
      code: 'paylinq:deductions:delete',
      name: 'Delete Deductions',
      description: 'Delete deductions',
      category: 'deductions',
      is_system: false,
    },
    {
      code: 'paylinq:deductions:list',
      name: 'List Deductions',
      description: 'View list of all deductions',
      category: 'deductions',
      is_system: false,
    },

    // ========================================
    // COMPENSATION (4 permissions)
    // ========================================
    {
      code: 'paylinq:compensation:view',
      name: 'View Compensation',
      description: 'View employee compensation details',
      category: 'compensation',
      is_system: false,
    },
    {
      code: 'paylinq:compensation:manage',
      name: 'Manage Compensation',
      description: 'Modify employee compensation',
      category: 'compensation',
      is_system: false,
    },
    {
      code: 'paylinq:compensation:history',
      name: 'View Compensation History',
      description: 'View compensation change history',
      category: 'compensation',
      is_system: false,
    },
    {
      code: 'paylinq:compensation:planning',
      name: 'Compensation Planning',
      description: 'Plan and model compensation changes',
      category: 'compensation',
      is_system: false,
    },

    // ========================================
    // DASHBOARD (1 permission)
    // ========================================
    {
      code: 'paylinq:dashboard:view',
      name: 'View PayLinQ Dashboard',
      description: 'Access PayLinQ main dashboard',
      category: 'dashboard',
      is_system: false,
    },

    // ========================================
    // APPROVALS (3 permissions)
    // ========================================
    {
      code: 'paylinq:approvals:submit',
      name: 'Submit for Approval',
      description: 'Submit payroll for approval',
      category: 'approvals',
      is_system: false,
    },
    {
      code: 'paylinq:approvals:approve',
      name: 'Approve Payroll',
      description: 'Approve submitted payroll',
      category: 'approvals',
      is_system: false,
    },
    {
      code: 'paylinq:approvals:reject',
      name: 'Reject Payroll',
      description: 'Reject submitted payroll',
      category: 'approvals',
      is_system: false,
    },

    // ========================================
    // PAYMENTS (6 permissions)
    // ========================================
    {
      code: 'paylinq:payments:view',
      name: 'View Payments',
      description: 'View payment details',
      category: 'payments',
      is_system: false,
    },
    {
      code: 'paylinq:payments:process',
      name: 'Process Payments',
      description: 'Execute payment processing',
      category: 'payments',
      is_system: false,
    },
    {
      code: 'paylinq:payments:reverse',
      name: 'Reverse Payments',
      description: 'Reverse processed payments',
      category: 'payments',
      is_system: false,
    },
    {
      code: 'paylinq:payments:bank-files',
      name: 'Generate Bank Files',
      description: 'Generate files for bank payments',
      category: 'payments',
      is_system: false,
    },
    {
      code: 'paylinq:payments:reconcile',
      name: 'Reconcile Payments',
      description: 'Reconcile payments with bank statements',
      category: 'payments',
      is_system: false,
    },
    {
      code: 'paylinq:payments:history',
      name: 'View Payment History',
      description: 'View historical payment data',
      category: 'payments',
      is_system: false,
    },

    // ========================================
    // TIMESHEETS (6 permissions)
    // ========================================
    {
      code: 'paylinq:timesheets:view',
      name: 'View Timesheets',
      description: 'View timesheet data',
      category: 'timesheets',
      is_system: false,
    },
    {
      code: 'paylinq:timesheets:import',
      name: 'Import Timesheets',
      description: 'Import timesheet data',
      category: 'timesheets',
      is_system: false,
    },
    {
      code: 'paylinq:timesheets:approve',
      name: 'Approve Timesheets',
      description: 'Approve employee timesheets',
      category: 'timesheets',
      is_system: false,
    },
    {
      code: 'paylinq:timesheets:reject',
      name: 'Reject Timesheets',
      description: 'Reject employee timesheets',
      category: 'timesheets',
      is_system: false,
    },
    {
      code: 'paylinq:timesheets:process',
      name: 'Process Timesheets',
      description: 'Process approved timesheets for payroll',
      category: 'timesheets',
      is_system: false,
    },
    {
      code: 'paylinq:timesheets:corrections',
      name: 'Correct Timesheets',
      description: 'Make corrections to timesheets',
      category: 'timesheets',
      is_system: false,
    },

    // ========================================
    // SCHEDULING (5 permissions)
    // ========================================
    {
      code: 'paylinq:scheduling:view',
      name: 'View Schedules',
      description: 'View payroll schedules',
      category: 'scheduling',
      is_system: false,
    },
    {
      code: 'paylinq:scheduling:create',
      name: 'Create Schedules',
      description: 'Create new payroll schedules',
      category: 'scheduling',
      is_system: false,
    },
    {
      code: 'paylinq:scheduling:update',
      name: 'Update Schedules',
      description: 'Modify payroll schedules',
      category: 'scheduling',
      is_system: false,
    },
    {
      code: 'paylinq:scheduling:delete',
      name: 'Delete Schedules',
      description: 'Delete payroll schedules',
      category: 'scheduling',
      is_system: false,
    },
    {
      code: 'paylinq:scheduling:calendar',
      name: 'Manage Payroll Calendar',
      description: 'Configure payroll calendar and holidays',
      category: 'scheduling',
      is_system: false,
    },

    // ========================================
    // REPORTS (5 permissions)
    // ========================================
    {
      code: 'paylinq:reports:view',
      name: 'View Reports',
      description: 'Access payroll reports',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'paylinq:reports:generate',
      name: 'Generate Reports',
      description: 'Generate custom payroll reports',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'paylinq:reports:export',
      name: 'Export Reports',
      description: 'Export reports to various formats',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'paylinq:reports:schedule',
      name: 'Schedule Reports',
      description: 'Schedule automatic report generation',
      category: 'reports',
      is_system: false,
    },
    {
      code: 'paylinq:reports:custom',
      name: 'Create Custom Reports',
      description: 'Build custom report templates',
      category: 'reports',
      is_system: false,
    },

    // ========================================
    // SETTINGS (8 permissions)
    // ========================================
    {
      code: 'paylinq:settings:view',
      name: 'View PayLinQ Settings',
      description: 'View PayLinQ configuration settings',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:update',
      name: 'Update PayLinQ Settings',
      description: 'Modify PayLinQ settings',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:company',
      name: 'Manage Company Settings',
      description: 'Configure company payroll settings',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:integration',
      name: 'Manage Integrations',
      description: 'Configure external integrations',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:notifications',
      name: 'Configure Notifications',
      description: 'Set up notification preferences',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:security',
      name: 'Security Settings',
      description: 'Configure security and access controls',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:audit',
      name: 'Configure Audit Logging',
      description: 'Set up audit logging preferences',
      category: 'settings',
      is_system: false,
    },
    {
      code: 'paylinq:settings:backup',
      name: 'Backup Settings',
      description: 'Configure data backup options',
      category: 'settings',
      is_system: false,
    },

    // ========================================
    // SYSTEM (1 permission)
    // ========================================
    {
      code: 'paylinq:system:admin',
      name: 'PayLinQ System Administrator',
      description: 'Full system administration access',
      category: 'system',
      is_system: true,
    },
  ];

  // Insert all permissions
  await knex(tableName).insert(permissions);

  console.log(`✓ Seeded ${permissions.length} PayLinQ permissions`);
}
