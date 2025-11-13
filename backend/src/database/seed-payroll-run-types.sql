-- ================================================================
-- SEED DEFAULT PAYROLL RUN TYPES
-- ================================================================
--
-- Seeds 7 default run types with explicit component configuration
-- MULTI-TENANT: Seeds run types for EACH organization (tenant isolation)
-- Organizations can modify or add custom run types
-- ================================================================

INSERT INTO payroll.payroll_run_type 
  (organization_id, type_code, type_name, description, 
   component_override_mode, allowed_components, is_system_default, 
   display_order, icon, color, is_active)
SELECT 
  o.id as organization_id,
  run_type_data.type_code,
  run_type_data.type_name,
  run_type_data.description,
  'explicit' as component_override_mode,
  run_type_data.allowed_components,
  false as is_system_default,  -- Not system default, per-tenant
  run_type_data.display_order,
  run_type_data.icon,
  run_type_data.color,
  true as is_active
FROM organizations o
CROSS JOIN (
  VALUES
    -- 1. Regular Payroll
    ('REGULAR', 'Regular Payroll', 
     'Standard monthly payroll with salary, overtime, and deductions',
     '["REGULAR_SALARY", "OVERTIME", "DEDUCTIONS"]'::jsonb,
     1, 'calendar', '#10b981'),
    
    -- 2. Holiday Allowance (Vakantiegeld)
    ('VAKANTIEGELD', 'Holiday Allowance', 
     '8% semi-annual payment (January/September). Only vakantiegeld component included. Tax-free up to SRD 10,016/year.',
     '["VAKANTIEGELD"]'::jsonb,
     2, 'gift', '#f59e0b'),
    
    -- 3. Bonus Payment
    ('BONUS', 'Bonus Payment', 
     'Performance bonuses and gratifications. Tax-free up to SRD 10,016/year per Article 10 lid 1 letter j.',
     '["BONUS", "GRATUITY"]'::jsonb,
     3, 'award', '#8b5cf6'),
    
    -- 4. 13th Month
    ('THIRTEENTH_MONTH', '13th Month Salary', 
     '13th month salary payment (annual). Also known as "dertiende maand".',
     '["THIRTEENTH_MONTH"]'::jsonb,
     4, 'calendar-check', '#06b6d4'),
    
    -- 5. Adjustment
    ('ADJUSTMENT', 'Adjustment', 
     'Corrections, back pay, and payroll adjustments',
     '["ADJUSTMENT", "BACK_PAY", "CORRECTION"]'::jsonb,
     5, 'edit', '#6b7280'),
    
    -- 6. Final Pay
    ('FINAL_PAY', 'Final Settlement', 
     'Termination pay and final settlements including accrued leave',
     '["FINAL_PAY", "SEVERANCE", "ACCRUED_LEAVE"]'::jsonb,
     6, 'user-x', '#ef4444'),
    
    -- 7. Commission
    ('COMMISSION', 'Commission Payment', 
     'Sales commission payments',
     '["COMMISSION"]'::jsonb,
     7, 'trending-up', '#059669')
) AS run_type_data(type_code, type_name, description, allowed_components, display_order, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM payroll.payroll_run_type prt
  WHERE prt.organization_id = o.id 
    AND prt.type_code = run_type_data.type_code
);

-- ================================================================
-- NOTES
-- ================================================================
--
-- MULTI-TENANT ISOLATION:
-- - Each organization gets its OWN copy of these run types
-- - No shared data between tenants
-- - Organizations can modify/delete their run types
-- - Organizations can create additional custom run types
--
-- Component Override Modes:
-- - 'template': Uses components from linked pay_structure_template
-- - 'explicit': Uses allowed_components array (what we're using here)
-- - 'hybrid': Uses template + allows overrides
--
-- Vakantiegeld & Bonus Tax Treatment:
-- - Both subject to SRD 10,016/year tax-free cap
-- - Tracked in employee_allowance_usage table
-- - Calculation methods configured in pay_component.calculation_metadata
-- ================================================================
