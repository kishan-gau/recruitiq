/**
 * Unit tests for JobService
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { JobService } from '../JobService.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../middleware/errorHandler.js';

// Mock dependencies before imports
jest.mock('../../../config/database.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../repositories/JobRepository.js');
jest.mock('../../../models/Organization.js');

describe('JobService', () => {
  let jobService;
  let mockJobRepository;
  let mockOrganization;
  let mockUser;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Dynamic imports after mocks are set up
    const { JobRepository } = await import('../../../repositories/JobRepository.js');
    const Organization = (await import('../../../models/Organization.js')).default;

    // Create service instance
    jobService = new JobService();

    // Get mock repository instance
    mockJobRepository = jobService.jobRepository;
    mockOrganization = Organization;

    // Mock user
    mockUser = {
      id: 'user-123',
      organization_id: 'org-123',
      email: 'user@test.com'
    };
  });

  describe('create', () => {
    const validJobData = {
      title: 'Senior Software Engineer',
      department: 'Engineering',
      location: 'Remote',
      employment_type: 'full-time',
      description: 'Join our engineering team',
      requirements: 'Bachelor degree',
      salary_min: 100000,
      salary_max: 150000,
      status: 'draft'
    };

    it('should create a job with valid data', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: 10
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);

      const mockActiveJobCount = 5;
      mockJobRepository.count = jest.fn().mockResolvedValue(mockActiveJobCount);

      const mockCreatedJob = {
        id: 'job-123',
        ...validJobData,
        slug: 'senior-software-engineer',
        organization_id: 'org-123',
        created_by: 'user-123'
      };
      mockJobRepository.create = jest.fn().mockResolvedValue(mockCreatedJob);

      const result = await jobService.create(validJobData, mockUser);

      expect(mockOrganization.findByPk).toHaveBeenCalledWith('org-123');
      expect(mockJobRepository.count).toHaveBeenCalledWith(
        { status: ['draft', 'open'] },
        'org-123'
      );
      expect(mockJobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validJobData,
          slug: expect.any(String),
          created_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockCreatedJob);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        title: 'A' // Too short
      };

      await expect(jobService.create(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when salary_min > salary_max', async () => {
      const invalidSalaryData = {
        ...validJobData,
        salary_min: 150000,
        salary_max: 100000
      };

      await expect(jobService.create(invalidSalaryData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when job limit exceeded', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: 10
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);

      const mockActiveJobCount = 10; // Already at limit
      mockJobRepository.count = jest.fn().mockResolvedValue(mockActiveJobCount);

      await expect(jobService.create(validJobData, mockUser)).rejects.toThrow(BusinessRuleError);
      expect(mockJobRepository.create).not.toHaveBeenCalled();
    });

    it('should generate unique slug', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: 10
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);
      mockJobRepository.count = jest.fn().mockResolvedValue(0);

      const mockCreatedJob = {
        id: 'job-123',
        ...validJobData,
        slug: 'senior-software-engineer'
      };
      mockJobRepository.create = jest.fn().mockResolvedValue(mockCreatedJob);

      await jobService.create(validJobData, mockUser);

      expect(mockJobRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^[a-z0-9-]+$/)
        }),
        'org-123'
      );
    });

    it('should handle unlimited jobs (max_jobs: null)', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: null // Unlimited
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);

      const mockCreatedJob = {
        id: 'job-123',
        ...validJobData
      };
      mockJobRepository.create = jest.fn().mockResolvedValue(mockCreatedJob);

      await jobService.create(validJobData, mockUser);

      expect(mockJobRepository.count).not.toHaveBeenCalled();
      expect(mockJobRepository.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should get job by id without stats', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Software Engineer',
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);

      const result = await jobService.getById('job-123', mockUser, false);

      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-123', 'org-123');
      expect(result).toEqual(mockJob);
    });

    it('should get job by id with stats', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Software Engineer',
        organization_id: 'org-123',
        applicationStats: { total: 10, screening: 5 }
      };
      mockJobRepository.findByIdWithStats.mockResolvedValue(mockJob);

      const result = await jobService.getById('job-123', mockUser, true);

      expect(mockJobRepository.findByIdWithStats).toHaveBeenCalledWith('job-123', 'org-123');
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findById.mockResolvedValue(null);

      await expect(jobService.getById('job-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getBySlug', () => {
    it('should get published job by slug', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Software Engineer',
        slug: 'software-engineer',
        is_published: true,
        status: 'open'
      };
      mockJobRepository.findBySlug.mockResolvedValue(mockJob);

      const result = await jobService.getBySlug('software-engineer');

      expect(mockJobRepository.findBySlug).toHaveBeenCalledWith('software-engineer');
      expect(result).toMatchObject({
        id: 'job-123',
        title: 'Software Engineer'
      });
      // Internal fields should be removed
      expect(result.hiring_manager_id).toBeUndefined();
      expect(result.internal_notes).toBeUndefined();
    });

    it('should throw NotFoundError when slug not found', async () => {
      mockJobRepository.findBySlug.mockResolvedValue(null);

      await expect(jobService.getBySlug('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const updateData = {
      title: 'Updated Title',
      description: 'Updated description'
    };

    it('should update job with valid data', async () => {
      const mockExistingJob = {
        id: 'job-123',
        title: 'Old Title',
        status: 'draft',
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockExistingJob);

      const mockUpdatedJob = {
        ...mockExistingJob,
        ...updateData,
        updated_by: 'user-123'
      };
      mockJobRepository.update.mockResolvedValue(mockUpdatedJob);

      const result = await jobService.update('job-123', updateData, mockUser);

      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-123', 'org-123');
      expect(mockJobRepository.update).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          ...updateData,
          updated_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockUpdatedJob);
    });

    it('should throw ValidationError for invalid update data', async () => {
      const invalidData = {
        salary_min: 'not-a-number'
      };

      await expect(jobService.update('job-123', invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when trying to reopen closed job', async () => {
      const mockClosedJob = {
        id: 'job-123',
        status: 'closed',
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockClosedJob);

      const reopenData = {
        status: 'open'
      };

      await expect(jobService.update('job-123', reopenData, mockUser)).rejects.toThrow(BusinessRuleError);
      expect(mockJobRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating closed job without changing status', async () => {
      const mockClosedJob = {
        id: 'job-123',
        title: 'Old Title',
        status: 'closed',
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockClosedJob);

      const updateWithoutStatus = {
        internal_notes: 'Updated notes'
      };

      const mockUpdatedJob = {
        ...mockClosedJob,
        ...updateWithoutStatus
      };
      mockJobRepository.update.mockResolvedValue(mockUpdatedJob);

      const result = await jobService.update('job-123', updateWithoutStatus, mockUser);

      expect(mockJobRepository.update).toHaveBeenCalled();
      expect(result).toEqual(mockUpdatedJob);
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findById.mockResolvedValue(null);

      await expect(jobService.update('job-999', updateData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete unpublished job without applications', async () => {
      const mockJob = {
        id: 'job-123',
        is_published: false,
        organization_id: 'org-123'
      };
      mockJobRepository.findByIdWithStats.mockResolvedValue({
        ...mockJob,
        applicationStats: { total: 0 }
      });
      mockJobRepository.delete.mockResolvedValue(true);

      await jobService.delete('job-123', mockUser);

      expect(mockJobRepository.findByIdWithStats).toHaveBeenCalledWith('job-123', 'org-123');
      expect(mockJobRepository.delete).toHaveBeenCalledWith('job-123', 'org-123');
    });

    it('should throw BusinessRuleError when deleting published job with applications', async () => {
      const mockJob = {
        id: 'job-123',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findByIdWithStats.mockResolvedValue({
        ...mockJob,
        applicationStats: { total: 5 }
      });

      await expect(jobService.delete('job-123', mockUser)).rejects.toThrow(BusinessRuleError);
      expect(mockJobRepository.delete).not.toHaveBeenCalled();
    });

    it('should allow deleting published job without applications', async () => {
      const mockJob = {
        id: 'job-123',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findByIdWithStats.mockResolvedValue({
        ...mockJob,
        applicationStats: { total: 0 }
      });
      mockJobRepository.delete.mockResolvedValue(true);

      await jobService.delete('job-123', mockUser);

      expect(mockJobRepository.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findByIdWithStats.mockResolvedValue(null);

      await expect(jobService.delete('job-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search jobs with filters', async () => {
      const filters = {
        search: 'engineer',
        status: 'open',
        department: 'Engineering',
        page: 1,
        limit: 20
      };

      const mockSearchResult = {
        jobs: [
          { id: 'job-1', title: 'Software Engineer' },
          { id: 'job-2', title: 'Senior Engineer' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      mockJobRepository.search.mockResolvedValue(mockSearchResult);

      const result = await jobService.search(filters, mockUser);

      expect(mockJobRepository.search).toHaveBeenCalledWith(filters, 'org-123');
      expect(result).toEqual(mockSearchResult);
    });

    it('should handle empty search results', async () => {
      const filters = { page: 1, limit: 20 };
      const mockEmptyResult = {
        jobs: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
      mockJobRepository.search.mockResolvedValue(mockEmptyResult);

      const result = await jobService.search(filters, mockUser);

      expect(result.jobs).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should get job statistics', async () => {
      const mockStats = [
        { status: 'draft', count: 5 },
        { status: 'open', count: 10 },
        { status: 'closed', count: 3 }
      ];
      mockJobRepository.getCountByStatus.mockResolvedValue(mockStats);

      const result = await jobService.getStatistics(mockUser);

      expect(mockJobRepository.getCountByStatus).toHaveBeenCalledWith('org-123');
      expect(result).toEqual({
        byStatus: mockStats,
        total: 18
      });
    });

    it('should handle empty statistics', async () => {
      mockJobRepository.getCountByStatus.mockResolvedValue([]);

      const result = await jobService.getStatistics(mockUser);

      expect(result).toEqual({
        byStatus: [],
        total: 0
      });
    });
  });

  describe('togglePublish', () => {
    it('should publish a draft job', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'draft',
        is_published: false,
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);

      const mockPublishedJob = {
        ...mockJob,
        is_published: true,
        status: 'open',
        posted_at: new Date()
      };
      mockJobRepository.updatePublishStatus.mockResolvedValue(mockPublishedJob);

      const result = await jobService.togglePublish('job-123', true, mockUser);

      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-123', 'org-123');
      expect(mockJobRepository.updatePublishStatus).toHaveBeenCalledWith(
        'job-123',
        true,
        'org-123'
      );
      expect(mockJobRepository.update).toHaveBeenCalledWith(
        'job-123',
        { status: 'open' },
        'org-123'
      );
      expect(result).toEqual(mockPublishedJob);
    });

    it('should unpublish a job', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'open',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);

      const mockUnpublishedJob = {
        ...mockJob,
        is_published: false
      };
      mockJobRepository.updatePublishStatus.mockResolvedValue(mockUnpublishedJob);

      const result = await jobService.togglePublish('job-123', false, mockUser);

      expect(mockJobRepository.updatePublishStatus).toHaveBeenCalledWith(
        'job-123',
        false,
        'org-123'
      );
      expect(result).toEqual(mockUnpublishedJob);
    });

    it('should throw BusinessRuleError when publishing closed job', async () => {
      const mockClosedJob = {
        id: 'job-123',
        status: 'closed',
        is_published: false,
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockClosedJob);

      await expect(jobService.togglePublish('job-123', true, mockUser)).rejects.toThrow(BusinessRuleError);
      expect(mockJobRepository.updatePublishStatus).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findById.mockResolvedValue(null);

      await expect(jobService.togglePublish('job-999', true, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should auto-set status to open when publishing draft', async () => {
      const mockDraftJob = {
        id: 'job-123',
        status: 'draft',
        is_published: false,
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockDraftJob);
      mockJobRepository.updatePublishStatus.mockResolvedValue({ ...mockDraftJob, is_published: true });

      await jobService.togglePublish('job-123', true, mockUser);

      expect(mockJobRepository.update).toHaveBeenCalledWith(
        'job-123',
        { status: 'open' },
        'org-123'
      );
    });
  });

  describe('closeJob', () => {
    it('should close and unpublish a job', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'open',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);

      const mockClosedJob = {
        ...mockJob,
        status: 'closed',
        is_published: false,
        closed_at: new Date(),
        closed_reason: 'Position filled'
      };
      mockJobRepository.update.mockResolvedValue(mockClosedJob);

      const result = await jobService.closeJob('job-123', mockUser, 'Position filled');

      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-123', 'org-123');
      expect(mockJobRepository.update).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          status: 'closed',
          is_published: false,
          closed_at: expect.any(Date),
          closed_reason: 'Position filled',
          updated_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockClosedJob);
    });

    it('should close job without reason', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'open',
        organization_id: 'org-123'
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);
      mockJobRepository.update.mockResolvedValue({ ...mockJob, status: 'closed' });

      await jobService.closeJob('job-123', mockUser);

      expect(mockJobRepository.update).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          status: 'closed',
          closed_reason: null
        }),
        'org-123'
      );
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findById.mockResolvedValue(null);

      await expect(jobService.closeJob('job-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPublishedJobs', () => {
    it('should get published jobs for organization', async () => {
      const mockJobs = [
        { id: 'job-1', title: 'Engineer', is_published: true },
        { id: 'job-2', title: 'Designer', is_published: true }
      ];
      mockJobRepository.getPublishedJobs.mockResolvedValue(mockJobs);

      const result = await jobService.getPublishedJobs('org-123', {
        location: 'Remote',
        department: 'Engineering'
      });

      expect(mockJobRepository.getPublishedJobs).toHaveBeenCalledWith('org-123', {
        location: 'Remote',
        department: 'Engineering'
      });
      expect(result).toHaveLength(2);
      // Should be sanitized for public
      result.forEach(job => {
        expect(job.hiring_manager_id).toBeUndefined();
        expect(job.internal_notes).toBeUndefined();
      });
    });
  });

  describe('getByHiringManager', () => {
    it('should get jobs by hiring manager', async () => {
      const mockJobs = [
        { id: 'job-1', hiring_manager_id: 'manager-123' },
        { id: 'job-2', hiring_manager_id: 'manager-123' }
      ];
      mockJobRepository.getByHiringManager.mockResolvedValue(mockJobs);

      const result = await jobService.getByHiringManager('manager-123', mockUser);

      expect(mockJobRepository.getByHiringManager).toHaveBeenCalledWith('manager-123', 'org-123');
      expect(result).toEqual(mockJobs);
    });
  });

  describe('checkJobLimit', () => {
    it('should return limit info when under limit', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: 10
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);
      mockJobRepository.count = jest.fn().mockResolvedValue(5);

      const result = await jobService.checkJobLimit('org-123');

      expect(result).toEqual({
        currentCount: 5,
        maxAllowed: 10,
        canCreate: true,
        remaining: 5
      });
    });

    it('should return limit info when at limit', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: 10
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);
      mockJobRepository.count = jest.fn().mockResolvedValue(10);

      const result = await jobService.checkJobLimit('org-123');

      expect(result).toEqual({
        currentCount: 10,
        maxAllowed: 10,
        canCreate: false,
        remaining: 0
      });
    });

    it('should handle unlimited jobs', async () => {
      const mockOrg = {
        id: 'org-123',
        max_jobs: null
      };
      mockOrganization.findByPk = jest.fn().mockResolvedValue(mockOrg);

      const result = await jobService.checkJobLimit('org-123');

      expect(result).toEqual({
        currentCount: 0,
        maxAllowed: null,
        canCreate: true,
        remaining: null
      });
      expect(mockJobRepository.count).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when organization not found', async () => {
      mockOrganization.findByPk = jest.fn().mockResolvedValue(null);

      await expect(jobService.checkJobLimit('org-999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('sanitization methods', () => {
    const fullJob = {
      id: 'job-123',
      title: 'Software Engineer',
      hiring_manager_id: 'manager-123',
      internal_notes: 'Confidential notes',
      created_by: 'user-123',
      updated_by: 'user-456',
      deleted_at: null
    };

    it('should sanitize job for internal use', () => {
      const sanitized = jobService.sanitizeJob(fullJob);

      expect(sanitized.id).toBe('job-123');
      expect(sanitized.title).toBe('Software Engineer');
      expect(sanitized.hiring_manager_id).toBe('manager-123');
      expect(sanitized.internal_notes).toBe('Confidential notes');
    });

    it('should sanitize job for public use', () => {
      const sanitized = jobService.sanitizeJobForPublic(fullJob);

      expect(sanitized.id).toBe('job-123');
      expect(sanitized.title).toBe('Software Engineer');
      expect(sanitized.hiring_manager_id).toBeUndefined();
      expect(sanitized.internal_notes).toBeUndefined();
      expect(sanitized.created_by).toBeUndefined();
      expect(sanitized.updated_by).toBeUndefined();
    });
  });
});
