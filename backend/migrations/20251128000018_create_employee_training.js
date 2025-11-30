/**
 * Migration: Create employee_training junction table
 * Tracks employee participation in training programs
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_training', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('training_program_id')
      .notNullable()
      .references('id')
      .inTable('hris.training_programs')
      .onDelete('CASCADE');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Training Tracking Information
    table.date('enrollment_date').notNullable();
    table.date('start_date');
    table.date('completion_date');
    table.date('due_date');
    table.string('status', 50).defaultTo('enrolled'); // 'enrolled', 'in_progress', 'completed', 'failed', 'cancelled'
    table.decimal('score', 5, 2);
    table.text('feedback');
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('training_program_id');
    table.index('organization_id');
    table.index('status');
    table.index('completion_date');
  });

  console.log('✓ Created hris.employee_training table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_training');
  console.log('✓ Dropped hris.employee_training table');
}
