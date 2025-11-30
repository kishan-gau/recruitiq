/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.raw(`
    -- Create paylinq schema
    CREATE SCHEMA IF NOT EXISTS paylinq;

    -- Grant usage on schema
    GRANT USAGE ON SCHEMA paylinq TO recruitiq_app;
    GRANT ALL ON SCHEMA paylinq TO recruitiq_admin;

    -- Create pay_components table
    CREATE TABLE IF NOT EXISTS paylinq.pay_components (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      component_code VARCHAR(50) NOT NULL,
      component_name VARCHAR(200) NOT NULL,
      component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('earning', 'deduction', 'employer_contribution')),
      description TEXT,
      calculation_metadata JSONB DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_taxable BOOLEAN NOT NULL DEFAULT true,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id),
      UNIQUE(organization_id, component_code)
    );

    CREATE INDEX idx_pay_components_org_id ON paylinq.pay_components(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_pay_components_code ON paylinq.pay_components(component_code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_pay_components_type ON paylinq.pay_components(component_type) WHERE deleted_at IS NULL;

    -- Create payroll_run_types table
    CREATE TABLE IF NOT EXISTS paylinq.payroll_run_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      type_code VARCHAR(50) NOT NULL,
      type_name VARCHAR(200) NOT NULL,
      description TEXT,
      component_override_mode VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (component_override_mode IN ('all', 'explicit', 'exclude')),
      allowed_components JSONB DEFAULT '[]',
      excluded_components JSONB DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id),
      UNIQUE(organization_id, type_code)
    );

    CREATE INDEX idx_payroll_run_types_org_id ON paylinq.payroll_run_types(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_types_code ON paylinq.payroll_run_types(type_code) WHERE deleted_at IS NULL;

    -- Create worker_types table
    CREATE TABLE IF NOT EXISTS paylinq.worker_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      type_code VARCHAR(50) NOT NULL,
      type_name VARCHAR(200) NOT NULL,
      description TEXT,
      default_pay_frequency VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (default_pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
      benefits_eligible BOOLEAN NOT NULL DEFAULT true,
      overtime_eligible BOOLEAN NOT NULL DEFAULT false,
      standard_hours_per_week NUMERIC(5,2),
      default_components JSONB DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id),
      UNIQUE(organization_id, type_code)
    );

    CREATE INDEX idx_worker_types_org_id ON paylinq.worker_types(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_types_code ON paylinq.worker_types(type_code) WHERE deleted_at IS NULL;

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paylinq TO recruitiq_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA paylinq TO recruitiq_readonly;
    GRANT ALL ON ALL TABLES IN SCHEMA paylinq TO recruitiq_admin;

    -- Grant sequence permissions
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA paylinq TO recruitiq_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA paylinq TO recruitiq_admin;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS paylinq.worker_types CASCADE;
    DROP TABLE IF EXISTS paylinq.payroll_run_types CASCADE;
    DROP TABLE IF EXISTS paylinq.pay_components CASCADE;
    DROP SCHEMA IF EXISTS paylinq CASCADE;
  `);
}
