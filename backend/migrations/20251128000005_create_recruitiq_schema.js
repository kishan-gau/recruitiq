/**
 * Migration: Create RecruitIQ (ATS) Schema
 * 
 * Creates the RecruitIQ Applicant Tracking System tables:
 * - workspaces (multi-workspace recruiting)
 * - flow_templates (hiring process templates)
 * - jobs (job postings)
 * - candidates (candidate management)
 * - applications (job applications)
 * - interviews (interview scheduling)
 * - interview_interviewers (interview participants)
 * - communications (candidate communications)
 * 
 * @see C:\RecruitIQ\backend\src\database\recruitiq-schema.sql (original)
 */

export async function up(knex) {
  // ============================================================================
  // WORKSPACES TABLE - Multi-tenant workspace organization
  // ============================================================================
  await knex.schema.createTable('workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Workspace Details
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('slug', 255).notNullable();
    
    // Settings
    table.jsonb('settings').defaultTo(JSON.stringify({
      branding: {},
      workflow: {},
      notifications: {}
    }));
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.uuid('created_by');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['organization_id', 'slug']);
  });

  await knex.raw(`
    CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
    CREATE INDEX idx_workspaces_slug ON workspaces(slug);
    CREATE INDEX idx_workspaces_is_active ON workspaces(is_active) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE workspaces IS 'Recruiting workspaces for organizing jobs and hiring teams within an organization';
    COMMENT ON COLUMN workspaces.slug IS 'URL-friendly identifier for workspace';
    COMMENT ON COLUMN workspaces.created_by IS 'Tenant user who created the workspace (from hris.user_account)';
  `);

  // Add foreign key constraint to hris.user_account
  await knex.raw(`
    ALTER TABLE workspaces 
    ADD CONSTRAINT fk_workspaces_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // FLOW TEMPLATES TABLE - Customizable hiring process templates
  // ============================================================================
  await knex.schema.createTable('flow_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Template Details
    table.string('name', 255).notNullable();
    table.text('description');
    
    // Stages Configuration
    table.jsonb('stages').notNullable().defaultTo(JSON.stringify([
      {
        id: 1,
        name: 'Application Received',
        order: 1,
        type: 'automatic',
        actions: []
      },
      {
        id: 2,
        name: 'Phone Screen',
        order: 2,
        type: 'manual',
        actions: []
      },
      {
        id: 3,
        name: 'Technical Interview',
        order: 3,
        type: 'manual',
        actions: []
      },
      {
        id: 4,
        name: 'Offer',
        order: 4,
        type: 'manual',
        actions: []
      }
    ]));
    
    // Status
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.uuid('created_by');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_flow_templates_organization_id ON flow_templates(organization_id);
    CREATE INDEX idx_flow_templates_workspace_id ON flow_templates(workspace_id);
    CREATE INDEX idx_flow_templates_is_default ON flow_templates(is_default) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE flow_templates IS 'Customizable hiring process templates with multi-stage workflows';
    COMMENT ON COLUMN flow_templates.stages IS 'JSONB array of hiring stages with order and configuration';
  `);

  // Add foreign key constraint to hris.user_account
  await knex.raw(`
    ALTER TABLE flow_templates 
    ADD CONSTRAINT fk_flow_templates_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // JOBS TABLE - Job postings
  // ============================================================================
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.uuid('flow_template_id').references('id').inTable('flow_templates');
    
    // Job Details
    table.string('title', 255).notNullable();
    table.text('description').notNullable();
    table.string('job_code', 50);
    table.string('department', 100);
    table.string('location', 255);
    table.string('employment_type', 50).notNullable().defaultTo('full-time');
    table.integer('salary_min');
    table.integer('salary_max');
    table.string('salary_currency', 10).defaultTo('USD');
    
    // Requirements
    table.jsonb('requirements').defaultTo('[]');
    table.jsonb('skills').defaultTo('[]');
    table.integer('experience_years_min');
    table.integer('experience_years_max');
    
    // Status & Publishing
    table.string('status', 50).notNullable().defaultTo('draft');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at', { useTz: true });
    table.timestamp('closed_at', { useTz: true });
    
    // Metadata
    table.uuid('hiring_manager_id');
    table.jsonb('custom_fields').defaultTo('{}');
    
    // Audit
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.check('salary_max IS NULL OR salary_max >= salary_min', [], 'check_salary_range');
  });

  await knex.raw(`
    CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
    CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id);
    CREATE INDEX idx_jobs_status ON jobs(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_jobs_is_published ON jobs(is_published) WHERE deleted_at IS NULL;
    CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
    CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
    
    ALTER TABLE jobs ADD CONSTRAINT check_job_status 
      CHECK (status IN ('draft', 'open', 'closed', 'archived'));
    
    ALTER TABLE jobs ADD CONSTRAINT check_employment_type 
      CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary', 'internship'));
    
    COMMENT ON TABLE jobs IS 'Job postings within recruiting workspaces';
    COMMENT ON COLUMN jobs.status IS 'Job status: draft (not published), open (accepting applications), closed (no longer accepting), archived (historical)';
  `);

  // Add foreign key constraints to hris.user_account
  await knex.raw(`
    ALTER TABLE jobs 
    ADD CONSTRAINT fk_jobs_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
    
    ALTER TABLE jobs 
    ADD CONSTRAINT fk_jobs_updated_by 
    FOREIGN KEY (updated_by) REFERENCES hris.user_account(id);
    
    ALTER TABLE jobs 
    ADD CONSTRAINT fk_jobs_hiring_manager 
    FOREIGN KEY (hiring_manager_id) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // CANDIDATES TABLE - Candidate profiles
  // ============================================================================
  await knex.schema.createTable('candidates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Personal Information
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 50);
    table.string('location', 255);
    
    // Professional Information
    table.string('current_title', 255);
    table.string('current_company', 255);
    table.integer('years_experience');
    table.jsonb('skills').defaultTo('[]');
    
    // Documents
    table.text('resume_url');
    table.text('cover_letter_url');
    table.text('portfolio_url');
    table.text('linkedin_url');
    
    // Source & Status
    table.string('source', 100);
    table.string('status', 50).notNullable().defaultTo('new');
    table.jsonb('tags').defaultTo('[]');
    
    // Additional Information
    table.jsonb('custom_fields').defaultTo('{}');
    table.text('notes');
    
    // Audit
    table.uuid('created_by');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['organization_id', 'email']);
  });

  await knex.raw(`
    CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
    CREATE INDEX idx_candidates_workspace_id ON candidates(workspace_id);
    CREATE INDEX idx_candidates_email ON candidates(email);
    CREATE INDEX idx_candidates_status ON candidates(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);
    
    ALTER TABLE candidates ADD CONSTRAINT check_candidate_status 
      CHECK (status IN ('new', 'active', 'hired', 'rejected', 'withdrawn', 'archived'));
    
    COMMENT ON TABLE candidates IS 'Candidate profiles and contact information';
    COMMENT ON COLUMN candidates.source IS 'How the candidate was sourced (job board, referral, direct application, etc.)';
  `);

  // Add foreign key constraints to hris.user_account
  await knex.raw(`
    ALTER TABLE candidates 
    ADD CONSTRAINT fk_candidates_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
    
    ALTER TABLE candidates 
    ADD CONSTRAINT fk_candidates_updated_by 
    FOREIGN KEY (updated_by) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // APPLICATIONS TABLE - Job applications
  // ============================================================================
  await knex.schema.createTable('applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Application Details
    table.string('status', 50).notNullable().defaultTo('submitted');
    table.integer('current_stage').defaultTo(1);
    table.jsonb('stage_history').defaultTo('[]');
    
    // Application Content
    table.text('cover_letter');
    table.jsonb('answers').defaultTo('{}');
    table.decimal('rating', 3, 2);
    
    // Tracking
    table.timestamp('applied_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('reviewed_at', { useTz: true });
    table.timestamp('rejected_at', { useTz: true });
    table.text('rejection_reason');
    
    // Metadata
    table.jsonb('custom_fields').defaultTo('{}');
    table.text('internal_notes');
    
    // Audit
    table.uuid('created_by');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
    
    // Constraints
    table.unique(['job_id', 'candidate_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_applications_organization_id ON applications(organization_id);
    CREATE INDEX idx_applications_job_id ON applications(job_id);
    CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
    CREATE INDEX idx_applications_workspace_id ON applications(workspace_id);
    CREATE INDEX idx_applications_status ON applications(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_applications_applied_at ON applications(applied_at DESC);
    
    ALTER TABLE applications ADD CONSTRAINT check_application_status 
      CHECK (status IN ('submitted', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn'));
    
    ALTER TABLE applications ADD CONSTRAINT check_rating 
      CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
    
    COMMENT ON TABLE applications IS 'Job applications linking candidates to jobs';
    COMMENT ON COLUMN applications.current_stage IS 'Current stage number in the hiring flow (maps to flow_templates.stages array)';
    COMMENT ON COLUMN applications.stage_history IS 'JSONB array tracking stage transitions with timestamps';
  `);

  // Add foreign key constraints to hris.user_account
  await knex.raw(`
    ALTER TABLE applications 
    ADD CONSTRAINT fk_applications_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
    
    ALTER TABLE applications 
    ADD CONSTRAINT fk_applications_updated_by 
    FOREIGN KEY (updated_by) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // INTERVIEWS TABLE - Interview scheduling
  // ============================================================================
  await knex.schema.createTable('interviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Interview Details
    table.string('title', 255).notNullable();
    table.text('description');
    table.string('type', 50).notNullable();
    table.string('status', 50).notNullable().defaultTo('scheduled');
    
    // Scheduling
    table.timestamp('scheduled_at', { useTz: true }).notNullable();
    table.integer('duration_minutes').notNullable().defaultTo(60);
    table.string('location', 255);
    table.text('meeting_link');
    table.text('meeting_details');
    
    // Feedback
    table.decimal('rating', 3, 2);
    table.text('feedback');
    table.text('notes');
    
    // Audit
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_interviews_organization_id ON interviews(organization_id);
    CREATE INDEX idx_interviews_application_id ON interviews(application_id);
    CREATE INDEX idx_interviews_workspace_id ON interviews(workspace_id);
    CREATE INDEX idx_interviews_status ON interviews(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
    
    ALTER TABLE interviews ADD CONSTRAINT check_interview_type 
      CHECK (type IN ('phone', 'video', 'in-person', 'technical', 'panel', 'other'));
    
    ALTER TABLE interviews ADD CONSTRAINT check_interview_status 
      CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'));
    
    ALTER TABLE interviews ADD CONSTRAINT check_interview_rating 
      CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));
    
    COMMENT ON TABLE interviews IS 'Interview scheduling and feedback';
    COMMENT ON COLUMN interviews.type IS 'Interview format: phone, video, in-person, technical, panel, other';
  `);

  // Add foreign key constraints to hris.user_account
  await knex.raw(`
    ALTER TABLE interviews 
    ADD CONSTRAINT fk_interviews_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
    
    ALTER TABLE interviews 
    ADD CONSTRAINT fk_interviews_updated_by 
    FOREIGN KEY (updated_by) REFERENCES hris.user_account(id);
  `);

  // ============================================================================
  // INTERVIEW INTERVIEWERS TABLE - Interview participants (many-to-many)
  // ============================================================================
  await knex.schema.createTable('interview_interviewers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('interview_id').notNullable().references('id').inTable('interviews').onDelete('CASCADE');
    table.uuid('user_id').notNullable();
    table.string('role', 50);
    table.boolean('is_required').defaultTo(true);
    table.string('status', 50).notNullable().defaultTo('pending');
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    
    // Constraints
    table.unique(['interview_id', 'user_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_interview_interviewers_interview ON interview_interviewers(interview_id);
    CREATE INDEX idx_interview_interviewers_user ON interview_interviewers(user_id);
    
    ALTER TABLE interview_interviewers ADD CONSTRAINT check_interviewer_status 
      CHECK (status IN ('pending', 'accepted', 'declined', 'completed'));
    
    ALTER TABLE interview_interviewers 
    ADD CONSTRAINT fk_interview_interviewers_user 
    FOREIGN KEY (user_id) REFERENCES hris.user_account(id);
    
    COMMENT ON TABLE interview_interviewers IS 'Interviewers participating in interviews (many-to-many)';
    COMMENT ON COLUMN interview_interviewers.user_id IS 'References hris.user_account (tenant users who are interviewers)';
  `);

  // ============================================================================
  // COMMUNICATIONS TABLE - Candidate communications
  // ============================================================================
  await knex.schema.createTable('communications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    table.uuid('application_id').references('id').inTable('applications').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Communication Details
    table.string('type', 50).notNullable();
    table.string('direction', 20).notNullable();
    table.string('subject', 500);
    table.text('body').notNullable();
    
    // Metadata
    table.string('status', 50).notNullable().defaultTo('sent');
    table.timestamp('sent_at', { useTz: true });
    table.timestamp('delivered_at', { useTz: true });
    table.timestamp('opened_at', { useTz: true });
    table.jsonb('metadata').defaultTo('{}');
    
    // Audit
    table.uuid('created_by').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });

  await knex.raw(`
    CREATE INDEX idx_communications_organization_id ON communications(organization_id);
    CREATE INDEX idx_communications_candidate_id ON communications(candidate_id);
    CREATE INDEX idx_communications_application_id ON communications(application_id);
    CREATE INDEX idx_communications_workspace_id ON communications(workspace_id);
    CREATE INDEX idx_communications_type ON communications(type);
    CREATE INDEX idx_communications_created_at ON communications(created_at DESC);
    
    ALTER TABLE communications ADD CONSTRAINT check_communication_type 
      CHECK (type IN ('email', 'sms', 'phone', 'note', 'system'));
    
    ALTER TABLE communications ADD CONSTRAINT check_communication_direction 
      CHECK (direction IN ('inbound', 'outbound'));
    
    ALTER TABLE communications ADD CONSTRAINT check_communication_status 
      CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'bounced'));
    
    ALTER TABLE communications 
    ADD CONSTRAINT fk_communications_created_by 
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id);
    
    COMMENT ON TABLE communications IS 'Communication history with candidates (emails, notes, etc.)';
    COMMENT ON COLUMN communications.direction IS 'Communication direction: inbound (from candidate), outbound (to candidate)';
  `);

  console.log('✅ RecruitIQ schema created successfully');
}

export async function down(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('communications');
  await knex.schema.dropTableIfExists('interview_interviewers');
  await knex.schema.dropTableIfExists('interviews');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('flow_templates');
  await knex.schema.dropTableIfExists('workspaces');
  
  console.log('✅ RecruitIQ schema dropped successfully');
}
