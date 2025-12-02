/**
 * Migration: Create Base Schema (Organizations, RBAC, Email Settings, Products, Features, Platform Users, License Manager)
 * Source: schema.sql
 * Created: 2025-12-01
 * 
 * This migration creates all base tables from schema.sql including:
 * - Organizations and related configuration
 * - RBAC system (permissions, roles, role_permissions, user_roles)
 * - Email settings with multiple provider support
 * - Products and product management
 * - Features and feature grants
 * - Platform users and refresh tokens
 * - VPS instances and deployments
 * - License manager tables (customers, licenses, instances, etc.)
 * - Views, functions, triggers, and RLS policies
 */

exports.up = async function(knex) {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  // ============================================================================
  // ORGANIZATIONS TABLE
  // ============================================================================
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable().unique();
    
    // License & Subscription
    table.string('tier', 50).notNullable().defaultTo('starter');
    table.string('license_key', 500);
    table.timestamp('license_expires_at', { useTz: true });
    table.string('subscription_status', 50).defaultTo('active');
    table.string('subscription_id', 255);
    
    // Limits
    table.integer('max_users').defaultTo(10);
    table.integer('max_workspaces').defaultTo(1);
    table.integer('max_jobs');
    table.integer('max_candidates');
    
    // Session Policy Configuration
    table.string('session_policy', 50).defaultTo('multiple');
    table.integer('max_sessions_per_user').defaultTo(5);
    table.boolean('concurrent_login_detection').defaultTo(false);
    
    // MFA Security Policy
    table.boolean('mfa_required').defaultTo(false);
    table.timestamp('mfa_enforcement_date', { useTz: true });
    
    // Deployment Configuration
    table.string('deployment_model', 50).notNullable().defaultTo('shared');
    table.uuid('vps_id'); // References vps_instances(id), FK added later
    
    // Timezone Configuration
    table.string('timezone', 100).notNullable().defaultTo('UTC');
    
    // Organization Contact Information
    table.text('address');
    table.string('phone', 50);
    table.string('email', 255);
    table.string('website', 255);
    table.text('logo_url');
    
    // Settings
    table.jsonb('settings').defaultTo('{}');
    table.jsonb('branding').defaultTo('{}');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add CHECK constraints for organizations
  await knex.raw(`ALTER TABLE organizations ADD CONSTRAINT check_tier CHECK (tier IN ('starter', 'professional', 'enterprise'))`);
  await knex.raw(`ALTER TABLE organizations ADD CONSTRAINT check_subscription_status CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'suspended'))`);
  await knex.raw(`ALTER TABLE organizations ADD CONSTRAINT check_session_policy CHECK (session_policy IN ('single', 'multiple'))`);
  await knex.raw(`ALTER TABLE organizations ADD CONSTRAINT check_deployment_model CHECK (deployment_model IN ('shared', 'dedicated'))`);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_organizations_slug ON organizations(slug)');
  await knex.raw('CREATE INDEX idx_organizations_tier ON organizations(tier)');
  await knex.raw('CREATE INDEX idx_organizations_deployment ON organizations(deployment_model)');
  
  // Add comments
  await knex.raw(`COMMENT ON COLUMN organizations.session_policy IS 'Session policy: "single" = one session per user (license enforcement), "multiple" = allow multiple devices (default)'`);
  await knex.raw(`COMMENT ON COLUMN organizations.max_sessions_per_user IS 'Maximum concurrent sessions per user when session_policy = "multiple"'`);
  await knex.raw(`COMMENT ON COLUMN organizations.concurrent_login_detection IS 'Enable detection of simultaneous logins from different IPs/locations'`);
  await knex.raw(`COMMENT ON COLUMN organizations.mfa_required IS 'Whether MFA is mandatory for all users in this organization (cannot be disabled by users). TRUE for shared deployments for security.'`);
  await knex.raw(`COMMENT ON COLUMN organizations.mfa_enforcement_date IS 'Date when MFA became mandatory. Users without MFA enabled after this date will be prompted to set it up.'`);
  
  // ============================================================================
  // PERMISSIONS TABLE
  // ============================================================================
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product', 50).notNullable();
    table.string('name', 100).notNullable();
    table.string('display_name', 200).notNullable();
    table.text('description');
    table.string('category', 100);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  
  await knex.raw('ALTER TABLE permissions ADD CONSTRAINT unique_product_permission UNIQUE (product, name)');
  await knex.raw('CREATE INDEX idx_permissions_product ON permissions(product)');
  await knex.raw('CREATE INDEX idx_permissions_name ON permissions(name)');
  await knex.raw('CREATE INDEX idx_permissions_category ON permissions(category)');
  
  await knex.raw(`COMMENT ON TABLE permissions IS 'Product-specific permissions seeded by each product (paylinq, nexus, recruitiq, etc.)'`);
  await knex.raw(`COMMENT ON COLUMN permissions.category IS 'Permission category for grouping: paylinq, nexus, recruitiq, portal, tenant, license, security, etc.'`);
  
  // ============================================================================
  // ROLES TABLE
  // ============================================================================
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('display_name', 200).notNullable();
    table.string('role_type', 20).notNullable().defaultTo('tenant');
    table.text('description');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by');
  });
  
  await knex.raw(`ALTER TABLE roles ADD CONSTRAINT check_role_type CHECK (role_type IN ('platform', 'tenant', 'custom', 'system'))`);
  await knex.raw('ALTER TABLE roles ADD CONSTRAINT unique_org_role UNIQUE (organization_id, name)');
  await knex.raw('CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_type ON roles(role_type) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_active ON roles(is_active) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_name ON roles(name) WHERE deleted_at IS NULL');
  
  await knex.raw(`COMMENT ON TABLE roles IS 'Organization-specific roles. Each tenant organization gets seeded with system roles (owner, admin, etc.) and can create custom roles.'`);
  await knex.raw(`COMMENT ON COLUMN roles.organization_id IS 'Organization this role belongs to. All roles are organization-scoped for multi-tenancy.'`);
  await knex.raw(`COMMENT ON COLUMN roles.role_type IS 'platform = portal admins, tenant = organization system roles, custom = user-created roles'`);
  
  // ============================================================================
  // ROLE_PERMISSIONS TABLE
  // ============================================================================
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at', { useTz: true });
  });
  
  await knex.raw('ALTER TABLE role_permissions ADD CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)');
  await knex.raw('CREATE INDEX idx_role_permissions_role ON role_permissions(role_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id) WHERE deleted_at IS NULL');
  
  await knex.raw(`COMMENT ON TABLE role_permissions IS 'Many-to-many mapping between roles and permissions'`);
  
  // ============================================================================
  // USER_ROLES TABLE
  // ============================================================================
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by');
  });
  
  await knex.raw('ALTER TABLE user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id, role_id)');
  await knex.raw('CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE deleted_at IS NULL');
  
  await knex.raw(`COMMENT ON TABLE user_roles IS 'Assigns roles to users. user_id references hris.user_account (tenant users) or platform_users (platform admins)'`);
  await knex.raw(`COMMENT ON COLUMN user_roles.user_id IS 'References either hris.user_account.id or platform_users.id (no FK constraint to support both)'`);
  
  // ============================================================================
  // EMAIL_SETTINGS TABLE
  // ============================================================================
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Provider configuration
    table.string('provider', 20).notNullable();
    
    // Common settings (used by all providers)
    table.string('from_email', 255).notNullable();
    table.string('from_name', 255).notNullable();
    table.string('reply_to_email', 255);
    
    // SMTP settings (used when provider = 'smtp')
    table.string('smtp_host', 255);
    table.integer('smtp_port');
    table.string('smtp_username', 255);
    table.text('smtp_password'); // Encrypted
    table.string('smtp_secure', 10);
    
    // SendGrid settings (used when provider = 'sendgrid')
    table.text('sendgrid_api_key'); // Encrypted
    
    // AWS SES settings (used when provider = 'ses')
    table.string('aws_region', 50);
    table.string('aws_access_key_id', 255);
    table.text('aws_secret_access_key'); // Encrypted
    
    // Status tracking
    table.boolean('is_configured').defaultTo(false);
    table.timestamp('last_tested_at', { useTz: true });
    
    // Audit columns
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  await knex.raw(`ALTER TABLE email_settings ADD CONSTRAINT check_provider CHECK (provider IN ('smtp', 'sendgrid', 'ses'))`);
  await knex.raw(`ALTER TABLE email_settings ADD CONSTRAINT check_smtp_secure CHECK (smtp_secure IS NULL OR smtp_secure IN ('tls', 'ssl', 'none'))`);
  await knex.raw('ALTER TABLE email_settings ADD CONSTRAINT unique_organization_email_settings UNIQUE (organization_id)');
  await knex.raw('CREATE INDEX idx_email_settings_organization ON email_settings(organization_id)');
  await knex.raw('CREATE INDEX idx_email_settings_provider ON email_settings(provider)');
  await knex.raw('CREATE INDEX idx_email_settings_deleted ON email_settings(deleted_at) WHERE deleted_at IS NULL');
  
  await knex.raw(`COMMENT ON TABLE email_settings IS 'Organization-wide email configuration shared across all products (Paylinq, Nexus, RecruitIQ, etc.)'`);
  await knex.raw(`COMMENT ON COLUMN email_settings.provider IS 'Email service provider: smtp, sendgrid, or ses'`);
  await knex.raw(`COMMENT ON COLUMN email_settings.smtp_password IS 'Encrypted SMTP password'`);
  await knex.raw(`COMMENT ON COLUMN email_settings.sendgrid_api_key IS 'Encrypted SendGrid API key'`);
  await knex.raw(`COMMENT ON COLUMN email_settings.aws_secret_access_key IS 'Encrypted AWS secret access key'`);
  await knex.raw(`COMMENT ON COLUMN email_settings.is_configured IS 'Whether email settings have been configured and tested'`);
  
  // ============================================================================
  // PRODUCTS TABLE
  // ============================================================================
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Product Identification
    table.string('name', 100).notNullable().unique();
    table.string('display_name', 255).notNullable();
    table.text('description');
    table.string('slug', 100).notNullable().unique();
    
    // Product Metadata
    table.string('version', 50).notNullable().defaultTo('1.0.0');
    table.string('npm_package', 255);
    table.string('repository_url', 500);
    table.string('documentation_url', 500);
    
    // Product Configuration
    table.string('status', 50).notNullable().defaultTo('active');
    table.boolean('is_core').defaultTo(false);
    table.boolean('requires_license').defaultTo(true);
    
    // Technical Details
    table.string('base_path', 100);
    table.string('api_prefix', 100);
    table.integer('default_port');
    
    // Resource Requirements
    table.string('min_tier', 50).defaultTo('starter');
    table.jsonb('resource_requirements').defaultTo('{}');
    
    // Feature Flags
    table.jsonb('features').defaultTo('[]');
    table.jsonb('default_features').defaultTo('[]');
    
    // UI Configuration
    table.string('icon', 100);
    table.string('color', 50);
    table.jsonb('ui_config').defaultTo('{}');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at', { useTz: true });
  });
  
  await knex.raw(`ALTER TABLE products ADD CONSTRAINT check_status CHECK (status IN ('active', 'beta', 'deprecated', 'disabled'))`);
  await knex.raw('CREATE INDEX idx_products_slug ON products(slug)');
  await knex.raw('CREATE INDEX idx_products_status ON products(status)');
  await knex.raw('CREATE INDEX idx_products_name ON products(name)');
  await knex.raw('CREATE INDEX idx_products_is_core ON products(is_core)');
  
  await knex.raw(`COMMENT ON TABLE products IS 'Registry of all available products in the multi-product platform'`);
  await knex.raw(`COMMENT ON COLUMN products.npm_package IS 'NPM package name for dynamic product loading (e.g., "@recruitiq/schedulehub")'`);
  await knex.raw(`COMMENT ON COLUMN products.is_core IS 'Core products are always available, add-ons require explicit enablement'`);
  await knex.raw(`COMMENT ON COLUMN products.base_path IS 'URL base path for product routing'`);
  await knex.raw(`COMMENT ON COLUMN products.min_tier IS 'Minimum subscription tier required to access this product'`);
  
  // ============================================================================
  // PRODUCT_PERMISSIONS TABLE
  // ============================================================================
  await knex.schema.createTable('product_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // References
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    
    // Access Control
    table.boolean('is_enabled').defaultTo(true);
    table.string('access_level', 50).defaultTo('full');
    
    // License & Limits
    table.string('license_key', 500);
    table.timestamp('license_expires_at', { useTz: true });
    table.integer('max_users');
    table.integer('max_resources');
    
    // Feature Overrides
    table.jsonb('enabled_features').defaultTo('[]');
    table.jsonb('disabled_features').defaultTo('[]');
    
    // Usage Tracking
    table.integer('users_count').defaultTo(0);
    table.integer('resources_count').defaultTo(0);
    table.timestamp('last_accessed_at', { useTz: true });
    
    // Metadata
    table.timestamp('granted_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('granted_by');
    table.timestamp('revoked_at', { useTz: true });
    table.uuid('revoked_by');
    table.text('notes');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.unique(['organization_id', 'product_id']);
  });
  
  await knex.raw(`ALTER TABLE product_permissions ADD CONSTRAINT check_access_level CHECK (access_level IN ('none', 'read', 'write', 'full', 'admin'))`);
  await knex.raw('CREATE INDEX idx_product_permissions_org ON product_permissions(organization_id)');
  await knex.raw('CREATE INDEX idx_product_permissions_product ON product_permissions(product_id)');
  await knex.raw('CREATE INDEX idx_product_permissions_enabled ON product_permissions(is_enabled)');
  await knex.raw('CREATE INDEX idx_product_permissions_expires ON product_permissions(license_expires_at)');
  
  await knex.raw(`COMMENT ON TABLE product_permissions IS 'Defines which organizations have access to which products'`);
  await knex.raw(`COMMENT ON COLUMN product_permissions.access_level IS 'Granular access control: none, read (view only), write (use features), full (all features), admin (manage product settings)'`);
  await knex.raw(`COMMENT ON COLUMN product_permissions.enabled_features IS 'Product features enabled for this organization (overrides product defaults)'`);
  
  // ============================================================================
  // PRODUCT_CONFIGS TABLE
  // ============================================================================
  await knex.schema.createTable('product_configs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // References
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    
    // Configuration
    table.string('config_key', 255).notNullable();
    table.jsonb('config_value').notNullable();
    table.string('config_type', 50).defaultTo('custom');
    
    // Validation
    table.boolean('is_encrypted').defaultTo(false);
    table.boolean('is_sensitive').defaultTo(false);
    
    // Metadata
    table.text('description');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by');
    
    table.unique(['organization_id', 'product_id', 'config_key']);
  });
  
  await knex.raw(`ALTER TABLE product_configs ADD CONSTRAINT check_config_type CHECK (config_type IN ('default', 'custom', 'override'))`);
  await knex.raw('CREATE INDEX idx_product_configs_org ON product_configs(organization_id)');
  await knex.raw('CREATE INDEX idx_product_configs_product ON product_configs(product_id)');
  await knex.raw('CREATE INDEX idx_product_configs_key ON product_configs(config_key)');
  await knex.raw('CREATE INDEX idx_product_configs_sensitive ON product_configs(is_sensitive)');
  
  await knex.raw(`COMMENT ON TABLE product_configs IS 'Organization-specific configuration overrides for products'`);
  await knex.raw(`COMMENT ON COLUMN product_configs.config_type IS 'default (from product), custom (org-specific), override (admin override)'`);
  await knex.raw(`COMMENT ON COLUMN product_configs.is_encrypted IS 'Whether the config_value is encrypted at rest'`);
  await knex.raw(`COMMENT ON COLUMN product_configs.is_sensitive IS 'Whether this config contains sensitive data (API keys, credentials)'`);
  
  // ============================================================================
  // PRODUCT_FEATURES TABLE
  // ============================================================================
  await knex.schema.createTable('product_features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // References
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    
    // Feature Details
    table.string('feature_key', 255).notNullable();
    table.string('feature_name', 255).notNullable();
    table.text('description');
    
    // Feature Status
    table.string('status', 50).defaultTo('beta');
    table.boolean('is_default').defaultTo(false);
    
    // Requirements
    table.string('min_tier', 50);
    table.jsonb('requires_features').defaultTo('[]');
    
    // Configuration
    table.jsonb('config_schema').defaultTo('{}');
    table.jsonb('default_config').defaultTo('{}');
    
    // Rollout Control
    table.integer('rollout_percentage').defaultTo(100);
    table.jsonb('target_organizations').defaultTo('[]');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    
    table.unique(['product_id', 'feature_key']);
  });
  
  await knex.raw(`ALTER TABLE product_features ADD CONSTRAINT check_pf_status CHECK (status IN ('alpha', 'beta', 'stable', 'deprecated', 'disabled'))`);
  await knex.raw(`ALTER TABLE product_features ADD CONSTRAINT check_rollout CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)`);
  await knex.raw('CREATE INDEX idx_product_features_product ON product_features(product_id)');
  await knex.raw('CREATE INDEX idx_product_features_key ON product_features(feature_key)');
  await knex.raw('CREATE INDEX idx_product_features_status ON product_features(status)');
  await knex.raw('CREATE INDEX idx_product_features_default ON product_features(is_default)');
  
  await knex.raw(`COMMENT ON TABLE product_features IS 'Feature flags and toggles for gradual rollout and A/B testing'`);
  await knex.raw(`COMMENT ON COLUMN product_features.rollout_percentage IS 'Percentage of organizations that should have this feature enabled (0-100)'`);
  await knex.raw(`COMMENT ON COLUMN product_features.requires_features IS 'List of feature_keys that must be enabled before this feature'`);
  await knex.raw(`COMMENT ON COLUMN product_features.config_schema IS 'JSON Schema defining valid configuration for this feature'`);
  
  // ============================================================================
  // FEATURES TABLE
  // ============================================================================
  await knex.schema.createTable('features', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // References
    table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    
    // Feature Identity
    table.string('feature_key', 255).notNullable();
    table.string('feature_name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    
    // Feature Status & Lifecycle
    table.string('status', 50).defaultTo('beta');
    table.timestamp('deprecated_at', { useTz: true });
    table.text('deprecation_message');
    
    // Tier & Pricing
    table.string('min_tier', 50);
    table.boolean('is_add_on').defaultTo(false);
    table.jsonb('pricing').defaultTo('{}');
    
    // Feature Dependencies
    table.jsonb('required_features').defaultTo('[]');
    table.jsonb('conflicting_features').defaultTo('[]');
    
    // Configuration
    table.jsonb('config_schema').defaultTo('{}');
    table.jsonb('default_config').defaultTo('{}');
    
    // Usage Limits
    table.boolean('has_usage_limit').defaultTo(false);
    table.integer('default_usage_limit');
    table.string('usage_limit_unit', 50);
    
    // Rollout Control
    table.integer('rollout_percentage').defaultTo(100);
    table.jsonb('target_organizations').defaultTo('[]');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    
    table.unique(['product_id', 'feature_key']);
  });
  
  await knex.raw(`ALTER TABLE features ADD CONSTRAINT check_f_status CHECK (status IN ('alpha', 'beta', 'stable', 'deprecated', 'disabled'))`);
  await knex.raw(`ALTER TABLE features ADD CONSTRAINT check_f_rollout CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)`);
  await knex.raw('CREATE INDEX idx_features_product ON features(product_id)');
  await knex.raw('CREATE INDEX idx_features_key ON features(feature_key)');
  await knex.raw('CREATE INDEX idx_features_status ON features(status)');
  await knex.raw('CREATE INDEX idx_features_category ON features(category)');
  await knex.raw('CREATE INDEX idx_features_add_on ON features(is_add_on)');
  await knex.raw('CREATE INDEX idx_features_tier ON features(min_tier)');
  await knex.raw('CREATE INDEX idx_features_rollout ON features(rollout_percentage) WHERE rollout_percentage < 100');
  
  await knex.raw(`COMMENT ON TABLE features IS 'Central registry of all features across products with granular access control'`);
  await knex.raw(`COMMENT ON COLUMN features.is_add_on IS 'If true, this feature can be purchased separately regardless of tier'`);
  await knex.raw(`COMMENT ON COLUMN features.required_features IS 'Features that must be enabled before this feature can be activated'`);
  await knex.raw(`COMMENT ON COLUMN features.conflicting_features IS 'Features that cannot be active when this feature is active'`);
  
  // ============================================================================
  // ORGANIZATION_FEATURE_GRANTS TABLE
  // ============================================================================
  await knex.schema.createTable('organization_feature_grants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // References
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('feature_id').notNullable().references('id').inTable('features').onDelete('CASCADE');
    
    // Grant Details
    table.string('granted_via', 50).notNullable();
    table.text('granted_reason');
    
    // Grant Status
    table.boolean('is_active').defaultTo(true);
    
    // Configuration Override
    table.jsonb('config').defaultTo('{}');
    
    // Expiration
    table.timestamp('expires_at', { useTz: true });
    table.boolean('auto_renew').defaultTo(false);
    
    // Usage Limits
    table.integer('usage_limit');
    table.integer('current_usage').defaultTo(0);
    table.timestamp('last_usage_at', { useTz: true });
    table.timestamp('usage_reset_at', { useTz: true });
    
    // Billing
    table.string('billing_status', 50);
    table.string('subscription_id', 255);
    
    // Metadata
    table.timestamp('granted_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('granted_by');
    table.timestamp('revoked_at', { useTz: true });
    table.uuid('revoked_by');
    table.text('revoked_reason');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.unique(['organization_id', 'feature_id']);
  });
  
  await knex.raw(`ALTER TABLE organization_feature_grants ADD CONSTRAINT check_granted_via CHECK (granted_via IN ('tier_included', 'add_on_purchase', 'manual_grant', 'trial', 'promotional'))`);
  await knex.raw(`ALTER TABLE organization_feature_grants ADD CONSTRAINT check_billing_status CHECK (billing_status IS NULL OR billing_status IN ('active', 'past_due', 'canceled', 'trial'))`);
  await knex.raw('CREATE INDEX idx_org_feature_grants_org ON organization_feature_grants(organization_id)');
  await knex.raw('CREATE INDEX idx_org_feature_grants_feature ON organization_feature_grants(feature_id)');
  await knex.raw('CREATE INDEX idx_org_feature_grants_active ON organization_feature_grants(is_active) WHERE is_active = TRUE');
  await knex.raw('CREATE INDEX idx_org_feature_grants_expires ON organization_feature_grants(expires_at) WHERE expires_at IS NOT NULL');
  await knex.raw('CREATE INDEX idx_org_feature_grants_granted_via ON organization_feature_grants(granted_via)');
  await knex.raw('CREATE INDEX idx_org_feature_grants_billing ON organization_feature_grants(billing_status)');
  await knex.raw('CREATE INDEX idx_org_feature_grants_usage ON organization_feature_grants(organization_id, feature_id, current_usage)');
  
  await knex.raw(`COMMENT ON TABLE organization_feature_grants IS 'Tracks which organizations have access to which features and how they were granted'`);
  await knex.raw(`COMMENT ON COLUMN organization_feature_grants.granted_via IS 'How the feature was granted: tier (included in tier), add_on (purchased), manual (admin granted), trial, promotional'`);
  await knex.raw(`COMMENT ON COLUMN organization_feature_grants.current_usage IS 'Current usage count for features with usage limits'`);
  await knex.raw(`COMMENT ON COLUMN organization_feature_grants.usage_reset_at IS 'When the usage counter resets (typically monthly)'`);
  
  // ============================================================================
  // FEATURE_USAGE_EVENTS TABLE (Partitioned)
  // ============================================================================
  await knex.raw(`
    CREATE TABLE feature_usage_events (
      id UUID DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
      user_id UUID,
      event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('access', 'usage', 'limit_exceeded', 'trial_started', 'trial_ended')),
      event_data JSONB DEFAULT '{}',
      usage_count INTEGER DEFAULT 1,
      ip_address INET,
      user_agent TEXT,
      request_path VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at)
  `);
  
  // Create partitions
  await knex.raw(`CREATE TABLE feature_usage_events_2025_08 PARTITION OF feature_usage_events FOR VALUES FROM ('2025-08-01') TO ('2025-09-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2025_09 PARTITION OF feature_usage_events FOR VALUES FROM ('2025-09-01') TO ('2025-10-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2025_10 PARTITION OF feature_usage_events FOR VALUES FROM ('2025-10-01') TO ('2025-11-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2025_11 PARTITION OF feature_usage_events FOR VALUES FROM ('2025-11-01') TO ('2025-12-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2025_12 PARTITION OF feature_usage_events FOR VALUES FROM ('2025-12-01') TO ('2026-01-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2026_01 PARTITION OF feature_usage_events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01')`);
  await knex.raw(`CREATE TABLE feature_usage_events_2026_02 PARTITION OF feature_usage_events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01')`);
  
  await knex.raw('CREATE INDEX idx_feature_usage_org ON feature_usage_events(organization_id, created_at DESC)');
  await knex.raw('CREATE INDEX idx_feature_usage_feature ON feature_usage_events(feature_id, created_at DESC)');
  await knex.raw('CREATE INDEX idx_feature_usage_user ON feature_usage_events(user_id, created_at DESC) WHERE user_id IS NOT NULL');
  await knex.raw('CREATE INDEX idx_feature_usage_event_type ON feature_usage_events(event_type, created_at DESC)');
  
  await knex.raw(`COMMENT ON TABLE feature_usage_events IS 'Time-series data for feature usage tracking, analytics, and billing (partitioned by month)'`);
  await knex.raw(`COMMENT ON COLUMN feature_usage_events.event_type IS 'Type of usage event: access (feature checked), usage (feature used), limit_exceeded, trial events'`);
  await knex.raw(`COMMENT ON COLUMN feature_usage_events.usage_count IS 'Number of usage units consumed in this event'`);
  
  // ============================================================================
  // FEATURE_AUDIT_LOG TABLE
  // ============================================================================
  await knex.schema.createTable('feature_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // What Changed
    table.string('entity_type', 50).notNullable();
    table.uuid('entity_id').notNullable();
    
    // Action
    table.string('action', 50).notNullable();
    
    // Changes
    table.jsonb('changes').notNullable().defaultTo('{}');
    table.jsonb('old_values').defaultTo('{}');
    table.jsonb('new_values').defaultTo('{}');
    
    // Context
    table.uuid('organization_id');
    table.uuid('feature_id');
    
    // Actor
    table.uuid('performed_by');
    table.string('performed_by_type', 50).defaultTo('user');
    
    // Request Context
    table.specificType('ip_address', 'inet');
    table.text('user_agent');
    
    // Metadata
    table.text('reason');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw(`ALTER TABLE feature_audit_log ADD CONSTRAINT check_entity_type CHECK (entity_type IN ('feature', 'grant', 'config'))`);
  await knex.raw(`ALTER TABLE feature_audit_log ADD CONSTRAINT check_action CHECK (action IN ('created', 'updated', 'deleted', 'granted', 'revoked', 'expired', 'usage_limit_exceeded'))`);
  await knex.raw(`ALTER TABLE feature_audit_log ADD CONSTRAINT check_performed_by_type CHECK (performed_by_type IN ('user', 'system', 'api', 'scheduled_job'))`);
  
  await knex.raw('CREATE INDEX idx_feature_audit_entity ON feature_audit_log(entity_type, entity_id, created_at DESC)');
  await knex.raw('CREATE INDEX idx_feature_audit_action ON feature_audit_log(action, created_at DESC)');
  await knex.raw('CREATE INDEX idx_feature_audit_org ON feature_audit_log(organization_id, created_at DESC) WHERE organization_id IS NOT NULL');
  await knex.raw('CREATE INDEX idx_feature_audit_feature ON feature_audit_log(feature_id, created_at DESC) WHERE feature_id IS NOT NULL');
  await knex.raw('CREATE INDEX idx_feature_audit_performed_by ON feature_audit_log(performed_by, created_at DESC) WHERE performed_by IS NOT NULL');
  await knex.raw('CREATE INDEX idx_feature_audit_created_at ON feature_audit_log(created_at DESC)');
  
  await knex.raw(`COMMENT ON TABLE feature_audit_log IS 'Immutable audit trail of all changes to features, grants, and configurations'`);
  await knex.raw(`COMMENT ON COLUMN feature_audit_log.entity_type IS 'Type of entity that changed: feature, grant, or config'`);
  await knex.raw(`COMMENT ON COLUMN feature_audit_log.changes IS 'Summary of what changed in human-readable format'`);
  await knex.raw(`COMMENT ON COLUMN feature_audit_log.performed_by_type IS 'Whether change was made by user, system, API call, or scheduled job'`);
  
  // ============================================================================
  // PLATFORM_USERS TABLE
  // ============================================================================
  await knex.schema.createTable('platform_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Auth
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255);
    
    // Profile
    table.string('name', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('avatar_url', 500);
    table.string('phone', 50);
    table.string('timezone', 100).defaultTo('UTC');
    
    // Platform Roles
    table.string('role', 50).notNullable().defaultTo('viewer');
    
    // Additional permissions
    table.jsonb('permissions').defaultTo('[]');
    
    // Security
    table.timestamp('last_login_at', { useTz: true });
    table.string('last_login_ip', 50);
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until', { useTz: true });
    table.string('password_reset_token', 255);
    table.timestamp('password_reset_expires_at', { useTz: true });
    
    // MFA
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255);
    table.jsonb('mfa_backup_codes').defaultTo('[]');
    table.integer('mfa_backup_codes_used').defaultTo(0);
    table.timestamp('mfa_enabled_at', { useTz: true });
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at', { useTz: true });
  });
  
  await knex.raw(`ALTER TABLE platform_users ADD CONSTRAINT check_role CHECK (role IN ('super_admin', 'admin', 'support', 'viewer'))`);
  await knex.raw('CREATE INDEX idx_platform_users_email ON platform_users(email) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_platform_users_role ON platform_users(role) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_platform_users_is_active ON platform_users(is_active) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_platform_users_last_login ON platform_users(last_login_at DESC) WHERE deleted_at IS NULL');
  
  await knex.raw(`COMMENT ON TABLE platform_users IS 'Platform administrators for Portal app, License Manager, and Admin Panel. Tenant users are in hris.user_account.'`);
  await knex.raw(`COMMENT ON COLUMN platform_users.role IS 'Platform role: super_admin (full control), admin (product/org management), support (view + support), viewer (read-only)'`);
  await knex.raw(`COMMENT ON COLUMN platform_users.permissions IS 'JSONB array of additional permission strings beyond role permissions'`);
  await knex.raw(`COMMENT ON COLUMN platform_users.email IS 'Unique email address for platform login. Platform users do not belong to any organization.'`);
  await knex.raw(`COMMENT ON COLUMN platform_users.is_active IS 'Whether user account is enabled. Inactive users cannot log in.'`);
  
  // ============================================================================
  // PLATFORM_REFRESH_TOKENS TABLE
  // ============================================================================
  await knex.schema.createTable('platform_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('platform_users').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true });
    
    // Device/Session Tracking
    table.text('user_agent');
    table.string('ip_address', 45);
    table.string('device_fingerprint', 32);
    table.string('device_name', 100);
    table.timestamp('last_used_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Token Rotation Support
    table.string('replaced_by_token', 255);
  });
  
  await knex.raw('CREATE INDEX idx_platform_refresh_tokens_user_id ON platform_refresh_tokens(user_id)');
  await knex.raw('CREATE INDEX idx_platform_refresh_tokens_token ON platform_refresh_tokens(token)');
  await knex.raw('CREATE INDEX idx_platform_refresh_tokens_user_active ON platform_refresh_tokens(user_id, revoked_at, expires_at) WHERE revoked_at IS NULL');
  await knex.raw('CREATE INDEX idx_platform_refresh_tokens_device_fingerprint ON platform_refresh_tokens(device_fingerprint)');
  await knex.raw('CREATE INDEX idx_platform_refresh_tokens_expires_at ON platform_refresh_tokens(expires_at)');
  
  await knex.raw(`COMMENT ON TABLE platform_refresh_tokens IS 'Refresh tokens for platform user sessions. Separate from tenant tokens in hris schema.'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.user_agent IS 'Full User-Agent string from client'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.ip_address IS 'IP address of the client (IPv4 or IPv6)'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.device_fingerprint IS 'SHA-256 hash of device characteristics'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.device_name IS 'Human-readable device name (e.g., "iPhone", "Windows PC")'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.last_used_at IS 'Timestamp of last token usage for session tracking'`);
  await knex.raw(`COMMENT ON COLUMN platform_refresh_tokens.replaced_by_token IS 'Token that replaced this one during rotation'`);
  
  // ============================================================================
  // VPS_INSTANCES TABLE
  // ============================================================================
  await knex.schema.createTable('vps_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // VPS identification
    table.string('vps_name', 255).notNullable().unique();
    table.string('vps_ip', 50).notNullable();
    table.string('hostname', 255);
    
    // VPS type
    table.string('deployment_type', 20).notNullable();
    
    // Dedicated VPS links to one organization
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('SET NULL');
    
    // Location & Provider
    table.string('location', 100);
    table.string('provider', 50).defaultTo('transip');
    
    // Specs
    table.integer('cpu_cores');
    table.integer('memory_mb');
    table.integer('disk_gb');
    
    // Status
    table.string('status', 50).notNullable().defaultTo('active');
    
    // Capacity management
    table.integer('max_tenants').defaultTo(20);
    table.integer('current_tenants').defaultTo(0);
    
    // Resource usage metrics
    table.decimal('cpu_usage_percent', 5, 2);
    table.decimal('memory_usage_percent', 5, 2);
    table.decimal('disk_usage_percent', 5, 2);
    table.timestamp('last_health_check', { useTz: true });
    
    // Metadata
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw(`ALTER TABLE vps_instances ADD CONSTRAINT check_vps_deployment_type CHECK (deployment_type IN ('shared', 'dedicated'))`);
  await knex.raw(`ALTER TABLE vps_instances ADD CONSTRAINT check_vps_status CHECK (status IN ('provisioning', 'active', 'maintenance', 'offline', 'decommissioned'))`);
  await knex.raw('CREATE INDEX idx_vps_deployment_type ON vps_instances(deployment_type)');
  await knex.raw('CREATE INDEX idx_vps_status ON vps_instances(status)');
  await knex.raw('CREATE INDEX idx_vps_organization ON vps_instances(organization_id)');
  
  // Add foreign key from organizations to vps_instances
  await knex.raw('ALTER TABLE organizations ADD CONSTRAINT fk_organizations_vps FOREIGN KEY (vps_id) REFERENCES vps_instances(id) ON DELETE SET NULL');
  await knex.raw('CREATE INDEX idx_organizations_vps ON organizations(vps_id)');
  
  // ============================================================================
  // INSTANCE_DEPLOYMENTS TABLE
  // ============================================================================
  await knex.schema.createTable('instance_deployments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Deployment configuration
    table.string('deployment_model', 20).notNullable();
    
    // Status tracking
    table.string('status', 50).notNullable().defaultTo('provisioning');
    
    // Instance details
    table.string('subdomain', 100).notNullable();
    table.string('tier', 50).notNullable();
    
    // VPS reference
    table.uuid('vps_id').references('id').inTable('vps_instances').onDelete('SET NULL');
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true });
    
    // Error handling
    table.text('error_message');
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}');
  });
  
  await knex.raw(`ALTER TABLE instance_deployments ADD CONSTRAINT check_id_deployment_model CHECK (deployment_model IN ('shared', 'dedicated'))`);
  await knex.raw('CREATE INDEX idx_deployments_org ON instance_deployments(organization_id)');
  await knex.raw('CREATE INDEX idx_deployments_status ON instance_deployments(status)');
  await knex.raw('CREATE INDEX idx_deployments_vps ON instance_deployments(vps_id)');
  
  // ============================================================================
  // CUSTOMERS TABLE
  // ============================================================================
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Link to organization
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    
    // Customer Details
    table.string('name', 255).notNullable();
    table.string('contact_email', 255).notNullable();
    table.string('contact_name', 255);
    
    // License & Tier
    table.string('tier', 50).notNullable();
    
    // Deployment
    table.string('deployment_type', 50).notNullable();
    table.string('instance_key', 100).notNullable().unique();
    table.string('instance_url', 500);
    
    // Status
    table.string('status', 50).defaultTo('active');
    
    // Contract
    table.date('contract_start_date').notNullable();
    table.date('contract_end_date');
    
    // Instance Info
    table.string('app_version', 50);
    table.timestamp('last_heartbeat', { useTz: true });
    
    // Metadata
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  await knex.raw(`ALTER TABLE customers ADD CONSTRAINT check_customer_tier CHECK (tier IN ('starter', 'professional', 'enterprise'))`);
  await knex.raw(`ALTER TABLE customers ADD CONSTRAINT check_customer_deployment_type CHECK (deployment_type IN ('cloud', 'self-hosted'))`);
  await knex.raw(`ALTER TABLE customers ADD CONSTRAINT check_customer_status CHECK (status IN ('active', 'suspended', 'canceled'))`);
  await knex.raw('CREATE INDEX idx_customers_organization ON customers(organization_id)');
  await knex.raw('CREATE INDEX idx_customers_tier ON customers(tier)');
  await knex.raw('CREATE INDEX idx_customers_status ON customers(status)');
  await knex.raw('CREATE INDEX idx_customers_instance_key ON customers(instance_key)');
  await knex.raw('CREATE INDEX idx_customers_deployment_type ON customers(deployment_type)');
  
  // ============================================================================
  // TIER_PRESETS TABLE
  // ============================================================================
  await knex.schema.createTable('tier_presets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Tier Info
    table.string('tier_name', 50).notNullable();
    table.integer('version').notNullable().defaultTo(1);
    
    // Limits
    table.integer('max_users').notNullable();
    table.integer('max_workspaces').notNullable();
    table.integer('max_jobs');
    table.integer('max_candidates');
    
    // Features
    table.jsonb('features').defaultTo('[]');
    
    // Status
    table.boolean('is_active').defaultTo(false);
    table.date('effective_date');
    
    // Metadata
    table.uuid('created_by');
    table.text('notes');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.unique(['tier_name', 'version']);
  });
  
  await knex.raw(`ALTER TABLE tier_presets ADD CONSTRAINT check_tier_name CHECK (tier_name IN ('starter', 'professional', 'enterprise'))`);
  await knex.raw('CREATE INDEX idx_tier_presets_tier ON tier_presets(tier_name)');
  await knex.raw('CREATE INDEX idx_tier_presets_active ON tier_presets(is_active)');
  
  // ============================================================================
  // LICENSES TABLE
  // ============================================================================
  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    
    // License Details
    table.string('license_key', 500).notNullable().unique();
    table.string('tier', 50).notNullable();
    table.uuid('tier_preset_id').references('id').inTable('tier_presets');
    
    // Validity
    table.timestamp('issued_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true }).notNullable();
    
    // Status
    table.string('status', 50).defaultTo('active');
    
    // Features & Limits
    table.integer('max_users').notNullable();
    table.integer('max_workspaces').notNullable();
    table.integer('max_jobs');
    table.integer('max_candidates');
    table.jsonb('features').defaultTo('[]');
    
    // Instance Binding
    table.string('instance_key', 100);
    table.string('instance_fingerprint', 255);
    
    // Metadata
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw(`ALTER TABLE licenses ADD CONSTRAINT check_license_tier CHECK (tier IN ('starter', 'professional', 'enterprise'))`);
  await knex.raw(`ALTER TABLE licenses ADD CONSTRAINT check_license_status CHECK (status IN ('active', 'suspended', 'expired', 'revoked'))`);
  await knex.raw('CREATE INDEX idx_licenses_customer ON licenses(customer_id)');
  await knex.raw('CREATE INDEX idx_licenses_license_key ON licenses(license_key)');
  await knex.raw('CREATE INDEX idx_licenses_status ON licenses(status)');
  await knex.raw('CREATE INDEX idx_licenses_expires_at ON licenses(expires_at)');
  await knex.raw('CREATE INDEX idx_licenses_tier ON licenses(tier)');
  
  // ============================================================================
  // INSTANCES TABLE
  // ============================================================================
  await knex.schema.createTable('instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE');
    
    // Instance Details
    table.string('instance_key', 100).notNullable().unique();
    table.string('instance_url', 500);
    table.string('instance_fingerprint', 255);
    
    // Version & Status
    table.string('app_version', 50);
    table.string('status', 50).defaultTo('active');
    
    // Heartbeat
    table.timestamp('last_heartbeat', { useTz: true });
    table.string('last_heartbeat_ip', 50);
    
    // Metadata
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw(`ALTER TABLE instances ADD CONSTRAINT check_instance_status CHECK (status IN ('active', 'inactive', 'maintenance'))`);
  await knex.raw('CREATE INDEX idx_instances_customer ON instances(customer_id)');
  await knex.raw('CREATE INDEX idx_instances_instance_key ON instances(instance_key)');
  await knex.raw('CREATE INDEX idx_instances_status ON instances(status)');
  await knex.raw('CREATE INDEX idx_instances_last_heartbeat ON instances(last_heartbeat)');
  
  // ============================================================================
  // USAGE_EVENTS TABLE
  // ============================================================================
  await knex.schema.createTable('usage_events', (table) => {
    table.bigIncrements('id').primary();
    table.uuid('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.string('instance_key', 100);
    
    // Event Details
    table.string('event_type', 100).notNullable();
    table.jsonb('event_data').defaultTo('{}');
    
    // Metrics
    table.integer('users_count');
    table.integer('workspaces_count');
    table.integer('jobs_count');
    table.integer('candidates_count');
    
    // Timestamp
    table.timestamp('timestamp', { useTz: true }).defaultTo(knex.fn.now());
    
    // Metadata
    table.string('app_version', 50);
    table.string('ip_address', 50);
  });
  
  await knex.raw('CREATE INDEX idx_usage_events_customer ON usage_events(customer_id)');
  await knex.raw('CREATE INDEX idx_usage_events_instance ON usage_events(instance_key)');
  await knex.raw('CREATE INDEX idx_usage_events_type ON usage_events(event_type)');
  await knex.raw('CREATE INDEX idx_usage_events_timestamp ON usage_events(timestamp DESC)');
  await knex.raw('CREATE INDEX idx_usage_events_customer_timestamp ON usage_events(customer_id, timestamp DESC)');
  
  // ============================================================================
  // TIER_MIGRATIONS TABLE
  // ============================================================================
  await knex.schema.createTable('tier_migrations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    
    // Migration Details
    table.string('tier_name', 50).notNullable();
    table.uuid('from_preset_id').references('id').inTable('tier_presets');
    table.uuid('to_preset_id').references('id').inTable('tier_presets');
    
    // Migration Type
    table.string('migration_type', 50);
    
    // Status
    table.string('status', 50).defaultTo('pending');
    table.integer('affected_customers').defaultTo(0);
    table.integer('migrated_customers').defaultTo(0);
    
    // Execution
    table.timestamp('started_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    
    // Error Handling
    table.jsonb('errors').defaultTo('[]');
    
    // Metadata
    table.uuid('created_by').references('id').inTable('platform_users');
    table.text('notes');
    
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw(`ALTER TABLE tier_migrations ADD CONSTRAINT check_migration_type CHECK (migration_type IS NULL OR migration_type IN ('manual', 'automatic', 'scheduled'))`);
  await knex.raw(`ALTER TABLE tier_migrations ADD CONSTRAINT check_migration_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))`);
  await knex.raw('CREATE INDEX idx_tier_migrations_tier ON tier_migrations(tier_name)');
  await knex.raw('CREATE INDEX idx_tier_migrations_status ON tier_migrations(status)');
  await knex.raw('CREATE INDEX idx_tier_migrations_created_at ON tier_migrations(created_at DESC)');
  
  // ============================================================================
  // LICENSE_AUDIT_LOG TABLE
  // ============================================================================
  await knex.schema.createTable('license_audit_log', (table) => {
    table.bigIncrements('id').primary();
    
    // User who performed the action
    table.uuid('user_id').references('id').inTable('platform_users');
    table.string('user_email', 255);
    
    // Action Details
    table.string('action', 100).notNullable();
    table.string('resource_type', 50).notNullable();
    table.uuid('resource_id');
    
    // Changes
    table.jsonb('old_values');
    table.jsonb('new_values');
    
    // Request Context
    table.string('ip_address', 50);
    table.text('user_agent');
    
    // Timestamp
    table.timestamp('timestamp', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  await knex.raw('CREATE INDEX idx_audit_log_user ON license_audit_log(user_id)');
  await knex.raw('CREATE INDEX idx_audit_log_action ON license_audit_log(action)');
  await knex.raw('CREATE INDEX idx_audit_log_resource ON license_audit_log(resource_type, resource_id)');
  await knex.raw('CREATE INDEX idx_audit_log_timestamp ON license_audit_log(timestamp DESC)');
  // ============================================================================
  // VIEWS
  // ============================================================================
  
  // Active licenses view
  await knex.raw(`
    CREATE OR REPLACE VIEW active_licenses AS
    SELECT 
      l.*,
      c.name as customer_name,
      c.contact_email,
      c.status as customer_status,
      c.instance_url
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    WHERE l.status = 'active'
    AND c.status = 'active'
    AND l.expires_at > NOW()
  `);
  
  // Expiring licenses view
  await knex.raw(`
    CREATE OR REPLACE VIEW expiring_licenses AS
    SELECT 
      l.*,
      c.name as customer_name,
      c.contact_email,
      c.instance_url,
      (l.expires_at - NOW()) as time_until_expiry
    FROM licenses l
    JOIN customers c ON l.customer_id = c.id
    WHERE l.status = 'active'
    AND l.expires_at BETWEEN NOW() AND NOW() + INTERVAL '60 days'
    ORDER BY l.expires_at ASC
  `);
  
  // Customer usage summary view
  await knex.raw(`
    CREATE OR REPLACE VIEW customer_usage_summary AS
    SELECT 
      c.id,
      c.name,
      c.tier,
      c.status,
      i.app_version,
      i.last_heartbeat,
      l.max_users,
      l.max_workspaces,
      l.max_jobs,
      l.max_candidates,
      l.expires_at as license_expires_at,
      (
        SELECT MAX(users_count) 
        FROM usage_events 
        WHERE customer_id = c.id 
        AND timestamp > NOW() - INTERVAL '30 days'
      ) as current_users,
      (
        SELECT MAX(workspaces_count) 
        FROM usage_events 
        WHERE customer_id = c.id 
        AND timestamp > NOW() - INTERVAL '30 days'
      ) as current_workspaces,
      (
        SELECT MAX(jobs_count) 
        FROM usage_events 
        WHERE customer_id = c.id 
        AND timestamp > NOW() - INTERVAL '30 days'
      ) as current_jobs,
      (
        SELECT MAX(candidates_count) 
        FROM usage_events 
        WHERE customer_id = c.id 
        AND timestamp > NOW() - INTERVAL '30 days'
      ) as current_candidates
    FROM customers c
    LEFT JOIN instances i ON c.instance_key = i.instance_key
    LEFT JOIN licenses l ON c.id = l.customer_id AND l.status = 'active'
    WHERE c.status = 'active'
  `);
  
  // Active feature grants view
  await knex.raw(`
    CREATE VIEW active_feature_grants AS
    SELECT 
      ofg.id AS grant_id,
      ofg.organization_id,
      o.name AS organization_name,
      f.id AS feature_id,
      f.feature_key,
      f.feature_name,
      f.product_id,
      p.name AS product_name,
      ofg.granted_via,
      ofg.is_active,
      ofg.expires_at,
      ofg.usage_limit,
      ofg.current_usage,
      CASE 
        WHEN ofg.usage_limit IS NOT NULL 
        THEN ofg.usage_limit - ofg.current_usage 
        ELSE NULL 
      END AS remaining_usage,
      ofg.granted_at,
      ofg.granted_by
    FROM organization_feature_grants ofg
    JOIN features f ON ofg.feature_id = f.id
    JOIN products p ON f.product_id = p.id
    JOIN organizations o ON ofg.organization_id = o.id
    WHERE ofg.is_active = TRUE
      AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
      AND (ofg.usage_limit IS NULL OR ofg.current_usage < ofg.usage_limit)
  `);
  
  await knex.raw(`COMMENT ON VIEW active_feature_grants IS 'All currently active and usable feature grants with remaining usage'`);
  
  // Feature usage summary materialized view
  await knex.raw(`
    CREATE MATERIALIZED VIEW feature_usage_summary AS
    SELECT 
      f.id AS feature_id,
      f.feature_key,
      f.feature_name,
      f.product_id,
      p.name AS product_name,
      COUNT(DISTINCT ofg.organization_id) AS organizations_using,
      COUNT(DISTINCT fue.user_id) AS unique_users,
      SUM(fue.usage_count) AS total_usage_last_30_days,
      MAX(fue.created_at) AS last_used_at
    FROM features f
    JOIN products p ON f.product_id = p.id
    LEFT JOIN organization_feature_grants ofg ON f.id = ofg.feature_id AND ofg.is_active = TRUE
    LEFT JOIN feature_usage_events fue ON f.id = fue.feature_id AND fue.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY f.id, f.feature_key, f.feature_name, f.product_id, p.name
  `);
  
  await knex.raw('CREATE UNIQUE INDEX idx_feature_usage_summary_feature ON feature_usage_summary(feature_id)');
  await knex.raw(`COMMENT ON MATERIALIZED VIEW feature_usage_summary IS 'Aggregated feature usage statistics (refresh periodically)'`);
  
  // ============================================================================
  // FUNCTIONS
  // ============================================================================
  
  // Helper function to get current organization from session variable
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id UUID;
    BEGIN
      org_id := current_setting('app.current_organization_id', true)::UUID;
      RETURN org_id;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
  `);
  
  await knex.raw(`COMMENT ON FUNCTION get_current_organization_id() IS 'Returns the current organization_id from session variable for RLS policies'`);
  
  // Function: Check if organization has feature access
  await knex.raw(`
    CREATE OR REPLACE FUNCTION has_feature_access(
      p_organization_id UUID,
      p_feature_key VARCHAR,
      p_product_id UUID DEFAULT NULL
    )
    RETURNS BOOLEAN AS $$
    DECLARE
      v_has_access BOOLEAN;
    BEGIN
      SELECT EXISTS(
        SELECT 1
        FROM organization_feature_grants ofg
        JOIN features f ON ofg.feature_id = f.id
        WHERE ofg.organization_id = p_organization_id
          AND f.feature_key = p_feature_key
          AND (p_product_id IS NULL OR f.product_id = p_product_id)
          AND ofg.is_active = TRUE
          AND (ofg.expires_at IS NULL OR ofg.expires_at > NOW())
          AND (ofg.usage_limit IS NULL OR ofg.current_usage < ofg.usage_limit)
      ) INTO v_has_access;
      
      RETURN v_has_access;
    END;
    $$ LANGUAGE plpgsql STABLE
  `);
  
  await knex.raw(`COMMENT ON FUNCTION has_feature_access IS 'Quick check if an organization has active access to a feature'`);
  
  // Function: Auto-expire feature grants
  await knex.raw(`
    CREATE OR REPLACE FUNCTION expire_feature_grants()
    RETURNS INTEGER AS $$
    DECLARE
      v_expired_count INTEGER;
    BEGIN
      WITH expired AS (
        UPDATE organization_feature_grants
        SET is_active = FALSE,
            revoked_at = NOW(),
            revoked_reason = 'Expired automatically'
        WHERE is_active = TRUE
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
        RETURNING id
      )
      SELECT COUNT(*) INTO v_expired_count FROM expired;
      
      RETURN v_expired_count;
    END;
    $$ LANGUAGE plpgsql
  `);
  
  await knex.raw(`COMMENT ON FUNCTION expire_feature_grants IS 'Deactivates expired feature grants (run via scheduled job)'`);
  
  // Function: Reset usage counters
  await knex.raw(`
    CREATE OR REPLACE FUNCTION reset_usage_counters()
    RETURNS INTEGER AS $$
    DECLARE
      v_reset_count INTEGER;
    BEGIN
      WITH reset AS (
        UPDATE organization_feature_grants
        SET current_usage = 0,
            usage_reset_at = NOW() + INTERVAL '1 month'
        WHERE usage_limit IS NOT NULL
          AND usage_reset_at <= NOW()
        RETURNING id
      )
      SELECT COUNT(*) INTO v_reset_count FROM reset;
      
      RETURN v_reset_count;
    END;
    $$ LANGUAGE plpgsql
  `);
  
  await knex.raw(`COMMENT ON FUNCTION reset_usage_counters IS 'Resets usage counters for features with monthly limits (run via scheduled job)'`);
  
  // ============================================================================
  // TRIGGERS
  // ============================================================================
  
  // Trigger: Audit feature grant changes
  await knex.raw(`
    CREATE OR REPLACE FUNCTION audit_feature_grant_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO feature_audit_log (
          entity_type,
          entity_id,
          action,
          organization_id,
          feature_id,
          new_values,
          performed_by,
          performed_by_type
        ) VALUES (
          'grant',
          NEW.id,
          'granted',
          NEW.organization_id,
          NEW.feature_id,
          to_jsonb(NEW),
          NEW.granted_by,
          'user'
        );
      ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.is_active != NEW.is_active OR 
            OLD.expires_at IS DISTINCT FROM NEW.expires_at OR
            OLD.usage_limit IS DISTINCT FROM NEW.usage_limit OR
            OLD.config IS DISTINCT FROM NEW.config) THEN
          
          INSERT INTO feature_audit_log (
            entity_type,
            entity_id,
            action,
            organization_id,
            feature_id,
            old_values,
            new_values,
            changes,
            performed_by,
            performed_by_type
          ) VALUES (
            'grant',
            NEW.id,
            CASE 
              WHEN OLD.is_active = TRUE AND NEW.is_active = FALSE THEN 'revoked'
              WHEN OLD.is_active = FALSE AND NEW.is_active = TRUE THEN 'granted'
              ELSE 'updated'
            END,
            NEW.organization_id,
            NEW.feature_id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            jsonb_build_object(
              'is_active_changed', OLD.is_active != NEW.is_active,
              'expires_at_changed', OLD.expires_at IS DISTINCT FROM NEW.expires_at,
              'usage_limit_changed', OLD.usage_limit IS DISTINCT FROM NEW.usage_limit
            ),
            NEW.updated_at,
            'user'
          );
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO feature_audit_log (
          entity_type,
          entity_id,
          action,
          organization_id,
          feature_id,
          old_values,
          performed_by_type
        ) VALUES (
          'grant',
          OLD.id,
          'deleted',
          OLD.organization_id,
          OLD.feature_id,
          to_jsonb(OLD),
          'system'
        );
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  
  await knex.raw(`
    CREATE TRIGGER trigger_audit_feature_grants
      AFTER INSERT OR UPDATE OR DELETE ON organization_feature_grants
      FOR EACH ROW EXECUTE FUNCTION audit_feature_grant_changes()
  `);
  
  await knex.raw(`COMMENT ON FUNCTION audit_feature_grant_changes IS 'Automatically logs all feature grant changes to audit trail'`);
  
  // ============================================================================
  // ROW LEVEL SECURITY (RLS) POLICIES
  // ============================================================================
  
  // RLS for email_settings
  await knex.raw('ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY email_settings_tenant_isolation ON email_settings
      USING (organization_id = get_current_organization_id())
  `);
  await knex.raw(`
    CREATE POLICY email_settings_tenant_isolation_insert ON email_settings
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ============================================================================
  // GRANT PERMISSIONS
  // ============================================================================
  await knex.raw('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres');
  await knex.raw('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres');
};

exports.down = async function(knex) {
  // Drop views first
  await knex.raw('DROP VIEW IF EXISTS active_feature_grants CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS feature_usage_summary CASCADE');
  await knex.raw('DROP VIEW IF EXISTS customer_usage_summary CASCADE');
  await knex.raw('DROP VIEW IF EXISTS expiring_licenses CASCADE');
  await knex.raw('DROP VIEW IF EXISTS active_licenses CASCADE');
  
  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS audit_feature_grant_changes CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS reset_usage_counters CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS expire_feature_grants CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS has_feature_access CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS get_current_organization_id CASCADE');
  
  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('license_audit_log');
  await knex.schema.dropTableIfExists('tier_migrations');
  await knex.schema.dropTableIfExists('usage_events');
  await knex.schema.dropTableIfExists('instances');
  await knex.schema.dropTableIfExists('licenses');
  await knex.schema.dropTableIfExists('tier_presets');
  await knex.schema.dropTableIfExists('customers');
  await knex.schema.dropTableIfExists('instance_deployments');
  await knex.schema.dropTableIfExists('platform_refresh_tokens');
  await knex.schema.dropTableIfExists('platform_users');
  await knex.schema.dropTableIfExists('feature_audit_log');
  await knex.raw('DROP TABLE IF EXISTS feature_usage_events CASCADE'); // Partitioned table
  await knex.schema.dropTableIfExists('organization_feature_grants');
  await knex.schema.dropTableIfExists('features');
  await knex.schema.dropTableIfExists('product_features');
  await knex.schema.dropTableIfExists('product_configs');
  await knex.schema.dropTableIfExists('product_permissions');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('email_settings');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
  
  // Drop FK from organizations before dropping vps_instances
  await knex.raw('ALTER TABLE organizations DROP CONSTRAINT IF EXISTS fk_organizations_vps');
  await knex.schema.dropTableIfExists('vps_instances');
  await knex.schema.dropTableIfExists('organizations');
  
  // Drop extension
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};
