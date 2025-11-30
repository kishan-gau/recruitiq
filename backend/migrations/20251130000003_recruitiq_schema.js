/**
 * RecruitIQ Schema Migration
 * 
 * Creates the RecruitIQ (Applicant Tracking System) schema
 * for recruitment management including workspaces, jobs,
 * candidates, applications, interviews, and communications.
 * 
 * Schema: public (uses shared organizations and hris.user_account)
 * Dependencies: organizations, hris.user_account
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ============================================================================
  // WORKSPACES TABLE - Multi-tenant workspace organization
  // ============================================================================
  await knex.schema.createTable('workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('slug', 255).notNullable();
    table.jsonb('settings').defaultTo(JSON.stringify({
      branding: {},
      workflow: {},
      notifications: {}
    }));
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
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

  // ============================================================================
  // FLOW TEMPLATES TABLE - Customizable hiring process templates
  // ============================================================================
  await knex.schema.createTable('flow_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 100);
    table.jsonb('stages').notNullable();
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_global').defaultTo(false);
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_flow_templates_organization_id ON flow_templates(organization_id);
    CREATE INDEX idx_flow_templates_workspace_id ON flow_templates(workspace_id);
    CREATE INDEX idx_flow_templates_is_default ON flow_templates(is_default) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE flow_templates IS 'Reusable hiring process templates with customizable stages';
    COMMENT ON COLUMN flow_templates.stages IS 'JSONB array of stage objects: [{"name": "Screening", "order": 1, "type": "review"}]';
    COMMENT ON COLUMN flow_templates.created_by IS 'Tenant user who created the template (from hris.user_account)';
  `);

  // ============================================================================
  // JOBS TABLE - Job postings and openings
  // ============================================================================
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.string('department', 100);
    table.string('location', 255);
    table.string('employment_type', 50);
    table.string('experience_level', 50);
    table.string('remote_policy', 50);
    table.boolean('is_remote').defaultTo(false);
    table.text('description');
    table.text('requirements');
    table.text('responsibilities');
    table.text('benefits');
    table.integer('salary_min');
    table.integer('salary_max');
    table.string('salary_currency', 10).defaultTo('USD');
    table.string('status', 50).defaultTo('draft');
    table.boolean('is_public').defaultTo(false);
    table.string('public_slug', 255).unique();
    table.jsonb('public_portal_settings').defaultTo(JSON.stringify({
      companyName: '',
      companyLogo: '',
      salaryPublic: false,
      customFields: []
    }));
    table.integer('view_count').defaultTo(0);
    table.integer('application_count').defaultTo(0);
    table.uuid('flow_template_id').references('id').inTable('flow_templates');
    table.uuid('hiring_manager_id').references('id').inTable('hris.user_account');
    table.uuid('recruiter_id').references('id').inTable('hris.user_account');
    table.timestamp('posted_at');
    table.timestamp('closes_at');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
    CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id);
    CREATE INDEX idx_jobs_status ON jobs(status);
    CREATE INDEX idx_jobs_flow_template_id ON jobs(flow_template_id);
    CREATE INDEX idx_jobs_public_slug ON jobs(public_slug);
    CREATE INDEX idx_jobs_is_public ON jobs(is_public);
    CREATE INDEX idx_jobs_hiring_manager ON jobs(hiring_manager_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id) WHERE deleted_at IS NULL;
    
    COMMENT ON TABLE jobs IS 'Job postings and openings for recruitment';
    COMMENT ON COLUMN jobs.hiring_manager_id IS 'Tenant user managing hiring for this job (from hris.user_account)';
    COMMENT ON COLUMN jobs.recruiter_id IS 'Tenant user recruiting for this job (from hris.user_account)';
    COMMENT ON COLUMN jobs.public_slug IS 'URL-friendly identifier for public job portal';
    COMMENT ON COLUMN jobs.employment_type IS 'Types: full-time, part-time, contract, internship, temporary';
    COMMENT ON COLUMN jobs.experience_level IS 'Levels: entry, mid, senior, lead, executive';
    COMMENT ON COLUMN jobs.remote_policy IS 'Policies: onsite, hybrid, remote';
    COMMENT ON COLUMN jobs.status IS 'Status: draft, open, paused, filled, closed, archived';
  `);

  // ============================================================================
  // CANDIDATES TABLE - Candidate profiles
  // ============================================================================
  await knex.schema.createTable('candidates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('first_name', 255).notNullable();
    table.string('last_name', 255).notNullable();
    table.string('name', 255);
    table.string('email', 255).notNullable();
    table.string('phone', 50);
    table.string('location', 255);
    table.string('current_job_title', 255);
    table.string('current_company', 255);
    table.string('linkedin_url', 500);
    table.string('portfolio_url', 500);
    table.string('resume_url', 500);
    table.specificType('skills', 'TEXT[]');
    table.text('experience');
    table.text('education');
    table.string('source', 100);
    table.string('source_details', 500);
    table.string('application_source', 50).defaultTo('manual');
    table.string('tracking_code', 50).unique();
    table.jsonb('application_data').defaultTo('{}');
    table.specificType('tags', 'TEXT[]');
    table.text('notes');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.unique(['email', 'organization_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
    CREATE INDEX idx_candidates_email ON candidates(email);
    CREATE INDEX idx_candidates_name ON candidates(first_name, last_name);
    CREATE INDEX idx_candidates_tracking_code ON candidates(tracking_code);
    
    COMMENT ON TABLE candidates IS 'Candidate profiles and contact information';
    COMMENT ON COLUMN candidates.created_by IS 'Tenant user who added the candidate (from hris.user_account)';
    COMMENT ON COLUMN candidates.tracking_code IS 'Unique code for candidate to track applications on public portal';
    COMMENT ON COLUMN candidates.application_source IS 'Sources: manual, public-portal, referral, linkedin, indeed, other';
  `);

  // ============================================================================
  // APPLICATIONS TABLE - Job applications from candidates
  // ============================================================================
  await knex.schema.createTable('applications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('job_id').notNullable().references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('candidate_id').notNullable().references('id').inTable('candidates').onDelete('CASCADE');
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('tracking_code', 50).unique().notNullable();
    table.string('status', 50).defaultTo('applied');
    table.string('stage', 50).defaultTo('applied');
    table.integer('current_stage');
    table.string('current_stage_name', 255);
    table.text('cover_letter');
    table.text('notes');
    table.text('rejection_reason');
    table.timestamp('applied_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_applications_job_id ON applications(job_id);
    CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
    CREATE INDEX idx_applications_organization_id ON applications(organization_id);
    CREATE INDEX idx_applications_workspace_id ON applications(workspace_id);
    CREATE INDEX idx_applications_tracking_code ON applications(tracking_code);
    CREATE INDEX idx_applications_status ON applications(status);
    CREATE INDEX idx_applications_stage ON applications(stage);
    
    COMMENT ON TABLE applications IS 'Job applications linking candidates to jobs';
    COMMENT ON COLUMN applications.tracking_code IS 'Unique code for applicants to track their application status';
    COMMENT ON COLUMN applications.stage IS 'Current hiring pipeline stage';
    COMMENT ON COLUMN applications.status IS 'Status: active, rejected, withdrawn, hired';
    COMMENT ON COLUMN applications.stage IS 'Stages: applied, screening, phone_screen, assessment, interview, offer, hired, rejected, withdrawn';
  `);

  // ============================================================================
  // INTERVIEWS TABLE - Interview scheduling and feedback
  // ============================================================================
  await knex.schema.createTable('interviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.string('type', 50);
    table.string('status', 50).defaultTo('scheduled');
    table.timestamp('scheduled_at');
    table.integer('duration_minutes');
    table.integer('duration');
    table.string('location', 500);
    table.string('meeting_link', 500);
    table.text('notes');
    table.text('feedback');
    table.integer('rating');
    table.string('recommendation', 50);
    table.text('strengths');
    table.text('weaknesses');
    table.jsonb('technical_skills');
    table.integer('culture_fit');
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });

  await knex.raw(`
    CREATE INDEX idx_interviews_application_id ON interviews(application_id);
    CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
    CREATE INDEX idx_interviews_status ON interviews(status);
    
    COMMENT ON TABLE interviews IS 'Interview scheduling and feedback for applications';
    COMMENT ON COLUMN interviews.created_by IS 'Tenant user who scheduled the interview (from hris.user_account)';
    COMMENT ON COLUMN interviews.rating IS 'Overall interview rating from 1-5';
    COMMENT ON COLUMN interviews.type IS 'Types: phone, video, onsite, technical, behavioral, panel';
    COMMENT ON COLUMN interviews.status IS 'Status: scheduled, in_progress, completed, cancelled, rescheduled, no_show';
  `);

  // ============================================================================
  // INTERVIEW INTERVIEWERS - Junction table for interview participants
  // ============================================================================
  await knex.schema.createTable('interview_interviewers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('interview_id').notNullable().references('id').inTable('interviews').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['interview_id', 'user_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_interview_interviewers_interview_id ON interview_interviewers(interview_id);
    CREATE INDEX idx_interview_interviewers_user_id ON interview_interviewers(user_id);
    
    COMMENT ON TABLE interview_interviewers IS 'Many-to-many relationship between interviews and interviewers';
    COMMENT ON COLUMN interview_interviewers.user_id IS 'Tenant user conducting the interview (from hris.user_account)';
  `);

  // ============================================================================
  // COMMUNICATIONS TABLE - Messages between recruiters and candidates
  // ============================================================================
  await knex.schema.createTable('communications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('application_id').notNullable().references('id').inTable('applications').onDelete('CASCADE');
    table.string('from_type', 20);
    table.uuid('from_user_id').references('id').inTable('hris.user_account');
    table.uuid('from_candidate_id').references('id').inTable('candidates');
    table.string('message_type', 50);
    table.string('subject', 255);
    table.text('message').notNullable();
    table.boolean('is_public').defaultTo(true);
    table.jsonb('attachments').defaultTo('[]');
    table.timestamp('read_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_communications_application_id ON communications(application_id);
    CREATE INDEX idx_communications_from_type ON communications(from_type);
    CREATE INDEX idx_communications_from_user ON communications(from_user_id) WHERE from_user_id IS NOT NULL;
    CREATE INDEX idx_communications_created_at ON communications(created_at);
    
    COMMENT ON TABLE communications IS 'Messages and communications related to applications';
    COMMENT ON COLUMN communications.from_user_id IS 'Tenant user sending message (from hris.user_account), NULL for candidate messages';
    COMMENT ON COLUMN communications.is_public IS 'Whether message is visible to candidate on public tracking page';
    COMMENT ON COLUMN communications.from_type IS 'Types: recruiter, candidate, system';
    COMMENT ON COLUMN communications.message_type IS 'Types: status-update, interview-invite, document-request, general, rejection, offer';
  `);

  // ============================================================================
  // ROW LEVEL SECURITY (RLS) POLICIES
  // ============================================================================
  
  // Enable RLS on workspaces
  await knex.raw(`
    ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY workspaces_tenant_isolation ON workspaces
      USING (organization_id = public.get_current_organization_id());
    
    CREATE POLICY workspaces_tenant_isolation_insert ON workspaces
      FOR INSERT
      WITH CHECK (organization_id = public.get_current_organization_id());
  `);

  // Enable RLS on flow_templates
  await knex.raw(`
    ALTER TABLE flow_templates ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY flow_templates_tenant_isolation ON flow_templates
      USING (organization_id = public.get_current_organization_id());
    
    CREATE POLICY flow_templates_tenant_isolation_insert ON flow_templates
      FOR INSERT
      WITH CHECK (organization_id = public.get_current_organization_id());
  `);

  // Enable RLS on jobs
  await knex.raw(`
    ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY jobs_tenant_isolation ON jobs
      USING (organization_id = public.get_current_organization_id());
    
    CREATE POLICY jobs_tenant_isolation_insert ON jobs
      FOR INSERT
      WITH CHECK (organization_id = public.get_current_organization_id());
  `);

  // Enable RLS on candidates
  await knex.raw(`
    ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY candidates_tenant_isolation ON candidates
      USING (organization_id = public.get_current_organization_id());
    
    CREATE POLICY candidates_tenant_isolation_insert ON candidates
      FOR INSERT
      WITH CHECK (organization_id = public.get_current_organization_id());
  `);

  // Enable RLS on applications
  await knex.raw(`
    ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY applications_tenant_isolation ON applications
      USING (organization_id = public.get_current_organization_id());
    
    CREATE POLICY applications_tenant_isolation_insert ON applications
      FOR INSERT
      WITH CHECK (organization_id = public.get_current_organization_id());
  `);

  // Enable RLS on interviews (via applications relationship)
  await knex.raw(`
    ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY interviews_tenant_isolation ON interviews
      USING (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = interviews.application_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
    
    CREATE POLICY interviews_tenant_isolation_insert ON interviews
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = interviews.application_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
  `);

  // Enable RLS on interview_interviewers (via interviews relationship)
  await knex.raw(`
    ALTER TABLE interview_interviewers ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY interview_interviewers_tenant_isolation ON interview_interviewers
      USING (
        EXISTS (
          SELECT 1 FROM interviews i
          JOIN applications a ON a.id = i.application_id
          WHERE i.id = interview_interviewers.interview_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
    
    CREATE POLICY interview_interviewers_tenant_isolation_insert ON interview_interviewers
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM interviews i
          JOIN applications a ON a.id = i.application_id
          WHERE i.id = interview_interviewers.interview_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
  `);

  // Enable RLS on communications (via applications relationship)
  await knex.raw(`
    ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY communications_tenant_isolation ON communications
      USING (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = communications.application_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
    
    CREATE POLICY communications_tenant_isolation_insert ON communications
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM applications a
          WHERE a.id = communications.application_id
          AND a.organization_id = public.get_current_organization_id()
        )
      );
  `);

  console.log('✓ RecruitIQ schema migration complete');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Drop RLS policies first
  await knex.raw('DROP POLICY IF EXISTS communications_tenant_isolation_insert ON communications');
  await knex.raw('DROP POLICY IF EXISTS communications_tenant_isolation ON communications');
  await knex.raw('DROP POLICY IF EXISTS interview_interviewers_tenant_isolation_insert ON interview_interviewers');
  await knex.raw('DROP POLICY IF EXISTS interview_interviewers_tenant_isolation ON interview_interviewers');
  await knex.raw('DROP POLICY IF EXISTS interviews_tenant_isolation_insert ON interviews');
  await knex.raw('DROP POLICY IF EXISTS interviews_tenant_isolation ON interviews');
  await knex.raw('DROP POLICY IF EXISTS applications_tenant_isolation_insert ON applications');
  await knex.raw('DROP POLICY IF EXISTS applications_tenant_isolation ON applications');
  await knex.raw('DROP POLICY IF EXISTS candidates_tenant_isolation_insert ON candidates');
  await knex.raw('DROP POLICY IF EXISTS candidates_tenant_isolation ON candidates');
  await knex.raw('DROP POLICY IF EXISTS jobs_tenant_isolation_insert ON jobs');
  await knex.raw('DROP POLICY IF EXISTS jobs_tenant_isolation ON jobs');
  await knex.raw('DROP POLICY IF EXISTS flow_templates_tenant_isolation_insert ON flow_templates');
  await knex.raw('DROP POLICY IF EXISTS flow_templates_tenant_isolation ON flow_templates');
  await knex.raw('DROP POLICY IF EXISTS workspaces_tenant_isolation_insert ON workspaces');
  await knex.raw('DROP POLICY IF EXISTS workspaces_tenant_isolation ON workspaces');

  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('communications');
  await knex.schema.dropTableIfExists('interview_interviewers');
  await knex.schema.dropTableIfExists('interviews');
  await knex.schema.dropTableIfExists('applications');
  await knex.schema.dropTableIfExists('candidates');
  await knex.schema.dropTableIfExists('jobs');
  await knex.schema.dropTableIfExists('flow_templates');
  await knex.schema.dropTableIfExists('workspaces');

  console.log('✓ RecruitIQ schema rollback complete');
}
