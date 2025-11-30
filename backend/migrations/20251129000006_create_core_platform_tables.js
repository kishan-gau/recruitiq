/**
 * Migration: Create Core Platform Tables
 * 
 * Creates the remaining core platform tables:
 * - email_settings (email configuration)
 * - product_permissions (product-level permissions)
 * - product_configs (product configurations)
 * - product_features (feature flags)
 * - feature_usage_events (feature usage tracking)
 * - feature_audit_log (feature audit trail)
 * - platform_users (platform admin users)
 * - platform_refresh_tokens (refresh token management)
 * - workspace_members (workspace membership)
 * - security_alerts (security event tracking)
 * - vps_instances (VPS infrastructure)
 * - instance_deployments (deployment tracking)
 * - customers (customer management)
 * - tier_presets (pricing tier presets)
 * - licenses (license management)
 * - instances (instance management)
 * - usage_events (usage tracking)
 * - tier_migrations (tier change history)
 * - license_audit_log (license audit trail)
 * 
 * @see C:\RecruitIQ\backend\src\database\schema.sql (original)
 */

export async function up(knex) {
  // ============================================================================
  // EMAIL SETTINGS TABLE - Email configuration per organization
  // ============================================================================
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('smtp_host', 255);
    table.integer('smtp_port');
    table.string('smtp_user', 255);
    table.string('smtp_password', 255);
    table.boolean('smtp_secure').defaultTo(true);
    table.string('from_email', 255);
    table.string('from_name', 255);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index('organization_id');
  });

  // ============================================================================
  // PRODUCT PERMISSIONS TABLE - Product-level permission definitions
  // ============================================================================
  await knex.schema.createTable('product_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product_slug', 50).notNullable();
    table.string('permission_code', 100).notNullable();
    table.string('permission_name', 200).notNullable();
    table.text('description');
    table.string('category', 50);
    table.timestamps(true, true);
    
    table.unique(['product_slug', 'permission_code']);
    table.index('product_slug');
  });

  // ============================================================================
  // PRODUCT CONFIGS TABLE - Product configuration settings
  // ============================================================================
  await knex.schema.createTable('product_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('product_slug', 50).notNullable();
    table.string('config_key', 100).notNullable();
    table.jsonb('config_value');
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.unique(['organization_id', 'product_slug', 'config_key']);
    table.index(['organization_id', 'product_slug']);
  });

  // ============================================================================
  // PRODUCT FEATURES TABLE - Feature flag management
  // ============================================================================
  await knex.schema.createTable('product_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product_slug', 50).notNullable();
    table.string('feature_code', 100).notNullable();
    table.string('feature_name', 200).notNullable();
    table.text('description');
    table.boolean('is_enabled').defaultTo(false);
    table.string('tier_required', 50);
    table.timestamps(true, true);
    
    table.unique(['product_slug', 'feature_code']);
    table.index('product_slug');
  });

  // ============================================================================
  // FEATURE USAGE EVENTS TABLE - Feature usage tracking
  // ============================================================================
  await knex.schema.createTable('feature_usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('product_slug', 50).notNullable();
    table.string('feature_code', 100).notNullable();
    table.uuid('user_id');
    table.timestamp('used_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('metadata');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'product_slug', 'feature_code']);
    table.index('used_at');
  });

  // ============================================================================
  // FEATURE AUDIT LOG TABLE - Feature audit trail
  // ============================================================================
  await knex.schema.createTable('feature_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product_slug', 50).notNullable();
    table.string('feature_code', 100).notNullable();
    table.string('action', 50).notNullable();
    table.uuid('performed_by');
    table.timestamp('performed_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('changes');
    
    table.index(['product_slug', 'feature_code']);
    table.index('performed_at');
  });

  // ============================================================================
  // PLATFORM USERS TABLE - Platform administrator users
  // ============================================================================
  await knex.schema.createTable('platform_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 200).notNullable();
    table.string('role', 50).notNullable().defaultTo('admin');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamps(true, true);
    
    table.index('email');
    table.index('role');
  });

  // ============================================================================
  // PLATFORM REFRESH TOKENS TABLE - Refresh token management
  // ============================================================================
  await knex.schema.createTable('platform_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('user_id').references('id').inTable('platform_users').onDelete('CASCADE');
    table.index('user_id');
    table.index('token');
    table.index('expires_at');
  });

  // ============================================================================
  // WORKSPACE MEMBERS TABLE - Workspace membership management
  // ============================================================================
  await knex.schema.createTable('workspace_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable();
    table.uuid('user_id').notNullable();
    table.string('role', 50).notNullable();
    table.timestamp('joined_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.foreign('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
    table.unique(['workspace_id', 'user_id']);
    table.index('workspace_id');
    table.index('user_id');
  });

  // ============================================================================
  // SECURITY ALERTS TABLE - Security event tracking
  // ============================================================================
  await knex.schema.createTable('security_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id');
    table.string('alert_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.jsonb('metadata');
    table.boolean('is_resolved').defaultTo(false);
    table.timestamp('resolved_at');
    table.uuid('resolved_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'is_resolved']);
    table.index('alert_type');
    table.index('severity');
    table.index('created_at');
  });

  // ============================================================================
  // VPS INSTANCES TABLE - VPS infrastructure management
  // ============================================================================
  await knex.schema.createTable('vps_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('instance_name', 200).notNullable().unique();
    table.string('provider', 50).notNullable();
    table.string('region', 100);
    table.string('ip_address', 45);
    table.string('status', 50).notNullable();
    table.jsonb('metadata');
    table.timestamps(true, true);
    
    table.index('provider');
    table.index('status');
  });

  // ============================================================================
  // INSTANCE DEPLOYMENTS TABLE - Deployment tracking
  // ============================================================================
  await knex.schema.createTable('instance_deployments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('instance_id').notNullable();
    table.string('version', 50).notNullable();
    table.string('status', 50).notNullable();
    table.timestamp('deployed_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('deployed_by');
    table.text('notes');
    table.jsonb('metadata');
    
    table.foreign('instance_id').references('id').inTable('vps_instances').onDelete('CASCADE');
    table.index('instance_id');
    table.index('deployed_at');
  });

  // ============================================================================
  // CUSTOMERS TABLE - Customer management
  // ============================================================================
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('company_name', 200).notNullable();
    table.string('contact_email', 255).notNullable();
    table.string('contact_phone', 50);
    table.string('status', 50).notNullable().defaultTo('active');
    table.timestamp('onboarded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index('status');
    table.index('onboarded_at');
  });

  // ============================================================================
  // TIER PRESETS TABLE - Pricing tier presets
  // ============================================================================
  await knex.schema.createTable('tier_presets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('tier_code', 50).notNullable().unique();
    table.string('tier_name', 100).notNullable();
    table.text('description');
    table.integer('max_users');
    table.decimal('price_per_month', 10, 2);
    table.jsonb('features');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index('tier_code');
    table.index('is_active');
  });

  // ============================================================================
  // LICENSES TABLE - License management
  // ============================================================================
  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.uuid('tier_preset_id');
    table.string('license_key', 500).notNullable().unique();
    table.string('status', 50).notNullable().defaultTo('active');
    table.timestamp('valid_from').notNullable();
    table.timestamp('valid_until');
    table.integer('max_users');
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('tier_preset_id').references('id').inTable('tier_presets').onDelete('SET NULL');
    table.index('organization_id');
    table.index('status');
    table.index(['valid_from', 'valid_until']);
  });

  // ============================================================================
  // INSTANCES TABLE - Instance management
  // ============================================================================
  await knex.schema.createTable('instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.uuid('vps_instance_id');
    table.string('subdomain', 100).notNullable().unique();
    table.string('custom_domain', 255);
    table.string('status', 50).notNullable();
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('vps_instance_id').references('id').inTable('vps_instances').onDelete('SET NULL');
    table.index('organization_id');
    table.index('status');
  });

  // ============================================================================
  // USAGE EVENTS TABLE - Usage tracking
  // ============================================================================
  await knex.schema.createTable('usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('event_type', 100).notNullable();
    table.integer('quantity').defaultTo(1);
    table.timestamp('event_date').notNullable().defaultTo(knex.fn.now());
    table.jsonb('metadata');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'event_type']);
    table.index('event_date');
  });

  // ============================================================================
  // TIER MIGRATIONS TABLE - Tier change history
  // ============================================================================
  await knex.schema.createTable('tier_migrations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.uuid('from_tier_id');
    table.uuid('to_tier_id').notNullable();
    table.timestamp('migrated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('migrated_by');
    table.text('reason');
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('from_tier_id').references('id').inTable('tier_presets').onDelete('SET NULL');
    table.foreign('to_tier_id').references('id').inTable('tier_presets').onDelete('CASCADE');
    table.index('organization_id');
    table.index('migrated_at');
  });

  // ============================================================================
  // LICENSE AUDIT LOG TABLE - License audit trail
  // ============================================================================
  await knex.schema.createTable('license_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('license_id').notNullable();
    table.string('action', 100).notNullable();
    table.uuid('performed_by');
    table.timestamp('performed_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('changes');
    
    table.foreign('license_id').references('id').inTable('licenses').onDelete('CASCADE');
    table.index('license_id');
    table.index('performed_at');
  });

  console.log('✓ Created 19 core platform tables');
}

export async function down(knex) {
  // Drop tables in reverse order to handle foreign key constraints
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

  console.log('✓ Dropped 19 core platform tables');
}
