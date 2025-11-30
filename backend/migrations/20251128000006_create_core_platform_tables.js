/**
 * Migration: Create Core Platform Tables
 * 
 * Creates platform administration and management tables:
 * - email_settings (email configuration)
 * - product_permissions (RBAC for products)
 * - product_configs (product configuration)
 * - product_features (feature flags)
 * - feature_usage_events (feature analytics)
 * - feature_audit_log (feature audit trail)
 * - platform_users (platform admin users)
 * - platform_refresh_tokens (admin token management)
 * - workspace_members (workspace user assignments)
 * - security_alerts (security event tracking)
 * - vps_instances (VPS infrastructure)
 * - instance_deployments (deployment tracking)
 * - customers (customer management)
 * - tier_presets (subscription tiers)
 * - licenses (license management)
 * - instances (tenant instances)
 * - usage_events (usage tracking)
 * - tier_migrations (tier change history)
 * - license_audit_log (license audit trail)
 */

export async function up(knex) {
  // ============================================================================
  // EMAIL SETTINGS
  // ============================================================================
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // SMTP Configuration
    table.string('smtp_host', 255).notNullable();
    table.integer('smtp_port').notNullable().defaultTo(587);
    table.string('smtp_user', 255).notNullable();
    table.string('smtp_password_encrypted', 500).notNullable();
    table.boolean('smtp_secure').defaultTo(true);
    
    // Email Settings
    table.string('from_email', 255).notNullable();
    table.string('from_name', 255).notNullable();
    table.string('reply_to_email', 255);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at', { useTz: true });
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_email_settings_organization ON email_settings(organization_id);
    COMMENT ON TABLE email_settings IS 'Email configuration for organizations';
  `);

  // ============================================================================
  // PRODUCT PERMISSIONS (RBAC)
  // ============================================================================
  await knex.schema.createTable('product_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('product_slug', 50).notNullable();
    table.string('permission_code', 100).notNullable();
    table.string('permission_name', 200).notNullable();
    table.text('description');
    table.string('category', 50).notNullable();
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['product_slug', 'permission_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_permissions_product ON product_permissions(product_slug);
    COMMENT ON TABLE product_permissions IS 'Product-level permissions for RBAC system';
  `);

  // ============================================================================
  // PRODUCT CONFIGS
  // ============================================================================
  await knex.schema.createTable('product_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('product_slug', 50).notNullable();
    table.jsonb('config').notNullable().defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'product_slug']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_configs_organization ON product_configs(organization_id);
    COMMENT ON TABLE product_configs IS 'Product-specific configuration per organization';
  `);

  // ============================================================================
  // PRODUCT FEATURES
  // ============================================================================
  await knex.schema.createTable('product_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('product_slug', 50).notNullable();
    table.string('feature_code', 100).notNullable();
    table.string('feature_name', 200).notNullable();
    table.text('description');
    table.string('tier', 50).notNullable();
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['product_slug', 'feature_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_product_features_product ON product_features(product_slug);
    CREATE INDEX idx_product_features_tier ON product_features(tier);
    COMMENT ON TABLE product_features IS 'Product features tied to subscription tiers';
  `);

  // ============================================================================
  // FEATURE USAGE EVENTS
  // ============================================================================
  await knex.schema.createTable('feature_usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('product_features').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('event_type', 50).notNullable();
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_feature_usage_organization ON feature_usage_events(organization_id);
    CREATE INDEX idx_feature_usage_feature ON feature_usage_events(feature_id);
    CREATE INDEX idx_feature_usage_created_at ON feature_usage_events(created_at DESC);
    COMMENT ON TABLE feature_usage_events IS 'Analytics tracking for feature usage';
  `);

  // ============================================================================
  // FEATURE AUDIT LOG
  // ============================================================================
  await knex.schema.createTable('feature_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('product_features').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('action', 50).notNullable();
    table.jsonb('changes').defaultTo('{}');
    table.string('ip_address', 45);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_feature_audit_organization ON feature_audit_log(organization_id);
    CREATE INDEX idx_feature_audit_feature ON feature_audit_log(feature_id);
    CREATE INDEX idx_feature_audit_created_at ON feature_audit_log(created_at DESC);
    COMMENT ON TABLE feature_audit_log IS 'Audit trail for feature configuration changes';
  `);

  // ============================================================================
  // PLATFORM USERS
  // ============================================================================
  await knex.schema.createTable('platform_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.string('role', 50).notNullable().defaultTo('admin');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at', { useTz: true });
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_platform_users_email ON platform_users(email);
    CREATE INDEX idx_platform_users_role ON platform_users(role);
    COMMENT ON TABLE platform_users IS 'Platform administrator accounts';
  `);

  // ============================================================================
  // PLATFORM REFRESH TOKENS
  // ============================================================================
  await knex.schema.createTable('platform_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('platform_users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.boolean('is_revoked').defaultTo(false);
    table.string('ip_address', 45);
    table.text('user_agent');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_platform_tokens_user ON platform_refresh_tokens(user_id);
    CREATE INDEX idx_platform_tokens_expires ON platform_refresh_tokens(expires_at);
    COMMENT ON TABLE platform_refresh_tokens IS 'Refresh tokens for platform administrators';
  `);

  // ============================================================================
  // WORKSPACE MEMBERS
  // ============================================================================
  await knex.schema.createTable('workspace_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.string('role', 50).notNullable();
    table.jsonb('permissions').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['workspace_id', 'user_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
    CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
    COMMENT ON TABLE workspace_members IS 'User assignments to recruiting workspaces';
  `);

  // ============================================================================
  // SECURITY ALERTS
  // ============================================================================
  await knex.schema.createTable('security_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('alert_type', 50).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.string('ip_address', 45);
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('resolved_at', { useTz: true });
    table.uuid('resolved_by').references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_security_alerts_organization ON security_alerts(organization_id);
    CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
    CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
    CREATE INDEX idx_security_alerts_resolved ON security_alerts(is_resolved);
    CREATE INDEX idx_security_alerts_created_at ON security_alerts(created_at DESC);
    COMMENT ON TABLE security_alerts IS 'Security event tracking and alerting';
  `);

  // ============================================================================
  // VPS INSTANCES
  // ============================================================================
  await knex.schema.createTable('vps_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('provider', 50).notNullable();
    table.string('region', 100).notNullable();
    table.string('ip_address', 45).notNullable();
    table.string('status', 50).notNullable();
    table.integer('capacity').notNullable();
    table.integer('current_load').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_vps_instances_provider ON vps_instances(provider);
    CREATE INDEX idx_vps_instances_status ON vps_instances(status);
    COMMENT ON TABLE vps_instances IS 'VPS infrastructure tracking';
  `);

  // ============================================================================
  // INSTANCE DEPLOYMENTS
  // ============================================================================
  await knex.schema.createTable('instance_deployments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('instance_id').notNullable().references('id').inTable('vps_instances').onDelete('CASCADE');
    table.uuid('customer_id').notNullable();
    table.string('deployment_type', 50).notNullable();
    table.string('status', 50).notNullable();
    table.jsonb('config').defaultTo('{}');
    table.timestamp('deployed_at', { useTz: true });
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_instance_deployments_instance ON instance_deployments(instance_id);
    CREATE INDEX idx_instance_deployments_customer ON instance_deployments(customer_id);
    COMMENT ON TABLE instance_deployments IS 'Deployment tracking for customer instances';
  `);

  // ============================================================================
  // CUSTOMERS
  // ============================================================================
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('company_name', 255);
    table.string('status', 50).notNullable().defaultTo('active');
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_customers_email ON customers(email);
    CREATE INDEX idx_customers_status ON customers(status);
    COMMENT ON TABLE customers IS 'Platform customer management';
  `);

  // ============================================================================
  // TIER PRESETS
  // ============================================================================
  await knex.schema.createTable('tier_presets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('tier_code', 50).notNullable().unique();
    table.string('tier_name', 100).notNullable();
    table.text('description');
    table.decimal('price_monthly', 10, 2).notNullable();
    table.decimal('price_yearly', 10, 2).notNullable();
    table.jsonb('features').notNullable().defaultTo('[]');
    table.jsonb('limits').notNullable().defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_tier_presets_active ON tier_presets(is_active);
    COMMENT ON TABLE tier_presets IS 'Subscription tier definitions and pricing';
  `);

  // ============================================================================
  // LICENSES
  // ============================================================================
  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    table.uuid('tier_id').notNullable().references('id').inTable('tier_presets').onDelete('RESTRICT');
    table.string('license_key', 255).notNullable().unique();
    table.string('status', 50).notNullable().defaultTo('active');
    table.timestamp('valid_from', { useTz: true }).notNullable();
    table.timestamp('valid_until', { useTz: true }).notNullable();
    table.boolean('auto_renew').defaultTo(true);
    table.jsonb('custom_limits').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_licenses_customer ON licenses(customer_id);
    CREATE INDEX idx_licenses_status ON licenses(status);
    CREATE INDEX idx_licenses_valid_until ON licenses(valid_until);
    COMMENT ON TABLE licenses IS 'Customer license management';
  `);

  // ============================================================================
  // INSTANCES
  // ============================================================================
  await knex.schema.createTable('instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.uuid('vps_id').references('id').inTable('vps_instances').onDelete('SET NULL');
    table.string('subdomain', 255).notNullable().unique();
    table.string('status', 50).notNullable().defaultTo('provisioning');
    table.jsonb('config').defaultTo('{}');
    table.timestamp('provisioned_at', { useTz: true });
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_instances_license ON instances(license_id);
    CREATE INDEX idx_instances_vps ON instances(vps_id);
    CREATE INDEX idx_instances_status ON instances(status);
    COMMENT ON TABLE instances IS 'Tenant instance management';
  `);

  // ============================================================================
  // USAGE EVENTS
  // ============================================================================
  await knex.schema.createTable('usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.string('metric_name', 100).notNullable();
    table.integer('value').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_usage_events_license ON usage_events(license_id);
    CREATE INDEX idx_usage_events_metric ON usage_events(metric_name);
    CREATE INDEX idx_usage_events_created_at ON usage_events(created_at DESC);
    COMMENT ON TABLE usage_events IS 'Usage tracking for billing and analytics';
  `);

  // ============================================================================
  // TIER MIGRATIONS
  // ============================================================================
  await knex.schema.createTable('tier_migrations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.uuid('from_tier_id').notNullable().references('id').inTable('tier_presets').onDelete('RESTRICT');
    table.uuid('to_tier_id').notNullable().references('id').inTable('tier_presets').onDelete('RESTRICT');
    table.string('reason', 255);
    table.timestamp('migrated_at', { useTz: true }).notNullable();
    table.uuid('migrated_by').references('id').inTable('platform_users').onDelete('SET NULL');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_tier_migrations_license ON tier_migrations(license_id);
    CREATE INDEX idx_tier_migrations_migrated_at ON tier_migrations(migrated_at DESC);
    COMMENT ON TABLE tier_migrations IS 'History of subscription tier changes';
  `);

  // ============================================================================
  // LICENSE AUDIT LOG
  // ============================================================================
  await knex.schema.createTable('license_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.string('action', 50).notNullable();
    table.jsonb('changes').defaultTo('{}');
    table.uuid('performed_by').references('id').inTable('platform_users').onDelete('SET NULL');
    table.string('ip_address', 45);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_license_audit_license ON license_audit_log(license_id);
    CREATE INDEX idx_license_audit_created_at ON license_audit_log(created_at DESC);
    COMMENT ON TABLE license_audit_log IS 'Audit trail for license changes';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('license_audit_log');
  await knex.schema.dropTableIfExists('tier_migrations');
  await knex.schema.dropTableIfExists('usage_events');
  await knex.schema.dropTableIfExists('instances');
  await knex.schema.dropTableIfExists('licenses');
  await knex.schema.dropTableIfExists('tier_presets');
  await knex.schema.dropTableIfExists('customers');
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
