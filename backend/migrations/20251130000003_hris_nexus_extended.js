/**
 * Migration: HRIS/Nexus Extended Schema
 * Created: 2025-11-30
 * 
 * Creates extended HRIS tables: employment history, contracts, performance, benefits, documents
 */

export async function up(knex) {
  // ========================================
  // HRIS EXTENDED TABLES
  // ========================================

  // Employment History
  await knex.schema.createTable('hris_employment_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.date('effective_date').notNullable();
    table.string('change_type', 100).notNullable(); // 'hire', 'promotion', 'transfer', 'termination'
    table.uuid('previous_department_id').nullable().references('id').inTable('hris_departments').onDelete('SET NULL');
    table.uuid('new_department_id').nullable().references('id').inTable('hris_departments').onDelete('SET NULL');
    table.string('previous_job_title', 200).nullable();
    table.string('new_job_title', 200).nullable();
    table.decimal('previous_salary', 15, 2).nullable();
    table.decimal('new_salary', 15, 2).nullable();
    table.string('previous_employment_type', 50).nullable();
    table.string('new_employment_type', 50).nullable();
    table.text('reason').nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id'], 'idx_hris_employment_history_org');
    table.index(['employee_id', 'effective_date'], 'idx_hris_employment_history_emp_date');
  });

  // Contract Sequence Policy
  await knex.schema.createTable('hris_contract_sequence_policy', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_contract_seq_policy_org_del');
  });

  // Contract Sequence Steps
  await knex.schema.createTable('hris_contract_sequence_step', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('policy_id').notNullable().references('id').inTable('hris_contract_sequence_policy').onDelete('CASCADE');
    table.integer('step_order').notNullable();
    table.string('contract_type', 100).notNullable(); // 'temporary', 'permanent', 'probation'
    table.integer('duration_months').nullable();
    table.boolean('requires_approval').notNullable().defaultTo(false);
    table.boolean('auto_renew').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['policy_id', 'step_order'], 'idx_hris_contract_seq_step_policy_order');
  });

  // Contracts
  await knex.schema.createTable('hris_contract', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.string('contract_number', 100).notNullable();
    table.string('contract_type', 100).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').nullable();
    table.string('status', 50).notNullable().defaultTo('active'); // 'draft', 'active', 'expired', 'terminated'
    table.decimal('salary', 15, 2).notNullable();
    table.string('currency', 3).notNullable();
    table.integer('hours_per_week').nullable();
    table.text('terms').nullable();
    table.uuid('policy_id').nullable().references('id').inTable('hris_contract_sequence_policy').onDelete('SET NULL');
    table.integer('sequence_step').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.unique(['organization_id', 'contract_number', 'deleted_at'], { indexName: 'uq_hris_contract_org_num_del' });
    table.index(['organization_id', 'deleted_at'], 'idx_hris_contract_org_del');
    table.index(['employee_id'], 'idx_hris_contract_employee');
    table.index(['status'], 'idx_hris_contract_status');
  });

  // Review Templates
  await knex.schema.createTable('hris_review_template', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.jsonb('questions').notNullable(); // Array of review questions
    table.jsonb('rating_scale').nullable(); // Rating scale definition
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_review_template_org_del');
  });

  // Performance Reviews
  await knex.schema.createTable('hris_performance_review', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('template_id').nullable().references('id').inTable('hris_review_template').onDelete('SET NULL');
    table.uuid('reviewer_id').notNullable().references('id').inTable('employee_records').onDelete('RESTRICT');
    table.date('review_period_start').notNullable();
    table.date('review_period_end').notNullable();
    table.date('review_date').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft'); // 'draft', 'completed', 'acknowledged'
    table.jsonb('responses').nullable(); // Answers to template questions
    table.decimal('overall_rating', 3, 2).nullable();
    table.text('summary').nullable();
    table.text('strengths').nullable();
    table.text('areas_for_improvement').nullable();
    table.timestamp('acknowledged_at', { useTz: true }).nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_performance_review_org_del');
    table.index(['employee_id'], 'idx_hris_performance_review_employee');
    table.index(['reviewer_id'], 'idx_hris_performance_review_reviewer');
  });

  // Performance Goals
  await knex.schema.createTable('hris_performance_goal', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.string('category', 100).nullable(); // 'performance', 'development', 'project'
    table.date('target_date').nullable();
    table.string('status', 50).notNullable().defaultTo('in_progress'); // 'not_started', 'in_progress', 'completed', 'abandoned'
    table.integer('progress_percentage').notNullable().defaultTo(0);
    table.text('notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_performance_goal_org_del');
    table.index(['employee_id'], 'idx_hris_performance_goal_employee');
    table.index(['status'], 'idx_hris_performance_goal_status');
  });

  // Feedback
  await knex.schema.createTable('hris_feedback', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('provider_id').notNullable().references('id').inTable('employee_records').onDelete('RESTRICT');
    table.string('feedback_type', 50).notNullable(); // 'peer', 'manager', '360', 'self'
    table.text('feedback_text').notNullable();
    table.date('feedback_date').notNullable();
    table.boolean('is_anonymous').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_feedback_org_del');
    table.index(['employee_id'], 'idx_hris_feedback_employee');
  });

  // Benefits Plans
  await knex.schema.createTable('hris_benefits_plan', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('plan_type', 100).notNullable(); // 'health', 'dental', 'vision', 'life', 'retirement'
    table.text('description').nullable();
    table.string('provider', 200).nullable();
    table.decimal('employee_cost', 10, 2).nullable();
    table.decimal('employer_cost', 10, 2).nullable();
    table.string('coverage_level', 50).nullable(); // 'individual', 'family', 'employee_spouse'
    table.date('effective_date').nullable();
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_benefits_plan_org_del');
    table.index(['plan_type'], 'idx_hris_benefits_plan_type');
  });

  // Employee Benefit Enrollments
  await knex.schema.createTable('hris_employee_benefit_enrollment', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('benefits_plan_id').notNullable().references('id').inTable('hris_benefits_plan').onDelete('RESTRICT');
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('end_date').nullable();
    table.string('status', 50).notNullable().defaultTo('active'); // 'active', 'pending', 'terminated'
    table.jsonb('beneficiaries').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_emp_benefit_enroll_org_del');
    table.index(['employee_id'], 'idx_hris_emp_benefit_enroll_employee');
    table.index(['benefits_plan_id'], 'idx_hris_emp_benefit_enroll_plan');
  });

  // Time-Off Accrual History
  await knex.schema.createTable('hris_time_off_accrual_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('time_off_type_id').notNullable().references('id').inTable('hris_time_off_types').onDelete('CASCADE');
    table.date('accrual_date').notNullable();
    table.decimal('days_accrued', 5, 2).notNullable();
    table.string('accrual_reason', 100).notNullable(); // 'monthly', 'annual', 'adjustment', 'carry_forward'
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id'], 'idx_hris_time_off_accrual_hist_org');
    table.index(['employee_id', 'accrual_date'], 'idx_hris_time_off_accrual_hist_emp_date');
  });

  // Attendance Records
  await knex.schema.createTable('hris_attendance_record', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.date('attendance_date').notNullable();
    table.time('check_in').nullable();
    table.time('check_out').nullable();
    table.string('status', 50).notNullable(); // 'present', 'absent', 'late', 'half_day', 'on_leave'
    table.decimal('hours_worked', 5, 2).nullable();
    table.text('notes').nullable();
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.unique(['employee_id', 'attendance_date'], { indexName: 'uq_hris_attendance_record_emp_date' });
    table.index(['organization_id'], 'idx_hris_attendance_record_org');
    table.index(['employee_id', 'attendance_date'], 'idx_hris_attendance_record_emp_date');
    table.index(['status'], 'idx_hris_attendance_record_status');
  });

  // Rule Definitions
  await knex.schema.createTable('hris_rule_definition', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('rule_name', 200).notNullable();
    table.string('rule_type', 100).notNullable(); // 'attendance', 'leave', 'performance'
    table.text('description').nullable();
    table.jsonb('conditions').notNullable(); // Rule conditions
    table.jsonb('actions').notNullable(); // Actions to take when rule triggers
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_rule_definition_org_del');
    table.index(['rule_type'], 'idx_hris_rule_definition_type');
  });

  // Rule Execution History
  await knex.schema.createTable('hris_rule_execution_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('rule_id').notNullable().references('id').inTable('hris_rule_definition').onDelete('CASCADE');
    table.uuid('employee_id').nullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.timestamp('executed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.boolean('rule_triggered').notNullable();
    table.jsonb('execution_context').nullable(); // Context data at execution time
    table.jsonb('actions_taken').nullable();
    table.text('execution_log').nullable();
    
    table.index(['organization_id'], 'idx_hris_rule_exec_history_org');
    table.index(['rule_id', 'executed_at'], 'idx_hris_rule_exec_history_rule_date');
  });

  // Document Categories
  await knex.schema.createTable('hris_document_category', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.boolean('requires_signature').notNullable().defaultTo(false);
    table.boolean('requires_expiry').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_document_category_org_del');
  });

  // Employee Documents
  await knex.schema.createTable('hris_employee_document', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('employee_records').onDelete('CASCADE');
    table.uuid('category_id').nullable().references('id').inTable('hris_document_category').onDelete('SET NULL');
    table.string('document_name', 255).notNullable();
    table.text('description').nullable();
    table.string('file_path', 500).notNullable();
    table.string('file_type', 100).notNullable();
    table.bigInteger('file_size').notNullable();
    table.date('issue_date').nullable();
    table.date('expiry_date').nullable();
    table.boolean('is_signed').notNullable().defaultTo(false);
    table.timestamp('signed_at', { useTz: true }).nullable();
    table.uuid('uploaded_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    
    table.index(['organization_id', 'deleted_at'], 'idx_hris_employee_document_org_del');
    table.index(['employee_id'], 'idx_hris_employee_document_employee');
    table.index(['category_id'], 'idx_hris_employee_document_category');
  });

  // Audit Log
  await knex.schema.createTable('hris_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.string('entity_type', 100).notNullable(); // Table/entity affected
    table.uuid('entity_id').notNullable(); // ID of affected record
    table.string('action', 50).notNullable(); // 'create', 'update', 'delete'
    table.jsonb('old_values').nullable(); // Before state
    table.jsonb('new_values').nullable(); // After state
    table.string('ip_address', 45).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    table.index(['organization_id', 'created_at'], 'idx_hris_audit_log_org_date');
    table.index(['entity_type', 'entity_id'], 'idx_hris_audit_log_entity');
    table.index(['user_id', 'created_at'], 'idx_hris_audit_log_user_date');
  });

  console.log('✅ HRIS/Nexus extended schema created successfully');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('hris_audit_log');
  await knex.schema.dropTableIfExists('hris_employee_document');
  await knex.schema.dropTableIfExists('hris_document_category');
  await knex.schema.dropTableIfExists('hris_rule_execution_history');
  await knex.schema.dropTableIfExists('hris_rule_definition');
  await knex.schema.dropTableIfExists('hris_attendance_record');
  await knex.schema.dropTableIfExists('hris_time_off_accrual_history');
  await knex.schema.dropTableIfExists('hris_employee_benefit_enrollment');
  await knex.schema.dropTableIfExists('hris_benefits_plan');
  await knex.schema.dropTableIfExists('hris_feedback');
  await knex.schema.dropTableIfExists('hris_performance_goal');
  await knex.schema.dropTableIfExists('hris_performance_review');
  await knex.schema.dropTableIfExists('hris_review_template');
  await knex.schema.dropTableIfExists('hris_contract');
  await knex.schema.dropTableIfExists('hris_contract_sequence_step');
  await knex.schema.dropTableIfExists('hris_contract_sequence_policy');
  await knex.schema.dropTableIfExists('hris_employment_history');
  
  console.log('✅ HRIS/Nexus extended schema rolled back');
}
