/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.raw(`
    -- Create function to check for overlapping shifts
    CREATE OR REPLACE FUNCTION check_shift_overlap()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Check if there's any overlapping shift for the same employee
      IF EXISTS (
        SELECT 1 
        FROM scheduling.shifts 
        WHERE employee_id = NEW.employee_id
          AND organization_id = NEW.organization_id
          AND shift_date = NEW.shift_date
          AND status NOT IN ('cancelled', 'no_show')
          AND (NEW.id IS NULL OR id != NEW.id)  -- Exclude current record for updates
          AND (
            -- Time overlap conditions: (start1 < end2) AND (start2 < end1)
            (NEW.start_time < end_time) AND (start_time < NEW.end_time)
          )
      ) THEN
        RAISE EXCEPTION 'Employee % already has a shift from % to % on %', 
          NEW.employee_id, 
          (SELECT start_time FROM scheduling.shifts 
           WHERE employee_id = NEW.employee_id
             AND organization_id = NEW.organization_id
             AND shift_date = NEW.shift_date
             AND status NOT IN ('cancelled', 'no_show')
             AND (NEW.start_time < end_time) AND (start_time < NEW.end_time)
           LIMIT 1),
          (SELECT end_time FROM scheduling.shifts 
           WHERE employee_id = NEW.employee_id
             AND organization_id = NEW.organization_id
             AND shift_date = NEW.shift_date
             AND status NOT IN ('cancelled', 'no_show')
             AND (NEW.start_time < end_time) AND (start_time < NEW.end_time)
           LIMIT 1),
          NEW.shift_date
          USING ERRCODE = '23514'; -- Check violation
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger for INSERT operations
    CREATE TRIGGER prevent_overlapping_shifts_insert
      BEFORE INSERT ON scheduling.shifts
      FOR EACH ROW
      EXECUTE FUNCTION check_shift_overlap();

    -- Create trigger for UPDATE operations
    CREATE TRIGGER prevent_overlapping_shifts_update
      BEFORE UPDATE ON scheduling.shifts
      FOR EACH ROW
      WHEN (
        OLD.employee_id IS DISTINCT FROM NEW.employee_id OR
        OLD.shift_date IS DISTINCT FROM NEW.shift_date OR
        OLD.start_time IS DISTINCT FROM NEW.start_time OR
        OLD.end_time IS DISTINCT FROM NEW.end_time OR
        OLD.status IS DISTINCT FROM NEW.status
      )
      EXECUTE FUNCTION check_shift_overlap();
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.raw(`
    -- Drop triggers
    DROP TRIGGER IF EXISTS prevent_overlapping_shifts_insert ON scheduling.shifts;
    DROP TRIGGER IF EXISTS prevent_overlapping_shifts_update ON scheduling.shifts;
    
    -- Drop function
    DROP FUNCTION IF EXISTS check_shift_overlap();
  `);
};