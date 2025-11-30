/**
 * Migration: Create performance_goals table
 * Stores individual performance goals for employees
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('performance_goals', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('review_id')
      .references('id')
      .inTable('hris.performance_reviews')
      .onDelete('SET NULL');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Goal Information
    table.string('goal_title', 255).notNullable();
    table.text('goal_description').notNullable();
    table.string('category', 100); // 'development', 'performance', 'behavior'
    table.date('target_date');
    table.string('status', 50).defaultTo('in_progress'); // 'not_started', 'in_progress', 'completed', 'cancelled'
    table.integer('progress_percentage').defaultTo(0);
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('employee_id');
    table.index('review_id');
    table.index('organization_id');
    table.index('status');
    table.index('target_date');
  });

  console.log('✓ Created hris.performance_goals table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('performance_goals');
  console.log('✓ Dropped hris.performance_goals table');
}
