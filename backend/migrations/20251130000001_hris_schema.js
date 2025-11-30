/**
 * HRIS Schema Migration
 * 
 * Creates the HRIS (Human Resource Information System) schema
 * which is the foundation for all other product schemas.
 * 
 * Schema: hris
 * Tables: user_account, tenant_refresh_tokens, department, location, 
 *         worker_type, employee
 * 
 * Dependencies: organizations table (created by this migration)
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ============================================================================
  // ENABLE EXTENSIONS
  // ============================================================================
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

  // ============================================================================
  // ORGANIZATIONS TABLE - Core multi-tenancy
  // ============================================================================
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.string('subdomain', 100).unique();
    table.string('tier', 50).notNullable().defaultTo('free');
    table.string('deployment_model', 50).notNullable().defaultTo('shared');
    table.string('database_name', 100);
    table.string('status', 50).notNullable().defaultTo('active');
    table.string('contact_email', 255);
    table.string('contact_phone', 50);
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.string('postal_code', 20);
    table.string('timezone', 100).defaultTo('America/Paramaribo');
    table.string('currency', 10).defaultTo('SRD');
    table.string('language', 10).defaultTo('en');
    table.string('logo_url', 500);
    table.string('website', 500);
    table.integer('employee_count');
    table.string('industry', 100);
    table.jsonb('metadata').defaultTo('{}');
    table.jsonb('settings').defaultTo('{}');
    table.string('session_policy', 20).defaultTo('multiple');
    table.integer('max_sessions_per_user').defaultTo(5);
    table.boolean('concurrent_login_detection').defaultTo(true);
    table.boolean('mfa_required').defaultTo(false);
    table.timestamp('mfa_enforcement_date');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_organizations_slug ON organizations(slug);
    CREATE INDEX idx_organizations_tier ON organizations(tier);
    CREATE INDEX idx_organizations_deployment ON organizations(deployment_model);
    CREATE INDEX idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE organizations IS 'Multi-tenant organizations. Each tenant has their own organization record.';
    COMMENT ON COLUMN organizations.session_policy IS 'Session policy: "single" = one session per user (license enforcement), "multiple" = allow multiple devices (default)';
    COMMENT ON COLUMN organizations.max_sessions_per_user IS 'Maximum concurrent sessions per user when session_policy = "multiple"';
    COMMENT ON COLUMN organizations.concurrent_login_detection IS 'Enable detection of simultaneous logins from different IPs/locations';
    COMMENT ON COLUMN organizations.mfa_required IS 'Whether MFA is mandatory for all users in this organization';
  `);

  // ============================================================================
  // RBAC SYSTEM - Permissions, Roles, and Mappings
  // ============================================================================
  
  // Permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('product', 50).notNullable();
    table.string('name', 255).notNullable();
    table.string('category', 100);
    table.text('description');
    table.unique(['product', 'name']);
  });

  await knex.raw(`
    CREATE INDEX idx_permissions_product ON permissions(product);
    CREATE INDEX idx_permissions_name ON permissions(name);
    CREATE INDEX idx_permissions_category ON permissions(category);
    
    COMMENT ON TABLE permissions IS 'Product-specific permissions seeded by each product (paylinq, nexus, recruitiq, etc.)';
  `);

  // Roles table
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('role_type', 20).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'name']);
  });

  await knex.raw(`
    CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_roles_type ON roles(role_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_roles_active ON roles(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE roles IS 'Organization-specific roles. Each tenant organization gets seeded with system roles and can create custom roles.';
  `);

  // Role Permissions mapping
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.uuid('created_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['role_id', 'permission_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_role_permissions_role ON role_permissions(role_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id) WHERE deleted_at IS NULL;
  `);

  // User Roles mapping
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable();
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('granted_by');
    table.uuid('revoked_by');
    table.timestamp('granted_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('revoked_at');
    table.timestamp('deleted_at');
    table.unique(['user_id', 'role_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE deleted_at IS NULL;
    
    COMMENT ON COLUMN user_roles.user_id IS 'References either hris.user_account.id or platform_users.id';
  `);

  // Email Settings
  await knex.schema.createTable('email_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().unique().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('smtp_host', 255);
    table.integer('smtp_port');
    table.string('smtp_user', 255);
    table.string('smtp_password', 500);
    table.boolean('smtp_secure').defaultTo(true);
    table.string('from_email', 255);
    table.string('from_name', 255);
    table.string('reply_to_email', 255);
    table.jsonb('email_templates').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_email_settings_organization ON email_settings(organization_id);
  `);

  // ============================================================================
  // CREATE HRIS SCHEMA
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');

  // ============================================================================
  // HRIS: DEPARTMENTS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('department', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('department_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.uuid('parent_department_id');
    table.uuid('manager_id');
    table.string('cost_center', 50);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'department_code']);
  });

  // Add self-referential FK after table creation
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT fk_department_parent 
    FOREIGN KEY (parent_department_id) REFERENCES hris.department(id) ON DELETE SET NULL;
  `);

  await knex.raw(`
    CREATE INDEX idx_department_org ON hris.department(organization_id);
    CREATE INDEX idx_department_parent ON hris.department(parent_department_id);
    CREATE INDEX idx_department_active ON hris.department(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.department IS 'Organizational departments with hierarchical structure';
  `);

  // ============================================================================
  // HRIS: LOCATIONS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('location', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('location_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.string('postal_code', 20);
    table.string('phone', 50);
    table.string('timezone', 100);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'location_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_location_org ON hris.location(organization_id);
    CREATE INDEX idx_location_active ON hris.location(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.location IS 'Physical work locations for the organization';
  `);

  // ============================================================================
  // HRIS: WORKER TYPES
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('worker_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.boolean('benefits_eligible').defaultTo(false);
    table.decimal('vacation_accrual_rate', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'name']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_org ON hris.worker_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_active ON hris.worker_type(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_code ON hris.worker_type(code) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.worker_type IS 'Employee classification types (Full-Time, Part-Time, Contractor, etc.)';
  `);

  // ============================================================================
  // HRIS: EMPLOYEES - Core employee records
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('employee_number', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('middle_name', 100);
    table.string('last_name', 100).notNullable();
    table.string('preferred_name', 100);
    table.string('email', 255);
    table.string('personal_email', 255);
    table.string('phone', 50);
    table.string('mobile', 50);
    table.date('date_of_birth');
    table.string('gender', 20);
    table.string('marital_status', 20);
    table.string('nationality', 100);
    table.string('id_type', 50);
    table.string('id_number', 100);
    table.date('id_expiry_date');
    table.text('address_line_1');
    table.text('address_line_2');
    table.string('city', 100);
    table.string('state', 100);
    table.string('postal_code', 20);
    table.string('country', 100);
    table.uuid('department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('worker_type_id').references('id').inTable('hris.worker_type').onDelete('SET NULL');
    table.uuid('manager_id');
    table.string('job_title', 255);
    table.date('hire_date');
    table.date('termination_date');
    table.string('employment_status', 50).defaultTo('active');
    table.string('termination_reason', 255);
    table.text('termination_notes');
    table.string('profile_image_url', 500);
    table.string('emergency_contact_name', 255);
    table.string('emergency_contact_relationship', 100);
    table.string('emergency_contact_phone', 50);
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_number']);
  });

  // Add self-referential FK for manager
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT fk_employee_manager 
    FOREIGN KEY (manager_id) REFERENCES hris.employee(id) ON DELETE SET NULL;
  `);

  // Add manager_id FK to department now that employee exists
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT fk_department_manager 
    FOREIGN KEY (manager_id) REFERENCES hris.employee(id) ON DELETE SET NULL;
  `);

  await knex.raw(`
    CREATE INDEX idx_employee_org ON hris.employee(organization_id);
    CREATE INDEX idx_employee_department ON hris.employee(department_id);
    CREATE INDEX idx_employee_location ON hris.employee(location_id);
    CREATE INDEX idx_employee_worker_type ON hris.employee(worker_type_id);
    CREATE INDEX idx_employee_manager ON hris.employee(manager_id);
    CREATE INDEX idx_employee_status ON hris.employee(employment_status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_employee_email ON hris.employee(email) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.employee IS 'Core employee records. Single source of truth for all employee data.';
    COMMENT ON COLUMN hris.employee.employment_status IS 'Status: active, on_leave, terminated, suspended';
  `);

  // ============================================================================
  // HRIS: USER ACCOUNTS - Tenant users with login access
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('user_account', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('hris.employee').onDelete('SET NULL');
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.string('phone', 50);
    table.string('profile_image_url', 500);
    table.jsonb('enabled_products').defaultTo('[]');
    table.jsonb('product_roles').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255);
    table.timestamp('email_verification_expires');
    table.string('password_reset_token', 255);
    table.timestamp('password_reset_expires');
    table.string('mfa_secret', 255);
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('last_login_ip', 45);
    table.timestamp('last_login_at');
    table.jsonb('preferences').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'email']);
  });

  await knex.raw(`
    CREATE INDEX idx_user_account_org ON hris.user_account(organization_id);
    CREATE INDEX idx_user_account_email ON hris.user_account(email);
    CREATE INDEX idx_user_account_active ON hris.user_account(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_account_employee ON hris.user_account(employee_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.user_account IS 'Tenant users with login access to product applications.';
    COMMENT ON COLUMN hris.user_account.employee_id IS 'Optional link to hris.employee. Not all employees have login access.';
  `);

  // ============================================================================
  // HRIS: TENANT REFRESH TOKENS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('tenant_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_account_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('token', 500).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at');
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_tenant_refresh_tokens_user ON hris.tenant_refresh_tokens(user_account_id);
    CREATE INDEX idx_tenant_refresh_tokens_token ON hris.tenant_refresh_tokens(token);
    CREATE INDEX idx_tenant_refresh_tokens_org ON hris.tenant_refresh_tokens(organization_id);
    CREATE INDEX idx_tenant_refresh_tokens_expires ON hris.tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;
    
    COMMENT ON TABLE hris.tenant_refresh_tokens IS 'Refresh tokens for tenant user authentication';
  `);

  // ============================================================================
  // HELPER FUNCTION FOR RLS
  // ============================================================================
  await knex.raw(`
    CREATE OR REPLACE FUNCTION public.get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id TEXT;
    BEGIN
      org_id := current_setting('app.current_organization_id', true);
      
      IF org_id IS NULL OR org_id = '' THEN
        RAISE EXCEPTION 'No organization context set. Authentication required.';
      END IF;
      
      RETURN org_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid organization context: %', SQLERRM;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
    
    COMMENT ON FUNCTION public.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware.';
  `);

  console.log('✓ HRIS schema migration complete');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Drop helper function
  await knex.raw('DROP FUNCTION IF EXISTS public.get_current_organization_id() CASCADE');
  
  // Drop HRIS tables in reverse dependency order
  await knex.schema.withSchema('hris').dropTableIfExists('tenant_refresh_tokens');
  await knex.schema.withSchema('hris').dropTableIfExists('user_account');
  
  // Remove FK constraints before dropping
  await knex.raw('ALTER TABLE hris.department DROP CONSTRAINT IF EXISTS fk_department_manager');
  await knex.raw('ALTER TABLE hris.employee DROP CONSTRAINT IF EXISTS fk_employee_manager');
  await knex.raw('ALTER TABLE hris.department DROP CONSTRAINT IF EXISTS fk_department_parent');
  
  await knex.schema.withSchema('hris').dropTableIfExists('employee');
  await knex.schema.withSchema('hris').dropTableIfExists('worker_type');
  await knex.schema.withSchema('hris').dropTableIfExists('location');
  await knex.schema.withSchema('hris').dropTableIfExists('department');
  
  // Drop HRIS schema
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
  
  // Drop core tables
  await knex.schema.dropTableIfExists('email_settings');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('organizations');

  console.log('✓ HRIS schema rollback complete');
}
