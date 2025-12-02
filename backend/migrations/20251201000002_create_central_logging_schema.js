/**
 * Migration: Create Central Logging Schema
 * Source: central-logging-schema.sql
 * Created: 2025-12-01
 * 
 * This schema is used by platform admins to monitor all tenant instances.
 * In production, this would be in a separate centralized database.
 * For development/testing, it's in the same database as the tenant data.
 */

exports.up = async function(knex) {
  // ============================================================================
  // SYSTEM_LOGS TABLE
  // ============================================================================
  await knex.schema.createTable('system_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Timestamp
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Log level
    table.string('level', 20).notNullable();
    
    // Message
    table.text('message').notNullable();
    
    // Tenant/Instance info
    table.string('tenant_id', 255);
    table.string('instance_id', 255);
    
    // Request context
    table.string('request_id', 255);
    table.uuid('user_id');
    table.string('ip_address', 45);
    table.string('endpoint', 500);
    table.string('method', 10);
    
    // Error details
    table.text('error_stack');
    table.string('error_code', 100);
    
    // Additional metadata
    table.jsonb('metadata').defaultTo('{}');
  });
  
  // Add CHECK constraint for level
  await knex.raw(`ALTER TABLE system_logs ADD CONSTRAINT system_logs_level_check CHECK (level IN ('debug', 'info', 'warn', 'error'))`);
  
  // Create indexes for efficient querying
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_tenant ON system_logs(tenant_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_instance ON system_logs(instance_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_user ON system_logs(user_id)');
  await knex.raw("CREATE INDEX IF NOT EXISTS idx_system_logs_message ON system_logs USING gin(to_tsvector('english', message))");
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_system_logs_metadata ON system_logs USING gin(metadata)');
  
  // Add comments
  await knex.raw("COMMENT ON TABLE system_logs IS 'Centralized system logs from all tenant instances'");
  await knex.raw("COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the tenant organization'");
  await knex.raw("COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the specific instance/server'");
  await knex.raw("COMMENT ON COLUMN system_logs.metadata IS 'Additional structured log data'");
  
  // ============================================================================
  // SECURITY_EVENTS TABLE
  // ============================================================================
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Timestamp
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Event details
    table.string('event_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    
    // Tenant/Instance info
    table.string('tenant_id', 255);
    table.string('instance_id', 255);
    
    // User/Actor info
    table.uuid('user_id');
    table.string('user_email', 255);
    table.string('ip_address', 45);
    table.text('user_agent');
    
    // Event context
    table.string('resource_type', 100);
    table.string('resource_id', 255);
    table.string('action', 100);
    table.string('result', 50);
    
    // Request context
    table.string('request_id', 255);
    table.string('endpoint', 500);
    table.string('method', 10);
    
    // Additional details
    table.jsonb('details').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
  });
  
  // Add CHECK constraint for severity
  await knex.raw(`ALTER TABLE security_events ADD CONSTRAINT security_events_severity_check CHECK (severity IN ('info', 'warning', 'error', 'critical'))`);
  
  // Create indexes for efficient querying
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_instance ON security_events(instance_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_details ON security_events USING gin(details)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_security_events_metadata ON security_events USING gin(metadata)');
  
  // Add comments
  await knex.raw("COMMENT ON TABLE security_events IS 'Security events and audit trail from all tenant instances'");
  await knex.raw("COMMENT ON COLUMN security_events.event_type IS 'Type of security event (login_failure, unauthorized_access, etc.)'");
  await knex.raw("COMMENT ON COLUMN security_events.severity IS 'Severity level of the security event'");
  await knex.raw("COMMENT ON COLUMN security_events.details IS 'Event-specific structured data'");
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('system_logs');
};
