-- ================================================================
-- SEED ALLOWANCES (Tax-Free Caps per Surinamese Wage Tax Law)
-- ================================================================
-- 
-- This seeds the tax-free allowance caps as defined in:
-- Wet op de Loonbelasting 1996 (Surinamese Wage Tax Law)
--
-- Key Legal References:
-- - Article 10 lid 1 letter i: Holiday allowance (vakantiegeld) up to 1 month salary, max SRD 10,016/year
-- - Article 10 lid 1 letter j: Bonus/gratuity (bonus/gratificatie), max SRD 10,016/year  
-- - Article 13 lid 1 letter b: Tax-free sum SRD 108,000/year for Suriname residents (SRD 9,000/month)
--
-- IMPORTANT: These are LEGAL TAX CAPS, not calculation methods
-- Organizations configure their own calculation rules in pay_component.calculation_metadata
--
-- MULTI-TENANT: Seeds allowances for EACH organization (tenant isolation)
-- ================================================================

-- Insert tax-free allowance caps for EACH organization
-- This ensures complete tenant data isolation

INSERT INTO payroll.allowance 
  (organization_id, allowance_type, allowance_name, country, amount, is_percentage, 
   effective_from, is_active, description)
SELECT 
  o.id as organization_id,
  allowance_data.allowance_type,
  allowance_data.allowance_name,
  'SR' as country,
  allowance_data.amount,
  false as is_percentage,
  '2025-01-01' as effective_from,
  true as is_active,
  allowance_data.description
FROM organizations o
CROSS JOIN (
  VALUES
    -- Article 10 lid 1 letter i: Holiday allowance (vakantiegeld)
    ('holiday_allowance', 
     'Vakantiegeld Tax-Free Cap', 
     10016.00, 
     'Tax-free holiday allowance cap per Article 10 lid 1 letter i - up to 1 month salary, maximum SRD 10,016 per year'),
    
    -- Article 10 lid 1 letter j: Bonus/Gratuity
    ('bonus_gratuity', 
     'Bonus/Gratuity Tax-Free Cap', 
     10016.00,
     'Tax-free bonus/gratuity cap per Article 10 lid 1 letter j - maximum SRD 10,016 per year'),
    
    -- Article 13 lid 1 letter b: Monthly tax-free sum for residents
    ('tax_free_sum_monthly', 
     'Monthly Tax-Free Sum (Residents)', 
     9000.00,
     'Monthly tax-free sum for Suriname residents per Article 13 lid 1 letter b - SRD 108,000/year ÷ 12 = SRD 9,000/month')
) AS allowance_data(allowance_type, allowance_name, amount, description)
WHERE NOT EXISTS (
  SELECT 1 FROM payroll.allowance a
  WHERE a.organization_id = o.id 
    AND a.allowance_type = allowance_data.allowance_type
);

-- ================================================================
-- NOTES FOR IMPLEMENTATION
-- ================================================================
--
-- 1. MULTI-TENANT ISOLATION:
--    Each organization gets its OWN copy of allowance caps
--    No shared data - complete tenant isolation
--    AllowanceService ALWAYS filters by organization_id
--
-- 2. VAKANTIEGELD CALCULATION (organization-specific):
--    Organizations configure HOW to calculate vakantiegeld in pay_component.calculation_metadata
--    Examples:
--    - Org A: 8% of base salary, semi-annual (January, September)
--    - Org B: Fixed SRD 5,000 per payment, semi-annual
--    - Org C: One month salary, annual (December)
--
-- 3. TAX TREATMENT (legal requirement):
--    AllowanceService applies the SRD 10,016 cap from this table
--    Tracks yearly usage in employee_allowance_usage table
--    Only amount within cap is tax-free, excess is taxable
--
-- 4. BONUS/GRATUITY:
--    Same pattern - organization configures calculation method
--    Same SRD 10,016 yearly tax-free cap enforced
--
-- 5. MONTHLY TAX-FREE SUM:
--    Applied to ALL regular salary payments automatically
--    SRD 9,000 per month = SRD 108,000 per year
--    Reduces taxable income before applying tax brackets
--
-- ================================================================

COMMENT ON TABLE payroll.allowance IS 
  'Tax-free allowance caps per Surinamese Wage Tax Law. MULTI-TENANT: Each organization has its own allowance records. Organizations configure calculation methods separately in pay_component.calculation_metadata.';
