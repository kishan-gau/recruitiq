/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.raw(`
    -- Create nexus schema
    CREATE SCHEMA IF NOT EXISTS nexus;

    -- Grant usage on schema
    GRANT USAGE ON SCHEMA nexus TO recruitiq_app;
    GRANT ALL ON SCHEMA nexus TO recruitiq_admin;

    -- Create locations table
    CREATE TABLE IF NOT EXISTS nexus.locations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100) NOT NULL,
      postal_code VARCHAR(20),
      phone VARCHAR(50),
      email VARCHAR(255),
      timezone VARCHAR(100),
      is_headquarters BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id)
    );

    CREATE INDEX idx_locations_org_id ON nexus.locations(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_locations_name ON nexus.locations(name) WHERE deleted_at IS NULL;
    CREATE INDEX idx_locations_country ON nexus.locations(country) WHERE deleted_at IS NULL;

    -- Create departments table
    CREATE TABLE IF NOT EXISTS nexus.departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      description TEXT,
      parent_department_id UUID REFERENCES nexus.departments(id) ON DELETE SET NULL,
      manager_id UUID,
      location_id UUID REFERENCES nexus.locations(id) ON DELETE SET NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id),
      UNIQUE(organization_id, code)
    );

    CREATE INDEX idx_departments_org_id ON nexus.departments(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_departments_name ON nexus.departments(name) WHERE deleted_at IS NULL;
    CREATE INDEX idx_departments_parent ON nexus.departments(parent_department_id) WHERE deleted_at IS NULL;

    -- Create job_titles table
    CREATE TABLE IF NOT EXISTS nexus.job_titles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES hris.organizations(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      code VARCHAR(50),
      description TEXT,
      department_id UUID REFERENCES nexus.departments(id) ON DELETE SET NULL,
      level VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES hris.user_account(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_by UUID REFERENCES hris.user_account(id),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_by UUID REFERENCES hris.user_account(id),
      UNIQUE(organization_id, code)
    );

    CREATE INDEX idx_job_titles_org_id ON nexus.job_titles(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_job_titles_title ON nexus.job_titles(title) WHERE deleted_at IS NULL;
    CREATE INDEX idx_job_titles_dept ON nexus.job_titles(department_id) WHERE deleted_at IS NULL;

    -- Grant permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA nexus TO recruitiq_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA nexus TO recruitiq_readonly;
    GRANT ALL ON ALL TABLES IN SCHEMA nexus TO recruitiq_admin;

    -- Grant sequence permissions
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA nexus TO recruitiq_app;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA nexus TO recruitiq_admin;
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.raw(`
    DROP TABLE IF EXISTS nexus.job_titles CASCADE;
    DROP TABLE IF EXISTS nexus.departments CASCADE;
    DROP TABLE IF EXISTS nexus.locations CASCADE;
    DROP SCHEMA IF EXISTS nexus CASCADE;
  `);
}
