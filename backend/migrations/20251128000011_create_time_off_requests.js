/**
 * Migration: Create time_off_requests table
 * Stores time off requests from employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('time_off_requests', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('approved_by')
      .references('id')
      .inTable('hris.employees')
      .onDelete('SET NULL');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Request Information
    table.string('request_type', 100).notNullable(); // 'vacation', 'sick', 'personal', 'unpaid'
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('days_requested', 5, 2).notNullable();
    table.text('reason');
    table.string('status', 50).defaultTo('pending'); // 'pending', 'approved', 'rejected', 'cancelled'
    table.text('approval_notes');
    table.timestamp('approved_at', { useTz: true });

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('approved_by');
    table.index('organization_id');
    table.index('status');
    table.index('start_date');
    table.index('request_type');
  });

  console.log('✓ Created hris.time_off_requests table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_requests');
  console.log('✓ Dropped hris.time_off_requests table');
}
