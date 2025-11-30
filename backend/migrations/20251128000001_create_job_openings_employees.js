/**
 * Migration: Create job_openings_employees junction table
 * Links job openings to employees (referrals or internal candidates)
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('job_openings_employees', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('job_opening_id')
      .notNullable()
      .references('id')
      .inTable('hris.job_openings')
      .onDelete('CASCADE');

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

    // Relationship Type
    table.string('relationship_type', 50).notNullable(); // 'referral', 'internal_candidate'
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('job_opening_id');
    table.index('employee_id');
    table.index('organization_id');
    table.index(['job_opening_id', 'employee_id'], 'idx_job_openings_employees_unique');
  });

  console.log('✓ Created hris.job_openings_employees table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('job_openings_employees');
  console.log('✓ Dropped hris.job_openings_employees table');
}
