-- ============================================================================
-- Fix missing employment_type in existing employee records
-- ============================================================================

-- Update existing employees where employment_type is NULL
-- Default to 'full_time' for employees that don't have a type set

UPDATE hris.employee
SET 
  employment_type = 'full_time',
  updated_at = NOW()
WHERE employment_type IS NULL
  AND deleted_at IS NULL;

-- Report results
SELECT 
  '============================================' as "====================",
  'Fixed Employment Type for Existing Employees' as "Status",
  COUNT(*) as "Records Updated"
FROM hris.employee
WHERE employment_type = 'full_time'
  AND updated_at >= NOW() - INTERVAL '1 minute'
  AND deleted_at IS NULL;

