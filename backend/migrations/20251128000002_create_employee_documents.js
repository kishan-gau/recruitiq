/**
 * Migration: Create employee_documents table
 * Stores documents associated with employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_documents', (table) => {
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

    // Document Information
    table.string('document_type', 100).notNullable(); // 'contract', 'id', 'visa', 'certificate'
    table.string('document_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('file_type', 100);
    table.integer('file_size');
    table.text('description');
    table.date('issue_date');
    table.date('expiry_date');
    table.boolean('is_confidential').defaultTo(false);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('document_type');
    table.index('expiry_date');
  });

  console.log('✓ Created hris.employee_documents table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_documents');
  console.log('✓ Dropped hris.employee_documents table');
}
