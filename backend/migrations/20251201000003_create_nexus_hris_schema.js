/**
 * Migration: Create Nexus HRIS Schema
 * Source: nexus-hris-schema.sql
 * 
 * Creates the comprehensive HRIS (Human Resources Information System) schema
 * with employee management, contracts, benefits, time-off, attendance, and more.
 */

exports.up = async function(knex) {
  // Create hris schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS hris');
  
  // Enable required extension for GIST indexes
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');
  
  // Helper function for RLS policies
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.get_current_organization_id() 
    RETURNS UUID AS $$
    BEGIN
      RETURN current_setting('app.current_organization_id', TRUE)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `);
  
  await knex.raw(`
    COMMENT ON FUNCTION hris.get_current_organization_id() IS 
    'Returns the current organization ID from session context for RLS policies'
  `);

  // ===========================
  // USER ACCOUNTS
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('user_account', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').nullable(); // Circular FK, will be added later
    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('role', 50).notNullable().defaultTo('employee');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at', { useTz: true }).nullable();
    table.string('mfa_secret', 255).nullable();
    table.boolean('mfa_enabled').notNullable().defaultTo(false);
    table.jsonb('preferences').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'email']);
    table.index('organization_id');
    table.index('email');
    table.index(['organization_id', 'is_active']);
    table.check('?? IN (?, ?, ?, ?, ?)', ['role', 'admin', 'manager', 'employee', 'hr_manager', 'recruiter']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.user_account IS 'User accounts for employees and staff';
    COMMENT ON COLUMN hris.user_account.employee_id IS 'Links to employee record (circular reference)';
    COMMENT ON COLUMN hris.user_account.role IS 'User role: admin, manager, employee, hr_manager, recruiter';
  `);

  await knex.schema.withSchema('hris').createTable('tenant_refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.text('token_hash').notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean('is_revoked').notNullable().defaultTo(false);
    table.string('device_info', 500).nullable();
    table.inet('ip_address').nullable();
    
    table.unique('token_hash');
    table.index('user_id');
    table.index('expires_at');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.tenant_refresh_tokens IS 'Refresh tokens for tenant users';
  `);

  // ===========================
  // ORGANIZATIONAL STRUCTURE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('department', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.uuid('parent_department_id').nullable();
    table.uuid('manager_id').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('organization_id');
    table.index('parent_department_id');
    table.index('manager_id');
  });
  
  // Self-referencing FK
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT fk_department_parent 
    FOREIGN KEY (parent_department_id) 
    REFERENCES hris.department(id) ON DELETE SET NULL
  `);
  
  await knex.raw(`
    COMMENT ON TABLE hris.department IS 'Organizational departments';
  `);

  await knex.schema.withSchema('hris').createTable('location', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('address', 255).nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('country', 100).notNullable();
    table.string('phone', 20).nullable();
    table.string('email', 255).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index('organization_id');
    table.index(['organization_id', 'is_active']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.location IS 'Physical locations for the organization';
  `);

  await knex.schema.withSchema('hris').createTable('worker_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.string('default_pay_frequency', 20).notNullable().defaultTo('monthly');
    table.boolean('benefits_eligible').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'name']);
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['default_pay_frequency', 'daily', 'weekly', 'biweekly', 'monthly']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.worker_type IS 'Worker classification types';
  `);

  // ===========================
  // EMPLOYEE CORE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('employee', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_account_id').nullable(); // Circular FK
    table.string('employee_number', 50).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('middle_name', 100).nullable();
    table.string('preferred_name', 100).nullable();
    table.date('date_of_birth').nullable();
    table.string('gender', 20).nullable();
    table.string('nationality', 100).nullable();
    table.string('marital_status', 20).nullable();
    table.string('personal_email', 255).nullable();
    table.string('work_email', 255).nullable();
    table.string('phone_number', 20).nullable();
    table.string('mobile_number', 20).nullable();
    table.string('emergency_contact_name', 255).nullable();
    table.string('emergency_contact_phone', 20).nullable();
    table.string('emergency_contact_relationship', 100).nullable();
    table.text('address').nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('country', 100).nullable();
    table.uuid('department_id').nullable().references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('manager_id').nullable();
    table.uuid('worker_type_id').nullable().references('id').inTable('hris.worker_type').onDelete('SET NULL');
    table.string('job_title', 100).nullable();
    table.date('hire_date').notNullable();
    table.date('termination_date').nullable();
    table.string('employment_status', 50).notNullable().defaultTo('active');
    table.string('employment_type', 50).notNullable().defaultTo('full_time');
    table.boolean('is_suriname_resident').notNullable().defaultTo(true);
    table.string('profile_image_url', 500).nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'employee_number']);
    table.unique(['organization_id', 'work_email']);
    table.index('organization_id');
    table.index('department_id');
    table.index('location_id');
    table.index('manager_id');
    table.index('employment_status');
    table.index(['organization_id', 'employment_status']);
    table.check('?? IN (?, ?, ?, ?, ?)', ['employment_status', 'active', 'terminated', 'suspended', 'on_leave', 'probation']);
    table.check('?? IN (?, ?, ?, ?)', ['employment_type', 'full_time', 'part_time', 'contract', 'temporary']);
    table.check('?? IN (?, ?, ?, ?)', ['gender', 'male', 'female', 'other', 'prefer_not_to_say']);
    table.check('?? IN (?, ?, ?, ?, ?)', ['marital_status', 'single', 'married', 'divorced', 'widowed', 'other']);
  });
  
  // Self-referencing FK for manager
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT fk_employee_manager 
    FOREIGN KEY (manager_id) 
    REFERENCES hris.employee(id) ON DELETE SET NULL
  `);
  
  await knex.raw(`
    COMMENT ON TABLE hris.employee IS 'Core employee information';
    COMMENT ON COLUMN hris.employee.is_suriname_resident IS 'Flag for Surinamese tax calculations';
  `);

  // Circular FK between user_account and employee
  await knex.raw(`
    ALTER TABLE hris.user_account 
    ADD CONSTRAINT fk_user_account_employee 
    FOREIGN KEY (employee_id) 
    REFERENCES hris.employee(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
  `);
  
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT fk_employee_user_account 
    FOREIGN KEY (user_account_id) 
    REFERENCES hris.user_account(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
  `);
  
  await knex.raw(`
    ALTER TABLE hris.department 
    ADD CONSTRAINT fk_department_manager 
    FOREIGN KEY (manager_id) 
    REFERENCES hris.employee(id) ON DELETE SET NULL
  `);

  await knex.schema.withSchema('hris').createTable('employment_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.string('job_title', 100).notNullable();
    table.uuid('department_id').nullable().references('id').inTable('hris.department').onDelete('SET NULL');
    table.uuid('location_id').nullable().references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('manager_id').nullable().references('id').inTable('hris.employee').onDelete('SET NULL');
    table.string('employment_type', 50).notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('organization_id');
  });
  
  // EXCLUDE constraint for overlapping periods
  await knex.raw(`
    ALTER TABLE hris.employment_history 
    ADD CONSTRAINT employment_history_no_overlap 
    EXCLUDE USING GIST (
      employee_id WITH =,
      daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
    )
  `);
  
  await knex.raw(`
    COMMENT ON TABLE hris.employment_history IS 'Employment history tracking position changes';
  `);

  // ===========================
  // CONTRACTS
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('contract_sequence_policy', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.integer('max_temporary_contracts').notNullable();
    table.integer('temporary_contract_duration_months').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'name']);
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.contract_sequence_policy IS 'Policies for contract sequences (temporary → permanent)';
  `);

  await knex.schema.withSchema('hris').createTable('contract_sequence_step', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('policy_id').notNullable().references('id').inTable('hris.contract_sequence_policy').onDelete('CASCADE');
    table.integer('step_number').notNullable();
    table.string('contract_type', 50).notNullable();
    table.integer('duration_months').notNullable();
    table.boolean('requires_evaluation').notNullable().defaultTo(false);
    table.integer('notice_period_days').nullable();
    
    table.unique(['policy_id', 'step_number']);
    table.index('policy_id');
    table.check('?? IN (?, ?)', ['contract_type', 'temporary', 'permanent']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.contract_sequence_step IS 'Steps in a contract sequence policy';
  `);

  await knex.schema.withSchema('hris').createTable('contract', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('policy_id').nullable().references('id').inTable('hris.contract_sequence_policy').onDelete('SET NULL');
    table.integer('sequence_step').nullable();
    table.string('contract_type', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.text('terms').nullable();
    table.string('document_url', 500).nullable();
    table.date('signed_date').nullable();
    table.uuid('signed_by_employee').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('signed_by_employer').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('organization_id');
    table.index('status');
    table.check('?? IN (?, ?)', ['contract_type', 'temporary', 'permanent']);
    table.check('?? IN (?, ?, ?, ?)', ['status', 'draft', 'active', 'expired', 'terminated']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.contract IS 'Employee contracts';
  `);

  // ===========================
  // PERFORMANCE MANAGEMENT
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('review_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.jsonb('questions').notNullable().defaultTo('[]');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'name']);
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.review_template IS 'Templates for performance reviews';
  `);

  await knex.schema.withSchema('hris').createTable('performance_review', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('reviewer_id').notNullable().references('id').inTable('hris.employee').onDelete('RESTRICT');
    table.uuid('template_id').nullable().references('id').inTable('hris.review_template').onDelete('SET NULL');
    table.date('review_date').notNullable();
    table.string('review_period', 50).notNullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.jsonb('responses').defaultTo('{}');
    table.decimal('overall_rating', 3, 2).nullable();
    table.text('strengths').nullable();
    table.text('areas_for_improvement').nullable();
    table.text('goals').nullable();
    table.text('comments').nullable();
    table.boolean('employee_acknowledged').notNullable().defaultTo(false);
    table.timestamp('employee_acknowledged_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('reviewer_id');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?)', ['status', 'draft', 'completed', 'archived']);
    table.check('?? >= ? AND ?? <= ?', ['overall_rating', 0, 'overall_rating', 5]);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.performance_review IS 'Employee performance reviews';
  `);

  await knex.schema.withSchema('hris').createTable('performance_goal', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('review_id').nullable().references('id').inTable('hris.performance_review').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.date('target_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('not_started');
    table.integer('progress_percentage').notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('review_id');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['status', 'not_started', 'in_progress', 'completed', 'cancelled']);
    table.check('?? >= ? AND ?? <= ?', ['progress_percentage', 0, 'progress_percentage', 100]);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.performance_goal IS 'Employee performance goals';
  `);

  await knex.schema.withSchema('hris').createTable('feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('from_user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.string('feedback_type', 50).notNullable();
    table.text('feedback_text').notNullable();
    table.boolean('is_anonymous').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('employee_id');
    table.index('from_user_id');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?)', ['feedback_type', 'praise', 'constructive', 'concern']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.feedback IS 'Peer and manager feedback';
  `);

  // ===========================
  // BENEFITS
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('benefits_plan', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('plan_name', 100).notNullable();
    table.string('plan_type', 50).notNullable();
    table.text('description').nullable();
    table.string('provider', 100).nullable();
    table.decimal('employee_contribution', 10, 2).nullable();
    table.decimal('employer_contribution', 10, 2).nullable();
    table.date('effective_date').notNullable();
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'plan_name']);
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['plan_type', 'health', 'dental', 'vision', 'retirement']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.benefits_plan IS 'Benefits plans offered';
  `);

  await knex.schema.withSchema('hris').createTable('employee_benefit_enrollment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('plan_id').notNullable().references('id').inTable('hris.benefits_plan').onDelete('RESTRICT');
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('end_date').nullable();
    table.string('status', 50).notNullable().defaultTo('active');
    table.decimal('employee_contribution', 10, 2).nullable();
    table.jsonb('coverage_details').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('plan_id');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['status', 'active', 'pending', 'terminated', 'cancelled']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.employee_benefit_enrollment IS 'Employee benefit enrollments';
  `);

  // ===========================
  // TIME OFF
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('time_off_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.boolean('is_paid').notNullable().defaultTo(true);
    table.boolean('requires_approval').notNullable().defaultTo(true);
    table.decimal('default_balance', 10, 2).notNullable().defaultTo(0);
    table.string('accrual_rule', 50).nullable();
    table.decimal('accrual_rate', 10, 2).nullable();
    table.boolean('carry_over_allowed').notNullable().defaultTo(false);
    table.decimal('max_carry_over', 10, 2).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'name']);
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.time_off_type IS 'Types of time off (vacation, sick leave, etc.)';
  `);

  await knex.schema.withSchema('hris').createTable('employee_time_off_balance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    table.integer('year').notNullable();
    table.decimal('total_balance', 10, 2).notNullable().defaultTo(0);
    table.decimal('used_balance', 10, 2).notNullable().defaultTo(0);
    table.decimal('pending_balance', 10, 2).notNullable().defaultTo(0);
    table.decimal('available_balance', 10, 2).notNullable().defaultTo(0);
    table.timestamp('last_updated', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['employee_id', 'time_off_type_id', 'year']);
    table.index('employee_id');
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.employee_time_off_balance IS 'Employee time off balances';
  `);

  await knex.schema.withSchema('hris').createTable('time_off_request', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('days_requested', 10, 2).notNullable();
    table.string('status', 50).notNullable().defaultTo('pending');
    table.text('reason').nullable();
    table.text('rejection_reason').nullable();
    table.uuid('approved_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('employee_id');
    table.index('time_off_type_id');
    table.index('status');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['status', 'pending', 'approved', 'rejected', 'cancelled']);
    table.check('?? <= ??', ['start_date', 'end_date']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.time_off_request IS 'Time off requests';
  `);

  await knex.schema.withSchema('hris').createTable('time_off_accrual_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    table.date('accrual_date').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('accrual_type', 50).notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index('employee_id');
    table.index('time_off_type_id');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['accrual_type', 'initial', 'accrual', 'adjustment', 'carry_over']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.time_off_accrual_history IS 'Time off accrual history';
  `);

  // ===========================
  // ATTENDANCE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('attendance_record', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.date('date').notNullable();
    table.time('clock_in').nullable();
    table.time('clock_out').nullable();
    table.string('status', 50).notNullable();
    table.decimal('hours_worked', 5, 2).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['employee_id', 'date']);
    table.index('employee_id');
    table.index('date');
    table.index('organization_id');
    table.check('?? IN (?, ?, ?, ?)', ['status', 'present', 'absent', 'late', 'half_day']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.attendance_record IS 'Daily attendance records';
  `);

  // ===========================
  // RULES ENGINE
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('rule_definition', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('rule_name', 100).notNullable();
    table.string('rule_type', 50).notNullable();
    table.text('description').nullable();
    table.jsonb('conditions').notNullable().defaultTo('{}');
    table.jsonb('actions').notNullable().defaultTo('{}');
    table.integer('priority').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.unique(['organization_id', 'rule_name']);
    table.index('organization_id');
    table.index(['rule_type', 'is_active']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.rule_definition IS 'Business rules definitions';
  `);

  await knex.schema.withSchema('hris').createTable('rule_execution_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('rule_id').notNullable().references('id').inTable('hris.rule_definition').onDelete('CASCADE');
    table.timestamp('executed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.jsonb('input_data').defaultTo('{}');
    table.jsonb('output_data').defaultTo('{}');
    table.boolean('success').notNullable();
    table.text('error_message').nullable();
    
    table.index('rule_id');
    table.index('executed_at');
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.rule_execution_history IS 'Audit log for rule executions';
  `);

  // ===========================
  // DOCUMENTS
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('document_category', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['organization_id', 'name']);
    table.index('organization_id');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.document_category IS 'Document categories';
  `);

  await knex.schema.withSchema('hris').createTable('employee_document', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('category_id').nullable().references('id').inTable('hris.document_category').onDelete('SET NULL');
    table.string('document_name', 255).notNullable();
    table.string('document_type', 100).nullable();
    table.string('file_url', 500).notNullable();
    table.bigInteger('file_size').nullable();
    table.date('expiry_date').nullable();
    table.text('notes').nullable();
    table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('uploaded_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    
    table.index('employee_id');
    table.index('category_id');
    table.index('organization_id');
    table.index('expiry_date');
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.employee_document IS 'Employee documents';
  `);

  // ===========================
  // AUDIT LOG
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('table_name', 100).notNullable();
    table.uuid('record_id').notNullable();
    table.string('action', 50).notNullable();
    table.jsonb('old_values').nullable();
    table.jsonb('new_values').nullable();
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.inet('ip_address').nullable();
    
    table.index('organization_id');
    table.index('user_id');
    table.index('table_name');
    table.index('record_id');
    table.index('timestamp');
    table.check('?? IN (?, ?, ?)', ['action', 'INSERT', 'UPDATE', 'DELETE']);
  });
  
  await knex.raw(`
    COMMENT ON TABLE hris.audit_log IS 'Audit log for all HRIS operations';
  `);

  // ===========================
  // VIEWS
  // ===========================
  
  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_active_employees AS
    SELECT 
      e.*,
      d.name AS department_name,
      l.name AS location_name,
      m.first_name || ' ' || m.last_name AS manager_name,
      w.name AS worker_type_name
    FROM hris.employee e
    LEFT JOIN hris.department d ON e.department_id = d.id
    LEFT JOIN hris.location l ON e.location_id = l.id
    LEFT JOIN hris.employee m ON e.manager_id = m.id
    LEFT JOIN hris.worker_type w ON e.worker_type_id = w.id
    WHERE e.employment_status = 'active' 
      AND e.deleted_at IS NULL
  `);
  
  await knex.raw(`
    COMMENT ON VIEW hris.v_active_employees IS 'Active employees with related information';
  `);

  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_time_off_balance_summary AS
    SELECT 
      e.id AS employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      t.name AS time_off_type,
      b.year,
      b.total_balance,
      b.used_balance,
      b.pending_balance,
      b.available_balance,
      b.last_updated
    FROM hris.employee_time_off_balance b
    JOIN hris.employee e ON b.employee_id = e.id
    JOIN hris.time_off_type t ON b.time_off_type_id = t.id
    WHERE e.deleted_at IS NULL
  `);
  
  await knex.raw(`
    COMMENT ON VIEW hris.v_time_off_balance_summary IS 'Time off balance summary';
  `);

  await knex.raw(`
    CREATE OR REPLACE VIEW hris.v_contracts_expiring_soon AS
    SELECT 
      c.*,
      e.first_name || ' ' || e.last_name AS employee_name,
      e.employee_number,
      c.end_date - CURRENT_DATE AS days_until_expiry
    FROM hris.contract c
    JOIN hris.employee e ON c.employee_id = e.id
    WHERE c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
      AND e.deleted_at IS NULL
    ORDER BY c.end_date
  `);
  
  await knex.raw(`
    COMMENT ON VIEW hris.v_contracts_expiring_soon IS 'Contracts expiring within 90 days';
  `);

  // ===========================
  // FUNCTIONS
  // ===========================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.update_time_off_balance()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
          UPDATE hris.employee_time_off_balance
          SET 
            used_balance = used_balance + NEW.days_requested,
            available_balance = total_balance - (used_balance + NEW.days_requested) - pending_balance,
            last_updated = NOW()
          WHERE employee_id = NEW.employee_id
            AND time_off_type_id = NEW.time_off_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        ELSIF NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'pending' THEN
          UPDATE hris.employee_time_off_balance
          SET 
            pending_balance = pending_balance - NEW.days_requested,
            available_balance = total_balance - used_balance - (pending_balance - NEW.days_requested),
            last_updated = NOW()
          WHERE employee_id = NEW.employee_id
            AND time_off_type_id = NEW.time_off_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  await knex.raw(`
    COMMENT ON FUNCTION hris.update_time_off_balance() IS 
    'Updates time off balances when requests are approved/rejected';
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  await knex.raw(`
    COMMENT ON FUNCTION hris.update_updated_at_column() IS 
    'Automatically updates updated_at timestamp';
  `);

  // ===========================
  // TRIGGERS
  // ===========================
  
  await knex.raw(`
    CREATE TRIGGER trg_time_off_request_update_balance
    AFTER INSERT OR UPDATE ON hris.time_off_request
    FOR EACH ROW
    EXECUTE FUNCTION hris.update_time_off_balance()
  `);

  // Updated_at triggers
  const tablesWithUpdatedAt = [
    'user_account', 'department', 'location', 'worker_type', 'employee',
    'contract_sequence_policy', 'contract', 'review_template', 'performance_review',
    'performance_goal', 'benefits_plan', 'employee_benefit_enrollment',
    'time_off_type', 'time_off_request', 'attendance_record',
    'rule_definition', 'document_category'
  ];
  
  for (const tableName of tablesWithUpdatedAt) {
    await knex.raw(`
      CREATE TRIGGER trg_${tableName}_updated_at
      BEFORE UPDATE ON hris.${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION hris.update_updated_at_column()
    `);
  }

  // ===========================
  // ROW LEVEL SECURITY
  // ===========================
  
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

  // Create RLS policies for all tables
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
  
  await knex.raw('GRANT USAGE ON SCHEMA hris TO recruitiq_app');
  await knex.raw('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hris TO recruitiq_app');
  await knex.raw('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hris TO recruitiq_app');
  await knex.raw('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hris TO recruitiq_app');
};

exports.down = async function(knex) {
  // Drop in reverse order
  await knex.raw('DROP SCHEMA IF EXISTS hris CASCADE');
};
