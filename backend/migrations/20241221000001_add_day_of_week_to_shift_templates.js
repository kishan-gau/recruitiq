/**
 * Migration: Add day_of_week column to shift_templates table
 * 
 * Description: Adds the missing day_of_week column to enable day-specific
 * template filtering in ScheduleHub scheduling operations.
 * 
 * Author: Copilot
 * Date: 2024-12-21
 * 
 * Related Issue: Template-based scheduling queries fail with 
 * "column st.day_of_week does not exist" error
 */

export async function up(knex) {
  // Check if the column already exists to prevent duplicate column errors
  const hasColumn = await knex.schema.hasColumn('scheduling.shift_templates', 'day_of_week');
  
  if (!hasColumn) {
    await knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
      // Add day_of_week column
      // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (ISO standard)
      table.integer('day_of_week')
        .notNullable()
        .defaultTo(1) // Default to Monday for existing templates
        .comment('Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday');
    });

    // Add check constraint separately using raw SQL for better control
    await knex.raw(`
      ALTER TABLE scheduling.shift_templates 
      ADD CONSTRAINT chk_shift_templates_day_of_week 
      CHECK (day_of_week >= 0 AND day_of_week <= 6)
    `);

    // Create index for better query performance on day-specific lookups
    await knex.schema.withSchema('scheduling').table('shift_templates', function(table) {
      table.index(['day_of_week'], 'idx_shift_templates_day_of_week');
    });

    // Create composite index for organization + day lookups
    await knex.schema.withSchema('scheduling').table('shift_templates', function(table) {
      table.index(['organization_id', 'day_of_week'], 'idx_shift_templates_org_day');
    });

    console.log('✅ Successfully added day_of_week column to shift_templates table');
    console.log('✅ Added performance indexes for day-specific queries');
  } else {
    console.log('ℹ️  day_of_week column already exists in shift_templates table');
  }
};

export async function down(knex) {
  // Check if the column exists before attempting to drop it
  const hasColumn = await knex.schema.hasColumn('scheduling.shift_templates', 'day_of_week');
  
  if (hasColumn) {
    // Drop indexes first
    await knex.schema.withSchema('scheduling').table('shift_templates', function(table) {
      table.dropIndex(['day_of_week'], 'idx_shift_templates_day_of_week');
      table.dropIndex(['organization_id', 'day_of_week'], 'idx_shift_templates_org_day');
    });

    // Drop the check constraint
    await knex.raw(`
      ALTER TABLE scheduling.shift_templates 
      DROP CONSTRAINT IF EXISTS chk_shift_templates_day_of_week
    `);

    // Drop the column
    await knex.schema.withSchema('scheduling').alterTable('shift_templates', function(table) {
      table.dropColumn('day_of_week');
    });

    console.log('✅ Successfully removed day_of_week column from shift_templates table');
    console.log('✅ Dropped associated indexes');
  } else {
    console.log('ℹ️  day_of_week column does not exist in shift_templates table');
  }
};

export const config = {
  transaction: true
};