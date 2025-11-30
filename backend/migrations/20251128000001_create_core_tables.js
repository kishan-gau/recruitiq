/**
 * Migration: Create Core Platform Tables
 * 
 * Creates the foundational tables for the RecruitIQ platform:
 * - organizations (multi-tenant isolation)
 * - RBAC system (permissions, roles, role_permissions)
 * - license management tables
 * - product management tables
 * - central logging tables (system_logs, security_events)
 * 
 * @see C:\RecruitIQ\backend\src\database\schema.sql (original)
 */

export async function up(knex) {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

  // ============================================================================
  // ORGANIZATIONS TABLE
  // ============================================================================
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.text('description');
    
    // Subscription & Billing
    table.string('tier', 50).notNullable().defaultTo('starter');
    table.string('subscription_status', 50).notNullable().defaultTo('trial');
    table.timestamp('subscription_start_date', { useTz: true });
    table.timestamp('subscription_end_date', { useTz: true });
    table.timestamp('trial_start_date', { useTz: true });
    table.timestamp('trial_end_date', { useTz: true });
    table.integer('trial_days_remaining').defaultTo(30);
    
    // Deployment Configuration
    table.string('deployment_model', 50).notNullable().defaultTo('shared');
    table.string('instance_id', 100);
    table.jsonb('deployment_config').defaultTo('{}');
    
    // Contact Information
    table.string('primary_contact_name', 255);
    table.string('primary_contact_email', 255);
    table.string('primary_contact_phone', 50);
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.string('postal_code', 20);
    
    // Feature Flags
    table.jsonb('enabled_features').defaultTo('[]');
    table.jsonb('feature_limits').defaultTo('{}');
    
    // Session Management
    table.string('session_policy', 20).defaultTo('multiple');
    table.integer('max_sessions_per_user').defaultTo(5);
    table.boolean('concurrent_login_detection').defaultTo(false);
    
    // MFA Configuration
    table.boolean('mfa_required').defaultTo(false);
    table.timestamp('mfa_enforcement_date', { useTz: true });
    
    // Usage Tracking
    table.integer('user_count').defaultTo(0);
    table.integer('active_user_count').defaultTo(0);
    table.jsonb('usage_stats').defaultTo('{}');
    
    // Settings
    table.jsonb('settings').defaultTo('{}');
    
    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
  });

  // Add indexes for organizations
  await knex.schema.raw(`
    CREATE INDEX idx_organizations_slug ON organizations(slug);
    CREATE INDEX idx_organizations_tier ON organizations(tier);
    CREATE INDEX idx_organizations_deployment ON organizations(deployment_model);
    CREATE INDEX idx_organizations_subscription_status ON organizations(subscription_status);
  `);

  // Add comments for organizations
  await knex.raw(`
    COMMENT ON COLUMN organizations.session_policy IS 'Session policy: "single" = one session per user (license enforcement), "multiple" = allow multiple devices (default)';
    COMMENT ON COLUMN organizations.max_sessions_per_user IS 'Maximum concurrent sessions per user when session_policy = "multiple"';
    COMMENT ON COLUMN organizations.concurrent_login_detection IS 'Enable detection of simultaneous logins from different IPs/locations';
    COMMENT ON COLUMN organizations.mfa_required IS 'Whether MFA is mandatory for all users in this organization (cannot be disabled by users). TRUE for shared deployments for security.';
    COMMENT ON COLUMN organizations.mfa_enforcement_date IS 'Date when MFA became mandatory. Users without MFA enabled after this date will be prompted to set it up.';
  `);

  // ============================================================================
  // RBAC SYSTEM - PERMISSIONS
  // ============================================================================
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product', 50).notNullable();
    table.string('name', 255).notNullable();
    table.string('display_name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['product', 'name']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_permissions_product ON permissions(product);
    CREATE INDEX idx_permissions_category ON permissions(category);
  `);

  // ============================================================================
  // RBAC SYSTEM - ROLES
  // ============================================================================
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('product', 50).notNullable();
    table.string('name', 255).notNullable();
    table.string('display_name', 255).notNullable();
    table.text('description');
    table.boolean('is_system_role').defaultTo(false);
    table.boolean('is_custom_role').defaultTo(false);
    table.boolean('is_default').defaultTo(false);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'product', 'name']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_roles_organization ON roles(organization_id);
    CREATE INDEX idx_roles_product ON roles(product);
    CREATE INDEX idx_roles_system ON roles(is_system_role);
  `);

  // ============================================================================
  // RBAC SYSTEM - ROLE_PERMISSIONS (Junction Table)
  // ============================================================================
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['role_id', 'permission_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
    CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
  `);

  // ============================================================================
  // USER_ROLES TABLE - Assigns roles to users
  // ============================================================================
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by');
    
    table.unique(['user_id', 'role_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE user_roles IS 'Assigns roles to users. user_id references hris.user_account (tenant users) or platform_users (platform admins)';
    COMMENT ON COLUMN user_roles.user_id IS 'References either hris.user_account.id or platform_users.id (no FK constraint to support both)';
  `);

  // ============================================================================
  // PRODUCTS TABLE
  // ============================================================================
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable().unique();
    table.string('display_name', 255).notNullable();
    table.text('description');
    table.string('slug', 100).notNullable().unique();
    table.string('version', 50).notNullable();
    table.string('npm_package', 255);
    table.text('repository_url');
    
    table.string('status', 50).notNullable().defaultTo('active');
    table.boolean('is_core').defaultTo(false);
    table.boolean('requires_license').defaultTo(true);
    
    table.string('base_path', 255);
    table.string('api_prefix', 255);
    
    table.string('min_tier', 50).notNullable().defaultTo('starter');
    table.jsonb('features').defaultTo('[]');
    table.jsonb('default_features').defaultTo('[]');
    
    table.string('icon', 100);
    table.string('color', 50);
    table.jsonb('ui_config').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_products_status ON products(status);
    CREATE INDEX idx_products_is_core ON products(is_core);
  `);

  // ============================================================================
  // PRODUCT FEATURES
  // ============================================================================
  await knex.schema.createTable('features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    table.string('code', 100).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    table.string('tier_required', 50);
    table.boolean('is_core').defaultTo(false);
    table.jsonb('limits').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['product_id', 'code']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_features_product ON features(product_id);
    CREATE INDEX idx_features_code ON features(code);
  `);

  // ============================================================================
  // ORGANIZATION FEATURE GRANTS
  // ============================================================================
  await knex.schema.createTable('organization_feature_grants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('features').onDelete('CASCADE');
    table.string('grant_type', 50).notNullable();
    table.jsonb('custom_limits').defaultTo('{}');
    table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true });
    table.uuid('granted_by');
    
    table.unique(['organization_id', 'feature_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_feature_grants_organization ON organization_feature_grants(organization_id);
    CREATE INDEX idx_feature_grants_feature ON organization_feature_grants(feature_id);
  `);

  // ============================================================================
  // CENTRAL LOGGING - SYSTEM LOGS
  // ============================================================================
  await knex.schema.createTable('system_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('level', 20).notNullable();
    table.text('message').notNullable();
    table.string('tenant_id', 100);
    table.string('instance_id', 100);
    table.uuid('user_id');
    table.string('user_email', 255);
    table.string('ip_address', 50);
    table.string('request_id', 100);
    table.text('stack_trace');
    table.jsonb('metadata').defaultTo('{}');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp DESC);
    CREATE INDEX idx_system_logs_level ON system_logs(level);
    CREATE INDEX idx_system_logs_tenant ON system_logs(tenant_id);
    CREATE INDEX idx_system_logs_instance ON system_logs(instance_id);
    CREATE INDEX idx_system_logs_user ON system_logs(user_id);
    CREATE INDEX idx_system_logs_message ON system_logs USING gin(to_tsvector('english', message));
    CREATE INDEX idx_system_logs_metadata ON system_logs USING gin(metadata);
    
    COMMENT ON TABLE system_logs IS 'Centralized system logs from all tenant instances';
    COMMENT ON COLUMN system_logs.tenant_id IS 'Identifier for the tenant organization';
    COMMENT ON COLUMN system_logs.instance_id IS 'Identifier for the specific instance/server';
    COMMENT ON COLUMN system_logs.metadata IS 'Additional structured log data';
  `);

  // ============================================================================
  // CENTRAL LOGGING - SECURITY EVENTS
  // ============================================================================
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('event_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.string('tenant_id', 100);
    table.string('instance_id', 100);
    table.uuid('user_id');
    table.string('user_email', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.string('request_method', 10);
    table.text('request_path');
    table.text('resource_type');
    table.text('resource_id');
    table.text('action_taken');
    table.jsonb('details').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
    CREATE INDEX idx_security_events_type ON security_events(event_type);
    CREATE INDEX idx_security_events_severity ON security_events(severity);
    CREATE INDEX idx_security_events_tenant ON security_events(tenant_id);
    CREATE INDEX idx_security_events_instance ON security_events(instance_id);
    CREATE INDEX idx_security_events_user ON security_events(user_id);
    CREATE INDEX idx_security_events_details ON security_events USING gin(details);
    CREATE INDEX idx_security_events_metadata ON security_events USING gin(metadata);
    
    COMMENT ON TABLE security_events IS 'Security events and audit trail from all tenant instances';
    COMMENT ON COLUMN security_events.event_type IS 'Type of security event (login_failure, unauthorized_access, etc.)';
    COMMENT ON COLUMN security_events.severity IS 'Severity level of the security event';
    COMMENT ON COLUMN security_events.details IS 'Event-specific structured data';
  `);

  console.log('✅ Core tables created successfully');
}

export async function down(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('security_events');
  await knex.schema.dropTableIfExists('system_logs');
  await knex.schema.dropTableIfExists('organization_feature_grants');
  await knex.schema.dropTableIfExists('features');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('organizations');

  console.log('✅ Core tables dropped successfully');
}
