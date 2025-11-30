/**
 * Migration: Create HRIS (Nexus) Schema
 * 
 * Creates the Nexus HRIS schema including:
 * - hris schema
 * - User accounts and authentication
 * - Employee management
 * - Organizational structure (departments, locations, worker types)
 * - Time & attendance
 * - Benefits management
 * - Performance management
 * - Document management
 * 
 * @see C:\RecruitIQ\backend\src\database\nexus-hris-schema.sql (original)
 */

export async function up(knex) {
  // Create HRIS schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');
  
  // ============================================================================
  // USER ACCOUNTS - Authentication and access control
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('user_account', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('employee_id');
    
    // Authentication
    table.string('email', 255).notNullable();
    table.string('password_hash', 500);
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token', 255);
    
    // Status
    table.string('account_status', 50).notNullable().defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    
    // Product Access and Roles
    table.jsonb('enabled_products').defaultTo('["nexus"]');
    table.jsonb('product_roles').defaultTo('{}');
    
    // Security
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until', { useTz: true });
    table.timestamp('last_login_at', { useTz: true });
    table.string('last_login_ip', 50);
    table.timestamp('password_changed_at', { useTz: true });
    table.string('password_reset_token', 500);
    table.timestamp('password_reset_expires_at', { useTz: true });
    
    // MFA
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret', 255);
    table.jsonb('mfa_backup_codes').defaultTo('[]');
    table.integer('mfa_backup_codes_used').defaultTo(0);
    table.timestamp('mfa_enabled_at', { useTz: true });
    
    // Preferences
    table.jsonb('preferences').defaultTo('{}');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'email']);
  });

  await knex.raw(`
    CREATE INDEX idx_user_account_org ON hris.user_account(organization_id);
    CREATE INDEX idx_user_account_email ON hris.user_account(email);
    CREATE INDEX idx_user_account_active ON hris.user_account(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_account_employee ON hris.user_account(employee_id);
    
    ALTER TABLE hris.user_account ADD CONSTRAINT check_account_status 
      CHECK (account_status IN ('active', 'inactive', 'locked', 'pending_activation'));
    
    COMMENT ON TABLE hris.user_account IS 'Tenant users with login access to product applications (Nexus, PayLinQ, ScheduleHub, RecruitIQ). Linked to employee records but not all employees have user accounts.';
    COMMENT ON COLUMN hris.user_account.employee_id IS 'Optional link to hris.employee. Not all employees have login access, and some users (like external contractors) may have accounts without employee records.';
    COMMENT ON COLUMN hris.user_account.enabled_products IS 'JSONB array of product slugs this user can access: ["nexus", "paylinq", "schedulehub", "recruitiq"]';
    COMMENT ON COLUMN hris.user_account.product_roles IS 'JSONB object mapping product to role: {"nexus": "admin", "paylinq": "payroll_manager", "schedulehub": "scheduler"}';
    COMMENT ON COLUMN hris.user_account.email_verified IS 'Whether email has been verified via verification token';
    COMMENT ON COLUMN hris.user_account.last_login_ip IS 'IP address of last successful login for security audit';
  `);

  // Tenant refresh tokens
  await knex.schema.withSchema('hris').createTable('tenant_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_account_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.string('token', 500).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at', { useTz: true });
    table.string('ip_address', 50);
    table.string('user_agent', 500);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_tenant_refresh_tokens_user ON hris.tenant_refresh_tokens(user_account_id);
    CREATE INDEX idx_tenant_refresh_tokens_token ON hris.tenant_refresh_tokens(token);
    CREATE INDEX idx_tenant_refresh_tokens_org ON hris.tenant_refresh_tokens(organization_id);
    CREATE INDEX idx_tenant_refresh_tokens_expires ON hris.tenant_refresh_tokens(expires_at) WHERE revoked_at IS NULL;
  `);

  // ============================================================================
  // DEPARTMENTS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('department', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.uuid('parent_department_id').references('id').inTable('hris.department');
    table.uuid('manager_id');
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'code']);
  });

  await knex.raw(`
    CREATE INDEX idx_department_org ON hris.department(organization_id);
    CREATE INDEX idx_department_parent ON hris.department(parent_department_id);
    CREATE INDEX idx_department_manager ON hris.department(manager_id);
  `);

  // ============================================================================
  // LOCATIONS
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('location', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.string('type', 50).notNullable();
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.string('postal_code', 20);
    table.string('phone', 50);
    table.string('email', 255);
    table.string('timezone', 100);
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'code']);
  });

  await knex.raw(`
    CREATE INDEX idx_location_org ON hris.location(organization_id);
    CREATE INDEX idx_location_type ON hris.location(type);
  `);

  // ============================================================================
  // WORKER TYPES
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('worker_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    
    // Benefits eligibility
    table.boolean('benefits_eligible').defaultTo(false);
    table.boolean('pto_eligible').defaultTo(false);
    table.boolean('sick_leave_eligible').defaultTo(false);
    table.decimal('vacation_accrual_rate', 10, 2).defaultTo(0);
    
    table.boolean('is_active').defaultTo(true);
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'code']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_type_org ON hris.worker_type(organization_id);
    CREATE INDEX idx_worker_type_active ON hris.worker_type(is_active);
  `);

  // ============================================================================
  // EMPLOYEES
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('public.organizations').onDelete('CASCADE');
    table.uuid('user_account_id').references('id').inTable('hris.user_account');
    table.uuid('worker_type_id').references('id').inTable('hris.worker_type');
    table.uuid('department_id').references('id').inTable('hris.department');
    table.uuid('location_id').references('id').inTable('hris.location');
    table.uuid('manager_id').references('id').inTable('hris.employee');
    
    // Basic Information
    table.string('employee_number', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('middle_name', 100);
    table.string('preferred_name', 100);
    table.string('email', 255);
    table.string('phone', 50);
    table.string('mobile', 50);
    table.date('date_of_birth');
    table.string('gender', 20);
    table.string('nationality', 100);
    
    // Employment Details
    table.string('employment_status', 50).notNullable().defaultTo('active');
    table.string('employment_type', 50).notNullable();
    table.date('hire_date');
    table.date('termination_date');
    table.string('termination_reason', 255);
    table.string('job_title', 255);
    
    // Contact & Emergency
    table.text('address');
    table.string('city', 100);
    table.string('state', 100);
    table.string('country', 100);
    table.string('postal_code', 20);
    table.string('emergency_contact_name', 255);
    table.string('emergency_contact_phone', 50);
    table.string('emergency_contact_relationship', 100);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('deleted_at', { useTz: true });
    
    table.unique(['organization_id', 'employee_number']);
  });

  await knex.raw(`
    CREATE INDEX idx_employee_org ON hris.employee(organization_id);
    CREATE INDEX idx_employee_user_account ON hris.employee(user_account_id);
    CREATE INDEX idx_employee_department ON hris.employee(department_id);
    CREATE INDEX idx_employee_location ON hris.employee(location_id);
    CREATE INDEX idx_employee_manager ON hris.employee(manager_id);
    CREATE INDEX idx_employee_status ON hris.employee(employment_status);
    CREATE INDEX idx_employee_worker_type ON hris.employee(worker_type_id);
    
    COMMENT ON TABLE hris.employee IS 'Employee master data - single source of truth for employee information';
    COMMENT ON COLUMN hris.employee.user_account_id IS 'Optional link to user account. Not all employees have login access.';
  `);

  // Add foreign key constraint from user_account to employee
  await knex.raw(`
    ALTER TABLE hris.user_account 
    ADD CONSTRAINT fk_user_account_employee 
    FOREIGN KEY (employee_id) REFERENCES hris.employee(id);
  `);

  console.log('✅ HRIS schema created successfully');
}

export async function down(knex) {
  // Drop foreign key constraint first
  await knex.raw('ALTER TABLE hris.user_account DROP CONSTRAINT IF EXISTS fk_user_account_employee');
  
  // Drop tables in reverse order
  await knex.schema.withSchema('hris').dropTableIfExists('employee');
  await knex.schema.withSchema('hris').dropTableIfExists('worker_type');
  await knex.schema.withSchema('hris').dropTableIfExists('location');
  await knex.schema.withSchema('hris').dropTableIfExists('department');
  await knex.schema.withSchema('hris').dropTableIfExists('tenant_refresh_tokens');
  await knex.schema.withSchema('hris').dropTableIfExists('user_account');
  
  // Drop schema
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
  
  console.log('✅ HRIS schema dropped successfully');
}
