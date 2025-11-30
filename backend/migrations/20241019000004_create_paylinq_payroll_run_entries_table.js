/**
 * Migration: Create PayLinQ payroll_run_entries table
 * Date: 2024-10-19
 */

export function up(knex) {
  return knex.schema.createTable('payroll_run_entries', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('payroll_run_id').notNullable()
      .references('id').inTable('payroll_runs').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');

    // Payroll entry details
    table.decimal('base_salary', 10, 2).notNullable();
    table.decimal('total_allowances', 10, 2).notNullable().defaultTo(0);
    table.decimal('gross_pay', 10, 2).notNullable();
    table.decimal('total_deductions', 10, 2).notNullable().defaultTo(0);
    table.decimal('net_pay', 10, 2).notNullable();
    table.decimal('hours_worked', 8, 2);
    table.jsonb('allowances_breakdown'); // Array of allowances
    table.jsonb('deductions_breakdown'); // Array of deductions
    table.string('payment_status', 20).notNullable().defaultTo('pending'); // pending, paid, failed
    table.timestamp('payment_date', { useTz: true });
    table.text('notes');

    // Audit columns
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by').references('id').inTable('hris.user_account');

    // Indexes
    table.index('organization_id');
    table.index('payroll_run_id');
    table.index('employee_record_id');
    table.index(['organization_id', 'payroll_run_id']);
    table.index('payment_status');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('payroll_run_entries');
}
