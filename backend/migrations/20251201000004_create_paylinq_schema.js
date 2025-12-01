/**
 * PayLinQ Database Schema Migration
 * 
 * Creates the comprehensive payroll processing schema
 * 
 * Schema: payroll
 * Tables: 23+
 * Features: Employee payroll records, compensation, time & attendance,
 *           tax calculation, deductions, pay components, payroll runs,
 *           paychecks, payments, reconciliation
 * 
 * Version: 1.0.0
 * Created: December 1, 2025
 */

exports.up = async function(knex) {
  // Create payroll schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');
  
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');
  
  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================
  
  // Helper function to get current organization from session variable
  await knex.raw(`
    CREATE OR REPLACE FUNCTION payroll.get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id TEXT;
    BEGIN
      org_id := current_setting('app.current_organization_id', true);
      IF org_id IS NULL OR org_id = '' THEN
        RAISE EXCEPTION 'app.current_organization_id is not set. Authentication required.';
      END IF;
      RETURN org_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid organization_id in session: %', org_id;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  `);
  
  await knex.raw(`
    COMMENT ON FUNCTION payroll.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.'
  `);
  
  // ================================================================
  // EMPLOYEE PAYROLL CONFIGURATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('employee_payroll_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('pay_frequency', 50).notNullable();
    table.string('payment_method', 50).notNullable().defaultTo('bank_transfer');
    table.string('bank_name', 200);
    table.string('account_number', 100);
    table.string('account_holder_name', 200);
    table.string('tax_id', 50);
    table.boolean('is_payroll_eligible').notNullable().defaultTo(true);
    table.jsonb('payroll_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.unique(['organization_id', 'employee_id', 'deleted_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.employee_payroll_config IS 'Payroll-specific configuration for employees. Core employee data is in hris.employee (single source of truth)'
  `);
  
  // ================================================================
  // COMPENSATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('compensation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id');
    table.uuid('worker_metadata_id');
    table.uuid('pay_component_id');
    table.decimal('amount', 15, 2);
    table.decimal('rate', 15, 2);
    table.decimal('percentage', 5, 2);
    table.string('calculation_type', 50).notNullable();
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.text('notes');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['employee_id', 'effective_from']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.compensation IS 'Compensation records - links workers to pay components with specific rates and rules'
  `);
  
  // ================================================================
  // WORKER METADATA
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('worker_type_code', 50).notNullable();
    table.boolean('is_payroll_eligible').notNullable().defaultTo(true);
    table.string('pay_frequency', 50).notNullable();
    table.boolean('is_suriname_resident').notNullable().defaultTo(true);
    table.boolean('overtime_tax_article_17c_opt_in').notNullable().defaultTo(false);
    table.jsonb('worker_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.unique(['organization_id', 'employee_id', 'deleted_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.worker_metadata IS 'PayLinQ-specific worker data linked to HRIS employees'
  `);
  
  // Create indexes for worker_metadata
  await knex.schema.withSchema('payroll').raw(`
    CREATE INDEX idx_worker_metadata_org_id ON worker_metadata(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_employee_id ON worker_metadata(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_worker_type ON worker_metadata(worker_type_code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_eligible ON worker_metadata(is_payroll_eligible) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_metadata_resident ON worker_metadata(is_suriname_resident) WHERE deleted_at IS NULL;
  `);
  
  // Enable Row Level Security
  await knex.raw('ALTER TABLE payroll.worker_metadata ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY worker_metadata_tenant_isolation ON payroll.worker_metadata
      USING (organization_id = payroll.get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY worker_metadata_tenant_isolation_insert ON payroll.worker_metadata
      FOR INSERT
      WITH CHECK (organization_id = payroll.get_current_organization_id())
  `);
  
  // ================================================================
  // WORKER TYPE PAY CONFIGURATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('worker_type_pay_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('worker_type_id').notNullable();
    table.string('pay_structure_template_code', 50);
    table.string('default_pay_frequency', 50).notNullable();
    table.jsonb('default_components').defaultTo('[]');
    table.jsonb('config_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('worker_type_id').references('id').inTable('hris.worker_type').onDelete('CASCADE');
    table.unique(['organization_id', 'worker_type_id', 'deleted_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.worker_type_pay_config IS 'Payroll-specific configuration for HRIS worker types'
  `);
  
  // ================================================================
  // PAY COMPONENT TEMPLATES (Versioned)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_component_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('component_code', 50).notNullable();
    table.string('component_name', 200).notNullable();
    table.string('component_type', 50).notNullable(); // earning, deduction, benefit, tax
    table.text('description');
    table.string('calculation_method', 50).notNullable(); // fixed, percentage, formula
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.boolean('is_taxable').notNullable().defaultTo(true);
    table.boolean('is_recurring').notNullable().defaultTo(true);
    table.boolean('affects_gross_pay').notNullable().defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.string('status', 20).notNullable().defaultTo('draft'); // draft, active, deprecated
    table.date('effective_from');
    table.date('effective_to');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'component_code', 'version', 'deleted_at']);
    table.index(['organization_id', 'status']);
    table.index(['component_type']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.pay_component_templates IS 'Versioned template definitions for pay components - reference-based system (not snapshots)'
  `);
  
  // ================================================================
  // DEDUCTION TEMPLATES (Versioned)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('deduction_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 200).notNullable();
    table.string('deduction_type', 50).notNullable(); // statutory, voluntary, court_ordered
    table.text('description');
    table.string('calculation_method', 50).notNullable();
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.boolean('is_pre_tax').notNullable().defaultTo(false);
    table.boolean('is_recurring').notNullable().defaultTo(true);
    table.decimal('minimum_amount', 15, 2);
    table.decimal('maximum_amount', 15, 2);
    table.integer('display_order').defaultTo(0);
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.string('status', 20).notNullable().defaultTo('draft');
    table.date('effective_from');
    table.date('effective_to');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'deduction_code', 'version', 'deleted_at']);
    table.index(['organization_id', 'status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.deduction_templates IS 'Versioned deduction template definitions'
  `);
  
  // ================================================================
  // ALLOWANCE TEMPLATES (Versioned)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('allowance_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('allowance_code', 50).notNullable();
    table.string('allowance_name', 200).notNullable();
    table.string('allowance_type', 50).notNullable(); // housing, transport, meal, etc
    table.text('description');
    table.string('calculation_method', 50).notNullable();
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.boolean('is_taxable').notNullable().defaultTo(true);
    table.boolean('is_recurring').notNullable().defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.string('status', 20).notNullable().defaultTo('draft');
    table.date('effective_from');
    table.date('effective_to');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'allowance_code', 'version', 'deleted_at']);
    table.index(['organization_id', 'status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.allowance_templates IS 'Versioned allowance template definitions'
  `);
  
  // ================================================================
  // PAY STRUCTURE TEMPLATES (Versioned Composition)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('pay_structure_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('structure_code', 50).notNullable();
    table.string('structure_name', 200).notNullable();
    table.text('description');
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.string('status', 20).notNullable().defaultTo('draft');
    table.date('effective_from');
    table.date('effective_to');
    table.jsonb('structure_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'structure_code', 'version', 'deleted_at']);
    table.index(['organization_id', 'status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.pay_structure_templates IS 'Versioned pay structure compositions - aggregates components'
  `);
  
  // ================================================================
  // TEMPLATE COMPONENT LINKS (Composition System)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('template_component_links', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('pay_structure_template_id').notNullable();
    table.string('component_type', 50).notNullable(); // pay_component, deduction, allowance
    table.uuid('component_template_id').notNullable();
    table.boolean('is_required').notNullable().defaultTo(false);
    table.boolean('is_default_enabled').notNullable().defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.jsonb('override_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('pay_structure_template_id').references('id').inTable('payroll.pay_structure_templates').onDelete('CASCADE');
    table.unique(['pay_structure_template_id', 'component_type', 'component_template_id', 'deleted_at']);
    table.index(['organization_id']);
    table.index(['component_template_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.template_component_links IS 'Links pay structure templates to component templates - enables composition pattern'
  `);
  
  // ================================================================
  // PAYROLL RUN TYPES (Versioned)
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_run_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('type_code', 50).notNullable();
    table.string('type_name', 200).notNullable();
    table.text('description');
    table.string('component_override_mode', 50).notNullable().defaultTo('explicit'); // explicit, all_enabled, custom
    table.specificType('allowed_components', 'TEXT[]').defaultTo('{}');
    table.specificType('excluded_components', 'TEXT[]').defaultTo('{}');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.string('status', 20).notNullable().defaultTo('draft');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'type_code', 'version', 'deleted_at']);
    table.index(['organization_id', 'status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_run_types IS 'Versioned payroll run type definitions with component override rules'
  `);
  
  // ================================================================
  // MULTI-CURRENCY SUPPORT
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('currencies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('currency_code', 3).notNullable(); // ISO 4217
    table.string('currency_name', 100).notNullable();
    table.string('currency_symbol', 10);
    table.integer('decimal_places').notNullable().defaultTo(2);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_base_currency').notNullable().defaultTo(false);
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'currency_code', 'deleted_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.currencies IS 'Multi-currency support for international payroll'
  `);
  
  await knex.schema.withSchema('payroll').createTable('currency_exchange_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('from_currency_id').notNullable();
    table.uuid('to_currency_id').notNullable();
    table.decimal('exchange_rate', 20, 10).notNullable();
    table.date('effective_date').notNullable();
    table.string('source', 100); // manual, api, bank
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('from_currency_id').references('id').inTable('payroll.currencies').onDelete('CASCADE');
    table.foreign('to_currency_id').references('id').inTable('payroll.currencies').onDelete('CASCADE');
    table.unique(['organization_id', 'from_currency_id', 'to_currency_id', 'effective_date', 'deleted_at']);
    table.index(['effective_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.currency_exchange_rates IS 'Historical exchange rates for currency conversions'
  `);
  
  // ================================================================
  // APPROVAL WORKFLOW SYSTEM
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('approval_workflow_definitions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('workflow_code', 50).notNullable();
    table.string('workflow_name', 200).notNullable();
    table.text('description');
    table.string('entity_type', 100).notNullable(); // payroll_run, template, etc
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('allow_parallel_approval').notNullable().defaultTo(false);
    table.boolean('require_all_approvers').notNullable().defaultTo(true);
    table.integer('timeout_hours').defaultTo(48);
    table.jsonb('workflow_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'workflow_code', 'deleted_at']);
    table.index(['entity_type']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.approval_workflow_definitions IS 'Workflow definitions for approval processes'
  `);
  
  await knex.schema.withSchema('payroll').createTable('approval_chain_levels', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('workflow_id').notNullable();
    table.integer('level_number').notNullable();
    table.string('level_name', 200).notNullable();
    table.string('approver_type', 50).notNullable(); // role, user, manager, department_head
    table.specificType('approver_identifiers', 'TEXT[]'); // role names, user IDs, etc
    table.boolean('is_required').notNullable().defaultTo(true);
    table.integer('minimum_approvers').notNullable().defaultTo(1);
    table.jsonb('level_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('workflow_id').references('id').inTable('payroll.approval_workflow_definitions').onDelete('CASCADE');
    table.unique(['workflow_id', 'level_number', 'deleted_at']);
    table.index(['organization_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.approval_chain_levels IS 'Hierarchical approval chain levels within workflows'
  `);
  
  await knex.schema.withSchema('payroll').createTable('approvals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('workflow_id').notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.integer('current_level').notNullable().defaultTo(1);
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, approved, rejected, cancelled
    table.uuid('submitted_by').notNullable();
    table.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true });
    table.text('rejection_reason');
    table.jsonb('approval_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('workflow_id').references('id').inTable('payroll.approval_workflow_definitions').onDelete('CASCADE');
    table.unique(['entity_type', 'entity_id', 'deleted_at']);
    table.index(['organization_id', 'status']);
    table.index(['submitted_by']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.approvals IS 'Active approval instances tracking workflow progress'
  `);
  
  await knex.schema.withSchema('payroll').createTable('approval_actions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('approval_id').notNullable();
    table.integer('level_number').notNullable();
    table.uuid('approver_id').notNullable();
    table.string('action', 50).notNullable(); // approved, rejected, delegated
    table.text('comments');
    table.uuid('delegated_to');
    table.timestamp('action_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.jsonb('action_metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('approval_id').references('id').inTable('payroll.approvals').onDelete('CASCADE');
    table.index(['organization_id']);
    table.index(['approver_id']);
    table.index(['action_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.approval_actions IS 'Individual approval actions taken by approvers'
  `);
  
  // ================================================================
  // PAYROLL RUNS
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('run_name', 200).notNullable();
    table.uuid('payroll_run_type_id').notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.date('pay_date').notNullable();
    table.string('pay_frequency', 50).notNullable();
    table.uuid('currency_id').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft'); // draft, processing, pending_approval, approved, paid, cancelled
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.integer('employee_count').defaultTo(0);
    table.boolean('is_locked').notNullable().defaultTo(false);
    table.timestamp('locked_at', { useTz: true });
    table.uuid('locked_by');
    table.jsonb('run_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_type_id').references('id').inTable('payroll.payroll_run_types');
    table.foreign('currency_id').references('id').inTable('payroll.currencies');
    table.index(['organization_id', 'status']);
    table.index(['period_start', 'period_end']);
    table.index(['pay_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_runs IS 'Payroll run instances - master records for payroll processing cycles'
  `);
  
  await knex.schema.withSchema('payroll').createTable('payroll_run_employees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('worker_metadata_id');
    table.decimal('gross_pay', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('net_pay', 15, 2).defaultTo(0);
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, calculated, approved, paid
    table.jsonb('calculation_details').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_runs').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.unique(['payroll_run_id', 'employee_id', 'deleted_at']);
    table.index(['organization_id']);
    table.index(['status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_run_employees IS 'Employee-specific payroll calculations within a run'
  `);
  
  await knex.schema.withSchema('payroll').createTable('payroll_run_components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_employee_id').notNullable();
    table.string('component_type', 50).notNullable(); // earning, deduction, allowance, tax
    table.uuid('component_template_id');
    table.string('component_code', 50).notNullable();
    table.string('component_name', 200).notNullable();
    table.decimal('calculated_amount', 15, 2).notNullable();
    table.decimal('rate', 15, 2);
    table.decimal('quantity', 10, 2);
    table.string('calculation_method', 50);
    table.jsonb('calculation_details').defaultTo('{}');
    table.boolean('is_manual_override').notNullable().defaultTo(false);
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_employee_id').references('id').inTable('payroll.payroll_run_employees').onDelete('CASCADE');
    table.index(['organization_id']);
    table.index(['component_type']);
    table.index(['component_template_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_run_components IS 'Individual component calculations for each employee in a payroll run'
  `);
  
  // ================================================================
  // TAX ENGINE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('tax_rule_sets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('rule_set_code', 50).notNullable();
    table.string('rule_set_name', 200).notNullable();
    table.string('country_code', 3).notNullable(); // ISO 3166
    table.string('jurisdiction', 100); // state, province, city
    table.text('description');
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.string('version', 20).notNullable().defaultTo('1.0.0');
    table.jsonb('rule_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'rule_set_code', 'version', 'deleted_at']);
    table.index(['country_code']);
    table.index(['effective_from', 'effective_to']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.tax_rule_sets IS 'Tax rule set definitions for different jurisdictions'
  `);
  
  await knex.schema.withSchema('payroll').createTable('tax_brackets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('tax_rule_set_id').notNullable();
    table.string('bracket_type', 50).notNullable(); // federal, state, social_security, etc
    table.integer('bracket_number').notNullable();
    table.decimal('income_from', 15, 2).notNullable();
    table.decimal('income_to', 15, 2);
    table.decimal('tax_rate', 5, 4).notNullable(); // stored as decimal (e.g., 0.25 for 25%)
    table.decimal('fixed_amount', 15, 2).defaultTo(0);
    table.string('calculation_method', 50).notNullable().defaultTo('progressive');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('tax_rule_set_id').references('id').inTable('payroll.tax_rule_sets').onDelete('CASCADE');
    table.unique(['tax_rule_set_id', 'bracket_type', 'bracket_number', 'deleted_at']);
    table.index(['organization_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.tax_brackets IS 'Tax bracket definitions for progressive tax calculations'
  `);
  
  await knex.schema.withSchema('payroll').createTable('tax_calculations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_employee_id').notNullable();
    table.uuid('tax_rule_set_id').notNullable();
    table.string('tax_type', 50).notNullable();
    table.decimal('taxable_income', 15, 2).notNullable();
    table.decimal('tax_amount', 15, 2).notNullable();
    table.decimal('effective_rate', 5, 4);
    table.jsonb('calculation_breakdown').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_employee_id').references('id').inTable('payroll.payroll_run_employees').onDelete('CASCADE');
    table.foreign('tax_rule_set_id').references('id').inTable('payroll.tax_rule_sets').onDelete('CASCADE');
    table.index(['organization_id']);
    table.index(['tax_type']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.tax_calculations IS 'Detailed tax calculation results for each employee in payroll runs'
  `);
  
  // ================================================================
  // TIME & ATTENDANCE INTEGRATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('time_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('payroll_run_id');
    table.date('entry_date').notNullable();
    table.string('entry_type', 50).notNullable(); // regular, overtime, double_time
    table.decimal('hours_worked', 8, 2).notNullable();
    table.decimal('hourly_rate', 10, 2);
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, approved, processed
    table.text('notes');
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    table.jsonb('entry_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_runs').onDelete('SET NULL');
    table.index(['organization_id', 'entry_date']);
    table.index(['employee_id', 'status']);
    table.index(['payroll_run_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.time_entries IS 'Time entry records for hourly workers'
  `);
  
  // ================================================================
  // COMPLIANCE & REPORTING
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('compliance_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('report_type', 100).notNullable(); // year_end, quarterly, monthly
    table.string('jurisdiction', 100).notNullable();
    table.integer('reporting_year').notNullable();
    table.integer('reporting_period'); // quarter or month
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.jsonb('report_data').defaultTo('{}');
    table.string('file_path', 500);
    table.uuid('generated_by');
    table.timestamp('generated_at', { useTz: true });
    table.uuid('submitted_by');
    table.timestamp('submitted_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'report_type']);
    table.index(['reporting_year', 'reporting_period']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.compliance_reports IS 'Compliance and regulatory reports for tax authorities'
  `);
  
  // ================================================================
  // MATERIALIZED VIEWS FOR PERFORMANCE
  // ================================================================
  
  await knex.raw(`
    CREATE MATERIALIZED VIEW payroll.vw_active_pay_structures AS
    SELECT 
      ps.id,
      ps.organization_id,
      ps.structure_code,
      ps.structure_name,
      ps.version,
      ps.status,
      ps.effective_from,
      ps.effective_to,
      COUNT(tcl.id) as component_count,
      json_agg(
        json_build_object(
          'component_type', tcl.component_type,
          'component_id', tcl.component_template_id,
          'is_required', tcl.is_required
        )
      ) as components
    FROM payroll.pay_structure_templates ps
    LEFT JOIN payroll.template_component_links tcl ON ps.id = tcl.pay_structure_template_id
    WHERE ps.status = 'active'
      AND ps.deleted_at IS NULL
      AND tcl.deleted_at IS NULL
    GROUP BY ps.id, ps.organization_id, ps.structure_code, ps.structure_name, 
             ps.version, ps.status, ps.effective_from, ps.effective_to
  `);
  
  await knex.raw(`
    CREATE INDEX idx_vw_active_pay_structures_org ON payroll.vw_active_pay_structures(organization_id)
  `);
  
  await knex.raw(`
    COMMENT ON MATERIALIZED VIEW payroll.vw_active_pay_structures IS 'Materialized view of active pay structures with component aggregations for performance'
  `);
  
  await knex.raw(`
    CREATE MATERIALIZED VIEW payroll.vw_pending_approvals AS
    SELECT 
      a.id,
      a.organization_id,
      a.workflow_id,
      a.entity_type,
      a.entity_id,
      a.current_level,
      a.status,
      a.submitted_by,
      a.submitted_at,
      w.workflow_name,
      acl.level_name,
      acl.approver_type,
      acl.approver_identifiers,
      acl.minimum_approvers,
      COUNT(aa.id) FILTER (WHERE aa.action = 'approved') as approvals_received
    FROM payroll.approvals a
    JOIN payroll.approval_workflow_definitions w ON a.workflow_id = w.id
    JOIN payroll.approval_chain_levels acl ON a.workflow_id = acl.workflow_id 
      AND a.current_level = acl.level_number
    LEFT JOIN payroll.approval_actions aa ON a.id = aa.approval_id 
      AND aa.level_number = a.current_level
    WHERE a.status = 'pending'
      AND a.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND acl.deleted_at IS NULL
    GROUP BY a.id, a.organization_id, a.workflow_id, a.entity_type, a.entity_id,
             a.current_level, a.status, a.submitted_by, a.submitted_at,
             w.workflow_name, acl.level_name, acl.approver_type, 
             acl.approver_identifiers, acl.minimum_approvers
  `);
  
  await knex.raw(`
    CREATE INDEX idx_vw_pending_approvals_org ON payroll.vw_pending_approvals(organization_id)
  `);
  
  await knex.raw(`
    COMMENT ON MATERIALIZED VIEW payroll.vw_pending_approvals IS 'Real-time view of pending approvals with progress tracking'
  `);
  
  await knex.raw(`
    CREATE MATERIALIZED VIEW payroll.vw_payroll_run_summary AS
    SELECT 
      pr.id,
      pr.organization_id,
      pr.run_name,
      pr.period_start,
      pr.period_end,
      pr.pay_date,
      pr.status,
      pr.total_gross,
      pr.total_deductions,
      pr.total_net,
      pr.employee_count,
      COUNT(pre.id) as processed_employees,
      SUM(CASE WHEN pre.status = 'approved' THEN 1 ELSE 0 END) as approved_employees,
      c.currency_code,
      c.currency_symbol
    FROM payroll.payroll_runs pr
    LEFT JOIN payroll.payroll_run_employees pre ON pr.id = pre.payroll_run_id
    LEFT JOIN payroll.currencies c ON pr.currency_id = c.id
    WHERE pr.deleted_at IS NULL
      AND (pre.deleted_at IS NULL OR pre.id IS NULL)
    GROUP BY pr.id, pr.organization_id, pr.run_name, pr.period_start, pr.period_end,
             pr.pay_date, pr.status, pr.total_gross, pr.total_deductions, pr.total_net,
             pr.employee_count, c.currency_code, c.currency_symbol
  `);
  
  await knex.raw(`
    CREATE INDEX idx_vw_payroll_run_summary_org ON payroll.vw_payroll_run_summary(organization_id)
  `);
  
  await knex.raw(`
    COMMENT ON MATERIALIZED VIEW payroll.vw_payroll_run_summary IS 'Summary view of payroll runs with processing metrics'
  `);
  
  // ================================================================
  // ADDITIONAL TABLES - PAYCHECKS & PAYMENTS
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('paychecks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_employee_id').notNullable();
    table.string('paycheck_number', 50).notNullable();
    table.date('pay_date').notNullable();
    table.decimal('gross_amount', 15, 2).notNullable();
    table.decimal('net_amount', 15, 2).notNullable();
    table.string('payment_method', 50).notNullable(); // direct_deposit, check, cash, wire
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, issued, cancelled, void
    table.string('check_file_path', 500);
    table.jsonb('paycheck_metadata').defaultTo('{}');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_employee_id').references('id').inTable('payroll.payroll_run_employees').onDelete('CASCADE');
    table.unique(['organization_id', 'paycheck_number', 'deleted_at']);
    table.index(['organization_id', 'status']);
    table.index(['pay_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.paychecks IS 'Individual paychecks issued to employees'
  `);
  
  await knex.schema.withSchema('payroll').createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('paycheck_id').notNullable();
    table.string('payment_type', 50).notNullable(); // salary, bonus, reimbursement
    table.decimal('amount', 15, 2).notNullable();
    table.string('payment_reference', 100);
    table.date('payment_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, completed, failed, cancelled
    table.text('failure_reason');
    table.jsonb('payment_metadata').defaultTo('{}');
    table.uuid('processed_by');
    table.timestamp('processed_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('paycheck_id').references('id').inTable('payroll.paychecks').onDelete('CASCADE');
    table.index(['organization_id', 'status']);
    table.index(['payment_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payments IS 'Payment transaction records for paycheck disbursements'
  `);
  
  await knex.schema.withSchema('payroll').createTable('payroll_reconciliation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('payroll_run_id').notNullable();
    table.string('reconciliation_type', 50).notNullable(); // bank, tax, benefits
    table.date('reconciliation_date').notNullable();
    table.decimal('expected_amount', 15, 2).notNullable();
    table.decimal('actual_amount', 15, 2).notNullable();
    table.decimal('variance', 15, 2).notNullable();
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, reconciled, discrepancy
    table.text('notes');
    table.jsonb('reconciliation_details').defaultTo('{}');
    table.uuid('reconciled_by');
    table.timestamp('reconciled_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('payroll_run_id').references('id').inTable('payroll.payroll_runs').onDelete('CASCADE');
    table.index(['organization_id', 'status']);
    table.index(['reconciliation_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_reconciliation IS 'Financial reconciliation records for payroll runs'
  `);
  
  // ================================================================
  // AUDIT & LOGGING
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action', 50).notNullable(); // create, update, delete, approve, reject
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.uuid('performed_by').notNullable();
    table.timestamp('performed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.jsonb('audit_metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'entity_type']);
    table.index(['entity_id']);
    table.index(['performed_by']);
    table.index(['performed_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.audit_logs IS 'Comprehensive audit trail for all payroll operations'
  `);
  
  // ================================================================
  // REPORTING
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('report_type', 100).notNullable(); // summary, detail, custom
    table.string('report_name', 200).notNullable();
    table.string('report_format', 50).notNullable(); // pdf, excel, csv
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.jsonb('report_parameters').defaultTo('{}');
    table.string('file_path', 500);
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, generating, completed, failed
    table.text('error_message');
    table.uuid('generated_by').notNullable();
    table.timestamp('generated_at', { useTz: true });
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'report_type']);
    table.index(['status']);
    table.index(['generated_at']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_reports IS 'Generated payroll reports for analysis and compliance'
  `);
  
  await knex.schema.withSchema('payroll').createTable('tax_forms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.string('form_type', 50).notNullable(); // W2, 1099, T4, etc
    table.integer('tax_year').notNullable();
    table.jsonb('form_data').notNullable();
    table.string('file_path', 500);
    table.string('status', 50).notNullable().defaultTo('draft'); // draft, finalized, submitted, corrected
    table.date('issued_date');
    table.date('submission_date');
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.unique(['organization_id', 'employee_id', 'form_type', 'tax_year', 'deleted_at']);
    table.index(['organization_id', 'tax_year']);
    table.index(['status']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.tax_forms IS 'Tax forms (W2, 1099, T4, etc.) for employees'
  `);
  
  // ================================================================
  // CONFIGURATION
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('payroll_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.string('setting_category', 100).notNullable(); // general, compliance, approval, calculation
    table.string('setting_key', 100).notNullable();
    table.jsonb('setting_value').notNullable();
    table.text('description');
    table.boolean('is_encrypted').notNullable().defaultTo(false);
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'setting_category', 'setting_key', 'deleted_at']);
    table.index(['organization_id']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE payroll.payroll_settings IS 'Organization-specific payroll configuration settings'
  `);
  
  // ================================================================
  // GRANT PERMISSIONS
  // ================================================================
  
  const tables = [
    'employee_payroll_config', 'compensation', 'worker_metadata', 'worker_type_pay_config',
    'pay_component_templates', 'deduction_templates', 'allowance_templates', 
    'pay_structure_templates', 'template_component_links', 'payroll_run_types',
    'currencies', 'currency_exchange_rates', 'approval_workflow_definitions',
    'approval_chain_levels', 'approvals', 'approval_actions', 'payroll_runs',
    'payroll_run_employees', 'payroll_run_components', 'tax_rule_sets',
    'tax_brackets', 'tax_calculations', 'time_entries', 'compliance_reports',
    'paychecks', 'payments', 'payroll_reconciliation', 'audit_logs',
    'payroll_reports', 'tax_forms', 'payroll_settings'
  ];
  
  for (const table of tables) {
    await knex.raw(`GRANT ALL ON TABLE payroll.${table} TO recruitiq_app`);
  }
  
  console.log('✅ PayLinQ schema created successfully');
};

exports.down = async function(knex) {
  console.log('Dropping PayLinQ schema...');
  
  // Drop materialized views first (no dependencies)
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS payroll.vw_payroll_run_summary CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS payroll.vw_pending_approvals CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS payroll.vw_active_pay_structures CASCADE');
  
  // Drop tables in reverse dependency order
  // Child tables with foreign keys to other payroll tables
  await knex.schema.withSchema('payroll').dropTableIfExists('paychecks');
  await knex.schema.withSchema('payroll').dropTableIfExists('payments');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_reconciliation');
  await knex.schema.withSchema('payroll').dropTableIfExists('audit_logs');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_reports');
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_forms');
  await knex.schema.withSchema('payroll').dropTableIfExists('approval_actions');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_run_components');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_run_employees');
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_brackets');
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_calculations');
  await knex.schema.withSchema('payroll').dropTableIfExists('currency_exchange_rates');
  await knex.schema.withSchema('payroll').dropTableIfExists('template_component_links');
  await knex.schema.withSchema('payroll').dropTableIfExists('approval_chain_levels');
  await knex.schema.withSchema('payroll').dropTableIfExists('time_entries');
  await knex.schema.withSchema('payroll').dropTableIfExists('compliance_reports');
  
  // Mid-level tables
  await knex.schema.withSchema('payroll').dropTableIfExists('approvals');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_runs');
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_rule_sets');
  await knex.schema.withSchema('payroll').dropTableIfExists('pay_component_templates');
  await knex.schema.withSchema('payroll').dropTableIfExists('deduction_templates');
  await knex.schema.withSchema('payroll').dropTableIfExists('allowance_templates');
  await knex.schema.withSchema('payroll').dropTableIfExists('pay_structure_templates');
  await knex.schema.withSchema('payroll').dropTableIfExists('approval_workflow_definitions');
  await knex.schema.withSchema('payroll').dropTableIfExists('currencies');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_run_types');
  await knex.schema.withSchema('payroll').dropTableIfExists('payroll_settings');
  
  // Base configuration tables (no dependencies on other payroll tables)
  await knex.schema.withSchema('payroll').dropTableIfExists('worker_type_pay_config');
  await knex.schema.withSchema('payroll').dropTableIfExists('worker_metadata');
  await knex.schema.withSchema('payroll').dropTableIfExists('compensation');
  await knex.schema.withSchema('payroll').dropTableIfExists('employee_payroll_config');
  
  // Drop helper function
  await knex.raw('DROP FUNCTION IF EXISTS payroll.get_current_organization_id() CASCADE');
  
  // Drop schema (CASCADE will catch any remaining objects)
  await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
  
  console.log('✅ PayLinQ schema dropped successfully');
};
