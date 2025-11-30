/**
 * Migration: Create employee_certifications table
 * Stores professional certifications for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_certifications', (table) => {
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

    // Certification Information
    table.string('certification_name', 255).notNullable();
    table.string('issuing_organization', 255).notNullable();
    table.date('issue_date');
    table.date('expiry_date');
    table.string('credential_id', 255);
    table.string('credential_url', 500);
    table.text('description');
    table.boolean('does_not_expire').defaultTo(false);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('expiry_date');
  });

  console.log('✓ Created hris.employee_certifications table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_certifications');
  console.log('✓ Dropped hris.employee_certifications table');
}
