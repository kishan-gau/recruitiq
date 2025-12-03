/**
 * Migration: Create Nexus HRIS Schema
 * Source: nexus-hris-schema.sql
 * 
 * Creates the comprehensive HRIS (Human Resources Information System) schema
 * with employee management, contracts, benefits, time-off, attendance, and more.
 */

export async function up(knex) {
  // Create hris schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');
  
  // Enable required extension for GIST indexes
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');

  // ===========================
  // USER ACCOUNTS
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('user_account', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Link to employee record (nullable - not all employees have login access)
    table.uuid('employee_id').nullable(); // Circular FK, will be added later
    
    // Authentication
    table.string('email', 255).notNullable();
    table.string('password_hash', 500).nullable();
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255).nullable();
    
    // Status
    table.string('account_status', 50).notNullable().defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    
    // Product Access and Roles
    table.jsonb('enabled_products').defaultTo('["nexus"]');
    table.jsonb('product_roles').defaultTo('{}');
    
    // Security
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until', { useTz: true }).nullable();
    table.timestamp('last_login_at', { useTz: true }).nullable();
    table.string('last_login_ip', 50).nullable();
    table.timestamp('password_changed_at', { useTz: true }).nullable();
    table.string('password_reset_token', 500).nullable();
    table.timestamp('password_reset_expires_at', { useTz: true }).nullable();
    
    // MFA
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255).nullable();
    table.jsonb('mfa_backup_codes').defaultTo('[]');
    table.integer('mfa_backup_codes_used').defaultTo(0);
    table.timestamp('mfa_enabled_at', { useTz: true }).nullable();
    
    // Preferences
    table.jsonb('preferences').defaultTo('{}');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.user_account 
    ADD CONSTRAINT unique_email UNIQUE (organization_id, email)
  `);
  
  // Add check constraint for account_status
  await knex.raw(`
    ALTER TABLE hris.user_account 
    ADD CONSTRAINT user_account_status_check 
    CHECK (account_status IN ('active', 'inactive', 'locked', 'pending_activation'))
  `);
  
  await knex.raw(`
    COMMENT ON TABLE hris.user_account IS 'Tenant users with login access to product applications (Nexus, PayLinQ, ScheduleHub, RecruitIQ). Linked to employee records but not all employees have user accounts.';
    COMMENT ON COLUMN hris.user_account.employee_id IS 'Optional link to hris.employee. Not all employees have login access, and some users (like external contractors) may have accounts without employee records.';
    COMMENT ON COLUMN hris.user_account.enabled_products IS 'JSONB array of product slugs this user can access: ["nexus", "paylinq", "schedulehub", "recruitiq"]';
    COMMENT ON COLUMN hris.user_account.product_roles IS 'JSONB object mapping product to role: {"nexus": "admin", "paylinq": "payroll_manager", "schedulehub": "scheduler"}';
    COMMENT ON COLUMN hris.user_account.email_verified IS 'Whether email has been verified via verification token';
    COMMENT ON COLUMN hris.user_account.last_login_ip IS 'IP address of last successful login for security audit';
  `);

  // Tenant refresh tokens for session management
  await knex.schema.withSchema('hris').createTable('tenant_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_account_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.string('ip_address', 50).nullable();
    table.string('user_agent', 500).nullable();
  });
  
  // Add indexes for tenant_refresh_tokens
  await knex.raw('CREATE INDEX idx_tenant_refresh_tokens_user ON hris.tenant_refresh_tokens(user_account_id)');
  await knex.raw('CREATE INDEX idx_tenant_refresh_tokens_token ON hris.tenant_refresh_tokens(token)');
  await knex.raw('CREATE INDEX idx_tenant_refresh_tokens_org ON hris.tenant_refresh_tokens(organization_id)');
  await knex.raw('CREATE INDEX idx_tenant_refresh_tokens_expires ON hris.tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL');
  
  await knex.raw(`
    COMMENT ON TABLE hris.tenant_refresh_tokens IS 'Refresh tokens for tenant user sessions. Used to maintain authentication across multiple devices and generate new access tokens.';
    COMMENT ON COLUMN hris.tenant_refresh_tokens.user_account_id IS 'The tenant user who owns this refresh token';
    COMMENT ON COLUMN hris.tenant_refresh_tokens.organization_id IS 'Organization context for Row Level Security';
    COMMENT ON COLUMN hris.tenant_refresh_tokens.token IS 'Hashed refresh token value';
    COMMENT ON COLUMN hris.tenant_refresh_tokens.revoked_at IS 'When the token was revoked (logout, password change, etc.)';
  `);
  
  // Add indexes for user_account
  await knex.raw('CREATE INDEX idx_user_account_org ON hris.user_account(organization_id)');
  await knex.raw('CREATE INDEX idx_user_account_email ON hris.user_account(email)');
  await knex.raw('CREATE INDEX idx_user_account_active ON hris.user_account(is_active) WHERE deleted_at IS NULL');

  // ===========================
  // ORGANIZATIONAL STRUCTURE
  // ===========================
  
  // Departments
  await knex.schema.withSchema('hris').createTable('department', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Identification
    table.string('department_code', 50).notNullable();
    table.string('department_name', 255).notNullable();
    table.text('description').nullable();
    
    // Hierarchy
    table.uuid('parent_department_id').nullable();
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint and self-referencing FK
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT unique_department_code UNIQUE (organization_id, department_code)
  `);
  
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT fk_department_parent 
    FOREIGN KEY (parent_department_id) 
    REFERENCES hris.department(id) ON DELETE SET NULL
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_department_org ON hris.department(organization_id)');
  await knex.raw('CREATE INDEX idx_department_parent ON hris.department(parent_department_id)');
  await knex.raw('CREATE INDEX idx_department_active ON hris.department(is_active) WHERE deleted_at IS NULL');

  // Locations
  await knex.schema.withSchema('hris').createTable('location', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Identification
    table.string('location_code', 50).notNullable();
    table.string('location_name', 255).notNullable();
    table.string('location_type', 50).nullable();
    
    // Address
    table.string('address_line1', 255).nullable();
    table.string('address_line2', 255).nullable();
    table.string('city', 100).nullable();
    table.string('state_province', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('country', 100).nullable();
    
    // Contact
    table.string('phone', 50).nullable();
    table.string('email', 255).nullable();
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint and check constraint
  await knex.raw(`
    ALTER TABLE hris.location 
    ADD CONSTRAINT unique_location_code UNIQUE (organization_id, location_code)
  `);
  
  await knex.raw(`
    ALTER TABLE hris.location 
    ADD CONSTRAINT location_type_check 
    CHECK (location_type IN ('headquarters', 'branch', 'remote', 'warehouse', 'store'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_location_org ON hris.location(organization_id)');
  await knex.raw('CREATE INDEX idx_location_active ON hris.location(is_active) WHERE deleted_at IS NULL');

  // ===========================
  // WORKER TYPE CLASSIFICATION
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('worker_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Worker Type Identity
    table.string('code', 50).notNullable();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    
    // HRIS-Specific Settings (Benefits, PTO, etc.)
    table.boolean('benefits_eligible').defaultTo(true);
    table.boolean('pto_eligible').defaultTo(true);
    table.boolean('sick_leave_eligible').defaultTo(true);
    table.decimal('vacation_accrual_rate', 5, 2).defaultTo(0);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    table.uuid('deleted_by').nullable().references('id').inTable('hris.user_account');
  });
  
  // Add unique constraints for worker_type
  await knex.raw(`
    ALTER TABLE hris.worker_type 
    ADD CONSTRAINT unique_worker_type_code UNIQUE (organization_id, code)
  `);
  
  await knex.raw(`
    ALTER TABLE hris.worker_type 
    ADD CONSTRAINT unique_worker_type_name UNIQUE (organization_id, name)
  `);
  
  // Add indexes for worker_type
  await knex.raw('CREATE INDEX idx_worker_type_org ON hris.worker_type(organization_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_worker_type_active ON hris.worker_type(is_active) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_worker_type_code ON hris.worker_type(code) WHERE deleted_at IS NULL');
  
  await knex.raw(`
    COMMENT ON TABLE hris.worker_type IS 'Employee classification types (Full-Time, Part-Time, Contractor, etc.) - HRIS owns these';
    COMMENT ON COLUMN hris.worker_type.code IS 'Unique code for worker type (e.g., FT, PT, CTR)';
    COMMENT ON COLUMN hris.worker_type.benefits_eligible IS 'Whether workers of this type are eligible for benefits';
    COMMENT ON COLUMN hris.worker_type.vacation_accrual_rate IS 'Default vacation accrual rate in hours per pay period';
  `);

  // ===========================
  // EMPLOYEE CORE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('employee', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Link to user account (may be NULL for employees without login)
    table.uuid('user_account_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    // Identification
    table.string('employee_number', 50).notNullable();
    
    // Personal Information
    table.string('first_name', 100).notNullable();
    table.string('middle_name', 100).nullable();
    table.string('last_name', 100).notNullable();
    table.string('preferred_name', 100).nullable();
    table.date('date_of_birth').nullable();
    table.string('gender', 50).nullable();
    table.string('nationality', 100).nullable();
    
    // Contact Information
    table.string('email', 255).nullable();
    table.string('phone', 50).nullable();
    table.string('mobile_phone', 50).nullable();
    
    // Address
    table.string('address_line1', 255).nullable();
    table.string('address_line2', 255).nullable();
    table.string('city', 100).nullable();
    table.string('state_province', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('country', 100).nullable();
    
    // Emergency Contact
    table.string('emergency_contact_name', 255).nullable();
    table.string('emergency_contact_relationship', 100).nullable();
    table.string('emergency_contact_phone', 50).nullable();
    
    // Employment Information
    table.date('hire_date').notNullable();
    table.date('termination_date').nullable();
    table.string('employment_status', 50).notNullable().defaultTo('active');
    table.string('employment_type', 50).nullable();
    
    // Worker Type Classification
    table.uuid('worker_type_id').nullable().references('id').inTable('hris.worker_type').onDelete('SET NULL');
    
    // Organizational Assignment
    table.uuid('department_id').nullable().references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('manager_id').nullable();
    table.string('job_title', 255).nullable();
    
    // Work Schedule
    table.string('work_schedule', 50).defaultTo('standard');
    table.decimal('fte_percentage', 5, 2).defaultTo(100.00);
    
    // Tax Information (Wet Loonbelasting Compliance)
    table.boolean('is_suriname_resident').notNullable().defaultTo(true);
    
    // Profile
    table.string('profile_photo_url', 500).nullable();
    table.text('bio').nullable();
    table.jsonb('skills').defaultTo('[]');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT unique_employee_number UNIQUE (organization_id, employee_number)
  `);
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT check_employee_status 
    CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'suspended'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT check_employment_type 
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'intern'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT check_employee_age 
    CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
  `);
  
  // Self-referencing FK for manager
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT fk_employee_manager 
    FOREIGN KEY (manager_id) 
    REFERENCES hris.employee(id) ON DELETE SET NULL
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_employee_org ON hris.employee(organization_id)');
  await knex.raw('CREATE INDEX idx_employee_user_account ON hris.employee(user_account_id)');
  await knex.raw('CREATE INDEX idx_employee_department ON hris.employee(department_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_location ON hris.employee(location_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_manager ON hris.employee(manager_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_worker_type ON hris.employee(worker_type_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_status ON hris.employee(employment_status) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_email ON hris.employee(email)');
  await knex.raw('CREATE INDEX idx_employee_resident_status ON hris.employee(is_suriname_resident) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_org_dept ON hris.employee(organization_id, department_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_org_location ON hris.employee(organization_id, location_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_manager_org ON hris.employee(manager_id, organization_id) WHERE deleted_at IS NULL');
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.is_suriname_resident IS 'Per Wet Loonbelasting Article 13.1a: Indicates if employee is Suriname resident. Non-residents do NOT receive tax-free allowance (belastingvrije som). Critical for payroll tax calculations.';
    COMMENT ON COLUMN hris.employee.department_id IS 'Links employee to department structure. Used by Nexus for organizational management and by PayLinQ for cost allocation and reporting.';
    COMMENT ON COLUMN hris.employee.location_id IS 'Links employee to physical location/office. Used by Nexus for location-based management and by PayLinQ for location-based payroll reports.';
    COMMENT ON COLUMN hris.employee.manager_id IS 'Self-referencing FK for reporting hierarchy. Used by Nexus for org chart and by PayLinQ for approval workflows.';
    COMMENT ON CONSTRAINT check_employee_age ON hris.employee IS 'Ensures employee is at least 18 years old at time of record creation';
  `);

  // Add FK constraint from user_account to employee (circular reference resolved)
  await knex.raw(`
    ALTER TABLE hris.user_account
    ADD CONSTRAINT fk_user_account_employee
    FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE SET NULL
  `);

  // Employment History (Track all employment periods including rehires)
  await knex.schema.withSchema('hris').createTable('employment_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Employment Period
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.boolean('is_current').defaultTo(true);
    
    // Rehire Information
    table.boolean('is_rehire').defaultTo(false);
    table.text('rehire_notes').nullable();
    
    // Employment Details (snapshot at time of employment)
    table.string('employment_status', 50).notNullable();
    table.string('employment_type', 50).nullable();
    table.uuid('department_id').nullable().references('id').inTable('hris.department').onDelete('SET NULL');
    table.string('department_name', 255).nullable();
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    table.string('location_name', 255).nullable();
    table.uuid('manager_id').nullable().references('id').inTable('hris.employee').onDelete('SET NULL');
    table.string('manager_name', 255).nullable();
    table.string('job_title', 255).nullable();
    
    // Termination Details
    table.date('termination_date').nullable();
    table.string('termination_reason', 100).nullable();
    table.text('termination_notes').nullable();
    table.boolean('is_rehire_eligible').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
  });
  
  // Add check constraint for termination_reason
  await knex.raw(`
    ALTER TABLE hris.employment_history 
    ADD CONSTRAINT check_termination_reason 
    CHECK (termination_reason IN (
      'resignation',
      'layoff',
      'termination_with_cause',
      'termination_without_cause',
      'mutual_agreement',
      'retirement',
      'contract_expiry',
      'other'
    ))
  `);
  
  // Add EXCLUDE constraint for overlapping periods
  await knex.raw(`
    ALTER TABLE hris.employment_history 
    ADD CONSTRAINT check_no_overlap EXCLUDE USING gist (
      employee_id WITH =,
      daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
    )
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_employment_history_org ON hris.employment_history(organization_id)');
  await knex.raw('CREATE INDEX idx_employment_history_employee ON hris.employment_history(employee_id)');
  await knex.raw('CREATE INDEX idx_employment_history_current ON hris.employment_history(employee_id, is_current) WHERE is_current = true');
  await knex.raw('CREATE INDEX idx_employment_history_dates ON hris.employment_history(start_date, end_date)');
  await knex.raw('CREATE INDEX idx_employment_history_rehire ON hris.employment_history(is_rehire) WHERE is_rehire = true');
  
  await knex.raw(`
    COMMENT ON TABLE hris.employment_history IS 'Complete employment history for each employee, supporting multiple employment periods (rehires). Each record represents one continuous employment period.';
    COMMENT ON COLUMN hris.employment_history.is_current IS 'Only ONE record per employee can be current. Enforced by unique constraint.';
    COMMENT ON COLUMN hris.employment_history.is_rehire IS 'TRUE if this is not the original employment (employee was rehired)';
    COMMENT ON COLUMN hris.employment_history.is_rehire_eligible IS 'Whether employee can be rehired. Set during termination.';
    COMMENT ON COLUMN hris.employment_history.termination_reason IS 'Reason for employment end. Helps determine rehire eligibility.';
  `);

  // ===========================
  // CONTRACT MANAGEMENT
  // ===========================
  
  // Contract Sequence Policies (Define contract renewal/progression rules)
  await knex.schema.withSchema('hris').createTable('contract_sequence_policy', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Identification
    table.string('policy_code', 50).notNullable();
    table.string('policy_name', 255).notNullable();
    table.text('description').nullable();
    
    // Configuration
    table.boolean('is_active').defaultTo(true);
    table.boolean('auto_renewal').defaultTo(false);
    table.integer('notification_days_before_expiry').defaultTo(30);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.contract_sequence_policy 
    ADD CONSTRAINT unique_policy_code UNIQUE (organization_id, policy_code)
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_contract_sequence_policy_org ON hris.contract_sequence_policy(organization_id)');
  await knex.raw('CREATE INDEX idx_contract_sequence_policy_active ON hris.contract_sequence_policy(is_active) WHERE deleted_at IS NULL');

  // Contract Sequence Steps (Define progression stages)
  await knex.schema.withSchema('hris').createTable('contract_sequence_step', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('contract_sequence_policy_id').notNullable().references('id').inTable('hris.contract_sequence_policy').onDelete('CASCADE');
    
    // Step Definition
    table.integer('step_order').notNullable();
    table.string('step_name', 255).notNullable();
    table.string('contract_type', 50).notNullable();
    table.integer('duration_months').nullable();
    
    // Next Step
    table.uuid('next_step_id').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraint and self-referencing FK
  await knex.raw(`
    ALTER TABLE hris.contract_sequence_step 
    ADD CONSTRAINT check_contract_sequence_step_type 
    CHECK (contract_type IN ('probation', 'fixed_term', 'permanent', 'seasonal'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.contract_sequence_step 
    ADD CONSTRAINT fk_next_step 
    FOREIGN KEY (next_step_id) 
    REFERENCES hris.contract_sequence_step(id) ON DELETE SET NULL
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_contract_sequence_step_policy ON hris.contract_sequence_step(contract_sequence_policy_id)');
  await knex.raw('CREATE INDEX idx_contract_sequence_step_order ON hris.contract_sequence_step(contract_sequence_policy_id, step_order)');

  // Contracts (Individual employee contracts)
  await knex.schema.withSchema('hris').createTable('contract', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Contract Identification
    table.string('contract_number', 50).notNullable();
    table.string('contract_type', 50).notNullable();
    
    // Sequence Tracking
    table.uuid('contract_sequence_policy_id').nullable().references('id').inTable('hris.contract_sequence_policy').onDelete('SET NULL');
    table.uuid('current_step_id').nullable().references('id').inTable('hris.contract_sequence_step').onDelete('SET NULL');
    table.integer('sequence_number').defaultTo(1);
    
    // Contract Dates
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.integer('notice_period_days').nullable();
    
    // Contract Details
    table.string('job_title', 255).nullable();
    table.uuid('department_id').nullable().references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    
    // Compensation
    table.decimal('salary_amount', 15, 2).nullable();
    table.string('salary_currency', 10).defaultTo('USD');
    table.string('salary_frequency', 50).nullable();
    
    // Status
    table.string('status', 50).notNullable().defaultTo('draft');
    
    // Documents
    table.string('contract_document_url', 500).nullable();
    table.date('signed_date').nullable();
    table.boolean('signed_by_employee').defaultTo(false);
    table.boolean('signed_by_employer').defaultTo(false);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.contract 
    ADD CONSTRAINT unique_contract_number UNIQUE (organization_id, contract_number)
  `);
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.contract 
    ADD CONSTRAINT check_contract_contract_type 
    CHECK (contract_type IN ('probation', 'fixed_term', 'permanent', 'seasonal'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.contract 
    ADD CONSTRAINT check_contract_status 
    CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'renewed'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.contract 
    ADD CONSTRAINT check_salary_frequency 
    CHECK (salary_frequency IN ('hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'annually'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_contract_org ON hris.contract(organization_id)');
  await knex.raw('CREATE INDEX idx_contract_employee ON hris.contract(employee_id)');
  await knex.raw('CREATE INDEX idx_contract_status ON hris.contract(status) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_contract_dates ON hris.contract(start_date, end_date)');

  // ===========================
  // PERFORMANCE MANAGEMENT
  // ===========================
  
  // Review Templates
  await knex.schema.withSchema('hris').createTable('review_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Template Info
    table.string('template_name', 255).notNullable();
    table.text('description').nullable();
    table.string('review_type', 50).nullable();
    
    // Configuration
    table.jsonb('sections').defaultTo('[]');
    table.jsonb('rating_scale').defaultTo('{}');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.review_template 
    ADD CONSTRAINT check_review_template_type 
    CHECK (review_type IN ('annual', 'mid_year', 'probation', 'project', 'continuous'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_review_template_org ON hris.review_template(organization_id)');
  await knex.raw('CREATE INDEX idx_review_template_active ON hris.review_template(is_active) WHERE deleted_at IS NULL');

  // Performance Reviews
  await knex.schema.withSchema('hris').createTable('performance_review', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('reviewer_id').nullable().references('id').inTable('hris.employee').onDelete('SET NULL');
    table.uuid('template_id').nullable().references('id').inTable('hris.review_template').onDelete('SET NULL');
    
    // Review Period
    table.date('review_period_start').notNullable();
    table.date('review_period_end').notNullable();
    table.string('review_type', 50).nullable();
    
    // Review Content
    table.jsonb('responses').defaultTo('{}');
    table.decimal('overall_rating', 3, 2).nullable();
    table.text('strengths').nullable();
    table.text('areas_for_improvement').nullable();
    table.text('goals_for_next_period').nullable();
    
    // Status
    table.string('status', 50).notNullable().defaultTo('draft');
    
    // Dates
    table.date('due_date').nullable();
    table.date('submitted_date').nullable();
    table.date('completed_date').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.performance_review 
    ADD CONSTRAINT check_performance_review_type 
    CHECK (review_type IN ('annual', 'mid_year', 'probation', 'project', 'continuous'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.performance_review 
    ADD CONSTRAINT check_performance_review_status 
    CHECK (status IN ('draft', 'in_progress', 'submitted', 'approved', 'completed'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_performance_review_org ON hris.performance_review(organization_id)');
  await knex.raw('CREATE INDEX idx_performance_review_employee ON hris.performance_review(employee_id)');
  await knex.raw('CREATE INDEX idx_performance_review_status ON hris.performance_review(status) WHERE deleted_at IS NULL');

  // Performance Goals
  await knex.schema.withSchema('hris').createTable('performance_goal', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('review_id').nullable().references('id').inTable('hris.performance_review').onDelete('SET NULL');
    
    // Goal Details
    table.string('goal_title', 255).notNullable();
    table.text('goal_description').nullable();
    table.string('goal_category', 100).nullable();
    
    // Tracking
    table.date('target_date').nullable();
    table.integer('completion_percentage').defaultTo(0);
    table.string('status', 50).defaultTo('active');
    
    // Measurement
    table.text('measurement_criteria').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.performance_goal 
    ADD CONSTRAINT check_performance_goal_completion 
    CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
  `);
  
  await knex.raw(`
    ALTER TABLE hris.performance_goal 
    ADD CONSTRAINT check_performance_goal_status 
    CHECK (status IN ('active', 'completed', 'cancelled', 'deferred'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_performance_goal_org ON hris.performance_goal(organization_id)');
  await knex.raw('CREATE INDEX idx_performance_goal_employee ON hris.performance_goal(employee_id)');
  await knex.raw('CREATE INDEX idx_performance_goal_status ON hris.performance_goal(status) WHERE deleted_at IS NULL');

  // Continuous Feedback
  await knex.schema.withSchema('hris').createTable('feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('feedback_provider_id').nullable().references('id').inTable('hris.employee').onDelete('SET NULL');
    
    // Feedback Content
    table.string('feedback_type', 50).nullable();
    table.text('feedback_text').notNullable();
    table.boolean('is_anonymous').defaultTo(false);
    
    // Context
    table.uuid('related_goal_id').nullable().references('id').inTable('hris.performance_goal').onDelete('SET NULL');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.feedback 
    ADD CONSTRAINT check_feedback_type 
    CHECK (feedback_type IN ('praise', 'constructive', 'coaching', 'general'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_feedback_org ON hris.feedback(organization_id)');
  await knex.raw('CREATE INDEX idx_feedback_employee ON hris.feedback(employee_id)');
  await knex.raw('CREATE INDEX idx_feedback_provider ON hris.feedback(feedback_provider_id)');

  // ===========================
  // BENEFITS MANAGEMENT
  // ===========================
  
  // Benefits Plans
  await knex.schema.withSchema('hris').createTable('benefits_plan', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Plan Information
    table.string('plan_name', 255).notNullable();
    table.string('plan_type', 50).notNullable();
    table.string('provider_name', 255).nullable();
    table.text('description').nullable();
    
    // Coverage
    table.string('coverage_level', 50).nullable();
    
    // Costs
    table.decimal('employer_contribution', 15, 2).nullable();
    table.decimal('employee_cost', 15, 2).nullable();
    table.string('contribution_frequency', 50).nullable();
    
    // Eligibility
    table.jsonb('eligibility_rules').defaultTo('{}');
    table.integer('waiting_period_days').defaultTo(0);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.date('effective_date').nullable();
    table.date('termination_date').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.benefits_plan 
    ADD CONSTRAINT check_plan_type 
    CHECK (plan_type IN ('health', 'dental', 'vision', 'life', 'disability', 'retirement', 'other'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.benefits_plan 
    ADD CONSTRAINT check_coverage_level 
    CHECK (coverage_level IN ('employee', 'employee_spouse', 'employee_children', 'family'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.benefits_plan 
    ADD CONSTRAINT check_contribution_frequency 
    CHECK (contribution_frequency IN ('monthly', 'biweekly', 'annual'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_benefits_plan_org ON hris.benefits_plan(organization_id)');
  await knex.raw('CREATE INDEX idx_benefits_plan_type ON hris.benefits_plan(plan_type)');
  await knex.raw('CREATE INDEX idx_benefits_plan_active ON hris.benefits_plan(is_active) WHERE deleted_at IS NULL');

  // Employee Benefit Enrollments
  await knex.schema.withSchema('hris').createTable('employee_benefit_enrollment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('benefits_plan_id').notNullable().references('id').inTable('hris.benefits_plan').onDelete('CASCADE');
    
    // Enrollment Details
    table.date('enrollment_date').notNullable();
    table.date('coverage_start_date').notNullable();
    table.date('coverage_end_date').nullable();
    table.string('coverage_level', 50).nullable();
    
    // Dependents (if applicable)
    table.jsonb('dependents').defaultTo('[]');
    
    // Status
    table.string('status', 50).defaultTo('active');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE hris.employee_benefit_enrollment 
    ADD CONSTRAINT check_coverage_level 
    CHECK (coverage_level IN ('employee', 'employee_spouse', 'employee_children', 'family'))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.employee_benefit_enrollment 
    ADD CONSTRAINT check_employee_benefit_enrollment_status 
    CHECK (status IN ('active', 'pending', 'cancelled', 'expired'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_employee_benefit_enrollment_org ON hris.employee_benefit_enrollment(organization_id)');
  await knex.raw('CREATE INDEX idx_employee_benefit_enrollment_employee ON hris.employee_benefit_enrollment(employee_id)');
  await knex.raw('CREATE INDEX idx_employee_benefit_enrollment_status ON hris.employee_benefit_enrollment(status) WHERE deleted_at IS NULL');

  // ===========================
  // TIME OFF MANAGEMENT
  // ===========================
  
  // Time Off Types
  await knex.schema.withSchema('hris').createTable('time_off_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Type Information
    table.string('type_code', 50).notNullable();
    table.string('type_name', 255).notNullable();
    table.text('description').nullable();
    
    // Configuration
    table.boolean('is_paid').defaultTo(true);
    table.boolean('requires_approval').defaultTo(true);
    table.integer('max_days_per_request').nullable();
    table.integer('max_consecutive_days').nullable();
    
    // Accrual Configuration
    table.boolean('accrual_enabled').defaultTo(false);
    table.jsonb('accrual_rules').defaultTo('{}');
    
    // Carry Over
    table.boolean('allow_carryover').defaultTo(false);
    table.decimal('max_carryover_days', 10, 2).nullable();
    table.integer('carryover_expiry_months').nullable();
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.time_off_type 
    ADD CONSTRAINT unique_time_off_type_code UNIQUE (organization_id, type_code)
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_time_off_type_org ON hris.time_off_type(organization_id)');
  await knex.raw('CREATE INDEX idx_time_off_type_active ON hris.time_off_type(is_active) WHERE deleted_at IS NULL');

  // Employee Time Off Balances
  await knex.schema.withSchema('hris').createTable('employee_time_off_balance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    
    // Balance Tracking
    table.integer('year').notNullable();
    table.decimal('total_allocated', 10, 2).defaultTo(0);
    table.decimal('total_accrued', 10, 2).defaultTo(0);
    table.decimal('total_used', 10, 2).defaultTo(0);
    table.decimal('total_pending', 10, 2).defaultTo(0);
    table.decimal('current_balance', 10, 2).defaultTo(0);
    
    // Carry Over
    table.decimal('carried_over_from_previous_year', 10, 2).defaultTo(0);
    table.date('carryover_expires_at').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.employee_time_off_balance 
    ADD CONSTRAINT unique_employee_balance UNIQUE (organization_id, employee_id, time_off_type_id, year)
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_employee_time_off_balance_org ON hris.employee_time_off_balance(organization_id)');
  await knex.raw('CREATE INDEX idx_employee_time_off_balance_employee ON hris.employee_time_off_balance(employee_id)');
  await knex.raw('CREATE INDEX idx_employee_time_off_balance_year ON hris.employee_time_off_balance(year)');

  // Time Off Requests
  await knex.schema.withSchema('hris').createTable('time_off_request', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    
    // Request Details
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('total_days', 10, 2).notNullable();
    table.text('reason').nullable();
    
    // Approval Workflow
    table.string('status', 50).notNullable().defaultTo('pending');
    table.uuid('approver_id').nullable().references('id').inTable('hris.employee').onDelete('SET NULL');
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.text('rejection_reason').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.time_off_request 
    ADD CONSTRAINT check_time_off_request_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_time_off_request_org ON hris.time_off_request(organization_id)');
  await knex.raw('CREATE INDEX idx_time_off_request_employee ON hris.time_off_request(employee_id)');
  await knex.raw('CREATE INDEX idx_time_off_request_status ON hris.time_off_request(status) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_time_off_request_dates ON hris.time_off_request(start_date, end_date)');

  // Time Off Accrual History
  await knex.schema.withSchema('hris').createTable('time_off_accrual_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    table.uuid('balance_id').notNullable().references('id').inTable('hris.employee_time_off_balance').onDelete('CASCADE');
    
    // Accrual Details
    table.date('accrual_date').notNullable();
    table.decimal('accrual_amount', 10, 2).notNullable();
    table.string('accrual_reason', 255).nullable();
    table.decimal('balance_after_accrual', 10, 2).nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_time_off_accrual_history_org ON hris.time_off_accrual_history(organization_id)');
  await knex.raw('CREATE INDEX idx_time_off_accrual_history_employee ON hris.time_off_accrual_history(employee_id)');
  await knex.raw('CREATE INDEX idx_time_off_accrual_history_date ON hris.time_off_accrual_history(accrual_date)');

  // ===========================
  // ATTENDANCE MANAGEMENT
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('attendance_record', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Attendance Date and Time
    table.date('attendance_date').notNullable();
    table.timestamp('clock_in_time', { useTz: true }).nullable();
    table.timestamp('clock_out_time', { useTz: true }).nullable();
    
    // Status
    table.string('status', 50).notNullable().defaultTo('present');
    
    // Leave Reference (if on leave)
    table.uuid('time_off_request_id').nullable().references('id').inTable('hris.time_off_request').onDelete('SET NULL');
    
    // Work Hours
    table.decimal('total_hours', 5, 2).nullable();
    table.decimal('overtime_hours', 5, 2).nullable();
    
    // Location Tracking
    table.string('clock_in_location', 255).nullable();
    table.string('clock_out_location', 255).nullable();
    table.string('clock_in_ip', 50).nullable();
    table.string('clock_out_ip', 50).nullable();
    
    // Notes
    table.text('notes').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.attendance_record 
    ADD CONSTRAINT unique_employee_attendance_date UNIQUE (organization_id, employee_id, attendance_date)
  `);
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.attendance_record 
    ADD CONSTRAINT check_attendance_record_status 
    CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_attendance_record_org ON hris.attendance_record(organization_id)');
  await knex.raw('CREATE INDEX idx_attendance_record_employee ON hris.attendance_record(employee_id)');
  await knex.raw('CREATE INDEX idx_attendance_record_date ON hris.attendance_record(attendance_date)');
  await knex.raw('CREATE INDEX idx_attendance_record_status ON hris.attendance_record(status)');

  // ===========================
  // RULE ENGINE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('rule_definition', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Rule Identification
    table.string('rule_code', 50).notNullable();
    table.string('rule_name', 255).notNullable();
    table.text('description').nullable();
    table.string('rule_category', 100).nullable();
    
    // Rule Logic (JSON-based for MVP)
    table.jsonb('conditions').notNullable().defaultTo('{}');
    table.jsonb('actions').notNullable().defaultTo('{}');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(0);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.rule_definition 
    ADD CONSTRAINT unique_rule_code UNIQUE (organization_id, rule_code)
  `);
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.rule_definition 
    ADD CONSTRAINT check_rule_category 
    CHECK (rule_category IN ('time_off', 'attendance', 'contract', 'performance', 'benefits', 'general'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_rule_definition_org ON hris.rule_definition(organization_id)');
  await knex.raw('CREATE INDEX idx_rule_definition_category ON hris.rule_definition(rule_category)');
  await knex.raw('CREATE INDEX idx_rule_definition_active ON hris.rule_definition(is_active) WHERE deleted_at IS NULL');

  // Rule Execution History
  await knex.schema.withSchema('hris').createTable('rule_execution_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('rule_definition_id').notNullable().references('id').inTable('hris.rule_definition').onDelete('CASCADE');
    
    // Execution Details
    table.timestamp('executed_at', { useTz: true }).defaultTo(knex.fn.now());
    table.jsonb('execution_context').defaultTo('{}');
    table.jsonb('execution_result').defaultTo('{}');
    
    // Status
    table.string('status', 50).nullable();
    table.text('error_message').nullable();
    
    // Metadata
    table.uuid('executed_by').nullable();
    table.integer('execution_time_ms').nullable();
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.rule_execution_history 
    ADD CONSTRAINT check_rule_execution_history_status 
    CHECK (status IN ('success', 'failure', 'skipped'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_rule_execution_history_org ON hris.rule_execution_history(organization_id)');
  await knex.raw('CREATE INDEX idx_rule_execution_history_rule ON hris.rule_execution_history(rule_definition_id)');
  await knex.raw('CREATE INDEX idx_rule_execution_history_date ON hris.rule_execution_history(executed_at)');

  // ===========================
  // DOCUMENT MANAGEMENT
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('document_category', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Category Information
    table.string('category_code', 50).notNullable();
    table.string('category_name', 255).notNullable();
    table.text('description').nullable();
    
    // Configuration
    table.boolean('requires_expiry').defaultTo(false);
    table.boolean('requires_approval').defaultTo(false);
    table.boolean('is_confidential').defaultTo(false);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.document_category 
    ADD CONSTRAINT unique_document_category_code UNIQUE (organization_id, category_code)
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_document_category_org ON hris.document_category(organization_id)');
  await knex.raw('CREATE INDEX idx_document_category_active ON hris.document_category(is_active) WHERE deleted_at IS NULL');

  // Employee Documents
  await knex.schema.withSchema('hris').createTable('employee_document', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('category_id').nullable().references('id').inTable('hris.document_category').onDelete('SET NULL');
    
    // Document Information
    table.string('document_name', 255).notNullable();
    table.string('document_type', 100).nullable();
    table.text('description').nullable();
    
    // File Information
    table.string('file_url', 500).notNullable();
    table.integer('file_size').nullable();
    table.string('mime_type', 100).nullable();
    
    // Dates
    table.timestamp('upload_date', { useTz: true }).defaultTo(knex.fn.now());
    table.date('issue_date').nullable();
    table.date('expiry_date').nullable();
    
    // Status
    table.string('status', 50).defaultTo('active');
    
    // Access Control
    table.boolean('is_confidential').defaultTo(false);
    table.jsonb('accessible_to').defaultTo('[]');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.employee_document 
    ADD CONSTRAINT check_employee_document_status 
    CHECK (status IN ('active', 'expired', 'pending_review', 'approved', 'rejected'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_employee_document_org ON hris.employee_document(organization_id)');
  await knex.raw('CREATE INDEX idx_employee_document_employee ON hris.employee_document(employee_id)');
  await knex.raw('CREATE INDEX idx_employee_document_category ON hris.employee_document(category_id)');
  await knex.raw('CREATE INDEX idx_employee_document_status ON hris.employee_document(status) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_employee_document_expiry ON hris.employee_document(expiry_date) WHERE expiry_date IS NOT NULL');

  // ===========================
  // AUDIT & COMPLIANCE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Audit Information
    table.string('table_name', 100).notNullable();
    table.uuid('record_id').notNullable();
    table.string('action', 50).notNullable();
    
    // Change Details
    table.jsonb('old_values').nullable();
    table.jsonb('new_values').nullable();
    table.specificType('changed_fields', 'TEXT[]').nullable();
    
    // Context
    table.uuid('user_id').nullable();
    table.string('ip_address', 50).nullable();
    table.text('user_agent').nullable();
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE hris.audit_log 
    ADD CONSTRAINT check_action 
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
  `);
  
  // Add indexes
  await knex.raw('CREATE INDEX idx_audit_log_org ON hris.audit_log(organization_id)');
  await knex.raw('CREATE INDEX idx_audit_log_table ON hris.audit_log(table_name)');
  await knex.raw('CREATE INDEX idx_audit_log_record ON hris.audit_log(record_id)');
  await knex.raw('CREATE INDEX idx_audit_log_date ON hris.audit_log(created_at)');
  await knex.raw('CREATE INDEX idx_audit_log_user ON hris.audit_log(user_id)');

  // ===========================
  // REPORTING VIEWS
  // ===========================
  
  // Active Employees View
  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_active_employees AS
    SELECT 
      e.id,
      e.organization_id,
      e.employee_number,
      e.first_name,
      e.middle_name,
      e.last_name,
      e.email,
      e.phone,
      e.hire_date,
      e.employment_status,
      e.employment_type,
      e.job_title,
      d.department_name,
      l.location_name,
      m.first_name || ' ' || m.last_name AS manager_name,
      e.created_at,
      e.updated_at
    FROM hris.employee e
    LEFT JOIN hris.department d ON e.department_id = d.id
    LEFT JOIN hris.location l ON e.location_id = l.id
    LEFT JOIN hris.employee m ON e.manager_id = m.id
    WHERE e.deleted_at IS NULL 
      AND e.employment_status = 'active'
  `);

  // Time Off Balance Summary View
  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_time_off_balance_summary AS
    SELECT 
      b.id,
      b.organization_id,
      b.employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      b.time_off_type_id,
      t.type_name,
      b.year,
      b.total_allocated,
      b.total_accrued,
      b.total_used,
      b.total_pending,
      b.current_balance,
      b.carried_over_from_previous_year,
      b.carryover_expires_at
    FROM hris.employee_time_off_balance b
    JOIN hris.employee e ON b.employee_id = e.id
    JOIN hris.time_off_type t ON b.time_off_type_id = t.id
    WHERE e.deleted_at IS NULL
  `);

  // Contract Expiry Alert View
  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_contracts_expiring_soon AS
    SELECT 
      c.id,
      c.organization_id,
      c.employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      c.contract_number,
      c.contract_type,
      c.start_date,
      c.end_date,
      c.status,
      (c.end_date - CURRENT_DATE) AS days_until_expiry
    FROM hris.contract c
    JOIN hris.employee e ON c.employee_id = e.id
    WHERE c.deleted_at IS NULL 
      AND c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
    ORDER BY c.end_date
  `);

  // ===========================
  // TRIGGERS & FUNCTIONS
  // ===========================
  
  // Helper function to get current organization from session variable
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.get_current_organization_id()
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
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER
  `);
  
  await knex.raw(`
    COMMENT ON FUNCTION hris.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.'
  `);
  
  // Function to update employee time off balance
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.update_time_off_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
        -- Deduct from balance for newly inserted approved requests
        UPDATE hris.employee_time_off_balance
        SET 
          total_used = total_used + NEW.total_days,
          current_balance = current_balance - NEW.total_days,
          updated_at = NOW()
        WHERE employee_id = NEW.employee_id
          AND time_off_type_id = NEW.time_off_type_id
          AND year = EXTRACT(YEAR FROM NEW.start_date);
          
      ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status change from pending to approved
        IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
          -- Deduct from balance
          UPDATE hris.employee_time_off_balance
          SET 
            total_used = total_used + NEW.total_days,
            current_balance = current_balance - NEW.total_days,
            updated_at = NOW()
          WHERE employee_id = NEW.employee_id
            AND time_off_type_id = NEW.time_off_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
            
        -- Handle status change from approved to cancelled
        ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
          -- Restore balance using OLD.total_days (the amount that was originally deducted)
          UPDATE hris.employee_time_off_balance
          SET 
            total_used = total_used - OLD.total_days,
            current_balance = current_balance + OLD.total_days,
            updated_at = NOW()
          WHERE employee_id = NEW.employee_id
            AND time_off_type_id = NEW.time_off_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Trigger for time off balance updates
  await knex.raw(`
    CREATE TRIGGER trg_update_time_off_balance
    AFTER INSERT OR UPDATE ON hris.time_off_request
    FOR EACH ROW
    EXECUTE FUNCTION hris.update_time_off_balance()
  `);

  // Function to update timestamps
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Apply update_updated_at trigger to employee table
  await knex.raw(`
    CREATE TRIGGER trg_employee_updated_at
    BEFORE UPDATE ON hris.employee
    FOR EACH ROW
    EXECUTE FUNCTION hris.update_updated_at_column()
  `);

  // Apply update_updated_at trigger to contract table
  await knex.raw(`
    CREATE TRIGGER trg_contract_updated_at
    BEFORE UPDATE ON hris.contract
    FOR EACH ROW
    EXECUTE FUNCTION hris.update_updated_at_column()
  `);

  // ===========================
  // COMMENTS
  // ===========================
  
  await knex.raw(`COMMENT ON SCHEMA hris IS 'Nexus HRIS - Enterprise Human Resource Information System'`);
  await knex.raw(`COMMENT ON TABLE hris.employee IS 'Core employee records with personal and employment information'`);
  await knex.raw(`COMMENT ON TABLE hris.contract IS 'Employment contracts with sequence-based lifecycle management'`);
  await knex.raw(`COMMENT ON TABLE hris.time_off_type IS 'Time off policy definitions with flexible JSON-based accrual rules'`);
  await knex.raw(`COMMENT ON TABLE hris.rule_definition IS 'Policy automation rules - MVP uses JSON storage, Phase 2 will add advanced execution engine'`);

  // ===========================
  // ROW LEVEL SECURITY (RLS) POLICIES
  // ===========================
  
  // Enable RLS on all tables
  await knex.raw('ALTER TABLE hris.user_account ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.tenant_refresh_tokens ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.department ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.location ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.worker_type ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.employee ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.employment_history ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.contract_sequence_policy ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.contract_sequence_step ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.contract ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.review_template ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.performance_review ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.performance_goal ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.feedback ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.benefits_plan ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.employee_benefit_enrollment ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.time_off_type ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.employee_time_off_balance ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.time_off_request ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.time_off_accrual_history ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.attendance_record ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.rule_definition ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.rule_execution_history ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.document_category ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.employee_document ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE hris.audit_log ENABLE ROW LEVEL SECURITY');

  // Create RLS policies for all tables (SELECT and INSERT)
  const hrisTables = [
    'user_account', 'tenant_refresh_tokens', 'department', 'location', 'worker_type',
    'employee', 'employment_history', 'contract_sequence_policy', 'contract_sequence_step',
    'contract', 'review_template', 'performance_review', 'performance_goal', 'feedback',
    'benefits_plan', 'employee_benefit_enrollment', 'time_off_type', 'employee_time_off_balance',
    'time_off_request', 'time_off_accrual_history', 'attendance_record', 'rule_definition',
    'rule_execution_history', 'document_category', 'employee_document', 'audit_log'
  ];

  for (const tableName of hrisTables) {
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation ON hris.${tableName}
      USING (organization_id = hris.get_current_organization_id())
    `);
    
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation_insert ON hris.${tableName}
      FOR INSERT
      WITH CHECK (organization_id = hris.get_current_organization_id())
    `);
  }

  // ===========================
  // GRANTS
  // ===========================
  
  // Grant appropriate permissions
  await knex.raw('GRANT USAGE ON SCHEMA hris TO PUBLIC');
  await knex.raw('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hris TO PUBLIC');
  await knex.raw('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hris TO PUBLIC');
};

export async function down(knex) {
  // Drop in reverse order
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
};
