/**
 * Migration: HRIS/Nexus Schema
 * Created: 2025-11-30
 * 
 * Creates all tables for the Nexus (HRIS) product
 */

export async function up(knex) {
  // ========================================
  // HRIS/NEXUS PRODUCT TABLES
  // ========================================

  // Locations
  await knex.schema.createTable('hris_locations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('address').nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('country', 100).notNullable();
    table.string('phone', 30).nullable();
    table.string('email', 255).nullable();
    table.string('timezone', 100).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_locations_org_deleted');
    table.index(['is_active'], 'idx_hris_locations_active');
    table.index(['country'], 'idx_hris_locations_country');
  });

  // Departments
  await knex.schema.createTable('hris_departments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('location_id').nullable().references('id').inTable('hris_locations').onDelete('SET NULL');
    table.string('name', 200).notNullable();
    table.string('code', 50).nullable();
    table.text('description').nullable();
    table.uuid('manager_id').nullable();
    table.uuid('parent_department_id').nullable().references('id').inTable('hris_departments').onDelete('SET NULL');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'code', 'deleted_at'], { indexName: 'uq_hris_departments_org_code_deleted' });
    table.index(['organization_id', 'deleted_at'], 'idx_hris_departments_org_deleted');
    table.index(['location_id'], 'idx_hris_departments_location');
    table.index(['parent_department_id'], 'idx_hris_departments_parent');
  });

  // Add foreign key for manager_id after employee_records table is created
  await knex.raw(`
    ALTER TABLE hris_departments 
    ADD CONSTRAINT fk_hris_departments_manager 
    FOREIGN KEY (manager_id) 
    REFERENCES employee_records(id) 
    ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED
  `);

  // Employee Records
  await knex.schema.createTable('employee_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_account_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('employee_id', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('middle_name', 100).nullable();
    table.string('email', 255).notNullable();
    table.string('phone', 30).nullable();
    table.date('date_of_birth').nullable();
    table.string('gender', 20).nullable();
    table.string('nationality', 100).nullable();
    table.string('marital_status', 30).nullable();
    table.uuid('department_id').nullable().references('id').inTable('hris_departments').onDelete('SET NULL');
    table.uuid('location_id').nullable().references('id').inTable('hris_locations').onDelete('SET NULL');
    table.string('job_title', 200).notNullable();
    table.string('employment_type', 50).notNullable();
    table.date('hire_date').notNullable();
    table.date('termination_date').nullable();
    table.string('employment_status', 50).notNullable().defaultTo('active');
    table.uuid('reports_to').nullable().references('id').inTable('employee_records').onDelete('SET NULL');
    table.decimal('salary', 15, 2).nullable();
    table.string('currency', 3).nullable();
    table.string('pay_frequency', 30).nullable();
    table.jsonb('emergency_contacts').nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'employee_id', 'deleted_at'], { indexName: 'uq_employee_records_org_emp_id_deleted' });
    table.unique(['organization_id', 'email', 'deleted_at'], { indexName: 'uq_employee_records_org_email_deleted' });
    table.index(['organization_id', 'deleted_at'], 'idx_employee_records_org_deleted');
    table.index(['department_id'], 'idx_employee_records_department');
    table.index(['location_id'], 'idx_employee_records_location');
    table.index(['employment_status'], 'idx_employee_records_status');
    table.index(['reports_to'], 'idx_employee_records_reports_to');
  });

  // Time-Off Types
  await knex.schema.createTable('hris_time_off_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('code', 50).notNullable();
    table.text('description').nullable();
    table.boolean('is_paid').notNullable().defaultTo(true);
    table.boolean('requires_approval').notNullable().defaultTo(true);
    table.integer('default_days_per_year').nullable();
    table.boolean('carry_forward_allowed').notNullable().defaultTo(false);
    table.integer('max_carry_forward_days').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'code', 'deleted_at'], { indexName: 'uq_hris_time_off_types_org_code_deleted' });
    table.index(['organization_id', 'deleted_at'], 'idx_hris_time_off_types_org_deleted');
  });

  // Time-Off Requests
  await knex.schema.createTable('hris_time_off_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris_time_off_types').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('days_requested', 5, 2).notNullable();
    table.text('reason').nullable();
    table.string('status', 30).notNullable().defaultTo('pending');
    table.uuid('approved_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.text('approval_notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_time_off_requests_org_deleted');
    table.index(['employee_id'], 'idx_hris_time_off_requests_employee');
    table.index(['time_off_type_id'], 'idx_hris_time_off_requests_type');
    table.index(['status'], 'idx_hris_time_off_requests_status');
    table.index(['start_date', 'end_date'], 'idx_hris_time_off_requests_dates');
  });

  // Time-Off Balances
  await knex.schema.createTable('hris_time_off_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris_time_off_types').onDelete('CASCADE');
    table.integer('year').notNullable();
    table.decimal('total_days', 5, 2).notNullable().defaultTo(0);
    table.decimal('used_days', 5, 2).notNullable().defaultTo(0);
    table.decimal('pending_days', 5, 2).notNullable().defaultTo(0);
    table.decimal('remaining_days', 5, 2).notNullable().defaultTo(0);
    table.decimal('carried_forward_days', 5, 2).notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['employee_id', 'time_off_type_id', 'year'], { indexName: 'uq_hris_time_off_balances_emp_type_year' });
    table.index(['organization_id'], 'idx_hris_time_off_balances_org');
    table.index(['employee_id'], 'idx_hris_time_off_balances_employee');
    table.index(['year'], 'idx_hris_time_off_balances_year');
  });

  console.log('✅ HRIS/Nexus schema created successfully');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('hris_time_off_balances');
  await knex.schema.dropTableIfExists('hris_time_off_requests');
  await knex.schema.dropTableIfExists('hris_time_off_types');
  
  // Remove foreign key constraint before dropping tables
  await knex.raw('ALTER TABLE hris_departments DROP CONSTRAINT IF EXISTS fk_hris_departments_manager');
  
  await knex.schema.dropTableIfExists('employee_records');
  await knex.schema.dropTableIfExists('hris_departments');
  await knex.schema.dropTableIfExists('hris_locations');
  
  console.log('✅ HRIS/Nexus schema rolled back');
}
