/**
 * PayLinQ Schema Migration
 * 
 * Creates the PayLinQ (Payroll Processing) schema
 * for comprehensive payroll management including compensation,
 * time tracking, tax calculations, and payroll runs.
 * 
 * Schema: payroll
 * Dependencies: hris schema (employee, user_account, worker_type)
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ============================================================================
  // CREATE PAYROLL SCHEMA
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');

  // ============================================================================
  // HELPER FUNCTION FOR PAYROLL RLS
  // ============================================================================
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
    
    COMMENT ON FUNCTION payroll.get_current_organization_id IS 'Returns current organization UUID from session variable for payroll schema RLS.';
  `);

  // ============================================================================
  // PAY COMPONENT - Salary components (earnings/deductions)
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('pay_component', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('component_code', 50).notNullable();
    table.string('component_name', 255).notNullable();
    table.string('component_type', 50).notNullable();
    table.text('description');
    table.string('calculation_type', 50).notNullable();
    table.decimal('fixed_amount', 15, 2);
    table.decimal('rate', 10, 4);
    table.string('base_component', 50);
    table.text('formula');
    table.uuid('formula_id');
    table.jsonb('metadata').defaultTo('{}');
    table.boolean('is_taxable').defaultTo(true);
    table.boolean('is_recurring').defaultTo(false);
    table.boolean('is_pre_tax').defaultTo(false);
    table.boolean('is_system_component').defaultTo(false);
    table.boolean('applies_to_gross').defaultTo(false);
    table.boolean('is_prorated').defaultTo(false);
    table.string('gaap_category', 50);
    table.string('default_currency', 3);
    table.boolean('allow_currency_override').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.string('status', 20).defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'component_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_pay_component_org ON payroll.pay_component(organization_id);
    CREATE INDEX idx_pay_component_type ON payroll.pay_component(component_type);
    CREATE INDEX idx_pay_component_active ON payroll.pay_component(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.pay_component IS 'Reusable pay components for earnings, deductions, and benefits';
    COMMENT ON COLUMN payroll.pay_component.component_type IS 'Types: earning, deduction, benefit, reimbursement';
    COMMENT ON COLUMN payroll.pay_component.calculation_type IS 'Types: fixed_amount, percentage, formula, hourly_rate';
  `);

  // ============================================================================
  // COMPONENT FORMULA - Custom calculation formulas
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('component_formula', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('SET NULL');
    table.string('formula_name', 100).notNullable();
    table.text('formula_expression').notNullable();
    table.string('formula_type', 20).defaultTo('arithmetic');
    table.jsonb('formula_ast');
    table.jsonb('conditional_rules');
    table.jsonb('variables');
    table.jsonb('validation_schema');
    table.integer('formula_version').defaultTo(1);
    table.boolean('is_active').defaultTo(true);
    table.text('description');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_component_formula_org ON payroll.component_formula(organization_id);
    CREATE INDEX idx_component_formula_component ON payroll.component_formula(pay_component_id);
    CREATE INDEX idx_component_formula_active ON payroll.component_formula(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.component_formula IS 'Custom formulas for dynamic pay component calculations';
  `);

  // ============================================================================
  // WORKER METADATA - PayLinQ-specific employee configuration
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('worker_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('worker_type_code', 50);
    table.string('pay_frequency', 50).notNullable();
    table.string('payment_method', 50).notNullable().defaultTo('bank_transfer');
    table.string('bank_account_number', 255);
    table.string('bank_routing_number', 255);
    table.string('bank_name', 255);
    table.string('tax_id', 50);
    table.string('tax_filing_status', 50);
    table.integer('tax_exemptions').defaultTo(0);
    table.boolean('is_suriname_resident').notNullable().defaultTo(true);
    table.date('residency_verification_date');
    table.text('residency_notes');
    table.boolean('overtime_tax_article_17c_opt_in').defaultTo(false);
    table.date('overtime_opt_in_date');
    table.text('overtime_opt_in_notes');
    table.boolean('is_payroll_eligible').notNullable().defaultTo(true);
    table.uuid('last_payroll_run_id');
    table.boolean('is_active').defaultTo(true);
    table.text('notes');
    table.jsonb('custom_fields');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE UNIQUE INDEX idx_worker_metadata_unique ON payroll.worker_metadata(organization_id, employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_org ON payroll.worker_metadata(organization_id);
    CREATE INDEX idx_worker_metadata_employee ON payroll.worker_metadata(employee_id);
    CREATE INDEX idx_worker_metadata_worker_type ON payroll.worker_metadata(worker_type_code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_eligible ON payroll.worker_metadata(is_payroll_eligible) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_resident ON payroll.worker_metadata(is_suriname_resident) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.worker_metadata IS 'PayLinQ-specific worker data linked to HRIS employees.';
    COMMENT ON COLUMN payroll.worker_metadata.is_suriname_resident IS 'Per Wet Loonbelasting Article 13.1a: Resident status affects tax-free allowance.';
    COMMENT ON COLUMN payroll.worker_metadata.pay_frequency IS 'Pay frequency: daily, weekly, monthly, yearly';
  `);

  // Enable RLS for worker_metadata
  await knex.raw(`
    ALTER TABLE payroll.worker_metadata ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY worker_metadata_tenant_isolation ON payroll.worker_metadata
      USING (organization_id = payroll.get_current_organization_id());
    
    CREATE POLICY worker_metadata_tenant_isolation_insert ON payroll.worker_metadata
      FOR INSERT
      WITH CHECK (organization_id = payroll.get_current_organization_id());
  `);

  // ============================================================================
  // EMPLOYEE PAYROLL CONFIG
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('employee_payroll_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('pay_frequency', 20).notNullable();
    table.string('payment_method', 20).notNullable();
    table.string('currency', 3).defaultTo('SRD');
    table.string('payment_currency', 3);
    table.boolean('allow_multi_currency').notNullable().defaultTo(false);
    table.string('bank_name', 100);
    table.string('account_number', 50);
    table.string('routing_number', 50);
    table.string('account_type', 20);
    table.string('tax_id', 50);
    table.string('tax_filing_status', 20);
    table.integer('tax_allowances').defaultTo(0);
    table.decimal('additional_withholding', 12, 2).defaultTo(0);
    table.string('payroll_status', 20).defaultTo('active');
    table.date('payroll_start_date').notNullable();
    table.date('payroll_end_date');
    table.jsonb('metadata');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_emp_payroll_config_org ON payroll.employee_payroll_config(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_payroll_config_employee ON payroll.employee_payroll_config(employee_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees.';
  `);

  // ============================================================================
  // COMPENSATION RECORDS
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('compensation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('worker_metadata_id').references('id').inTable('payroll.worker_metadata').onDelete('SET NULL');
    table.uuid('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('SET NULL');
    table.string('compensation_type', 20);
    table.decimal('amount', 15, 2);
    table.decimal('overtime_rate', 12, 2);
    table.decimal('rate', 15, 2);
    table.decimal('percentage', 5, 2);
    table.string('calculation_type', 50);
    table.string('frequency', 50);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    table.string('currency', 3).defaultTo('SRD');
    table.decimal('min_value', 15, 2);
    table.decimal('max_value', 15, 2);
    table.jsonb('calculation_rules');
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_compensation_org ON payroll.compensation(organization_id);
    CREATE INDEX idx_compensation_employee ON payroll.compensation(employee_id);
    CREATE INDEX idx_compensation_worker_metadata ON payroll.compensation(worker_metadata_id);
    CREATE INDEX idx_compensation_component ON payroll.compensation(pay_component_id);
    CREATE INDEX idx_compensation_active ON payroll.compensation(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_compensation_current ON payroll.compensation(is_current) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.compensation IS 'Employee compensation records with effective dates.';
  `);

  // ============================================================================
  // SHIFT TYPE
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('shift_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('shift_name', 100).notNullable();
    table.string('shift_code', 20).notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.decimal('duration_hours', 5, 2).notNullable();
    table.boolean('is_overnight').defaultTo(false);
    table.integer('break_duration_minutes').defaultTo(0);
    table.boolean('is_paid_break').defaultTo(false);
    table.decimal('shift_differential_rate', 5, 2).defaultTo(0);
    table.text('description');
    table.string('status', 20).defaultTo('active');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'shift_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_shift_type_org ON payroll.shift_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_shift_type_status ON payroll.shift_type(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.shift_type IS 'Shift type definitions with differential rates';
  `);

  // ============================================================================
  // TIME ATTENDANCE EVENT
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('time_attendance_event', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('event_type', 20).notNullable();
    table.timestamp('event_timestamp').notNullable().defaultTo(knex.fn.now());
    table.uuid('location_id');
    table.decimal('gps_latitude', 10, 7);
    table.decimal('gps_longitude', 10, 7);
    table.string('device_id', 100);
    table.specificType('ip_address', 'INET');
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_time_event_org ON payroll.time_attendance_event(organization_id);
    CREATE INDEX idx_time_event_employee ON payroll.time_attendance_event(employee_id);
    CREATE INDEX idx_time_event_timestamp ON payroll.time_attendance_event(event_timestamp);
    CREATE INDEX idx_time_event_type ON payroll.time_attendance_event(event_type);
    
    COMMENT ON TABLE payroll.time_attendance_event IS 'Clock in/out events with optional location tracking';
    COMMENT ON COLUMN payroll.time_attendance_event.event_type IS 'Event types: clock_in, clock_out, break_start, break_end';
  `);

  // ============================================================================
  // TIME ENTRY
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('time_entry', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('entry_date').notNullable();
    table.timestamp('clock_in');
    table.timestamp('clock_out');
    table.decimal('worked_hours', 5, 2).notNullable().defaultTo(0);
    table.decimal('regular_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('break_hours', 5, 2).defaultTo(0);
    table.uuid('shift_type_id').references('id').inTable('payroll.shift_type');
    table.string('entry_type', 20).defaultTo('regular');
    table.string('status', 20).defaultTo('draft');
    table.text('notes');
    table.uuid('approved_by').references('id').inTable('hris.user_account');
    table.timestamp('approved_at');
    table.uuid('clock_in_event_id').references('id').inTable('payroll.time_attendance_event');
    table.uuid('clock_out_event_id').references('id').inTable('payroll.time_attendance_event');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_time_entry_org ON payroll.time_entry(organization_id);
    CREATE INDEX idx_time_entry_employee ON payroll.time_entry(employee_id);
    CREATE INDEX idx_time_entry_date ON payroll.time_entry(entry_date);
    CREATE INDEX idx_time_entry_status ON payroll.time_entry(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.time_entry IS 'Daily work time records';
    COMMENT ON COLUMN payroll.time_entry.entry_type IS 'Types: regular, overtime, pto, sick, holiday, unpaid';
    COMMENT ON COLUMN payroll.time_entry.status IS 'Status: draft, submitted, approved, rejected';
  `);

  // ============================================================================
  // TIMESHEET
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('timesheet', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('regular_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('pto_hours', 5, 2).defaultTo(0);
    table.decimal('sick_hours', 5, 2).defaultTo(0);
    table.string('status', 20).defaultTo('draft');
    table.text('notes');
    table.uuid('approved_by').references('id').inTable('hris.user_account');
    table.timestamp('approved_at');
    table.uuid('rejected_by').references('id').inTable('hris.user_account');
    table.timestamp('rejected_at');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['employee_id', 'period_start', 'period_end']);
  });

  await knex.raw(`
    CREATE INDEX idx_timesheet_org ON payroll.timesheet(organization_id);
    CREATE INDEX idx_timesheet_employee ON payroll.timesheet(employee_id);
    CREATE INDEX idx_timesheet_period ON payroll.timesheet(period_start, period_end);
    CREATE INDEX idx_timesheet_status ON payroll.timesheet(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.timesheet IS 'Weekly or period-based time summaries';
  `);

  // ============================================================================
  // TAX RULE SET
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('tax_rule_set', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('tax_type', 50).notNullable();
    table.string('tax_name', 100).notNullable();
    table.string('country', 2).defaultTo('SR');
    table.string('state', 50);
    table.string('locality', 50);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.decimal('annual_cap', 12, 2);
    table.string('calculation_method', 20).defaultTo('bracket');
    table.string('calculation_mode', 30).defaultTo('proportional_distribution');
    table.text('description');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_tax_rule_set_org ON payroll.tax_rule_set(organization_id);
    CREATE INDEX idx_tax_rule_set_type ON payroll.tax_rule_set(tax_type);
    CREATE INDEX idx_tax_rule_set_effective ON payroll.tax_rule_set(effective_from, effective_to);
    
    COMMENT ON TABLE payroll.tax_rule_set IS 'Tax calculation rules by jurisdiction';
    COMMENT ON COLUMN payroll.tax_rule_set.tax_type IS 'Types: wage_tax, aov, aww, federal, state, local, social_security, medicare';
  `);

  // ============================================================================
  // TAX BRACKET
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('tax_bracket', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('tax_rule_set_id').notNullable().references('id').inTable('payroll.tax_rule_set').onDelete('CASCADE');
    table.integer('bracket_order').notNullable();
    table.decimal('income_min', 12, 2).notNullable();
    table.decimal('income_max', 12, 2);
    table.decimal('rate_percentage', 5, 2).notNullable();
    table.decimal('fixed_amount', 12, 2).defaultTo(0);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_tax_bracket_org ON payroll.tax_bracket(organization_id);
    CREATE INDEX idx_tax_bracket_rule_set ON payroll.tax_bracket(tax_rule_set_id);
    CREATE INDEX idx_tax_bracket_order ON payroll.tax_bracket(bracket_order);
    
    COMMENT ON TABLE payroll.tax_bracket IS 'Progressive tax brackets within a tax rule set';
  `);

  // ============================================================================
  // ALLOWANCE
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('allowance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('allowance_type', 50).notNullable();
    table.string('allowance_name', 100).notNullable();
    table.string('country', 2).defaultTo('SR');
    table.string('state', 50);
    table.decimal('amount', 12, 2).notNullable();
    table.boolean('is_percentage').defaultTo(false);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    table.text('description');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_allowance_org ON payroll.allowance(organization_id);
    CREATE INDEX idx_allowance_type ON payroll.allowance(allowance_type);
    CREATE INDEX idx_allowance_active ON payroll.allowance(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.allowance IS 'Tax-free allowances and deductions';
    COMMENT ON COLUMN payroll.allowance.allowance_type IS 'Types: personal, dependent, disability, veteran, tax_free_sum_monthly, holiday_allowance, bonus_gratuity';
  `);

  // ============================================================================
  // LOONTIJDVAK (Suriname-specific payroll period)
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('loontijdvak', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('period_type', 20).notNullable();
    table.integer('period_number').notNullable();
    table.integer('year').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('tax_table_version', 50);
    table.boolean('is_active').defaultTo(true);
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE UNIQUE INDEX idx_loontijdvak_unique ON payroll.loontijdvak(organization_id, period_type, period_number, year) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_org ON payroll.loontijdvak(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_period ON payroll.loontijdvak(period_type, year) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_dates ON payroll.loontijdvak(start_date, end_date) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.loontijdvak IS 'Surinamese wage tax periods per Wet Loonbelasting Article 13.3';
    COMMENT ON COLUMN payroll.loontijdvak.period_type IS 'Loontijdvak type: daily, weekly, monthly, yearly';
  `);

  // Enable RLS for loontijdvak
  await knex.raw(`
    ALTER TABLE payroll.loontijdvak ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY loontijdvak_tenant_isolation ON payroll.loontijdvak
      USING (organization_id = payroll.get_current_organization_id());
    
    CREATE POLICY loontijdvak_tenant_isolation_insert ON payroll.loontijdvak
      FOR INSERT
      WITH CHECK (organization_id = payroll.get_current_organization_id());
  `);

  // ============================================================================
  // PAYROLL RUN TYPE
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_run_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
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
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'type_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_payroll_run_type_org ON payroll.payroll_run_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_type_active ON payroll.payroll_run_type(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.payroll_run_type IS 'Payroll run type definitions';
    COMMENT ON COLUMN payroll.payroll_run_type.component_override_mode IS 'template: use template | explicit: use allowed_components | hybrid: template + overrides';
  `);

  // ============================================================================
  // PAYROLL RUN
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_run', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('run_type_id').references('id').inTable('payroll.payroll_run_type');
    table.string('run_number', 50).notNullable();
    table.string('run_name', 255);
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('pay_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.integer('employee_count').defaultTo(0);
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.string('currency', 10).defaultTo('SRD');
    table.timestamp('approved_at');
    table.uuid('approved_by').references('id').inTable('hris.user_account');
    table.timestamp('processed_at');
    table.uuid('processed_by').references('id').inTable('hris.user_account');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'run_number']);
  });

  await knex.raw(`
    CREATE INDEX idx_payroll_run_org ON payroll.payroll_run(organization_id);
    CREATE INDEX idx_payroll_run_status ON payroll.payroll_run(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_period ON payroll.payroll_run(pay_period_start, pay_period_end);
    
    COMMENT ON TABLE payroll.payroll_run IS 'Payroll processing batches for a specific pay period';
    COMMENT ON COLUMN payroll.payroll_run.status IS 'Status: draft, pending_approval, approved, processing, processed, failed';
  `);

  // ============================================================================
  // EMPLOYEE PAY COMPONENT ASSIGNMENT
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('employee_pay_component_assignment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('component_id').notNullable().references('id').inTable('payroll.pay_component');
    table.string('component_code', 50).notNullable();
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.jsonb('configuration').defaultTo('{}');
    table.decimal('override_amount', 15, 2);
    table.text('override_formula');
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_emp_pay_comp_org ON payroll.employee_pay_component_assignment(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_pay_comp_employee ON payroll.employee_pay_component_assignment(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_pay_comp_component ON payroll.employee_pay_component_assignment(component_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.employee_pay_component_assignment IS 'Assigns pay components to employees with optional overrides';
  `);

  // ============================================================================
  // EMPLOYEE DEDUCTION
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('employee_deduction', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('deduction_type', 50).notNullable();
    table.string('deduction_name', 100).notNullable();
    table.string('deduction_code', 50).notNullable();
    table.string('calculation_type', 20).notNullable();
    table.decimal('deduction_amount', 12, 2);
    table.decimal('deduction_percentage', 5, 2);
    table.decimal('max_per_payroll', 12, 2);
    table.decimal('max_annual', 12, 2);
    table.boolean('is_pre_tax').defaultTo(false);
    table.boolean('is_recurring').defaultTo(true);
    table.string('frequency', 20).defaultTo('per_payroll');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.integer('priority').defaultTo(1);
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_emp_deduction_org ON payroll.employee_deduction(organization_id);
    CREATE INDEX idx_emp_deduction_employee ON payroll.employee_deduction(employee_id);
    CREATE INDEX idx_emp_deduction_type ON payroll.employee_deduction(deduction_type);
    
    COMMENT ON TABLE payroll.employee_deduction IS 'Employee deductions (benefits, garnishments, loans, etc.)';
    COMMENT ON COLUMN payroll.employee_deduction.deduction_type IS 'Types: benefit, garnishment, loan, union_dues, pension, insurance, other';
  `);

  // ============================================================================
  // RATED TIME LINE
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('rated_time_line', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('time_entry_id').notNullable().references('id').inTable('payroll.time_entry').onDelete('CASCADE');
    table.uuid('pay_component_id').notNullable().references('id').inTable('payroll.pay_component');
    table.decimal('hours', 5, 2).notNullable();
    table.decimal('rate', 12, 2).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_rated_time_line_org ON payroll.rated_time_line(organization_id);
    CREATE INDEX idx_rated_time_line_entry ON payroll.rated_time_line(time_entry_id);
    CREATE INDEX idx_rated_time_line_component ON payroll.rated_time_line(pay_component_id);
    
    COMMENT ON TABLE payroll.rated_time_line IS 'Time entries broken down by pay component rates';
  `);

  // ============================================================================
  // FORMULA EXECUTION LOG
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('formula_execution_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('pay_component_id').references('id').inTable('payroll.pay_component').onDelete('SET NULL');
    table.uuid('formula_id').references('id').inTable('payroll.component_formula').onDelete('SET NULL');
    table.text('formula_expression').notNullable();
    table.jsonb('input_variables').notNullable();
    table.decimal('calculated_result', 12, 2);
    table.integer('execution_time_ms');
    table.uuid('paycheck_id');
    table.uuid('employee_id').references('id').inTable('hris.employee');
    table.uuid('payroll_run_id').references('id').inTable('payroll.payroll_run').onDelete('SET NULL');
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    table.uuid('executed_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_formula_log_org ON payroll.formula_execution_log(organization_id);
    CREATE INDEX idx_formula_log_formula ON payroll.formula_execution_log(formula_id);
    CREATE INDEX idx_formula_log_employee ON payroll.formula_execution_log(employee_id);
    CREATE INDEX idx_formula_log_run ON payroll.formula_execution_log(payroll_run_id);
    
    COMMENT ON TABLE payroll.formula_execution_log IS 'Audit trail for formula calculations';
  `);

  // ============================================================================
  // WORKER TYPE PAY CONFIG
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('worker_type_pay_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('worker_type_id').notNullable().references('id').inTable('hris.worker_type').onDelete('CASCADE');
    table.string('pay_structure_template_code', 50);
    table.string('default_pay_frequency', 20);
    table.string('default_payment_method', 20);
    table.boolean('overtime_eligible').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'worker_type_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_pay_config_org ON payroll.worker_type_pay_config(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_pay_config_worker_type ON payroll.worker_type_pay_config(worker_type_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.worker_type_pay_config IS 'Payroll-specific configuration for HRIS worker types';
  `);

  // ============================================================================
  // WORKER TYPE HISTORY
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('worker_type_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('worker_type_id').notNullable().references('id').inTable('hris.worker_type').onDelete('CASCADE');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    table.string('pay_frequency', 20);
    table.string('payment_method', 20);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_id', 'worker_type_id', 'effective_from']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_history_org ON payroll.worker_type_history(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_history_employee ON payroll.worker_type_history(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_history_current ON payroll.worker_type_history(is_current) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.worker_type_history IS 'Historical tracking of employee worker type assignments';
  `);

  console.log('✓ PayLinQ schema migration complete');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Drop payroll schema (cascades all tables)
  await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
  
  console.log('✓ PayLinQ schema rollback complete');
}
