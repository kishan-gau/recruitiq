/**
 * Migration: Create payroll_records table
 * Stores payroll information for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('payroll_records', (table) => {
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

    // Payroll Information
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('pay_date').notNullable();
    table.decimal('gross_pay', 12, 2).notNullable();
    table.decimal('net_pay', 12, 2).notNullable();
    table.decimal('deductions', 12, 2).defaultTo(0);
    table.decimal('taxes', 12, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_pay', 12, 2).defaultTo(0);
    table.decimal('bonuses', 12, 2).defaultTo(0);
    table.string('status', 50).defaultTo('pending'); // 'pending', 'processed', 'paid'
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
    table.index('pay_date');
    table.index('status');
    table.index(['pay_period_start', 'pay_period_end']);
  });

  console.log('✓ Created hris.payroll_records table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('payroll_records');
  console.log('✓ Dropped hris.payroll_records table');
}
