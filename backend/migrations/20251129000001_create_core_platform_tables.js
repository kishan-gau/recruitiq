/**
 * Migration: Create Core Platform Tables
 * 
 * Creates platform administration tables for:
 * - Email settings
 * - Product management (permissions, configs, features)
 * - Platform users and authentication
 * - Workspace members
 * - Security alerts
 * - VPS instances and deployments
 */

export async function up(knex) {
  // ============================================================================
  // EMAIL_SETTINGS - Email configuration per organization
  // ============================================================================
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // SMTP Configuration
    table.string('smtp_host', 255).notNullable();
    table.integer('smtp_port').notNullable().defaultTo(587);
    table.boolean('smtp_secure').defaultTo(true);
    table.string('smtp_user', 255);
    table.string('smtp_password', 255);
    
    // Email Settings
    table.string('from_email', 255).notNullable();
    table.string('from_name', 255);
    table.string('reply_to_email', 255);
    
    // Configuration
    table.jsonb('advanced_settings').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Constraints
    table.unique(['organization_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_email_settings_organization_id ON email_settings(organization_id);
    COMMENT ON TABLE email_settings IS 'Email configuration per organization';
  `);

  // ============================================================================
  // PRODUCT_PERMISSIONS - Permission definitions for products
  // ============================================================================
  await knex.schema.createTable('product_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('product_slug', 50).notNullable();
    table.string('permission_code', 100).notNullable();
    table.string('permission_name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['product_slug', 'permission_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_permissions_product_slug ON product_permissions(product_slug);
    CREATE INDEX idx_product_permissions_permission_code ON product_permissions(permission_code);
    COMMENT ON TABLE product_permissions IS 'Permission definitions for each product';
  `);

  // ============================================================================
  // PRODUCT_CONFIGS - Product configuration per organization
  // ============================================================================
  await knex.schema.createTable('product_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('product_slug', 50).notNullable();
    
    // Configuration
    table.jsonb('config').defaultTo('{}');
    table.boolean('is_enabled').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Constraints
    table.unique(['organization_id', 'product_slug']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_configs_organization_id ON product_configs(organization_id);
    CREATE INDEX idx_product_configs_product_slug ON product_configs(product_slug);
    COMMENT ON TABLE product_configs IS 'Product configuration per organization';
  `);

  // ============================================================================
  // PRODUCT_FEATURES - Feature flags for products
  // ============================================================================
  await knex.schema.createTable('product_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('product_slug', 50).notNullable();
    table.string('feature_code', 100).notNullable();
    table.string('feature_name', 255).notNullable();
    table.text('description');
    table.string('tier_required', 50);
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['product_slug', 'feature_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_features_product_slug ON product_features(product_slug);
    CREATE INDEX idx_product_features_feature_code ON product_features(feature_code);
    COMMENT ON TABLE product_features IS 'Feature flags and definitions for products';
  `);

  // ============================================================================
  // FEATURE_USAGE_EVENTS - Track feature usage
  // ============================================================================
  await knex.schema.createTable('feature_usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('product_features').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Event details
    table.string('event_type', 50).notNullable();
    table.jsonb('event_data').defaultTo('{}');
    table.timestamp('event_timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_feature_usage_events_organization_id ON feature_usage_events(organization_id);
    CREATE INDEX idx_feature_usage_events_feature_id ON feature_usage_events(feature_id);
    CREATE INDEX idx_feature_usage_events_timestamp ON feature_usage_events(event_timestamp DESC);
    COMMENT ON TABLE feature_usage_events IS 'Feature usage tracking for analytics';
  `);

  // ============================================================================
  // FEATURE_AUDIT_LOG - Audit trail for feature changes
  // ============================================================================
  await knex.schema.createTable('feature_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('product_features').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Audit details
    table.string('action', 50).notNullable();
    table.jsonb('old_value').nullable();
    table.jsonb('new_value').nullable();
    table.text('reason');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_feature_audit_log_organization_id ON feature_audit_log(organization_id);
    CREATE INDEX idx_feature_audit_log_feature_id ON feature_audit_log(feature_id);
    CREATE INDEX idx_feature_audit_log_created_at ON feature_audit_log(created_at DESC);
    COMMENT ON TABLE feature_audit_log IS 'Audit trail for feature configuration changes';
  `);

  // ============================================================================
  // PLATFORM_USERS - Platform administrators
  // ============================================================================
  await knex.schema.createTable('platform_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // User details
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.string('role', 50).notNullable().defaultTo('admin');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login_at', { useTz: true });
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_platform_users_email ON platform_users(email);
    CREATE INDEX idx_platform_users_is_active ON platform_users(is_active);
    COMMENT ON TABLE platform_users IS 'Platform administrators for cross-tenant management';
  `);

  // ============================================================================
  // PLATFORM_REFRESH_TOKENS - Refresh tokens for platform users
  // ============================================================================
  await knex.schema.createTable('platform_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('platform_user_id').notNullable().references('id').inTable('platform_users').onDelete('CASCADE');
    
    // Token details
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.boolean('is_revoked').defaultTo(false);
    
    // Metadata
    table.string('user_agent', 500);
    table.string('ip_address', 45);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_platform_refresh_tokens_user_id ON platform_refresh_tokens(platform_user_id);
    CREATE INDEX idx_platform_refresh_tokens_token_hash ON platform_refresh_tokens(token_hash);
    CREATE INDEX idx_platform_refresh_tokens_expires_at ON platform_refresh_tokens(expires_at);
    COMMENT ON TABLE platform_refresh_tokens IS 'Refresh tokens for platform user authentication';
  `);

  // ============================================================================
  // WORKSPACE_MEMBERS - Users assigned to workspaces
  // ============================================================================
  await knex.schema.createTable('workspace_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    
    // Role in workspace
    table.string('role', 50).notNullable().defaultTo('member');
    table.jsonb('permissions').defaultTo('[]');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Constraints
    table.unique(['workspace_id', 'user_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
    CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
    CREATE INDEX idx_workspace_members_role ON workspace_members(role);
    COMMENT ON TABLE workspace_members IS 'Users assigned to recruiting workspaces with specific roles';
  `);

  // ============================================================================
  // SECURITY_ALERTS - Security event tracking
  // ============================================================================
  await knex.schema.createTable('security_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Alert details
    table.string('alert_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    
    // Resolution
    table.string('status', 50).notNullable().defaultTo('open');
    table.uuid('resolved_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('resolved_at', { useTz: true });
    table.text('resolution_notes');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_security_alerts_organization_id ON security_alerts(organization_id);
    CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
    CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
    CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
    CREATE INDEX idx_security_alerts_status ON security_alerts(status);
    CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at DESC);
    
    ALTER TABLE security_alerts ADD CONSTRAINT check_security_alert_severity
      CHECK (severity IN ('low', 'medium', 'high', 'critical'));
    
    ALTER TABLE security_alerts ADD CONSTRAINT check_security_alert_status
      CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive'));
    
    COMMENT ON TABLE security_alerts IS 'Security alerts and incidents tracking';
  `);

  // ============================================================================
  // VPS_INSTANCES - VPS instance management
  // ============================================================================
  await knex.schema.createTable('vps_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Instance details
    table.string('instance_name', 255).notNullable().unique();
    table.string('provider', 50).notNullable();
    table.string('region', 100).notNullable();
    table.string('ip_address', 45).notNullable();
    table.integer('port').notNullable().defaultTo(443);
    
    // Configuration
    table.string('plan_type', 100);
    table.integer('vcpu_count');
    table.integer('memory_mb');
    table.integer('storage_gb');
    
    // Status
    table.string('status', 50).notNullable().defaultTo('provisioning');
    table.jsonb('metadata').defaultTo('{}');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_vps_instances_instance_name ON vps_instances(instance_name);
    CREATE INDEX idx_vps_instances_status ON vps_instances(status);
    CREATE INDEX idx_vps_instances_provider ON vps_instances(provider);
    
    ALTER TABLE vps_instances ADD CONSTRAINT check_vps_instance_status
      CHECK (status IN ('provisioning', 'active', 'maintenance', 'suspended', 'terminated'));
    
    COMMENT ON TABLE vps_instances IS 'VPS instances for hosting tenant deployments';
  `);

  // ============================================================================
  // INSTANCE_DEPLOYMENTS - Track deployments to VPS instances
  // ============================================================================
  await knex.schema.createTable('instance_deployments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vps_instance_id').notNullable().references('id').inTable('vps_instances').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Deployment details
    table.string('deployment_type', 50).notNullable();
    table.string('version', 50);
    table.string('status', 50).notNullable().defaultTo('pending');
    
    // Configuration
    table.jsonb('config').defaultTo('{}');
    table.text('deployment_log');
    
    // Timing
    table.timestamp('started_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('failed_at', { useTz: true });
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('platform_users').onDelete('SET NULL');
  });

  await knex.raw(`
    CREATE INDEX idx_instance_deployments_vps_id ON instance_deployments(vps_instance_id);
    CREATE INDEX idx_instance_deployments_organization_id ON instance_deployments(organization_id);
    CREATE INDEX idx_instance_deployments_status ON instance_deployments(status);
    CREATE INDEX idx_instance_deployments_created_at ON instance_deployments(created_at DESC);
    
    ALTER TABLE instance_deployments ADD CONSTRAINT check_deployment_status
      CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back'));
    
    COMMENT ON TABLE instance_deployments IS 'Deployment history for tenant instances';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('instance_deployments');
  await knex.schema.dropTableIfExists('vps_instances');
  await knex.schema.dropTableIfExists('security_alerts');
  await knex.schema.dropTableIfExists('workspace_members');
  await knex.schema.dropTableIfExists('platform_refresh_tokens');
  await knex.schema.dropTableIfExists('platform_users');
  await knex.schema.dropTableIfExists('feature_audit_log');
  await knex.schema.dropTableIfExists('feature_usage_events');
  await knex.schema.dropTableIfExists('product_features');
  await knex.schema.dropTableIfExists('product_configs');
  await knex.schema.dropTableIfExists('product_permissions');
  await knex.schema.dropTableIfExists('email_settings');
}
