/**
 * Migration: Create VPS Management Tables
 * 
 * Creates VPS and deployment management tables:
 * - vps_instances (VPS server instances)
 * - instance_deployments (deployment tracking)
 * - customers (customer management)
 * - tier_presets (subscription tiers)
 * - licenses (organization licenses)
 * - instances (organization instances)
 * - usage_events (usage tracking)
 * - tier_migrations (tier change history)
 * - license_audit_log (license audit trail)
 */

export async function up(knex) {
  // ================================================================
  // VPS INSTANCES
  // ================================================================
  await knex.schema.createTable('vps_instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('instance_name', 255).notNullable().unique();
    table.string('provider', 50).notNullable(); // transip, aws, digitalocean, etc.
    table.string('instance_id', 255).notNullable(); // Provider's instance ID
    table.string('ip_address', 45).nullable();
    table.string('hostname', 255).nullable();
    table.string('region', 100).notNullable();
    table.string('size', 100).notNullable();
    table.integer('cpu_cores').notNullable();
    table.integer('memory_mb').notNullable();
    table.integer('disk_gb').notNullable();
    table.string('status', 50).notNullable().defaultTo('provisioning'); // provisioning, active, stopped, terminated
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('provider');
    table.index('status');
    table.index('region');
  });

  // ================================================================
  // INSTANCE DEPLOYMENTS
  // ================================================================
  await knex.schema.createTable('instance_deployments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('vps_instance_id').notNullable().references('id').inTable('vps_instances').onDelete('CASCADE');
    table.uuid('organization_id').nullable().references('id').inTable('organizations').onDelete('SET NULL');
    table.string('deployment_type', 50).notNullable(); // initial, update, rollback
    table.string('version', 50).notNullable();
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, in_progress, completed, failed
    table.text('deployment_log').nullable();
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
    table.uuid('triggered_by').nullable().references('id').inTable('platform_users').onDelete('SET NULL');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('vps_instance_id');
    table.index('organization_id');
    table.index('status');
    table.index('created_at');
  });

  // ================================================================
  // CUSTOMERS
  // ================================================================
  await knex.schema.createTable('customers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('company_name', 255).notNullable();
    table.string('contact_name', 255).notNullable();
    table.string('contact_email', 255).notNullable().unique();
    table.string('contact_phone', 50).nullable();
    table.text('address').nullable();
    table.string('country', 100).nullable();
    table.string('tax_id', 100).nullable();
    table.string('status', 50).notNullable().defaultTo('active'); // active, suspended, cancelled
    table.jsonb('billing_info').defaultTo('{}');
    table.text('notes').nullable();
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('contact_email');
    table.index('status');
  });

  // ================================================================
  // TIER PRESETS
  // ================================================================
  await knex.schema.createTable('tier_presets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('tier_code', 50).notNullable().unique();
    table.string('tier_name', 100).notNullable();
    table.text('description').nullable();
    table.integer('max_users').nullable(); // null = unlimited
    table.integer('max_storage_gb').nullable();
    table.jsonb('features').defaultTo('[]');
    table.decimal('monthly_price', 10, 2).notNullable();
    table.string('currency', 10).defaultTo('USD');
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('tier_code');
    table.index('is_active');
  });

  // ================================================================
  // LICENSES
  // ================================================================
  await knex.schema.createTable('licenses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('customer_id').nullable().references('id').inTable('customers').onDelete('SET NULL');
    table.uuid('tier_preset_id').nullable().references('id').inTable('tier_presets').onDelete('SET NULL');
    table.string('license_key', 255).notNullable().unique();
    table.string('status', 50).notNullable().defaultTo('active'); // active, suspended, expired, cancelled
    table.timestamp('valid_from', { useTz: true }).notNullable();
    table.timestamp('valid_until', { useTz: true }).nullable(); // null = perpetual
    table.integer('max_users').nullable();
    table.integer('max_storage_gb').nullable();
    table.jsonb('features').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('organization_id');
    table.index('customer_id');
    table.index('license_key');
    table.index('status');
    table.index('valid_until');
  });

  // ================================================================
  // INSTANCES
  // ================================================================
  await knex.schema.createTable('instances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('vps_instance_id').nullable().references('id').inTable('vps_instances').onDelete('SET NULL');
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.string('instance_name', 255).notNullable();
    table.string('subdomain', 255).notNullable().unique();
    table.string('custom_domain', 255).nullable();
    table.string('status', 50).notNullable().defaultTo('active'); // active, suspended, terminated
    table.jsonb('config').defaultTo('{}');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('organization_id');
    table.index('vps_instance_id');
    table.index('license_id');
    table.index('subdomain');
    table.index('status');
  });

  // ================================================================
  // USAGE EVENTS
  // ================================================================
  await knex.schema.createTable('usage_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('instance_id').nullable().references('id').inTable('instances').onDelete('SET NULL');
    table.string('event_type', 100).notNullable(); // user_login, api_call, storage_usage, etc.
    table.integer('quantity').defaultTo(1);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('event_date', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('organization_id');
    table.index('instance_id');
    table.index('event_type');
    table.index('event_date');
  });

  // ================================================================
  // TIER MIGRATIONS
  // ================================================================
  await knex.schema.createTable('tier_migrations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.uuid('from_tier_id').nullable().references('id').inTable('tier_presets').onDelete('SET NULL');
    table.uuid('to_tier_id').notNullable().references('id').inTable('tier_presets').onDelete('CASCADE');
    table.string('reason', 255).nullable();
    table.timestamp('migrated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('migrated_by').nullable().references('id').inTable('platform_users').onDelete('SET NULL');
    
    table.index('organization_id');
    table.index('license_id');
    table.index('migrated_at');
  });

  // ================================================================
  // LICENSE AUDIT LOG
  // ================================================================
  await knex.schema.createTable('license_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('license_id').notNullable().references('id').inTable('licenses').onDelete('CASCADE');
    table.string('action', 100).notNullable(); // created, updated, suspended, reactivated, expired
    table.jsonb('old_value').nullable();
    table.jsonb('new_value').nullable();
    table.text('reason').nullable();
    table.uuid('performed_by').nullable().references('id').inTable('platform_users').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('license_id');
    table.index('action');
    table.index('created_at');
  });
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
}
