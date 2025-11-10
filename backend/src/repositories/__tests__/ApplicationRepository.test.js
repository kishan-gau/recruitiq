/**
 * ApplicationRepository Test Suite
 * 
 * Industry Standard Testing Practices:
 * - Test Data Factory Pattern for test data management
 * - AAA Pattern (Arrange-Act-Assert)
 * - Proper test isolation and cleanup
 * - DTO integration (repositories return camelCase DTOs)
 */

import pool from '../../config/database.js';
import { ApplicationRepository } from '../ApplicationRepository.js';
import { v4 as uuidv4 } from 'uuid';

describe('ApplicationRepository', () => {
  let repository;
  let testOrganizationId;
  let testOrganizationId2;
  let testWorkspaceId;
  let testWorkspace2Id;
  let testJobId;
  let testCandidateId;

  // ============================================================================
  // TEST DATA FACTORY
  // ============================================================================
  class ApplicationTestFactory {
    static createdIds = [];

    static async createApplication(overrides = {}) {
      const applicationData = {
        id: uuidv4(),
        job_id: testJobId,
        candidate_id: testCandidateId,
        organization_id: testOrganizationId,
        workspace_id: testWorkspaceId,
        tracking_code: `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'active',
        stage: 'applied',
        applied_at: new Date(),
        ...overrides
      };

      const result = await pool.query(
        `INSERT INTO applications (
          id, job_id, candidate_id, organization_id, workspace_id,
          tracking_code, status, stage, applied_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          applicationData.id,
          applicationData.job_id,
          applicationData.candidate_id,
          applicationData.organization_id,
          applicationData.workspace_id,
          applicationData.tracking_code,
          applicationData.status,
          applicationData.stage,
          applicationData.applied_at
        ]
      );

      this.createdIds.push(result.rows[0].id);
      return result.rows[0];
    }

    static async cleanup() {
      if (this.createdIds.length > 0) {
        await pool.query(
          `DELETE FROM applications WHERE id = ANY($1)`,
          [this.createdIds]
        );
        this.createdIds = [];
      }
    }

    static reset() {
      this.createdIds = [];
    }
  }

  // ============================================================================
  // SETUP & TEARDOWN
  // ============================================================================
  beforeAll(async () => {
    repository = new ApplicationRepository();

    // Create test organizations
    const org1Result = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uuidv4(), 'Test Org 1', `test-org-1-${Date.now()}`, 'starter']
    );
    testOrganizationId = org1Result.rows[0].id;

    const org2Result = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uuidv4(), 'Test Org 2', `test-org-2-${Date.now()}`, 'starter']
    );
    testOrganizationId2 = org2Result.rows[0].id;

    // Create test workspaces
    const ws1Result = await pool.query(
      `INSERT INTO workspaces (id, organization_id, name) VALUES ($1, $2, $3) RETURNING id`,
      [uuidv4(), testOrganizationId, 'Test Workspace 1']
    );
    testWorkspaceId = ws1Result.rows[0].id;

    const ws2Result = await pool.query(
      `INSERT INTO workspaces (id, organization_id, name) VALUES ($1, $2, $3) RETURNING id`,
      [uuidv4(), testOrganizationId2, 'Test Workspace 2']
    );
    testWorkspace2Id = ws2Result.rows[0].id;

    // Create test job
    const jobResult = await pool.query(
      `INSERT INTO jobs (id, organization_id, workspace_id, title, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [uuidv4(), testOrganizationId, testWorkspaceId, 'Software Engineer', 'open']
    );
    testJobId = jobResult.rows[0].id;

    // Create test candidate
    const candidateResult = await pool.query(
      `INSERT INTO candidates (id, organization_id, first_name, last_name, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [uuidv4(), testOrganizationId, 'John', 'Doe', `test-${Date.now()}@example.com`]
    );
    testCandidateId = candidateResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await ApplicationTestFactory.cleanup();
    await pool.query('DELETE FROM candidates WHERE organization_id IN ($1, $2)', 
      [testOrganizationId, testOrganizationId2]);
    await pool.query('DELETE FROM jobs WHERE organization_id IN ($1, $2)', 
      [testOrganizationId, testOrganizationId2]);
    await pool.query('DELETE FROM workspaces WHERE id IN ($1, $2)', 
      [testWorkspaceId, testWorkspace2Id]);
    await pool.query('DELETE FROM organizations WHERE id IN ($1, $2)', 
      [testOrganizationId, testOrganizationId2]);
  });

  afterEach(async () => {
    await ApplicationTestFactory.cleanup();
  });

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================
  describe('create', () => {
    it('should create an application with valid data', async () => {
      // Arrange
      const applicationData = {
        job_id: testJobId,
        candidate_id: testCandidateId,
        workspace_id: testWorkspaceId,
        tracking_code: `TRK-${Date.now()}`,
        status: 'active',
        stage: 'screening',
        cover_letter: 'I am very interested in this position'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(applicationData, testOrganizationId);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.jobId).toBe(testJobId);
      expect(result.candidateId).toBe(testCandidateId);
      expect(result.organizationId).toBe(testOrganizationId);
      expect(result.workspaceId).toBe(testWorkspaceId);
      expect(result.trackingCode).toBe(applicationData.tracking_code);
      expect(result.status).toBe('active');
      expect(result.stage).toBe('screening');

      // Cleanup
      await pool.query('DELETE FROM applications WHERE id = $1', [result.id]);
    });

    it('should set default values correctly', async () => {
      // Arrange
      const applicationData = {
        job_id: testJobId,
        candidate_id: testCandidateId,
        workspace_id: testWorkspaceId,
        tracking_code: `TRK-${Date.now()}`,
        status: 'active' // Required due to check constraint
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(applicationData, testOrganizationId);

      // Assert - Using DTO format
      expect(result.status).toBe('active');
      expect(result.stage).toBe('applied');
      expect(result.appliedAt).toBeDefined();

      // Cleanup
      await pool.query('DELETE FROM applications WHERE id = $1', [result.id]);
    });

    it('should generate UUID if not provided', async () => {
      // Arrange
      const applicationData = {
        job_id: testJobId,
        candidate_id: testCandidateId,
        workspace_id: testWorkspaceId,
        tracking_code: `TRK-${Date.now()}`,
        status: 'active' // Required due to check constraint
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(applicationData, testOrganizationId);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Cleanup
      await pool.query('DELETE FROM applications WHERE id = $1', [result.id]);
    });

    it('should enforce unique tracking code', async () => {
      // Arrange
      const trackingCode = `TRK-${Date.now()}`;
      const application1Data = {
        job_id: testJobId,
        candidate_id: testCandidateId,
        workspace_id: testWorkspaceId,
        tracking_code: trackingCode,
        status: 'active' // Required due to check constraint
      };

      // Act - Create first application
      const result1 = await repository.create(application1Data, testOrganizationId);
      expect(result1).toBeDefined();

      // Try to create duplicate tracking code
      const application2Data = { ...application1Data };

      // Assert - Should throw error
      await expect(
        repository.create(application2Data, testOrganizationId)
      ).rejects.toThrow();

      // Cleanup
      await pool.query('DELETE FROM applications WHERE id = $1', [result1.id]);
    });
  });

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================
  describe('findById', () => {
    it('should find application by id', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();

      // Act (repository already returns DTOs)
      const result = await repository.findById(testApplication.id, testOrganizationId);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testApplication.id);
      expect(result.jobId).toBe(testJobId);
      expect(result.candidateId).toBe(testCandidateId);
    });

    it('should return null for non-existent id', async () => {
      // Arrange
      const nonExistentId = uuidv4();

      // Act (repository already returns DTOs)
      const result = await repository.findById(nonExistentId, testOrganizationId);

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication({
        organization_id: testOrganizationId
      });

      // Act - Try to access with org2 credentials
      const result = await repository.findById(testApplication.id, testOrganizationId2);

      // Assert
      expect(result).toBeNull();
    });

    it('should not return soft-deleted records', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();
      await repository.delete(testApplication.id, testOrganizationId);

      // Act (repository already returns DTOs)
      const result = await repository.findById(testApplication.id, testOrganizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByCandidateAndJob', () => {
    it('should find application by candidate and job', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();

      // Act (repository already returns DTOs)
      const result = await repository.findByCandidateAndJob(
        testCandidateId,
        testJobId,
        testOrganizationId
      );

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.candidateId).toBe(testCandidateId);
      expect(result.jobId).toBe(testJobId);
    });

    it('should return null if no application exists', async () => {
      // Arrange
      const nonExistentCandidateId = uuidv4();

      // Act (repository already returns DTOs)
      const result = await repository.findByCandidateAndJob(
        nonExistentCandidateId,
        testJobId,
        testOrganizationId
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      await ApplicationTestFactory.createApplication();

      // Act - Try with wrong organization
      const result = await repository.findByCandidateAndJob(
        testCandidateId,
        testJobId,
        testOrganizationId2
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================
  describe('update', () => {
    it('should update application with valid data', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication({
        status: 'active',
        stage: 'applied'
      });

      const updateData = {
        status: 'active',
        stage: 'interview',
        notes: 'Candidate has strong technical skills'
      };

      // Act (repository already returns DTOs)
      const originalCreatedAt = new Date(testApplication.created_at).getTime();
      const result = await repository.update(
        testApplication.id,
        updateData,
        testOrganizationId
      );

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testApplication.id);
      expect(result.stage).toBe('interview');
      expect(result.notes).toBe('Candidate has strong technical skills');
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThanOrEqual(originalCreatedAt);

      // Verify in database
      const dbCheck = await pool.query(
        'SELECT * FROM applications WHERE id = $1',
        [testApplication.id]
      );
      expect(dbCheck.rows[0].stage).toBe('interview');
    });

    it('should enforce tenant isolation on update', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();

      // Act - Try to update with org2 credentials
      const result = await repository.update(
        testApplication.id,
        { stage: 'interview' },
        testOrganizationId2
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when updating non-existent record', async () => {
      // Arrange
      const nonExistentId = uuidv4();

      // Act (repository already returns DTOs)
      const result = await repository.update(
        nonExistentId,
        { stage: 'interview' },
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
    it('should soft delete application', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();

      // Act
      const result = await repository.delete(testApplication.id, testOrganizationId);

      // Assert
      expect(result).toBe(true);

      // Verify soft delete in database
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM applications WHERE id = $1',
        [testApplication.id]
      );
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();
    });

    it('should enforce tenant isolation on delete', async () => {
      // Arrange
      const testApplication = await ApplicationTestFactory.createApplication();

      // Act - Try to delete with org2 credentials
      const result = await repository.delete(testApplication.id, testOrganizationId2);

      // Assert
      expect(result).toBe(false);

      // Verify not deleted
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM applications WHERE id = $1',
        [testApplication.id]
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
    it('should count applications for organization', async () => {
      // Arrange
      await ApplicationTestFactory.createApplication();
      await ApplicationTestFactory.createApplication({
        tracking_code: `TRK-${Date.now()}-2`
      });

      // Act
      const result = await repository.count({}, testOrganizationId);

      // Assert
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it('should count with status filter', async () => {
      // Arrange
      await ApplicationTestFactory.createApplication({ status: 'active' });
      await ApplicationTestFactory.createApplication({ 
        status: 'rejected',
        tracking_code: `TRK-${Date.now()}-2`
      });

      // Act
      const result = await repository.count({ status: 'active' }, testOrganizationId);

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
