/**
 * Migration: Create Payroll (PayLinQ) Schema
 * 
 * Creates the PayLinQ payroll schema including:
 * - payroll schema
 * - Employee payroll configuration
 * - Compensation and pay components
 * - Tax calculation and rules
 * - Deductions and allowances
 * - Payroll runs and paychecks
 * - Time and attendance integration
 * - Formula engine support
 * 
 * @see C:\RecruitIQ\backend\src\database\paylinq-schema.sql (original)
 */

export async function up(knex) {
  // Create payroll schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');
  
  // Create helper function for organization context
  await knex.raw(`
    CREATE OR REPLACE FUNCTION payroll.get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id TEXT;
    BEGIN
      org_id := current_setting('app.current_organization_id', true);
      IF org_id IS NULL THEN
        RAISE EXCEPTION 'app.current_organization_id is not set';
      END IF;
      RETURN org_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid organization ID: %', org_id;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    
    COMMENT ON FUNCTION payroll.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware';
  `);

  // ============================================================================
  // EMPLOYEE PAYROLL CONFIGURATION
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('employee_payroll_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable();
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    
    // Payroll-specific data
    table.string('payment_method', 50).notNullable().defaultTo('bank_transfer');
    table.string('bank_name', 255);
    table.string('bank_account_number', 100);
    table.string('bank_routing_number', 50);
    table.string('currency', 3).notNullable().defaultTo('USD');
    table.string('pay_frequency', 50).notNullable();
    table.string('tax_id', 100);
    
    // Tax residence
    table.string('tax_residence_country', 100);
    table.string('tax_residence_state', 100);
    
    // Payroll settings
    table.jsonb('payroll_settings').defaultTo('{}');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['employee_id', 'organization_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_employee_payroll_config_org ON payroll.employee_payroll_config(organization_id);
    CREATE INDEX idx_employee_payroll_config_employee ON payroll.employee_payroll_config(employee_id);
    
    ALTER TABLE payroll.employee_payroll_config
    ADD CONSTRAINT fk_employee_payroll_config_employee
    FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE;
    
    COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees. Core employee data is in hris.employee';
    COMMENT ON COLUMN payroll.employee_payroll_config.employee_id IS 'References hris.employee(id) - the single source of truth';
  `);

  // ============================================================================
  // PAY COMPONENTS (Earnings, Deductions, Taxes, etc.)
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('pay_components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    
    table.string('component_code', 50).notNullable();
    table.string('component_name', 255).notNullable();
    table.string('component_type', 50).notNullable();
    table.text('description');
    
    // Calculation
    table.string('calculation_method', 50).notNullable();
    table.jsonb('calculation_metadata').defaultTo('{}');
    
    // Tax and display
    table.boolean('is_taxable').defaultTo(true);
    table.boolean('is_pre_tax').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'component_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_pay_components_org ON payroll.pay_components(organization_id);
    CREATE INDEX idx_pay_components_type ON payroll.pay_components(component_type);
    CREATE INDEX idx_pay_components_active ON payroll.pay_components(is_active);
  `);

  // ============================================================================
  // COMPENSATION (Employee Pay Rates)
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('compensation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable();
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('pay_component_id').references('id').inTable('payroll.pay_components');
    
    // Rate information
    table.decimal('rate', 19, 4).notNullable();
    table.string('rate_type', 50).notNullable();
    table.string('currency', 3).notNullable().defaultTo('USD');
    
    // Effective dates
    table.date('effective_from').notNullable();
    table.date('effective_to');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_compensation_employee ON payroll.compensation(employee_id);
    CREATE INDEX idx_compensation_org ON payroll.compensation(organization_id);
    CREATE INDEX idx_compensation_component ON payroll.compensation(pay_component_id);
    CREATE INDEX idx_compensation_effective ON payroll.compensation(effective_from, effective_to);
    
    ALTER TABLE payroll.compensation
    ADD CONSTRAINT fk_compensation_employee
    FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE;
    
    COMMENT ON TABLE payroll.compensation IS 'Compensation records - links workers to pay components with specific rates';
    COMMENT ON COLUMN payroll.compensation.employee_id IS 'References hris.employee(id) - the single source of truth';
  `);

  // ============================================================================
  // PAYROLL RUN TYPES
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_run_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    
    table.string('type_code', 50).notNullable();
    table.string('type_name', 255).notNullable();
    table.text('description');
    
    // Component configuration
    table.string('component_override_mode', 50).notNullable().defaultTo('include_all');
    table.jsonb('allowed_components').defaultTo('[]');
    table.jsonb('excluded_components').defaultTo('[]');
    
    // Settings
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'type_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_payroll_run_types_org ON payroll.payroll_run_types(organization_id);
    CREATE INDEX idx_payroll_run_types_active ON payroll.payroll_run_types(is_active);
  `);

  // ============================================================================
  // PAYROLL RUNS
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('payroll_run_type_id').notNullable().references('id').inTable('payroll.payroll_run_types');
    
    // Run identification
    table.string('run_number', 100).notNullable();
    table.string('run_name', 255).notNullable();
    table.text('description');
    
    // Period information
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.date('pay_date').notNullable();
    
    // Status
    table.string('status', 50).notNullable().defaultTo('draft');
    
    // Totals
    table.decimal('total_gross', 19, 4).defaultTo(0);
    table.decimal('total_deductions', 19, 4).defaultTo(0);
    table.decimal('total_net', 19, 4).defaultTo(0);
    table.integer('employee_count').defaultTo(0);
    
    // Processing
    table.timestamp('calculated_at', { useTz: true });
    table.timestamp('approved_at', { useTz: true });
    table.uuid('approved_by');
    table.timestamp('paid_at', { useTz: true });
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'run_number']);
  });

  await knex.raw(`
    CREATE INDEX idx_payroll_runs_org ON payroll.payroll_runs(organization_id);
    CREATE INDEX idx_payroll_runs_type ON payroll.payroll_runs(payroll_run_type_id);
    CREATE INDEX idx_payroll_runs_status ON payroll.payroll_runs(status);
    CREATE INDEX idx_payroll_runs_pay_date ON payroll.payroll_runs(pay_date);
  `);

  // ============================================================================
  // TAX RULES
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('tax_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    
    table.string('rule_code', 50).notNullable();
    table.string('rule_name', 255).notNullable();
    table.string('tax_type', 50).notNullable();
    table.string('jurisdiction', 100).notNullable();
    table.text('description');
    
    // Tax calculation
    table.string('calculation_method', 50).notNullable();
    table.jsonb('tax_brackets').defaultTo('[]');
    table.jsonb('calculation_parameters').defaultTo('{}');
    
    // Effective dates
    table.date('effective_from').notNullable();
    table.date('effective_to');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'rule_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_tax_rules_org ON payroll.tax_rules(organization_id);
    CREATE INDEX idx_tax_rules_jurisdiction ON payroll.tax_rules(jurisdiction);
    CREATE INDEX idx_tax_rules_effective ON payroll.tax_rules(effective_from, effective_to);
  `);

  console.log('✅ Payroll schema created successfully');
}

export async function down(knex) {
  // Drop tables in reverse order
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_rules');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_runs');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_run_types');
  await knex.schema.withSchema('payroll').dropTableIfExists('compensation');
  await knex.schema.withSchema('payroll').dropTableIfExists('pay_components');
  await knex.schema.withSchema('payroll').dropTableIfExists('employee_payroll_config');
  
  // Drop helper function
  await knex.raw('DROP FUNCTION IF EXISTS payroll.get_current_organization_id()');
  
  // Drop schema
  await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
  
  console.log('✅ Payroll schema dropped successfully');
}
