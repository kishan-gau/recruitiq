-- Formula Template Library
-- Pre-built formula templates for common payroll calculations

-- Add to paylinq-schema.sql after component_formula table

CREATE TABLE IF NOT EXISTS payroll.formula_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL for global templates
  
  -- Template identification
  template_code VARCHAR(50) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('earnings', 'deductions', 'taxes', 'benefits', 'overtime', 'bonuses', 'allowances')),
  
  -- Template details
  description TEXT,
  formula_expression TEXT NOT NULL, -- Template with placeholders: "gross_pay * {rate}"
  formula_ast JSONB, -- Pre-parsed AST
  
  -- Configuration
  parameters JSONB, -- Required parameters: [{name: 'rate', type: 'percentage', min: 0, max: 100, default: 10}]
  example_values JSONB, -- Example parameter values: {rate: 10, threshold: 5000}
  example_calculation TEXT, -- Human-readable example: "10% of gross pay = SRD 500"
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  
  -- Scope
  is_global BOOLEAN DEFAULT false, -- Available to all organizations
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  tags TEXT[], -- Searchable tags: ['percentage', 'gross_pay', 'bonus']
  complexity_level VARCHAR(20) DEFAULT 'simple' CHECK (complexity_level IN ('simple', 'intermediate', 'advanced')),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  UNIQUE(template_code, organization_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for template library
CREATE INDEX IF NOT EXISTS idx_formula_template_category ON payroll.formula_template(category, is_active);
CREATE INDEX IF NOT EXISTS idx_formula_template_popular ON payroll.formula_template(is_popular, usage_count DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_formula_template_org ON payroll.formula_template(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_formula_template_global ON payroll.formula_template(is_global) WHERE is_global = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_formula_template_tags ON payroll.formula_template USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_formula_template_complexity ON payroll.formula_template(complexity_level, category);

-- Seed global formula templates
INSERT INTO payroll.formula_template (
  template_code, template_name, category, description, formula_expression, 
  parameters, example_values, example_calculation, is_global, is_popular, 
  is_recommended, tags, complexity_level
) VALUES
-- Earnings Templates
(
  'PERC_GROSS',
  'Percentage of Gross Pay',
  'earnings',
  'Calculate a percentage of gross pay (e.g., commission, bonus)',
  'gross_pay * {rate}',
  '[{"name": "rate", "type": "percentage", "min": 0, "max": 100, "default": 10, "description": "Percentage rate"}]'::jsonb,
  '{"rate": 0.10}'::jsonb,
  'For gross pay of SRD 5000: 5000 × 10% = SRD 500',
  true, true, true,
  ARRAY['percentage', 'gross_pay', 'earnings', 'commission', 'bonus'],
  'simple'
),
(
  'PERC_BASE',
  'Percentage of Base Salary',
  'earnings',
  'Calculate a percentage of base salary (e.g., annual bonus)',
  'base_salary * {rate}',
  '[{"name": "rate", "type": "percentage", "min": 0, "max": 100, "default": 15, "description": "Percentage rate"}]'::jsonb,
  '{"rate": 0.15}'::jsonb,
  'For base salary of SRD 60000: 60000 × 15% = SRD 9000',
  true, true, true,
  ARRAY['percentage', 'base_salary', 'bonus'],
  'simple'
),
(
  'OVERTIME_STANDARD',
  'Standard Overtime (1.5x)',
  'overtime',
  'Calculate overtime pay at 1.5 times regular rate',
  'overtime_hours * hourly_rate * 1.5',
  '[]'::jsonb,
  '{}'::jsonb,
  'For 10 overtime hours at SRD 25/hr: 10 × 25 × 1.5 = SRD 375',
  true, true, true,
  ARRAY['overtime', 'hours', 'time_and_half'],
  'simple'
),
(
  'OVERTIME_DOUBLE',
  'Double Time Overtime (2x)',
  'overtime',
  'Calculate overtime pay at 2 times regular rate (e.g., holidays)',
  'overtime_hours * hourly_rate * 2',
  '[]'::jsonb,
  '{}'::jsonb,
  'For 8 overtime hours at SRD 25/hr: 8 × 25 × 2 = SRD 400',
  true, false, false,
  ARRAY['overtime', 'hours', 'double_time', 'holiday'],
  'simple'
),
(
  'DAILY_RATE',
  'Daily Rate (Annual Salary / 260)',
  'earnings',
  'Calculate daily rate from annual salary (260 working days)',
  'ROUND(base_salary / 260, 2)',
  '[]'::jsonb,
  '{}'::jsonb,
  'For annual salary of SRD 60000: 60000 ÷ 260 = SRD 230.77',
  true, false, true,
  ARRAY['daily', 'base_salary', 'pro_rata'],
  'simple'
),

-- Deduction Templates
(
  'FIXED_AMOUNT',
  'Fixed Amount Per Period',
  'deductions',
  'Deduct a fixed amount every pay period',
  '{amount}',
  '[{"name": "amount", "type": "fixed", "min": 0, "default": 100, "description": "Fixed amount in SRD"}]'::jsonb,
  '{"amount": 150}'::jsonb,
  'Fixed deduction: SRD 150',
  true, true, true,
  ARRAY['fixed', 'deduction', 'allowance'],
  'simple'
),
(
  'PERC_GROSS_DED',
  'Percentage of Gross (Deduction)',
  'deductions',
  'Deduct a percentage of gross pay (e.g., retirement, health insurance)',
  'gross_pay * {rate}',
  '[{"name": "rate", "type": "percentage", "min": 0, "max": 50, "default": 5, "description": "Deduction rate"}]'::jsonb,
  '{"rate": 0.05}'::jsonb,
  'For gross pay of SRD 5000: 5000 × 5% = SRD 250 deducted',
  true, true, true,
  ARRAY['percentage', 'gross_pay', 'deduction', 'benefits'],
  'simple'
),

-- Conditional Templates
(
  'TIERED_BONUS',
  'Tiered Bonus (Two Levels)',
  'bonuses',
  'Different bonus rates based on gross pay threshold',
  'IF(gross_pay > {threshold}, gross_pay * {high_rate}, gross_pay * {low_rate})',
  '[
    {"name": "threshold", "type": "fixed", "min": 0, "default": 5000, "description": "Gross pay threshold"},
    {"name": "high_rate", "type": "percentage", "min": 0, "max": 100, "default": 15, "description": "Rate above threshold"},
    {"name": "low_rate", "type": "percentage", "min": 0, "max": 100, "default": 10, "description": "Rate below threshold"}
  ]'::jsonb,
  '{"threshold": 5000, "high_rate": 0.15, "low_rate": 0.10}'::jsonb,
  'If gross > SRD 5000: 15% bonus, else 10% bonus',
  true, true, true,
  ARRAY['conditional', 'tiered', 'bonus', 'threshold'],
  'intermediate'
),
(
  'OVERTIME_CONDITIONAL',
  'Conditional Overtime',
  'overtime',
  'Overtime pay only for hours above threshold',
  'IF(hours_worked > {threshold}, (hours_worked - {threshold}) * hourly_rate * 1.5, 0)',
  '[
    {"name": "threshold", "type": "fixed", "min": 0, "default": 160, "description": "Regular hours threshold"}
  ]'::jsonb,
  '{"threshold": 160}'::jsonb,
  'For 170 hours worked: (170 - 160) × rate × 1.5',
  true, true, true,
  ARRAY['conditional', 'overtime', 'hours', 'threshold'],
  'intermediate'
),
(
  'HEALTH_TIERED',
  'Tiered Health Insurance',
  'benefits',
  'Health insurance cost based on salary level',
  'IF(gross_pay > {high_threshold}, {high_amount}, IF(gross_pay > {mid_threshold}, {mid_amount}, {low_amount}))',
  '[
    {"name": "high_threshold", "type": "fixed", "default": 8000},
    {"name": "mid_threshold", "type": "fixed", "default": 5000},
    {"name": "high_amount", "type": "fixed", "default": 200},
    {"name": "mid_amount", "type": "fixed", "default": 150},
    {"name": "low_amount", "type": "fixed", "default": 100}
  ]'::jsonb,
  '{"high_threshold": 8000, "mid_threshold": 5000, "high_amount": 200, "mid_amount": 150, "low_amount": 100}'::jsonb,
  'SRD 200 if gross > 8000, SRD 150 if > 5000, else SRD 100',
  true, false, false,
  ARRAY['conditional', 'benefits', 'health', 'tiered', 'three_tier'],
  'advanced'
),

-- Advanced Templates
(
  'SAFE_DIVISION',
  'Safe Division (Avoid Divide by Zero)',
  'earnings',
  'Divide values safely with minimum threshold',
  'gross_pay / MAX(hours_worked, 1)',
  '[]'::jsonb,
  '{}'::jsonb,
  'Calculate hourly equivalent safely',
  true, false, false,
  ARRAY['division', 'safe', 'advanced'],
  'intermediate'
),
(
  'CAPPED_EARNINGS',
  'Capped Earnings',
  'earnings',
  'Earnings with a maximum cap',
  'MIN(gross_pay * {rate}, {max_amount})',
  '[
    {"name": "rate", "type": "percentage", "default": 10},
    {"name": "max_amount", "type": "fixed", "default": 1000}
  ]'::jsonb,
  '{"rate": 0.10, "max_amount": 1000}'::jsonb,
  'Calculate 10% of gross, capped at SRD 1000',
  true, false, false,
  ARRAY['capped', 'maximum', 'earnings'],
  'intermediate'
),
(
  'PRO_RATA_DAYS',
  'Pro-rata by Days Worked',
  'earnings',
  'Calculate pro-rated amount based on days worked in month',
  'ROUND(({monthly_amount} / {total_days}) * days_worked, 2)',
  '[
    {"name": "monthly_amount", "type": "fixed", "default": 1000},
    {"name": "total_days", "type": "fixed", "default": 30}
  ]'::jsonb,
  '{"monthly_amount": 1000, "total_days": 30}'::jsonb,
  'For 22 days worked: (1000 ÷ 30) × 22 = SRD 733.33',
  true, false, true,
  ARRAY['pro_rata', 'days', 'proportional'],
  'intermediate'
);

-- Comments
COMMENT ON TABLE payroll.formula_template IS 'Pre-built formula templates for common payroll calculations';
COMMENT ON COLUMN payroll.formula_template.parameters IS 'Parameter definitions with validation rules';
COMMENT ON COLUMN payroll.formula_template.is_global IS 'Available to all organizations when true';
COMMENT ON COLUMN payroll.formula_template.usage_count IS 'Number of times template has been used';
