/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.raw(`
    -- Fix the check_shift_overlap function to handle UUID properly
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
          AND (NEW.id IS NULL OR id != NEW.id)  -- Properly exclude current record for updates
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
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.raw(`
    -- Restore the original function with the COALESCE issue (for rollback purposes)
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
          AND id != COALESCE(NEW.id, 0)  -- Original problematic line
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
  `);
};
