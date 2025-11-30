/**
 * Migration: Create attendance_records table
 * Tracks daily attendance for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('attendance_records', (table) => {
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

    // Attendance Information
    table.date('attendance_date').notNullable();
    table.time('check_in_time');
    table.time('check_out_time');
    table.string('status', 50).notNullable(); // 'present', 'absent', 'late', 'half_day', 'on_leave'
    table.decimal('hours_worked', 5, 2);
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Unique Constraint
    table.unique(['employee_id', 'attendance_date'], { indexName: 'uk_attendance_records' });

    // Indexes
    table.index('employee_id');
    table.index('organization_id');
    table.index('attendance_date');
    table.index('status');
  });

  console.log('✓ Created hris.attendance_records table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('attendance_records');
  console.log('✓ Dropped hris.attendance_records table');
}
