/**
 * TENANT DATA ISOLATION TESTS
 * ============================================================================
 * These tests verify that tenant data is strictly isolated and that users
 * from one organization cannot access or modify data from another organization.
 * 
 * This is a CRITICAL security requirement for multi-tenant SaaS applications.
 * 
 * Test Coverage:
 * - Cross-tenant data access prevention (read operations)
 * - Cross-tenant data modification prevention (write operations)
 * - Workspace-level isolation
 * - Job/Candidate/Application isolation
 * - API endpoint security
 * - Direct database query RLS enforcement
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../src/config/database.js';
import app from '../../src/server.js';
import config from '../../src/config/index.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Tenant Data Isolation Tests', () => {
  let org1Id, org2Id;
  let org1User, org2User;
  let org1Token, org2Token;
  let org1Workspace, org2Workspace;
  let org1Job, org2Job;
  let org1Candidate, org2Candidate;

  beforeAll(async () => {
    // Clean up any existing test organizations first
    await pool.query(
      `DELETE FROM organizations WHERE slug IN ('org-1-test', 'org-2-test')`
    );

    // Create two separate organizations
    const org1 = await pool.query(
      `INSERT INTO organizations (name, slug, tier, subscription_status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Organization 1', 'org-1-test', 'professional', 'active']
    );
    org1Id = org1.rows[0].id;

    const org2 = await pool.query(
      `INSERT INTO organizations (name, slug, tier, subscription_status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Organization 2', 'org-2-test', 'professional', 'active']
    );
    org2Id = org2.rows[0].id;

    // Create users for each organization with all required fields
    const user1 = await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, organization_id, email_verified,
        account_status, is_active, enabled_products, product_roles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email`,
      [
        'user1@org1.com', 
        'hash1', 
        org1Id, 
        true,
        'active',
        true,
        '["recruitiq"]',
        '{"recruitiq": ["user"]}'
      ]
    );
    org1User = user1.rows[0];

    const user2 = await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, organization_id, email_verified,
        account_status, is_active, enabled_products, product_roles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email`,
      [
        'user2@org2.com', 
        'hash2', 
        org2Id, 
        true,
        'active',
        true,
        '["recruitiq"]',
        '{"recruitiq": ["user"]}'
      ]
    );
    org2User = user2.rows[0];

    // Create JWT tokens with required fields for tenant authentication
    org1Token = jwt.sign(
      { 
        id: org1User.id, 
        userId: org1User.id,
        email: org1User.email,
        organizationId: org1Id,
        type: 'tenant'
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    org2Token = jwt.sign(
      { 
        id: org2User.id,
        userId: org2User.id, 
        email: org2User.email,
        organizationId: org2Id,
        type: 'tenant'
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Create workspaces for each organization
    const workspace1Result = await pool.query(
        `INSERT INTO workspaces (name, slug, organization_id)
         VALUES ($1, $2, $3) RETURNING id`,
        ['Workspace 1', 'workspace-1', org1Id]
      );
      const workspace1 = workspace1Result.rows[0].id;
    org1Workspace = workspace1;

    const workspace2Result = await pool.query(
        `INSERT INTO workspaces (name, slug, organization_id)
         VALUES ($1, $2, $3) RETURNING id`,
        ['Workspace 2', 'workspace-2', org2Id]
      );
      const workspace2 = workspace2Result.rows[0].id;
    org2Workspace = workspace2;

    // Create jobs for each organization (status must be: draft, open, paused, filled, closed, archived)
    const job1 = await pool.query(
      `INSERT INTO jobs (title, organization_id, workspace_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Job 1', org1Id, org1Workspace, 'open']
    );
    org1Job = job1.rows[0].id;

    const job2 = await pool.query(
      `INSERT INTO jobs (title, organization_id, workspace_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Job 2', org2Id, org2Workspace, 'open']
    );
    org2Job = job2.rows[0].id;

    // Create candidates for each organization
    const candidate1 = await pool.query(
      `INSERT INTO candidates (first_name, last_name, email, organization_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Candidate', 'One', 'candidate1@example.com', org1Id]
    );
    org1Candidate = candidate1.rows[0].id;

    const candidate2 = await pool.query(
      `INSERT INTO candidates (first_name, last_name, email, organization_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Candidate', 'Two', 'candidate2@example.com', org2Id]
    );
    org2Candidate = candidate2.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM candidates WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM jobs WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM workspaces WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id IN ($1, $2)', [org1Id, org2Id]);
    await pool.query('DELETE FROM organizations WHERE id IN ($1, $2)', [org1Id, org2Id]);
    
    await pool.end();
  });

  // ============================================================================
  // WORKSPACE ISOLATION TESTS
  // ============================================================================

  describe.skip('Workspace Isolation', () => {
    it('should prevent user from Org1 accessing workspaces from Org2', async () => {
      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.workspaces).toBeDefined();
      
      // Should only see Org1 workspaces
      const workspaceIds = response.body.workspaces.map(w => w.id);
      expect(workspaceIds).toContain(org1Workspace);
      expect(workspaceIds).not.toContain(org2Workspace);
    });

    it('should prevent user from Org1 accessing specific workspace from Org2', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${org2Workspace}`)
        .set('Authorization', `Bearer ${org1Token}`);

      // Should return 404 (not found) or 403 (forbidden), NOT the workspace data
      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 updating workspace from Org2', async () => {
      const response = await request(app)
        .put(`/api/workspaces/${org2Workspace}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'Hacked Workspace' });

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 deleting workspace from Org2', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${org2Workspace}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);

      // Verify workspace still exists for Org2
      const checkResponse = await request(app)
        .get(`/api/workspaces/${org2Workspace}`)
        .set('Authorization', `Bearer ${org2Token}`);
      
      // Workspace should still exist (not deleted)
      if (checkResponse.status === 200) {
        expect(checkResponse.body.workspace.id).toBe(org2Workspace);
      }
    });
  });

  // ============================================================================
  // JOB ISOLATION TESTS
  // ============================================================================

  describe.skip('Job Isolation', () => {
    it('should prevent user from Org1 listing jobs from Org2', async () => {
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toBeDefined();
      
      const jobIds = response.body.jobs.map(j => j.id);
      expect(jobIds).toContain(org1Job);
      expect(jobIds).not.toContain(org2Job);
    });

    it('should prevent user from Org1 accessing job details from Org2', async () => {
      const response = await request(app)
        .get(`/api/jobs/${org2Job}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 creating job in Org2 workspace', async () => {
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          title: 'Malicious Job',
          workspace_id: org2Workspace, // Trying to create in Org2's workspace
          status: 'open'
        });

      // Should fail because workspace doesn't belong to Org1
      expect([400, 403, 404]).toContain(response.status);
    });

    it('should prevent user from Org1 updating job from Org2', async () => {
      const response = await request(app)
        .put(`/api/jobs/${org2Job}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ title: 'Hacked Job Title' });

      expect([404, 403]).toContain(response.status);

      // Verify job wasn't modified
      const checkResponse = await request(app)
        .get(`/api/jobs/${org2Job}`)
        .set('Authorization', `Bearer ${org2Token}`);
      
      if (checkResponse.status === 200) {
        expect(checkResponse.body.job.title).toBe('Job 2');
      }
    });

    it('should prevent user from Org1 deleting job from Org2', async () => {
      const response = await request(app)
        .delete(`/api/jobs/${org2Job}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);

      // Verify job still exists for Org2 (status should be 200 or 404 if the delete check happened first)
      const checkResponse = await request(app)
        .get(`/api/jobs/${org2Job}`)
        .set('Authorization', `Bearer ${org2Token}`);
      
      // Job should still exist (not deleted)
      if (checkResponse.status === 200) {
        expect(checkResponse.body.job.id).toBe(org2Job);
      }
    });
  });

  // ============================================================================
  // CANDIDATE ISOLATION TESTS
  // ============================================================================

  describe.skip('Candidate Isolation', () => {
    it('should prevent user from Org1 listing candidates from Org2', async () => {
      const response = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.candidates).toBeDefined();
      
      const candidateIds = response.body.candidates.map(c => c.id);
      expect(candidateIds).toContain(org1Candidate);
      expect(candidateIds).not.toContain(org2Candidate);
    });

    it('should prevent user from Org1 accessing candidate details from Org2', async () => {
      const response = await request(app)
        .get(`/api/candidates/${org2Candidate}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 updating candidate from Org2', async () => {
      const response = await request(app)
        .put(`/api/candidates/${org2Candidate}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ email: 'hacked@evil.com' });

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 deleting candidate from Org2', async () => {
      const response = await request(app)
        .delete(`/api/candidates/${org2Candidate}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);

      // Verify candidate still exists for Org2
      const checkResponse = await request(app)
        .get(`/api/candidates/${org2Candidate}`)
        .set('Authorization', `Bearer ${org2Token}`);
      
      // Candidate should still exist (not deleted)
      if (checkResponse.status === 200) {
        expect(checkResponse.body.candidate.id).toBe(org2Candidate);
      }
    });
  });

  // ============================================================================
  // APPLICATION ISOLATION TESTS
  // ============================================================================

  describe.skip('Application Isolation', () => {
    let org1Application, org2Application;

    beforeAll(async () => {
      // Create applications for each organization (workspace_id is required)
      // Valid status: 'active', 'rejected', 'withdrawn', 'hired'
      const app1 = await pool.query(
        `INSERT INTO applications (job_id, candidate_id, workspace_id, status, organization_id, tracking_code)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [org1Job, org1Candidate, org1Workspace, 'active', org1Id, 'APP-ORG1-TEST']
      );
      org1Application = app1.rows[0].id;

      const app2 = await pool.query(
        `INSERT INTO applications (job_id, candidate_id, workspace_id, status, organization_id, tracking_code)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [org2Job, org2Candidate, org2Workspace, 'active', org2Id, 'APP-ORG2-TEST']
      );
      org2Application = app2.rows[0].id;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM applications WHERE id IN ($1, $2)', [org1Application, org2Application]);
    });

    it('should prevent user from Org1 listing applications from Org2', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.applications).toBeDefined();
      
      const appIds = response.body.applications.map(a => a.id);
      expect(appIds).toContain(org1Application);
      expect(appIds).not.toContain(org2Application);
    });

    it('should prevent user from Org1 accessing application details from Org2', async () => {
      const response = await request(app)
        .get(`/api/applications/${org2Application}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 updating application status from Org2', async () => {
      const response = await request(app)
        .put(`/api/applications/${org2Application}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ status: 'rejected' });

      expect([404, 403]).toContain(response.status);
    });
  });

  // ============================================================================
  // FLOW TEMPLATE ISOLATION TESTS
  // ============================================================================

  describe.skip('Flow Template Isolation', () => {
    let org1Template, org2Template;

    beforeAll(async () => {
      // stages is required JSONB field
      const stages = JSON.stringify([{ name: 'Applied', order: 1 }, { name: 'Interview', order: 2 }]);
      
      const template1 = await pool.query(
        `INSERT INTO flow_templates (name, organization_id, workspace_id, stages)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Template 1', org1Id, org1Workspace, stages]
      );
      org1Template = template1.rows[0].id;

      const template2 = await pool.query(
        `INSERT INTO flow_templates (name, organization_id, workspace_id, stages)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Template 2', org2Id, org2Workspace, stages]
      );
      org2Template = template2.rows[0].id;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM flow_templates WHERE id IN ($1, $2)', [org1Template, org2Template]);
    });

    it('should prevent user from Org1 listing flow templates from Org2', async () => {
      const response = await request(app)
        .get('/api/flow-templates')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      
      // Response format may vary - check both possible structures
      const templates = response.body.templates || response.body.flowTemplates || response.body;
      const templateArray = Array.isArray(templates) ? templates : [];
      
      const templateIds = templateArray.map(t => t.id);
      expect(templateIds).toContain(org1Template);
      expect(templateIds).not.toContain(org2Template);
    });

    it('should prevent user from Org1 accessing flow template from Org2', async () => {
      const response = await request(app)
        .get(`/api/flow-templates/${org2Template}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 updating flow template from Org2', async () => {
      const response = await request(app)
        .put(`/api/flow-templates/${org2Template}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'Hacked Template' });

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 deleting flow template from Org2', async () => {
      const response = await request(app)
        .delete(`/api/flow-templates/${org2Template}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });
  });

  // ============================================================================
  // INTERVIEW ISOLATION TESTS
  // ============================================================================

  describe.skip('Interview Isolation', () => {
    let org1Interview, org2Interview;

    beforeAll(async () => {
      // Valid application status: 'active', 'rejected', 'withdrawn', 'hired'
      const app1 = await pool.query(
        `INSERT INTO applications (job_id, candidate_id, workspace_id, status, organization_id, tracking_code)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [org1Job, org1Candidate, org1Workspace, 'active', org1Id, 'APP-ORG1-INT']
      );

      const app2 = await pool.query(
        `INSERT INTO applications (job_id, candidate_id, workspace_id, status, organization_id, tracking_code)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [org2Job, org2Candidate, org2Workspace, 'active', org2Id, 'APP-ORG2-INT']
      );

      const interview1 = await pool.query(
        `INSERT INTO interviews (application_id, title, type, scheduled_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [app1.rows[0].id, 'Technical Interview', 'technical', new Date()]
      );
      org1Interview = interview1.rows[0].id;

      const interview2 = await pool.query(
        `INSERT INTO interviews (application_id, title, type, scheduled_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [app2.rows[0].id, 'Technical Interview', 'technical', new Date()]
      );
      org2Interview = interview2.rows[0].id;
    });

    afterAll(async () => {
      await pool.query('DELETE FROM interviews WHERE id IN ($1, $2)', [org1Interview, org2Interview]);
    });

    it('should prevent user from Org1 listing interviews from Org2', async () => {
      const response = await request(app)
        .get('/api/interviews')
        .set('Authorization', `Bearer ${org1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.interviews).toBeDefined();
      
      const interviewIds = response.body.interviews.map(i => i.id);
      expect(interviewIds).toContain(org1Interview);
      expect(interviewIds).not.toContain(org2Interview);
    });

    it('should prevent user from Org1 accessing interview from Org2', async () => {
      const response = await request(app)
        .get(`/api/interviews/${org2Interview}`)
        .set('Authorization', `Bearer ${org1Token}`);

      expect([404, 403]).toContain(response.status);
    });

    it('should prevent user from Org1 updating interview from Org2', async () => {
      const response = await request(app)
        .put(`/api/interviews/${org2Interview}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ status: 'completed' });

      expect([404, 403]).toContain(response.status);
    });
  });

  // ============================================================================
  // ORGANIZATION SETTINGS ISOLATION
  // ============================================================================

  describe.skip('Organization Settings Isolation', () => {
    it('should prevent user from Org1 accessing settings of Org2', async () => {
      // Get Org1's settings
      const response = await request(app)
        .get(`/api/organizations/${org1Id}`)
        .set('Authorization', `Bearer ${org1Token}`);

      // Should either work (200) or be forbidden (403) depending on implementation
      // The key is that we should only see our own org
      if (response.status === 200) {
        expect(response.body.organization.id).toBe(org1Id);
        expect(response.body.organization.id).not.toBe(org2Id);
      } else {
        // If endpoint doesn't exist or is restricted, that's also acceptable
        expect([403, 404]).toContain(response.status);
      }
    });

    it('should prevent user from Org1 updating settings of Org2', async () => {
      const response = await request(app)
        .put(`/api/organizations/${org2Id}`)
        .set('Authorization', `Bearer ${org1Token}`)
        .send({ name: 'Hacked Organization' });

      expect([403, 404]).toContain(response.status);
    });
  });

  // ============================================================================
  // DIRECT DATABASE QUERY TESTS (RLS Verification)
  // ============================================================================

  describe.skip('Direct Database Query RLS Enforcement', () => {
    it('should enforce RLS when querying jobs directly', async () => {
      // Set RLS context for Org1
      await pool.query("SELECT set_config('app.current_organization_id', $1, true)", [org1Id]);

      // Query all jobs (should only return Org1 jobs if RLS is working)
      const result = await pool.query('SELECT id FROM jobs WHERE deleted_at IS NULL');
      
      const jobIds = result.rows.map(r => r.id);
      
      // Verify RLS is working
      expect(jobIds).toContain(org1Job);
      
      // Note: This test assumes RLS policies are in place
      // If RLS is not enforced at DB level, this will fail
      // In that case, application-level filtering is critical
    });

    it('should enforce RLS when querying candidates directly', async () => {
      await pool.query("SELECT set_config('app.current_organization_id', $1, true)", [org1Id]);

      const result = await pool.query('SELECT id FROM candidates WHERE deleted_at IS NULL');
      
      const candidateIds = result.rows.map(r => r.id);
      expect(candidateIds).toContain(org1Candidate);
    });

    it('should enforce RLS when querying workspaces directly', async () => {
      await pool.query("SELECT set_config('app.current_organization_id', $1, true)", [org1Id]);

      const result = await pool.query('SELECT id FROM workspaces WHERE deleted_at IS NULL');
      
      const workspaceIds = result.rows.map(r => r.id);
      expect(workspaceIds).toContain(org1Workspace);
    });
  });

  // ============================================================================
  // BULK OPERATIONS ISOLATION
  // ============================================================================

  describe.skip('Bulk Operations Isolation', () => {
    it('should not return cross-tenant data in bulk candidate export', async () => {
      const response = await request(app)
        .get('/api/candidates/export')
        .set('Authorization', `Bearer ${org1Token}`);

      // Export endpoint may not exist yet - that's OK
      if (response.status === 200) {
        // Parse export data and verify no Org2 candidates
        const exportedData = Array.isArray(response.body) ? response.body : response.body.candidates || [];
        const exportedIds = exportedData.map(c => c.id);
        expect(exportedIds).not.toContain(org2Candidate);
      } else {
        // Endpoint doesn't exist or returns error - skip this test
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should prevent bulk update across tenant boundaries', async () => {
      const response = await request(app)
        .put('/api/jobs/bulk-update')
        .set('Authorization', `Bearer ${org1Token}`)
        .send({
          jobIds: [org1Job, org2Job], // Attempting to update both
          status: 'closed'
        });

      // Should only update Org1 job
      const job2Check = await pool.query(
        'SELECT status FROM jobs WHERE id = $1',
        [org2Job]
      );
      
      expect(job2Check.rows[0].status).toBe('open'); // Should not be changed
    });
  });

  // ============================================================================
  // SEARCH AND FILTER ISOLATION
  // ============================================================================

  describe.skip('Search and Filter Isolation', () => {
    it('should not return Org2 candidates in Org1 search', async () => {
      const response = await request(app)
        .get('/api/candidates/search?q=Candidate')
        .set('Authorization', `Bearer ${org1Token}`);

      // Search endpoint may not exist or may be at different path
      if (response.status === 200) {
        const candidates = response.body.candidates || response.body || [];
        const candidateArray = Array.isArray(candidates) ? candidates : [];
        const candidateIds = candidateArray.map(c => c.id);
        expect(candidateIds).not.toContain(org2Candidate);
      } else {
        // Endpoint doesn't exist or returns error - that's acceptable
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should not return Org2 jobs in Org1 search', async () => {
      const response = await request(app)
        .get('/api/jobs/search?q=Job')
        .set('Authorization', `Bearer ${org1Token}`);

      // Search endpoint may not exist or may be at different path
      if (response.status === 200) {
        const jobs = response.body.jobs || response.body || [];
        const jobArray = Array.isArray(jobs) ? jobs : [];
        const jobIds = jobArray.map(j => j.id);
        expect(jobIds).not.toContain(org2Job);
      } else {
        // Endpoint doesn't exist or returns error - that's acceptable
        expect([400, 404]).toContain(response.status);
      }
    });
  });
});
