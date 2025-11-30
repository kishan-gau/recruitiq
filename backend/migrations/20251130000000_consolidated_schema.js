/**
 * Consolidated Database Schema Migration
 * 
 * This migration consolidates all schemas:
 * - Core Platform (organizations, RBAC, email settings)
 * - HRIS Schema (user accounts, employees, departments, locations)
 * - PayLinQ Schema (payroll configuration, compensation, worker metadata)
 * - RecruitIQ Schema (workspaces, jobs, candidates, applications)
 * - ScheduleHub Schema (schedules, shifts, stations)
 * - Central Logging (system logs, security events)
 * 
 * Created: November 30, 2025
 * Version: 1.0.0
 */

exports.up = async function(knex) {
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

  await knex.schema.raw(`
    CREATE INDEX idx_organizations_slug ON organizations(slug);
    CREATE INDEX idx_organizations_tier ON organizations(tier);
    CREATE INDEX idx_organizations_deployment ON organizations(deployment_model);
    
    COMMENT ON COLUMN organizations.session_policy IS 'Session policy: "single" = one session per user (license enforcement), "multiple" = allow multiple devices (default)';
    COMMENT ON COLUMN organizations.max_sessions_per_user IS 'Maximum concurrent sessions per user when session_policy = "multiple"';
    COMMENT ON COLUMN organizations.concurrent_login_detection IS 'Enable detection of simultaneous logins from different IPs/locations';
    COMMENT ON COLUMN organizations.mfa_required IS 'Whether MFA is mandatory for all users in this organization (cannot be disabled by users). TRUE for shared deployments for security.';
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

  await knex.schema.raw(`
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

  await knex.schema.raw(`
    CREATE INDEX idx_roles_organization ON roles(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_roles_type ON roles(role_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_roles_active ON roles(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE roles IS 'Organization-specific roles. Each tenant organization gets seeded with system roles (owner, admin, etc.) and can create custom roles.';
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

  await knex.schema.raw(`
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

  await knex.schema.raw(`
    CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE deleted_at IS NULL;
    
    COMMENT ON COLUMN user_roles.user_id IS 'References either hris.user_account.id or platform_users.id (no FK constraint to support both)';
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

  await knex.schema.raw(`
    CREATE INDEX idx_email_settings_organization ON email_settings(organization_id);
  `);

  // ============================================================================
  // CREATE HRIS SCHEMA
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');

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

  await knex.schema.raw(`
    CREATE INDEX idx_user_account_org ON hris.user_account(organization_id);
    CREATE INDEX idx_user_account_email ON hris.user_account(email);
    CREATE INDEX idx_user_account_active ON hris.user_account(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.user_account IS 'Tenant users with login access to product applications (Nexus, PayLinQ, ScheduleHub, RecruitIQ). Linked to employee records but not all employees have user accounts.';
    COMMENT ON COLUMN hris.user_account.employee_id IS 'Optional link to hris.employee. Not all employees have login access, and some users (like external contractors) may have accounts without employee records.';
  `);

  // Tenant Refresh Tokens
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

  await knex.schema.raw(`
    CREATE INDEX idx_tenant_refresh_tokens_user ON hris.tenant_refresh_tokens(user_account_id);
    CREATE INDEX idx_tenant_refresh_tokens_token ON hris.tenant_refresh_tokens(token);
    CREATE INDEX idx_tenant_refresh_tokens_org ON hris.tenant_refresh_tokens(organization_id);
    CREATE INDEX idx_tenant_refresh_tokens_expires ON hris.tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;
  `);

  // ============================================================================
  // HRIS: DEPARTMENTS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('department', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('department_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.uuid('parent_department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('manager_id').references('id').inTable('hris.employee').onDelete('SET NULL');
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

  await knex.schema.raw(`
    CREATE INDEX idx_department_org ON hris.department(organization_id);
    CREATE INDEX idx_department_parent ON hris.department(parent_department_id);
    CREATE INDEX idx_department_active ON hris.department(is_active) WHERE deleted_at IS NULL;
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

  await knex.schema.raw(`
    CREATE INDEX idx_location_org ON hris.location(organization_id);
    CREATE INDEX idx_location_active ON hris.location(is_active) WHERE deleted_at IS NULL;
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

  await knex.schema.raw(`
    CREATE INDEX idx_worker_type_org ON hris.worker_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_active ON hris.worker_type(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_code ON hris.worker_type(code) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.worker_type IS 'Employee classification types (Full-Time, Part-Time, Contractor, etc.) - HRIS owns these';
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
    table.uuid('manager_id').references('id').inTable('hris.employee').onDelete('SET NULL');
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

  await knex.schema.raw(`
    CREATE INDEX idx_employee_org ON hris.employee(organization_id);
    CREATE INDEX idx_employee_department ON hris.employee(department_id);
    CREATE INDEX idx_employee_location ON hris.employee(location_id);
    CREATE INDEX idx_employee_worker_type ON hris.employee(worker_type_id);
    CREATE INDEX idx_employee_manager ON hris.employee(manager_id);
    CREATE INDEX idx_employee_status ON hris.employee(employment_status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_employee_email ON hris.employee(email) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE hris.employee IS 'Core employee records. Not all employees have user_account (login access). Some may be terminated or on leave but retained for historical records.';
  `);

  console.log('✓ Core HRIS schema complete (organizations, RBAC, user_accounts, departments, locations, worker_types, employees)');

  // ============================================================================
  // CREATE PAYROLL SCHEMA
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS payroll');

  // ============================================================================
  // PAYLINQ: WORKER METADATA - Payroll-specific employee configuration
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('worker_metadata', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('tax_id', 50);
    table.string('bank_account_number', 100);
    table.string('bank_name', 255);
    table.string('payment_method', 50).defaultTo('bank_transfer');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_worker_metadata_org ON payroll.worker_metadata(organization_id);
    CREATE INDEX idx_worker_metadata_employee ON payroll.worker_metadata(employee_id);
    
    COMMENT ON TABLE payroll.worker_metadata IS 'PayLinQ-specific employee data (tax info, bank details) separate from core HRIS data';
  `);

  // ============================================================================
  // PAYLINQ: COMPENSATION - Employee compensation configuration
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('compensation', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('pay_component_id').notNullable().references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 10).defaultTo('SRD');
    table.string('frequency', 50).notNullable();
    table.date('effective_date').notNullable();
    table.date('end_date');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_compensation_org ON payroll.compensation(organization_id);
    CREATE INDEX idx_compensation_employee ON payroll.compensation(employee_id);
    CREATE INDEX idx_compensation_component ON payroll.compensation(pay_component_id);
    CREATE INDEX idx_compensation_active ON payroll.compensation(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.compensation IS 'Employee-specific compensation records linking employees to pay components with amounts';
  `);

  // ============================================================================
  // PAYLINQ: PAYROLL RUNS - Payroll processing batches
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_run', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('run_number', 50).notNullable();
    table.string('run_name', 255);
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('pay_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.integer('employee_count').defaultTo(0);
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.string('currency', 10).defaultTo('SRD');
    table.timestamp('approved_at');
    table.uuid('approved_by');
    table.timestamp('processed_at');
    table.uuid('processed_by');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'run_number']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_payroll_run_org ON payroll.payroll_run(organization_id);
    CREATE INDEX idx_payroll_run_status ON payroll.payroll_run(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_period ON payroll.payroll_run(pay_period_start, pay_period_end);
    
    COMMENT ON TABLE payroll.payroll_run IS 'Payroll processing batches for a specific pay period';
    COMMENT ON COLUMN payroll.payroll_run.status IS 'Statuses: draft, pending_approval, approved, processing, processed, failed';
  `);

  // ============================================================================
  // PAYLINQ: PAYROLL RUN LINES - Individual employee payroll records
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('payroll_run_line', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('payroll_run_id').notNullable().references('id').inTable('payroll.payroll_run').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.decimal('gross_pay', 15, 2).notNullable();
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('net_pay', 15, 2).notNullable();
    table.string('currency', 10).defaultTo('SRD');
    table.string('status', 50).defaultTo('pending');
    table.jsonb('line_items').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_payroll_run_line_org ON payroll.payroll_run_line(organization_id);
    CREATE INDEX idx_payroll_run_line_run ON payroll.payroll_run_line(payroll_run_id);
    CREATE INDEX idx_payroll_run_line_employee ON payroll.payroll_run_line(employee_id);
    
    COMMENT ON TABLE payroll.payroll_run_line IS 'Individual employee payroll records within a payroll run';
  `);

  // ============================================================================
  // PAYLINQ: TAX TABLES - Tax calculation rules
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('tax_table', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('tax_code', 50).notNullable();
    table.string('tax_name', 255).notNullable();
    table.string('tax_type', 50).notNullable();
    table.decimal('rate', 10, 4);
    table.decimal('threshold', 15, 2);
    table.string('calculation_method', 50);
    table.jsonb('brackets').defaultTo('[]');
    table.date('effective_date').notNullable();
    table.date('end_date');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'tax_code', 'effective_date']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_tax_table_org ON payroll.tax_table(organization_id);
    CREATE INDEX idx_tax_table_type ON payroll.tax_table(tax_type);
    CREATE INDEX idx_tax_table_active ON payroll.tax_table(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.tax_table IS 'Tax calculation rules with rates, thresholds, and brackets';
  `);

  // ============================================================================
  // PAYLINQ: TIME ATTENDANCE EVENT - Clock in/out events
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('time_attendance_event', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('event_type', 50).notNullable();
    table.timestamp('event_timestamp').notNullable();
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    table.string('location_name', 255);
    table.string('device_info', 500);
    table.string('ip_address', 45);
    table.boolean('is_manual').defaultTo(false);
    table.uuid('approved_by');
    table.timestamp('approved_at');
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_time_event_org ON payroll.time_attendance_event(organization_id);
    CREATE INDEX idx_time_event_employee ON payroll.time_attendance_event(employee_id);
    CREATE INDEX idx_time_event_timestamp ON payroll.time_attendance_event(event_timestamp);
    CREATE INDEX idx_time_event_type ON payroll.time_attendance_event(event_type);
    
    COMMENT ON TABLE payroll.time_attendance_event IS 'Individual clock in/out events with geolocation';
    COMMENT ON COLUMN payroll.time_attendance_event.event_type IS 'Event types: clock_in, clock_out, break_start, break_end';
  `);

  // ============================================================================
  // PAYLINQ: TIME ENTRY - Daily work time records
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('time_entry', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('work_date').notNullable();
    table.timestamp('clock_in');
    table.timestamp('clock_out');
    table.decimal('regular_hours', 5, 2).defaultTo(0);
    table.decimal('overtime_hours', 5, 2).defaultTo(0);
    table.decimal('break_hours', 5, 2).defaultTo(0);
    table.decimal('total_hours', 5, 2).defaultTo(0);
    table.string('status', 50).defaultTo('pending');
    table.uuid('approved_by');
    table.timestamp('approved_at');
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_id', 'work_date']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_time_entry_org ON payroll.time_entry(organization_id);
    CREATE INDEX idx_time_entry_employee ON payroll.time_entry(employee_id);
    CREATE INDEX idx_time_entry_date ON payroll.time_entry(work_date);
    CREATE INDEX idx_time_entry_status ON payroll.time_entry(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.time_entry IS 'Daily work time records with regular and overtime hours';
    COMMENT ON COLUMN payroll.time_entry.status IS 'Statuses: pending, approved, rejected, processed';
  `);

  // ============================================================================
  // PAYLINQ: TIMESHEET - Weekly/period time summaries
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('timesheet', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.decimal('total_regular_hours', 8, 2).defaultTo(0);
    table.decimal('total_overtime_hours', 8, 2).defaultTo(0);
    table.decimal('total_hours', 8, 2).defaultTo(0);
    table.string('status', 50).defaultTo('draft');
    table.uuid('submitted_by');
    table.timestamp('submitted_at');
    table.uuid('approved_by');
    table.timestamp('approved_at');
    table.text('notes');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'employee_id', 'period_start']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_timesheet_org ON payroll.timesheet(organization_id);
    CREATE INDEX idx_timesheet_employee ON payroll.timesheet(employee_id);
    CREATE INDEX idx_timesheet_period ON payroll.timesheet(period_start, period_end);
    CREATE INDEX idx_timesheet_status ON payroll.timesheet(status) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.timesheet IS 'Weekly or period-based time summaries for employees';
    COMMENT ON COLUMN payroll.timesheet.status IS 'Statuses: draft, submitted, approved, rejected';
  `);

  // ============================================================================
  // PAYLINQ: PAY COMPONENT - Salary components (earnings/deductions)
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('pay_component', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('component_code', 50).notNullable();
    table.string('component_name', 255).notNullable();
    table.string('component_type', 50).notNullable();
    table.text('description');
    table.string('calculation_type', 50).notNullable();
    table.decimal('fixed_amount', 15, 2);
    table.decimal('rate', 10, 4);
    table.string('base_component', 50);
    table.boolean('is_taxable').defaultTo(true);
    table.boolean('is_recurring').defaultTo(false);
    table.boolean('is_prorated').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.jsonb('calculation_metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'component_code']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_pay_component_org ON payroll.pay_component(organization_id);
    CREATE INDEX idx_pay_component_type ON payroll.pay_component(component_type);
    CREATE INDEX idx_pay_component_active ON payroll.pay_component(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.pay_component IS 'Reusable pay components for earnings, deductions, and benefits';
    COMMENT ON COLUMN payroll.pay_component.component_type IS 'Types: earning, deduction, benefit, reimbursement';
    COMMENT ON COLUMN payroll.pay_component.calculation_type IS 'Types: fixed, percentage, formula, hourly, daily';
  `);

  // ============================================================================
  // PAYLINQ: COMPONENT FORMULA - Custom calculation formulas
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('component_formula', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('component_id').notNullable().references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    table.string('formula_name', 255).notNullable();
    table.text('formula_expression').notNullable();
    table.text('description');
    table.string('formula_language', 50).defaultTo('javascript');
    table.jsonb('variables').defaultTo('[]');
    table.jsonb('conditions').defaultTo('[]');
    table.integer('priority').defaultTo(0);
    table.date('effective_date');
    table.date('end_date');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_component_formula_org ON payroll.component_formula(organization_id);
    CREATE INDEX idx_component_formula_component ON payroll.component_formula(component_id);
    CREATE INDEX idx_component_formula_active ON payroll.component_formula(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE payroll.component_formula IS 'Custom formulas for dynamic pay component calculations';
    COMMENT ON COLUMN payroll.component_formula.formula_language IS 'Supported: javascript, sql, excel';
  `);

  // ============================================================================
  // PAYLINQ: FORMULA EXECUTION LOG - Audit trail for formula calculations
  // ============================================================================
  await knex.schema.withSchema('payroll').createTable('formula_execution_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('formula_id').notNullable().references('id').inTable('payroll.component_formula').onDelete('CASCADE');
    table.uuid('employee_id').references('id').inTable('hris.employee').onDelete('SET NULL');
    table.uuid('payroll_run_id').references('id').inTable('payroll.payroll_run').onDelete('SET NULL');
    table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());
    table.jsonb('input_data').defaultTo('{}');
    table.decimal('calculated_result', 15, 2);
    table.string('execution_status', 50).notNullable();
    table.text('error_message');
    table.integer('execution_time_ms');
    table.uuid('executed_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_formula_log_org ON payroll.formula_execution_log(organization_id);
    CREATE INDEX idx_formula_log_formula ON payroll.formula_execution_log(formula_id);
    CREATE INDEX idx_formula_log_employee ON payroll.formula_execution_log(employee_id);
    CREATE INDEX idx_formula_log_run ON payroll.formula_execution_log(payroll_run_id);
    CREATE INDEX idx_formula_log_executed ON payroll.formula_execution_log(executed_at);
    
    COMMENT ON TABLE payroll.formula_execution_log IS 'Audit trail for all formula calculations with inputs and results';
    COMMENT ON COLUMN payroll.formula_execution_log.execution_status IS 'Statuses: success, error, timeout';
  `);

  console.log('✓ PayLinQ extended tables complete (time_attendance, time_entry, timesheet, pay_component, formulas)');

  // ================================================================
  // CHUNK 3: PAYLINQ SCHEMA - PART 2
  // Tables: employee_pay_component_assignment, rated_time_line, 
  //         employee_deduction, tax_rule_set, tax_bracket, allowance,
  //         loontijdvak, payroll_run_type, employee_payroll_config,
  //         worker_type_pay_config, worker_type_history, shift_type,
  //         pay_structure_template_resolution_cache
  // ================================================================

  // Employee pay component assignment
  await knex.schema.withSchema('payroll').createTable('employee_pay_component_assignment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('pay_component_id').notNullable().references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    
    // Assignment Details
    table.string('assignment_type', 50).notNullable().checkIn(['mandatory', 'optional', 'conditional']);
    table.decimal('custom_rate', 15, 2);
    table.decimal('custom_percentage', 5, 2);
    table.jsonb('calculation_rules');
    
    // Effective dates
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'employee_id', 'pay_component_id', 'effective_from']);
  });

  await knex.raw(`
    CREATE INDEX idx_emp_pay_comp_org ON payroll.employee_pay_component_assignment(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_pay_comp_employee ON payroll.employee_pay_component_assignment(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_pay_comp_component ON payroll.employee_pay_component_assignment(pay_component_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_pay_comp_active ON payroll.employee_pay_component_assignment(is_active) WHERE deleted_at IS NULL;
  `);

  // Rated time line
  await knex.schema.withSchema('payroll').createTable('rated_time_line', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('time_entry_id').notNullable().references('id').inTable('payroll.time_entry').onDelete('CASCADE');
    table.uuid('pay_component_id').notNullable().references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    
    // Time breakdown
    table.decimal('hours', 10, 2).notNullable();
    table.string('rate_type', 50).notNullable().checkIn(['regular', 'overtime', 'double_time', 'holiday', 'shift_differential']);
    table.decimal('rate_multiplier', 5, 2).defaultTo(1.00);
    table.decimal('hourly_rate', 15, 2);
    table.decimal('amount', 15, 2);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_rated_time_line_org ON payroll.rated_time_line(organization_id);
    CREATE INDEX idx_rated_time_line_entry ON payroll.rated_time_line(time_entry_id);
    CREATE INDEX idx_rated_time_line_component ON payroll.rated_time_line(pay_component_id);
  `);

  // Employee deduction
  await knex.schema.withSchema('payroll').createTable('employee_deduction', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('pay_component_id').notNullable().references('id').inTable('payroll.pay_component').onDelete('CASCADE');
    
    // Deduction Configuration
    table.string('deduction_type', 50).notNullable().checkIn(['tax', 'retirement', 'insurance', 'garnishment', 'loan', 'other']);
    table.string('calculation_method', 50).notNullable().checkIn(['fixed', 'percentage', 'formula']);
    table.decimal('amount', 15, 2);
    table.decimal('percentage', 5, 2);
    table.decimal('employer_contribution', 15, 2);
    
    // Limits
    table.decimal('min_amount', 15, 2);
    table.decimal('max_amount', 15, 2);
    table.decimal('ytd_amount', 15, 2).defaultTo(0);
    table.decimal('ytd_limit', 15, 2);
    
    // Frequency and Timing
    table.string('frequency', 50);
    table.integer('priority').defaultTo(100);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.date('effective_from').notNullable();
    table.date('effective_to');
    
    // Notes
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_emp_deduction_org ON payroll.employee_deduction(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_deduction_employee ON payroll.employee_deduction(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_deduction_component ON payroll.employee_deduction(pay_component_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_deduction_active ON payroll.employee_deduction(is_active) WHERE deleted_at IS NULL;
  `);

  // Tax rule set
  await knex.schema.withSchema('payroll').createTable('tax_rule_set', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Rule identification
    table.string('rule_code', 50).notNullable();
    table.string('rule_name', 200).notNullable();
    table.string('rule_type', 50).notNullable().checkIn(['income_tax', 'payroll_tax', 'social_security', 'other']);
    
    // Geographic scope
    table.string('country', 2).defaultTo('SR');
    table.string('state_province', 100);
    table.string('locality', 100);
    
    // Effective period
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    
    // Configuration
    table.jsonb('configuration');
    table.text('description');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'rule_code', 'effective_from']);
  });

  await knex.raw(`
    CREATE INDEX idx_tax_rule_set_org ON payroll.tax_rule_set(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tax_rule_set_code ON payroll.tax_rule_set(rule_code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tax_rule_set_type ON payroll.tax_rule_set(rule_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tax_rule_set_active ON payroll.tax_rule_set(is_active) WHERE deleted_at IS NULL;
  `);

  // Tax bracket
  await knex.schema.withSchema('payroll').createTable('tax_bracket', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('tax_rule_set_id').notNullable().references('id').inTable('payroll.tax_rule_set').onDelete('CASCADE');
    
    // Bracket definition
    table.decimal('income_from', 15, 2).notNullable();
    table.decimal('income_to', 15, 2);
    table.decimal('tax_rate', 5, 4).notNullable();
    table.decimal('fixed_amount', 15, 2).defaultTo(0);
    
    // Display
    table.integer('bracket_order').notNullable();
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_tax_bracket_org ON payroll.tax_bracket(organization_id);
    CREATE INDEX idx_tax_bracket_rule_set ON payroll.tax_bracket(tax_rule_set_id);
    CREATE INDEX idx_tax_bracket_range ON payroll.tax_bracket(income_from, income_to);
  `);

  // Allowance
  await knex.schema.withSchema('payroll').createTable('allowance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Allowance details
    table.string('allowance_type', 50).notNullable().checkIn(['housing', 'transport', 'meal', 'phone', 'education', 'other']);
    table.string('allowance_name', 100).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('frequency', 20).notNullable().checkIn(['monthly', 'quarterly', 'annual', 'one_time']);
    table.boolean('is_taxable').defaultTo(true);
    
    // Effective period
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_active').defaultTo(true);
    
    // Notes
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_allowance_org ON payroll.allowance(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_allowance_employee ON payroll.allowance(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_allowance_type ON payroll.allowance(allowance_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_allowance_active ON payroll.allowance(is_active) WHERE deleted_at IS NULL;
  `);

  // Loontijdvak (Suriname-specific payroll period)
  await knex.schema.withSchema('payroll').createTable('loontijdvak', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Period identification
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.string('period_type', 20).notNullable().checkIn(['daily', 'weekly', 'biweekly', 'monthly']);
    table.integer('year').notNullable();
    table.integer('period_number').notNullable();
    
    // Date range
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.date('payment_date');
    
    // Tax configuration
    table.decimal('tax_free_amount', 15, 2);
    table.jsonb('tax_parameters');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_locked').defaultTo(false);
    
    // Notes
    table.text('notes');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'code']);
  });

  await knex.raw(`
    CREATE INDEX idx_loontijdvak_org ON payroll.loontijdvak(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_year ON payroll.loontijdvak(year) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_period ON payroll.loontijdvak(period_type, period_number) WHERE deleted_at IS NULL;
    CREATE INDEX idx_loontijdvak_dates ON payroll.loontijdvak(start_date, end_date) WHERE deleted_at IS NULL;
  `);

  // Payroll run type
  await knex.schema.withSchema('payroll').createTable('payroll_run_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Type identification
    table.string('type_code', 50).notNullable();
    table.string('type_name', 200).notNullable();
    table.text('description');
    
    // Component configuration
    table.string('component_override_mode', 50).notNullable().defaultTo('inherit').checkIn(['inherit', 'explicit', 'exclude']);
    table.jsonb('allowed_components');
    table.jsonb('excluded_components');
    
    // Run configuration
    table.jsonb('default_settings');
    table.boolean('requires_approval').defaultTo(false);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'type_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_payroll_run_type_org ON payroll.payroll_run_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_type_code ON payroll.payroll_run_type(type_code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_payroll_run_type_active ON payroll.payroll_run_type(is_active) WHERE deleted_at IS NULL;
  `);

  // Employee payroll config
  await knex.schema.withSchema('payroll').createTable('employee_payroll_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Pay configuration
    table.string('pay_frequency', 20).notNullable().checkIn(['weekly', 'biweekly', 'semimonthly', 'monthly']);
    table.string('payment_method', 20).notNullable().checkIn(['direct_deposit', 'check', 'cash', 'card']);
    table.string('currency', 3).defaultTo('SRD');
    
    // Bank information
    table.string('bank_name', 100);
    table.string('account_number', 50);
    table.string('routing_number', 50);
    
    // Tax information
    table.string('tax_id', 50);
    table.string('tax_filing_status', 20);
    table.integer('tax_allowances').defaultTo(0);
    
    // Payroll status
    table.string('payroll_status', 20).defaultTo('active').checkIn(['active', 'suspended', 'terminated']);
    table.date('payroll_start_date').notNullable();
    table.date('payroll_end_date');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'employee_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_emp_payroll_config_org ON payroll.employee_payroll_config(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_payroll_config_employee ON payroll.employee_payroll_config(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_emp_payroll_config_status ON payroll.employee_payroll_config(payroll_status) WHERE deleted_at IS NULL;
  `);

  // Worker type pay config
  await knex.schema.withSchema('payroll').createTable('worker_type_pay_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('worker_type_id').notNullable().references('id').inTable('hris.worker_type').onDelete('CASCADE');
    
    // Pay configuration
    table.string('pay_structure_template_code', 50);
    table.string('default_pay_frequency', 20);
    table.string('default_payment_method', 20);
    table.boolean('overtime_eligible').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'worker_type_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_pay_config_org ON payroll.worker_type_pay_config(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_pay_config_worker_type ON payroll.worker_type_pay_config(worker_type_id) WHERE deleted_at IS NULL;
  `);

  // Worker type history
  await knex.schema.withSchema('payroll').createTable('worker_type_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('worker_type_id').notNullable().references('id').inTable('hris.worker_type').onDelete('CASCADE');
    
    // Assignment details
    table.date('effective_from').notNullable();
    table.date('effective_to');
    table.boolean('is_current').defaultTo(true);
    table.string('pay_frequency', 20);
    table.string('payment_method', 20);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'employee_id', 'worker_type_id', 'effective_from']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_history_org ON payroll.worker_type_history(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_history_employee ON payroll.worker_type_history(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_worker_type_history_current ON payroll.worker_type_history(is_current) WHERE deleted_at IS NULL;
  `);

  // Shift type
  await knex.schema.withSchema('payroll').createTable('shift_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Shift identification
    table.string('code', 50).notNullable();
    table.string('name', 200).notNullable();
    table.text('description');
    
    // Time configuration
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.decimal('standard_hours', 5, 2);
    table.decimal('overtime_multiplier', 5, 2).defaultTo(1.5);
    
    // Pay configuration
    table.boolean('qualifies_for_shift_differential').defaultTo(false);
    table.decimal('shift_differential_rate', 5, 2);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.uuid('deleted_by').references('id').inTable('hris.user_account');
    
    table.unique(['organization_id', 'code']);
  });

  await knex.raw(`
    CREATE INDEX idx_shift_type_org ON payroll.shift_type(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_shift_type_code ON payroll.shift_type(code) WHERE deleted_at IS NULL;
    CREATE INDEX idx_shift_type_active ON payroll.shift_type(is_active) WHERE deleted_at IS NULL;
  `);

  // Pay structure template resolution cache
  await knex.schema.withSchema('payroll').createTable('pay_structure_template_resolution_cache', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('template_code', 50).notNullable();
    table.string('cache_key', 255).notNullable();
    table.jsonb('resolved_components').notNullable();
    table.timestamp('cached_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true });
    
    table.unique(['organization_id', 'cache_key']);
  });

  await knex.raw(`
    CREATE INDEX idx_pay_template_cache_org ON payroll.pay_structure_template_resolution_cache(organization_id);
    CREATE INDEX idx_pay_template_cache_template ON payroll.pay_structure_template_resolution_cache(template_code);
    CREATE INDEX idx_pay_template_cache_expires ON payroll.pay_structure_template_resolution_cache(expires_at);
  `);

  console.log('✓ PayLinQ additional tables complete (employee_pay_component_assignment, tax tables, allowances, etc.)');

  // ============================================================================
  // CREATE WORKSPACES SCHEMA - RecruitIQ multi-workspace structure
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS workspaces');

  // ============================================================================
  // RECRUITIQ: WORKSPACES - Organizational units for hiring
  // ============================================================================
  await knex.schema.withSchema('workspaces').createTable('workspace', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('workspace_type', 50).defaultTo('department');
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_workspace_org ON workspaces.workspace(organization_id);
    CREATE INDEX idx_workspace_active ON workspaces.workspace(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE workspaces.workspace IS 'RecruitIQ workspaces for organizing hiring activities';
  `);

  // ============================================================================
  // RECRUITIQ: JOBS - Job postings
  // ============================================================================
  await knex.schema.withSchema('workspaces').createTable('job', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces.workspace').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.uuid('department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.string('employment_type', 50);
    table.integer('salary_min');
    table.integer('salary_max');
    table.string('salary_currency', 10).defaultTo('SRD');
    table.string('status', 50).notNullable().defaultTo('draft');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at');
    table.date('closing_date');
    table.jsonb('skills').defaultTo('[]');
    table.jsonb('requirements').defaultTo('[]');
    table.jsonb('benefits').defaultTo('[]');
    table.integer('positions_available').defaultTo(1);
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_job_org ON workspaces.job(organization_id);
    CREATE INDEX idx_job_workspace ON workspaces.job(workspace_id);
    CREATE INDEX idx_job_status ON workspaces.job(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_job_published ON workspaces.job(is_published) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE workspaces.job IS 'Job postings in RecruitIQ';
  `);

  // ============================================================================
  // RECRUITIQ: CANDIDATES - Job applicants
  // ============================================================================
  await knex.schema.withSchema('workspaces').createTable('candidate', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50);
    table.text('resume_url');
    table.text('cover_letter');
    table.string('current_company', 255);
    table.string('current_title', 255);
    table.integer('years_experience');
    table.jsonb('skills').defaultTo('[]');
    table.string('linkedin_url', 500);
    table.string('status', 50).defaultTo('new');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'email']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_candidate_org ON workspaces.candidate(organization_id);
    CREATE INDEX idx_candidate_email ON workspaces.candidate(email);
    CREATE INDEX idx_candidate_status ON workspaces.candidate(status) WHERE deleted_at IS NULL;
  `);

  // ============================================================================
  // RECRUITIQ: APPLICATIONS - Job applications
  // ============================================================================
  await knex.schema.withSchema('workspaces').createTable('application', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('job_id').notNullable().references('id').inTable('workspaces.job').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('workspaces.candidate').onDelete('CASCADE');
    table.string('status', 50).notNullable().defaultTo('submitted');
    table.integer('score');
    table.text('notes');
    table.timestamp('applied_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('reviewed_at');
    table.uuid('reviewed_by');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['job_id', 'candidate_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_application_org ON workspaces.application(organization_id);
    CREATE INDEX idx_application_job ON workspaces.application(job_id);
    CREATE INDEX idx_application_candidate ON workspaces.application(candidate_id);
    CREATE INDEX idx_application_status ON workspaces.application(status) WHERE deleted_at IS NULL;
  `);

  // ============================================================================
  // RECRUITIQ: INTERVIEWS - Interview schedules
  // ============================================================================
  await knex.schema.withSchema('workspaces').createTable('interview', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('application_id').notNullable().references('id').inTable('workspaces.application').onDelete('CASCADE');
    table.string('interview_type', 50).notNullable();
    table.timestamp('scheduled_at').notNullable();
    table.integer('duration_minutes').defaultTo(60);
    table.string('location', 255);
    table.string('meeting_link', 500);
    table.string('status', 50).notNullable().defaultTo('scheduled');
    table.text('notes');
    table.integer('rating');
    table.jsonb('feedback').defaultTo('{}');
    table.uuid('interviewer_id');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_interview_org ON workspaces.interview(organization_id);
    CREATE INDEX idx_interview_application ON workspaces.interview(application_id);
    CREATE INDEX idx_interview_scheduled ON workspaces.interview(scheduled_at);
    CREATE INDEX idx_interview_status ON workspaces.interview(status) WHERE deleted_at IS NULL;
  `);

  console.log('✓ RecruitIQ schema complete');

  // ============================================================================
  // CREATE SCHEDULING SCHEMA - ScheduleHub
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');

  // ============================================================================
  // SCHEDULEHUB: STATIONS - Work stations/locations
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('station', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('station_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.string('station_type', 50);
    table.integer('capacity');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'station_code']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_station_org ON scheduling.station(organization_id);
    CREATE INDEX idx_station_location ON scheduling.station(location_id);
    CREATE INDEX idx_station_active ON scheduling.station(is_active) WHERE deleted_at IS NULL;
  `);

  // ============================================================================
  // SCHEDULEHUB: SHIFTS - Work shift templates
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('shift', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('shift_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.integer('duration_minutes');
    table.string('shift_type', 50);
    table.decimal('hourly_rate', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['organization_id', 'shift_code']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_shift_org ON scheduling.shift(organization_id);
    CREATE INDEX idx_shift_active ON scheduling.shift(is_active) WHERE deleted_at IS NULL;
  `);

  // ============================================================================
  // SCHEDULEHUB: SCHEDULES - Employee work schedules
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('schedule', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('shift_id').references('id').inTable('scheduling.shift').onDelete('SET NULL');
    table.uuid('station_id').references('id').inTable('scheduling.station').onDelete('SET NULL');
    table.date('schedule_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.string('status', 50).notNullable().defaultTo('scheduled');
    table.text('notes');
    table.uuid('approved_by');
    table.timestamp('approved_at');
    table.jsonb('metadata').defaultTo('{}');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.uuid('deleted_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.schema.raw(`
    CREATE INDEX idx_schedule_org ON scheduling.schedule(organization_id);
    CREATE INDEX idx_schedule_employee ON scheduling.schedule(employee_id);
    CREATE INDEX idx_schedule_shift ON scheduling.schedule(shift_id);
    CREATE INDEX idx_schedule_station ON scheduling.schedule(station_id);
    CREATE INDEX idx_schedule_date ON scheduling.schedule(schedule_date);
    CREATE INDEX idx_schedule_status ON scheduling.schedule(status) WHERE deleted_at IS NULL;
  `);

  console.log('✓ ScheduleHub schema complete');

  // ============================================================================
  // CENTRAL LOGGING - System-wide audit and security logs
  // ============================================================================

  // System Logs
  await knex.schema.createTable('system_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('level', 20).notNullable();
    table.string('category', 50);
    table.text('message').notNullable();
    table.string('source', 100);
    table.jsonb('context').defaultTo('{}');
    table.string('user_id', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_system_logs_org ON system_logs(organization_id);
    CREATE INDEX idx_system_logs_level ON system_logs(level);
    CREATE INDEX idx_system_logs_category ON system_logs(category);
    CREATE INDEX idx_system_logs_created ON system_logs(created_at);
    
    COMMENT ON TABLE system_logs IS 'Application-level logs for debugging and monitoring';
  `);

  // Security Events
  await knex.schema.createTable('security_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('event_type', 100).notNullable();
    table.string('severity', 20).notNullable();
    table.text('description').notNullable();
    table.string('user_id', 255);
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.jsonb('details').defaultTo('{}');
    table.boolean('resolved').defaultTo(false);
    table.uuid('resolved_by');
    table.timestamp('resolved_at');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_security_events_org ON security_events(organization_id);
    CREATE INDEX idx_security_events_type ON security_events(event_type);
    CREATE INDEX idx_security_events_severity ON security_events(severity);
    CREATE INDEX idx_security_events_resolved ON security_events(resolved);
    CREATE INDEX idx_security_events_created ON security_events(created_at);
    
    COMMENT ON TABLE security_events IS 'Security-related events for threat detection and compliance';
  `);

  // Audit Trail
  await knex.schema.createTable('audit_trail', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action', 50).notNullable();
    table.string('user_id', 255).notNullable();
    table.jsonb('changes').defaultTo('{}');
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_audit_trail_org ON audit_trail(organization_id);
    CREATE INDEX idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
    CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
    CREATE INDEX idx_audit_trail_created ON audit_trail(created_at);
    
    COMMENT ON TABLE audit_trail IS 'Complete audit trail of all data changes for compliance';
  `);

  console.log('✓ Central logging tables complete');
  console.log('✓ All schemas created successfully!');
};

exports.down = async function(knex) {
  // Drop schemas in reverse order
  await knex.raw('DROP SCHEMA IF EXISTS scheduling CASCADE');
  await knex.raw('DROP SCHEMA IF EXISTS payroll CASCADE');
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
  
  // Drop core tables
  await knex.schema.dropTableIfExists('email_settings');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('organizations');
};
