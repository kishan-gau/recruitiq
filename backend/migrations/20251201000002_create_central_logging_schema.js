/**
 * Migration: Create Central Logging Schema
 * Source: central-logging-schema.sql
 * Created: 2025-12-01
 */

exports.up = async function(knex) {
  // ============================================================================
  // SYSTEM_LOGS TABLE
  // ============================================================================
  await knex.schema.createTable('system_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id');
    table.string('log_level', 20).notNullable();
    table.string('source', 100).notNullable();
    table.text('message').notNullable();
    table.jsonb('metadata');
    table.text('stack_trace');
    table.string('request_id', 100);
    table.inet('ip_address');
    table.text('user_agent');
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Check constraint for log_level
    table.check('??::text = ANY (ARRAY[\'DEBUG\'::text, \'INFO\'::text, \'WARN\'::text, \'ERROR\'::text, \'FATAL\'::text])', ['log_level']);
  });
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_system_logs_organization ON system_logs(organization_id)');
  await knex.raw('CREATE INDEX idx_system_logs_user ON system_logs(user_id)');
  await knex.raw('CREATE INDEX idx_system_logs_level ON system_logs(log_level)');
  await knex.raw('CREATE INDEX idx_system_logs_source ON system_logs(source)');
  await knex.raw('CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC)');
  await knex.raw('CREATE INDEX idx_system_logs_request ON system_logs(request_id) WHERE request_id IS NOT NULL');
  await knex.raw('CREATE INDEX idx_system_logs_metadata ON system_logs USING gin(metadata)');
  
  // Add table comment
  await knex.raw("COMMENT ON TABLE system_logs IS 'Central logging table for platform administrators to monitor activity across all tenants'");
  
  // Add column comments
  await knex.raw("COMMENT ON COLUMN system_logs.organization_id IS 'Reference to the organization (null for platform-level logs)'");
  await knex.raw("COMMENT ON COLUMN system_logs.user_id IS 'User who triggered the log event (if applicable)'");
  await knex.raw("COMMENT ON COLUMN system_logs.log_level IS 'Severity level: DEBUG, INFO, WARN, ERROR, FATAL'");
  await knex.raw("COMMENT ON COLUMN system_logs.source IS 'Component or service that generated the log (e.g., auth-service, api-gateway)'");
  await knex.raw("COMMENT ON COLUMN system_logs.message IS 'Human-readable log message'");
  await knex.raw("COMMENT ON COLUMN system_logs.metadata IS 'Additional structured data (JSON)'");
  await knex.raw("COMMENT ON COLUMN system_logs.stack_trace IS 'Stack trace for errors'");
  await knex.raw("COMMENT ON COLUMN system_logs.request_id IS 'Unique identifier for request tracing'");
  await knex.raw("COMMENT ON COLUMN system_logs.ip_address IS 'IP address of the request'");
  await knex.raw("COMMENT ON COLUMN system_logs.user_agent IS 'User agent string'");
  
  // ============================================================================
  // SECURITY_EVENTS TABLE
  // ============================================================================
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id');
    table.string('event_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.jsonb('details');
    table.inet('ip_address');
    table.text('user_agent');
    table.string('request_id', 100);
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('resolved_at');
    table.uuid('resolved_by');
    table.text('resolution_notes');
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Check constraints
    table.check('??::text = ANY (ARRAY[\'LOW\'::text, \'MEDIUM\'::text, \'HIGH\'::text, \'CRITICAL\'::text])', ['severity']);
    table.check('??::text = ANY (ARRAY[\'LOGIN_SUCCESS\'::text, \'LOGIN_FAILED\'::text, \'LOGOUT\'::text, \'PASSWORD_CHANGE\'::text, \'PASSWORD_RESET\'::text, \'MFA_ENABLED\'::text, \'MFA_DISABLED\'::text, \'PERMISSION_DENIED\'::text, \'UNAUTHORIZED_ACCESS\'::text, \'DATA_EXPORT\'::text, \'DATA_DELETION\'::text, \'ROLE_CHANGE\'::text, \'USER_CREATED\'::text, \'USER_DELETED\'::text, \'SUSPICIOUS_ACTIVITY\'::text, \'RATE_LIMIT_EXCEEDED\'::text, \'API_KEY_CREATED\'::text, \'API_KEY_REVOKED\'::text])', ['event_type']);
  });
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_security_events_organization ON security_events(organization_id)');
  await knex.raw('CREATE INDEX idx_security_events_user ON security_events(user_id)');
  await knex.raw('CREATE INDEX idx_security_events_type ON security_events(event_type)');
  await knex.raw('CREATE INDEX idx_security_events_severity ON security_events(severity)');
  await knex.raw('CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC)');
  await knex.raw('CREATE INDEX idx_security_events_unresolved ON security_events(is_resolved, severity) WHERE is_resolved = false');
  await knex.raw('CREATE INDEX idx_security_events_details ON security_events USING gin(details)');
  
  // Add table comment
  await knex.raw("COMMENT ON TABLE security_events IS 'Security-related events for auditing and monitoring'");
  
  // Add column comments
  await knex.raw("COMMENT ON COLUMN security_events.organization_id IS 'Reference to the organization'");
  await knex.raw("COMMENT ON COLUMN security_events.user_id IS 'User involved in the security event'");
  await knex.raw("COMMENT ON COLUMN security_events.event_type IS 'Type of security event'");
  await knex.raw("COMMENT ON COLUMN security_events.severity IS 'Severity level: LOW, MEDIUM, HIGH, CRITICAL'");
  await knex.raw("COMMENT ON COLUMN security_events.description IS 'Human-readable description of the event'");
  await knex.raw("COMMENT ON COLUMN security_events.details IS 'Additional structured data (JSON)'");
  await knex.raw("COMMENT ON COLUMN security_events.is_resolved IS 'Whether the security issue has been resolved'");
  await knex.raw("COMMENT ON COLUMN security_events.resolved_at IS 'When the issue was resolved'");
  await knex.raw("COMMENT ON COLUMN security_events.resolved_by IS 'Admin who resolved the issue'");
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('system_logs');
};
