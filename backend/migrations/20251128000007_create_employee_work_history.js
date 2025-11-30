/**
 * Migration: Create employee_work_history table
 * Stores previous work experience for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_work_history', (table) => {
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

    // Work History Information
    table.string('company_name', 255).notNullable();
    table.string('job_title', 255).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date');
    table.boolean('is_current').defaultTo(false);
    table.text('responsibilities');
    table.text('achievements');
    table.string('reason_for_leaving', 255);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('start_date');
  });

  console.log('✓ Created hris.employee_work_history table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_work_history');
  console.log('✓ Dropped hris.employee_work_history table');
}
