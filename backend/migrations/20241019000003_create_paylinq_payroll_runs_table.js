/**
 * Migration: Create PayLinQ payroll_runs table
 * Date: 2024-10-19
 */

export function up(knex) {
  return knex.schema.createTable('payroll_runs', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');

    // Payroll run details
    table.string('run_name', 100).notNullable();
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('payment_date').notNullable();
    table.string('status', 20).notNullable().defaultTo('draft'); // draft, processing, completed, cancelled
    table.string('run_type', 50).notNullable(); // regular, bonus, correction
    table.integer('employee_count').notNullable().defaultTo(0);
    table.decimal('total_gross_pay', 15, 2).notNullable().defaultTo(0);
    table.decimal('total_deductions', 15, 2).notNullable().defaultTo(0);
    table.decimal('total_net_pay', 15, 2).notNullable().defaultTo(0);
    table.jsonb('metadata'); // Additional run details

    // Audit columns
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by').references('id').inTable('hris.user_account');

    // Indexes
    table.index('organization_id');
    table.index('status');
    table.index(['organization_id', 'status']);
    table.index('pay_period_start');
    table.index('payment_date');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('payroll_runs');
}
