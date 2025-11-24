-- Migration: Add residence status to employee table
-- Description: Adds is_suriname_resident field per Wet Loonbelasting Article 13.1a
-- Date: 2025-01-22
-- Wet Loonbelasting Compliance: Article 13.1a - Tax-free allowance only for residents

-- === UP Migration ===

BEGIN;

-- Add residence status column to hris.employee
-- Default TRUE for existing employees (assume residents unless specified otherwise)
ALTER TABLE hris.employee
ADD COLUMN IF NOT EXISTS is_suriname_resident BOOLEAN NOT NULL DEFAULT true;

-- Add index for filtering by residence status (used in tax calculations)
CREATE INDEX IF NOT EXISTS idx_employee_resident_status 
ON hris.employee(is_suriname_resident) 
WHERE deleted_at IS NULL;

-- Add comment explaining the field's purpose
COMMENT ON COLUMN hris.employee.is_suriname_resident IS 
'Per Wet Loonbelasting Article 13.1a: Indicates if employee is Suriname resident. Non-residents do NOT receive tax-free allowance (belastingvrije som). Critical for payroll tax calculations.';

-- Log migration
INSERT INTO hris.schema_migrations (version, description, executed_at)
VALUES ('20250122_add_residence_status', 'Add residence status to employee table per Article 13.1a', NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- === DOWN Migration (Rollback) ===

-- Uncomment to rollback:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_employee_resident_status;
-- ALTER TABLE hris.employee DROP COLUMN IF EXISTS is_suriname_resident;
-- DELETE FROM hris.schema_migrations WHERE version = '20250122_add_residence_status';
-- COMMIT;
