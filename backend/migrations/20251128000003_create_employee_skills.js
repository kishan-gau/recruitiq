/**
 * Migration: Create employee_skills junction table
 * Links employees to their skills with proficiency levels
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('employee_skills', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign Keys
    table.uuid('employee_id')
      .notNullable()
      .references('id')
      .inTable('hris.employees')
      .onDelete('CASCADE');

    table.uuid('skill_id')
      .notNullable()
      .references('id')
      .inTable('hris.skills')
      .onDelete('CASCADE');

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Skill Details
    table.string('proficiency_level', 50); // 'beginner', 'intermediate', 'advanced', 'expert'
    table.integer('years_of_experience');
    table.date('last_used_date');
    table.text('notes');

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Unique Constraint
    table.unique(['employee_id', 'skill_id'], { indexName: 'uk_employee_skills' });

    // Indexes
    table.index('employee_id');
    table.index('skill_id');
    table.index('organization_id');
    table.index('proficiency_level');
  });

  console.log('✓ Created hris.employee_skills table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_skills');
  console.log('✓ Dropped hris.employee_skills table');
}
