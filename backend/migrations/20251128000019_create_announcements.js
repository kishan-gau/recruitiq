/**
 * Migration: Create announcements table
 * Stores company-wide or department-specific announcements
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('announcements', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('department_id')
      .references('id')
      .inTable('hris.departments')
      .onDelete('SET NULL');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Announcement Information
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.string('announcement_type', 100); // 'general', 'urgent', 'policy', 'event'
    table.string('priority', 50).defaultTo('normal'); // 'low', 'normal', 'high', 'urgent'
    table.date('publish_date').notNullable();
    table.date('expiry_date');
    table.boolean('is_published').defaultTo(false);
    table.boolean('is_pinned').defaultTo(false);
    table.string('target_audience', 100).defaultTo('all'); // 'all', 'department', 'specific'

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('organization_id');
    table.index('department_id');
    table.index('publish_date');
    table.index('is_published');
    table.index('priority');
  });

  console.log('✓ Created hris.announcements table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('announcements');
  console.log('✓ Dropped hris.announcements table');
}
