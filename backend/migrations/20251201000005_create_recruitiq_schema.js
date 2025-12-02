/**
 * Migration: Create RecruitIQ Schema
 * Source: recruitiq-schema.sql
 * 
 * Creates the comprehensive ATS (Applicant Tracking System) schema for RecruitIQ Platform
 * 
 * Schema: public (uses shared organizations and hris.user_account)
 * Tables: workspaces, flow_templates, jobs, candidates, applications, 
 *         interviews, interview_interviewers, communications
 * Features: Multi-workspace recruiting, customizable hiring flows,
 *           job postings, candidate management, applications tracking,
 *           interview scheduling, communications
 * 
 * Version: 1.0.0
 * Created: December 1, 2025
 * Note: References hris.user_account for tenant users, not platform_users
 */

exports.up = async function(knex) {
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
    table.uuid('created_by'); // References hris.user_account(id)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add foreign key for created_by
  await knex.raw(`
    ALTER TABLE workspaces
    ADD CONSTRAINT fk_workspaces_created_by
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id)
  `);
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE workspaces
    ADD CONSTRAINT unique_workspace_slug_per_org UNIQUE (organization_id, slug)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id)');
  await knex.raw('CREATE INDEX idx_workspaces_slug ON workspaces(slug)');
  await knex.raw('CREATE INDEX idx_workspaces_is_active ON workspaces(is_active) WHERE deleted_at IS NULL');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE workspaces IS 'Recruiting workspaces for organizing jobs and hiring teams within an organization'`);
  await knex.raw(`COMMENT ON COLUMN workspaces.slug IS 'URL-friendly identifier for workspace'`);
  await knex.raw(`COMMENT ON COLUMN workspaces.created_by IS 'Tenant user who created the workspace (from hris.user_account)'`);
  
  // ============================================================================
  // FLOW TEMPLATES TABLE - Customizable hiring process templates
  // ============================================================================
  await knex.schema.createTable('flow_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Template Details
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    
    // Stages Definition (array of stage objects)
    table.jsonb('stages').notNullable();
    
    // Usage
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_global').defaultTo(false);
    
    // Metadata
    table.uuid('created_by'); // References hris.user_account(id)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add foreign key for created_by
  await knex.raw(`
    ALTER TABLE flow_templates
    ADD CONSTRAINT fk_flow_templates_created_by
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_flow_templates_organization_id ON flow_templates(organization_id)');
  await knex.raw('CREATE INDEX idx_flow_templates_workspace_id ON flow_templates(workspace_id)');
  await knex.raw('CREATE INDEX idx_flow_templates_is_default ON flow_templates(is_default) WHERE deleted_at IS NULL');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE flow_templates IS 'Reusable hiring process templates with customizable stages'`);
  await knex.raw(`COMMENT ON COLUMN flow_templates.stages IS 'JSONB array of stage objects: [{"name": "Screening", "order": 1, "type": "review"}]'`);
  await knex.raw(`COMMENT ON COLUMN flow_templates.created_by IS 'Tenant user who created the template (from hris.user_account)'`);
  
  // ============================================================================
  // JOBS TABLE - Job postings and openings
  // ============================================================================
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Job Details
    table.string('title', 255).notNullable();
    table.string('department', 100);
    table.string('location', 255);
    table.string('employment_type', 50);
    table.string('experience_level', 50);
    table.string('remote_policy', 50);
    table.boolean('is_remote').defaultTo(false);
    
    // Description
    table.text('description');
    table.text('requirements');
    table.text('responsibilities');
    table.text('benefits');
    
    // Compensation
    table.integer('salary_min');
    table.integer('salary_max');
    table.string('salary_currency', 10).defaultTo('USD');
    
    // Status & Visibility
    table.string('status', 50).defaultTo('draft');
    table.boolean('is_public').defaultTo(false);
    
    // Public Portal Settings
    table.string('public_slug', 255).unique();
    table.jsonb('public_portal_settings').defaultTo(JSON.stringify({
      companyName: '',
      companyLogo: '',
      salaryPublic: false,
      customFields: []
    }));
    table.integer('view_count').defaultTo(0);
    table.integer('application_count').defaultTo(0);
    
    // Flow Template
    table.uuid('flow_template_id').references('id').inTable('flow_templates');
    
    // Hiring Team
    table.uuid('hiring_manager_id'); // References hris.user_account(id)
    table.uuid('recruiter_id'); // References hris.user_account(id)
    
    // Dates
    table.timestamp('posted_at', { useTz: true });
    table.timestamp('closes_at', { useTz: true });
    
    // Metadata
    table.uuid('created_by'); // References hris.user_account(id)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add check constraints
  await knex.raw(`ALTER TABLE jobs ADD CONSTRAINT check_employment_type CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary'))`);
  await knex.raw(`ALTER TABLE jobs ADD CONSTRAINT check_experience_level CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive'))`);
  await knex.raw(`ALTER TABLE jobs ADD CONSTRAINT check_remote_policy CHECK (remote_policy IN ('onsite', 'hybrid', 'remote'))`);
  await knex.raw(`ALTER TABLE jobs ADD CONSTRAINT check_job_status CHECK (status IN ('draft', 'open', 'paused', 'filled', 'closed', 'archived'))`);
  
  // Add foreign keys for user references
  await knex.raw(`
    ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_hiring_manager
    FOREIGN KEY (hiring_manager_id) REFERENCES hris.user_account(id)
  `);
  await knex.raw(`
    ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_recruiter
    FOREIGN KEY (recruiter_id) REFERENCES hris.user_account(id)
  `);
  await knex.raw(`
    ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_created_by
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_jobs_organization_id ON jobs(organization_id)');
  await knex.raw('CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id)');
  await knex.raw('CREATE INDEX idx_jobs_status ON jobs(status)');
  await knex.raw('CREATE INDEX idx_jobs_flow_template_id ON jobs(flow_template_id)');
  await knex.raw('CREATE INDEX idx_jobs_public_slug ON jobs(public_slug)');
  await knex.raw('CREATE INDEX idx_jobs_is_public ON jobs(is_public)');
  await knex.raw('CREATE INDEX idx_jobs_hiring_manager ON jobs(hiring_manager_id) WHERE deleted_at IS NULL');
  await knex.raw('CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id) WHERE deleted_at IS NULL');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE jobs IS 'Job postings and openings for recruitment'`);
  await knex.raw(`COMMENT ON COLUMN jobs.hiring_manager_id IS 'Tenant user managing hiring for this job (from hris.user_account)'`);
  await knex.raw(`COMMENT ON COLUMN jobs.recruiter_id IS 'Tenant user recruiting for this job (from hris.user_account)'`);
  await knex.raw(`COMMENT ON COLUMN jobs.public_slug IS 'URL-friendly identifier for public job portal'`);
  
  // ============================================================================
  // CANDIDATES TABLE - Candidate profiles
  // ============================================================================
  await knex.schema.createTable('candidates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    
    // Personal Info
    table.string('first_name', 255).notNullable();
    table.string('last_name', 255).notNullable();
    table.string('name', 255); // Computed field (first_name + last_name)
    table.string('email', 255).notNullable();
    table.string('phone', 50);
    table.string('location', 255);
    
    // Professional Info
    table.string('current_job_title', 255);
    table.string('current_company', 255);
    
    // Profile Links
    table.string('linkedin_url', 500);
    table.string('portfolio_url', 500);
    table.string('resume_url', 500);
    
    // Additional Info
    table.specificType('skills', 'TEXT[]');
    table.text('experience');
    table.text('education');
    
    // Source
    table.string('source', 100);
    table.string('source_details', 500);
    
    // Public Application Fields
    table.string('application_source', 50).defaultTo('manual');
    table.string('tracking_code', 50).unique();
    table.jsonb('application_data').defaultTo('{}');
    
    // Tags & Notes
    table.specificType('tags', 'TEXT[]');
    table.text('notes');
    
    // Metadata
    table.uuid('created_by'); // References hris.user_account(id)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add check constraint for application_source
  await knex.raw(`ALTER TABLE candidates ADD CONSTRAINT check_application_source CHECK (application_source IN ('manual', 'public-portal', 'referral', 'linkedin', 'indeed', 'other'))`);
  
  // Add unique constraint for email per organization
  await knex.raw(`
    ALTER TABLE candidates
    ADD CONSTRAINT unique_candidate_email_per_org UNIQUE (email, organization_id)
  `);
  
  // Add foreign key for created_by
  await knex.raw(`
    ALTER TABLE candidates
    ADD CONSTRAINT fk_candidates_created_by
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_candidates_organization_id ON candidates(organization_id)');
  await knex.raw('CREATE INDEX idx_candidates_email ON candidates(email)');
  await knex.raw('CREATE INDEX idx_candidates_name ON candidates(first_name, last_name)');
  await knex.raw('CREATE INDEX idx_candidates_tracking_code ON candidates(tracking_code)');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE candidates IS 'Candidate profiles and contact information'`);
  await knex.raw(`COMMENT ON COLUMN candidates.created_by IS 'Tenant user who added the candidate (from hris.user_account)'`);
  await knex.raw(`COMMENT ON COLUMN candidates.tracking_code IS 'Unique code for candidate to track applications on public portal'`);
  
  // ============================================================================
  // APPLICATIONS TABLE - Job applications from candidates
  // ============================================================================
  await knex.schema.createTable('applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    
    // Tracking Code (unique identifier for applicants)
    table.string('tracking_code', 50).unique().notNullable();
    
    // Application Status
    table.string('status', 50).defaultTo('applied');
    table.string('stage', 50).defaultTo('applied');
    table.integer('current_stage');
    table.string('current_stage_name', 255);
    
    // Application Data
    table.text('cover_letter');
    table.text('notes');
    table.text('rejection_reason');
    
    // Metadata
    table.timestamp('applied_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add check constraints
  await knex.raw(`ALTER TABLE applications ADD CONSTRAINT check_application_status CHECK (status IN ('active', 'rejected', 'withdrawn', 'hired'))`);
  await knex.raw(`ALTER TABLE applications ADD CONSTRAINT check_application_stage CHECK (stage IN ('applied', 'screening', 'phone_screen', 'assessment', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'))`);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_applications_job_id ON applications(job_id)');
  await knex.raw('CREATE INDEX idx_applications_candidate_id ON applications(candidate_id)');
  await knex.raw('CREATE INDEX idx_applications_organization_id ON applications(organization_id)');
  await knex.raw('CREATE INDEX idx_applications_workspace_id ON applications(workspace_id)');
  await knex.raw('CREATE INDEX idx_applications_tracking_code ON applications(tracking_code)');
  await knex.raw('CREATE INDEX idx_applications_status ON applications(status)');
  await knex.raw('CREATE INDEX idx_applications_stage ON applications(stage)');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE applications IS 'Job applications linking candidates to jobs'`);
  await knex.raw(`COMMENT ON COLUMN applications.tracking_code IS 'Unique code for applicants to track their application status'`);
  await knex.raw(`COMMENT ON COLUMN applications.stage IS 'Current hiring pipeline stage'`);
  
  // ============================================================================
  // INTERVIEWS TABLE - Interview scheduling and feedback
  // ============================================================================
  await knex.schema.createTable('interviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    
    // Interview Details
    table.string('title', 255).notNullable();
    table.string('type', 50);
    table.string('status', 50).defaultTo('scheduled');
    
    // Scheduling
    table.timestamp('scheduled_at', { useTz: true });
    table.integer('duration_minutes');
    table.integer('duration'); // alias for duration_minutes
    table.string('location', 500);
    table.string('meeting_link', 500);
    
    // Notes
    table.text('notes');
    
    // Feedback
    table.text('feedback');
    table.integer('rating');
    table.string('recommendation', 50);
    table.text('strengths');
    table.text('weaknesses');
    table.jsonb('technical_skills');
    table.integer('culture_fit');
    
    // Metadata
    table.uuid('created_by'); // References hris.user_account(id)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });
  });
  
  // Add check constraints
  await knex.raw(`ALTER TABLE interviews ADD CONSTRAINT check_interview_type CHECK (type IN ('phone', 'video', 'onsite', 'technical', 'behavioral', 'panel'))`);
  await knex.raw(`ALTER TABLE interviews ADD CONSTRAINT check_interview_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show'))`);
  await knex.raw(`ALTER TABLE interviews ADD CONSTRAINT check_interview_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))`);
  await knex.raw(`ALTER TABLE interviews ADD CONSTRAINT check_interview_culture_fit CHECK (culture_fit IS NULL OR (culture_fit >= 1 AND culture_fit <= 5))`);
  
  // Add foreign key for created_by
  await knex.raw(`
    ALTER TABLE interviews
    ADD CONSTRAINT fk_interviews_created_by
    FOREIGN KEY (created_by) REFERENCES hris.user_account(id)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_interviews_application_id ON interviews(application_id)');
  await knex.raw('CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at)');
  await knex.raw('CREATE INDEX idx_interviews_status ON interviews(status)');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE interviews IS 'Interview scheduling and feedback for applications'`);
  await knex.raw(`COMMENT ON COLUMN interviews.created_by IS 'Tenant user who scheduled the interview (from hris.user_account)'`);
  await knex.raw(`COMMENT ON COLUMN interviews.rating IS 'Overall interview rating from 1-5'`);
  
  // ============================================================================
  // INTERVIEW INTERVIEWERS - Junction table for interview participants
  // ============================================================================
  await knex.schema.createTable('interview_interviewers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('interview_id').notNullable().references('id').inTable('interviews').onDelete('CASCADE');
    table.uuid('user_id').notNullable(); // References hris.user_account(id)
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add unique constraint
  await knex.raw(`
    ALTER TABLE interview_interviewers
    ADD CONSTRAINT unique_interview_interviewer UNIQUE (interview_id, user_id)
  `);
  
  // Add foreign key for user_id
  await knex.raw(`
    ALTER TABLE interview_interviewers
    ADD CONSTRAINT fk_interview_interviewers_user
    FOREIGN KEY (user_id) REFERENCES hris.user_account(id) ON DELETE CASCADE
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_interview_interviewers_interview_id ON interview_interviewers(interview_id)');
  await knex.raw('CREATE INDEX idx_interview_interviewers_user_id ON interview_interviewers(user_id)');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE interview_interviewers IS 'Many-to-many relationship between interviews and interviewers'`);
  await knex.raw(`COMMENT ON COLUMN interview_interviewers.user_id IS 'Tenant user conducting the interview (from hris.user_account)'`);
  
  // ============================================================================
  // COMMUNICATIONS TABLE - Messages between recruiters and candidates
  // ============================================================================
  await knex.schema.createTable('communications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    
    // Message Details
    table.string('from_type', 20);
    table.uuid('from_user_id'); // References hris.user_account(id), NULL for candidate messages
    table.uuid('from_candidate_id').references('id').inTable('candidates'); // NULL for recruiter/system messages
    
    table.string('message_type', 50);
    table.string('subject', 255);
    table.text('message').notNullable();
    
    // Visibility
    table.boolean('is_public').defaultTo(true); // Visible to candidate on tracking page
    
    // Attachments (stored as JSONB array of file metadata)
    table.jsonb('attachments').defaultTo('[]');
    
    // Read Status
    table.timestamp('read_at', { useTz: true });
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // Add check constraints
  await knex.raw(`ALTER TABLE communications ADD CONSTRAINT check_from_type CHECK (from_type IN ('recruiter', 'candidate', 'system'))`);
  await knex.raw(`ALTER TABLE communications ADD CONSTRAINT check_message_type CHECK (message_type IN ('status-update', 'interview-invite', 'document-request', 'general', 'rejection', 'offer'))`);
  
  // Add foreign key for from_user_id
  await knex.raw(`
    ALTER TABLE communications
    ADD CONSTRAINT fk_communications_from_user
    FOREIGN KEY (from_user_id) REFERENCES hris.user_account(id)
  `);
  
  // Create indexes
  await knex.raw('CREATE INDEX idx_communications_application_id ON communications(application_id)');
  await knex.raw('CREATE INDEX idx_communications_from_type ON communications(from_type)');
  await knex.raw('CREATE INDEX idx_communications_from_user ON communications(from_user_id) WHERE from_user_id IS NOT NULL');
  await knex.raw('CREATE INDEX idx_communications_created_at ON communications(created_at)');
  
  // Add comments
  await knex.raw(`COMMENT ON TABLE communications IS 'Messages and communications related to applications'`);
  await knex.raw(`COMMENT ON COLUMN communications.from_user_id IS 'Tenant user sending message (from hris.user_account), NULL for candidate messages'`);
  await knex.raw(`COMMENT ON COLUMN communications.is_public IS 'Whether message is visible to candidate on public tracking page'`);
  
  // ================================================================
  // ROW LEVEL SECURITY (RLS) POLICIES
  // Multi-Tenant Data Isolation at Database Level
  // ================================================================
  
  // ================================================================
  // RLS: WORKSPACES
  // ================================================================
  await knex.raw('ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY workspaces_tenant_isolation ON workspaces
      USING (organization_id = get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY workspaces_tenant_isolation_insert ON workspaces
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ================================================================
  // RLS: FLOW TEMPLATES
  // ================================================================
  await knex.raw('ALTER TABLE flow_templates ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY flow_templates_tenant_isolation ON flow_templates
      USING (organization_id = get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY flow_templates_tenant_isolation_insert ON flow_templates
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ================================================================
  // RLS: JOBS
  // ================================================================
  await knex.raw('ALTER TABLE jobs ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY jobs_tenant_isolation ON jobs
      USING (organization_id = get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY jobs_tenant_isolation_insert ON jobs
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ================================================================
  // RLS: CANDIDATES
  // ================================================================
  await knex.raw('ALTER TABLE candidates ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY candidates_tenant_isolation ON candidates
      USING (organization_id = get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY candidates_tenant_isolation_insert ON candidates
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ================================================================
  // RLS: APPLICATIONS
  // ================================================================
  await knex.raw('ALTER TABLE applications ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY applications_tenant_isolation ON applications
      USING (organization_id = get_current_organization_id())
  `);
  
  await knex.raw(`
    CREATE POLICY applications_tenant_isolation_insert ON applications
      FOR INSERT
      WITH CHECK (organization_id = get_current_organization_id())
  `);
  
  // ================================================================
  // RLS: INTERVIEWS (via applications relationship)
  // ================================================================
  await knex.raw('ALTER TABLE interviews ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY interviews_tenant_isolation ON interviews
      USING (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = interviews.application_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  await knex.raw(`
    CREATE POLICY interviews_tenant_isolation_insert ON interviews
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = interviews.application_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  // ================================================================
  // RLS: INTERVIEW INTERVIEWERS (via interviews relationship)
  // ================================================================
  await knex.raw('ALTER TABLE interview_interviewers ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY interview_interviewers_tenant_isolation ON interview_interviewers
      USING (
        EXISTS (
          SELECT 1 FROM interviews i
          JOIN applications a ON a.id = i.application_id
          WHERE i.id = interview_interviewers.interview_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  await knex.raw(`
    CREATE POLICY interview_interviewers_tenant_isolation_insert ON interview_interviewers
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM interviews i
          JOIN applications a ON a.id = i.application_id
          WHERE i.id = interview_interviewers.interview_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  // ================================================================
  // RLS: COMMUNICATIONS (via applications relationship)
  // ================================================================
  await knex.raw('ALTER TABLE communications ENABLE ROW LEVEL SECURITY');
  
  await knex.raw(`
    CREATE POLICY communications_tenant_isolation ON communications
      USING (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = communications.application_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  await knex.raw(`
    CREATE POLICY communications_tenant_isolation_insert ON communications
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = communications.application_id
          AND a.organization_id = get_current_organization_id()
        )
      )
  `);
  
  console.log('✅ RecruitIQ schema created successfully with 8 tables');
};

exports.down = async function(knex) {
  console.log('Dropping RecruitIQ schema tables...');
  
  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('communications');
  await knex.schema.dropTableIfExists('interview_interviewers');
  await knex.schema.dropTableIfExists('interviews');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('flow_templates');
  await knex.schema.dropTableIfExists('workspaces');
  
  console.log('✅ RecruitIQ schema tables dropped successfully');
};
