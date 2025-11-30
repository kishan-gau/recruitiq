/**
 * Consolidated Database Schema Migration - Part 3
 * This migration creates central logging and audit tables
 * 
 * Part 3 of 3: Central logging, audit trails, and system tables
 */

exports.up = async function(knex) {
  // ========================================
  // Central Logging & Audit Tables
  // ========================================

  // Activity logs (cross-product audit trail)
  await knex.schema.createTable('activity_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('entity_type', 100).notNullable(); // e.g., 'job', 'employee', 'payroll_run'
    table.uuid('entity_id'); // ID of the affected entity
    table.string('action', 100).notNullable(); // e.g., 'created', 'updated', 'deleted'
    table.jsonb('changes'); // Before/after values
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id', 'created_at']);
    table.index(['entity_type', 'entity_id']);
    table.index(['user_id', 'created_at']);
  });

  // Security events log
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('event_type', 100).notNullable(); // e.g., 'login_failed', 'unauthorized_access'
    table.string('severity', 20).notNullable(); // 'low', 'medium', 'high', 'critical'
    table.text('description');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.jsonb('metadata');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id', 'created_at']);
    table.index(['event_type', 'created_at']);
    table.index(['severity', 'created_at']);
  });

  // System notifications
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.string('type', 50).notNullable(); // e.g., 'info', 'warning', 'error', 'success'
    table.string('title', 255).notNullable();
    table.text('message');
    table.jsonb('data'); // Additional data (links, actions, etc.)
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['user_id', 'is_read', 'created_at']);
    table.index(['organization_id', 'created_at']);
  });

  // File uploads metadata
  await knex.schema.createTable('file_uploads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('uploaded_by').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.string('entity_type', 100); // e.g., 'employee', 'candidate'
    table.uuid('entity_id'); // ID of the related entity
    table.string('file_name', 255).notNullable();
    table.string('file_type', 100).notNullable();
    table.bigInteger('file_size').notNullable(); // in bytes
    table.string('storage_path', 500).notNullable();
    table.string('storage_provider', 50).notNullable(); // e.g., 'local', 's3', 'azure'
    table.jsonb('metadata');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    table.index(['organization_id', 'deleted_at']);
    table.index(['entity_type', 'entity_id']);
    table.index(['uploaded_by', 'created_at']);
  });

  // Scheduled jobs/tasks
  await knex.schema.createTable('scheduled_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('job_type', 100).notNullable(); // e.g., 'payroll_generation', 'report_generation'
    table.string('status', 50).notNullable().defaultTo('pending'); // 'pending', 'running', 'completed', 'failed'
    table.timestamp('scheduled_at', { useTz: true }).notNullable();
    table.timestamp('started_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.jsonb('parameters'); // Job-specific parameters
    table.jsonb('result'); // Job result/output
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id', 'status', 'scheduled_at']);
    table.index(['job_type', 'status']);
  });

  // API rate limiting
  await knex.schema.createTable('rate_limits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.string('ip_address', 45);
    table.string('endpoint', 255).notNullable();
    table.integer('request_count').notNullable().defaultTo(1);
    table.timestamp('window_start', { useTz: true }).notNullable();
    table.timestamp('window_end', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id', 'window_start']);
    table.index(['user_id', 'window_start']);
    table.index(['ip_address', 'window_start']);
  });

  // System health metrics
  await knex.schema.createTable('system_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('metric_name', 100).notNullable();
    table.string('metric_type', 50).notNullable(); // 'counter', 'gauge', 'histogram'
    table.decimal('value', 20, 4).notNullable();
    table.jsonb('tags'); // Additional metadata
    table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['metric_name', 'recorded_at']);
    table.index(['metric_type', 'recorded_at']);
  });

  console.log('✅ Part 3 migration completed: Central logging and audit tables created');
};

exports.down = async function(knex) {
  // Drop system tables
  await knex.schema.dropTableIfExists('system_metrics');
  await knex.schema.dropTableIfExists('rate_limits');
  await knex.schema.dropTableIfExists('scheduled_jobs');
  await knex.schema.dropTableIfExists('file_uploads');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('activity_logs');

  console.log('✅ Part 3 migration rolled back');
};
