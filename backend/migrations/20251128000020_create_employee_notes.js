/**
 * Migration: Create employee_notes table
 * Stores notes and comments about employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_notes', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Note Information
    table.string('note_type', 100); // 'general', 'performance', 'disciplinary', 'achievement'
    table.string('title', 255);
    table.text('content').notNullable();
    table.boolean('is_confidential').defaultTo(false);
    table.string('visibility', 50).defaultTo('private'); // 'private', 'managers', 'hr'

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('note_type');
    table.index('created_by');
  });

  console.log('✓ Created hris.employee_notes table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_notes');
  console.log('✓ Dropped hris.employee_notes table');
}
