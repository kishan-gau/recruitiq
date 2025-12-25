/**
 * Migration: Create shift templates and shift template roles
 * Description: Adds reusable shift templates (like "Morning 9-3") and their role requirements
 * Date: 2024-12-09
 */

export const up = async function(knex) {
  // Ensure scheduling schema exists
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');
  
  // Create shift_templates table
  await knex.schema.withSchema('scheduling').createTable('shift_templates', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
         .references('id').inTable('organizations').onDelete('CASCADE');
    
    // Template info
    table.string('template_name', 100).notNullable();
    table.text('description');
    
    // Time details
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.integer('duration_minutes').notNullable(); // Calculated field for easy querying
    
    // Break configuration
    table.integer('break_duration_minutes').defaultTo(0);
    table.boolean('break_paid').defaultTo(true);
    
    // Template type
    table.string('template_type', 20).defaultTo('regular');
    table.check("template_type IN ('regular', 'overtime', 'on_call', 'training')");
    
    // Configuration
    table.boolean('is_active').defaultTo(true);
    table.string('color_code', 7); // Hex color for UI display (e.g., #FF5733)
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    
    // Constraints
    table.unique(['organization_id', 'template_name']);
    table.check('end_time > start_time OR end_time < start_time'); // Allow overnight shifts
  });

  // Create indexes for shift_templates
  await knex.schema.raw('CREATE INDEX idx_shift_templates_organization ON scheduling.shift_templates(organization_id)');
  await knex.schema.raw('CREATE INDEX idx_shift_templates_active ON scheduling.shift_templates(is_active)');
  await knex.schema.raw('CREATE INDEX idx_shift_templates_time ON scheduling.shift_templates(start_time, end_time)');

  // Create shift_template_roles table
  await knex.schema.withSchema('scheduling').createTable('shift_template_roles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
         .references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('template_id').notNullable()
         .references('id').inTable('scheduling.shift_templates').onDelete('CASCADE');
    table.uuid('role_id').notNullable()
         .references('id').inTable('scheduling.roles').onDelete('CASCADE');
    
    // Requirements
    table.integer('required_count').defaultTo(1); // How many workers with this role are needed
    table.string('min_proficiency', 20);
    table.check("min_proficiency IN ('trainee', 'competent', 'proficient', 'expert')");
    
    // Priority for scheduling algorithms
    table.integer('priority').defaultTo(50); // 1-100, higher = more critical
    table.boolean('is_supervisor').defaultTo(false); // Is this a supervisory role for this shift
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['template_id', 'role_id']);
  });

  // Create indexes for shift_template_roles
  await knex.schema.raw('CREATE INDEX idx_shift_template_roles_template ON scheduling.shift_template_roles(template_id)');
  await knex.schema.raw('CREATE INDEX idx_shift_template_roles_role ON scheduling.shift_template_roles(role_id)');
};

export const down = async function(knex) {
  // Drop indexes first
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_template_roles_role');
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_template_roles_template');
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_templates_time');
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_templates_active');
  await knex.schema.raw('DROP INDEX IF EXISTS scheduling.idx_shift_templates_organization');

  // Drop tables in reverse order
  await knex.schema.withSchema('scheduling').dropTableIfExists('shift_template_roles');
  await knex.schema.withSchema('scheduling').dropTableIfExists('shift_templates');
};