-- ====================================
-- Worker Type Seed Data (HRIS)
-- ====================================
-- Seeds standard worker types into hris.worker_type for all organizations

DO $$
DECLARE
  org_record RECORD;
  admin_user_id UUID;
  wt_ft UUID;
  wt_pt UUID;
  wt_ctr UUID;
  wt_tmp UUID;
  wt_int UUID;
  wt_frl UUID;
  wt_sea UUID;
BEGIN
  -- Loop through all organizations
  FOR org_record IN SELECT id FROM organizations LOOP
    
    -- Get first user for this organization (for created_by audit)
    -- May be NULL if users haven't been created yet (during initial seed)
    SELECT id INTO admin_user_id 
    FROM hris.user_account 
    WHERE organization_id = org_record.id 
    LIMIT 1;
    
    -- Insert worker types into HRIS (created_by may be NULL during seed)
    INSERT INTO hris.worker_type (
      id, organization_id, code, name, description,
      benefits_eligible, pto_eligible, sick_leave_eligible, vacation_accrual_rate,
      is_active, created_by
    ) VALUES
      -- Full-Time
      (gen_random_uuid(), org_record.id, 'FT', 'Full-Time', 
       'Full-time employees working standard 40 hours per week',
       true, true, true, 3.33, true, admin_user_id),
      
      -- Part-Time
      (gen_random_uuid(), org_record.id, 'PT', 'Part-Time',
       'Part-time employees working less than 40 hours per week',
       false, true, true, 1.67, true, admin_user_id),
      
      -- Contractor
      (gen_random_uuid(), org_record.id, 'CTR', 'Contractor',
       'Independent contractors paid per project or hourly',
       false, false, false, 0, true, admin_user_id),
      
      -- Temporary
      (gen_random_uuid(), org_record.id, 'TMP', 'Temporary',
       'Temporary workers for short-term assignments',
       false, false, true, 0, true, admin_user_id),
      
      -- Intern
      (gen_random_uuid(), org_record.id, 'INT', 'Intern',
       'Interns and trainees (paid or unpaid)',
       false, false, false, 0, true, admin_user_id),
      
      -- Freelance
      (gen_random_uuid(), org_record.id, 'FRL', 'Freelance',
       'Freelance workers paid per project or deliverable',
       false, false, false, 0, true, admin_user_id),
      
      -- Seasonal
      (gen_random_uuid(), org_record.id, 'SEA', 'Seasonal',
       'Seasonal workers for peak periods',
       false, true, false, 0, true, admin_user_id)
    ON CONFLICT (organization_id, code) DO NOTHING;
    
    -- Get worker type IDs for pay config
    SELECT id INTO wt_ft FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'FT';
    SELECT id INTO wt_pt FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'PT';
    SELECT id INTO wt_ctr FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'CTR';
    SELECT id INTO wt_tmp FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'TMP';
    SELECT id INTO wt_int FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'INT';
    SELECT id INTO wt_frl FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'FRL';
    SELECT id INTO wt_sea FROM hris.worker_type WHERE organization_id = org_record.id AND code = 'SEA';
    
    -- Insert payroll-specific configurations
    INSERT INTO payroll.worker_type_pay_config (
      id, organization_id, worker_type_id,
      pay_structure_template_code, default_pay_frequency, default_payment_method,
      overtime_eligible, is_active, created_by
    ) VALUES
      -- Full-Time
      (gen_random_uuid(), org_record.id, wt_ft,
       NULL, 'monthly', 'ach', true, true, admin_user_id),
      
      -- Part-Time
      (gen_random_uuid(), org_record.id, wt_pt,
       NULL, 'biweekly', 'ach', true, true, admin_user_id),
      
      -- Contractor
      (gen_random_uuid(), org_record.id, wt_ctr,
       NULL, 'project', 'ach', false, true, admin_user_id),
      
      -- Temporary
      (gen_random_uuid(), org_record.id, wt_tmp,
       NULL, 'weekly', 'ach', false, true, admin_user_id),
      
      -- Intern
      (gen_random_uuid(), org_record.id, wt_int,
       NULL, 'monthly', 'ach', false, true, admin_user_id),
      
      -- Freelance
      (gen_random_uuid(), org_record.id, wt_frl,
       NULL, 'project', 'ach', false, true, admin_user_id),
      
      -- Seasonal
      (gen_random_uuid(), org_record.id, wt_sea,
       NULL, 'weekly', 'ach', false, true, admin_user_id)
    ON CONFLICT (organization_id, worker_type_id) DO NOTHING;
    
    RAISE NOTICE '[OK] Worker types seeded for organization: %', org_record.id;
    
  END LOOP;
  
  RAISE NOTICE '[OK] Worker types seeded successfully for all organizations';
END $$;
