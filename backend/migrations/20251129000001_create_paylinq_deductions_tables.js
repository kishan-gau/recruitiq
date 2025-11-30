/**
 * Migration: Create PayLinQ Deductions Tables
 * 
 * Creates tables for deductions management:
 * - deductions (deduction definitions)
 * - active_deductions (currently active deductions)
 * - deduction_templates (reusable deduction templates)
 * - statutory_deductions (legal required deductions)
 * - employee_deduction_overrides (per-employee overrides)
 * - payroll_run_deductions (deductions applied in payroll runs)
 * - historical_deductions (historical tracking)
 */

exports.up = async function(knex) {
  // 1. deductions table
  await knex.schema.createTable('deductions', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Tenant Isolation
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    // Foreign Keys
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('deduction_template_id').nullable()
      .references('id').inTable('deduction_templates').onDelete('SET NULL');
    
    // Deduction Details
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 200).notNullable();
    table.enum('deduction_type', [
      'tax', 'pension', 'insurance', 'loan', 'garnishment', 
      'voluntary', 'statutory', 'other'
    ]).notNullable();
    table.decimal('deduction_amount', 15, 2).notNullable();
    table.enum('calculation_method', [
      'fixed_amount', 'percentage', 'tiered', 'formula'
    ]).defaultTo('fixed_amount');
    table.decimal('percentage_rate', 5, 2).nullable();
    table.jsonb('calculation_metadata').nullable();
    
    // Status and Validity
    table.enum('status', ['active', 'inactive', 'suspended', 'completed']).defaultTo('active');
    table.date('effective_date').notNullable();
    table.date('end_date').nullable();
    table.boolean('is_recurring').defaultTo(true);
    table.integer('frequency_months').nullable();
    
    // Limits and Tracking
    table.decimal('total_amount_limit', 15, 2).nullable();
    table.decimal('amount_deducted_to_date', 15, 2).defaultTo(0);
    table.integer('remaining_installments').nullable();
    
    // Priority and Processing
    table.integer('priority_order').defaultTo(0);
    table.boolean('is_taxable').defaultTo(false);
    table.boolean('is_pre_tax').defaultTo(false);
    
    // Notes
    table.text('notes').nullable();
    
    // Audit Columns
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    // Indexes
    table.index('organization_id');
    table.index('employee_record_id');
    table.index('deduction_type');
    table.index('status');
    table.index(['organization_id', 'deduction_code']);
    table.index(['employee_record_id', 'status']);
  });

  // 2. active_deductions table
  await knex.schema.createTable('active_deductions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('deduction_id').notNullable()
      .references('id').inTable('deductions').onDelete('CASCADE');
    
    table.date('active_from').notNullable();
    table.date('active_until').nullable();
    table.boolean('is_currently_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('organization_id');
    table.index('employee_record_id');
    table.index('deduction_id');
    table.index(['employee_record_id', 'is_currently_active']);
  });

  // 3. deduction_templates table
  await knex.schema.createTable('deduction_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('template_code', 50).notNullable();
    table.string('template_name', 200).notNullable();
    table.text('description').nullable();
    table.enum('deduction_type', [
      'tax', 'pension', 'insurance', 'loan', 'garnishment', 
      'voluntary', 'statutory', 'other'
    ]).notNullable();
    
    table.decimal('default_amount', 15, 2).nullable();
    table.decimal('default_percentage', 5, 2).nullable();
    table.enum('calculation_method', [
      'fixed_amount', 'percentage', 'tiered', 'formula'
    ]).defaultTo('fixed_amount');
    table.jsonb('calculation_metadata').nullable();
    
    table.boolean('is_taxable').defaultTo(false);
    table.boolean('is_pre_tax').defaultTo(false);
    table.boolean('is_recurring').defaultTo(true);
    table.integer('default_priority_order').defaultTo(0);
    
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'template_code']);
    table.index('organization_id');
    table.index('deduction_type');
    table.index('is_active');
  });

  // 4. statutory_deductions table
  await knex.schema.createTable('statutory_deductions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 200).notNullable();
    table.string('country_code', 3).notNullable();
    table.text('description').nullable();
    
    table.enum('calculation_method', [
      'fixed_amount', 'percentage', 'tiered', 'formula'
    ]).notNullable();
    table.decimal('rate_percentage', 5, 2).nullable();
    table.jsonb('calculation_rules').nullable();
    
    table.boolean('is_mandatory').defaultTo(true);
    table.boolean('is_employer_contribution').defaultTo(false);
    table.integer('priority_order').defaultTo(0);
    
    table.date('effective_from').notNullable();
    table.date('effective_until').nullable();
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['organization_id', 'deduction_code', 'effective_from']);
    table.index('organization_id');
    table.index('country_code');
    table.index(['is_active', 'effective_from']);
  });

  // 5. employee_deduction_overrides table
  await knex.schema.createTable('employee_deduction_overrides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('deduction_id').notNullable()
      .references('id').inTable('deductions').onDelete('CASCADE');
    
    table.decimal('override_amount', 15, 2).nullable();
    table.decimal('override_percentage', 5, 2).nullable();
    table.string('override_reason', 500).nullable();
    
    table.date('effective_from').notNullable();
    table.date('effective_until').nullable();
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    
    table.index('organization_id');
    table.index('employee_record_id');
    table.index('deduction_id');
    table.index(['employee_record_id', 'is_active']);
  });

  // 6. payroll_run_deductions table
  await knex.schema.createTable('payroll_run_deductions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('payroll_run_id').notNullable()
      .references('id').inTable('payroll_runs').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('deduction_id').notNullable()
      .references('id').inTable('deductions').onDelete('RESTRICT');
    
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 200).notNullable();
    table.enum('deduction_type', [
      'tax', 'pension', 'insurance', 'loan', 'garnishment', 
      'voluntary', 'statutory', 'other'
    ]).notNullable();
    
    table.decimal('deduction_amount', 15, 2).notNullable();
    table.decimal('gross_pay_used', 15, 2).nullable();
    table.decimal('taxable_income_used', 15, 2).nullable();
    table.jsonb('calculation_details').nullable();
    
    table.boolean('is_taxable').defaultTo(false);
    table.boolean('is_pre_tax').defaultTo(false);
    table.integer('priority_order').defaultTo(0);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('organization_id');
    table.index('payroll_run_id');
    table.index('employee_record_id');
    table.index('deduction_id');
    table.index(['payroll_run_id', 'employee_record_id']);
  });

  // 7. historical_deductions table
  await knex.schema.createTable('historical_deductions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('original_deduction_id').notNullable();
    
    table.string('deduction_code', 50).notNullable();
    table.string('deduction_name', 200).notNullable();
    table.enum('deduction_type', [
      'tax', 'pension', 'insurance', 'loan', 'garnishment', 
      'voluntary', 'statutory', 'other'
    ]).notNullable();
    
    table.decimal('total_amount_deducted', 15, 2).notNullable();
    table.integer('number_of_deductions').notNullable();
    table.date('first_deduction_date').notNullable();
    table.date('last_deduction_date').notNullable();
    table.date('archived_date').notNullable().defaultTo(knex.fn.now());
    
    table.enum('completion_status', [
      'completed', 'cancelled', 'expired', 'transferred'
    ]).notNullable();
    table.text('notes').nullable();
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('archived_by').references('id').inTable('hris.user_account');
    
    table.index('organization_id');
    table.index('employee_record_id');
    table.index('original_deduction_id');
    table.index('archived_date');
  });

  console.log('✅ PayLinQ deductions tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('historical_deductions');
  await knex.schema.dropTableIfExists('payroll_run_deductions');
  await knex.schema.dropTableIfExists('employee_deduction_overrides');
  await knex.schema.dropTableIfExists('statutory_deductions');
  await knex.schema.dropTableIfExists('active_deductions');
  await knex.schema.dropTableIfExists('deductions');
  await knex.schema.dropTableIfExists('deduction_templates');
  
  console.log('✅ PayLinQ deductions tables dropped successfully');
};
