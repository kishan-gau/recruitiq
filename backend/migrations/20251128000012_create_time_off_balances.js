/**
 * Migration: Create time_off_balances table
 * Tracks time off balances for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('time_off_balances', (table) => {
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

    // Balance Information
    table.string('leave_type', 100).notNullable(); // 'vacation', 'sick', 'personal'
    table.integer('year').notNullable();
    table.decimal('total_allocated', 5, 2).notNullable().defaultTo(0);
    table.decimal('used', 5, 2).notNullable().defaultTo(0);
    table.decimal('pending', 5, 2).notNullable().defaultTo(0);
    table.decimal('remaining', 5, 2).notNullable().defaultTo(0);
    table.decimal('carried_over', 5, 2).defaultTo(0);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Unique Constraint
    table.unique(['employee_id', 'leave_type', 'year'], { indexName: 'uk_time_off_balances' });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('year');
    table.index('leave_type');
  });

  console.log('✓ Created hris.time_off_balances table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_balances');
  console.log('✓ Dropped hris.time_off_balances table');
}
