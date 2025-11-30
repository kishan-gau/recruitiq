/**
 * Migration: Create PayLinQ payroll tables
 * Creates all tables needed for PayLinQ payroll processing
 */

exports.up = async function(knex) {
  // Create payroll_runs table
  await knex.schema.createTable('payroll_runs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.string('run_code', 50).notNullable();
    table.string('run_type_code', 50).notNullable();
    table.string('period_type', 20).notNullable(); // monthly, weekly, etc.
    table.date('period_start_date').notNullable();
    table.date('period_end_date').notNullable();
    table.date('payment_date').notNullable();
    table.string('status', 20).notNullable().defaultTo('draft');
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.integer('employee_count').defaultTo(0);
    table.jsonb('metadata');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.unique(['organization_id', 'run_code']);
    table.index('organization_id');
    table.index('status');
    table.index('payment_date');
  });

  // Create payroll_run_types table
  await knex.schema.createTable('payroll_run_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.string('type_code', 50).notNullable();
    table.string('type_name', 100).notNullable();
    table.text('description');
    table.string('component_override_mode', 20).notNullable().defaultTo('inherit');
    table.jsonb('allowed_components');
    table.jsonb('excluded_components');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.unique(['organization_id', 'type_code']);
    table.index('organization_id');
  });

  // Create payroll_run_employees table
  await knex.schema.createTable('payroll_run_employees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('payroll_run_id').notNullable()
      .references('id').inTable('payroll_runs').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.decimal('gross_pay', 15, 2).notNullable().defaultTo(0);
    table.decimal('total_deductions', 15, 2).notNullable().defaultTo(0);
    table.decimal('net_pay', 15, 2).notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('pending');
    table.jsonb('calculation_metadata');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.unique(['payroll_run_id', 'employee_record_id']);
    table.index('payroll_run_id');
    table.index('employee_record_id');
    table.index('organization_id');
  });

  // Create payroll_run_components table
  await knex.schema.createTable('payroll_run_components', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('payroll_run_employee_id').notNullable()
      .references('id').inTable('payroll_run_employees').onDelete('CASCADE');
    table.uuid('component_id').notNullable()
      .references('id').inTable('pay_components').onDelete('RESTRICT');
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.string('component_code', 50).notNullable();
    table.string('component_name', 100).notNullable();
    table.string('component_type', 20).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.jsonb('calculation_metadata');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamps(true, true);
    
    table.index('payroll_run_employee_id');
    table.index('component_id');
    table.index('organization_id');
  });

  console.log('✅ PayLinQ payroll tables created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('payroll_run_components');
  await knex.schema.dropTableIfExists('payroll_run_employees');
  await knex.schema.dropTableIfExists('payroll_run_types');
  await knex.schema.dropTableIfExists('payroll_runs');
  
  console.log('✅ PayLinQ payroll tables dropped successfully');
};
