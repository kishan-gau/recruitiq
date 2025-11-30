/**
 * Migration: Create benefits table
 * Stores available benefit programs
 */

export async function up(knex) {
  await knex.schema.withSchema('hris').createTable('benefits', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Tenant Isolation
    table.uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    // Benefit Information
    table.string('benefit_name', 255).notNullable();
    table.string('benefit_type', 100).notNullable(); // 'health', 'dental', 'vision', '401k', 'life_insurance'
    table.text('description');
    table.string('provider', 255);
    table.decimal('employer_cost', 12, 2);
    table.decimal('employee_cost', 12, 2);
    table.boolean('is_active').defaultTo(true);

    // Audit Fields
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.timestamp('deleted_at', { useTz: true });

    // Indexes
    table.index('organization_id');
    table.index('benefit_type');
    table.index('is_active');
  });

  console.log('✓ Created hris.benefits table');
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('benefits');
  console.log('✓ Dropped hris.benefits table');
}
