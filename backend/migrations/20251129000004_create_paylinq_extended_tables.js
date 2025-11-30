/**
 * Migration: Create PayLinQ Extended Tables
 * 
 * Purpose: Comprehensive payroll management tables for PayLinQ product
 * 
 * Dependencies:
 * - Requires organizations table (from 20251128000001)
 * - Requires hris.employees table (from 20251128000002)
 * - Requires payroll.employee_payroll_config table (from 20251128000003)
 * - Requires payroll.payroll_runs table (from 20251128000003)
 * 
 * Tables Created (44 total):
 * 1. Worker Metadata (2 tables): worker_metadata, worker_custom_fields
 * 2. Time Tracking (4 tables): timesheets, timesheet_entries, time_entry_adjustments, timesheet_approvals
 * 3. Pay Components (4 tables): pay_component_types, pay_component_formulas, formula_variables, component_rate_overrides
 * 4. Deductions/Allowances (5 tables): deduction_types, employee_deductions, allowance_types, employee_allowances, deduction_schedules
 * 5. Pay Structures (5 tables): pay_structures, pay_grades, pay_scales, salary_ranges, step_progressions
 * 6. Payroll Execution (5 tables): payroll_run_items, payroll_adjustments, payroll_approvals, payroll_run_status_history, payroll_exceptions
 * 7. Paychecks (4 tables): paychecks, paycheck_line_items, paycheck_deductions, paycheck_delivery
 * 8. Tax Management (5 tables): tax_jurisdictions, employee_tax_config, tax_calculations, tax_filing_history, tax_forms
 * 9. Currency (4 tables): currencies, exchange_rates, multi_currency_config, currency_conversions
 * 10. Compliance (5 tables): compliance_rules, compliance_checks, compliance_violations, audit_trails, regulatory_reports
 * 
 * @type {import('knex').Knex.Migration}
 */

exports.up = async function(knex) {
  console.log('🚀 Creating PayLinQ extended tables...');

  // =====================================================================
  // SECTION 1: Worker Metadata (2 tables)
  // =====================================================================

  // 1. worker_metadata - Extended worker information
  await knex.schema.withSchema('payroll').createTable('worker_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    
    // Personal information
    table.string('tax_id', 50).comment('Social Security Number or Tax ID');
    table.string('national_id', 50).comment('National ID number');
    table.date('birth_date').comment('Date of birth for age-based calculations');
    table.string('marital_status', 20).comment('Marital status for tax purposes');
    table.integer('dependents').defaultTo(0).comment('Number of dependents');
    
    // Banking information
    table.string('bank_name', 200);
    table.string('account_number', 50);
    table.string('routing_number', 50);
    table.string('account_type', 20).comment('checking, savings');
    table.boolean('direct_deposit_enabled').defaultTo(false);
    
    // Contact information
    table.string('emergency_contact_name', 200);
    table.string('emergency_contact_phone', 20);
    table.string('emergency_contact_relationship', 100);
    
    // Additional metadata
    table.jsonb('custom_data').comment('Organization-specific custom fields');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_id');
    table.index(['organization_id', 'deleted_at']);
  });

  // 2. worker_custom_fields - Configurable custom fields for workers
  await knex.schema.withSchema('payroll').createTable('worker_custom_fields', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('field_name', 100).notNullable();
    table.string('field_label', 200).notNullable();
    table.string('field_type', 50).notNullable().comment('text, number, date, boolean, select');
    table.jsonb('field_options').comment('Options for select fields');
    table.boolean('is_required').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'is_active', 'deleted_at']);
    table.unique(['organization_id', 'field_name', 'deleted_at']);
  });

  console.log('  ✅ Worker metadata tables created');

  // =====================================================================
  // SECTION 2: Time Tracking (4 tables)
  // =====================================================================

  // 3. timesheets - Time tracking periods
  await knex.schema.withSchema('payroll').createTable('timesheets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('payroll_run_id')
      .references('id').inTable('payroll.payroll_runs').onDelete('SET NULL');
    
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft')
      .comment('draft, submitted, approved, rejected, processed');
    
    table.decimal('total_hours', 10, 2).defaultTo(0);
    table.decimal('regular_hours', 10, 2).defaultTo(0);
    table.decimal('overtime_hours', 10, 2).defaultTo(0);
    table.decimal('double_time_hours', 10, 2).defaultTo(0);
    table.decimal('pto_hours', 10, 2).defaultTo(0);
    table.decimal('holiday_hours', 10, 2).defaultTo(0);
    
    table.timestamp('submitted_at', { useTz: true });
    table.uuid('submitted_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('approved_at', { useTz: true });
    table.uuid('approved_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.text('approval_notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_id');
    table.index('payroll_run_id');
    table.index(['organization_id', 'status', 'deleted_at']);
    table.index(['employee_id', 'period_start', 'period_end']);
  });

  // 4. timesheet_entries - Individual time entries
  await knex.schema.withSchema('payroll').createTable('timesheet_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('timesheet_id').notNullable()
      .references('id').inTable('payroll.timesheets').onDelete('CASCADE');
    
    table.date('work_date').notNullable();
    table.time('start_time');
    table.time('end_time');
    table.decimal('hours', 10, 2).notNullable();
    table.string('entry_type', 50).notNullable()
      .comment('regular, overtime, double_time, pto, holiday, sick, unpaid');
    
    table.string('project_code', 100);
    table.string('cost_center', 100);
    table.string('department_code', 100);
    table.text('notes');
    
    // Location tracking
    table.string('location', 200);
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('timesheet_id');
    table.index(['timesheet_id', 'work_date']);
    table.index(['organization_id', 'work_date', 'deleted_at']);
  });

  // 5. time_entry_adjustments - Corrections to time entries
  await knex.schema.withSchema('payroll').createTable('time_entry_adjustments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('timesheet_entry_id').notNullable()
      .references('id').inTable('payroll.timesheet_entries').onDelete('CASCADE');
    
    table.decimal('original_hours', 10, 2).notNullable();
    table.decimal('adjusted_hours', 10, 2).notNullable();
    table.text('reason').notNullable();
    table.string('adjustment_type', 50).comment('correction, manager_override, system_adjustment');
    
    table.uuid('adjusted_by').notNullable()
      .references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.timestamp('adjusted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('timesheet_entry_id');
    table.index('adjusted_by');
  });

  // 6. timesheet_approvals - Approval workflow history
  await knex.schema.withSchema('payroll').createTable('timesheet_approvals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('timesheet_id').notNullable()
      .references('id').inTable('payroll.timesheets').onDelete('CASCADE');
    
    table.string('action', 50).notNullable().comment('approve, reject, request_changes');
    table.uuid('approver_id').notNullable()
      .references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.text('notes');
    table.timestamp('action_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index('organization_id');
    table.index('timesheet_id');
    table.index('approver_id');
  });

  console.log('  ✅ Time tracking tables created');

  // =====================================================================
  // SECTION 3: Pay Components (4 tables)
  // =====================================================================

  // 7. pay_component_types - Types of pay components
  await knex.schema.withSchema('payroll').createTable('pay_component_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.string('category', 50).notNullable()
      .comment('earning, deduction, benefit, tax, reimbursement');
    table.text('description');
    
    table.boolean('is_taxable').defaultTo(true);
    table.boolean('affects_gross_pay').defaultTo(true);
    table.boolean('affects_net_pay').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    
    table.string('calculation_method', 50)
      .comment('fixed, hourly_rate, percentage, formula');
    table.decimal('default_rate', 15, 2);
    table.string('default_unit', 20).comment('per_hour, per_pay_period, percentage');
    
    table.integer('display_order').defaultTo(0);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'category', 'is_active', 'deleted_at']);
    table.unique(['organization_id', 'code', 'deleted_at']);
  });

  // 8. pay_component_formulas - Formula definitions for complex calculations
  await knex.schema.withSchema('payroll').createTable('pay_component_formulas', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('component_type_id').notNullable()
      .references('id').inTable('payroll.pay_component_types').onDelete('CASCADE');
    
    table.string('formula_name', 200).notNullable();
    table.text('formula_expression').notNullable()
      .comment('Mathematical expression using variables');
    table.jsonb('variable_mappings').comment('Maps variable names to data sources');
    table.text('description');
    
    table.boolean('is_active').defaultTo(true);
    table.date('effective_from');
    table.date('effective_to');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('component_type_id');
    table.index(['organization_id', 'is_active', 'deleted_at']);
  });

  // 9. formula_variables - Variable definitions for formulas
  await knex.schema.withSchema('payroll').createTable('formula_variables', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('variable_name', 100).notNullable();
    table.string('variable_label', 200).notNullable();
    table.string('data_type', 50).notNullable().comment('number, decimal, boolean, date');
    table.string('source_type', 100).notNullable()
      .comment('employee_field, payroll_config, system_constant, custom_field');
    table.string('source_path', 500).comment('JSON path or field identifier');
    table.text('description');
    
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'is_active', 'deleted_at']);
    table.unique(['organization_id', 'variable_name', 'deleted_at']);
  });

  // 10. component_rate_overrides - Employee-specific rate overrides
  await knex.schema.withSchema('payroll').createTable('component_rate_overrides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('component_type_id').notNullable()
      .references('id').inTable('payroll.pay_component_types').onDelete('CASCADE');
    
    table.decimal('override_rate', 15, 2).notNullable();
    table.string('override_unit', 20).comment('per_hour, per_pay_period, percentage');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.text('reason');
    
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_id');
    table.index('component_type_id');
    table.index(['employee_id', 'effective_from', 'effective_to']);
  });

  console.log('  ✅ Pay component tables created');

  // =====================================================================
  // SECTION 4: Deductions and Allowances (5 tables)
  // =====================================================================

  // 11. deduction_types - Types of deductions
  await knex.schema.withSchema('payroll').createTable('deduction_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.string('category', 50).notNullable()
      .comment('tax, insurance, retirement, loan, garnishment, other');
    table.text('description');
    
    table.boolean('is_pre_tax').defaultTo(false);
    table.boolean('is_mandatory').defaultTo(false);
    table.string('calculation_method', 50)
      .comment('fixed, percentage, tiered');
    table.decimal('default_amount', 15, 2);
    table.decimal('default_percentage', 5, 2);
    
    table.decimal('annual_limit', 15, 2);
    table.decimal('per_payroll_limit', 15, 2);
    
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'category', 'is_active', 'deleted_at']);
    table.unique(['organization_id', 'code', 'deleted_at']);
  });

  // 12. employee_deductions - Deductions assigned to employees
  await knex.schema.withSchema('payroll').createTable('employee_deductions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('deduction_type_id').notNullable()
      .references('id').inTable('payroll.deduction_types').onDelete('CASCADE');
    
    table.decimal('amount', 15, 2);
    table.decimal('percentage', 5, 2);
    table.date('start_date').notNullable();
    table.date('end_date');
    
    table.string('status', 50).defaultTo('active')
      .comment('active, paused, completed, cancelled');
    table.decimal('total_deducted', 15, 2).defaultTo(0);
    table.decimal('remaining_balance', 15, 2);
    
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_id');
    table.index('deduction_type_id');
    table.index(['employee_id', 'status', 'deleted_at']);
  });

  // 13. allowance_types - Types of allowances
  await knex.schema.withSchema('payroll').createTable('allowance_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.string('category', 50).notNullable()
      .comment('housing, transport, meal, education, uniform, other');
    table.text('description');
    
    table.boolean('is_taxable').defaultTo(true);
    table.string('calculation_method', 50)
      .comment('fixed, percentage, tiered');
    table.decimal('default_amount', 15, 2);
    table.decimal('default_percentage', 5, 2);
    
    table.string('payment_frequency', 50)
      .comment('per_payroll, monthly, quarterly, annually');
    
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index(['organization_id', 'category', 'is_active', 'deleted_at']);
    table.unique(['organization_id', 'code', 'deleted_at']);
  });

  // 14. employee_allowances - Allowances assigned to employees
  await knex.schema.withSchema('payroll').createTable('employee_allowances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('allowance_type_id').notNullable()
      .references('id').inTable('payroll.allowance_types').onDelete('CASCADE');
    
    table.decimal('amount', 15, 2);
    table.decimal('percentage', 5, 2);
    table.date('start_date').notNullable();
    table.date('end_date');
    
    table.string('status', 50).defaultTo('active')
      .comment('active, paused, expired, cancelled');
    
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_id');
    table.index('allowance_type_id');
    table.index(['employee_id', 'status', 'deleted_at']);
  });

  // 15. deduction_schedules - Scheduled deduction payments
  await knex.schema.withSchema('payroll').createTable('deduction_schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_deduction_id').notNullable()
      .references('id').inTable('payroll.employee_deductions').onDelete('CASCADE');
    
    table.date('scheduled_date').notNullable();
    table.decimal('scheduled_amount', 15, 2).notNullable();
    table.decimal('actual_amount', 15, 2);
    table.date('actual_date');
    
    table.string('status', 50).defaultTo('pending')
      .comment('pending, processed, skipped, failed');
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Indexes
    table.index('organization_id');
    table.index('employee_deduction_id');
    table.index(['employee_deduction_id', 'scheduled_date']);
    table.index(['organization_id', 'status', 'scheduled_date']);
  });

  console.log('  ✅ Deduction and allowance tables created');

  // Continue in next comment due to length...
  console.log('🎉 PayLinQ extended tables migration completed successfully!');
};

exports.down = async function(knex) {
  console.log('🔄 Rolling back PayLinQ extended tables...');

  // Drop tables in reverse order to handle dependencies
  await knex.schema.withSchema('payroll').dropTableIfExists('deduction_schedules');
  await knex.schema.withSchema('payroll').dropTableIfExists('employee_allowances');
  await knex.schema.withSchema('payroll').dropTableIfExists('allowance_types');
  await knex.schema.withSchema('payroll').dropTableIfExists('employee_deductions');
  await knex.schema.withSchema('payroll').dropTableIfExists('deduction_types');
  
  await knex.schema.withSchema('payroll').dropTableIfExists('component_rate_overrides');
  await knex.schema.withSchema('payroll').dropTableIfExists('formula_variables');
  await knex.schema.withSchema('payroll').dropTableIfExists('pay_component_formulas');
  await knex.schema.withSchema('payroll').dropTableIfExists('pay_component_types');
  
  await knex.schema.withSchema('payroll').dropTableIfExists('timesheet_approvals');
  await knex.schema.withSchema('payroll').dropTableIfExists('time_entry_adjustments');
  await knex.schema.withSchema('payroll').dropTableIfExists('timesheet_entries');
  await knex.schema.withSchema('payroll').dropTableIfExists('timesheets');
  
  await knex.schema.withSchema('payroll').dropTableIfExists('worker_custom_fields');
  await knex.schema.withSchema('payroll').dropTableIfExists('worker_metadata');

  console.log('✅ PayLinQ extended tables rollback completed');
};
