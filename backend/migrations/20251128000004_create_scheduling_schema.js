/**
 * Migration: Create ScheduleHub schema
 * 
 * Creates comprehensive workforce scheduling schema including:
 * - Worker scheduling configuration
 * - Roles and role assignments
 * - Stations and locations
 * - Shifts and shift templates
 * - Availability and preferences
 * - Shift swaps and time-off requests
 * - Schedule generation and optimization
 * 
 * References: hris.employee for worker data
 * Schema: scheduling
 */

export async function up(knex) {
  // Create scheduling schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');
  
  // Set search path
  await knex.raw('SET search_path TO scheduling, public');
  
  // ================================================================
  // WORKER SCHEDULING CONFIGURATION
  // ================================================================
  await knex.schema.withSchema('scheduling').createTable('worker_scheduling_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Scheduling preferences
    table.boolean('is_schedulable').notNullable().defaultTo(true);
    table.integer('max_hours_per_week').nullable();
    table.integer('max_shifts_per_week').nullable();
    table.integer('min_hours_between_shifts').defaultTo(12);
    table.jsonb('preferred_shifts').defaultTo('[]');
    table.jsonb('unavailable_days').defaultTo('[]');
    
    // Compliance and rules
    table.boolean('requires_rest_day').defaultTo(true);
    table.boolean('can_work_overtime').defaultTo(false);
    table.boolean('can_work_nights').defaultTo(true);
    table.boolean('can_work_weekends').defaultTo(true);
    
    // Metadata
    table.jsonb('custom_rules').defaultTo('{}');
    table.text('notes').nullable();
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    // Constraints
    table.unique(['organization_id', 'employee_id']);
  });
  
  await knex.raw(`
    CREATE INDEX idx_worker_config_organization ON scheduling.worker_scheduling_config(organization_id);
    CREATE INDEX idx_worker_config_employee ON scheduling.worker_scheduling_config(employee_id);
    CREATE INDEX idx_worker_config_schedulable ON scheduling.worker_scheduling_config(is_schedulable);
    
    COMMENT ON TABLE scheduling.worker_scheduling_config IS 'Scheduling-specific configuration for employees. Core employee data is in hris.employee (single source of truth)';
    COMMENT ON COLUMN scheduling.worker_scheduling_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data';
  `);
  
  // ================================================================
  // ROLES
  // ================================================================
  await knex.schema.withSchema('scheduling').createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    
    table.string('role_code', 50).notNullable();
    table.string('role_name', 100).notNullable();
    table.text('description').nullable();
    table.string('color', 20).defaultTo('#3B82F6');
    
    table.jsonb('required_skills').defaultTo('[]');
    table.jsonb('certifications').defaultTo('[]');
    table.integer('min_experience_months').defaultTo(0);
    
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'role_code']);
  });
  
  await knex.raw(`
    CREATE INDEX idx_roles_organization ON scheduling.roles(organization_id);
    CREATE INDEX idx_roles_active ON scheduling.roles(is_active);
  `);
  
  // ================================================================
  // WORKER ROLES (Many-to-Many)
  // ================================================================
  await knex.schema.withSchema('scheduling').createTable('worker_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('scheduling.roles').onDelete('CASCADE');
    
    table.boolean('is_primary').notNullable().defaultTo(false);
    table.string('proficiency', 50).defaultTo('competent');
    table.date('assigned_date').notNullable().defaultTo(knex.fn.now());
    table.date('removed_date').nullable();
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['employee_id', 'role_id', 'removed_date']);
  });
  
  await knex.raw(`
    CREATE INDEX idx_worker_roles_employee ON scheduling.worker_roles(employee_id);
    CREATE INDEX idx_worker_roles_role ON scheduling.worker_roles(role_id);
    CREATE INDEX idx_worker_roles_organization ON scheduling.worker_roles(organization_id);
    
    COMMENT ON COLUMN scheduling.worker_roles.employee_id IS 'References hris.employee(id) - the single source of truth';
  `);
  
  // ================================================================
  // STATIONS
  // ================================================================
  await knex.schema.withSchema('scheduling').createTable('stations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    
    table.string('station_code', 50).notNullable();
    table.string('station_name', 100).notNullable();
    table.text('description').nullable();
    table.string('station_type', 50).defaultTo('standard');
    
    table.integer('capacity').notNullable().defaultTo(1);
    table.jsonb('equipment').defaultTo('[]');
    table.jsonb('required_roles').defaultTo('[]');
    
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'station_code']);
  });
  
  await knex.raw(`
    CREATE INDEX idx_stations_organization ON scheduling.stations(organization_id);
    CREATE INDEX idx_stations_location ON scheduling.stations(location_id);
    CREATE INDEX idx_stations_active ON scheduling.stations(is_active);
  `);
  
  // Continue with remaining tables (shifts, availability, etc.) in part 2...
}

export async function down(knex) {
  await knex.raw('DROP SCHEMA IF EXISTS scheduling CASCADE');
}
