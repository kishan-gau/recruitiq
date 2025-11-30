/**
 * Migration: Create performance_reviews table
 * Stores performance review records for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('performance_reviews', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('reviewer_id')
      .references('id')
      .inTable('hris.employees')
      .onDelete('SET NULL');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Review Information
    table.string('review_type', 100); // 'annual', 'quarterly', 'probation', 'project'
    table.date('review_date').notNullable();
    table.date('review_period_start');
    table.date('review_period_end');
    table.decimal('overall_rating', 3, 2); // e.g., 4.5 out of 5
    table.text('strengths');
    table.text('areas_for_improvement');
    table.text('goals_achieved');
    table.text('goals_for_next_period');
    table.text('reviewer_comments');
    table.text('employee_comments');
    table.string('status', 50).defaultTo('draft'); // 'draft', 'submitted', 'acknowledged'

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('reviewer_id');
    table.index('organization_id');
    table.index('review_date');
    table.index('status');
  });

  console.log('✓ Created hris.performance_reviews table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('performance_reviews');
  console.log('✓ Dropped hris.performance_reviews table');
}
