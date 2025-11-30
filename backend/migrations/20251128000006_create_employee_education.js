/**
 * Migration: Create employee_education table
 * Stores education history for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_education', (table) => {
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

    // Education Information
    table.string('institution_name', 255).notNullable();
    table.string('degree_type', 100); // 'high_school', 'bachelor', 'master', 'phd'
    table.string('field_of_study', 255);
    table.date('start_date');
    table.date('end_date');
    table.boolean('is_current').defaultTo(false);
    table.string('grade_gpa', 50);
    table.text('description');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('degree_type');
  });

  console.log('✓ Created hris.employee_education table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_education');
  console.log('✓ Dropped hris.employee_education table');
}
