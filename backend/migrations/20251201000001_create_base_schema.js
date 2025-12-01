/**
 * Migration: Create Base Schema (Organizations, RBAC, Email Settings)
 * Source: schema.sql
 * Created: 2025-12-01
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
    table.string('slug', 100).notNullable().unique();
    table.string('email', 255);
    table.string('phone', 50);
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('postal_code', 20);
    table.string('country', 100);
    table.string('website', 500);
    table.text('logo_url');
    table.text('description');
    
    // License & Tier
    table.string('tier', 50).notNullable().defaultTo('free');
    table.integer('max_users').defaultTo(5);
    table.integer('max_products').defaultTo(1);
    table.integer('max_licenses').defaultTo(1);
    
    // Deployment Model
    table.string('deployment_model', 50).notNullable().defaultTo('shared');
    
    // Session Management
    table.string('session_policy', 20).notNullable().defaultTo('multiple');
    table.integer('max_sessions_per_user').defaultTo(5);
    table.boolean('concurrent_login_detection').defaultTo(false);
    
    // Security
    table.boolean('mfa_required').defaultTo(false);
    table.timestamp('mfa_enforcement_date');
    
    // Feature Access
    table.specificType('enabled_features', 'text[]');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at');
  });
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_organizations_slug ON organizations(slug)');
  await knex.raw('CREATE INDEX idx_organizations_tier ON organizations(tier)');
  await knex.raw('CREATE INDEX idx_organizations_deployment ON organizations(deployment_model)');
  
  // ============================================================================
  // PERMISSIONS TABLE
  // ============================================================================
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    
    table.unique(['product', 'name'], { indexName: 'unique_product_permission' });
  });
  
  await knex.raw('CREATE INDEX idx_permissions_product ON permissions(product)');
  await knex.raw('CREATE INDEX idx_permissions_name ON permissions(name)');
  await knex.raw('CREATE INDEX idx_permissions_category ON permissions(category)');
  
  // ============================================================================
  // ROLES TABLE
  // ============================================================================
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('role_type', 20).notNullable().defaultTo('custom');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at');
    
    table.unique(['organization_id', 'name'], { indexName: 'unique_org_role' });
  });
  
  await knex.raw('CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_type ON roles(role_type) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_active ON roles(is_active) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_roles_name ON roles(name) WHERE deleted_at IS NULL');
  
  // ============================================================================
  // ROLE_PERMISSIONS TABLE
  // ============================================================================
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at');
    
    table.unique(['role_id', 'permission_id'], { indexName: 'unique_role_permission' });
  });
  
  await knex.raw('CREATE INDEX idx_role_permissions_role ON role_permissions(role_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id) WHERE deleted_at IS NULL');
  
  // ============================================================================
  // USER_ROLES TABLE
  // ============================================================================
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('deleted_at');
    
    table.unique(['user_id', 'role_id'], { indexName: 'unique_user_role' });
  });
  
  await knex.raw('CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE deleted_at IS NULL');
  
  // ============================================================================
  // EMAIL_SETTINGS TABLE
  // ============================================================================
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // SMTP Configuration
    table.string('smtp_host', 255);
    table.integer('smtp_port');
    table.boolean('smtp_secure').defaultTo(true);
    table.string('smtp_username', 255);
    table.text('smtp_password_encrypted');
    
    // Email Defaults
    table.string('from_email', 255);
    table.string('from_name', 255);
    table.string('reply_to_email', 255);
    
    // Email Verification
    table.boolean('email_verification_required').defaultTo(true);
    
    // Template Settings
    table.text('email_signature');
    table.text('footer_text');
    table.string('logo_url', 500);
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at');
    
    table.unique(['organization_id'], { indexName: 'unique_organization_email_settings' });
  });
  
  await knex.raw('CREATE INDEX idx_email_settings_organization ON email_settings(organization_id)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('email_settings');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('organizations');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};
