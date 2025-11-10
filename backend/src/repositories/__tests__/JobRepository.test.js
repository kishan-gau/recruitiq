/**
 * JobRepository Unit Tests
 * Tests data access layer for jobs
 * Target Coverage: 85% minimum
 * 
 * Industry Standards:
 * - Uses DTO mapper for data transformation
 * - Test Data Factory pattern for isolation
 * - AAA (Arrange-Act-Assert) pattern
 * - Proper cleanup and resource management
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import pool from '../../config/database.js';
import { JobRepository } from '../JobRepository.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Data Factory for Jobs
 * Creates and manages test data with proper cleanup
 */
class JobTestFactory {
  static createdIds = [];

  /**
   * Create a test Job
   * @param {Object} overrides - Override default values
   * @returns {Promise<Object>} Created job record
   */
  static async createJob(overrides = {}) {
    const defaultData = {
      id: uuidv4(),
      organization_id: overrides.organization_id || global.testOrganizationId,
      workspace_id: overrides.workspace_id || global.testWorkspaceId,
      title: 'Test Software Engineer',
      description: 'We are looking for a talented software engineer to join our team',
      department: 'Engineering',
      location: 'Remote',
      employment_type: 'full-time',
      experience_level: 'mid',
      status: 'draft',
      salary_min: 80000,
      salary_max: 120000,
      is_public: false,
      public_slug: `test-job-${Date.now()}`,
      ...overrides
    };

    const result = await pool.query(
      `INSERT INTO jobs (
        id, organization_id, workspace_id, title, description, department,
        location, employment_type, experience_level, status, salary_min,
        salary_max, is_public, public_slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        defaultData.id,
        defaultData.organization_id,
        defaultData.workspace_id,
        defaultData.title,
        defaultData.description,
        defaultData.department,
        defaultData.location,
        defaultData.employment_type,
        defaultData.experience_level,
        defaultData.status,
        defaultData.salary_min,
        defaultData.salary_max,
        defaultData.is_public,
        defaultData.public_slug
      ]
    );

    const created = result.rows[0];
    this.createdIds.push(created.id);
    return created;
  }

  /**
   * Clean up all test data created by this factory
   */
  static async cleanup() {
    if (this.createdIds.length > 0) {
      await pool.query(
        `DELETE FROM jobs WHERE id = ANY($1)`,
        [this.createdIds]
      );
      this.createdIds = [];
    }
  }

  /**
   * Reset factory state
   */
  static reset() {
    this.createdIds = [];
  }
}

describe('JobRepository', () => {
  let repository;
  let testOrganizationId;
  let testOrganization2Id;
  let testWorkspaceId;
  let testWorkspace2Id;

  // Setup test organizations and workspaces
  beforeAll(async () => {
    // Create test organization 1
    const org1 = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier, subscription_status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [uuidv4(), 'Test Org 1', `test-org-1-${Date.now()}`, 'professional', 'active']
    );
    testOrganizationId = org1.rows[0].id;
    global.testOrganizationId = testOrganizationId;

    // Create test organization 2 (for tenant isolation tests)
    const org2 = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier, subscription_status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [uuidv4(), 'Test Org 2', `test-org-2-${Date.now()}`, 'professional', 'active']
    );
    testOrganization2Id = org2.rows[0].id;

    // Create test workspace 1
    const ws1 = await pool.query(
      `INSERT INTO workspaces (id, name, organization_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [uuidv4(), 'Test Workspace 1', testOrganizationId]
    );
    testWorkspaceId = ws1.rows[0].id;
    global.testWorkspaceId = testWorkspaceId;

    // Create test workspace 2
    const ws2 = await pool.query(
      `INSERT INTO workspaces (id, name, organization_id)
       VALUES ($1, $2, $3) RETURNING id`,
      [uuidv4(), 'Test Workspace 2', testOrganization2Id]
    );
    testWorkspace2Id = ws2.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    await JobTestFactory.cleanup();
    
    // Delete test workspaces
    await pool.query('DELETE FROM workspaces WHERE id = ANY($1)', 
      [[testWorkspaceId, testWorkspace2Id]]
    );
    
    // Delete test organizations
    await pool.query('DELETE FROM organizations WHERE id = ANY($1)', 
      [[testOrganizationId, testOrganization2Id]]
    );
  });

  beforeEach(() => {
    // Create fresh repository instance for each test
    repository = new JobRepository();
  });

  afterEach(() => {
    // Reset factory state after each test
    JobTestFactory.reset();
  });

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  describe('create', () => {
    it('should create a job with valid data', async () => {
      // Arrange
      const jobData = {
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Senior Software Engineer',
        description: 'Join our team to build amazing products',
        department: 'Engineering',
        location: 'San Francisco, CA',
        employment_type: 'full-time',
        experience_level: 'senior',
        status: 'draft',
        salary_min: 120000,
        salary_max: 180000
      };

      // Act - Repository now returns DTO automatically
      const result = await repository.create(jobData, testOrganizationId);

      // Assert - Result is already in DTO format (camelCase)
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Senior Software Engineer');
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.workspaceId).toBe(testWorkspaceId);
      expect(result.employmentType).toBe('full-time');

      // Verify in database (raw DB check)
      const dbCheck = await pool.query(
        'SELECT * FROM jobs WHERE id = $1',
        [result.id]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].title).toBe('Senior Software Engineer');

      // Cleanup
      await pool.query('DELETE FROM jobs WHERE id = $1', [result.id]);
    });

    it('should set default values correctly', async () => {
      // Arrange
      const minimalJobData = {
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Minimal Job',
        description: 'Minimal job description'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(minimalJobData, testOrganizationId);

      // Assert - Using DTO mapped fields (camelCase)
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.isPublic).toBe(false);
      expect(result.status).toBe('draft');

      // Cleanup
      await pool.query('DELETE FROM jobs WHERE id = $1', [result.id]);
    });

    it('should generate UUID if not provided', async () => {
      // Arrange
      const jobData = {
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Job Without ID',
        description: 'Testing UUID generation'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(jobData, testOrganizationId);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Cleanup
      await pool.query('DELETE FROM jobs WHERE id = $1', [result.id]);
    });

    it('should enforce organization_id constraint', async () => {
      // Arrange
      const jobData = {
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Test Job',
        description: 'Testing organization constraint'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(jobData, testOrganizationId);

      // Assert - organizationId should match (DTO format)
      expect(result.organizationId).toBe(testOrganizationId);

      // Cleanup
      await pool.query('DELETE FROM jobs WHERE id = $1', [result.id]);
    });
  });

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  describe('findById', () => {
    it('should find job by id', async () => {
      // Arrange
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Findable Job'
      });

      // Act (repository already returns DTOs)
      const result = await repository.findById(testJob.id, testOrganizationId);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testJob.id);
      expect(result.title).toBe('Findable Job');
      expect(result.organizationId).toBe(testOrganizationId);
    });

    it('should return null for non-existent id', async () => {
      // Arrange
      const nonExistentId = uuidv4();

      // Act
      const result = await repository.findById(nonExistentId, testOrganizationId);

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange - Create job in org1
      const org1Job = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId
      });

      // Act - Try to access with org2 credentials
      const result = await repository.findById(org1Job.id, testOrganization2Id);

      // Assert - Should return null (tenant isolation)
      expect(result).toBeNull();
    });

    it('should not return soft-deleted records', async () => {
      // Arrange
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId
      });

      // Soft delete
      await pool.query(
        'UPDATE jobs SET deleted_at = NOW() WHERE id = $1',
        [testJob.id]
      );

      // Act
      const result = await repository.findById(testJob.id, testOrganizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithStats', () => {
    it('should find job with application statistics', async () => {
      // Arrange
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Job With Stats'
      });

      // Act (repository already returns DTOs with specialized mapping)
      const result = await repository.findByIdWithStats(testJob.id, testOrganizationId);

      // Assert - Using specialized DTO mapper
      expect(result).toBeDefined();
      expect(result.id).toBe(testJob.id);
      expect(result.applicationCount).toBeDefined();
      expect(typeof result.applicationCount).toBe('number');
      expect(result.applicationCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findBySlug', () => {
    it('should find published job by slug', async () => {
      // Arrange
      const uniqueSlug = `senior-dev-${Date.now()}`;
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        public_slug: uniqueSlug,
        is_public: true,
        status: 'open'
      });

      // Act (repository already returns DTOs)
      const result = await repository.findBySlug(uniqueSlug);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testJob.id);
      expect(result.publicSlug).toBe(uniqueSlug);
    });

    it('should return null for non-public jobs', async () => {
      // Arrange
      const uniqueSlug = `draft-job-${Date.now()}`;
      await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        public_slug: uniqueSlug,
        is_public: false,
        status: 'draft'
      });

      // Act
      const result = await repository.findBySlug(uniqueSlug);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create test jobs for search
      await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Frontend Developer',
        status: 'open'
      });
      await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Backend Developer',
        status: 'open'
      });
    });

    it('should search jobs with text query', async () => {
      // Act (repository already returns DTOs in jobs array)
      const result = await repository.search(
        { search: 'Developer' },
        testOrganizationId
      );

      // Assert - Using DTO mapped results
      expect(result.jobs).toBeDefined();
      expect(Array.isArray(result.jobs)).toBe(true);
      expect(result.jobs.length).toBeGreaterThanOrEqual(2);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      // Act (repository already returns DTOs)
      const result = await repository.search(
        { status: 'open' },
        testOrganizationId
      );

      // Assert - Using DTO format
      expect(result.jobs).toBeDefined();
      expect(result.jobs.every(job => job.status === 'open')).toBe(true);
    });

    it('should enforce tenant isolation in search', async () => {
      // Arrange - Create a unique job in org2
      const org2Job = await JobTestFactory.createJob({
        organization_id: testOrganization2Id,
        workspace_id: testWorkspace2Id,
        title: `Org2 Isolated Job ${Date.now()}`
      });

      // Act - Search in org1 (repository already returns DTOs)
      const org1Result = await repository.search({}, testOrganizationId);
      
      // Act - Search in org2
      const org2Result = await repository.search({}, testOrganization2Id);

      // Assert - Org1 should NOT see org2's job
      expect(org1Result.jobs.some(job => job.id === org2Job.id)).toBe(false);
      
      // Assert - Org2 should see its own job
      expect(org2Result.jobs.some(job => job.id === org2Job.id)).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  describe('update', () => {
    it('should update job with valid data', async () => {
      // Arrange
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        title: 'Original Title',
        salary_min: 80000
      });

      const updateData = {
        title: 'Updated Title',
        salary_max: 150000
      };

      // Act (repository already returns DTOs)
      const result = await repository.update(
        testJob.id,
        updateData,
        testOrganizationId
      );

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testJob.id);
      expect(result.title).toBe('Updated Title');
      expect(result.salaryMax).toBe(150000);
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(testJob.updated_at).getTime());

      // Verify in database
      const dbCheck = await pool.query(
        'SELECT * FROM jobs WHERE id = $1',
        [testJob.id]
      );
      expect(dbCheck.rows[0].title).toBe('Updated Title');
    });

    it('should enforce tenant isolation on update', async () => {
      // Arrange
      const org1Job = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId
      });

      // Act - Try to update with org2 credentials
      const result = await repository.update(
        org1Job.id,
        { title: 'Hacked Title' },
        testOrganization2Id
      );

      // Assert
      expect(result).toBeNull();

      // Verify not updated
      const dbCheck = await pool.query(
        'SELECT title FROM jobs WHERE id = $1',
        [org1Job.id]
      );
      expect(dbCheck.rows[0].title).not.toBe('Hacked Title');
    });

    it('should return null when updating non-existent record', async () => {
      // Arrange
      const nonExistentId = uuidv4();

      // Act
      const result = await repository.update(
        nonExistentId,
        { title: 'New Title' },
        testOrganizationId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  describe('delete', () => {
    it('should soft delete job', async () => {
      // Arrange
      const testJob = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId
      });

      // Act
      const result = await repository.delete(testJob.id, testOrganizationId);

      // Assert
      expect(result).toBe(true);

      // Verify soft delete (deleted_at set)
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM jobs WHERE id = $1',
        [testJob.id]
      );
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();

      // Verify not returned in normal queries
      const findResult = await repository.findById(testJob.id, testOrganizationId);
      expect(findResult).toBeNull();
    });

    it('should enforce tenant isolation on delete', async () => {
      // Arrange
      const org1Job = await JobTestFactory.createJob({
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId
      });

      // Act - Try to delete with org2 credentials
      const result = await repository.delete(org1Job.id, testOrganization2Id);

      // Assert
      expect(result).toBe(false);

      // Verify not deleted
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM jobs WHERE id = $1',
        [org1Job.id]
      );
      expect(dbCheck.rows[0].deleted_at).toBeNull();
    });

    it('should return false when deleting non-existent record', async () => {
      // Arrange
      const nonExistentId = uuidv4();

      // Act
      const result = await repository.delete(nonExistentId, testOrganizationId);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // COUNT OPERATIONS
  // ============================================================================

  describe('count', () => {
    beforeEach(async () => {
      await JobTestFactory.createJob({ 
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        status: 'open'
      });
      await JobTestFactory.createJob({ 
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        status: 'draft'
      });
    });

    it('should count jobs for organization', async () => {
      // Act
      const result = await repository.count({}, testOrganizationId);

      // Assert
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it('should count with status filter', async () => {
      // Act
      const result = await repository.count({ status: 'open' }, testOrganizationId);

      // Assert
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 for organization with no records', async () => {
      // Arrange
      const emptyOrgId = uuidv4();
      await pool.query(
        `INSERT INTO organizations (id, name, slug, tier) VALUES ($1, $2, $3, $4)`,
        [emptyOrgId, 'Empty Org', `empty-${Date.now()}`, 'starter']
      );

      // Act
      const result = await repository.count({}, emptyOrgId);

      // Assert
      expect(result).toBe(0);

      // Cleanup
      await pool.query('DELETE FROM organizations WHERE id = $1', [emptyOrgId]);
    });
  });
});
