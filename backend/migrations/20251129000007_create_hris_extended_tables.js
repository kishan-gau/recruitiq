/**
 * Migration: Create HRIS Extended Tables
 * 
 * Creates the remaining HRIS tables for Nexus product:
 * - employment_history (employment timeline)
 * - contract_sequence_policy (contract workflow)
 * - contract_sequence_step (workflow steps)
 * - contract (employee contracts)
 * - review_template (performance review templates)
 * - performance_review (review instances)
 * - performance_goal (employee goals)
 * - feedback (employee feedback)
 * - benefits_plan (benefits offerings)
 * - employee_benefit_enrollment (benefit subscriptions)
 * - time_off_type (leave types)
 * - employee_time_off_balance (leave balances)
 * - time_off_request (leave requests)
 * - time_off_accrual_history (accrual tracking)
 * - attendance_record (attendance tracking)
 * - rule_definition (business rules)
 * - rule_execution_history (rule audit trail)
 * - document_category (document organization)
 * - employee_document (document storage)
 * - audit_log (comprehensive audit trail)
 * 
 * @see C:\RecruitIQ\backend\src\database\hris.sql (original)
 */

export async function up(knex) {
  // ============================================================================
  // EMPLOYMENT HISTORY TABLE - Employment timeline tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employment_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.string('event_type', 100).notNullable();
    table.timestamp('event_date').notNullable();
    table.uuid('from_position_id');
    table.uuid('to_position_id');
    table.uuid('from_department_id');
    table.uuid('to_department_id');
    table.uuid('from_location_id');
    table.uuid('to_location_id');
    table.decimal('from_salary', 15, 2);
    table.decimal('to_salary', 15, 2);
    table.text('notes');
    table.uuid('created_by');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('from_position_id').references('id').inTable('hris.positions').onDelete('SET NULL');
    table.foreign('to_position_id').references('id').inTable('hris.positions').onDelete('SET NULL');
    table.foreign('from_department_id').references('id').inTable('hris.departments').onDelete('SET NULL');
    table.foreign('to_department_id').references('id').inTable('hris.departments').onDelete('SET NULL');
    table.foreign('from_location_id').references('id').inTable('hris.locations').onDelete('SET NULL');
    table.foreign('to_location_id').references('id').inTable('hris.locations').onDelete('SET NULL');
    table.index(['employee_id', 'event_date']);
    table.index('event_type');
  });

  // ============================================================================
  // CONTRACT SEQUENCE POLICY TABLE - Contract workflow definitions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('contract_sequence_policy', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('policy_name', 200).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata');
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index('organization_id');
  });

  // ============================================================================
  // CONTRACT SEQUENCE STEP TABLE - Workflow step definitions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('contract_sequence_step', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('policy_id').notNullable();
    table.integer('step_order').notNullable();
    table.string('step_name', 200).notNullable();
    table.string('action_type', 50).notNullable();
    table.jsonb('action_config');
    table.timestamps(true, true);
    
    table.foreign('policy_id').references('id').inTable('hris.contract_sequence_policy').onDelete('CASCADE');
    table.unique(['policy_id', 'step_order']);
    table.index('policy_id');
  });

  // ============================================================================
  // CONTRACT TABLE - Employee contracts
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('contract', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('contract_template_id');
    table.string('contract_type', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date');
    table.string('status', 50).notNullable().defaultTo('draft');
    table.text('terms');
    table.jsonb('metadata');
    table.uuid('signed_by_employee');
    table.timestamp('signed_by_employee_at');
    table.uuid('signed_by_employer');
    table.timestamp('signed_by_employer_at');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('contract_template_id').references('id').inTable('hris.contract_templates').onDelete('SET NULL');
    table.index(['employee_id', 'status']);
    table.index('start_date');
  });

  // ============================================================================
  // REVIEW TEMPLATE TABLE - Performance review templates
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('review_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('template_name', 200).notNullable();
    table.text('description');
    table.jsonb('questions');
    table.jsonb('rating_scale');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index('organization_id');
  });

  // ============================================================================
  // PERFORMANCE REVIEW TABLE - Performance review instances
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('performance_review', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('reviewer_id').notNullable();
    table.uuid('template_id');
    table.date('review_period_start').notNullable();
    table.date('review_period_end').notNullable();
    table.string('status', 50).notNullable().defaultTo('pending');
    table.jsonb('responses');
    table.decimal('overall_rating', 3, 2);
    table.text('comments');
    table.timestamp('completed_at');
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('template_id').references('id').inTable('hris.review_template').onDelete('SET NULL');
    table.index(['employee_id', 'status']);
    table.index('reviewer_id');
  });

  // ============================================================================
  // PERFORMANCE GOAL TABLE - Employee performance goals
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('performance_goal', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.string('goal_title', 200).notNullable();
    table.text('description');
    table.date('target_date');
    table.string('status', 50).notNullable().defaultTo('in_progress');
    table.integer('progress_percentage').defaultTo(0);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.index(['employee_id', 'status']);
  });

  // ============================================================================
  // FEEDBACK TABLE - Employee feedback
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('from_user_id').notNullable();
    table.string('feedback_type', 50).notNullable();
    table.text('content').notNullable();
    table.boolean('is_anonymous').defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.index(['employee_id', 'feedback_type']);
    table.index('created_at');
  });

  // ============================================================================
  // BENEFITS PLAN TABLE - Benefits offerings
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('benefits_plan', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('plan_name', 200).notNullable();
    table.string('plan_type', 100).notNullable();
    table.text('description');
    table.decimal('employer_contribution', 10, 2);
    table.decimal('employee_contribution', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'plan_type']);
  });

  // ============================================================================
  // EMPLOYEE BENEFIT ENROLLMENT TABLE - Benefit subscriptions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_benefit_enrollment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('benefits_plan_id').notNullable();
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('end_date');
    table.string('status', 50).notNullable().defaultTo('active');
    table.decimal('employee_contribution', 10, 2);
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('benefits_plan_id').references('id').inTable('hris.benefits_plan').onDelete('CASCADE');
    table.index(['employee_id', 'status']);
    table.index('benefits_plan_id');
  });

  // ============================================================================
  // TIME OFF TYPE TABLE - Leave type definitions
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('time_off_type', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('type_name', 100).notNullable();
    table.text('description');
    table.boolean('is_paid').defaultTo(true);
    table.integer('default_annual_allowance');
    table.boolean('requires_approval').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index('organization_id');
  });

  // ============================================================================
  // EMPLOYEE TIME OFF BALANCE TABLE - Leave balance tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_time_off_balance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('time_off_type_id').notNullable();
    table.integer('year').notNullable();
    table.decimal('total_allowance', 10, 2).notNullable();
    table.decimal('used_balance', 10, 2).defaultTo(0);
    table.decimal('pending_balance', 10, 2).defaultTo(0);
    table.decimal('available_balance', 10, 2).notNullable();
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('time_off_type_id').references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    table.unique(['employee_id', 'time_off_type_id', 'year']);
    table.index(['employee_id', 'year']);
  });

  // ============================================================================
  // TIME OFF REQUEST TABLE - Leave requests
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('time_off_request', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('time_off_type_id').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.decimal('days_requested', 10, 2).notNullable();
    table.string('status', 50).notNullable().defaultTo('pending');
    table.text('reason');
    table.uuid('approved_by');
    table.timestamp('approved_at');
    table.text('approval_notes');
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('time_off_type_id').references('id').inTable('hris.time_off_type').onDelete('CASCADE');
    table.index(['employee_id', 'status']);
    table.index(['start_date', 'end_date']);
  });

  // ============================================================================
  // TIME OFF ACCRUAL HISTORY TABLE - Accrual tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('time_off_accrual_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('balance_id').notNullable();
    table.date('accrual_date').notNullable();
    table.decimal('amount_accrued', 10, 2).notNullable();
    table.text('reason');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('balance_id').references('id').inTable('hris.employee_time_off_balance').onDelete('CASCADE');
    table.index('balance_id');
    table.index('accrual_date');
  });

  // ============================================================================
  // ATTENDANCE RECORD TABLE - Attendance tracking
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('attendance_record', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.date('attendance_date').notNullable();
    table.time('check_in_time');
    table.time('check_out_time');
    table.string('status', 50).notNullable();
    table.decimal('hours_worked', 5, 2);
    table.text('notes');
    table.timestamps(true, true);
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.unique(['employee_id', 'attendance_date']);
    table.index(['employee_id', 'attendance_date']);
  });

  // ============================================================================
  // RULE DEFINITION TABLE - Business rules engine
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('rule_definition', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('rule_name', 200).notNullable();
    table.string('rule_type', 100).notNullable();
    table.text('description');
    table.jsonb('conditions');
    table.jsonb('actions');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'rule_type']);
  });

  // ============================================================================
  // RULE EXECUTION HISTORY TABLE - Rule audit trail
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('rule_execution_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('rule_id').notNullable();
    table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());
    table.string('execution_status', 50).notNullable();
    table.jsonb('input_data');
    table.jsonb('output_data');
    table.text('error_message');
    
    table.foreign('rule_id').references('id').inTable('hris.rule_definition').onDelete('CASCADE');
    table.index('rule_id');
    table.index('executed_at');
  });

  // ============================================================================
  // DOCUMENT CATEGORY TABLE - Document organization
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('document_category', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('category_name', 100).notNullable();
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index('organization_id');
  });

  // ============================================================================
  // EMPLOYEE DOCUMENT TABLE - Document storage
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('employee_document', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('employee_id').notNullable();
    table.uuid('category_id');
    table.string('document_name', 255).notNullable();
    table.string('file_path', 500).notNullable();
    table.string('file_type', 100);
    table.integer('file_size');
    table.uuid('uploaded_by').notNullable();
    table.boolean('requires_signature').defaultTo(false);
    table.uuid('signed_by');
    table.timestamp('signed_at');
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    table.foreign('employee_id').references('id').inTable('hris.employees').onDelete('CASCADE');
    table.foreign('category_id').references('id').inTable('hris.document_category').onDelete('SET NULL');
    table.index(['employee_id', 'category_id']);
  });

  // ============================================================================
  // AUDIT LOG TABLE - Comprehensive audit trail
  // ============================================================================
  await knex.schema.withSchema('hris').createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable();
    table.string('entity_type', 100).notNullable();
    table.uuid('entity_id');
    table.string('action', 50).notNullable();
    table.uuid('user_id');
    table.jsonb('changes');
    table.string('ip_address', 45);
    table.string('user_agent', 500);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.index(['organization_id', 'entity_type']);
    table.index('entity_id');
    table.index('user_id');
    table.index('created_at');
  });

  console.log('✓ Created 20 HRIS extended tables');
}

export async function down(knex) {
  // Drop tables in reverse order to handle foreign key constraints
  await knex.schema.withSchema('hris').dropTableIfExists('audit_log');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_document');
  await knex.schema.withSchema('hris').dropTableIfExists('document_category');
  await knex.schema.withSchema('hris').dropTableIfExists('rule_execution_history');
  await knex.schema.withSchema('hris').dropTableIfExists('rule_definition');
  await knex.schema.withSchema('hris').dropTableIfExists('attendance_record');
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_accrual_history');
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_request');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_time_off_balance');
  await knex.schema.withSchema('hris').dropTableIfExists('time_off_type');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_benefit_enrollment');
  await knex.schema.withSchema('hris').dropTableIfExists('benefits_plan');
  await knex.schema.withSchema('hris').dropTableIfExists('feedback');
  await knex.schema.withSchema('hris').dropTableIfExists('performance_goal');
  await knex.schema.withSchema('hris').dropTableIfExists('performance_review');
  await knex.schema.withSchema('hris').dropTableIfExists('review_template');
  await knex.schema.withSchema('hris').dropTableIfExists('contract');
  await knex.schema.withSchema('hris').dropTableIfExists('contract_sequence_step');
  await knex.schema.withSchema('hris').dropTableIfExists('contract_sequence_policy');
  await knex.schema.withSchema('hris').dropTableIfExists('employment_history');

  console.log('✓ Dropped 20 HRIS extended tables');
}
