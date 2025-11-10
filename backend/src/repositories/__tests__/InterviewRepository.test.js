/**
 * InterviewRepository Test Suite
 * 
 * Industry Standard Testing Practices:
 * - Test Data Factory Pattern for test data management
 * - AAA Pattern (Arrange-Act-Assert)
 * - Proper test isolation and cleanup
 * - DTO integration (repositories return camelCase DTOs)
 */

import pool from '../../config/database.js';
import { InterviewRepository } from '../InterviewRepository.js';
import { v4 as uuidv4 } from 'uuid';

describe('InterviewRepository', () => {
  let repository;
  let testOrganizationId;
  let testOrganizationId2;
  let testWorkspaceId;
  let testWorkspace2Id;
  let testJobId;
  let testCandidateId;
  let testApplicationId;

  // ============================================================================
  // TEST DATA FACTORY
  // ============================================================================
  class InterviewTestFactory {
    static createdIds = [];

    static async createInterview(overrides = {}) {
      const interviewData = {
        id: uuidv4(),
        application_id: testApplicationId,
        title: 'Technical Interview',
        type: 'technical',
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 86400000), // Tomorrow
        duration_minutes: 60,
        location: 'Conference Room A',
        meeting_link: 'https://meet.example.com/test',
        notes: 'Test interview notes',
        ...overrides
      };

      const result = await pool.query(
        `INSERT INTO interviews (
          id, application_id, title, type, status, scheduled_at,
          duration_minutes, location, meeting_link, notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          interviewData.id,
          interviewData.application_id,
          interviewData.title,
          interviewData.type,
          interviewData.status,
          interviewData.scheduled_at,
          interviewData.duration_minutes,
          interviewData.location,
          interviewData.meeting_link,
          interviewData.notes
        ]
      );

      this.createdIds.push(result.rows[0].id);
      return result.rows[0];
    }

    static async cleanup() {
      if (this.createdIds.length > 0) {
        await pool.query(
          `DELETE FROM interviews WHERE id = ANY($1)`,
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
    repository = new InterviewRepository();

    // Create test organizations with random slugs for parallel test execution
    const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const org1Result = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uuidv4(), 'Test Org 1', `test-org-interview-1-${randomSuffix}`, 'starter']
    );
    testOrganizationId = org1Result.rows[0].id;

    const org2Result = await pool.query(
      `INSERT INTO organizations (id, name, slug, tier) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uuidv4(), 'Test Org 2', `test-org-interview-2-${randomSuffix}`, 'starter']
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
      [uuidv4(), testOrganizationId, 'John', 'Doe', `john.doe.${Date.now()}@example.com`]
    );
    testCandidateId = candidateResult.rows[0].id;

    // Create test application
    const applicationResult = await pool.query(
      `INSERT INTO applications (id, job_id, candidate_id, organization_id, workspace_id, tracking_code, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [uuidv4(), testJobId, testCandidateId, testOrganizationId, testWorkspaceId, `TRK-${Date.now()}`, 'active']
    );
    testApplicationId = applicationResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of dependencies
    await InterviewTestFactory.cleanup();
    await pool.query('DELETE FROM applications WHERE organization_id IN ($1, $2)', 
      [testOrganizationId, testOrganizationId2]);
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
    await InterviewTestFactory.cleanup();
    InterviewTestFactory.reset();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================
  describe('create', () => {
    it('should create an interview with valid data', async () => {
      // Arrange
      const interviewData = {
        application_id: testApplicationId,
        title: 'Technical Interview',
        type: 'technical',
        status: 'scheduled',
        scheduled_at: new Date(Date.now() + 86400000),
        duration_minutes: 60,
        location: 'Conference Room A',
        meeting_link: 'https://meet.example.com/test'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(interviewData, testOrganizationId);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.applicationId).toBe(testApplicationId);
      expect(result.title).toBe('Technical Interview');
      expect(result.type).toBe('technical');
      expect(result.status).toBe('scheduled');
      expect(result.durationMinutes).toBe(60);

      // Cleanup
      await pool.query('DELETE FROM interviews WHERE id = $1', [result.id]);
    });

    it('should set default values correctly', async () => {
      // Arrange
      const interviewData = {
        application_id: testApplicationId,
        title: 'Phone Screen',
        type: 'phone'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(interviewData, testOrganizationId);

      // Assert - Using DTO format
      expect(result.status).toBe('scheduled');
      expect(result.createdAt).toBeDefined();

      // Cleanup
      await pool.query('DELETE FROM interviews WHERE id = $1', [result.id]);
    });

    it('should generate UUID if not provided', async () => {
      // Arrange
      const interviewData = {
        application_id: testApplicationId,
        title: 'Video Interview',
        type: 'video'
      };

      // Act (repository already returns DTOs)
      const result = await repository.create(interviewData, testOrganizationId);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Cleanup
      await pool.query('DELETE FROM interviews WHERE id = $1', [result.id]);
    });

    it('should enforce valid interview types', async () => {
      // Arrange
      const interviewData = {
        application_id: testApplicationId,
        title: 'Invalid Interview',
        type: 'invalid_type' // Not in CHECK constraint
      };

      // Act & Assert
      await expect(
        repository.create(interviewData, testOrganizationId)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // READ TESTS (findById)
  // ============================================================================
  describe('findById', () => {
    it('should find interview by id', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();

      // Act (repository already returns DTOs)
      const result = await repository.findById(testInterview.id, testOrganizationId);

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testInterview.id);
      expect(result.applicationId).toBe(testApplicationId);
      expect(result.title).toBe('Technical Interview');
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
      const testInterview = await InterviewTestFactory.createInterview();

      // Act - Try to access with org2 credentials
      const result = await repository.findById(testInterview.id, testOrganizationId2);

      // Assert
      expect(result).toBeNull();
    });

    it('should not return soft-deleted records', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();

      // Soft delete the interview
      await pool.query(
        'UPDATE interviews SET deleted_at = NOW() WHERE id = $1',
        [testInterview.id]
      );

      // Act (repository already returns DTOs)
      const result = await repository.findById(testInterview.id, testOrganizationId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // READ TESTS (findAll)
  // ============================================================================
  describe('findAll', () => {
    it('should find all interviews for organization', async () => {
      // Arrange
      await InterviewTestFactory.createInterview({ title: 'Interview 1' });
      await InterviewTestFactory.createInterview({ title: 'Interview 2' });

      // Act (repository already returns DTOs)
      const results = await repository.findAll(testOrganizationId);

      // Assert
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0].applicationId).toBe(testApplicationId);
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      await InterviewTestFactory.createInterview();

      // Act - Try with org2
      const results = await repository.findAll(testOrganizationId2);

      // Assert - Should not see org1's interviews
      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================
  describe('update', () => {
    it('should update interview with valid data', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();
      const originalCreatedAt = testInterview.created_at;

      // Act (repository already returns DTOs)
      const result = await repository.update(
        testInterview.id,
        { 
          status: 'completed',
          feedback: 'Great candidate!',
          rating: 5
        },
        testOrganizationId
      );

      // Assert - Using DTO format
      expect(result).toBeDefined();
      expect(result.id).toBe(testInterview.id);
      expect(result.status).toBe('completed');
      expect(result.feedback).toBe('Great candidate!');
      expect(result.rating).toBe(5);
      
      // Verify timestamps
      expect(new Date(result.createdAt).getTime()).toBe(new Date(originalCreatedAt).getTime());
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(new Date(originalCreatedAt).getTime());
    });

    it('should enforce tenant isolation on update', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();

      // Act - Try to update with org2 credentials
      const result = await repository.update(
        testInterview.id,
        { status: 'completed' },
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
        { status: 'completed' },
        testOrganizationId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================
  describe('delete', () => {
    it('should soft delete interview', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();

      // Act
      const result = await repository.delete(testInterview.id, testOrganizationId);

      // Assert
      expect(result).toBe(true);

      // Verify soft delete
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM interviews WHERE id = $1',
        [testInterview.id]
      );
      expect(dbCheck.rows[0].deleted_at).not.toBeNull();
    });

    it('should enforce tenant isolation on delete', async () => {
      // Arrange
      const testInterview = await InterviewTestFactory.createInterview();

      // Act - Try to delete with org2 credentials
      const result = await repository.delete(testInterview.id, testOrganizationId2);

      // Assert
      expect(result).toBe(false);

      // Verify not deleted
      const dbCheck = await pool.query(
        'SELECT deleted_at FROM interviews WHERE id = $1',
        [testInterview.id]
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
  // COUNT TESTS
  // ============================================================================
  describe('count', () => {
    it('should count interviews for organization', async () => {
      // Arrange
      await InterviewTestFactory.createInterview({ title: 'Interview 1' });
      await InterviewTestFactory.createInterview({ title: 'Interview 2' });

      // Act
      const count = await repository.count(testOrganizationId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should count with status filter', async () => {
      // Arrange
      await InterviewTestFactory.createInterview({ status: 'scheduled' });
      await InterviewTestFactory.createInterview({ status: 'completed' });

      // Act
      const count = await repository.count(testOrganizationId, { status: 'scheduled' });

      // Assert
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 for organization with no records', async () => {
      // Act
      const count = await repository.count(testOrganizationId2);

      // Assert
      expect(count).toBe(0);
    });
  });
});
