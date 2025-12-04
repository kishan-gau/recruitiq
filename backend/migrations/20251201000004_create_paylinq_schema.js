/**
 * PayLinQ Database Schema Migration
 * 
 * Creates the comprehensive payroll processing schema - aligned with paylinq-schema.sql
 * 
 * Schema: payroll
 * Tables: 50
 * Features: Employee payroll records, compensation, time & attendance,
 *           tax calculation, deductions, pay components, payroll runs,
 *           paychecks, payments, reconciliation, multi-currency support,
 *           approval workflows, template composition system
 * 
 * Version: 2.0.0
 * Created: December 1, 2025
 * Updated: December 1, 2025 - Aligned with paylinq-schema.sql
 */

export async function up(knex) {
  // Create payroll schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');
  
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');
  
  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION payroll.get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id TEXT;
    BEGIN
      org_id := current_setting('app.current_organization_id', true);
      IF org_id IS NULL OR org_id = '' THEN
        RAISE EXCEPTION 'No organization context set. Authentication required.';
      END IF;
      RETURN org_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid organization context: %', SQLERRM;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  `);
  
  await knex.raw(`COMMENT ON FUNCTION payroll.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.'`);
  
  // ================================================================
  // EMPLOYEE PAYROLL CONFIGURATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('employee_payroll_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Pay configuration (ONLY payroll-specific fields)
    table.string('pay_frequency', 20).notNullable();
    table.string('payment_method', 20).notNullable();
    table.string('currency', 3).defaultTo('SRD');
    table.string('payment_currency', 3);
    table.boolean('allow_multi_currency').notNullable().defaultTo(false);
    
    // Bank information (for direct deposit)
    table.string('bank_name', 100);
    table.string('account_number', 50);
    table.string('routing_number', 50);
    table.string('account_type', 20);
    
    // Tax information
    table.string('tax_id', 50);
    table.string('tax_filing_status', 20);
    table.integer('tax_allowances').defaultTo(0);
    table.decimal('additional_withholding', 12, 2).defaultTo(0);
    
    // Payroll status (can differ from employment status)
    table.string('payroll_status', 20).defaultTo('active');
    table.date('payroll_start_date').notNullable();
    table.date('payroll_end_date');
    
    // Additional payroll metadata
    table.jsonb('metadata');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account');
    table.foreign('updated_by').references('id').inTable('hris.user_account');
    table.foreign('deleted_by').references('id').inTable('hris.user_account');
    table.unique(['organization_id', 'employee_id']);
  });
  
  // Add CHECK constraints
  await knex.raw(`
    ALTER TABLE payroll.employee_payroll_config
    ADD CONSTRAINT employee_payroll_config_pay_frequency_check
    CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly'))
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.employee_payroll_config
    ADD CONSTRAINT employee_payroll_config_payment_method_check
    CHECK (payment_method IN ('direct_deposit', 'check', 'cash', 'card'))
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.employee_payroll_config
    ADD CONSTRAINT employee_payroll_config_account_type_check
    CHECK (account_type IN ('checking', 'savings'))
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.employee_payroll_config
    ADD CONSTRAINT employee_payroll_config_payroll_status_check
    CHECK (payroll_status IN ('active', 'suspended', 'terminated'))
  `);
  
  await knex.raw(`COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees. Core employee data is in hris.employee (single source of truth)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.employee_payroll_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data'`);
  
  // ================================================================
  // COMPENSATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('compensation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Worker and Component References
    table.uuid('worker_metadata_id');
    table.uuid('pay_component_id');
    
    // Compensation details (legacy fields for backward compatibility)
    table.string('compensation_type', 20);
    table.decimal('amount', 15, 2); // Fixed amount (e.g., $5000 monthly salary)
    table.decimal('overtime_rate', 12, 2); // Overtime rate (e.g., 1.5x)
    
    // New fields for component-based compensation
    table.decimal('rate', 15, 2);    // Hourly/unit rate (e.g., $25/hour)
    table.decimal('percentage', 5, 2);  // Percentage rate (e.g., 5% commission)
    
    // Configuration
    table.string('calculation_type', 50);
    table.string('frequency', 50);  // How often this component applies
    table.boolean('is_active').notNullable().defaultTo(true);
    
    // Effective dates
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    table.string('currency', 3).defaultTo('SRD');
    
    // Limits and Rules
    table.decimal('min_value', 15, 2);
    table.decimal('max_value', 15, 2);
    table.jsonb('calculation_rules');  // Complex calculation rules
    
    // Notes
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account');
    table.foreign('updated_by').references('id').inTable('hris.user_account');
    table.foreign('deleted_by').references('id').inTable('hris.user_account');
    
    // Legacy unique constraint - ensures one compensation record per employee per effective date
    table.unique(['employee_id', 'effective_from']);
  });
  
  // Add CHECK constraints for compensation
  await knex.raw(`
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT compensation_type_check
    CHECK (compensation_type IN ('hourly', 'salary', 'commission', 'bonus'))
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT calculation_type_check
    CHECK (calculation_type IN ('fixed', 'hourly', 'percentage', 'formula'))
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT check_amount_or_rate
    CHECK (
      (calculation_type = 'fixed' AND amount IS NOT NULL) OR
      (calculation_type = 'hourly' AND rate IS NOT NULL) OR
      (calculation_type = 'percentage' AND percentage IS NOT NULL) OR
      (calculation_type = 'formula') OR
      (calculation_type IS NULL AND compensation_type IS NOT NULL)
    )
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT check_effective_dates
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
  `);
  
  await knex.raw(`
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT unique_worker_component
    UNIQUE (organization_id, worker_metadata_id, pay_component_id, effective_from, deleted_at)
  `);
  
  await knex.raw(`COMMENT ON TABLE payroll.compensation IS 'Compensation records - links workers to pay components with specific rates and rules. Supports both legacy (employee-based) and new (component-based) compensation models.'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.worker_metadata_id IS 'References worker_metadata - for component-based compensation assignments'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.pay_component_id IS 'References pay_component - specific compensation component being assigned'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.amount IS 'Fixed amount per pay period (e.g., $5000/month salary)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.rate IS 'Hourly/unit rate (e.g., $25/hour)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.percentage IS 'Percentage rate (e.g., 5% commission)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.compensation.calculation_type IS 'How to calculate compensation: fixed, hourly, percentage, or formula-based'`);
  
  // ================================================================
  // WORKER METADATA
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('worker_type_code', 50).notNullable();
    table.boolean('is_payroll_eligible').defaultTo(true);
    table.string('pay_frequency', 50);
    table.string('default_pay_currency', 3).defaultTo('SRD');
    table.boolean('is_suriname_resident').defaultTo(true);
    table.boolean('overtime_tax_article_17c_opt_in').defaultTo(false);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.unique(['organization_id', 'employee_id']);
  });
  
  // ================================================================
  // WORKER TYPE PAY CONFIGURATION  
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_type_pay_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('worker_type_id').notNullable();
    table.string('pay_structure_template_code', 50);
    table.string('default_pay_frequency', 50).notNullable();
    table.string('default_payment_method', 20);
    table.boolean('overtime_eligible').defaultTo(false);
    table.boolean('benefits_eligible').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.jsonb('default_components').defaultTo('[]');
    table.jsonb('config_metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('worker_type_id').references('id').inTable('hris.worker_type').onDelete('CASCADE');
    table.unique(['organization_id', 'worker_type_id']);
  });
  
  // ================================================================
  // WORKER TYPE HISTORY
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_type_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('worker_type_id').notNullable();
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    
    // Payroll Overrides (optional, defaults come from pay config)
    table.string('pay_frequency', 20);
    table.string('payment_method', 20);
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('worker_type_id').references('id').inTable('hris.worker_type').onDelete('CASCADE');
    table.unique(['organization_id', 'employee_id', 'worker_type_id', 'effective_from']);
  });
  
  // ================================================================
  // SHIFT TYPE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('shift_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('shift_code', 50).notNullable();
    table.string('shift_name', 100).notNullable();
    table.text('description');
    table.time('default_start_time');
    table.time('default_end_time');
    table.decimal('default_hours', 5, 2);
    table.decimal('differential_rate', 5, 4).defaultTo(1.0);
    table.boolean('is_night_shift').defaultTo(false);
    table.boolean('is_weekend_shift').defaultTo(false);
    table.string('status', 20).notNullable().defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'shift_code']);
  });
  
  // ================================================================
  // TIME ATTENDANCE EVENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('time_attendance_event', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('event_type', 20).notNullable();
    table.timestamp('event_timestamp', { useTz: true }).notNullable();
    table.string('location_type', 20).defaultTo('office');
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('ip_address', 45);
    table.string('device_id', 100);
    table.string('device_type', 50);
    table.string('status', 20).defaultTo('recorded');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // ================================================================
  // TIME ENTRY
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('time_entry', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('timesheet_id');
    
    // Time entry details
    table.date('entry_date').notNullable();
    table.timestamp('clock_in', { useTz: true });
    table.timestamp('clock_out', { useTz: true });
    
    // Hours breakdown
    table.decimal('worked_hours', 5, 2).notNullable().defaultTo(0);
    table.decimal('regular_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('break_hours', 5, 2).defaultTo(0);
    
    // Shift association
    table.uuid('shift_type_id');
    
    // Entry metadata
    table.string('entry_type', 20).defaultTo('regular');
    table.string('status', 20).defaultTo('draft');
    table.text('notes');
    
    // Approval tracking
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    
    // Link to clock events
    table.uuid('clock_in_event_id');
    table.uuid('clock_out_event_id');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('shift_type_id').references('id').inTable('payroll.shift_type');
    table.foreign('clock_in_event_id').references('id').inTable('payroll.time_attendance_event');
    table.foreign('clock_out_event_id').references('id').inTable('payroll.time_attendance_event');
  });
  
  // ================================================================
  // TIMESHEET
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('timesheet', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('regular_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('pto_hours', 5, 2).defaultTo(0);
    table.decimal('sick_hours', 5, 2).defaultTo(0);
    table.string('status', 20).defaultTo('draft');
    table.text('notes');
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    table.uuid('rejected_by');
    table.timestamp('rejected_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('approved_by').references('id').inTable('hris.user_account');
    table.foreign('rejected_by').references('id').inTable('hris.user_account');
    table.unique(['employee_id', 'period_start', 'period_end']);
  });
  
  // Add FK from time_entry to timesheet
  await knex.schema.withSchema('payroll').alterTable('time_entry', (table) => {
    table.foreign('timesheet_id').references('id').inTable('payroll.timesheet').onDelete('SET NULL');
  });
  
  // ================================================================
  // PAY COMPONENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_component', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('component_code', 50).notNullable();
    table.string('component_name', 100).notNullable();
    table.text('description');
    table.string('component_type', 30).notNullable();
    table.string('category', 50);
    table.string('calculation_type', 20).notNullable();
    table.decimal('default_rate', 12, 2);
    table.decimal('default_amount', 12, 2);
    table.text('formula');
    table.decimal('default_percentage', 8, 4);
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.boolean('is_taxable').defaultTo(true);
    table.string('tax_category', 50);
    table.boolean('affects_gross_pay').defaultTo(true);
    table.boolean('is_recurring').defaultTo(true);
    table.boolean('is_system_component').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.string('status', 20).defaultTo('active');
    table.uuid('formula_id');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'component_code']);
  });
  
  // Add CHECK constraint for calculation_type
  await knex.raw(`
    ALTER TABLE payroll.pay_component
    ADD CONSTRAINT pay_component_calculation_type_check
    CHECK (calculation_type IN ('fixed_amount', 'percentage', 'hourly_rate', 'formula', 'rate'))
  `);
  
  // Add CHECK constraint for component_type
  await knex.raw(`
    ALTER TABLE payroll.pay_component
    ADD CONSTRAINT pay_component_type_check
    CHECK (component_type IN ('earning', 'deduction', 'employer_contribution'))
  `);
  
  // Add CHECK constraint for status
  await knex.raw(`
    ALTER TABLE payroll.pay_component
    ADD CONSTRAINT pay_component_status_check
    CHECK (status IN ('active', 'inactive'))
  `);
  
  // ================================================================
  // COMPONENT FORMULA
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('component_formula', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('pay_component_id');
    table.string('formula_name', 100).notNullable();
    table.text('formula_expression').notNullable();
    table.text('description');
    table.jsonb('formula_ast');
    table.jsonb('required_variables').defaultTo('[]');
    table.jsonb('conditional_rules').defaultTo('{}');
    table.boolean('is_validated').defaultTo(false);
    table.timestamp('validated_at', { useTz: true });
    table.boolean('is_active').defaultTo(true);
    table.string('version', 20).defaultTo('1.0.0');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // Add FK from pay_component to component_formula
  await knex.schema.withSchema('payroll').alterTable('pay_component', (table) => {
    table.foreign('formula_id').references('id').inTable('payroll.component_formula').onDelete('SET NULL');
  });
  
  // Add FK from component_formula to pay_component
  await knex.schema.withSchema('payroll').alterTable('component_formula', (table) => {
    table.foreign('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('CASCADE');
  });
  
  // ================================================================
  // EMPLOYEE PAY COMPONENT ASSIGNMENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('employee_pay_component_assignment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('component_id').notNullable();
    table.string('component_code', 50).notNullable();
    table.decimal('amount', 15, 4);
    table.decimal('percentage', 8, 4);
    table.jsonb('configuration').defaultTo('{}');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_override').defaultTo(false);
    table.text('override_reason');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('component_id').references('id').inTable('payroll.pay_component').onDelete('CASCADE');
  });
  
  // ================================================================
  // FORMULA EXECUTION LOG
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('formula_execution_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('pay_component_id');
    table.uuid('payroll_run_id');
    table.uuid('employee_id');
    table.string('formula_version', 20);
    table.jsonb('input_values').defaultTo('{}');
    table.decimal('output_value', 15, 4);
    table.jsonb('execution_context').defaultTo('{}');
    table.integer('execution_time_ms');
    table.timestamp('executed_at', { useTz: true }).defaultTo(knex.fn.now());
    table.boolean('is_success').defaultTo(true);
    table.text('error_message');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // ================================================================
  // RATED TIME LINE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('rated_time_line', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('time_entry_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('rate_type', 50).notNullable();
    table.decimal('hours', 6, 2).notNullable();
    table.decimal('rate', 15, 4).notNullable();
    table.decimal('amount', 15, 4).notNullable();
    table.decimal('multiplier', 5, 2).defaultTo(1.0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('time_entry_id').references('id').inTable('payroll.time_entry').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // ================================================================
  // EMPLOYEE DEDUCTION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('employee_deduction', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 100).notNullable();
    table.string('deduction_type', 50).notNullable();
    table.string('calculation_type', 50).notNullable();
    table.decimal('amount', 15, 4);
    table.decimal('percentage', 8, 4);
    table.decimal('max_amount', 15, 4);
    table.decimal('goal_amount', 15, 4);
    table.decimal('current_balance', 15, 4).defaultTo(0);
    table.integer('priority').defaultTo(0);
    table.boolean('is_pre_tax').defaultTo(false);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // ================================================================
  // TAX RULE SET
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('tax_rule_set', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('tax_type', 50).notNullable();
    table.string('tax_name', 100).notNullable();
    table.text('description');
    table.string('country', 2).defaultTo('SR');
    table.string('state', 50);
    table.string('locality', 100);
    table.decimal('annual_cap', 12, 2);
    table.string('calculation_method', 20).defaultTo('bracket');
    table.string('calculation_mode', 30).defaultTo('proportional_distribution');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // TAX BRACKET
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('tax_bracket', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('tax_rule_set_id').notNullable();
    table.integer('bracket_order').notNullable();
    table.decimal('income_min', 12, 2).notNullable();
    table.decimal('income_max', 12, 2);
    table.decimal('rate_percentage', 5, 2).notNullable();
    table.decimal('fixed_amount', 12, 2).defaultTo(0);
    table.text('description');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('tax_rule_set_id').references('id').inTable('payroll.tax_rule_set').onDelete('CASCADE');
    table.unique(['tax_rule_set_id', 'bracket_order']);
  });
  
  // ================================================================
  // ALLOWANCE (Tax-free allowances)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('allowance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Allowance details
    table.string('allowance_type', 50).notNullable(); // 'personal', 'dependent', 'disability', 'veteran', 'tax_free_sum_monthly', 'holiday_allowance', 'bonus_gratuity'
    table.string('allowance_name', 100).notNullable();
    
    // Jurisdiction
    table.string('country', 2).defaultTo('SR');
    table.string('state', 50);
    
    // Amount
    table.decimal('amount', 12, 2).notNullable();
    table.boolean('is_percentage').defaultTo(false); // Is amount a percentage or fixed
    
    // Effective dates
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    
    table.text('description');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account');
  });
  
  // ================================================================
  // LOONTIJDVAK (Surinamese wage tax periods)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('loontijdvak', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('period_code', 20).notNullable();
    table.string('period_name', 100).notNullable();
    table.integer('periods_per_year').notNullable();
    table.decimal('factor', 8, 4).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'period_code']);
  });
  
  // ================================================================
  // DEDUCTIBLE COST RULE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('deductible_cost_rule', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('cost_type', 50).notNullable();
    table.string('cost_name', 100).notNullable();
    table.string('country', 2).defaultTo('SR');
    table.string('state', 50);
    table.decimal('amount', 12, 2).notNullable();
    table.boolean('is_percentage').defaultTo(false);
    table.decimal('max_deduction', 12, 2);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.text('description');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // EMPLOYEE ALLOWANCE USAGE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('employee_allowance_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('allowance_type', 50).notNullable();
    table.integer('calendar_year').notNullable();
    table.decimal('amount_used', 12, 2).defaultTo(0);
    table.decimal('amount_remaining', 12, 2);
    table.timestamp('last_updated', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations');
    table.foreign('employee_id').references('id').inTable('hris.employee');
    table.unique(['employee_id', 'allowance_type', 'calendar_year']);
  });
  
  // ================================================================
  // PAYROLL RUN TYPE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_run_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('type_code', 50).notNullable();
    table.string('type_name', 100).notNullable();
    table.text('description');
    table.uuid('default_template_id');
    table.string('component_override_mode', 20).defaultTo('template');
    table.jsonb('allowed_components');
    table.jsonb('excluded_components');
    table.boolean('is_system_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.string('icon', 50);
    table.string('color', 7);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'type_code']);
  });
  
  // ================================================================
  // PAYROLL RUN
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_run', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('run_number', 50).notNullable();
    table.string('run_name', 100).notNullable();
    table.string('run_type', 50).defaultTo('Regular');
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('payment_date').notNullable();
    table.integer('total_employees').defaultTo(0);
    table.decimal('total_gross_pay', 12, 2).defaultTo(0);
    table.decimal('total_net_pay', 12, 2).defaultTo(0);
    table.decimal('total_taxes', 12, 2).defaultTo(0);
    table.decimal('total_deductions', 12, 2).defaultTo(0);
    table.string('status', 20).defaultTo('draft');
    table.timestamp('calculated_at', { useTz: true });
    table.timestamp('approved_at', { useTz: true });
    table.uuid('approved_by');
    table.timestamp('processed_at', { useTz: true });
    table.uuid('processed_by');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'run_number']);
  });
  
  // Add FK from formula_execution_log to payroll_run
  await knex.schema.withSchema('payroll').alterTable('formula_execution_log', (table) => {
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_run').onDelete('CASCADE');
  });
  
  // ================================================================
  // PAYCHECK
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('paycheck', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.date('payment_date').notNullable();
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.decimal('gross_pay', 12, 2).notNullable().defaultTo(0);
    table.decimal('regular_pay', 12, 2).defaultTo(0);
    table.decimal('overtime_pay', 12, 2).defaultTo(0);
    table.decimal('bonus_pay', 12, 2).defaultTo(0);
    table.decimal('commission_pay', 12, 2).defaultTo(0);
    table.decimal('taxable_income', 12, 2).defaultTo(0);
    table.decimal('tax_free_allowance', 12, 2).defaultTo(0);
    table.decimal('federal_tax', 12, 2).defaultTo(0);
    table.decimal('state_tax', 12, 2).defaultTo(0);
    table.decimal('local_tax', 12, 2).defaultTo(0);
    table.decimal('social_security', 12, 2).defaultTo(0);
    table.decimal('medicare', 12, 2).defaultTo(0);
    table.decimal('wage_tax', 12, 2).defaultTo(0);
    table.decimal('aov_tax', 12, 2).defaultTo(0);
    table.decimal('aww_tax', 12, 2).defaultTo(0);
    table.decimal('pre_tax_deductions', 12, 2).defaultTo(0);
    table.decimal('post_tax_deductions', 12, 2).defaultTo(0);
    table.decimal('other_deductions', 12, 2).defaultTo(0);
    table.decimal('net_pay', 12, 2).notNullable().defaultTo(0);
    table.string('base_currency', 3).defaultTo('SRD');
    table.string('payment_currency', 3);
    table.decimal('exchange_rate_used', 18, 8);
    table.jsonb('conversion_summary').defaultTo('{}');
    table.string('payment_method', 20);
    table.string('check_number', 50);
    table.string('status', 20).defaultTo('pending');
    table.timestamp('paid_at', { useTz: true });
    table.timestamp('payslip_sent_at', { useTz: true });
    table.string('payslip_sent_to', 255);
    table.string('payslip_send_status', 20);
    table.text('payslip_send_error');
    table.uuid('payslip_template_id');
    table.jsonb('payslip_template_snapshot');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_run').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee');
  });
  
  // ================================================================
  // PAYROLL RUN COMPONENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_run_component', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_id').notNullable();
    table.uuid('paycheck_id').notNullable();
    table.string('component_type', 20).notNullable();
    table.string('component_code', 50).notNullable();
    table.string('component_name', 100).notNullable();
    table.decimal('units', 12, 2);
    table.decimal('rate', 12, 2);
    table.decimal('amount', 12, 2).notNullable();
    table.string('component_currency', 3);
    table.decimal('original_amount', 15, 2);
    table.decimal('converted_amount', 15, 2);
    table.bigInteger('conversion_id');
    table.decimal('exchange_rate_used', 18, 8);
    table.jsonb('conversion_metadata').defaultTo('{}');
    table.boolean('is_taxable').defaultTo(true);
    table.string('tax_category', 50);
    table.uuid('worker_structure_id');
    table.string('structure_template_version', 20);
    table.jsonb('component_config_snapshot');
    table.jsonb('calculation_metadata');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_run').onDelete('CASCADE');
    table.foreign('paycheck_id').references('id').inTable('payroll.paycheck').onDelete('CASCADE');
  });
  
  // ================================================================
  // PAYSLIP TEMPLATE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payslip_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('template_name', 100).notNullable();
    table.string('template_code', 50).notNullable();
    table.text('description');
    table.string('status', 20).defaultTo('draft');
    table.boolean('is_default').defaultTo(false);
    table.string('layout_type', 50).defaultTo('standard');
    table.boolean('show_company_logo').defaultTo(true);
    table.text('company_logo_url');
    table.text('header_text');
    table.string('header_color', 7).defaultTo('#10b981');
    table.boolean('show_employee_info').defaultTo(true);
    table.boolean('show_payment_details').defaultTo(true);
    table.boolean('show_earnings_section').defaultTo(true);
    table.boolean('show_deductions_section').defaultTo(true);
    table.boolean('show_taxes_section').defaultTo(true);
    table.boolean('show_leave_balances').defaultTo(false);
    table.boolean('show_ytd_totals').defaultTo(true);
    table.boolean('show_qr_code').defaultTo(false);
    table.jsonb('custom_sections');
    table.jsonb('field_configuration');
    table.string('font_family', 50).defaultTo('Arial');
    table.integer('font_size').defaultTo(10);
    table.string('primary_color', 7).defaultTo('#10b981');
    table.string('secondary_color', 7).defaultTo('#6b7280');
    table.text('footer_text');
    table.boolean('show_confidentiality_notice').defaultTo(true);
    table.text('confidentiality_text');
    table.string('page_size', 20).defaultTo('A4');
    table.string('page_orientation', 20).defaultTo('portrait');
    table.string('language', 10).defaultTo('en');
    table.string('currency_display_format', 50).defaultTo('SRD #,##0.00');
    table.string('date_format', 50).defaultTo('MMM dd, yyyy');
    table.jsonb('display_rules');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'template_code']);
  });
  
  // Add FK from paycheck to payslip_template
  await knex.schema.withSchema('payroll').alterTable('paycheck', (table) => {
    table.foreign('payslip_template_id').references('id').inTable('payroll.payslip_template').onDelete('SET NULL');
  });
  
  // ================================================================
  // PAYSLIP TEMPLATE ASSIGNMENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payslip_template_assignment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('template_id').notNullable();
    table.string('assignment_type', 50).notNullable();
    table.uuid('worker_type_id');
    table.uuid('department_id');
    table.uuid('employee_id');
    table.uuid('pay_structure_template_id');
    table.integer('priority').defaultTo(0);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('payroll.payslip_template').onDelete('CASCADE');
    table.foreign('worker_type_id').references('id').inTable('hris.worker_type');
    table.foreign('employee_id').references('id').inTable('hris.employee');
  });
  
  // ================================================================
  // PAYMENT TRANSACTION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payment_transaction', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('paycheck_id');
    table.uuid('payroll_run_id');
    table.uuid('employee_id');
    table.string('payment_method', 20).notNullable();
    table.decimal('payment_amount', 12, 2).notNullable();
    table.date('payment_date');
    table.date('scheduled_date').notNullable();
    table.string('transaction_reference', 100);
    table.string('bank_account_number', 50);
    table.string('routing_number', 50);
    table.string('payment_status', 20).defaultTo('pending');
    table.timestamp('processed_at', { useTz: true });
    table.timestamp('failed_at', { useTz: true });
    table.text('failure_reason');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('reconciled_at', { useTz: true });
    table.uuid('reconciled_by');
    table.string('currency', 3).defaultTo('SRD');
    table.string('processor_name', 50);
    table.string('processor_transaction_id', 100);
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('paycheck_id').references('id').inTable('payroll.paycheck');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_run');
    table.foreign('employee_id').references('id').inTable('hris.employee');
  });
  
  // ================================================================
  // RECONCILIATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('reconciliation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_id');
    table.string('reconciliation_type', 20).notNullable();
    table.date('reconciliation_date').notNullable();
    table.decimal('expected_total', 12, 2);
    table.decimal('actual_total', 12, 2);
    table.decimal('variance_amount', 12, 2);
    table.string('status', 20).defaultTo('pending');
    table.uuid('reconciled_by');
    table.timestamp('reconciled_at', { useTz: true });
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_run');
  });
  
  // ================================================================
  // RECONCILIATION ITEM
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('reconciliation_item', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('reconciliation_id').notNullable();
    table.string('item_type', 50).notNullable();
    table.string('item_reference', 100);
    table.decimal('expected_amount', 12, 2);
    table.decimal('actual_amount', 12, 2);
    table.decimal('variance_amount', 12, 2);
    table.boolean('is_reconciled').defaultTo(false);
    table.timestamp('reconciled_at', { useTz: true });
    table.text('reconciliation_notes');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('reconciliation_id').references('id').inTable('payroll.reconciliation').onDelete('CASCADE');
  });
  
  // ================================================================
  // WORK SCHEDULE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('work_schedule', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('shift_type_id');
    table.date('schedule_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.decimal('duration_hours', 5, 2).notNullable();
    table.string('status', 20).defaultTo('scheduled');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('shift_type_id').references('id').inTable('payroll.shift_type');
    table.unique(['employee_id', 'schedule_date', 'start_time']);
  });
  
  // ================================================================
  // SCHEDULE CHANGE REQUEST
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('schedule_change_request', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('work_schedule_id');
    table.uuid('requested_by');
    table.string('request_type', 20).notNullable();
    table.date('original_date');
    table.date('proposed_date');
    table.uuid('original_shift_type_id');
    table.uuid('proposed_shift_type_id');
    table.text('reason');
    table.string('status', 20).defaultTo('pending');
    table.uuid('reviewed_by');
    table.timestamp('reviewed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('work_schedule_id').references('id').inTable('payroll.work_schedule');
    table.foreign('requested_by').references('id').inTable('hris.employee');
    table.foreign('original_shift_type_id').references('id').inTable('payroll.shift_type');
    table.foreign('proposed_shift_type_id').references('id').inTable('payroll.shift_type');
  });
  
  // ================================================================
  // PAY STRUCTURE TEMPLATE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('template_code', 50).notNullable();
    table.string('template_name', 100).notNullable();
    table.text('description');
    table.integer('version_major').notNullable().defaultTo(1);
    table.integer('version_minor').notNullable().defaultTo(0);
    table.integer('version_patch').notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('draft');
    table.specificType('applicable_to_worker_types', 'VARCHAR(50)[]');
    table.specificType('applicable_to_jurisdictions', 'VARCHAR(10)[]');
    table.string('pay_frequency', 20);
    table.string('currency', 3).defaultTo('SRD');
    table.boolean('is_organization_default').defaultTo(false);
    table.boolean('is_template').defaultTo(false);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.timestamp('published_at', { useTz: true });
    table.uuid('published_by');
    table.timestamp('deprecated_at', { useTz: true });
    table.uuid('deprecated_by');
    table.text('deprecation_reason');
    table.text('change_summary');
    table.specificType('tags', 'VARCHAR(50)[]');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // Add FK from payslip_template_assignment to pay_structure_template
  await knex.schema.withSchema('payroll').alterTable('payslip_template_assignment', (table) => {
    table.foreign('pay_structure_template_id').references('id').inTable('payroll.pay_structure_template').onDelete('SET NULL');
  });
  
  // Add FK from payroll_run_type to pay_structure_template
  await knex.schema.withSchema('payroll').alterTable('payroll_run_type', (table) => {
    table.foreign('default_template_id').references('id').inTable('payroll.pay_structure_template').onDelete('SET NULL');
  });
  
  // ================================================================
  // PAY STRUCTURE COMPONENT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_component', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('template_id').notNullable();
    table.uuid('pay_component_id');
    table.string('component_code', 50).notNullable();
    table.string('component_name', 100).notNullable();
    table.string('component_category', 50).notNullable();
    table.string('calculation_type', 20).notNullable();
    table.decimal('default_amount', 12, 4);
    table.string('default_currency', 3);
    table.string('percentage_of', 50);
    table.decimal('percentage_rate', 6, 4);
    table.text('formula_expression');
    table.jsonb('formula_variables');
    table.jsonb('formula_ast');
    table.decimal('rate_multiplier', 6, 4);
    table.string('applies_to_hours_type', 20);
    table.jsonb('tier_configuration');
    table.string('tier_basis', 50);
    table.integer('sequence_order').notNullable();
    table.specificType('depends_on_components', 'VARCHAR(50)[]');
    table.boolean('is_mandatory').defaultTo(false);
    table.boolean('is_taxable').defaultTo(true);
    table.boolean('affects_gross_pay').defaultTo(true);
    table.boolean('affects_net_pay').defaultTo(true);
    table.string('tax_category', 50);
    table.string('accounting_code', 50);
    table.decimal('min_amount', 12, 4);
    table.decimal('max_amount', 12, 4);
    table.decimal('min_percentage', 6, 4);
    table.decimal('max_percentage', 6, 4);
    table.decimal('max_annual', 12, 4);
    table.decimal('max_per_period', 12, 4);
    table.boolean('allow_worker_override').defaultTo(false);
    table.specificType('override_allowed_fields', 'VARCHAR(50)[]');
    table.boolean('requires_approval').defaultTo(false);
    table.boolean('display_on_payslip').defaultTo(true);
    table.string('display_name', 100);
    table.integer('display_order');
    table.string('display_category', 50);
    table.jsonb('conditions');
    table.boolean('is_conditional').defaultTo(false);
    table.text('description');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('template_id').references('id').inTable('payroll.pay_structure_template').onDelete('CASCADE');
    table.foreign('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('SET NULL');
    table.unique(['template_id', 'component_code']);
  });
  
  // ================================================================
  // WORKER PAY STRUCTURE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_pay_structure', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('template_version_id').notNullable();
    table.decimal('base_salary', 12, 4);
    table.string('assignment_type', 20).notNullable();
    table.string('assignment_source', 50);
    table.uuid('assigned_by');
    table.text('assignment_reason');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    table.string('pay_frequency', 20);
    table.string('currency', 3);
    table.string('approval_status', 20).defaultTo('approved');
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    table.text('rejection_reason');
    table.specificType('tags', 'VARCHAR(50)[]');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('template_version_id').references('id').inTable('payroll.pay_structure_template');
  });
  
  // Add FK from payroll_run_component to worker_pay_structure
  await knex.schema.withSchema('payroll').alterTable('payroll_run_component', (table) => {
    table.foreign('worker_structure_id').references('id').inTable('payroll.worker_pay_structure');
  });
  
  // ================================================================
  // WORKER PAY STRUCTURE COMPONENT OVERRIDE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_pay_structure_component_override', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('worker_structure_id').notNullable();
    table.string('component_code', 50).notNullable();
    table.string('override_type', 20).notNullable();
    table.decimal('override_amount', 12, 4);
    table.decimal('override_percentage', 6, 4);
    table.text('override_formula');
    table.jsonb('override_formula_variables');
    table.decimal('override_rate', 12, 4);
    table.boolean('is_disabled').defaultTo(false);
    table.string('component_currency', 3);
    table.boolean('currency_conversion_required').notNullable().defaultTo(false);
    table.jsonb('custom_component_definition');
    table.jsonb('override_conditions');
    table.decimal('override_min_amount', 12, 4);
    table.decimal('override_max_amount', 12, 4);
    table.decimal('override_max_annual', 12, 4);
    table.text('override_reason').notNullable();
    table.text('business_justification');
    table.boolean('requires_approval').defaultTo(false);
    table.string('approval_status', 20).defaultTo('approved');
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    table.text('rejection_reason');
    table.date('effective_from');
    table.date('effective_to');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('worker_structure_id').references('id').inTable('payroll.worker_pay_structure').onDelete('CASCADE');
    table.unique(['worker_structure_id', 'component_code']);
  });
  
  // ================================================================
  // PAY STRUCTURE TEMPLATE CHANGELOG
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_template_changelog', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('template_id').notNullable();
    table.string('from_version', 20);
    table.string('to_version', 20).notNullable();
    table.string('change_type', 20).notNullable();
    table.text('change_summary').notNullable();
    table.jsonb('changes_detail');
    table.boolean('breaking_changes').defaultTo(false);
    table.text('breaking_changes_description');
    table.integer('affected_worker_count');
    table.boolean('requires_worker_migration').defaultTo(false);
    table.text('migration_instructions');
    table.boolean('auto_migrate').defaultTo(false);
    table.jsonb('changelog_entries');
    table.uuid('changed_by').notNullable();
    table.timestamp('changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.foreign('template_id').references('id').inTable('payroll.pay_structure_template').onDelete('CASCADE');
  });
  
  // ================================================================
  // PAY STRUCTURE TEMPLATE INCLUSION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_template_inclusion', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('parent_template_id').notNullable();
    table.string('included_template_code', 50).notNullable();
    table.integer('inclusion_priority').notNullable().defaultTo(1);
    table.string('inclusion_mode', 20).notNullable().defaultTo('merge');
    table.string('version_constraint', 20);
    table.uuid('pinned_version_id');
    table.jsonb('component_filter');
    table.date('effective_from').notNullable().defaultTo(knex.fn.now());
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    table.text('inclusion_reason');
    table.specificType('tags', 'VARCHAR(50)[]');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('parent_template_id').references('id').inTable('payroll.pay_structure_template').onDelete('CASCADE');
    table.foreign('pinned_version_id').references('id').inTable('payroll.pay_structure_template').onDelete('SET NULL');
  });
  
  // ================================================================
  // PAY STRUCTURE TEMPLATE INCLUSION AUDIT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_template_inclusion_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('inclusion_id').notNullable();
    table.uuid('parent_template_id').notNullable();
    table.string('included_template_code', 50).notNullable();
    table.string('change_type', 20).notNullable();
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.text('change_reason');
    table.uuid('changed_by').notNullable();
    table.timestamp('changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // PAY STRUCTURE TEMPLATE RESOLUTION CACHE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_template_resolution_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('template_id').notNullable();
    table.specificType('resolved_template_ids', 'UUID[]');
    table.jsonb('resolved_components');
    table.jsonb('resolution_metadata').comment('Metadata about the resolution process (context, options, etc.)');
    table.integer('resolution_depth');
    table.string('cache_key', 255).notNullable();
    table.timestamp('resolved_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true });
    table.boolean('is_valid').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).comment('Last time this cache entry was updated');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('payroll.pay_structure_template').onDelete('CASCADE');
    table.unique(['template_id', 'cache_key', 'organization_id']);
  });
  
  // ================================================================
  // PAY PERIOD CONFIG
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_period_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('pay_frequency', 20).notNullable();
    table.date('period_start_date').notNullable();
    table.integer('pay_day_offset').notNullable().defaultTo(0);
    table.integer('first_pay_day');
    table.integer('second_pay_day');
    table.boolean('is_active').defaultTo(true);
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // COMPANY HOLIDAY
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('company_holiday', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('holiday_name', 100).notNullable();
    table.date('holiday_date').notNullable();
    table.boolean('is_recurring').defaultTo(false);
    table.boolean('affects_pay_schedule').defaultTo(true);
    table.boolean('affects_work_schedule').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // EXCHANGE RATE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('exchange_rate', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable();
    table.string('from_currency', 3).notNullable();
    table.string('to_currency', 3).notNullable();
    table.decimal('rate', 18, 8).notNullable();
    table.timestamp('effective_from', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('effective_to', { useTz: true });
    table.string('source', 50).notNullable().defaultTo('manual');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'from_currency', 'to_currency', 'effective_from']);
  });
  
  // ================================================================
  // CURRENCY CONVERSION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currency_conversion', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable();
    table.string('from_currency', 3).notNullable();
    table.string('to_currency', 3).notNullable();
    table.decimal('from_amount', 15, 2).notNullable();
    table.decimal('to_amount', 15, 2).notNullable();
    table.bigInteger('exchange_rate_id');
    table.decimal('rate_used', 18, 8).notNullable();
    table.string('reference_type', 50).notNullable();
    table.bigInteger('reference_id').notNullable();
    table.timestamp('conversion_date', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('exchange_rate_id').references('id').inTable('payroll.exchange_rate');
  });
  
  // ================================================================
  // ORGANIZATION CURRENCY CONFIG
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('organization_currency_config', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable().unique();
    table.string('base_currency', 3).notNullable().defaultTo('SRD');
    table.specificType('supported_currencies', 'VARCHAR(3)[]').notNullable().defaultTo('{SRD}');
    table.boolean('auto_update_rates').notNullable().defaultTo(false);
    table.string('rate_update_source', 50);
    table.string('rate_update_frequency', 20);
    table.string('default_rounding_method', 20).notNullable().defaultTo('half_up');
    table.integer('default_decimal_places').notNullable().defaultTo(2);
    table.decimal('require_approval_threshold', 15, 2);
    table.boolean('require_approval_for_rate_changes').notNullable().defaultTo(false);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // EXCHANGE RATE AUDIT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('exchange_rate_audit', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.bigInteger('exchange_rate_id').notNullable();
    table.string('action', 20).notNullable();
    table.decimal('old_rate', 18, 8);
    table.decimal('new_rate', 18, 8);
    table.text('reason');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('changed_by').notNullable();
    
    table.foreign('exchange_rate_id').references('id').inTable('payroll.exchange_rate').onDelete('CASCADE');
  });
  
  // ================================================================
  // CURRENCY APPROVAL REQUEST
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currency_approval_request', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable();
    table.string('request_type', 50).notNullable();
    table.string('reference_type', 50).notNullable();
    table.bigInteger('reference_id');
    table.jsonb('request_data').notNullable();
    table.text('reason');
    table.string('priority', 20).notNullable().defaultTo('normal');
    table.string('status', 20).notNullable().defaultTo('pending');
    table.integer('required_approvals').notNullable().defaultTo(1);
    table.integer('current_approvals').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // ================================================================
  // CURRENCY APPROVAL ACTION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currency_approval_action', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('approval_request_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.string('action', 20).notNullable();
    table.text('comments');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable();
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('approval_request_id').references('id').inTable('payroll.currency_approval_request').onDelete('CASCADE');
  });
  
  // ================================================================
  // CURRENCY APPROVAL RULE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currency_approval_rule', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('organization_id').notNullable();
    table.string('rule_name', 100).notNullable();
    table.string('rule_type', 50).notNullable();
    table.jsonb('conditions').notNullable();
    table.integer('required_approvals').notNullable().defaultTo(1);
    table.specificType('allowed_approver_roles', 'VARCHAR(50)[]').notNullable().defaultTo('{admin}');
    table.integer('priority').notNullable().defaultTo(100);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable();
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'rule_name']);
  });
  
  // ================================================================
  // CURRENCY APPROVAL NOTIFICATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currency_approval_notification', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('approval_request_id').notNullable();
    table.uuid('organization_id').notNullable();
    table.uuid('recipient_id').notNullable();
    table.string('notification_type', 50).notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('read_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('approval_request_id').references('id').inTable('payroll.currency_approval_request').onDelete('CASCADE');
  });
  
  // ================================================================
  // ROW LEVEL SECURITY POLICIES
  // ================================================================
  
  const tablesWithRLS = [
    'employee_payroll_config', 'compensation', 'worker_metadata', 'worker_type_pay_config',
    'worker_type_history', 'shift_type', 'time_attendance_event', 'time_entry', 'timesheet',
    'pay_component', 'component_formula', 'employee_pay_component_assignment', 'formula_execution_log',
    'rated_time_line', 'employee_deduction', 'tax_rule_set', 'tax_bracket', 'allowance',
    'loontijdvak', 'deductible_cost_rule', 'employee_allowance_usage', 'payroll_run_type',
    'payroll_run', 'paycheck', 'payroll_run_component', 'payslip_template', 'payslip_template_assignment',
    'payment_transaction', 'reconciliation', 'reconciliation_item', 'work_schedule', 
    'schedule_change_request', 'pay_structure_template', 'pay_structure_component',
    'worker_pay_structure', 'worker_pay_structure_component_override', 'pay_structure_template_changelog',
    'pay_structure_template_inclusion', 'pay_structure_template_inclusion_audit',
    'pay_structure_template_resolution_cache', 'pay_period_config', 'company_holiday',
    'exchange_rate', 'currency_conversion', 'organization_currency_config', 'exchange_rate_audit',
    'currency_approval_request', 'currency_approval_action', 'currency_approval_rule',
    'currency_approval_notification'
  ];
  
  for (const tableName of tablesWithRLS) {
    await knex.raw(`ALTER TABLE payroll.${tableName} ENABLE ROW LEVEL SECURITY`);
    
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation ON payroll.${tableName}
        USING (organization_id = payroll.get_current_organization_id())
    `);
    
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation_insert ON payroll.${tableName}
        FOR INSERT
        WITH CHECK (organization_id = payroll.get_current_organization_id())
    `);
  }
  
  // ================================================================
  // PERFORMANCE INDEXES
  // ================================================================
  
  // Employee payroll config indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_org_id ON payroll.employee_payroll_config(organization_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_employee_id ON payroll.employee_payroll_config(employee_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_employee_payroll_config_status ON payroll.employee_payroll_config(payroll_status) WHERE deleted_at IS NULL`);
  
  // Compensation indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_compensation_employee ON payroll.compensation(employee_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_compensation_current ON payroll.compensation(employee_id, is_current) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_compensation_effective_dates ON payroll.compensation(effective_from, effective_to)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_compensation_org_id ON payroll.compensation(organization_id) WHERE deleted_at IS NULL`);
  
  // Time entry indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_time_entry_employee ON payroll.time_entry(employee_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_time_entry_date ON payroll.time_entry(entry_date)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_time_entry_status ON payroll.time_entry(status) WHERE deleted_at IS NULL`);
  
  // Pay component indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_component_org ON payroll.pay_component(organization_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_component_type ON payroll.pay_component(component_type, status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_component_code ON payroll.pay_component(organization_id, component_code)`);
  
  // Payroll run indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payroll_run_org ON payroll.payroll_run(organization_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payroll_run_status ON payroll.payroll_run(status) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payroll_run_period ON payroll.payroll_run(pay_period_start, pay_period_end)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_payroll_run_payment_date ON payroll.payroll_run(payment_date)`);
  
  // Paycheck indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_paycheck_run ON payroll.paycheck(payroll_run_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_paycheck_employee ON payroll.paycheck(employee_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_paycheck_status ON payroll.paycheck(status) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_paycheck_payment_date ON payroll.paycheck(payment_date)`);
  
  // Exchange rate indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_exchange_rate_org_curr_date ON payroll.exchange_rate(organization_id, from_currency, to_currency, effective_from) WHERE effective_to IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_exchange_rate_org ON payroll.exchange_rate(organization_id)`);
  
  // Pay structure template indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_structure_template_org ON payroll.pay_structure_template(organization_id) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_structure_template_status ON payroll.pay_structure_template(organization_id, status) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_pay_structure_template_default ON payroll.pay_structure_template(organization_id, is_organization_default, effective_from, effective_to) WHERE is_organization_default = true AND deleted_at IS NULL`);
  
  // Worker pay structure indexes
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_worker_pay_structure_org ON payroll.worker_pay_structure(organization_id) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_worker_pay_structure_employee ON payroll.worker_pay_structure(employee_id) WHERE deleted_at IS NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_worker_pay_structure_current ON payroll.worker_pay_structure(employee_id, is_current) WHERE is_current = true AND deleted_at IS NULL`);
  
  // ================================================================
  // COMMENTS
  // ================================================================
  
  await knex.raw(`COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees - Core employee data in hris.employee'`);
  await knex.raw(`COMMENT ON TABLE payroll.compensation IS 'Employee compensation history - references hris.employee as source of truth'`);
  await knex.raw(`COMMENT ON TABLE payroll.worker_metadata IS 'PayLinQ-specific worker data linked to HRIS employees'`);
  await knex.raw(`COMMENT ON TABLE payroll.worker_type_pay_config IS 'PayLinQ-specific payroll configuration for HRIS worker types'`);
  await knex.raw(`COMMENT ON TABLE payroll.worker_type_history IS 'Historical tracking of employee worker type assignments for payroll purposes'`);
  await knex.raw(`COMMENT ON TABLE payroll.shift_type IS 'Shift definitions with differential rates'`);
  await knex.raw(`COMMENT ON TABLE payroll.time_attendance_event IS 'Clock in/out events with location tracking'`);
  await knex.raw(`COMMENT ON TABLE payroll.time_entry IS 'Approved time worked with hours breakdown'`);
  await knex.raw(`COMMENT ON TABLE payroll.timesheet IS 'Grouped time entries for pay periods'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_component IS 'Standard pay components (earnings and deductions)'`);
  await knex.raw(`COMMENT ON TABLE payroll.component_formula IS 'Complex calculation formulas for pay components'`);
  await knex.raw(`COMMENT ON TABLE payroll.employee_pay_component_assignment IS 'Employee-specific pay component overrides/assignments'`);
  await knex.raw(`COMMENT ON TABLE payroll.formula_execution_log IS 'SOX compliance audit log for formula executions'`);
  await knex.raw(`COMMENT ON TABLE payroll.rated_time_line IS 'Time entries broken down by pay rates'`);
  await knex.raw(`COMMENT ON TABLE payroll.employee_deduction IS 'Employee-specific deductions (benefits, garnishments, etc.)'`);
  await knex.raw(`COMMENT ON TABLE payroll.tax_rule_set IS 'Tax calculation rules by jurisdiction'`);
  await knex.raw(`COMMENT ON TABLE payroll.tax_bracket IS 'Progressive tax brackets'`);
  await knex.raw(`COMMENT ON TABLE payroll.allowance IS 'Tax-free allowances'`);
  await knex.raw(`COMMENT ON TABLE payroll.loontijdvak IS 'Surinamese wage tax periods per Wet Loonbelasting Article 13.3'`);
  await knex.raw(`COMMENT ON TABLE payroll.deductible_cost_rule IS 'Allowable cost deductions from gross income'`);
  await knex.raw(`COMMENT ON TABLE payroll.employee_allowance_usage IS 'Tracks yearly allowance usage per employee for cap enforcement'`);
  await knex.raw(`COMMENT ON TABLE payroll.payroll_run_type IS 'Defines payroll run types with component override rules'`);
  await knex.raw(`COMMENT ON TABLE payroll.payroll_run IS 'Payroll processing batches by pay period'`);
  await knex.raw(`COMMENT ON TABLE payroll.paycheck IS 'Individual employee paychecks'`);
  await knex.raw(`COMMENT ON TABLE payroll.payroll_run_component IS 'Detailed earnings/taxes/deductions breakdown per paycheck'`);
  await knex.raw(`COMMENT ON TABLE payroll.payslip_template IS 'Customizable payslip templates for PDF generation with branding and layout options'`);
  await knex.raw(`COMMENT ON TABLE payroll.payslip_template_assignment IS 'Assigns payslip templates to specific scopes (org-wide, worker types, departments, individuals)'`);
  await knex.raw(`COMMENT ON TABLE payroll.payment_transaction IS 'Payment execution tracking with bank integration'`);
  await knex.raw(`COMMENT ON TABLE payroll.reconciliation IS 'Bank/GL/tax reconciliation records'`);
  await knex.raw(`COMMENT ON TABLE payroll.reconciliation_item IS 'Line items within reconciliation'`);
  await knex.raw(`COMMENT ON TABLE payroll.work_schedule IS 'Employee shift schedules'`);
  await knex.raw(`COMMENT ON TABLE payroll.schedule_change_request IS 'Employee schedule change/swap requests'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_template IS 'Versioned pay structure templates that define how workers are paid. Uses semantic versioning (major.minor.patch).'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_component IS 'Individual compensation components within a pay structure template. Defines how each component is calculated.'`);
  await knex.raw(`COMMENT ON TABLE payroll.worker_pay_structure IS 'Worker-specific assignments of pay structure templates. Uses reference-based architecture.'`);
  await knex.raw(`COMMENT ON TABLE payroll.worker_pay_structure_component_override IS 'Worker-specific overrides to pay structure components. Allows customization while maintaining template integrity.'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_template_changelog IS 'Complete history of changes to pay structure templates. Enables audit trail and version comparison.'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_template_inclusion IS 'Template composition system: allows templates to include/inherit from other templates.'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_template_inclusion_audit IS 'Audit log for all changes to template composition. Required for compliance and troubleshooting.'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_structure_template_resolution_cache IS 'Performance cache for resolved composite templates. Invalidated when parent or included templates change.'`);
  await knex.raw(`COMMENT ON TABLE payroll.pay_period_config IS 'Organization pay period configuration - defines pay frequency and schedule'`);
  await knex.raw(`COMMENT ON TABLE payroll.company_holiday IS 'Organization holiday calendar for pay schedule and attendance tracking'`);
  await knex.raw(`COMMENT ON TABLE payroll.exchange_rate IS 'Exchange rates for currency conversions with temporal validity'`);
  await knex.raw(`COMMENT ON TABLE payroll.currency_conversion IS 'Audit trail for all currency conversions performed in the system'`);
  await knex.raw(`COMMENT ON TABLE payroll.organization_currency_config IS 'Organization-level currency configuration and preferences'`);
  await knex.raw(`COMMENT ON TABLE payroll.exchange_rate_audit IS 'Audit log for all exchange rate changes'`);
  await knex.raw(`COMMENT ON TABLE payroll.currency_approval_request IS 'Approval requests for currency operations requiring authorization'`);
  await knex.raw(`COMMENT ON TABLE payroll.currency_approval_action IS 'Individual actions taken by approvers on approval requests'`);
  await knex.raw(`COMMENT ON TABLE payroll.currency_approval_rule IS 'Configurable rules defining when approvals are required'`);
  await knex.raw(`COMMENT ON TABLE payroll.currency_approval_notification IS 'Notification tracking for approval workflow events'`);
  
  // Grant permissions
  await knex.raw(`GRANT USAGE ON SCHEMA payroll TO PUBLIC`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payroll TO PUBLIC`);
  await knex.raw(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA payroll TO PUBLIC`);
  
  console.log('✅ PayLinQ schema created successfully with 50 tables');
};

export async function down(knex) {
  console.log('Dropping PayLinQ schema...');
  
  // Drop schema with CASCADE - this will drop all objects within it
  // This is simpler and more reliable than dropping tables individually
  try {
    await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
    console.log('✅ PayLinQ schema dropped successfully');
  } catch (e) {
    console.log(`Warning: Error dropping schema: ${e.message}`);
    // If cascade fails, try to drop the extension that might be blocking
    try {
      await knex.raw('DROP EXTENSION IF EXISTS btree_gist CASCADE');
      await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
      console.log('✅ PayLinQ schema dropped successfully after cleanup');
    } catch (e2) {
      console.log(`Error: Could not drop schema: ${e2.message}`);
      throw e2;
    }
  }
};
