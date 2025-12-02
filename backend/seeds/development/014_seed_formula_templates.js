/**
 * Seed: Formula Templates
 * Source: seed-formula-templates.sql
 * 
 * Seeds pre-built formula templates for common payroll calculations:
 * - Earnings Templates
 * - Deduction Templates
 * - Conditional Templates
 * - Advanced Templates
 * 
 * Note: This seed creates the formula_template table and its indexes
 * if they don't exist, then seeds global formula templates.
 */

export async function seed(knex) {
  // Check if payroll schema exists
  const payrollSchemaExists = await knex.raw(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'payroll'
  `);

  if (payrollSchemaExists.rows.length === 0) {
    console.log('[SKIP] Payroll schema not found. Skipping formula templates seed.');
    return;
  }

  // Check if formula_template table exists
  const tableExists = await knex.raw(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'payroll' AND table_name = 'formula_template'
  `);

  if (tableExists.rows.length === 0) {
    console.log('[INFO] Creating formula_template table...');
    
    // Create the formula_template table
    await knex.raw(`
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
        
        UNIQUE(template_code, organization_id)
      )
    `);

    // Create indexes
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_category ON payroll.formula_template(category, is_active)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_popular ON payroll.formula_template(is_popular, usage_count DESC) WHERE is_active = true`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_org ON payroll.formula_template(organization_id) WHERE organization_id IS NOT NULL`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_global ON payroll.formula_template(is_global) WHERE is_global = true AND is_active = true`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_tags ON payroll.formula_template USING gin(tags)`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_formula_template_complexity ON payroll.formula_template(complexity_level, category)`);

    console.log('[OK] Formula template table created');
  }

  // Seed global formula templates
  const templates = [
    // Earnings Templates
    {
      template_code: 'PERC_GROSS',
      template_name: 'Percentage of Gross Pay',
      category: 'earnings',
      description: 'Calculate a percentage of gross pay (e.g., commission, bonus)',
      formula_expression: 'gross_pay * {rate}',
      parameters: JSON.stringify([{ name: 'rate', type: 'percentage', min: 0, max: 100, default: 10, description: 'Percentage rate' }]),
      example_values: JSON.stringify({ rate: 0.10 }),
      example_calculation: 'For gross pay of SRD 5000: 5000 × 10% = SRD 500',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['percentage', 'gross_pay', 'earnings', 'commission', 'bonus'],
      complexity_level: 'simple'
    },
    {
      template_code: 'PERC_BASE',
      template_name: 'Percentage of Base Salary',
      category: 'earnings',
      description: 'Calculate a percentage of base salary (e.g., annual bonus)',
      formula_expression: 'base_salary * {rate}',
      parameters: JSON.stringify([{ name: 'rate', type: 'percentage', min: 0, max: 100, default: 15, description: 'Percentage rate' }]),
      example_values: JSON.stringify({ rate: 0.15 }),
      example_calculation: 'For base salary of SRD 60000: 60000 × 15% = SRD 9000',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['percentage', 'base_salary', 'bonus'],
      complexity_level: 'simple'
    },
    {
      template_code: 'OVERTIME_STANDARD',
      template_name: 'Standard Overtime (1.5x)',
      category: 'overtime',
      description: 'Calculate overtime pay at 1.5 times regular rate',
      formula_expression: 'overtime_hours * hourly_rate * 1.5',
      parameters: JSON.stringify([]),
      example_values: JSON.stringify({}),
      example_calculation: 'For 10 overtime hours at SRD 25/hr: 10 × 25 × 1.5 = SRD 375',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['overtime', 'hours', 'time_and_half'],
      complexity_level: 'simple'
    },
    {
      template_code: 'OVERTIME_DOUBLE',
      template_name: 'Double Time Overtime (2x)',
      category: 'overtime',
      description: 'Calculate overtime pay at 2 times regular rate (e.g., holidays)',
      formula_expression: 'overtime_hours * hourly_rate * 2',
      parameters: JSON.stringify([]),
      example_values: JSON.stringify({}),
      example_calculation: 'For 8 overtime hours at SRD 25/hr: 8 × 25 × 2 = SRD 400',
      is_global: true,
      is_popular: false,
      is_recommended: false,
      tags: ['overtime', 'hours', 'double_time', 'holiday'],
      complexity_level: 'simple'
    },
    {
      template_code: 'DAILY_RATE',
      template_name: 'Daily Rate (Annual Salary / 260)',
      category: 'earnings',
      description: 'Calculate daily rate from annual salary (260 working days)',
      formula_expression: 'ROUND(base_salary / 260, 2)',
      parameters: JSON.stringify([]),
      example_values: JSON.stringify({}),
      example_calculation: 'For annual salary of SRD 60000: 60000 ÷ 260 = SRD 230.77',
      is_global: true,
      is_popular: false,
      is_recommended: true,
      tags: ['daily', 'base_salary', 'pro_rata'],
      complexity_level: 'simple'
    },

    // Deduction Templates
    {
      template_code: 'FIXED_AMOUNT',
      template_name: 'Fixed Amount Per Period',
      category: 'deductions',
      description: 'Deduct a fixed amount every pay period',
      formula_expression: '{amount}',
      parameters: JSON.stringify([{ name: 'amount', type: 'fixed', min: 0, default: 100, description: 'Fixed amount in SRD' }]),
      example_values: JSON.stringify({ amount: 150 }),
      example_calculation: 'Fixed deduction: SRD 150',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['fixed', 'deduction', 'allowance'],
      complexity_level: 'simple'
    },
    {
      template_code: 'PERC_GROSS_DED',
      template_name: 'Percentage of Gross (Deduction)',
      category: 'deductions',
      description: 'Deduct a percentage of gross pay (e.g., retirement, health insurance)',
      formula_expression: 'gross_pay * {rate}',
      parameters: JSON.stringify([{ name: 'rate', type: 'percentage', min: 0, max: 50, default: 5, description: 'Deduction rate' }]),
      example_values: JSON.stringify({ rate: 0.05 }),
      example_calculation: 'For gross pay of SRD 5000: 5000 × 5% = SRD 250 deducted',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['percentage', 'gross_pay', 'deduction', 'benefits'],
      complexity_level: 'simple'
    },

    // Conditional Templates
    {
      template_code: 'TIERED_BONUS',
      template_name: 'Tiered Bonus (Two Levels)',
      category: 'bonuses',
      description: 'Different bonus rates based on gross pay threshold',
      formula_expression: 'IF(gross_pay > {threshold}, gross_pay * {high_rate}, gross_pay * {low_rate})',
      parameters: JSON.stringify([
        { name: 'threshold', type: 'fixed', min: 0, default: 5000, description: 'Gross pay threshold' },
        { name: 'high_rate', type: 'percentage', min: 0, max: 100, default: 15, description: 'Rate above threshold' },
        { name: 'low_rate', type: 'percentage', min: 0, max: 100, default: 10, description: 'Rate below threshold' }
      ]),
      example_values: JSON.stringify({ threshold: 5000, high_rate: 0.15, low_rate: 0.10 }),
      example_calculation: 'If gross > SRD 5000: 15% bonus, else 10% bonus',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['conditional', 'tiered', 'bonus', 'threshold'],
      complexity_level: 'intermediate'
    },
    {
      template_code: 'OVERTIME_CONDITIONAL',
      template_name: 'Conditional Overtime',
      category: 'overtime',
      description: 'Overtime pay only for hours above threshold',
      formula_expression: 'IF(hours_worked > {threshold}, (hours_worked - {threshold}) * hourly_rate * 1.5, 0)',
      parameters: JSON.stringify([
        { name: 'threshold', type: 'fixed', min: 0, default: 160, description: 'Regular hours threshold' }
      ]),
      example_values: JSON.stringify({ threshold: 160 }),
      example_calculation: 'For 170 hours worked: (170 - 160) × rate × 1.5',
      is_global: true,
      is_popular: true,
      is_recommended: true,
      tags: ['conditional', 'overtime', 'hours', 'threshold'],
      complexity_level: 'intermediate'
    },
    {
      template_code: 'HEALTH_TIERED',
      template_name: 'Tiered Health Insurance',
      category: 'benefits',
      description: 'Health insurance cost based on salary level',
      formula_expression: 'IF(gross_pay > {high_threshold}, {high_amount}, IF(gross_pay > {mid_threshold}, {mid_amount}, {low_amount}))',
      parameters: JSON.stringify([
        { name: 'high_threshold', type: 'fixed', default: 8000 },
        { name: 'mid_threshold', type: 'fixed', default: 5000 },
        { name: 'high_amount', type: 'fixed', default: 200 },
        { name: 'mid_amount', type: 'fixed', default: 150 },
        { name: 'low_amount', type: 'fixed', default: 100 }
      ]),
      example_values: JSON.stringify({ high_threshold: 8000, mid_threshold: 5000, high_amount: 200, mid_amount: 150, low_amount: 100 }),
      example_calculation: 'SRD 200 if gross > 8000, SRD 150 if > 5000, else SRD 100',
      is_global: true,
      is_popular: false,
      is_recommended: false,
      tags: ['conditional', 'benefits', 'health', 'tiered', 'three_tier'],
      complexity_level: 'advanced'
    },

    // Advanced Templates
    {
      template_code: 'SAFE_DIVISION',
      template_name: 'Safe Division (Avoid Divide by Zero)',
      category: 'earnings',
      description: 'Divide values safely with minimum threshold',
      formula_expression: 'gross_pay / MAX(hours_worked, 1)',
      parameters: JSON.stringify([]),
      example_values: JSON.stringify({}),
      example_calculation: 'Calculate hourly equivalent safely',
      is_global: true,
      is_popular: false,
      is_recommended: false,
      tags: ['division', 'safe', 'advanced'],
      complexity_level: 'intermediate'
    },
    {
      template_code: 'CAPPED_EARNINGS',
      template_name: 'Capped Earnings',
      category: 'earnings',
      description: 'Earnings with a maximum cap',
      formula_expression: 'MIN(gross_pay * {rate}, {max_amount})',
      parameters: JSON.stringify([
        { name: 'rate', type: 'percentage', default: 10 },
        { name: 'max_amount', type: 'fixed', default: 1000 }
      ]),
      example_values: JSON.stringify({ rate: 0.10, max_amount: 1000 }),
      example_calculation: 'Calculate 10% of gross, capped at SRD 1000',
      is_global: true,
      is_popular: false,
      is_recommended: false,
      tags: ['capped', 'maximum', 'earnings'],
      complexity_level: 'intermediate'
    },
    {
      template_code: 'PRO_RATA_DAYS',
      template_name: 'Pro-rata by Days Worked',
      category: 'earnings',
      description: 'Calculate pro-rated amount based on days worked in month',
      formula_expression: 'ROUND(({monthly_amount} / {total_days}) * days_worked, 2)',
      parameters: JSON.stringify([
        { name: 'monthly_amount', type: 'fixed', default: 1000 },
        { name: 'total_days', type: 'fixed', default: 30 }
      ]),
      example_values: JSON.stringify({ monthly_amount: 1000, total_days: 30 }),
      example_calculation: 'For 22 days worked: (1000 ÷ 30) × 22 = SRD 733.33',
      is_global: true,
      is_popular: false,
      is_recommended: true,
      tags: ['pro_rata', 'days', 'proportional'],
      complexity_level: 'intermediate'
    }
  ];

  // Insert templates
  for (const template of templates) {
    await knex.raw(`
      INSERT INTO payroll.formula_template (
        template_code, template_name, category, description, formula_expression,
        parameters, example_values, example_calculation, is_global, is_popular,
        is_recommended, tags, complexity_level
      ) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?, ?, ?::text[], ?)
      ON CONFLICT (template_code, organization_id) DO NOTHING
    `, [
      template.template_code,
      template.template_name,
      template.category,
      template.description,
      template.formula_expression,
      template.parameters,
      template.example_values,
      template.example_calculation,
      template.is_global,
      template.is_popular,
      template.is_recommended,
      `{${template.tags.join(',')}}`,
      template.complexity_level
    ]);
  }

  console.log('[OK] Formula templates seeded successfully');
  console.log(`  - Seeded ${templates.length} global formula templates`);
  console.log('  - Categories: earnings, deductions, overtime, bonuses, benefits');
}
