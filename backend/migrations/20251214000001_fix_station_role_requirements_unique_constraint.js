/**
 * Migration: Fix station_role_requirements unique constraint for soft deletes
 * Purpose: Replace the hard unique constraint with a partial unique index that
 *          only applies to non-deleted records. This allows re-adding requirements
 *          after they've been soft-deleted.
 * Date: December 14, 2025
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  console.log('Fixing station_role_requirements unique constraint for soft deletes...');

  // Check if the old constraint exists
  const constraintCheck = await knex.raw(`
    SELECT constraint_name 
    FROM information_schema.constraint_column_usage 
    WHERE table_schema = 'scheduling' 
    AND table_name = 'station_role_requirements' 
    AND constraint_name = 'station_role_requirements_station_id_role_id_unique'
  `);

  if (constraintCheck.rows.length > 0) {
    // Drop the old hard unique constraint
    await knex.raw(`
      ALTER TABLE scheduling.station_role_requirements 
      DROP CONSTRAINT station_role_requirements_station_id_role_id_unique
    `);
    console.log('  ✅ Dropped old hard unique constraint');
  } else {
    console.log('  ⏭️  Hard unique constraint does not exist');
  }

  // Check if the partial index already exists
  const indexCheck = await knex.raw(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'scheduling' 
    AND indexname = 'idx_station_role_requirements_unique_active'
  `);

  if (indexCheck.rows.length === 0) {
    // Create a partial unique index that only applies to non-deleted records
    await knex.raw(`
      CREATE UNIQUE INDEX idx_station_role_requirements_unique_active 
      ON scheduling.station_role_requirements (station_id, role_id) 
      WHERE deleted_at IS NULL
    `);
    console.log('  ✅ Created partial unique index for non-deleted records');
  } else {
    console.log('  ⏭️  Partial unique index already exists');
  }

  console.log('✅ Migration completed: station_role_requirements unique constraint fixed');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  console.log('Reverting station_role_requirements unique constraint fix...');

  // Drop the partial index
  const indexCheck = await knex.raw(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'scheduling' 
    AND indexname = 'idx_station_role_requirements_unique_active'
  `);

  if (indexCheck.rows.length > 0) {
    await knex.raw(`
      DROP INDEX IF EXISTS scheduling.idx_station_role_requirements_unique_active
    `);
    console.log('  ✅ Dropped partial unique index');
  }

  // Recreate the old hard unique constraint
  await knex.raw(`
    ALTER TABLE scheduling.station_role_requirements 
    ADD CONSTRAINT station_role_requirements_station_id_role_id_unique 
    UNIQUE (station_id, role_id)
  `);
  console.log('  ✅ Recreated hard unique constraint');

  console.log('✅ Migration reverted successfully');
}
