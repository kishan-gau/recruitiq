-- ============================================================================
-- Seed Foreign Worker Types for PayLinQ
-- ============================================================================
-- Adds worker type templates for foreign workers, offshore workers, and
-- contractors with appropriate compliance requirements for multinational
-- companies (e.g., Total Energies Suriname)
-- ============================================================================

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
    RAISE WARNING 'Test organization not found, skipping foreign worker types seed';
    RETURN;
  END IF;

  RAISE NOTICE '[INFO] Seeding foreign worker types for organization: %', v_org_id;

  -- Insert or update worker type templates with compliance requirements
  INSERT INTO payroll.worker_type_template (
    organization_id,
    name,
    code,
    description,
    status,
    default_pay_frequency,
    default_payment_method,
    benefits_eligible,
    overtime_eligible,
    pto_eligible,
    sick_leave_eligible,
    vacation_accrual_rate,
    requires_work_permit,
    requires_visa_tracking,
    requires_tax_residency,
    is_contractor,
    is_offshore_worker,
    compliance_category,
    created_at
  ) VALUES
    -- Foreign Worker (Full-Time)
    (
      v_org_id,
      'Foreign Worker (Full-Time)',
      'FW-FT',
      'Full-time foreign workers requiring work permits and visa tracking. Subject to tax residency rules and immigration compliance requirements.',
      'active',
      'monthly',
      'ach',
      true,  -- benefits_eligible
      true,  -- overtime_eligible
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      3.33,  -- vacation_accrual_rate (e.g., 40 hours/year = 3.33/month)
      true,  -- requires_work_permit
      true,  -- requires_visa_tracking
      true,  -- requires_tax_residency
      false, -- is_contractor
      false, -- is_offshore_worker
      'foreign',
      NOW()
    ),
    
    -- Foreign Worker (Contractor)
    (
      v_org_id,
      'Foreign Contractor',
      'FW-CTR',
      'Foreign contractors working on project basis. Requires work permit verification and tax compliance monitoring. Not eligible for employee benefits.',
      'active',
      'monthly',
      'wire',
      false, -- benefits_eligible (contractors typically not eligible)
      false, -- overtime_eligible (contractors paid by project/hours)
      false, -- pto_eligible
      false, -- sick_leave_eligible
      0,     -- vacation_accrual_rate
      true,  -- requires_work_permit
      true,  -- requires_visa_tracking
      true,  -- requires_tax_residency
      true,  -- is_contractor
      false, -- is_offshore_worker
      'foreign_contractor',
      NOW()
    ),
    
    -- Offshore Worker (Surinamese)
    (
      v_org_id,
      'Offshore Worker (Local)',
      'OFF-LOC',
      'Local Surinamese employees working on offshore oil platforms. Subject to offshore labor regulations, rotation schedules, and hazard pay.',
      'active',
      'bi-weekly',
      'ach',
      true,  -- benefits_eligible
      true,  -- overtime_eligible (offshore often has special overtime rules)
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      4.00,  -- vacation_accrual_rate (may be higher for offshore)
      false, -- requires_work_permit (local workers)
      false, -- requires_visa_tracking
      false, -- requires_tax_residency (resident)
      false, -- is_contractor
      true,  -- is_offshore_worker
      'offshore_local',
      NOW()
    ),
    
    -- Offshore Worker (Foreign)
    (
      v_org_id,
      'Offshore Worker (Foreign)',
      'OFF-FW',
      'Foreign employees working on offshore oil platforms. Requires work permits, visa tracking, and special offshore labor compliance. Subject to rotation schedules and international maritime regulations.',
      'active',
      'bi-weekly',
      'wire',
      true,  -- benefits_eligible (may vary by contract)
      true,  -- overtime_eligible
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      4.00,  -- vacation_accrual_rate
      true,  -- requires_work_permit
      true,  -- requires_visa_tracking
      true,  -- requires_tax_residency
      false, -- is_contractor
      true,  -- is_offshore_worker
      'offshore_foreign',
      NOW()
    ),
    
    -- Expatriate (Long-Term Assignment)
    (
      v_org_id,
      'Expatriate',
      'EXPAT',
      'Long-term expatriate assignments (typically 1+ years). Comprehensive tracking of work permits, visas, tax equalization, and relocation benefits.',
      'active',
      'monthly',
      'wire',
      true,  -- benefits_eligible (often enhanced benefits package)
      true,  -- overtime_eligible
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      5.00,  -- vacation_accrual_rate (may include home leave)
      true,  -- requires_work_permit
      true,  -- requires_visa_tracking
      true,  -- requires_tax_residency (complex tax situation)
      false, -- is_contractor
      false, -- is_offshore_worker
      'expatriate',
      NOW()
    ),
    
    -- Short-Term Assignment
    (
      v_org_id,
      'Short-Term Assignment',
      'STA',
      'Employees on short-term assignments (< 1 year). Requires visa tracking and may require work permit depending on duration and local laws.',
      'active',
      'monthly',
      'wire',
      true,  -- benefits_eligible (retains home country benefits)
      true,  -- overtime_eligible
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      0,     -- vacation_accrual_rate (usually maintains home accrual)
      true,  -- requires_work_permit
      true,  -- requires_visa_tracking
      true,  -- requires_tax_residency
      false, -- is_contractor
      false, -- is_offshore_worker
      'short_term',
      NOW()
    ),
    
    -- Local Contract (Surinamese)
    (
      v_org_id,
      'Local Employee',
      'LOC-EMP',
      'Local Surinamese employees on standard employment contracts. Subject to Suriname labor laws and local tax regulations only.',
      'active',
      'monthly',
      'ach',
      true,  -- benefits_eligible
      true,  -- overtime_eligible
      true,  -- pto_eligible
      true,  -- sick_leave_eligible
      3.33,  -- vacation_accrual_rate
      false, -- requires_work_permit
      false, -- requires_visa_tracking
      false, -- requires_tax_residency (local resident)
      false, -- is_contractor
      false, -- is_offshore_worker
      'local',
      NOW()
    ),
    
    -- Consultant (Local)
    (
      v_org_id,
      'Local Consultant',
      'LOC-CON',
      'Local consultants engaged for specialized services. Independent contractors with their own tax obligations.',
      'active',
      'monthly',
      'ach',
      false, -- benefits_eligible
      false, -- overtime_eligible
      false, -- pto_eligible
      false, -- sick_leave_eligible
      0,     -- vacation_accrual_rate
      false, -- requires_work_permit
      false, -- requires_visa_tracking
      false, -- requires_tax_residency (handles own taxes)
      true,  -- is_contractor
      false, -- is_offshore_worker
      'local_contractor',
      NOW()
    )
  ON CONFLICT (organization_id, code) DO UPDATE SET
    description = EXCLUDED.description,
    name = EXCLUDED.name,
    default_pay_frequency = EXCLUDED.default_pay_frequency,
    default_payment_method = EXCLUDED.default_payment_method,
    benefits_eligible = EXCLUDED.benefits_eligible,
    overtime_eligible = EXCLUDED.overtime_eligible,
    pto_eligible = EXCLUDED.pto_eligible,
    sick_leave_eligible = EXCLUDED.sick_leave_eligible,
    vacation_accrual_rate = EXCLUDED.vacation_accrual_rate,
    requires_work_permit = EXCLUDED.requires_work_permit,
    requires_visa_tracking = EXCLUDED.requires_visa_tracking,
    requires_tax_residency = EXCLUDED.requires_tax_residency,
    is_contractor = EXCLUDED.is_contractor,
    is_offshore_worker = EXCLUDED.is_offshore_worker,
    compliance_category = EXCLUDED.compliance_category,
    status = EXCLUDED.status,
    updated_at = NOW();

  RAISE NOTICE '[OK] Foreign worker types seeded successfully';
  RAISE NOTICE '[INFO] Added 8 worker type templates with compliance requirements:';
  RAISE NOTICE '  - Foreign Worker (Full-Time)';
  RAISE NOTICE '  - Foreign Contractor';
  RAISE NOTICE '  - Offshore Worker (Local)';
  RAISE NOTICE '  - Offshore Worker (Foreign)';
  RAISE NOTICE '  - Expatriate';
  RAISE NOTICE '  - Short-Term Assignment';
  RAISE NOTICE '  - Local Employee';
  RAISE NOTICE '  - Local Consultant';
  
END $$;

-- Verification query
SELECT 
  '============================================' as "====================";
SELECT 'Foreign Worker Types Summary' as "Status";
SELECT 
  '============================================' as "====================";
SELECT '' as "Separator";
SELECT 
  code,
  name,
  compliance_category,
  requires_work_permit as "Permit?",
  requires_visa_tracking as "Visa?",
  requires_tax_residency as "Tax?",
  is_contractor as "Contractor?",
  is_offshore_worker as "Offshore?"
FROM payroll.worker_type_template
WHERE compliance_category IS NOT NULL
ORDER BY compliance_category, code;
