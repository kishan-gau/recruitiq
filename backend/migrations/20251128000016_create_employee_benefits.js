/**
 * Migration: Create employee_benefits junction table
 * Links employees to their enrolled benefits
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_benefits', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('benefit_id')
      .notNullable()
      .references('id')
      .inTable('hris.benefits')
      .onDelete('CASCADE');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Enrollment Information
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('end_date');
    table.string('status', 50).defaultTo('active'); // 'active', 'inactive', 'pending'
    table.decimal('employee_contribution', 12, 2);
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('benefit_id');
    table.index('organization_id');
    table.index('status');
    table.index('effective_date');
  });

  console.log('✓ Created hris.employee_benefits table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_benefits');
  console.log('✓ Dropped hris.employee_benefits table');
}
