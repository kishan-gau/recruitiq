-- ============================================================================
-- Seed Worker Type Templates for PayLinQ
-- ============================================================================
-- These are the standard employment types used across organizations
-- Organizations can define custom worker types based on these templates

-- Get the test organization ID
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Find the test organization
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = 'test-company'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Test organization not found, skipping worker type templates seed';
    RETURN;
  END IF;

  -- Insert worker type templates
  INSERT INTO payroll.worker_type_template (
    organization_id,
    name,
    code,
    description,
    status,
    created_at
  ) VALUES
    (
      v_org_id,
      'Full-Time',
      'FT',
      'Full-time employees working standard hours (typically 40 hours/week)',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Part-Time',
      'PT',
      'Part-time employees working reduced hours',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Contractor',
      'CTR',
      'Independent contractors or consultants',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Temporary',
      'TMP',
      'Temporary workers hired for a fixed period',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Intern',
      'INT',
      'Interns or trainees in training programs',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Seasonal',
      'SEA',
      'Seasonal workers hired during peak periods',
      'active',
      NOW()
    ),
    (
      v_org_id,
      'Freelance',
      'FRL',
      'Freelance workers engaged on project basis',
      'active',
      NOW()
    )
  ON CONFLICT (organization_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    code = EXCLUDED.code,
    status = EXCLUDED.status,
    updated_at = NOW();

  RAISE NOTICE '[OK] Worker type templates seeded for organization: %', v_org_id;
END $$;
