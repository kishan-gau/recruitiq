/**
 * Migration: Create push notification subscription tables
 * Date: 2026-01-01
 * 
 * This migration creates tables to support web push notifications for employees:
 * - push_notification_subscription: Store push subscriptions per employee
 * - push_notification_preference: Store notification preferences per employee
 * - push_notification_log: Track sent notifications for auditing
 */

export async function up(knex) {
  // Create push_notification_subscription table
  await knex.schema.withSchema('hris').createTable('push_notification_subscription', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Push subscription data (JSON format from browser)
    table.text('endpoint').notNullable();
    table.text('p256dh_key').notNullable(); // Public key
    table.text('auth_key').notNullable();   // Auth secret
    
    // Device/Browser info
    table.string('device_type', 50); // 'mobile', 'desktop', 'tablet'
    table.string('browser', 100);
    table.string('user_agent', 500);
    
    // Subscription status
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used_at', { useTz: true });
    
    // Audit columns
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Indexes
    table.index(['organization_id', 'employee_id']);
    table.index('endpoint');
    table.index('is_active');
  });

  // Create push_notification_preference table
  await knex.schema.withSchema('hris').createTable('push_notification_preference', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Notification type preferences
    table.boolean('schedule_reminders').defaultTo(true);
    table.boolean('payroll_updates').defaultTo(true);
    table.boolean('hr_announcements').defaultTo(true);
    table.boolean('action_required').defaultTo(true);
    table.boolean('shift_trades').defaultTo(true);
    table.boolean('time_off_updates').defaultTo(true);
    
    // Global settings
    table.boolean('enabled').defaultTo(true);
    table.boolean('quiet_hours_enabled').defaultTo(false);
    table.time('quiet_hours_start');
    table.time('quiet_hours_end');
    
    // Audit columns
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Unique constraint - one preference record per employee
    table.unique(['organization_id', 'employee_id']);
  });

  // Create push_notification_log table
  await knex.schema.withSchema('hris').createTable('push_notification_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('subscription_id');
    
    // Notification details
    table.string('notification_type', 50).notNullable(); // 'schedule_reminder', 'payroll_update', etc.
    table.string('title', 200).notNullable();
    table.text('body').notNullable();
    table.string('icon', 500);
    table.string('click_url', 500);
    table.jsonb('data'); // Additional custom data
    
    // Delivery status
    table.string('status', 20).notNullable(); // 'sent', 'failed', 'clicked'
    table.text('error_message');
    table.timestamp('sent_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('clicked_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('subscription_id').references('id').inTable('hris.push_notification_subscription').onDelete('SET NULL');
    
    // Indexes
    table.index(['organization_id', 'employee_id']);
    table.index('notification_type');
    table.index('status');
    table.index('sent_at');
  });

  // Add comments
  await knex.raw(`
    COMMENT ON TABLE hris.push_notification_subscription IS 'Web push notification subscriptions for employees';
    COMMENT ON TABLE hris.push_notification_preference IS 'Employee notification preferences and settings';
    COMMENT ON TABLE hris.push_notification_log IS 'Audit log of sent push notifications';
    
    COMMENT ON COLUMN hris.push_notification_subscription.endpoint IS 'Push service endpoint URL';
    COMMENT ON COLUMN hris.push_notification_subscription.p256dh_key IS 'P256DH public key for encryption';
    COMMENT ON COLUMN hris.push_notification_subscription.auth_key IS 'Auth secret for encryption';
    COMMENT ON COLUMN hris.push_notification_log.status IS 'Delivery status: sent, failed, clicked';
  `);
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('push_notification_log');
  await knex.schema.withSchema('hris').dropTableIfExists('push_notification_preference');
  await knex.schema.withSchema('hris').dropTableIfExists('push_notification_subscription');
}
