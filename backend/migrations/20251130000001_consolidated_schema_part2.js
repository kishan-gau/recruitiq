/**
 * Consolidated Database Schema Migration - Part 2
 * This migration creates tables for RecruitIQ and ScheduleHub products
 * 
 * Part 2 of 3: RecruitIQ and ScheduleHub tables
 */

exports.up = async function(knex) {
  // ========================================
  // RecruitIQ Product Tables
  // ========================================

  // Job postings
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('hris.workspaces').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.string('department', 100);
    table.string('location', 255);
    table.string('employment_type', 50).notNullable().defaultTo('full-time');
    table.integer('salary_min');
    table.integer('salary_max');
    table.string('status', 50).notNullable().defaultTo('draft');
    table.boolean('is_published').defaultTo(false);
    table.jsonb('skills');
    table.jsonb('requirements');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    table.index(['organization_id', 'deleted_at']);
    table.index(['status', 'deleted_at']);
    table.index(['created_at']);
  });

  // Candidates
  await knex.schema.createTable('candidates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 20);
    table.text('resume_url');
    table.integer('years_experience');
    table.decimal('desired_salary', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.date('last_contact_date');
    table.jsonb('metadata');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['email', 'organization_id']);
    table.index(['organization_id', 'deleted_at']);
  });

  // Applications
  await knex.schema.createTable('applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    table.string('status', 50).notNullable().defaultTo('submitted');
    table.text('cover_letter');
    table.timestamp('applied_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    table.index(['job_id', 'deleted_at']);
    table.index(['candidate_id', 'deleted_at']);
    table.index(['organization_id', 'deleted_at']);
  });

  // ========================================
  // ScheduleHub Product Tables
  // ========================================

  // Stations
  await knex.schema.createTable('stations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('location_id').references('id').inTable('hris.locations').onDelete('SET NULL');
    table.string('station_name', 200).notNullable();
    table.string('station_code', 50);
    table.string('station_type', 50);
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    table.index(['organization_id', 'deleted_at']);
    table.index(['location_id', 'deleted_at']);
  });

  // Shifts
  await knex.schema.createTable('shifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('station_id').notNullable().references('id').inTable('stations').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('hris.employees').onDelete('SET NULL');
    table.date('shift_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.string('status', 50).notNullable().defaultTo('scheduled');
    table.text('notes');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
    
    table.index(['organization_id', 'deleted_at']);
    table.index(['station_id', 'shift_date', 'deleted_at']);
    table.index(['employee_id', 'shift_date', 'deleted_at']);
  });

  console.log('✅ Part 2 migration completed: RecruitIQ and ScheduleHub tables created');
};

exports.down = async function(knex) {
  // Drop ScheduleHub tables
  await knex.schema.dropTableIfExists('shifts');
  await knex.schema.dropTableIfExists('stations');

  // Drop RecruitIQ tables
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('jobs');

  console.log('✅ Part 2 migration rolled back');
};
