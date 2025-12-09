/**
 * Fix shifts time comparison issue
 * 
 * The current schema uses separate DATE and TIME columns, but queries
 * try to compare TIME columns directly with NOW(). This migration adds
 * computed timestamp columns that combine date + time for proper comparisons.
 */

export async function up(knex) {
  // Add computed columns that combine shift_date + start_time/end_time
  await knex.schema.withSchema('scheduling').alterTable('shifts', (table) => {
    // Add computed timestamp columns
    table.timestamp('start_timestamp', { useTz: true });
    table.timestamp('end_timestamp', { useTz: true });
  });

  // Create a function to update the computed columns
  await knex.raw(`
    CREATE OR REPLACE FUNCTION scheduling.update_shift_timestamps()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Combine shift_date + start_time to create full timestamp
      NEW.start_timestamp = (NEW.shift_date + NEW.start_time) AT TIME ZONE 'UTC';
      NEW.end_timestamp = (NEW.shift_date + NEW.end_time) AT TIME ZONE 'UTC';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger to automatically update computed columns
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_shift_timestamps_trigger ON scheduling.shifts;
    CREATE TRIGGER update_shift_timestamps_trigger
      BEFORE INSERT OR UPDATE ON scheduling.shifts
      FOR EACH ROW
      EXECUTE FUNCTION scheduling.update_shift_timestamps();
  `);

  // Update existing records
  await knex.raw(`
    UPDATE scheduling.shifts 
    SET 
      start_timestamp = (shift_date + start_time) AT TIME ZONE 'UTC',
      end_timestamp = (shift_date + end_time) AT TIME ZONE 'UTC'
    WHERE start_timestamp IS NULL OR end_timestamp IS NULL;
  `);

  // Add indexes on the new timestamp columns
  await knex.schema.withSchema('scheduling').alterTable('shifts', (table) => {
    table.index('start_timestamp');
    table.index('end_timestamp');
    table.index(['organization_id', 'start_timestamp']);
  });

  console.log('✅ Added computed timestamp columns to shifts table');
  console.log('✅ Created trigger to automatically maintain timestamps');
  console.log('✅ Updated existing records with computed timestamps');
  console.log('✅ Added indexes for performance');
};

export async function down(knex) {
  // Drop the trigger and function
  await knex.raw(`DROP TRIGGER IF EXISTS update_shift_timestamps_trigger ON scheduling.shifts;`);
  await knex.raw(`DROP FUNCTION IF EXISTS scheduling.update_shift_timestamps();`);

  // Drop the computed columns
  await knex.schema.withSchema('scheduling').alterTable('shifts', (table) => {
    table.dropColumn('start_timestamp');
    table.dropColumn('end_timestamp');
  });

  console.log('✅ Removed computed timestamp columns and triggers');
};