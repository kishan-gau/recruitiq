/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.raw(`
    -- Add display_order to locations
    ALTER TABLE nexus.locations 
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_locations_display_order 
    ON nexus.locations(display_order) WHERE deleted_at IS NULL;

    -- Add display_order to departments
    ALTER TABLE nexus.departments 
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_departments_display_order 
    ON nexus.departments(display_order) WHERE deleted_at IS NULL;

    -- Add display_order to job_titles
    ALTER TABLE nexus.job_titles 
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_job_titles_display_order 
    ON nexus.job_titles(display_order) WHERE deleted_at IS NULL;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.raw(`
    -- Remove indexes
    DROP INDEX IF EXISTS nexus.idx_job_titles_display_order;
    DROP INDEX IF EXISTS nexus.idx_departments_display_order;
    DROP INDEX IF EXISTS nexus.idx_locations_display_order;

    -- Remove columns
    ALTER TABLE nexus.job_titles DROP COLUMN IF EXISTS display_order;
    ALTER TABLE nexus.departments DROP COLUMN IF EXISTS display_order;
    ALTER TABLE nexus.locations DROP COLUMN IF EXISTS display_order;
  `);
}
