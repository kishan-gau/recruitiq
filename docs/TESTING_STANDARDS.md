# Testing Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Unit Testing Standards](#unit-testing-standards)
4. [Integration Testing Standards](#integration-testing-standards)
5. [E2E Testing Standards](#e2e-testing-standards)
6. [Test Structure](#test-structure)
7. [Mocking Standards](#mocking-standards)
8. [Test Data Management](#test-data-management)

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /  \
      / E2E \          ← Few, slow, expensive (Critical user journeys)
     /______\
    /        \
   /Integration\       ← Some, medium speed (API endpoints, component integration)
  /____________\
 /              \
/   Unit Tests   \    ← Many, fast, cheap (Services, utilities, components)
/__________________\
```

**Target Distribution:**
- **Unit Tests:** 70% of tests
- **Integration Tests:** 20% of tests
- **E2E Tests:** 10% of tests

---

## Test Coverage Requirements

### Minimum Coverage (MANDATORY)

| Type | Minimum Coverage | Target Coverage |
|------|-----------------|-----------------|
| Overall | 80% | 90% |
| Services | 90% | 95% |
| Repositories | 85% | 90% |
| Controllers | 75% | 85% |
| Utilities | 90% | 95% |
| UI Components | 70% | 80% |

### What to Test

**✅ MUST Test:**
- All business logic (services)
- All data access (repositories)
- All API endpoints (integration)
- All utility functions
- Critical user journeys (E2E)
- Error handling paths
- Validation logic

**❌ DO NOT Test:**
- Third-party libraries
- Generated code
- Configuration files
- Simple getters/setters
- Database migrations

---

## Unit Testing Standards

### Service Unit Test Template

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import JobService from '../../src/services/jobs/JobService.js';
import JobRepository from '../../src/repositories/JobRepository.js';
import { ValidationError, NotFoundError } from '../../src/utils/errors.js';

describe('JobService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    // Setup: Create fresh mocks for each test
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findWorkspaceById: jest.fn()
    };

    // Inject mock repository
    service = new JobService(mockRepository);
  });

  describe('create', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';
    const userId = '223e4567-e89b-12d3-a456-426614174000';
    const workspaceId = '323e4567-e89b-12d3-a456-426614174000';

    it('should create a job with valid data', async () => {
      // Arrange
      const validData = {
        title: 'Senior Developer',
        description: 'Looking for a senior developer with 5+ years experience',
        workspaceId,
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        salaryMin: 100000,
        salaryMax: 150000,
        skills: ['JavaScript', 'Node.js', 'React'],
        requirements: ['5+ years experience', 'Bachelor degree']
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        ...validData,
        organizationId,
        createdBy: userId,
        status: 'draft',
        isPublished: false
      });

      // Act
      const result = await service.create(validData, organizationId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('job-uuid');
      expect(result.title).toBe(validData.title);
      expect(result.organizationId).toBe(organizationId);
      expect(mockRepository.findWorkspaceById).toHaveBeenCalledWith(
        workspaceId,
        organizationId
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validData.title,
          organizationId,
          createdBy: userId,
          status: 'draft'
        })
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const invalidData = {
        title: 'Job' // Too short
      };

      // Act & Assert
      await expect(
        service.create(invalidData, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid employment type', async () => {
      // Arrange
      const invalidData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId,
        employmentType: 'invalid-type'
      };

      // Act & Assert
      await expect(
        service.create(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    it('should throw NotFoundError when workspace does not exist', async () => {
      // Arrange
      const validData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId: 'non-existent-workspace'
      };

      mockRepository.findWorkspaceById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.create(validData, organizationId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should apply default values correctly', async () => {
      // Arrange
      const minimalData = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        ...minimalData,
        employmentType: 'full-time', // Default applied
        organizationId
      });

      // Act
      const result = await service.create(minimalData, organizationId, userId);

      // Assert
      expect(result.employmentType).toBe('full-time');
    });

    it('should strip unknown fields', async () => {
      // Arrange
      const dataWithUnknownFields = {
        title: 'Senior Developer',
        description: 'Description here',
        workspaceId,
        unknownField: 'should be stripped',
        anotherUnknown: 'also stripped'
      };

      mockRepository.findWorkspaceById.mockResolvedValue({
        id: workspaceId,
        organizationId
      });

      mockRepository.create.mockResolvedValue({
        id: 'job-uuid',
        title: dataWithUnknownFields.title,
        description: dataWithUnknownFields.description,
        workspaceId,
        organizationId
      });

      // Act
      await service.create(dataWithUnknownFields, organizationId, userId);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          unknownField: expect.anything(),
          anotherUnknown: expect.anything()
        })
      );
    });
  });

  describe('getById', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const organizationId = '223e4567-e89b-12d3-a456-426614174000';

    it('should return job when found', async () => {
      // Arrange
      const mockJob = {
        id: jobId,
        title: 'Senior Developer',
        organizationId
      };

      mockRepository.findById.mockResolvedValue(mockJob);

      // Act
      const result = await service.getById(jobId, organizationId);

      // Assert
      expect(result).toEqual(mockJob);
      expect(mockRepository.findById).toHaveBeenCalledWith(jobId, organizationId);
    });

    it('should throw NotFoundError when job does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getById(jobId, organizationId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    const organizationId = '223e4567-e89b-12d3-a456-426614174000';
    const userId = '323e4567-e89b-12d3-a456-426614174000';

    it('should update job with valid data', async () => {
      // Arrange
      const existingJob = {
        id: jobId,
        title: 'Old Title',
        salaryMin: 100000,
        organizationId
      };

      const updateData = {
        title: 'New Title',
        salaryMax: 150000
      };

      mockRepository.findById.mockResolvedValue(existingJob);
      mockRepository.update.mockResolvedValue({
        ...existingJob,
        ...updateData
      });

      // Act
      const result = await service.update(jobId, updateData, organizationId, userId);

      // Assert
      expect(result.title).toBe(updateData.title);
      expect(mockRepository.update).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          title: updateData.title,
          salaryMax: updateData.salaryMax,
          updatedBy: userId
        }),
        organizationId
      );
    });

    it('should throw ValidationError when salaryMax < salaryMin', async () => {
      // Arrange
      const existingJob = {
        id: jobId,
        salaryMin: 100000,
        organizationId
      };

      const updateData = {
        salaryMax: 50000 // Less than min
      };

      mockRepository.findById.mockResolvedValue(existingJob);

      // Act & Assert
      await expect(
        service.update(jobId, updateData, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should require at least one field to update', async () => {
      // Arrange
      const emptyUpdate = {};

      // Act & Assert
      await expect(
        service.update(jobId, emptyUpdate, organizationId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('list', () => {
    const organizationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return paginated jobs', async () => {
      // Arrange
      const mockJobs = [
        { id: '1', title: 'Job 1' },
        { id: '2', title: 'Job 2' }
      ];

      mockRepository.findAll.mockResolvedValue({
        jobs: mockJobs,
        total: 2
      });

      // Act
      const result = await service.list({}, organizationId);

      // Assert
      expect(result.jobs).toEqual(mockJobs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });

    it('should enforce maximum limit of 100', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue({ jobs: [], total: 0 });

      // Act
      await service.list({ limit: 999 }, organizationId);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
        organizationId
      );
    });

    it('should handle filtering correctly', async () => {
      // Arrange
      const filters = {
        status: 'published',
        employmentType: 'full-time',
        search: 'developer'
      };

      mockRepository.findAll.mockResolvedValue({ jobs: [], total: 0 });

      // Act
      await service.list(filters, organizationId);

      // Assert
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          employmentType: 'full-time',
          search: 'developer'
        }),
        expect.anything(),
        organizationId
      );
    });
  });
});
```

### Unit Test Standards Checklist

**EVERY unit test suite MUST have:**

- [ ] **Describe blocks** for class/function organization
- [ ] **beforeEach** to setup fresh test state
- [ ] **Arrange-Act-Assert** pattern in tests
- [ ] **Clear test names** that describe expected behavior
- [ ] **Mock all dependencies** (no real database/API calls)
- [ ] **Test success cases** first
- [ ] **Test error cases** thoroughly
- [ ] **Test edge cases** (null, undefined, empty)
- [ ] **Test validation** rules
- [ ] **Assertions on mocks** to verify calls

---

## Integration Testing Standards

### Integration Test Template

```javascript
import request from 'supertest';
import app from '../../src/app.js';
import { query } from '../../src/config/database.js';
import { generateTestToken } from '../helpers/auth.js';

describe('Jobs API - Integration Tests', () => {
  let authToken;
  let organizationId;
  let userId;
  let workspaceId;

  beforeAll(async () => {
    // Setup: Create test organization and user
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (uuid_generate_v4(), 'Test Org')
      RETURNING id
    `);
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(`
      INSERT INTO users (id, email, name, organization_id, role)
      VALUES (uuid_generate_v4(), 'test@example.com', 'Test User', $1, 'admin')
      RETURNING id
    `, [organizationId]);
    userId = userResult.rows[0].id;

    const workspaceResult = await pool.query(`
      INSERT INTO workspaces (id, name, organization_id, created_by)
      VALUES (uuid_generate_v4(), 'Test Workspace', $1, $2)
      RETURNING id
    `, [organizationId, userId]);
    workspaceId = workspaceResult.rows[0].id;

    // Generate auth token
    authToken = generateTestToken({ id: userId, organizationId, role: 'admin' });
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await pool.query('DELETE FROM jobs WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM workspaces WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
  });

  describe('POST /api/jobs', () => {
    it('should create a new job with valid data', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Looking for a senior developer',
        workspaceId,
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'full-time',
        salaryMin: 100000,
        salaryMax: 150000
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
      expect(response.body.job.title).toBe(jobData.title);
      expect(response.body.job.organizationId).toBe(organizationId);
      expect(response.body.job.createdBy).toBe(userId);
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const invalidData = {
        title: 'AB' // Too short
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Description',
        workspaceId
      };

      // Act
      await request(app)
        .post('/api/jobs')
        .send(jobData)
        .expect(401);
    });

    it('should return 404 for non-existent workspace', async () => {
      // Arrange
      const jobData = {
        title: 'Senior Developer',
        description: 'Description',
        workspaceId: '00000000-0000-0000-0000-000000000000'
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(404);

      // Assert
      expect(response.body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/jobs/:id', () => {
    let jobId;

    beforeEach(async () => {
      // Create a test job
      const result = await pool.query(`
        INSERT INTO jobs (
          id, title, description, workspace_id, organization_id, created_by
        )
        VALUES (uuid_generate_v4(), 'Test Job', 'Description', $1, $2, $3)
        RETURNING id
      `, [workspaceId, organizationId, userId]);
      jobId = result.rows[0].id;
    });

    it('should return job by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job).toBeDefined();
      expect(response.body.job.id).toBe(jobId);
      expect(response.body.job.title).toBe('Test Job');
    });

    it('should return 404 for non-existent job', async () => {
      // Act
      await request(app)
        .get('/api/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      // Create multiple test jobs
      await pool.query(`
        INSERT INTO jobs (
          id, title, description, workspace_id, organization_id, 
          created_by, employment_type, status
        )
        VALUES 
          (uuid_generate_v4(), 'Job 1', 'Description 1', $1, $2, $3, 'full-time', 'published'),
          (uuid_generate_v4(), 'Job 2', 'Description 2', $1, $2, $3, 'part-time', 'draft'),
          (uuid_generate_v4(), 'Job 3', 'Description 3', $1, $2, $3, 'full-time', 'published')
      `, [workspaceId, organizationId, userId]);
    });

    it('should return paginated jobs', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toBeInstanceOf(Array);
      expect(response.body.jobs.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by employment type', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?employmentType=full-time')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.jobs.every(job => job.employmentType === 'full-time')).toBe(true);
    });

    it('should filter by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?status=published')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.jobs.every(job => job.status === 'published')).toBe(true);
    });

    it('should support pagination', async () => {
      // Act
      const response = await request(app)
        .get('/api/jobs?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.jobs.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Tenant Isolation', () => {
    let org2Id, user2Id, workspace2Id, token2;

    beforeAll(async () => {
      // Create second organization
      const org2 = await pool.query(`
        INSERT INTO organizations (id, name)
        VALUES (uuid_generate_v4(), 'Test Org 2')
        RETURNING id
      `);
      org2Id = org2.rows[0].id;

      const user2 = await pool.query(`
        INSERT INTO users (id, email, name, organization_id, role)
        VALUES (uuid_generate_v4(), 'test2@example.com', 'Test User 2', $1, 'admin')
        RETURNING id
      `, [org2Id]);
      user2Id = user2.rows[0].id;

      const workspace2 = await pool.query(`
        INSERT INTO workspaces (id, name, organization_id, created_by)
        VALUES (uuid_generate_v4(), 'Test Workspace 2', $1, $2)
        RETURNING id
      `, [org2Id, user2Id]);
      workspace2Id = workspace2.rows[0].id;

      token2 = generateTestToken({ id: user2Id, organizationId: org2Id, role: 'admin' });
    });

    it('should not allow access to jobs from another organization', async () => {
      // Arrange: Create job in org1
      const result = await pool.query(`
        INSERT INTO jobs (id, title, description, workspace_id, organization_id, created_by)
        VALUES (uuid_generate_v4(), 'Org1 Job', 'Description', $1, $2, $3)
        RETURNING id
      `, [workspaceId, organizationId, userId]);
      const jobId = result.rows[0].id;

      // Act: Try to access with org2 user
      await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });

    afterAll(async () => {
      await pool.query('DELETE FROM workspaces WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM users WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    });
  });
});
```

### Integration Test Standards Checklist

**EVERY integration test suite MUST:**

- [ ] **Use real database** (test database)
- [ ] **Setup test data** in beforeAll/beforeEach
- [ ] **Cleanup test data** in afterAll/afterEach
- [ ] **Test full request-response cycle**
- [ ] **Test authentication** requirements
- [ ] **Test authorization** rules
- [ ] **Test tenant isolation**
- [ ] **Test HTTP status codes**
- [ ] **Test response structure**
- [ ] **Test database state** changes

---

## Mocking Standards

### Mock Patterns

```javascript
// Mock repository
const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn()
};

// Mock with return value
mockRepository.findById.mockResolvedValue({ id: '123', title: 'Job' });

// Mock with error
mockRepository.create.mockRejectedValue(new Error('Database error'));

// Mock with implementation
mockRepository.findAll.mockImplementation((filters, pagination, orgId) => {
  return Promise.resolve({
    jobs: [],
    total: 0
  });
});

// Verify mock was called
expect(mockRepository.create).toHaveBeenCalledWith(
  expect.objectContaining({
    title: 'Expected Title'
  })
);

// Verify mock was called with exact arguments
expect(mockRepository.findById).toHaveBeenCalledWith('123', 'org-id');

// Verify mock was called specific number of times
expect(mockRepository.create).toHaveBeenCalledTimes(1);

// Reset mock
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## Test Data Management

### Test Data Factory Pattern (Integration Tests)

**RECOMMENDED:** For integration tests that interact with the database, use the **Test Data Factory Class pattern** for true test isolation.

#### Why Test Data Factories?

✅ **Test Isolation** - Each test creates its own data  
✅ **No Seed Data Dependency** - Tests are self-contained  
✅ **Parallel Execution** - Tests don't interfere with each other  
✅ **Reusable** - Centralized data creation logic  
✅ **Type Safety** - Factory validates data structure  
✅ **Easy Cleanup** - Automated cleanup after tests

#### Implementation Pattern

```javascript
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../src/config/database.js';

// Test constants from seed data (for foreign keys only)
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testWorkspaceId = '550e8400-e29b-41d4-a716-446655440100';

/**
 * Test Data Factory Class
 * Creates and manages test data with proper cleanup
 */
class JobTestFactory {
  /**
   * Create a test job
   * @param {Object} overrides - Override default values
   * @returns {Promise<Object>} Created job record
   */
  static async createJob(overrides = {}) {
    const defaultData = {
      id: uuidv4(), // Generate unique UUID for each test
      organization_id: testOrganizationId,
      workspace_id: testWorkspaceId,
      title: 'Test Job',
      description: 'Test job description',
      employment_type: 'full-time',
      status: 'published',
      created_by: testUserId,
      ...overrides // Allow test-specific overrides
    };

    const result = await query(
      `INSERT INTO jobs (
        id, organization_id, workspace_id, title, description,
        employment_type, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        defaultData.id,
        defaultData.organization_id,
        defaultData.workspace_id,
        defaultData.title,
        defaultData.description,
        defaultData.employment_type,
        defaultData.status,
        defaultData.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Create a test application for a job
   * @param {Object} overrides - Override default values
   * @returns {Promise<Object>} Created application record
   */
  static async createApplication(overrides = {}) {
    const defaultData = {
      id: uuidv4(),
      job_id: overrides.job_id, // Required
      candidate_id: overrides.candidate_id, // Required
      status: 'submitted',
      created_by: testUserId,
      ...overrides
    };

    const result = await query(
      `INSERT INTO applications (
        id, job_id, candidate_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        defaultData.id,
        defaultData.job_id,
        defaultData.candidate_id,
        defaultData.status,
        defaultData.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Clean up all test data created in the last hour
   * Uses timestamp-based deletion to avoid removing seed data
   */
  static async cleanup() {
    // Delete in reverse order to respect foreign keys
    await query(
      `DELETE FROM applications WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
    await query(
      `DELETE FROM jobs WHERE created_at > NOW() - INTERVAL '1 hour'`
    );
  }
}
```

#### Usage in Tests

```javascript
import request from 'supertest';
import app from '../../src/app.js';
import JobTestFactory from '../factories/JobTestFactory.js';

describe('Jobs API - Integration Tests', () => {
  // Clean up after ALL tests complete
  afterAll(async () => {
    await JobTestFactory.cleanup();
  });

  describe('GET /api/jobs/:id', () => {
    let testJob;

    // Create fresh data before EACH test (test isolation)
    beforeEach(async () => {
      testJob = await JobTestFactory.createJob({
        title: 'Senior Developer',
        employment_type: 'full-time'
      });
    });

    it('should return job by ID', async () => {
      // Act
      const response = await request(app)
        .get(`/api/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.job.id).toBe(testJob.id);
      expect(response.body.job.title).toBe('Senior Developer');
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = uuidv4();

      await request(app)
        .get(`/api/jobs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create job with valid data', async () => {
      const jobData = {
        title: 'New Job',
        description: 'Job description',
        workspaceId: testWorkspaceId,
        employmentType: 'full-time'
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.job.title).toBe('New Job');
    });
  });
});
```

#### Key Patterns

**1. UUID Generation:**
```javascript
import { v4 as uuidv4 } from 'uuid';

const id = uuidv4(); // Generates unique UUID v4
```

**2. Timestamp-Based Cleanup (Safe for Parallel Tests):**
```javascript
static async cleanup() {
  // Only deletes data created in last hour (test data, not seed data)
  await query(`DELETE FROM table WHERE created_at > NOW() - INTERVAL '1 hour'`);
}
```

**3. Foreign Key Order in Cleanup:**
```javascript
static async cleanup() {
  // Delete child records first
  await query(`DELETE FROM applications WHERE created_at > NOW() - INTERVAL '1 hour'`);
  // Then parent records
  await query(`DELETE FROM jobs WHERE created_at > NOW() - INTERVAL '1 hour'`);
}
```

**4. Test Isolation with beforeEach:**
```javascript
beforeEach(async () => {
  // Each test gets fresh data
  testJob = await JobTestFactory.createJob({ title: 'Specific Title' });
});
```

**5. Centralized Cleanup with afterAll:**
```javascript
afterAll(async () => {
  // Clean up once after all tests
  await JobTestFactory.cleanup();
});
```

### Simple Factory Functions (Unit Tests)

For **unit tests** with mocked dependencies, use simple factory functions:

```javascript
// ✅ GOOD: Simple factory for unit tests (returns objects, no DB)
const createMockJob = (overrides = {}) => ({
  id: uuidv4(),
  title: 'Test Job',
  description: 'Test Description',
  workspaceId: uuidv4(),
  organizationId: uuidv4(),
  createdBy: uuidv4(),
  ...overrides
});

// Usage in unit tests
const mockJob = createMockJob({ title: 'Custom Title' });
mockRepository.findById.mockResolvedValue(mockJob);
```

### Test Constants

```javascript
// ✅ GOOD: Use constants for test UUIDs (from seed data)
const TEST_UUIDS = {
  ORG1: '123e4567-e89b-12d3-a456-426614174000',
  ORG2: '223e4567-e89b-12d3-a456-426614174001',
  USER1: '323e4567-e89b-12d3-a456-426614174002'
};
```

### Anti-Patterns to Avoid

```javascript
// ❌ BAD: Hard-coded test data everywhere
const job = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Job',
  // ... repeated in every test
};

// ❌ BAD: Inline SQL in every test (not reusable)
beforeEach(async () => {
  const result = await pool.query(`INSERT INTO jobs...`);
  jobId = result.rows[0].id;
});

// ❌ BAD: Deleting all data (removes seed data too)
afterEach(async () => {
  await pool.query('DELETE FROM jobs'); // Dangerous!
});

// ❌ BAD: Depending on seed data without creating it
test('should get job', async () => {
  // Assumes job with this ID exists from seed - brittle!
  const response = await request(app)
    .get('/api/jobs/550e8400-e29b-41d4-a716-446655440888')
    .expect(200);
});
```

---

**Next:** [Security Standards](./SECURITY_STANDARDS.md)
