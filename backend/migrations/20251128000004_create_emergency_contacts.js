/**
 * Migration: Create emergency_contacts table
 * Stores emergency contact information for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('emergency_contacts', (table) => {
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

    // Contact Information
    table.string('name', 255).notNullable();
    table.string('relationship', 100); // 'spouse', 'parent', 'sibling', 'friend'
    table.string('phone_primary', 50).notNullable();
    table.string('phone_secondary', 50);
    table.string('email', 255);
    table.text('address');
    table.boolean('is_primary').defaultTo(false);
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('is_primary');
  });

  console.log('✓ Created hris.emergency_contacts table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('emergency_contacts');
  console.log('✓ Dropped hris.emergency_contacts table');
}
