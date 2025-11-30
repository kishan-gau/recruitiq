/**
 * Migration: Create HRIS audit_log table
 * 
 * Completes HRIS schema by adding comprehensive audit trail table
 * Tracks all changes to HRIS entities for compliance and debugging
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Create audit_log table in hris schema
  await knex.schema.withSchema('hris').createTable('audit_log', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign Keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').nullable()
      .references('id').inTable('hris.user_account').onDelete('SET NULL')
      .comment('User who performed the action');
    
    // Entity Information
    table.string('entity_type', 100).notNullable()
      .comment('Type of entity (e.g., employee, department, location)');
    table.uuid('entity_id').notNullable()
      .comment('ID of the affected entity');
    
    // Action Details
    table.string('action', 50).notNullable()
      .comment('Action performed: created, updated, deleted, restored, status_changed, etc.');
    table.jsonb('old_values').nullable()
      .comment('Previous field values (for updates/deletes)');
    table.jsonb('new_values').nullable()
      .comment('New field values (for creates/updates)');
    table.jsonb('changed_fields').nullable()
      .comment('Array of field names that changed');
    
    // Context Information
    table.text('description').nullable()
      .comment('Human-readable description of the change');
    table.string('ip_address', 45).nullable()
      .comment('IP address of the user (supports IPv6)');
    table.string('user_agent', 500).nullable()
      .comment('Browser/client user agent string');
    table.string('api_endpoint', 200).nullable()
      .comment('API endpoint that triggered the change');
    table.string('http_method', 10).nullable()
      .comment('HTTP method: GET, POST, PUT, PATCH, DELETE');
    
    // Audit Trail Metadata
    table.uuid('session_id').nullable()
      .comment('Session identifier for grouping related actions');
    table.uuid('transaction_id').nullable()
      .comment('Transaction identifier for atomic operations');
    table.string('severity', 20).default('info')
      .comment('Severity level: info, warning, critical');
    table.jsonb('metadata').nullable()
      .comment('Additional context-specific data');
    
    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      .comment('When the action occurred');
    
    // Indexes for performance
    table.index('organization_id', 'idx_hris_audit_log_organization_id');
    table.index('user_id', 'idx_hris_audit_log_user_id');
    table.index('entity_type', 'idx_hris_audit_log_entity_type');
    table.index('entity_id', 'idx_hris_audit_log_entity_id');
    table.index('action', 'idx_hris_audit_log_action');
    table.index('created_at', 'idx_hris_audit_log_created_at');
    table.index('severity', 'idx_hris_audit_log_severity');
    table.index('session_id', 'idx_hris_audit_log_session_id');
    table.index('transaction_id', 'idx_hris_audit_log_transaction_id');
    
    // Composite indexes for common queries
    table.index(['organization_id', 'entity_type', 'entity_id'], 
      'idx_hris_audit_log_org_entity');
    table.index(['organization_id', 'user_id', 'created_at'], 
      'idx_hris_audit_log_org_user_time');
    table.index(['organization_id', 'action', 'created_at'], 
      'idx_hris_audit_log_org_action_time');
    
    // Table comment
    table.comment('Comprehensive audit trail for all HRIS entity changes');
  });

  console.log('✅ Created hris.audit_log table');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('audit_log');
  console.log('✅ Dropped hris.audit_log table');
}
