/**
 * Seed Demo Data for RecruitIQ
 * This script clears existing demo data and creates fresh demo data for:
 * - Organizations
 * - Users
 * - Workspaces
 * - Jobs
 * - Candidates
 * - Applications
 * - Interviews
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'recruitiq_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

const SALT_ROUNDS = 10;

/**
 * Clear all demo data from tables (in correct order due to foreign keys)
 */
async function clearDemoData(client) {
  console.log('\n🗑️  Clearing existing demo data...\n');

  try {
    // Delete in reverse order of dependencies
    await client.query('DELETE FROM interviews WHERE application_id IN (SELECT id FROM applications)');
    console.log('  ✓ Cleared interviews');

    await client.query('DELETE FROM applications');
    console.log('  ✓ Cleared applications');

    await client.query('DELETE FROM candidates');
    console.log('  ✓ Cleared candidates');

    await client.query('DELETE FROM jobs');
    console.log('  ✓ Cleared jobs');

    await client.query('DELETE FROM flow_templates WHERE organization_id IN (SELECT id FROM organizations WHERE slug LIKE \'demo-%\')');
    console.log('  ✓ Cleared flow templates');

    await client.query('DELETE FROM workspace_members');
    console.log('  ✓ Cleared workspace members');

    await client.query('DELETE FROM workspaces');
    console.log('  ✓ Cleared workspaces');

    await client.query('DELETE FROM refresh_tokens');
    console.log('  ✓ Cleared refresh tokens');

    await client.query('DELETE FROM users WHERE email LIKE \'%@demo.com\'');
    console.log('  ✓ Cleared demo users');

    await client.query('DELETE FROM organizations WHERE slug LIKE \'demo-%\'');
    console.log('  ✓ Cleared demo organizations');

    console.log('\n✅ Demo data cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing demo data:', error.message);
    throw error;
  }
}

/**
 * Create demo organizations
 */
async function createOrganizations(client) {
  console.log('📊 Creating demo organizations...\n');

  const organizations = [
    {
      id: uuidv4(),
      name: 'TechCorp Solutions',
      slug: 'demo-techcorp',
      tier: 'professional',
      maxUsers: 50,
      maxWorkspaces: 10,
      maxJobs: 100,
      maxCandidates: 1000,
      deploymentModel: 'shared'
    },
    {
      id: uuidv4(),
      name: 'StartupXYZ',
      slug: 'demo-startupxyz',
      tier: 'starter',
      maxUsers: 10,
      maxWorkspaces: 3,
      maxJobs: 20,
      maxCandidates: 200,
      deploymentModel: 'shared'
    }
  ];

  for (const org of organizations) {
    await client.query(
      `INSERT INTO organizations (
        id, name, slug, tier, max_users, max_workspaces, max_jobs, max_candidates,
        deployment_model, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [org.id, org.name, org.slug, org.tier, org.maxUsers, org.maxWorkspaces, 
       org.maxJobs, org.maxCandidates, org.deploymentModel]
    );
    console.log(`  ✓ Created organization: ${org.name} (${org.tier})`);
  }

  console.log('');
  return organizations;
}

/**
 * Get or create permissions and roles
 */
async function ensurePermissionsAndRoles(client) {
  // Check if admin role exists
  const roleResult = await client.query(
    'SELECT id FROM roles WHERE name = $1',
    ['Admin']
  );

  if (roleResult.rows.length === 0) {
    console.log('⚠️  No roles found. Running schema setup first...');
    // The schema should already have roles, but if not, we'll skip for now
  }

  const roles = await client.query('SELECT id, name FROM roles ORDER BY level');
  return roles.rows;
}

/**
 * Create demo users
 */
async function createUsers(client, organizations, roles) {
  console.log('👥 Creating demo users...\n');

  const passwordHash = await bcrypt.hash('Demo123!', SALT_ROUNDS);
  const org1 = organizations[0]; // TechCorp
  const org2 = organizations[1]; // StartupXYZ

  // Find role IDs
  const adminRole = roles.find(r => r.name === 'Admin');
  const recruiterRole = roles.find(r => r.name === 'Recruiter');
  const hiringManagerRole = roles.find(r => r.name === 'Hiring Manager');

  const users = [
    {
      id: uuidv4(),
      organizationId: org1.id,
      email: 'admin@demo.com',
      name: 'Admin User',
      roleId: adminRole?.id,
      legacyRole: 'admin'
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      email: 'recruiter@demo.com',
      name: 'Sarah Recruiter',
      roleId: recruiterRole?.id,
      legacyRole: 'recruiter'
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      email: 'manager@demo.com',
      name: 'John Manager',
      roleId: hiringManagerRole?.id,
      legacyRole: 'member'
    },
    {
      id: uuidv4(),
      organizationId: org2.id,
      email: 'admin2@demo.com',
      name: 'Startup Admin',
      roleId: adminRole?.id,
      legacyRole: 'admin'
    }
  ];

  for (const user of users) {
    await client.query(
      `INSERT INTO users (
        id, organization_id, email, password_hash, name, role_id, legacy_role,
        email_verified, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [user.id, user.organizationId, user.email, passwordHash, user.name, 
       user.roleId, user.legacyRole, true, true]
    );
    console.log(`  ✓ Created user: ${user.name} (${user.email})`);
  }

  console.log('');
  return users;
}

/**
 * Create demo workspaces
 */
async function createWorkspaces(client, organizations, users) {
  console.log('🏢 Creating demo workspaces...\n');

  const org1 = organizations[0]; // TechCorp
  const org1Admin = users.find(u => u.email === 'admin@demo.com');

  const workspaces = [
    {
      id: uuidv4(),
      organizationId: org1.id,
      name: 'Engineering',
      description: 'Engineering department hiring',
      createdBy: org1Admin.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      name: 'Sales & Marketing',
      description: 'Sales and Marketing team',
      createdBy: org1Admin.id
    }
  ];

  for (const workspace of workspaces) {
    await client.query(
      `INSERT INTO workspaces (
        id, organization_id, name, description, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [workspace.id, workspace.organizationId, workspace.name,
       workspace.description, workspace.createdBy]
    );

    // Add workspace members
    for (const user of users.filter(u => u.organizationId === workspace.organizationId)) {
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())`,
        [workspace.id, user.id, user.legacyRole === 'admin' ? 'owner' : 'member']
      );
    }

    console.log(`  ✓ Created workspace: ${workspace.name}`);
  }

  console.log('');
  return workspaces;
}

/**
 * Create demo jobs
 */
async function createJobs(client, organizations, workspaces, users, flowTemplates) {
  console.log('💼 Creating demo jobs...\n');

  const org1 = organizations[0];
  const workspace1 = workspaces[0]; // Engineering
  const workspace2 = workspaces[1]; // Sales & Marketing
  const recruiter = users.find(u => u.email === 'recruiter@demo.com');
  const manager = users.find(u => u.email === 'manager@demo.com');

  // Get flow templates
  const techTemplate = flowTemplates.find(t => t.category === 'technical');
  const salesTemplate = flowTemplates.find(t => t.category === 'sales');

  const jobs = [
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: workspace1.id,
      flowTemplateId: techTemplate.id,
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      location: 'San Francisco, CA',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      remotePolicy: 'hybrid',
      isRemote: true,
      description: 'We are looking for an experienced Full Stack Developer to join our growing engineering team.',
      requirements: JSON.stringify([
        '5+ years of experience in web development',
        'Strong knowledge of React and Node.js',
        'Experience with PostgreSQL or similar databases',
        'Excellent problem-solving skills',
        'Strong communication skills'
      ]),
      responsibilities: 'Build and maintain web applications, collaborate with cross-functional teams, mentor junior developers.',
      benefits: JSON.stringify([
        'Competitive salary',
        'Health insurance',
        '401k matching',
        'Flexible work hours',
        'Remote work options'
      ]),
      salaryMin: 120000,
      salaryMax: 180000,
      salaryCurrency: 'USD',
      status: 'open',
      isPublic: true,
      publicSlug: 'senior-full-stack-developer-sf',
      recruiterId: recruiter.id,
      hiringManagerId: manager.id,
      createdBy: recruiter.id,
      postedAt: new Date()
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: workspace1.id,
      flowTemplateId: techTemplate.id,
      title: 'Frontend Developer',
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'full-time',
      experienceLevel: 'mid',
      remotePolicy: 'remote',
      isRemote: true,
      description: 'Join our team to build beautiful and responsive user interfaces.',
      requirements: JSON.stringify([
        '3+ years of React experience',
        'Strong CSS and HTML skills',
        'Experience with modern frontend tools',
        'Understanding of responsive design'
      ]),
      salaryMin: 90000,
      salaryMax: 130000,
      salaryCurrency: 'USD',
      status: 'open',
      isPublic: true,
      publicSlug: 'frontend-developer-remote',
      recruiterId: recruiter.id,
      hiringManagerId: manager.id,
      createdBy: recruiter.id,
      postedAt: new Date()
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: workspace2.id,
      flowTemplateId: salesTemplate.id,
      title: 'Sales Development Representative',
      department: 'Sales',
      location: 'New York, NY',
      employmentType: 'full-time',
      experienceLevel: 'entry',
      remotePolicy: 'hybrid',
      isRemote: false,
      description: 'Help us grow our customer base by generating qualified leads.',
      requirements: JSON.stringify([
        'Excellent communication skills',
        '1+ years in sales or customer-facing role',
        'Self-motivated and goal-oriented',
        'CRM experience preferred'
      ]),
      salaryMin: 50000,
      salaryMax: 70000,
      salaryCurrency: 'USD',
      status: 'open',
      isPublic: true,
      publicSlug: 'sdr-new-york',
      recruiterId: recruiter.id,
      createdBy: recruiter.id,
      postedAt: new Date()
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: workspace1.id,
      flowTemplateId: techTemplate.id,
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'Austin, TX',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      remotePolicy: 'hybrid',
      isRemote: true,
      description: 'Build and maintain our cloud infrastructure and CI/CD pipelines.',
      requirements: JSON.stringify([
        '4+ years DevOps experience',
        'Strong knowledge of AWS/Azure/GCP',
        'Experience with Docker and Kubernetes',
        'Infrastructure as Code experience',
        'Strong scripting skills'
      ]),
      salaryMin: 130000,
      salaryMax: 170000,
      salaryCurrency: 'USD',
      status: 'open',
      isPublic: false,
      recruiterId: recruiter.id,
      hiringManagerId: manager.id,
      createdBy: recruiter.id
    }
  ];

  for (const job of jobs) {
    await client.query(
      `INSERT INTO jobs (
        id, organization_id, workspace_id, flow_template_id, title, department, location,
        employment_type, experience_level, remote_policy, is_remote,
        description, requirements, responsibilities, benefits,
        salary_min, salary_max, salary_currency, status, is_public, public_slug,
        recruiter_id, hiring_manager_id, created_by, posted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())`,
      [
        job.id, job.organizationId, job.workspaceId, job.flowTemplateId, job.title, job.department, job.location,
        job.employmentType, job.experienceLevel, job.remotePolicy, job.isRemote,
        job.description, job.requirements, job.responsibilities, job.benefits,
        job.salaryMin, job.salaryMax, job.salaryCurrency, job.status, job.isPublic, job.publicSlug,
        job.recruiterId, job.hiringManagerId, job.createdBy, job.postedAt
      ]
    );
    const flowTemplate = flowTemplates.find(t => t.id === job.flowTemplateId);
    console.log(`  ✓ Created job: ${job.title} (${job.status}${job.isPublic ? ', public' : ''}, flow: ${flowTemplate.name})`);
  }

  console.log('');
  return jobs;
}

/**
 * Create demo candidates
 */
async function createCandidates(client, organizations, users) {
  console.log('👤 Creating demo candidates...\n');

  const org1 = organizations[0];
  const recruiter = users.find(u => u.email === 'recruiter@demo.com');

  const candidates = [
    {
      id: uuidv4(),
      organizationId: org1.id,
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice.johnson@example.com',
      phone: '+1-555-0101',
      location: 'San Francisco, CA',
      currentJobTitle: 'Full Stack Developer',
      currentCompany: 'Tech Innovations Inc',
      linkedinUrl: 'https://linkedin.com/in/alicejohnson',
      skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'AWS'],
      experience: '6 years of full-stack development experience',
      education: 'BS in Computer Science, Stanford University',
      source: 'LinkedIn',
      createdBy: recruiter.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob.smith@example.com',
      phone: '+1-555-0102',
      location: 'Remote',
      currentJobTitle: 'Frontend Developer',
      currentCompany: 'WebDesign Co',
      portfolioUrl: 'https://bobsmith.dev',
      skills: ['React', 'Vue.js', 'CSS', 'JavaScript', 'Figma'],
      experience: '4 years of frontend development',
      education: 'BA in Design, UCLA',
      source: 'Referral',
      createdBy: recruiter.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      firstName: 'Carol',
      lastName: 'Williams',
      email: 'carol.williams@example.com',
      phone: '+1-555-0103',
      location: 'New York, NY',
      currentJobTitle: 'Sales Associate',
      currentCompany: 'SalesPro Inc',
      skills: ['Salesforce', 'Cold Calling', 'Lead Generation', 'Negotiation'],
      experience: '2 years in B2B sales',
      education: 'BA in Business Administration, NYU',
      source: 'Indeed',
      createdBy: recruiter.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      firstName: 'David',
      lastName: 'Brown',
      email: 'david.brown@example.com',
      phone: '+1-555-0104',
      location: 'Austin, TX',
      currentJobTitle: 'DevOps Engineer',
      currentCompany: 'Cloud Systems Ltd',
      linkedinUrl: 'https://linkedin.com/in/davidbrown',
      skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Python', 'Jenkins'],
      experience: '5 years in DevOps and cloud infrastructure',
      education: 'MS in Computer Science, UT Austin',
      source: 'LinkedIn',
      createdBy: recruiter.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma.davis@example.com',
      phone: '+1-555-0105',
      location: 'Boston, MA',
      currentJobTitle: 'Senior Software Engineer',
      currentCompany: 'Innovation Labs',
      linkedinUrl: 'https://linkedin.com/in/emmadavis',
      portfolioUrl: 'https://emmadavis.com',
      skills: ['Java', 'Spring Boot', 'Microservices', 'MongoDB', 'Redis'],
      experience: '8 years of backend development',
      education: 'BS in Software Engineering, MIT',
      source: 'Company Website',
      createdBy: recruiter.id
    }
  ];

  for (const candidate of candidates) {
    const name = `${candidate.firstName} ${candidate.lastName}`;
    await client.query(
      `INSERT INTO candidates (
        id, organization_id, first_name, last_name, name, email, phone, location,
        current_job_title, current_company, linkedin_url, portfolio_url,
        skills, experience, education, source, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
      [
        candidate.id, candidate.organizationId, candidate.firstName, candidate.lastName,
        name, candidate.email, candidate.phone, candidate.location,
        candidate.currentJobTitle, candidate.currentCompany, candidate.linkedinUrl,
        candidate.portfolioUrl, candidate.skills, candidate.experience,
        candidate.education, candidate.source, candidate.createdBy
      ]
    );
    console.log(`  ✓ Created candidate: ${name}`);
  }

  console.log('');
  return candidates;
}

/**
 * Create demo applications
 */
async function createApplications(client, jobs, candidates, organizations, workspaces, flowTemplates) {
  console.log('📝 Creating demo applications...\n');

  const org1 = organizations[0];
  const workspace1 = workspaces[0];
  
  // Find specific jobs
  const seniorDevJob = jobs.find(j => j.title === 'Senior Full Stack Developer');
  const frontendJob = jobs.find(j => j.title === 'Frontend Developer');
  const sdrJob = jobs.find(j => j.title === 'Sales Development Representative');
  const devopsJob = jobs.find(j => j.title === 'DevOps Engineer');

  // Find specific candidates
  const alice = candidates.find(c => c.firstName === 'Alice');
  const bob = candidates.find(c => c.firstName === 'Bob');
  const carol = candidates.find(c => c.firstName === 'Carol');
  const david = candidates.find(c => c.firstName === 'David');

  // Helper function to get stage info from flow template
  const getStageInfo = (job, stageSlug) => {
    const flowTemplate = flowTemplates.find(t => t.id === job.flowTemplateId);
    if (!flowTemplate) return { order: null, name: null };
    
    const stages = JSON.parse(flowTemplate.stages);
    const stage = stages.find(s => s.slug === stageSlug);
    return stage ? { order: stage.order, name: stage.name } : { order: null, name: null };
  };

  // Get Emma for additional applications
  const emma = candidates.find(c => c.firstName === 'Emma');

  const applications = [
    {
      id: uuidv4(),
      jobId: seniorDevJob.id,
      candidateId: alice.id,
      organizationId: org1.id,
      workspaceId: workspace1.id,
      trackingCode: `APP-${Date.now()}-001`,
      status: 'active',
      stage: 'interview',
      stageSlug: 'technical_interview',
      coverLetter: 'I am very interested in this position and believe my experience aligns well with your requirements.',
      notes: 'Strong technical background. Good culture fit.'
    },
    {
      id: uuidv4(),
      jobId: frontendJob.id,
      candidateId: bob.id,
      organizationId: org1.id,
      workspaceId: workspace1.id,
      trackingCode: `APP-${Date.now()}-002`,
      status: 'active',
      stage: 'assessment',
      stageSlug: 'assessment',
      coverLetter: 'I would love to join your team and contribute to building great user experiences.',
      notes: 'Great portfolio. Needs technical interview.'
    },
    {
      id: uuidv4(),
      jobId: sdrJob.id,
      candidateId: carol.id,
      organizationId: org1.id,
      workspaceId: workspaces[1].id,
      trackingCode: `APP-${Date.now()}-003`,
      status: 'active',
      stage: 'phone_screen',
      stageSlug: 'phone_interview',
      coverLetter: 'My sales experience and passion for technology make me a perfect fit for this role.'
    },
    {
      id: uuidv4(),
      jobId: devopsJob.id,
      candidateId: david.id,
      organizationId: org1.id,
      workspaceId: workspace1.id,
      trackingCode: `APP-${Date.now()}-004`,
      status: 'active',
      stage: 'applied',
      stageSlug: 'applied',
      coverLetter: 'I have extensive experience with cloud infrastructure and would be excited to join your team.',
      notes: 'Very experienced. Schedule initial call.'
    },
    {
      id: uuidv4(),
      jobId: seniorDevJob.id,
      candidateId: emma.id,
      organizationId: org1.id,
      workspaceId: workspace1.id,
      trackingCode: `APP-${Date.now()}-005`,
      status: 'active',
      stage: 'screening',
      stageSlug: 'screening',
      coverLetter: 'My extensive backend experience would be a great asset to your team.',
      notes: 'Very strong candidate. Move to phone screen.'
    },
    {
      id: uuidv4(),
      jobId: seniorDevJob.id,
      candidateId: bob.id,
      organizationId: org1.id,
      workspaceId: workspace1.id,
      trackingCode: `APP-${Date.now()}-006`,
      status: 'rejected',
      stage: 'rejected',
      stageSlug: 'rejected',
      rejectionReason: 'Not enough backend experience for senior role.'
    }
  ];

  for (const app of applications) {
    const job = jobs.find(j => j.id === app.jobId);
    const stageInfo = getStageInfo(job, app.stageSlug);
    
    await client.query(
      `INSERT INTO applications (
        id, job_id, candidate_id, organization_id, workspace_id, tracking_code,
        status, stage, current_stage, current_stage_name, cover_letter, notes, 
        rejection_reason, applied_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
      [
        app.id, app.jobId, app.candidateId, app.organizationId, app.workspaceId,
        app.trackingCode, app.status, app.stage, stageInfo.order, stageInfo.name,
        app.coverLetter, app.notes, app.rejectionReason
      ]
    );
    
    const candidate = candidates.find(c => c.id === app.candidateId);
    console.log(`  ✓ Created application: ${candidate.firstName} → ${job.title} (${stageInfo.name || app.stage})`);
  }

  console.log('');
  return applications;
}

/**
 * Create demo flow templates
 */
async function createFlowTemplates(client, organizations, users, workspaces) {
  console.log('🔄 Creating demo flow templates...\n');

  const org1 = organizations[0];
  const admin = users.find(u => u.email === 'admin@demo.com');
  const engineeringWorkspace = workspaces[0];
  const salesWorkspace = workspaces[1];

  const flowTemplates = [
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: engineeringWorkspace.id,
      name: 'Standard Technical Hiring',
      description: 'Complete workflow for technical positions including screening, assessments, and interviews',
      category: 'technical',
      isDefault: true,
      stages: JSON.stringify([
        {
          id: uuidv4(),
          name: 'Applied',
          slug: 'applied',
          type: 'initial',
          description: 'Initial application received',
          order: 1,
          color: '#3B82F6',
          isRequired: true,
          actions: ['review_resume', 'auto_screen']
        },
        {
          id: uuidv4(),
          name: 'Resume Screening',
          slug: 'screening',
          type: 'screening',
          description: 'Review resume and qualifications',
          order: 2,
          color: '#8B5CF6',
          durationDays: 2,
          actions: ['approve', 'reject', 'request_info']
        },
        {
          id: uuidv4(),
          name: 'Phone Screen',
          slug: 'phone_screen',
          type: 'interview',
          description: 'Initial recruiter phone screening',
          order: 3,
          color: '#10B981',
          durationDays: 3,
          requiresScheduling: true,
          interviewType: 'phone',
          durationMinutes: 30,
          actions: ['schedule', 'complete', 'reschedule']
        },
        {
          id: uuidv4(),
          name: 'Technical Assessment',
          slug: 'assessment',
          type: 'assessment',
          description: 'Coding challenge or technical test',
          order: 4,
          color: '#F59E0B',
          durationDays: 5,
          actions: ['send_assessment', 'review_submission', 'grade']
        },
        {
          id: uuidv4(),
          name: 'Technical Interview',
          slug: 'technical_interview',
          type: 'interview',
          description: 'In-depth technical discussion',
          order: 5,
          color: '#EC4899',
          durationDays: 5,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 90,
          actions: ['schedule', 'complete', 'reschedule']
        },
        {
          id: uuidv4(),
          name: 'Team Interview',
          slug: 'team_interview',
          type: 'interview',
          description: 'Meet with team members',
          order: 6,
          color: '#06B6D4',
          durationDays: 7,
          requiresScheduling: true,
          interviewType: 'onsite',
          durationMinutes: 120,
          actions: ['schedule', 'complete', 'reschedule']
        },
        {
          id: uuidv4(),
          name: 'Final Interview',
          slug: 'final_interview',
          type: 'interview',
          description: 'Interview with hiring manager or executive',
          order: 7,
          color: '#8B5CF6',
          durationDays: 5,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 60,
          actions: ['schedule', 'complete', 'reschedule']
        },
        {
          id: uuidv4(),
          name: 'Reference Check',
          slug: 'reference_check',
          type: 'background',
          description: 'Contact and verify references',
          order: 8,
          color: '#14B8A6',
          durationDays: 3,
          actions: ['request_references', 'contact', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Offer',
          slug: 'offer',
          type: 'offer',
          description: 'Prepare and extend offer',
          order: 9,
          color: '#10B981',
          durationDays: 2,
          actions: ['prepare_offer', 'send_offer', 'negotiate']
        },
        {
          id: uuidv4(),
          name: 'Hired',
          slug: 'hired',
          type: 'final',
          description: 'Offer accepted, candidate hired',
          order: 10,
          color: '#059669',
          isTerminal: true,
          actions: ['onboard']
        },
        {
          id: uuidv4(),
          name: 'Rejected',
          slug: 'rejected',
          type: 'final',
          description: 'Application rejected',
          order: 11,
          color: '#EF4444',
          isTerminal: true,
          actions: ['send_rejection']
        }
      ]),
      createdBy: admin.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: salesWorkspace.id,
      name: 'Fast Track Sales Hiring',
      description: 'Accelerated process for sales positions',
      category: 'sales',
      isDefault: false,
      stages: JSON.stringify([
        {
          id: uuidv4(),
          name: 'Applied',
          slug: 'applied',
          type: 'initial',
          description: 'Application submitted',
          order: 1,
          color: '#3B82F6',
          isRequired: true,
          actions: ['review']
        },
        {
          id: uuidv4(),
          name: 'Quick Screen',
          slug: 'quick_screen',
          type: 'screening',
          description: 'Brief qualification check',
          order: 2,
          color: '#8B5CF6',
          durationDays: 1,
          actions: ['approve', 'reject']
        },
        {
          id: uuidv4(),
          name: 'Phone Interview',
          slug: 'phone_interview',
          type: 'interview',
          description: 'Phone interview with recruiter',
          order: 3,
          color: '#10B981',
          durationDays: 2,
          requiresScheduling: true,
          interviewType: 'phone',
          durationMinutes: 30,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Sales Role Play',
          slug: 'roleplay',
          type: 'assessment',
          description: 'Sales scenario assessment',
          order: 4,
          color: '#F59E0B',
          durationDays: 3,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 45,
          actions: ['schedule', 'complete', 'grade']
        },
        {
          id: uuidv4(),
          name: 'Manager Interview',
          slug: 'manager_interview',
          type: 'interview',
          description: 'Interview with sales manager',
          order: 5,
          color: '#EC4899',
          durationDays: 3,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 60,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Offer',
          slug: 'offer',
          type: 'offer',
          description: 'Extend job offer',
          order: 6,
          color: '#10B981',
          durationDays: 1,
          actions: ['send_offer', 'negotiate']
        },
        {
          id: uuidv4(),
          name: 'Hired',
          slug: 'hired',
          type: 'final',
          description: 'Offer accepted',
          order: 7,
          color: '#059669',
          isTerminal: true,
          actions: ['onboard']
        },
        {
          id: uuidv4(),
          name: 'Rejected',
          slug: 'rejected',
          type: 'final',
          description: 'Not selected',
          order: 8,
          color: '#EF4444',
          isTerminal: true,
          actions: ['send_rejection']
        }
      ]),
      createdBy: admin.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: engineeringWorkspace.id,
      name: 'Executive Search',
      description: 'Comprehensive process for executive-level positions',
      category: 'executive',
      isDefault: false,
      stages: JSON.stringify([
        {
          id: uuidv4(),
          name: 'Sourced',
          slug: 'sourced',
          type: 'initial',
          description: 'Candidate identified and sourced',
          order: 1,
          color: '#3B82F6',
          isRequired: true,
          actions: ['reach_out', 'review']
        },
        {
          id: uuidv4(),
          name: 'Initial Contact',
          slug: 'initial_contact',
          type: 'screening',
          description: 'First outreach and interest check',
          order: 2,
          color: '#8B5CF6',
          durationDays: 5,
          actions: ['email', 'call', 'follow_up']
        },
        {
          id: uuidv4(),
          name: 'Exploratory Call',
          slug: 'exploratory',
          type: 'interview',
          description: 'Discuss opportunity and fit',
          order: 3,
          color: '#10B981',
          durationDays: 7,
          requiresScheduling: true,
          interviewType: 'phone',
          durationMinutes: 45,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Deep Dive Interview',
          slug: 'deep_dive',
          type: 'interview',
          description: 'Comprehensive discussion of background',
          order: 4,
          color: '#F59E0B',
          durationDays: 10,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 120,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Executive Panel',
          slug: 'executive_panel',
          type: 'interview',
          description: 'Interview with executive team',
          order: 5,
          color: '#EC4899',
          durationDays: 14,
          requiresScheduling: true,
          interviewType: 'onsite',
          durationMinutes: 180,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Board Meeting',
          slug: 'board_meeting',
          type: 'interview',
          description: 'Present to board members',
          order: 6,
          color: '#8B5CF6',
          durationDays: 14,
          requiresScheduling: true,
          interviewType: 'onsite',
          durationMinutes: 90,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Background Check',
          slug: 'background_check',
          type: 'background',
          description: 'Comprehensive background verification',
          order: 7,
          color: '#14B8A6',
          durationDays: 10,
          actions: ['initiate', 'review', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Reference Check',
          slug: 'reference_check',
          type: 'background',
          description: 'Executive reference verification',
          order: 8,
          color: '#06B6D4',
          durationDays: 7,
          actions: ['request', 'contact', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Offer Preparation',
          slug: 'offer_prep',
          type: 'offer',
          description: 'Prepare compensation package',
          order: 9,
          color: '#10B981',
          durationDays: 5,
          actions: ['prepare', 'review', 'approve']
        },
        {
          id: uuidv4(),
          name: 'Offer Extended',
          slug: 'offer_extended',
          type: 'offer',
          description: 'Present offer to candidate',
          order: 10,
          color: '#059669',
          durationDays: 3,
          actions: ['present', 'negotiate']
        },
        {
          id: uuidv4(),
          name: 'Hired',
          slug: 'hired',
          type: 'final',
          description: 'Offer accepted',
          order: 11,
          color: '#047857',
          isTerminal: true,
          actions: ['onboard']
        },
        {
          id: uuidv4(),
          name: 'Withdrawn',
          slug: 'withdrawn',
          type: 'final',
          description: 'Candidate or company withdrew',
          order: 12,
          color: '#EF4444',
          isTerminal: true,
          actions: []
        }
      ]),
      createdBy: admin.id
    },
    {
      id: uuidv4(),
      organizationId: org1.id,
      workspaceId: engineeringWorkspace.id,
      name: 'Internship Program',
      description: 'Simplified process for intern positions',
      category: 'internship',
      isDefault: false,
      stages: JSON.stringify([
        {
          id: uuidv4(),
          name: 'Applied',
          slug: 'applied',
          type: 'initial',
          description: 'Application received',
          order: 1,
          color: '#3B82F6',
          isRequired: true,
          actions: ['review']
        },
        {
          id: uuidv4(),
          name: 'Screening',
          slug: 'screening',
          type: 'screening',
          description: 'Review application materials',
          order: 2,
          color: '#8B5CF6',
          durationDays: 3,
          actions: ['approve', 'reject']
        },
        {
          id: uuidv4(),
          name: 'Video Interview',
          slug: 'video_interview',
          type: 'interview',
          description: 'Virtual interview',
          order: 3,
          color: '#10B981',
          durationDays: 5,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 30,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Skills Assessment',
          slug: 'skills_assessment',
          type: 'assessment',
          description: 'Basic skills evaluation',
          order: 4,
          color: '#F59E0B',
          durationDays: 3,
          actions: ['send', 'review']
        },
        {
          id: uuidv4(),
          name: 'Team Meeting',
          slug: 'team_meeting',
          type: 'interview',
          description: 'Meet the team',
          order: 5,
          color: '#EC4899',
          durationDays: 5,
          requiresScheduling: true,
          interviewType: 'video',
          durationMinutes: 45,
          actions: ['schedule', 'complete']
        },
        {
          id: uuidv4(),
          name: 'Offer',
          slug: 'offer',
          type: 'offer',
          description: 'Internship offer',
          order: 6,
          color: '#10B981',
          durationDays: 2,
          actions: ['send_offer']
        },
        {
          id: uuidv4(),
          name: 'Accepted',
          slug: 'accepted',
          type: 'final',
          description: 'Internship accepted',
          order: 7,
          color: '#059669',
          isTerminal: true,
          actions: ['onboard']
        },
        {
          id: uuidv4(),
          name: 'Declined',
          slug: 'declined',
          type: 'final',
          description: 'Not selected or declined',
          order: 8,
          color: '#EF4444',
          isTerminal: true,
          actions: []
        }
      ]),
      createdBy: admin.id
    }
  ];

  for (const template of flowTemplates) {
    await client.query(
      `INSERT INTO flow_templates (
        id, organization_id, workspace_id, name, description, category, is_default, stages,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        template.id, template.organizationId, template.workspaceId, template.name, template.description,
        template.category, template.isDefault, template.stages, template.createdBy
      ]
    );
    const workspace = workspaces.find(w => w.id === template.workspaceId);
    console.log(`  ✓ Created flow template: ${template.name} (${workspace.name}, ${JSON.parse(template.stages).length} stages)`);
  }

  console.log('');
  return flowTemplates;
}

/**
 * Create demo interviews
 */
async function createInterviews(client, applications, users) {
  console.log('🎤 Creating demo interviews...\n');

  const recruiter = users.find(u => u.email === 'recruiter@demo.com');

  // Get applications in interview stage
  const interviewApps = applications.filter(a => a.stage === 'interview' || a.stage === 'assessment');

  const interviews = [];

  for (const app of interviewApps.slice(0, 2)) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 3); // 3 days from now

    const interview = {
      id: uuidv4(),
      applicationId: app.id,
      title: 'Technical Interview',
      type: 'video',
      status: 'scheduled',
      scheduledAt: scheduledDate,
      durationMinutes: 60,
      meetingLink: 'https://zoom.us/j/123456789',
      notes: 'Focus on technical skills and problem-solving',
      createdBy: recruiter.id
    };

    await client.query(
      `INSERT INTO interviews (
        id, application_id, title, type, status, scheduled_at, duration_minutes,
        meeting_link, notes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        interview.id, interview.applicationId, interview.title, interview.type,
        interview.status, interview.scheduledAt, interview.durationMinutes,
        interview.meetingLink, interview.notes, interview.createdBy
      ]
    );

    interviews.push(interview);
    console.log(`  ✓ Created interview: ${interview.title} (${interview.status})`);
  }

  console.log('');
  return interviews;
}

/**
 * Main seeding function
 */
async function seedDemoData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting demo data seeding...');
    console.log('━'.repeat(60));

    await client.query('BEGIN');

    // Clear existing demo data
    await clearDemoData(client);

    // Ensure roles exist
    const roles = await ensurePermissionsAndRoles(client);

    // Create demo data
    const organizations = await createOrganizations(client);
    const users = await createUsers(client, organizations, roles);
    const workspaces = await createWorkspaces(client, organizations, users);
    const flowTemplates = await createFlowTemplates(client, organizations, users, workspaces);
    const jobs = await createJobs(client, organizations, workspaces, users, flowTemplates);
    const candidates = await createCandidates(client, organizations, users);
    const applications = await createApplications(client, jobs, candidates, organizations, workspaces, flowTemplates);
    const interviews = await createInterviews(client, applications, users);

    await client.query('COMMIT');

    console.log('━'.repeat(60));
    console.log('✅ Demo data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Users: ${users.length}`);
    console.log(`  Workspaces: ${workspaces.length}`);
    console.log(`  Flow Templates: ${flowTemplates.length}`);
    console.log(`  Jobs: ${jobs.length}`);
    console.log(`  Candidates: ${candidates.length}`);
    console.log(`  Applications: ${applications.length}`);
    console.log(`  Interviews: ${interviews.length}`);
    console.log('\n🔐 Demo User Credentials:');
    console.log('  admin@demo.com / Demo123!');
    console.log('  recruiter@demo.com / Demo123!');
    console.log('  manager@demo.com / Demo123!');
    console.log('  admin2@demo.com / Demo123!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run the script
 */
async function main() {
  try {
    await seedDemoData();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { seedDemoData };
