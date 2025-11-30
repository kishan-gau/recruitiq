/**
 * Migration: Create PayLinQ deductions table
 * Date: 2024-10-19
 */

export function up(knex) {
  return knex.schema.createTable('deductions', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_record_id').notNullable()
      .references('id').inTable('employee_records').onDelete('CASCADE');

    // Deduction details
    table.string('deduction_type', 50).notNullable(); // tax, pension, loan, etc.
    table.decimal('deduction_amount', 10, 2).notNullable();
    table.string('frequency', 20).notNullable(); // monthly, annually, one-time
    table.boolean('is_pre_tax').notNullable().defaultTo(false);
    table.date('effective_date').notNullable();
    table.date('end_date');
    table.text('description');

    // Audit columns
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('deleted_by').references('id').inTable('hris.user_account');

    // Indexes
    table.index('organization_id');
    table.index('employee_record_id');
    table.index(['organization_id', 'employee_record_id']);
    table.index('deduction_type');
    table.index('effective_date');
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('deductions');
}
