/**
 * Migration: Create employee_dependents table
 * Stores dependent information for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_dependents', (table) => {
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

    // Dependent Information
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('relationship', 50).notNullable(); // 'child', 'spouse', 'parent'
    table.date('date_of_birth');
    table.string('gender', 20);
    table.string('ssn', 50); // Social Security Number or equivalent
    table.boolean('is_student').defaultTo(false);
    table.boolean('is_disabled').defaultTo(false);
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
    table.index('relationship');
  });

  console.log('✓ Created hris.employee_dependents table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_dependents');
  console.log('✓ Dropped hris.employee_dependents table');
}
