/**
 * Migration: Create training_programs table
 * Stores available training programs
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('training_programs', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Training Program Information
    table.string('program_name', 255).notNullable();
    table.text('description');
    table.string('training_type', 100); // 'onboarding', 'technical', 'soft_skills', 'compliance'
    table.string('delivery_method', 100); // 'in_person', 'online', 'hybrid'
    table.integer('duration_hours');
    table.decimal('cost', 12, 2);
    table.string('provider', 255);
    table.boolean('is_mandatory').defaultTo(false);
    table.boolean('is_active').defaultTo(true);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('organization_id');
    table.index('training_type');
    table.index('is_active');
  });

  console.log('✓ Created hris.training_programs table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('training_programs');
  console.log('✓ Dropped hris.training_programs table');
}
