/**
 * Migration: Create Extended HRIS Tables
 * 
 * Creates additional HRIS tables for:
 * - Employee documents and skills
 * - Emergency contacts and dependents
 * - Education and work history
 * - Certifications
 * - Performance reviews and goals
 * - Time-off requests and balances
 * - Attendance records
 * - Payroll records
 * - Benefits management
 * - Training programs
 * - Announcements
 * - Employee notes
 */

export async function up(knex) {
  // ============================================================================
  // EMPLOYEE_DOCUMENTS - Document management for employees
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Document details
    table.string('document_type', 100).notNullable();
    table.string('document_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('file_type', 50);
    table.integer('file_size');
    
    // Metadata
    table.text('description');
    table.date('issue_date');
    table.date('expiry_date');
    table.string('status', 50).defaultTo('active');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_documents_employee_id ON hris.employee_documents(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_documents_organization_id ON hris.employee_documents(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_documents_document_type ON hris.employee_documents(document_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_documents_expiry_date ON hris.employee_documents(expiry_date) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_documents IS 'Document storage and management for employees';
  `);

  // ============================================================================
  // EMPLOYEE_SKILLS - Skills tracking (junction table)
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_skills', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Skill details
    table.string('skill_name', 255).notNullable();
    table.string('proficiency_level', 50);
    table.integer('years_of_experience');
    table.boolean('is_primary_skill').defaultTo(false);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['employee_id', 'skill_name']);
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_skills_employee_id ON hris.employee_skills(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_skills_organization_id ON hris.employee_skills(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_skills_skill_name ON hris.employee_skills(skill_name) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_skills IS 'Employee skills and competencies tracking';
  `);

  // ============================================================================
  // EMERGENCY_CONTACTS - Emergency contact information
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('emergency_contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Contact details
    table.string('contact_name', 255).notNullable();
    table.string('relationship', 100).notNullable();
    table.string('phone_primary', 20).notNullable();
    table.string('phone_secondary', 20);
    table.string('email', 255);
    table.text('address');
    
    // Priority
    table.integer('priority_order').defaultTo(1);
    table.boolean('is_primary').defaultTo(false);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_emergency_contacts_employee_id ON hris.emergency_contacts(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_emergency_contacts_organization_id ON hris.emergency_contacts(organization_id) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.emergency_contacts IS 'Emergency contact information for employees';
  `);

  // ============================================================================
  // EMPLOYEE_DEPENDENTS - Dependent information
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_dependents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Dependent details
    table.string('dependent_name', 255).notNullable();
    table.string('relationship', 100).notNullable();
    table.date('date_of_birth').notNullable();
    table.string('gender', 20);
    table.string('ssn', 20);
    
    // Status
    table.boolean('is_eligible_for_benefits').defaultTo(false);
    table.boolean('is_tax_dependent').defaultTo(false);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_dependents_employee_id ON hris.employee_dependents(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_dependents_organization_id ON hris.employee_dependents(organization_id) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_dependents IS 'Dependent and family member information';
  `);

  // ============================================================================
  // EMPLOYEE_EDUCATION - Education history
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_education', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Education details
    table.string('institution_name', 255).notNullable();
    table.string('degree_type', 100);
    table.string('field_of_study', 255);
    table.date('start_date');
    table.date('end_date');
    table.boolean('is_currently_enrolled').defaultTo(false);
    table.string('gpa', 20);
    
    // Additional info
    table.text('description');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_education_employee_id ON hris.employee_education(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_education_organization_id ON hris.employee_education(organization_id) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_education IS 'Employee education history and qualifications';
  `);

  // ============================================================================
  // EMPLOYEE_WORK_HISTORY - Previous employment history
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_work_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Employment details
    table.string('company_name', 255).notNullable();
    table.string('job_title', 255).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date');
    table.boolean('is_current').defaultTo(false);
    
    // Job details
    table.text('job_description');
    table.string('reason_for_leaving', 500);
    table.string('supervisor_name', 255);
    table.string('supervisor_contact', 100);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_work_history_employee_id ON hris.employee_work_history(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_work_history_organization_id ON hris.employee_work_history(organization_id) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_work_history IS 'Previous employment history for employees';
  `);

  // ============================================================================
  // EMPLOYEE_CERTIFICATIONS - Professional certifications
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_certifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Certification details
    table.string('certification_name', 255).notNullable();
    table.string('issuing_organization', 255);
    table.string('credential_id', 100);
    table.string('credential_url', 500);
    
    // Dates
    table.date('issue_date');
    table.date('expiry_date');
    table.boolean('does_not_expire').defaultTo(false);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_certifications_employee_id ON hris.employee_certifications(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_certifications_organization_id ON hris.employee_certifications(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_certifications_expiry_date ON hris.employee_certifications(expiry_date) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_certifications IS 'Professional certifications and licenses';
  `);

  // ============================================================================
  // PERFORMANCE_REVIEWS - Performance review records
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('performance_reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('reviewer_id').notNullable().references('id').inTable('hris.user_account').onDelete('RESTRICT');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Review details
    table.string('review_period', 100).notNullable();
    table.date('review_date').notNullable();
    table.string('review_type', 50);
    table.string('status', 50).defaultTo('draft');
    
    // Ratings
    table.decimal('overall_rating', 3, 2);
    table.jsonb('rating_categories').defaultTo('{}');
    
    // Feedback
    table.text('strengths');
    table.text('areas_for_improvement');
    table.text('goals_for_next_period');
    table.text('reviewer_comments');
    table.text('employee_comments');
    
    // Acknowledgment
    table.boolean('employee_acknowledged').defaultTo(false);
    table.timestamp('acknowledged_at', { useTz: true });
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_performance_reviews_employee_id ON hris.performance_reviews(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_reviews_reviewer_id ON hris.performance_reviews(reviewer_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_reviews_organization_id ON hris.performance_reviews(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_reviews_review_date ON hris.performance_reviews(review_date DESC) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.performance_reviews IS 'Employee performance review records';
  `);

  // ============================================================================
  // PERFORMANCE_GOALS - Performance goals and objectives
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('performance_goals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('review_id').nullable().references('id').inTable('hris.performance_reviews').onDelete('SET NULL');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Goal details
    table.string('goal_title', 255).notNullable();
    table.text('goal_description');
    table.string('goal_category', 100);
    table.date('target_date');
    table.string('status', 50).defaultTo('not_started');
    
    // Progress
    table.integer('progress_percentage').defaultTo(0);
    table.text('progress_notes');
    
    // Completion
    table.timestamp('completed_at', { useTz: true });
    table.text('completion_notes');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_performance_goals_employee_id ON hris.performance_goals(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_goals_review_id ON hris.performance_goals(review_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_goals_organization_id ON hris.performance_goals(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_performance_goals_status ON hris.performance_goals(status) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.performance_goals IS 'Employee goals and objectives tracking';
  `);

  // ============================================================================
  // TIME_OFF_REQUESTS - Time-off request management
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('time_off_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Request details
    table.string('request_type', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('days_requested', 5, 2).notNullable();
    table.text('reason');
    
    // Status
    table.string('status', 50).defaultTo('pending');
    table.uuid('approved_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('approved_at', { useTz: true });
    table.text('approval_notes');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_time_off_requests_employee_id ON hris.time_off_requests(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_time_off_requests_organization_id ON hris.time_off_requests(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_time_off_requests_status ON hris.time_off_requests(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_time_off_requests_dates ON hris.time_off_requests(start_date, end_date) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.time_off_requests IS 'Employee time-off requests and approvals';
  `);

  // ============================================================================
  // TIME_OFF_BALANCES - Time-off balance tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('time_off_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Balance details
    table.string('time_off_type', 50).notNullable();
    table.integer('year').notNullable();
    table.decimal('total_allocated', 5, 2).notNullable().defaultTo(0);
    table.decimal('used', 5, 2).notNullable().defaultTo(0);
    table.decimal('pending', 5, 2).notNullable().defaultTo(0);
    table.decimal('available', 5, 2).notNullable().defaultTo(0);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['employee_id', 'time_off_type', 'year']);
  });

  await knex.raw(`
    CREATE INDEX idx_hris_time_off_balances_employee_id ON hris.time_off_balances(employee_id);
    CREATE INDEX idx_hris_time_off_balances_organization_id ON hris.time_off_balances(organization_id);
    CREATE INDEX idx_hris_time_off_balances_year ON hris.time_off_balances(year);
    COMMENT ON TABLE hris.time_off_balances IS 'Employee time-off balance tracking';
  `);

  // ============================================================================
  // ATTENDANCE_RECORDS - Daily attendance tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('attendance_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Attendance details
    table.date('attendance_date').notNullable();
    table.time('check_in_time');
    table.time('check_out_time');
    table.string('status', 50).notNullable();
    
    // Additional info
    table.decimal('hours_worked', 5, 2);
    table.text('notes');
    table.string('location', 255);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['employee_id', 'attendance_date']);
  });

  await knex.raw(`
    CREATE INDEX idx_hris_attendance_records_employee_id ON hris.attendance_records(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_attendance_records_organization_id ON hris.attendance_records(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_attendance_records_date ON hris.attendance_records(attendance_date DESC) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_attendance_records_status ON hris.attendance_records(status) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.attendance_records IS 'Daily attendance records for employees';
  `);

  // ============================================================================
  // PAYROLL_RECORDS - Payroll payment records
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('payroll_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Payroll details
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('pay_date').notNullable();
    
    // Amounts
    table.decimal('gross_pay', 12, 2).notNullable();
    table.decimal('deductions', 12, 2).defaultTo(0);
    table.decimal('net_pay', 12, 2).notNullable();
    
    // Breakdown
    table.jsonb('earnings_breakdown').defaultTo('{}');
    table.jsonb('deductions_breakdown').defaultTo('{}');
    
    // Status
    table.string('status', 50).defaultTo('pending');
    table.string('payment_method', 50);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_payroll_records_employee_id ON hris.payroll_records(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_payroll_records_organization_id ON hris.payroll_records(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_payroll_records_pay_date ON hris.payroll_records(pay_date DESC) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_payroll_records_status ON hris.payroll_records(status) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.payroll_records IS 'Payroll payment records for employees';
  `);

  // ============================================================================
  // BENEFITS - Benefit plan definitions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('benefits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Benefit details
    table.string('benefit_name', 255).notNullable();
    table.string('benefit_type', 100).notNullable();
    table.text('description');
    table.string('provider', 255);
    
    // Cost
    table.decimal('employer_cost', 10, 2);
    table.decimal('employee_cost', 10, 2);
    
    // Configuration
    table.jsonb('configuration').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_benefits_organization_id ON hris.benefits(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_benefits_benefit_type ON hris.benefits(benefit_type) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_benefits_is_active ON hris.benefits(is_active) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.benefits IS 'Benefit plan definitions and configurations';
  `);

  // ============================================================================
  // EMPLOYEE_BENEFITS - Employee benefit enrollment (junction table)
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_benefits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('benefit_id').notNullable().references('id').inTable('hris.benefits').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Enrollment details
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('termination_date');
    table.string('status', 50).defaultTo('active');
    
    // Coverage
    table.string('coverage_level', 100);
    table.decimal('employee_contribution', 10, 2);
    table.jsonb('beneficiaries').defaultTo('[]');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['employee_id', 'benefit_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_benefits_employee_id ON hris.employee_benefits(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_benefits_benefit_id ON hris.employee_benefits(benefit_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_benefits_organization_id ON hris.employee_benefits(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_benefits_status ON hris.employee_benefits(status) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_benefits IS 'Employee benefit enrollment and coverage';
  `);

  // ============================================================================
  // TRAINING_PROGRAMS - Training program definitions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('training_programs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Program details
    table.string('program_name', 255).notNullable();
    table.text('description');
    table.string('program_type', 100);
    table.integer('duration_hours');
    table.string('instructor', 255);
    
    // Configuration
    table.decimal('cost_per_participant', 10, 2);
    table.integer('max_participants');
    table.boolean('is_mandatory').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_training_programs_organization_id ON hris.training_programs(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_training_programs_is_active ON hris.training_programs(is_active) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.training_programs IS 'Training program definitions and configurations';
  `);

  // ============================================================================
  // EMPLOYEE_TRAINING - Employee training enrollment (junction table)
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_training', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('training_program_id').notNullable().references('id').inTable('hris.training_programs').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Enrollment details
    table.date('enrollment_date').notNullable();
    table.date('scheduled_date');
    table.date('completion_date');
    table.string('status', 50).defaultTo('enrolled');
    
    // Results
    table.decimal('score', 5, 2);
    table.boolean('passed').defaultTo(false);
    table.string('certificate_url', 500);
    table.text('notes');
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_training_employee_id ON hris.employee_training(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_training_program_id ON hris.employee_training(training_program_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_training_organization_id ON hris.employee_training(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_training_status ON hris.employee_training(status) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_training IS 'Employee training enrollment and completion tracking';
  `);

  // ============================================================================
  // ANNOUNCEMENTS - Organization-wide announcements
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('announcements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Announcement details
    table.string('title', 255).notNullable();
    table.text('content').notNullable();
    table.string('announcement_type', 50).defaultTo('general');
    table.string('priority', 20).defaultTo('normal');
    
    // Targeting
    table.jsonb('target_departments').defaultTo('[]');
    table.jsonb('target_locations').defaultTo('[]');
    table.boolean('is_all_employees').defaultTo(true);
    
    // Scheduling
    table.timestamp('publish_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expire_at', { useTz: true });
    table.boolean('is_active').defaultTo(true);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
  });

  await knex.raw(`
    CREATE INDEX idx_hris_announcements_organization_id ON hris.announcements(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_announcements_publish_at ON hris.announcements(publish_at DESC) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_announcements_is_active ON hris.announcements(is_active) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.announcements IS 'Organization-wide announcements and communications';
  `);

  // ============================================================================
  // EMPLOYEE_NOTES - Internal notes about employees
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_notes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Note details
    table.string('note_type', 100);
    table.text('note_content').notNullable();
    table.boolean('is_private').defaultTo(false);
    table.boolean('is_pinned').defaultTo(false);
    
    // Audit
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    table.uuid('created_by').notNullable().references('id').inTable('hris.user_account').onDelete('RESTRICT');
  });

  await knex.raw(`
    CREATE INDEX idx_hris_employee_notes_employee_id ON hris.employee_notes(employee_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_notes_organization_id ON hris.employee_notes(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_notes_created_by ON hris.employee_notes(created_by) WHERE deleted_at IS NULL;
    CREATE INDEX idx_hris_employee_notes_created_at ON hris.employee_notes(created_at DESC) WHERE deleted_at IS NULL;
    COMMENT ON TABLE hris.employee_notes IS 'Internal notes and comments about employees';
  `);
}

export async function down(knex) {
  await knex.schema.withSchema('hris').dropTableIfExists('employee_notes');
  await knex.schema.withSchema('hris').dropTableIfExists('announcements');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_training');
  await knex.schema.withSchema('hris').dropTableIfExists('training_programs');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_benefits');
  await knex.schema.withSchema('hris').dropTableIfExists('benefits');
  await knex.schema.withSchema('hris').dropTableIfExists('payroll_records');
  await knex.schema.withSchema('hris').dropTableIfExists('attendance_records');
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_balances');
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_requests');
  await knex.schema.withSchema('hris').dropTableIfExists('performance_goals');
  await knex.schema.withSchema('hris').dropTableIfExists('performance_reviews');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_certifications');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_work_history');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_education');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_dependents');
  await knex.schema.withSchema('hris').dropTableIfExists('emergency_contacts');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_skills');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_documents');
}
