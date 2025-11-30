/**
 * Central Logging Schema Migration
 * 
 * Creates system-wide audit and security logging tables
 * for comprehensive tracking of application activities,
 * security events, and audit trail.
 * 
 * Schema: public
 * Dependencies: organizations
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ============================================================================
  // SYSTEM LOGS - Application-level logs for debugging and monitoring
  // ============================================================================
  await knex.schema.createTable('system_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('level', 20).notNullable();
    table.string('category', 50);
    table.text('message').notNullable();
    table.string('source', 100);
    table.jsonb('context').defaultTo('{}');
    table.string('user_id', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_system_logs_org ON system_logs(organization_id);
    CREATE INDEX idx_system_logs_level ON system_logs(level);
    CREATE INDEX idx_system_logs_category ON system_logs(category);
    CREATE INDEX idx_system_logs_created ON system_logs(created_at);
    CREATE INDEX idx_system_logs_source ON system_logs(source);
    
    COMMENT ON TABLE system_logs IS 'Application-level logs for debugging and monitoring';
    COMMENT ON COLUMN system_logs.level IS 'Log levels: debug, info, warn, error, fatal';
    COMMENT ON COLUMN system_logs.category IS 'Categories: auth, api, database, integration, system';
  `);

  // ============================================================================
  // SECURITY EVENTS - Security-related events for threat detection
  // ============================================================================
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('event_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.string('user_id', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.jsonb('details').defaultTo('{}');
    table.boolean('resolved').defaultTo(false);
    table.uuid('resolved_by');
    table.timestamp('resolved_at');
    table.text('resolution_notes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_security_events_org ON security_events(organization_id);
    CREATE INDEX idx_security_events_type ON security_events(event_type);
    CREATE INDEX idx_security_events_severity ON security_events(severity);
    CREATE INDEX idx_security_events_resolved ON security_events(resolved);
    CREATE INDEX idx_security_events_created ON security_events(created_at);
    CREATE INDEX idx_security_events_user ON security_events(user_id);
    
    COMMENT ON TABLE security_events IS 'Security-related events for threat detection and compliance';
    COMMENT ON COLUMN security_events.event_type IS 'Types: login_failure, brute_force_attempt, unauthorized_access, session_hijack, suspicious_activity, data_breach';
    COMMENT ON COLUMN security_events.severity IS 'Severity: low, medium, high, critical';
  `);

  // ============================================================================
  // AUDIT TRAIL - Complete audit trail of all data changes
  // ============================================================================
  await knex.schema.createTable('audit_trail', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action', 50).notNullable();
    table.string('user_id', 255).notNullable();
    table.jsonb('old_values').defaultTo('{}');
    table.jsonb('new_values').defaultTo('{}');
    table.jsonb('changes').defaultTo('{}');
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.text('reason');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_audit_trail_org ON audit_trail(organization_id);
    CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
    CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
    CREATE INDEX idx_audit_trail_action ON audit_trail(action);
    CREATE INDEX idx_audit_trail_created ON audit_trail(created_at);
    
    COMMENT ON TABLE audit_trail IS 'Complete audit trail of all data changes for compliance';
    COMMENT ON COLUMN audit_trail.action IS 'Actions: create, update, delete, restore, archive';
    COMMENT ON COLUMN audit_trail.old_values IS 'Previous values before the change';
    COMMENT ON COLUMN audit_trail.new_values IS 'New values after the change';
    COMMENT ON COLUMN audit_trail.changes IS 'Summary of what changed (field names)';
  `);

  // ============================================================================
  // API REQUEST LOGS - Track API usage for monitoring and rate limiting
  // ============================================================================
  await knex.schema.createTable('api_request_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('method', 10).notNullable();
    table.text('path').notNullable();
    table.string('user_id', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.integer('status_code');
    table.integer('response_time_ms');
    table.jsonb('request_headers').defaultTo('{}');
    table.jsonb('request_body');
    table.jsonb('response_body');
    table.text('error_message');
    table.string('correlation_id', 100);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_api_logs_org ON api_request_logs(organization_id);
    CREATE INDEX idx_api_logs_path ON api_request_logs(path);
    CREATE INDEX idx_api_logs_user ON api_request_logs(user_id);
    CREATE INDEX idx_api_logs_status ON api_request_logs(status_code);
    CREATE INDEX idx_api_logs_created ON api_request_logs(created_at);
    CREATE INDEX idx_api_logs_correlation ON api_request_logs(correlation_id);
    
    COMMENT ON TABLE api_request_logs IS 'API request/response logs for monitoring and debugging';
    COMMENT ON COLUMN api_request_logs.correlation_id IS 'Unique ID to correlate requests across services';
  `);

  // ============================================================================
  // SCHEDULED JOBS - Track scheduled/background job executions
  // ============================================================================
  await knex.schema.createTable('scheduled_job_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('job_name', 100).notNullable();
    table.string('job_type', 50).notNullable();
    table.string('status', 20).notNullable();
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at');
    table.integer('duration_ms');
    table.integer('records_processed').defaultTo(0);
    table.integer('records_failed').defaultTo(0);
    table.jsonb('parameters').defaultTo('{}');
    table.jsonb('result').defaultTo('{}');
    table.text('error_message');
    table.text('stack_trace');
    table.string('triggered_by', 50);
    table.uuid('triggered_by_user');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_job_logs_org ON scheduled_job_logs(organization_id);
    CREATE INDEX idx_job_logs_name ON scheduled_job_logs(job_name);
    CREATE INDEX idx_job_logs_type ON scheduled_job_logs(job_type);
    CREATE INDEX idx_job_logs_status ON scheduled_job_logs(status);
    CREATE INDEX idx_job_logs_started ON scheduled_job_logs(started_at);
    
    COMMENT ON TABLE scheduled_job_logs IS 'Track scheduled and background job executions';
    COMMENT ON COLUMN scheduled_job_logs.status IS 'Status: running, completed, failed, cancelled';
    COMMENT ON COLUMN scheduled_job_logs.triggered_by IS 'Trigger source: schedule, manual, api, webhook';
  `);

  console.log('✓ Central logging schema migration complete');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('scheduled_job_logs');
  await knex.schema.dropTableIfExists('api_request_logs');
  await knex.schema.dropTableIfExists('audit_trail');
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('system_logs');

  console.log('✓ Central logging schema rollback complete');
}
